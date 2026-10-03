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

The engine depends on no driver, not even `driver-core`. The app creates each driver in `app/src-tauri/src/drivers.rs`, works with it through `DbConnector` and turns the schema it reads into the engine's catalog in `services/catalog.rs`. Each connection profile chooses its TLS mode, and each driver applies it in its own `tls.rs`.

## Rules

1. **One owner per piece of state.** The connection, the catalog, execution, tabs and the editor document live for different spans. A module reads another's state through its interface; it does not keep a second mutable copy.
2. **One path to run SQL.** Editor, history, table and paging go through the same classification, confirmation and execution. The UI never decides whether a statement is safe: the backend guard does.
3. **Dependencies point one way:** Svelte components → use cases → domain stores and contracts → Tauri and SQL adapters.
4. **Work proportional to what is visible.** The grid is a virtual window; the editor analyzes what changes. Opening tabs or leaving the app open does not multiply listeners, caches or queries.
5. **Optional costs fall on whoever enables them.** With no extension active, no extension code loads, no worker starts and no store is queried.

## Inside the app

### Backend (`app/src-tauri/src`)

| Path | What it does |
| :--- | :--- |
| `lib.rs` | Builds the app and registers the commands. Nothing else. |
| `state.rs` | `AppState`: one `ActiveConnection` per window, with its connector, its shared catalog (`Arc<SchemaCatalog>`, rebuilt only when the schemas change) and the queries that can be cancelled. |
| `engine_context.rs` | Each connection's engine context, built once on connect: generation, engine, detected server, session mode, effective line, `schemaEpoch`, vendor support and verification. The frontend gets it read-only. |
| `commands/` | One file per domain (`query`, `catalog`, `connection`, `files`, `results`). Each command adapts its arguments and calls what already exists; it never repeats the guard, the catalog or the pools. |
| `services/` | What the commands do, without Tauri: the engine catalog, console texts, `.sql` files, exporting and editing results. |

Everything that runs SQL goes through the guard, with the session mode, before it reaches the driver: running, counting rows, exporting and applying grid changes.

### Frontend (`app/src/lib`)

| Path | What it does |
| :--- | :--- |
| `workspace/` | The run session (prepare, confirm, run, cancel, log), result tabs, grid changes, saving and closing consoles, the command registry and parameters. |
| `editor/` | Everything CodeMirror: configuration (`Compartment`s), analysis while typing, diagnostics, commands, autocomplete, cursor context, comments, formatting. Analysis does not depend on the DOM. |
| `results/` | The grid: virtual window, selection, search, sort, filters, clipboard, cell types and editing. |
| `connections/` | A connection's errors and identity, its test and the explorer tree. |
| `engines/` | Each engine's profile (lexing, quoting, errors) and `engineForContext`, which applies the session mode to it. |
| `stores/` | Shared state, each with one owner: connection and catalog (`connection.ts`), consoles (`queryConsoles.ts`), grid drafts (`resultEdits.ts`), history, settings. |

`SqlEditor.svelte` and `Workspace.svelte` only compose: they mount what these folders provide and translate events.

### Who owns each piece of state

| State | Owner | Invalidated |
| :--- | :--- | :--- |
| Connection | `ActiveConnection` in the backend; `stores/connection.ts` in the frontend | On going back to the list (`disconnect`) or closing the window |
| Engine, release and mode | `ConnectionEngineContext` | Never changes: reconnecting creates a new generation |
| Catalog | `ActiveConnection.catalog`; `catalogTables` and `databaseExplorer` in the frontend | Every schema change bumps `schemaEpoch` |
| Analysis cache | `editor/analysisSession.ts`, one at a time | Another generation, `schemaEpoch`, engine or set of tables the document creates; `analyze_sql` rejects requests made under another context |
| Consoles and their text | `stores/queryConsoles.ts` | When the console is closed |
| Grid drafts | `stores/resultEdits.ts` | On apply, revert or closing the tab |

### One path per command

Each backend command has a single frontend module that invokes it, pinned by `app/src/lib/backend.test.ts`: SQL runs only from `queryExecution.ts` (itself called only by `workspace/executionSession.ts`), the catalog loads only from `stores/connection.ts`, consoles save only from `stores/queryConsoles.ts`. A new command goes into that table with its owner. `app/src-tauri/src/lib.rs` checks that what is registered is exactly what the frontend invokes.

### Resources

Whatever repeats leaves nothing behind: 300 reconnections alternating engines, 300 cycles of opening, running and closing consoles with a theme switch, and idling with an open connection. `app/tests/e2e/resources.mjs` checks it on every PR using the live JavaScript heap, the backend and the DOM ([tools/bench/README.md](../tools/bench/README.md#resource-cycles)).

## Dialects

`Dialect` in `crates/engine/src/lib.rs` enumerates SQL engines. Adding one requires reviewing all exhaustive engine and frontend decisions even when `sqlparser` knows its syntax. Sharing a parser or protocol does not authorize sharing guard rules, quoting, introspection or capabilities without tests. [SQL_ENGINE.md](../SQL_ENGINE.md) defines the matrix, versions and gates that prove integration.

Every driver is compiled into the app. There are no Cargo features to leave one out.

## Where to go next

- [Adding a database engine](../CONTRIBUTING.md#adding-a-database-engine), step by step.
- [Permanent SQL engine contract](../SQL_ENGINE.md): what to test, on which versions and when.
- [`design/explorador-base-de-datos.md`](design/explorador-base-de-datos.md) covers what a driver must return when reading a schema and how to handle server versions. It is in Spanish.
