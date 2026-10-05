# Añadir un motor de base de datos

[English](ENGINE_GUIDE.md) · **Español**

Cómo añadir un motor a Rowly DB, o cambiar uno, correctamente. Lee primero [docs/ARCHITECTURE.es.md](docs/ARCHITECTURE.es.md): explica las cinco cosas que esta guía mantiene separadas (motor, dialecto, driver de protocolo, versión exacta, línea de comportamiento) y por qué el código compartido nunca nombra un motor. [SQL_ENGINE.es.md](SQL_ENGINE.es.md) es el contrato: qué tiene que demostrar cada motor y en qué versiones. Esta guía es el camino; ese documento, el listón.

## Antes de empezar: ¿qué vas a añadir?

| Quieres | Es | Ve a |
| :--- | :--- | :--- |
| Soportar una base que Rowly DB no conoce (SQLite, SQL Server…) | Un **motor** nuevo | Toda esta guía |
| Soportar una base que habla un protocolo que Rowly DB ya tiene, con sus propias reglas SQL (como MariaDB con el de MySQL) | Un **motor** nuevo que reutiliza un **driver** | Toda esta guía; el paso 4 dice cuándo se puede reutilizar |
| Soportar una versión mayor nueva de un motor conocido que se comporta distinto | Una **línea** nueva | [Una línea nueva de un motor existente](#una-línea-nueva-de-un-motor-existente) |
| Anunciar una versión exacta más del servidor como verificada | Una **versión exacta** nueva | [Una versión exacta nueva](#una-versión-exacta-nueva) |
| Llevar datos de línea nuevos (una reservada, una capacidad) a las apps instaladas | Un **paquete de soporte** | [Un paquete de soporte no es un motor](#un-paquete-de-soporte-no-es-un-motor) |

## El camino de un vistazo

Empieza con la plantilla y deja que el compilador y los tests te guíen: cada paso pendiente falla con el archivo que necesita.

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

| # | Paso | Dónde | Qué falla hasta que está hecho |
| :--- | :--- | :--- | :--- |
| 1 | Identidad y registro | `crates/engine/src/lib.rs`, `dialects/mod.rs` (lo hace la plantilla) | `cargo build` |
| 2 | `EngineDefinition`, cada campo decidido | `crates/engine/src/dialects/<id>.rs` | `ninguna_definicion_queda_pendiente` mientras quede el bloque `PENDIENTE` |
| 3 | Parser | `parser` en la definición | los tests del corpus del paso 12 |
| 4 | Driver y registro del backend | `crates/drivers/<protocolo>`, `app/src-tauri/src/drivers.rs`, `Cargo.toml` | `cada_motor_del_frontend_llega_como_el_suyo` |
| 5 | Versión exacta y su lectura | el `version.rs` del driver | tests de `version.rs`, D6 |
| 6 | Líneas de versión como datos | `support/<id>.json` y `lines` en la definición | `crates/engine/tests/lines.rs` |
| 7 | Introspección | el `introspect.rs` del driver | D3 contra un servidor real |
| 8 | Respuestas del analizador | `PerEngine` en `crates/engine/src/diagnostics.rs` (`mod contract`) | error de compilación en `cargo test` |
| 9 | Guard | nada por motor: los campos de la definición | S1–S7 |
| 10 | SQL generado | los campos de comillas de la definición | G1, G6, G7 |
| 11 | Frontend | `app/src/lib/connections.ts`, `app/src/lib/engines/<id>.ts`, `ENGINES` | `npm run check`, `contract.test.ts` |
| 12 | Harness, corpus, servidores | `crates/server-tests`, `tests/sql/<id>/`, `tools/test-dbs/` | `the_harness_covers_every_engine_of_the_registry`, `lines.rs` |
| 13 | Cobertura | `tests/sql/coverage.json` | `node tools/inventory/coverage.mjs` |
| 14 | CI y evidencia | `tools/test-dbs/lines.json` (la matriz lo lee) | `sql-engine.yml`, `evidence.mjs` |
| 15 | Documentación | estado generado, el motivo de cada línea, §6.5, §8.2, §9 | `node tools/inventory/status.mjs`, `node tools/architecture/graph.mjs --check` |

La plantilla copia los valores del motor que indicas con `--like` bajo un bloque `PENDIENTE`, así que compila desde el primer minuto. **Un valor heredado que nadie probó es un motor que sigue en silencio las reglas de otro.** Cada valor tiene que acabar decidido y demostrado para el motor nuevo.

## 1. Identidad: motor, dialecto, driver

`node tools/engine/new.mjs <id> --like <motor>`:

- crea `crates/engine/src/dialects/<id>.rs` y lo registra en `dialects/mod.rs`;
- añade la variante de `Dialect`, su lugar en `Dialect::ALL` y su brazo en `Dialect::definition()` (`crates/engine/src/lib.rs`, el único `match` sobre motores del núcleo);
- añade el motor a `tests/engines/contract.json` como `"pending": true`;
- crea `tests/sql/<id>/setup.sql`.

El id (minúsculas, `[a-z][a-z0-9]*`) es el mismo en todas partes: `Dialect::id()`, `DatabaseKind` (backend, serde), `ConnectionDriver` (frontend), `Engine::name()` (server-tests), `support/<id>.json` y las claves de `tools/test-dbs/lines.json` y `tools/support/vendor-support.json`. Los tests comparan cada copia con `Dialect::ALL`.

## 2. `EngineDefinition`

Todos los campos son obligatorios: no hay `Default`. Decide cada uno para el motor nuevo y demuéstralo contra su servidor.

| Campo | Qué decide | Lo lee |
| :--- | :--- | :--- |
| `id` | El id del motor | registros |
| `parser` | El dialecto de sqlparser que tokeniza y parsea el SQL del motor | guard, analizador, paginación, edición ⚠ |
| `statement_starters` | Palabras con las que puede empezar una sentencia | guard ⚠, analizador (destinos de error de tipeo) |
| `unparsed_syntax` | Sintaxis válida que el parser rechaza, como secuencias de palabras (`...` es un hueco de cualquier largo): sin diagnóstico de sintaxis | analizador |
| `unparsed_writes` | Escrituras válidas que el parser no lee, reconocidas por sus primeras palabras | guard ⚠ |
| `system_tables`, `system_table_prefixes` | Tablas que se nombran sin schema y no están en el catálogo | analizador |
| `folds_unquoted_to_lowercase` | Si un nombre sin comillas se guarda en minúsculas | analizador (A6), SQL generado |
| `backslash_escapes` | Si `\` escapa dentro de `'…'` | guard ⚠, analizador, literales generados |
| `identifier_quote` | La comilla de los identificadores; la de adentro se duplica | SQL generado (G1) |
| `insert_defaults` | Cómo se escribe una fila con todos sus valores por defecto | SQL generado |
| `executable_comments` | Comentarios cuyo contenido ejecuta el servidor (`/*!`, `/*M!`) | guard ⚠ |
| `routine_kinds` | Lo que puede crear un `CREATE` de rutina | guard ⚠ |
| `routine_bodies` | `Block` (se valida por dentro, como MySQL) o `Quoted` (un texto opaco, como PostgreSQL) | guard ⚠, analizador |
| `do_blocks` | `Expression` (el `DO` de MySQL) o `Anonymous` (un bloque de código que no se puede clasificar, PostgreSQL) | guard ⚠ |
| `select_into_variable_lists` | `SELECT … INTO a, b` en varias variables | analizador |
| `sql_mode_query` | La consulta que dice si la sesión usa `NO_BACKSLASH_ESCAPES` | modo de la sesión → guard ⚠ |
| `lines` | `include_str!` de `support/<id>.json` | líneas (paso 6) |

Un mecanismo que el motor nuevo necesita y que ningún campo expresa pasa a ser **un campo o una variante nueva** de la definición, que usa el código compartido y se prueba en cada motor existente. Nunca un `if` sobre el motor: los tests de frontera lo rechazan (ARCHITECTURE, «Fronteras que se comprueban solas»).

### ⚠ Campos que cambian la superficie de seguridad del guard

No son preferencias del dialecto. **Cambiar uno de ellos cambia lo que el guard deja ejecutar sin confirmación.** Cada uno necesita un motivo demostrado contra el servidor real, y las filas de seguridad (S1–S7) en cada versión verificada:

| Campo | Cómo puede debilitar el guard |
| :--- | :--- |
| `parser` | Decide cómo tokeniza el guard: dónde terminan cadenas, comentarios y sentencias. Un parser «cercano» que lea las cadenas del motor de otra forma puede esconder una segunda sentencia. Úsalo solo tras demostrar que no oculta SQL destructivo ni marca sintaxis válida. |
| `unparsed_writes` | Un texto que encaja con uno de estos patrones se acepta solo con una comprobación de sentencia única, como `NotDestructive` fuera de producción. Cada patrón amplía lo que pasa sin el parser. |
| `statement_starters` | Un texto que el parser no lee pero empieza con una de estas palabras se juzga por su estructura en vez de rechazarse. |
| `routine_bodies` | `Quoted` reduce la comprobación de una rutina a contar los `;` de nivel superior; `Block` valida el cuerpo. Elige según lo que hace de verdad el servidor. |
| `routine_kinds`, `do_blocks` | Qué puede crear un `CREATE` de código, y si `DO` es una expresión o un bloque de código cuyo efecto hay que rechazar cuando puede cambiar datos. |
| `executable_comments` | Comentarios que ejecuta el servidor. Si falta uno, el código escondido en un «comentario» pasa como comentario (S4). |
| `backslash_escapes`, `sql_mode_query` | Cómo terminan las cadenas, y si el guard se entera de que la sesión lo cambió (S5). Un valor equivocado mueve el lugar donde el guard cree que cierra una cadena. |

El guard no lee datos de línea: un paquete de soporte nunca puede cambiar estos campos (D10).

## 3. Parser

Rowly DB usa `sqlparser`. Elige su dialecto para el motor (`parser`). Después:

- lo que el servidor acepta y sqlparser rechaza va en `unparsed_syntax` (sin diagnóstico) y, si escribe, en `unparsed_writes` (guard);
- lo que sqlparser lee distinto que el servidor es un riesgo para el guard: demuéstralo con casos de `safety` en el `attacks.sql` del motor;
- las sentencias se dividen en el frontend (`app/src/lib/sqlStatements.ts`), configurado por el `SqlLexical` del perfil (paso 11); el guard del backend vuelve a comprobar cada sentencia.

## 4. Driver y protocolo

Un driver es un crate en `crates/drivers/<protocolo>` que implementa `DbConnector` (`crates/driver-core/src/lib.rs`).

Obligatorios: `connect`, `server`, `tls_status`, `list_schemas`, `current_schema`, `introspect_schema`, `table_definition`, `execute_query`, `execute_in_transaction`, `stream_query`. Con valor por defecto que puedes sobrescribir: `list_tables`, `execute_query_cancellable`, `console_epoch`, `cancel_query`.

Reglas que el contrato documenta y los tests comprueban:

- `execute_query` y `stream_query` ejecutan **una** sentencia en la conexión de consola de la ventana (`ConsoleConnection`); preparan antes de ejecutar cuando el protocolo lo permite (defensa en profundidad, SQL_ENGINE §8).
- El catálogo, la introspección y cancelar usan el pool; la edición de resultados usa el pool en una transacción (`execute_in_transaction`).
- Los errores de conexión se clasifican (`ConnectionErrorKind`) y el TLS sigue el modo del perfil, cada driver en su propio `tls.rs`.

**Reutiliza un driver existente** solo cuando el motor habla su protocolo y los tests de tipos, TLS e introspección pasan para él. MariaDB reutiliza `khipu-driver-mysql`; el driver detecta con qué motor habla (`version.rs`) y lo informa.

Registra el motor en el backend: `DatabaseKind` y los dos `match` de la fábrica en `app/src-tauri/src/drivers.rs` (el único archivo del backend que nombra un driver). Un crate nuevo entra también en el workspace (`Cargo.toml`), en `app/src-tauri/Cargo.toml`, en `crates/server-tests/Cargo.toml` y como dominio en `tools/architecture/model.json` (`--check` te lo pide).

Dependencias: solo versiones publicadas. Ni forks, ni dependencias git, ni parches (`tools/inventory/dependencies.mjs`). Lo que falta upstream es un hueco documentado (SQL_ENGINE §9), nunca un fork.

## 5. Versión exacta: `ServerIdentity`

Al conectar, el driver lee la versión del servidor y devuelve `ServerIdentity { engine, version, label }`: el motor que de verdad es (un perfil «MySQL» que apunta a MariaDB informa `mariadb`), la versión como números y una etiqueta para mostrar. Nada lee la etiqueta para decidir; el frontend nunca deduce una línea ni una versión (un test lo prohíbe).

El driver también es dueño de su **piso de compatibilidad** (`COMPATIBILITY_FLOOR_*` en `version.rs`): el catálogo más antiguo que sabe leer. Nunca rechaza una conexión; por debajo, el explorador avisa. Un test lo mantiene igual al inicio de la primera línea del motor.

El driver lee qué consultas al catálogo puede usar desde los datos de línea (`Dialect::lines().supports(capability, version)`), nunca comparando versiones por su cuenta (`no_known_consumer_declares_versioned_behavior_by_itself_again`).

## 6. Líneas de versión

Lo que cambia entre versiones son **datos** en `support/<id>.json`, incrustados por la definición (`lines`) y parseados por `khipu_engine::lines`. Formato (SQL_ENGINE §5.4):

```json
{ "format": 1, "engine": "<id>", "lines": [
  { "line": "8.0", "revision": 1, "capabilities": { "checkConstraints": "8.0.16" },
    "reservedWords": ["rank"], "removedSyntax": [{ "words": ["^", "SHOW", "SLAVE", "STATUS"], "instead": "SHOW REPLICA STATUS" }] }
] }
```

- **Una línea existe solo si un fixture la distingue** de la anterior (SQL_ENGINE §5.1). La primera línea es la base: empieza en el piso de compatibilidad.
- **`revision`** empieza en 1 y sube **cada vez que cambian los datos de esa línea**. Un paquete descargado reemplaza una línea solo con una revisión mayor.
- **`capabilities`**: capacidad del catálogo → la versión desde la que existe (puede ser un parche dentro de la línea). Los nombres son el enum `Capability` (`crates/engine/src/lines.rs`), que es cerrado: una capacidad que ningún motor tiene todavía es un cambio del núcleo, junto con el código del driver que la usa.
- **`reservedWords`**: palabras que la línea vuelve reservadas. Cada una necesita su `AS <palabra>` en el `rejects.sql` de la línea. El SQL generado cita toda palabra reservada en cualquier línea (G6).
- **`removedSyntax`**: secuencias de tokens que la línea eliminó (`^` y `$` anclan), con qué usar en su lugar. Cada una marca una entrada del `rejects.sql` de la línea, desde esa línea en adelante y nunca antes (A9).
- El cargador rechaza campos desconocidos, líneas desordenadas o repetidas, la revisión 0 y una capacidad fuera de su línea. `crates/engine/tests/lines.rs` demuestra que cada dato tiene su fixture; D7 demuestra los límites contra servidores reales.

Las mismas líneas van en `tools/test-dbs/lines.json`: probes en los dos extremos de cada línea (y a ambos lados de cada `-- since:`), y las versiones exactas **verificadas**, cada imagen fijada por digest. Las fechas del fabricante van en `tools/support/vendor-support.json` (`python3 tools/support/vendor-support.py`); solo se muestran.

## 7. Introspección y catálogo

`introspect_schema(schema)` devuelve el modelo compartido `SchemaObjects` (`crates/driver-core`): tablas (con columnas, claves, claves foráneas, índices, triggers, checks), rutinas con sus parámetros y modos, secuencias, eventos y `warnings` para cualquier categoría que el servidor no entregue. Las diferencias entre motores son listas vacías, campos `Option` y enums (`RelationKind`, `RoutineKind`, `ParameterMode`); nunca un campo con nombre de motor. «Schema» es lo que el motor usa para agrupar tablas: una base de datos en MySQL, un schema en PostgreSQL.

Las consultas al catálogo son del driver (`introspect.rs`) y se eligen según las capacidades de la línea del servidor. `docs/design/explorador-base-de-datos.md` describe lo que necesita cada objeto.

El backend convierte `SchemaObjects` en el `SchemaCatalog` del núcleo (`services/catalog.rs`): no hay nada que hacer por motor. D3 demuestra la clasificación contra el servidor real; que el contenido introspectado coincida con el servidor (D4) sigue siendo un hueco en todos los motores.

## 8. Analizador

El analizador (`crates/engine/src/diagnostics.rs`) se configura con la definición y los datos de línea; no tiene ramas por motor. Para añadir un motor, da su respuesta en cada `PerEngine` de `mod contract` (el test no compila sin ella): qué es un error de sintaxis y qué es un error de catálogo en ese motor. El SQL válido del corpus no puede producir diagnósticos (A1), y ningún prefijo suyo puede producir un panic (A3).

## 9. Guard

No hay código del guard por motor: lee los campos marcados con ⚠ en el paso 2. La **seguridad mínima** de cualquier motor son las filas S de SQL_ENGINE §6 en cada versión verificada, contra el servidor real:

- S1: un `;` dentro de sus cadenas, comentarios, identificadores o dollar quotes nunca corta;
- S2: nada de lo que el guard acepta corre como dos sentencias, medido **sin** la barrera de preparación del driver, y el fuzz encuentra suficientes casos peligrosos para medir algo;
- S3: todo lo que daña datos pide confirmación; S7: toda escritura en producción se confirma;
- S4–S6: los comentarios ejecutables, el modo de cadenas de la sesión y la sintaxis que el parser no lee se juzgan; nunca se dejan pasar sin más.

Añade los ataques del motor a `tests/sql/<id>/common/attacks.sql`.

## 10. SQL generado

Lo que escribe Rowly DB tiene que correr en su motor (G1–G7):

- identificadores y literales: `Dialect::quote_identifier`, `string_literal` y `string_literal_with` (a partir de `identifier_quote` y `backslash_escapes`); el perfil del frontend escribe lo mismo (fijado por `tests/engines/contract.json`);
- una fila de valores por defecto: `insert_defaults`; los cambios del grid: `khipu_engine::editing`;
- palabras reservadas: la lista base de `editing.rs` más las `reservedWords` de cada línea;
- ordenar, paginar y contar: `khipu_engine::pagination`, que reescribe la consulta parseada y escribe `LIMIT n OFFSET m`. Cada reescritura tiene que leerse de vuelta igual y volver a pasar el guard, o corre el texto original.

## 11. Frontend

- `app/src/lib/connections.ts`: `ConnectionDriver` y su entrada en `connectionDrivers` (nombre, logo, puerto por defecto).
- `app/src/lib/engines/<id>.ts`: su `EngineProfile` (léxico para el divisor, comillas, `quoteString`, dialectos del editor y del formateador, inicios de sentencia, funciones integradas, reservadas con `lineReservedWords(support/<id>.json)`, ayuda y ubicación de los errores del servidor, `passedInCall`, URL de conexión); después `ENGINES` en `engines/index.ts`. `FormatterDialect` en `engines/types.ts` enumera los dialectos de sql-formatter.
- `engines/contract.test.ts`: su entrada en `FIXTURES` (el tipo la exige); su comilla de identificadores, su regla de la barra invertida y sus comentarios ejecutables tienen que coincidir con `tests/engines/contract.json`. Después quita `"pending"`.

Solo estos archivos pueden nombrar el motor; un test rechaza cualquier otro.

## 12. Harness, corpus y servidores de prueba

- `crates/server-tests/src/lib.rs`: la variante de `Engine` y cada `match` sobre ella (son exhaustivos, así que el compilador los enumera: conector, contenedor, credenciales, puertos, corpus). Un protocolo nuevo añade una variante de `Conn` y su `multi_statement` (el servidor sin la barrera del driver).
- `tests/sql/<id>/`: `setup.sql`, `common/` (`valid.sql`, `attacks.sql`, `routines.sql`, `no-diagnostics.sql`, `mixed.json`) y una carpeta por línea (`accepts.sql`, `rejects.sql`, `reads.sql`), como describe SQL_ENGINE §10.1.
- `tools/test-dbs/`: un servicio en `docker-compose.yml` (su imagen por defecto tiene que ser una versión verificada de `lines.json`; un test lo comprueba), su semilla y su dataset, y el nombre del motor en `up.sh` y `lines.sh`.

## 13. Cobertura

`tests/sql/coverage.json` responde cada fila de SQL_ENGINE §6 para cada motor: un test que lo incluye, un `N/A` con motivo o un hueco declarado (`gapEngines`). `node tools/inventory/coverage.mjs` enumera lo que falta, y falla con un test contra servidor real que no demuestra ninguna fila.

## 14. Matriz, evidencia y CI

No hay una segunda lista: `sql-engine.yml` arma su matriz desde `verified` y los probes de `tools/test-dbs/lines.json`. Cada versión verificada corre las suites reales contra su imagen fijada; el harness se detiene si el servidor no es la versión declarada. Después `tools/test-dbs/evidence.mjs` exige la evidencia completa de cada versión verificada. `tools/test-dbs/window.mjs` comprueba que las versiones verificadas coincidan con la ventana de soporte del fabricante. Lo dispara un cambio en `crates/**`, `support/**`, `tests/sql/**` o `tools/test-dbs/**`.

## 15. Documentación

- Corre `node tools/inventory/status.mjs --write`: la tabla de motores del README, SQL_ENGINE §5.3 y la cobertura de §14.2 salen de los datos.
- Añade sus filas a la tabla de por qué existe cada línea en SQL_ENGINE §5.3 (la herramienta comprueba que coincidan con `support/`), su columna en §6.5, sus decisiones propias en §8.2 y sus huecos en §9.
- Registra su nivel en SQL_ENGINE §14.1 con la evidencia.
- `tools/architecture/model.json` si añade un crate.

## Qué significa terminado

El motor es **Integrable** (SQL_ENGINE §4) cuando, en cada versión exacta que anuncia: las compuertas de PR y de PR de motor están en verde con la evidencia completa, cada fila aplicable de §6 tiene un test, un `N/A` con su motivo o un hueco P2 o menor en §9, y P0 = 0 y P1 = 0. Hasta entonces es Experimental: no se publica como soportado ni se anuncia.

## Una línea nueva de un motor existente

1. Encuentra lo que la distingue: una entrada del corpus que pasa en la línea nueva y falla en la anterior, o al revés. Sin ella, las versiones comparten línea (SQL_ENGINE §5.1).
2. Decláranla en `support/<motor>.json` con `revision: 1`, cada dato con su fixture; añade sus probes a `tools/test-dbs/lines.json`. Si necesita un parser, protocolo, tipo o consulta de catálogo nuevos, publica primero la app que los implementa.
3. Corre D7 y la matriz aplicable en cada versión que se vaya a anunciar como verificada; después `status.mjs --write` y el motivo de la línea en §5.3.

## Una versión exacta nueva

1. Fija su imagen por digest en `verified` de `tools/test-dbs/lines.json`. El harness lee la versión real del servidor y la compara; nunca la deduzcas del nombre de la imagen.
2. Corre cada fila aplicable de §6 (`sql-engine.yml` lo hace en el PR). Si su comportamiento cambia, es una línea nueva; si no, entra en el conjunto verificado.
3. Sin esa evidencia no está verificada: puede conectar con las reglas de su línea, y la app dice «no verificada».

## Un paquete de soporte no es un motor

Un paquete de soporte (SQL_ENGINE §11) lleva **solo datos de línea** de un motor que la app ya conoce: una revisión nueva de una línea, o una línea nueva que solo usa mecanismos que la app ya tiene. No puede declarar un motor, cambiar el guard, un parser ni un driver, ni decir que algo está verificado o soportado. Un motor nuevo siempre es una versión de la app.

## Motores embebidos

**Rowly DB todavía no tiene una decisión de arquitectura para motores sin proceso servidor.** Hoy `ConnectionConfig` (`crates/driver-core`) es host, puerto, base, usuario, contraseña y TLS. Lo mismo el formulario de conexión, los perfiles guardados (`app/src/lib/stores/connectionProfiles.ts`), lo que se envía al conectar (`stores/connection.ts`) y `TlsStatus`. El harness de pruebas, la matriz y la evidencia suponen una imagen de contenedor fijada por digest.

No dobles esos tipos para que encaje un motor embebido, ni añadas una abstracción antes de tiempo. Abre un issue: la decisión se toma cuando de verdad se implemente un motor embebido.

## Probar la guía: SQLite

Lo que un desarrollador nuevo obtiene hoy de este repositorio, paso a paso:

| Paso | Lo que dice el repositorio | Decisión que todavía falta |
| :--- | :--- | :--- |
| 1 Identidad | `new.mjs sqlite --like postgres` (comillas `"`, sin escapes con barra) | — |
| 2 Definición | Cada campo y cuáles son ⚠ | `routine_bodies`: los triggers de SQLite son `BEGIN … END` sin control de flujo, y ni `Block` ni `Quoted` lo describen exactamente. Hace falta una variante nueva, probada en cada motor |
| 3 Parser | sqlparser tiene `SQLiteDialect` | — |
| 4 Driver | Un crate con `DbConnector`; sqlx publica un driver de SQLite | **`ConnectionConfig` y TLS** ([Motores embebidos](#motores-embebidos)): Rowly DB todavía no tiene una decisión |
| 5 Versión exacta | `sqlite_version()` encaja en `ServerIdentity` | Qué versión es «el servidor» cuando la app enlaza la biblioteca: **todavía no hay decisión** |
| 6 Líneas | `support/sqlite.json`, la regla de línea | Soporte del fabricante: SQLite no tiene LTS ni fechas de EOL, y §5.2 no define su ventana |
| 7 Introspección | `SchemaObjects`: las bases adjuntas como schemas; sin rutinas, secuencias ni eventos (listas vacías) | — |
| 8–10 Analizador, guard, SQL generado | Campos y filas; `LIMIT`/`OFFSET` funciona en SQLite | — |
| 11 Frontend | Perfil, `ENGINES`, `connections.ts` (lang-sql tiene un dialecto SQLite) | El formulario de conexión es solo de red (la misma decisión del paso 4) |
| 12–14 Harness, matriz, evidencia | La estructura y las filas | **«Servidor real» = la biblioteca enlazada con su versión y dataset fijados** (SQL_ENGINE lo dice), pero `lines.json`, el harness y `sql-engine.yml` solo conocen imágenes de contenedor: todavía no hay mecanismo |

**Para un motor de red, esta guía está completa:** cada paso tiene un dueño, un archivo y un test que falla hasta que está hecho. **Para un motor embebido como SQLite**, las decisiones que faltan son exactamente tres: cómo se configura una conexión a un archivo (`ConnectionConfig`, formulario, perfiles, TLS), qué significan «versión exacta» y «verificada» cuando la app lleva la biblioteca, y cómo la matriz la fija y la ejecuta sin un contenedor.
