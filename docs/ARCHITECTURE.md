# Architecture

**English** · [Español](ARCHITECTURE.es.md)

Rowly DB is the application; Khipu is the internal name of its engine. That
is why the crates are called `khipu-*`.

## Principle

The core (parsing, catalog, autocomplete) does not know that Tauri, Svelte or
any particular database engine exist. All it knows is the `DbConnector`
trait (`crates/driver-core`) and a generic `SchemaCatalog`
(`crates/engine/src/catalog.rs`). This is what allows:

- integrating `khipu-lsp` into Neovim/VS Code without touching the desktop
  app
- adding an engine whose dialect `sqlparser` already covers (for example
  another MySQL- or Postgres-compatible one) without touching the engine —
  you do need to add its branch to the driver factory in
  `app/src-tauri/src/drivers.rs`
- testing the engine without a real database

An engine with a SQL dialect that `sqlparser` does not support yet (for
example SQLite or DuckDB) does require extending the `Dialect` enum in
`crates/engine/src/lib.rs`; in that case it is not dialect-agnostic.

MySQL and PostgreSQL are required dependencies of `app/src-tauri` today:
there are no Cargo feature flags to make them optional.

## Layers

1. **`crates/engine`** — dialect-agnostic except for the closed `Dialect`
   enum (`MySql`/`Postgres`). Validation against each dialect's real grammar
   (`sqlparser`), context resolution at the cursor, and suggestion ranking
   against the `SchemaCatalog`. Incremental, error-tolerant parsing of the
   buffer while typing is not implemented yet.
2. **`crates/engine-lsp`** — exposes `khipu-engine` as an LSP server
   (`tower-lsp`) so any editor can use it.
3. **`crates/driver-core`** — the contract (`DbConnector`) every database
   engine must implement: connect, list schemas, introspect a whole schema
   (`introspect_schema`: tables, views, keys, indexes, triggers, routines,
   sequences, events) and run queries. It also provides
   `assembly::TableSet`, which groups catalog rows into that structure so
   each driver only translates its engine's rows. Each profile picks its
   SSL/TLS mode (`TlsMode` in `ConnectionConfig`) and each driver resolves it
   in its `tls.rs`; see
   [`docs/design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md)
   (Spanish). The engine and the app depend only on this trait.
4. **`crates/drivers/*`** — one crate per database engine
   (`khipu-driver-mysql`, `khipu-driver-postgres`, ...), each implementing
   `DbConnector` on top of `sqlx`.
5. **`app/src-tauri`** — the desktop shell. It depends directly on
   `khipu-engine` and the drivers (not through LSP/stdio) to keep latency
   low inside the app.
6. **`app/src`** — Svelte frontend, CodeMirror 6 editor.

## Adding a new database engine

For an engine whose dialect `sqlparser` already supports:

1. Create `crates/drivers/<engine>` (`cargo new --lib`).
2. Implement `DbConnector` for that engine. For `introspect_schema`, see
   [`docs/design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md):
   what goes in each category, how to handle server versions and what to do
   when a category cannot be read.
3. Add it as a workspace member and as a dependency of `app/src-tauri`
   (it is not optional today: there are no Cargo feature flags to disable
   drivers).
4. Add its branch to the driver factory in `app/src-tauri/src/drivers.rs`
   (`DatabaseKind` enum).

No changes to `khipu-engine` or the frontend are needed. An engine with a
different SQL dialect does require extending the `Dialect` enum in
`crates/engine/src/lib.rs`.

## Engine roadmap

MySQL → PostgreSQL → to be decided by community demand.
