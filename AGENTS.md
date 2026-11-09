# AGENTS.md

Rowly DB: a desktop SQL client (Tauri 2, Svelte, a Rust workspace) for MySQL, MariaDB and PostgreSQL. Khipu is the internal name of its engine; crates, identifiers and settings keys start with `khipu`, and everything the user sees says Rowly DB.

This file is the entry point for any coding agent and it is the map: **read it before exploring anything**. It points to the documents that own each fact; it does not repeat them.

## The repository in one minute

- **Frontend** (`app/src/lib`, Svelte + TypeScript): components in `components/`, pure logic next to them (`workspace/`, `editor/`, `results/`, `connections/`, `stores/`), texts in `i18n/messages/`. It talks to the backend only through Tauri IPC commands (`backend.ts`); every command has one owner module.
- **Backend** (`app/src-tauri/src`, Rust): `commands/` adapt IPC, `services/` do the work, `state.rs` holds the app state, `drivers.rs` is the registry of engines.
- **SQL engine** (`crates/engine`): knows nothing of Tauri, Svelte or any driver. Parser, execution guard (destructive statements), diagnostics, pagination and the dialect of each engine.
- **Drivers** (`crates/driver-core` is the contract; `crates/drivers/{mysql,postgres}` implement it). What differs between engines is data (`support/*.json`, version lines) plus those crates, never `if engine == ...` in common code.
- **Tests** live next to the code (Vitest, `#[cfg(test)]`); `crates/server-tests` runs against real servers; `app/tests/e2e` drives the real app. `tests/inventory.json` lists every test file with its owner and CI gate.
- **Big files, read them by line range, never whole**: `Workspace.svelte` (~2 000 lines), `DataGrid.svelte` (~3 000), `terminal.rs` (~1 000), `SQL_ENGINE.md` and `docs/ARCHITECTURE.md` (use their section anchors).

## What to do with a generic request

Do not start by scanning. Use the map below and the orientation tool; open files only to confirm.

| You are asked | Do this | Do not |
|---|---|---|
| "Analyze / explain the repo" | Answer from this file; add [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) sections "The idea", "Layers and dependencies" and "How SQL flows" if depth is needed. Open at most the entry file of a feature you are asked about. | List directories, read every crate, run repository-wide greps. |
| "How could I make this change / implement X" | `node tools/orient/orient.mjs "<the request>"`, read the line ranges it names, then `--impact <file>` to see what else changes. Answer with: files to touch, what to reuse, tests to run. | Read many files first and plan afterwards. |
| "Fix this bug" | `node tools/orient/orient.mjs "<the symptom>"`, read the ranges, run the tests it lists (it gives the command). | Run the whole suite or read whole files. |
| "Where is X / what does X do" | Find X in the map below, then `node tools/orient/orient.mjs --expand <feature>` for its files and symbols. | `find`, `ls -R`, broad greps. |
| "Refactor / review" | `node tools/orient/orient.mjs --impact <file or feature>`: who uses it, whom it uses, the tests of both. | Edit before knowing the dependants. |

Budget: have a plan after about five files. If the map and the card do not answer, widen one step (`--expand`, then a targeted `grep` inside the folder they name), not the whole repository. The card is a hint, not an answer: on varied tasks its first five files hold about half of the files a change touched (at least one in about seven cases out of ten), so verify before relying on it. `LIKELY` means probably the right area, not that nothing else needs reading; `PARTIAL`, `AMBIGUOUS` and `NO MATCH` say what to do next. It needs only Node and the repository; `--json` gives a versioned JSON object; details, limits and measurements are in [tools/orient/README.md](tools/orient/README.md).

## Map of features

Each line is `feature` — what it is → its main file or folder. Generated from `tools/architecture/model.json` (`node tools/orient/features.mjs --write`); the full table with terms, tests and neighbours is [docs/map/FEATURES.md](docs/map/FEATURES.md) (read its index only).

<!-- generated: map (tools/orient/features.mjs) -->
- `connection-profiles` — Saved connections → `app/src/lib/components/ConnectionForm.svelte`
- `explorer-tree` — The database explorer → `app/src/lib/components/SchemaTree.svelte`
- `sql-editor` — The SQL editor itself → `app/src/lib/SqlEditor.svelte`
- `editor-completion` — Autocompletion in the editor → `app/src/lib/editor/catalogCompletions.ts`
- `sql-diagnostics` — Static analysis of SQL while typing → `app/src/lib/editor/analysisRunner.ts`
- `editor-formatting` — Formatting SQL → `app/src/lib/editor/formatter.ts`
- `editor-search` — Find and replace inside the editor → `app/src/lib/editorSearch/`
- `statement-execution` — Running SQL → `app/src/lib/workspace/executionSession.ts`
- `execution-guard` — The guard that classifies a statement as destructive and asks for confirmatio… → `crates/engine/src/execution_guard.rs`
- `query-parameters` — Parameters in a query (named and positional) → `app/src/lib/components/ParametersDialog.svelte`
- `results-grid` — The results grid → `app/src/lib/components/results/DataGrid.svelte`
- `results-editing` — Editing data from the grid → `app/src/lib/components/results/ChangesPreview.svelte`
- `results-filter-sort` — Filtering and sorting results → `app/src/lib/components/results/TableFilters.svelte`
- `results-paging` — Paging and counting rows → `app/src/lib/components/results/ResultPager.svelte`
- `results-export-copy` — Getting data out → `app/src/lib/components/results/ExportDialog.svelte`
- `result-tabs` — Result tabs and the output log → `app/src/lib/components/results/ResultPane.svelte`
- `workspace-tiles` — The workspace → `app/src/lib/components/Workspace.svelte`
- `console-files` — SQL files and folders → `app/src/lib/components/FileTree.svelte`
- `query-history` — History of executed queries → `app/src/lib/components/QueryHistory.svelte`
- `terminal` — The integrated terminal → `app/src/lib/components/Terminal.svelte`
- `keyboard-shortcuts` — Keyboard first → `app/src/lib/keybindings.ts`
- `settings-theming` — The settings panel, colour palettes and themes, icon optics and motion → `app/src/lib/components/SettingsPanel.svelte`
- `i18n` — Interface languages → `app/src/lib/i18n/`
- `updates` — Updates and release highlights → `app/src/lib/components/UpdatePrompt.svelte`
- `support-packs` — Version support packs → `app/src/lib/stores/supportPackages.ts`
- `ui-components` — Shared UI pieces → `app/src/lib/components/Button.svelte`
- `app-shell` — The app shell → `app/src-tauri/src/lib.rs`
- `engine-registration` — How an engine is registered and described → `app/src-tauri/src/drivers.rs`
- `engine-core` — The engine core → `crates/engine/src/lib.rs`
- `driver-core` — The driver contract → `crates/driver-core/src/`
- `driver-mysql` — The MySQL and MariaDB driver → `crates/drivers/mysql/src/`
- `driver-postgres` — The PostgreSQL driver → `crates/drivers/postgres/src/`
- `version-lines` — Version lines → `support/`
- `language-server` — The engine language server, a stub for now → `crates/engine-lsp/src/`
- `real-server-tests` — Tests against real servers → `crates/server-tests/`
- `e2e-and-benchmarks` — End-to-end tests of the real app, resource cycles and performance baselines → `app/tests/e2e/`
- `ci-release` — Continuous integration and releases → `.github/workflows/`
- `repo-tooling` — Repository tooling → `tools/architecture/`
- `website` — The public website and its community pages, with the screenshots taken from t… → `site/`
- `build-config` — Project configuration files → `Cargo.toml`
<!-- /generated: map -->

## Where the facts live

1. Layout, domains and where each kind of change goes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The dependency rules between domains are data in `tools/architecture/model.json` and are checked in CI.
2. Engines, drivers, generated SQL, analysis or execution: read [SQL_ENGINE.md](SQL_ENGINE.md) first. Adding or changing an engine or a version line: [ENGINE_GUIDE.md](ENGINE_GUIDE.md).
3. Which tests protect an area: `tests/inventory.json`. A test sits next to the code it covers.
4. Optional symbol graph: `graphify query "<question>"`; not versioned, build it with `graphify update .`. Nothing depends on it.

## Rules that are easy to break

- Branch off `develop` and open the pull request into `develop`. `main` and `develop` take no direct pushes.
- Blocks between `<!-- generated: ... -->` markers are written by tools (`node tools/architecture/graph.mjs --write`, `node tools/inventory/status.mjs --write`, `node tools/orient/features.mjs --write`). Never edit them by hand.
- Every test file needs an entry in `tests/inventory.json`; `node tools/inventory/tests.mjs --check` fails until it has one. Every code file belongs to a feature in `model.json`; CI fails on one that none lists.
- Text the user sees goes through `app/src/lib/i18n/messages/` (Spanish and English), not inline strings.
- Common code never names a concrete engine: engine-specific code lives in its own domain (see ARCHITECTURE, "Where engine-specific code may live").
- Dependencies are published releases only: no forks, git dependencies or patches (`node tools/inventory/dependencies.mjs`).
- Docs that have a Spanish pair (`*.es.md`) change together with it.

## Checks

The full list to run before a pull request is in [CONTRIBUTING.md](CONTRIBUTING.md#workflow). CI runs only what a change touches; the plan is in the `Plan` job summary and the rules in `tools/ci/areas.json`.
