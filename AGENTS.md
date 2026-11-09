# AGENTS.md

Rowly DB: a desktop SQL client (Tauri 2, Svelte, a Rust workspace) for MySQL, MariaDB and PostgreSQL. Khipu is the internal name of its engine; crates, identifiers and settings keys start with `khipu`, and everything the user sees says Rowly DB.

This file is the entry point for any coding agent. It is a map of where the context is, not the context: **read it before exploring anything**. It points to the documents that own each fact and does not repeat them. [docs/AI.md](docs/AI.md) explains how the pieces fit.

## How this repo works with you

1. **Playbooks**: every kind of change has a procedure (what to read, steps, rules, checks). Find it below or with `orient --playbook`.
2. **Map**: every feature and its entry file, below. Never list directories to find one.
3. **Rules**: the persistent decisions, each with why and the command that checks it.
4. **Tools**: `node tools/orient/orient.mjs` (written `orient` below) answers "where is it, what else changes, which tests". Only Node and the repository.
5. **Versions**: [docs/map/STACK.md](docs/map/STACK.md) has the real version of each dependency and its docs.

## The repository in one minute

- **Frontend** (`app/src/lib`, Svelte + TypeScript): components in `components/`, pure logic next to them (`workspace/`, `editor/`, `results/`, `connections/`, `stores/`), texts in `i18n/messages/`. It talks to the backend only through Tauri IPC commands (`backend.ts`); every command has one owner module.
- **Backend** (`app/src-tauri/src`, Rust): `commands/` adapt IPC, `services/` do the work, `state.rs` holds the app state, `drivers.rs` is the registry of engines.
- **SQL engine** (`crates/engine`): knows nothing of Tauri, Svelte or any driver. Parser, execution guard (destructive statements), diagnostics, pagination and the dialect of each engine.
- **Drivers** (`crates/driver-core` is the contract; `crates/drivers/{mysql,postgres}` implement it). What differs between engines is data (`support/*.json`, version lines) plus those crates, never `if engine == ...` in common code.
- **Tests** live next to the code (Vitest, `#[cfg(test)]`); `crates/server-tests` runs against real servers; `app/tests/e2e` drives the real app. `tests/inventory.json` lists every test file with its owner and CI gate.
- **Big files, read them by line range, never whole**: `Workspace.svelte` (~2 000 lines), `DataGrid.svelte` (~3 000), `terminal.rs` (~1 000), `SQL_ENGINE.md` and `docs/ARCHITECTURE.md` (use their section anchors).

## Playbooks

Find yours with `node tools/orient/orient.mjs --playbook "<the request>"`; the steps of all are in [docs/map/PLAYBOOKS.md](docs/map/PLAYBOOKS.md), and Claude Code and Codex load them as skills (`rowly-<id>`).

<!-- generated: router (tools/orient/blocks.mjs) -->
- `understand-repo` — Understand or explain the repository. Read: docs/ARCHITECTURE.md#the-idea
- `fix-bug` — Fix a bug. Read: docs/ARCHITECTURE.md#rules-for-the-app
- `ipc-command` — Add or change a backend command (IPC). Read: docs/ARCHITECTURE.md#rules-for-the-app
- `ui-text` — Change the interface or its texts. Read: docs/ARCHITECTURE.md#rules-for-the-app
- `sql-behavior` — Change how SQL is analyzed, guarded or generated. Read: SQL_ENGINE.md#6-the-matrix
- `add-engine` — Add a database engine or a version line. Read: ENGINE_GUIDE.md#the-path-at-a-glance
- `add-tests` — Add or fix tests. Read: SQL_ENGINE.md#102-rules
- `tooling-ci` — Change CI, repository tools or architecture rules. Read: docs/ARCHITECTURE.md#boundaries-that-check-themselves
- `write-docs` — Change documentation. Read: CONTRIBUTING.md#style
- `release` — Publish a release. Read: CONTRIBUTING.md#releasing
<!-- /generated: router -->

## What to do with a generic request

Do not start by scanning. Use the playbook or this table and the orientation tool; open files only to confirm.

| You are asked | Do this | Do not |
|---|---|---|
| "Analyze / explain the repo" | Answer from this file; add [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) sections "The idea", "Layers and dependencies" and "How SQL flows" if depth is needed. | List directories, read every crate, grep the repository. |
| "How could I make this change / implement X" | `orient "<the request>"`, read the line ranges it names, then `--impact <file>`. Answer with: files to touch, what to reuse, tests to run. | Read many files first and plan afterwards. |
| "Fix this bug" | `orient "<the symptom>"`, read the ranges, run the tests it lists. | Run the whole suite or read whole files. |
| "Where is X / what does X do" | Find X in the map below, then `orient --expand <feature>`. | `find`, `ls -R`, broad greps. |
| "Refactor / review" | `orient --impact <file or feature>`: who uses it, whom it uses, the tests of both. | Edit before knowing the dependants. |

Budget: have a plan after about five files. If the map and the card do not answer, widen one step (`--expand`, then a targeted `grep` inside the folder they name), not the whole repository. The card is a hint: its first five files hold about half of the files a change touched, so verify. `LIKELY` means probably the right area; `PARTIAL`, `AMBIGUOUS` and `NO MATCH` say what to do next. `--json` is versioned; limits and measurements: [tools/orient/README.md](tools/orient/README.md).

## Map of features

Each line is `feature` — what it is → its main file or folder. The full table with terms, tests and neighbours is [docs/map/FEATURES.md](docs/map/FEATURES.md) (read its index only).

<!-- generated: map (tools/orient/blocks.mjs) -->
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

1. Layout, domains and where each kind of change goes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The dependency rules are data in `tools/architecture/model.json`, checked in CI.
2. Engines, drivers, generated SQL, analysis or execution: [SQL_ENGINE.md](SQL_ENGINE.md) first. Adding or changing an engine or a version line: [ENGINE_GUIDE.md](ENGINE_GUIDE.md).
3. Which tests protect an area: `tests/inventory.json`. Real dependency versions and their docs: [docs/map/STACK.md](docs/map/STACK.md).
4. Optional symbol graph: `graphify query "<question>"`; not versioned, build it with `graphify update .`. Nothing depends on it.

## Rules

Persistent decisions, each with why it exists and the command that checks it.

<!-- generated: rules (tools/orient/blocks.mjs) -->
- **branch-flow** — Branch off `develop` and open the pull request into `develop`; `main` and `develop` take no direct pushes. *Why:* Releases come from `main`; `develop` is where the work meets.
- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`. *Why:* A tool rewrites it and CI fails when it is stale. Check: `node tools/architecture/graph.mjs --check`.
- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate). *Why:* The inventory is how CI and agents find what protects what. Check: `node tools/inventory/tests.mjs --check`.
- **code-in-a-feature** — Every code file belongs to a feature in `tools/architecture/model.json`. *Why:* The catalogue is the map agents start from. Check: `node tools/orient/features.mjs --check`.
- **i18n-texts** — Text the user sees goes through `app/src/lib/i18n/messages/` in Spanish and English, never inline. *Why:* TypeScript requires every language to have the same keys. Check: `cd app && npm run check`.
- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain. *Why:* Engines differ as declared data, so adding one leaves shared code alone. Check: `node tools/architecture/graph.mjs --check`.
- **published-deps-only** — Dependencies are published releases only: no forks, git dependencies or patches. *Why:* A missing upstream feature is a documented gap, never a fork. Check: `node tools/inventory/dependencies.mjs`.
- **dependency-versions** — Before using the API of a dependency, look up its resolved version in `docs/map/STACK.md` and read the documentation of that version. *Why:* Memory and "latest" docs describe other majors (Tauri 2, Svelte 5, Vite 8). Check: `node tools/orient/stack.mjs --check`.
- **spanish-pairs** — Docs that have a Spanish pair (`*.es.md`) change together with it. *Why:* The two languages must not drift apart.
- **one-owner-per-command** — A new backend command is registered in `lib.rs` and added with its single owner module to `app/src/lib/backend.test.ts`. *Why:* Each IPC command has one owner and the test pins the list. Check: `cd app && npx vitest run src/lib/backend.test.ts`.
- **one-owner-per-state** — Each piece of state has one owner; others read it through its interface and keep no second mutable copy. *Why:* Connection, catalog, execution, tabs and editor live for different spans.
- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does. *Why:* Editor, history, table and paging must not each reimplement safety.
- **proportional-work** — Work is proportional to what is visible, and optional costs fall on whoever enables them. *Why:* The grid is a virtual window; more tabs must not multiply listeners or queries.
- **names** — Rowly DB is the product and what the user sees; Khipu is the internal engine name (crates, identifiers, settings keys). *Why:* Renaming internals would break settings and crates for no gain.
- **small-entry-file** — Keep `AGENTS.md` under 14 000 characters: it is loaded in every session. *Why:* Every token there is paid on every request. Check: `node --test tools/orient/coherence.test.mjs`.
<!-- /generated: rules -->

## Checks

The full list to run before a pull request is in [CONTRIBUTING.md](CONTRIBUTING.md#workflow). CI runs only what a change touches; the plan is in the `Plan` job summary and the rules in `tools/ci/areas.json`. To change this toolkit, edit `tools/architecture/model.json` and run `node tools/orient/features.mjs --write` ([docs/AI.md](docs/AI.md#changing-the-toolkit)).
