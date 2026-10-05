# Explorador de base de datos

El árbol del sidebar (`app/src/lib/components/SchemaTree.svelte`) muestra los
objetos de la conexión activa con la misma organización que DataGrip:

```
˅ core@10.100.200.183        1 de 5      ← selector de schemas visibles
  ˅ core
    ˅ tables 165
      ˅ clientes
        › columns / keys / foreign keys / indexes / triggers / checks
    › views 102
    › materialized views          (solo PostgreSQL)
    › routines 90                 (procedures y functions, con su firma)
    › sequences                   (PostgreSQL y MariaDB 10.3+)
    › events 1                    (solo MySQL/MariaDB)
```

Solo aparecen las carpetas que tienen algo. Hoy el árbol es de solo lectura:
ver [Próximos pasos](#próximos-pasos).

## Flujo de datos

1. **`connect`** (`app/src-tauri/src/commands/connection.rs`): el driver detecta la versión
   del servidor, resuelve el schema por defecto (`current_schema()`), lo
   introspecta y lista los schemas disponibles.
2. **`database_explorer`** devuelve `{ serverVersion, tls, defaultSchema,
   availableSchemas, schemas }`. El frontend lo guarda en el store
   `databaseExplorer` (`app/src/lib/stores/connection.ts`).
3. **`set_visible_schemas(names)`**: el selector "1 de 5" pide otros
   schemas. El backend introspecta los que faltan y descarta los que se
   quitaron. El schema por defecto está siempre. La selección se guarda por
   perfil en localStorage y se vuelve a aplicar al reconectar.
4. **`list_tables`** aplana las tablas y vistas de todos los schemas
   visibles para el autocompletado, así que agregar un schema también hace
   autocompletables sus tablas.
5. **`buildExplorerTree`** (`app/src/lib/connections/explorerTree.ts`, puro y testeado)
   convierte eso en nodos, y el componente solo los dibuja.

## Contrato del driver

Todo pasa por `DbConnector::introspect_schema(schema) -> SchemaObjects`
(`crates/driver-core`). El agrupado de filas (claves de varias columnas,
triggers con varios eventos...) está en `driver_core::assembly::TableSet` y
lo comparten todos los drivers. Cada driver solo traduce las filas de su motor.

**Fallas parciales.** Si fallan las tablas o sus columnas, el schema no
carga (es un error). Si falla cualquier otra categoría (claves, índices,
triggers, checks, rutinas, eventos, secuencias), esa categoría queda vacía y
se agrega un texto a `warnings`. El árbol lo muestra como un ⚠ en el schema,
con el detalle en el tooltip. Un schema que directamente no se puede
introspectar también aparece, vacío y con su aviso, en vez de romper la
selección.

### MySQL / MariaDB — `information_schema`

`crates/drivers/mysql/src/introspect.rs`

| Nodo | Fuente |
|---|---|
| tables / views | `tables.table_type` (BASE TABLE, VIEW/SYSTEM VIEW; SEQUENCE en MariaDB) |
| columns | `columns.column_type` (`int unsigned`, `varchar(255)`) |
| keys | `table_constraints` ⋈ `key_column_usage` (PRIMARY KEY, UNIQUE) |
| foreign keys | `key_column_usage` con `referenced_table_name` |
| indexes | `statistics` |
| checks | `check_constraints` (ver versiones) |
| triggers | `triggers` |
| routines | `routines` + `parameters` para la firma |
| events | `events` |

Dos reglas de portabilidad: todo valor se lee como texto (los números pasan
por `CAST(.. AS CHAR)`, porque el protocolo preparado los manda en binario) y
por posición (MySQL 8 devuelve los nombres de columna de
`information_schema` en mayúsculas).

### PostgreSQL — `pg_catalog`

`crates/drivers/postgres/src/introspect.rs`. Se usa `pg_catalog` en vez de
`information_schema` porque este último no ve las materialized views, solo
lista los objetos de los que el rol es dueño y no puede armar una FK de
varias columnas sin un join ambiguo.

| Nodo | Fuente |
|---|---|
| tables / views / materialized views | `pg_class.relkind` (r, p, f / v / m); las particiones se ocultan |
| columns | `pg_attribute` + `format_type` |
| keys / checks | `pg_constraint` (p, u / c) |
| foreign keys | `pg_constraint` (f) con `unnest(conkey, confkey)` |
| indexes | `pg_index` + `pg_get_indexdef` (sirve para índices por expresión) |
| triggers | `pg_trigger.tgtype` (bitmask decodificado en `decode_trigger_type`) |
| routines | `pg_proc`, sin las funciones que vienen de extensiones |
| sequences | `pg_class` (S) + `pg_sequence` |

## Compatibilidad entre versiones

Al conectar, cada driver parsea la versión (`version.rs`) y deriva un struct
de **capacidades**. Las consultas se eligen a partir de esas capacidades,
nunca reaccionando a un error. Con una versión menor a la mínima se carga lo
que se pueda y se agrega un aviso.

| Motor | Mínima | Diferencias que se manejan |
|---|---|---|
| MySQL | 5.7 | checks solo desde 8.0.16 (join con `table_constraints`) |
| MariaDB | 10.3 | checks con `table_name` propio; secuencias como `SEQUENCE`; versión con prefijo `5.5.5-` |
| PostgreSQL | 10 | sin `prokind` en 10 (todo es function, se usa `proisagg`/`proiswindow`); `indnkeyatts` desde 11 |

**Probado** (tests `#[ignore = "requires database"]`, contenedores locales):

| Servidor | Resultado |
|---|---|
| MySQL 8.4 | ✅ todos los tests |
| MySQL 5.7 | ✅ introspección y TLS. El test de truncado usa `WITH RECURSIVE`, que no existe en 5.7, así que ese test no aplica |
| MariaDB 10.11 | ✅ todos los tests |
| PostgreSQL 17 | ✅ todos los tests |
| PostgreSQL 10 | ✅ todos los tests (camino sin `prokind`) |

## SSL/TLS por conexión

Cada perfil elige su modo SSL en el formulario de conexión (`TlsMode` en
`crates/driver-core`). Cada driver lo implementa en su `tls.rs`.

| Modo | Qué hace | MySQL (sqlx) | PostgreSQL (sqlx) |
|---|---|---|---|
| **Automático** (por defecto) | TLS si se puede; si la negociación falla, conecta sin cifrar y lo avisa | `Preferred` + reintento con `Disabled` | `Prefer` + reintento con `Disable` |
| Requerido | TLS o falla, sin validar el certificado | `Required` | `Require` |
| Verificar CA | TLS + certificado firmado por la CA (ver limitación abajo) | `VerifyCa` | `VerifyCa` |
| Verificar CA y host | lo anterior + que el host coincida | `VerifyIdentity` | `VerifyFull` |
| Desactivado | sin TLS | `Disabled` | `Disable` |

**Por qué hace falta el reintento.** MySQL 5.7 ofrece TLS 1.2, pero solo con
cifrados DHE; con ECDHE responde `handshake failure` (alerta 40). Lo
verificamos con `openssl s_client -starttls mysql` contra 5.7.44. rustls
solo implementa ECDHE, así que no hay configuración que lo arregle, y el
modo `Preferred` de sqlx corta en vez de seguir sin cifrar. El reintento en
Automático solo ocurre ante un **error de negociación TLS**
(`tls::is_tls_failure`). Un login rechazado, un host caído o un timeout no
se reintentan, así que una contraseña equivocada nunca se vuelve a mandar
sin cifrar y un host caído no hace esperar el doble.

**Cómo se avisa.** Al conectar, el driver le pregunta al servidor qué
negoció (`Ssl_version`/`Ssl_cipher` en MySQL, `pg_stat_ssl` en Postgres) y
lo guarda en `TlsStatus`. Si la conexión quedó sin cifrar, el explorador
muestra un candado abierto ámbar junto a la conexión. "Probar conexión" dice
si quedó cifrada, con el protocolo y el cifrado, o si conectó sin cifrar y
por qué.

**CA propia.** Sin archivo de CA, los modos que verifican usan las CA
públicas de Mozilla (webpki-roots). Para AWS RDS, Azure, Cloud SQL o una CA
interna hay que indicar el `.pem` en "Certificado CA".

Probado:

| Servidor | Automático | Requerido |
|---|---|---|
| MySQL 8.4 | cifrado | cifrado; Verificar CA/host con la CA correcta ✅ |
| MySQL 5.7 | sin cifrar, con reintento | falla: "El servidor no ofrece un cifrado TLS compatible…" |
| MariaDB 10.11 (imagen sin certificados) | sin cifrar, sin TLS en el servidor | falla: "El servidor no tiene TLS habilitado…" |
| PostgreSQL 17 con `ssl=on` | cifrado | cifrado; Verificar CA/host con la CA correcta ✅, sin ella ❌ "Certificado inválido" |
| PostgreSQL 10 (sin TLS) | sin cifrar | falla: "El servidor no tiene TLS habilitado…" |

### Limitaciones conocidas

- **"Verificar CA" también verifica el host.** sqlx 0.8.6 implementa
  `VerifyCa` capturando el error `NotValidForName` de rustls, pero la
  versión actual de rustls devuelve `NotValidForNameContext`, así que la
  excepción nunca aplica. En la práctica, Verificar CA se comporta como
  Verificar CA y host: el certificado tiene que incluir el host en su
  subjectAltName. Hay que revisarlo al actualizar sqlx.
- **Servidores que solo ofrecen DHE o TLS < 1.2** (MySQL 5.7, builds
  viejas) no pueden cifrar con rustls. Si algún día hiciera falta, la
  alternativa es una build con `native-tls` (OpenSSL), que suma una
  dependencia nativa por plataforma.

## Próximos pasos

Quedan fuera de esta entrega a propósito:

- **Clic en una tabla o vista → abrir sus datos en un grid.** Es la siguiente
  pieza grande: necesita filtros, orden, paginación y su propio diseño de
  pantalla (probablemente reutilizando `DataGrid.svelte` del panel de
  resultados). El árbol hoy no tiene interacción justamente para no
  adelantar decisiones de esa pantalla.
- Menú contextual (copiar nombre, `SELECT * FROM` en la consola, ver DDL).
- DDL de vistas, rutinas, triggers y eventos. Hoy solo existe el de tablas:
  `table_definition`.
- Nodo "Server Objects" de MySQL (usuarios, variables): requiere permisos
  de administrador.
- Types/enums y dominios de PostgreSQL.
- **Matriz de compatibilidad en CI:** correr los tests de integración contra
  contenedores de MySQL 5.7/8.x, MariaDB 10.x/11.x y PostgreSQL 10–17 en
  cada PR, en lugar de probar a mano como se hizo para esta tabla.
