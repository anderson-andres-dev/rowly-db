# Arquitectura

[English](ARCHITECTURE.md) · **Español**

Rowly DB es la aplicación; Khipu es el nombre interno de su motor. Por eso los
crates se llaman `khipu-*`.

## Principio

El core (parsing, catálogo, autocompletado) no sabe que existe Tauri, Svelte
ni ningún motor de base de datos concreto. Todo lo que sabe es el trait
`DbConnector` (`crates/driver-core`) y un `SchemaCatalog` genérico
(`crates/engine/src/catalog.rs`). Esto es lo que permite que:

- alguien integre `khipu-lsp` en Neovim/VSCode sin tocar la app de escritorio
- alguien agregue soporte para un motor con un dialecto ya cubierto por
  `sqlparser` (por ejemplo otro compatible con MySQL o Postgres) sin tocar el
  engine — sí hay que agregar la rama correspondiente en la fábrica de
  drivers de `app/src-tauri/src/drivers.rs`
- el engine se pueda testear sin levantar una base de datos real

Un motor con un dialecto SQL distinto de los que ya soporta `sqlparser` (por
ejemplo SQLite o DuckDB) sí requiere extender el enum `Dialect` de
`crates/engine/src/lib.rs`; no es agnóstico de dialecto en ese caso.

MySQL y PostgreSQL son dependencias obligatorias de `app/src-tauri` hoy: no
hay feature flags de Cargo que las hagan opcionales.

## Capas

1. **`crates/engine`** — dialecto-agnóstico salvo por el enum `Dialect`
   cerrado (`MySql`/`Postgres`). Validación contra la gramática real por
   dialecto (`sqlparser`), resolución de contexto en el cursor, y ranking de
   sugerencias contra el `SchemaCatalog`. El parsing incremental y tolerante
   a errores del buffer mientras se escribe todavía no está implementado.
2. **`crates/engine-lsp`** — expone `khipu-engine` como servidor LSP
   (`tower-lsp`) para que cualquier editor lo consuma.
3. **`crates/driver-core`** — el contrato (`DbConnector`) que todo motor de
   base de datos debe implementar: conectar, listar schemas, introspectar un
   schema completo (`introspect_schema`: tablas, vistas, claves, índices,
   triggers, rutinas, secuencias, eventos) y ejecutar consultas. También trae
   `assembly::TableSet`, que agrupa las filas del catálogo en esa estructura
   para que cada driver solo traduzca las filas de su motor. El modo SSL/TLS
   lo elige cada perfil (`TlsMode` en `ConnectionConfig`) y lo resuelve cada
   driver en su `tls.rs`; ver
   [`docs/design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md).
   El engine y la app solo dependen de este trait.
4. **`crates/drivers/*`** — un crate por motor de base de datos
   (`khipu-driver-mysql`, `khipu-driver-postgres`, ...), cada uno implementando
   `DbConnector` sobre `sqlx`.
5. **`app/src-tauri`** — el shell de escritorio. Depende directo de
   `khipu-engine` y de los drivers (sin pasar por LSP/stdio) para minimizar
   latencia dentro de la propia app.
6. **`app/src`** — frontend Svelte, editor CodeMirror 6.

## Cómo agregar un motor de base de datos nuevo

Para un motor con un dialecto ya soportado por `sqlparser`:

1. Crear `crates/drivers/<motor>` (`cargo new --lib`).
2. Implementar `DbConnector` para ese motor. Para `introspect_schema`, ver
   [`docs/design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md):
   qué va en cada categoría, cómo manejar versiones del servidor y qué hacer
   cuando una categoría no se puede leer.
3. Agregarlo como miembro del workspace y como dependencia de `app/src-tauri`
   (hoy no es opcional: no hay feature flags de Cargo para desactivar drivers).
4. Agregar la rama correspondiente en la fábrica de drivers de
   `app/src-tauri/src/drivers.rs` (enum `DatabaseKind`).

No requiere cambios en `khipu-engine` ni en el frontend. Un motor con un
dialecto SQL distinto sí requiere extender el enum `Dialect` de
`crates/engine/src/lib.rs`.

## Roadmap de motores

MySQL → PostgreSQL → a definir según demanda de la comunidad.
