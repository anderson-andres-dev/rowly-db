# Architecture

**English** · [Español](ARCHITECTURE.es.md)

Rowly DB is the app. Khipu is its engine, which is why the crates are named `khipu-*`.

## The idea

The engine parses SQL, keeps the schema catalog and builds suggestions without knowing about Tauri, Svelte or any particular database. All it sees is a generic `SchemaCatalog`. That is what makes it possible to:

- use `khipu-lsp` from Neovim or VS Code without the desktop app
- add an engine while keeping shared analysis, its dialect rules and the driver separate; `Dialect` and exhaustive contracts still require changes
- test the engine without a running database

## Layers

| Path | Role |
| :--- | :--- |
| `crates/engine` | Validates SQL against each dialect's grammar, resolves what is under the cursor and ranks suggestions from the catalog. |
| `crates/engine-lsp` | Exposes the engine as an LSP server so any editor can use it. |
| `crates/driver-core` | The `DbConnector` contract every database implements: connect, list schemas, read a full schema and run queries. |
| `crates/drivers/*` | Protocol connectors built on `sqlx`; MySQL and MariaDB share a connector but keep distinct dialects and profiles. |
| `app/src-tauri` | The desktop shell. It calls the engine and drivers directly, not through LSP, to keep latency low. |
| `app/src` | Svelte frontend with a CodeMirror 6 editor. |

The engine depends on no driver, not even `driver-core`. The app creates each driver in `app/src-tauri/src/drivers.rs`, works with it through `DbConnector` and turns the schema it reads into the engine's catalog in `catalog_adapter.rs`. Each connection profile chooses its TLS mode, and each driver applies it in its own `tls.rs`.

## Dialects

`Dialect` in `crates/engine/src/lib.rs` enumerates SQL engines. Adding one requires reviewing all exhaustive engine and frontend decisions even when `sqlparser` knows its syntax. Sharing a parser or protocol does not authorize sharing guard rules, quoting, introspection or capabilities without tests. [SQL_ENGINE.md](../SQL_ENGINE.md) defines the matrix, versions and gates that prove integration.

Every driver is compiled into the app. There are no Cargo features to leave one out.

## Where to go next

- [Adding a database engine](../CONTRIBUTING.md#adding-a-database-engine), step by step.
- [Permanent SQL engine contract](../SQL_ENGINE.md): what to test, on which versions and when.
- [`design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md) covers what a driver must return when reading a schema and how to handle server versions. It is in Spanish.
