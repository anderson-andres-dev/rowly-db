# Playbooks

<!-- generated: playbooks (tools/orient/playbooks.mjs) -->

The procedure for each kind of change: what to read, what to do, which rules matter and what to run. Generated from the `playbooks` and `rules` keys of `tools/architecture/model.json`; to change it, edit the model and run `node tools/orient/features.mjs --write`. Never edit this file by hand. `node tools/orient/orient.mjs --playbook "<request>"` finds the right one.

## Index

- [`understand-repo`](#understand-repo): Understand or explain the repository
- [`fix-bug`](#fix-bug): Fix a bug
- [`ipc-command`](#ipc-command): Add or change a backend command (IPC)
- [`ui-text`](#ui-text): Change the interface or its texts
- [`sql-behavior`](#sql-behavior): Change how SQL is analyzed, guarded or generated
- [`add-engine`](#add-engine): Add a database engine or a version line
- [`add-tests`](#add-tests): Add or fix tests
- [`tooling-ci`](#tooling-ci): Change CI, repository tools or architecture rules
- [`write-docs`](#write-docs): Change documentation
- [`release`](#release): Publish a release

## understand-repo

**Understand or explain the repository.** Asked as: "analyze the repo", "explain the project", "how is it organized", "what does this repository do", "overall architecture".

### Read first

- [docs/ARCHITECTURE.md#the-idea](../../docs/ARCHITECTURE.md#the-idea)
- [docs/ARCHITECTURE.md#layers-and-dependencies](../../docs/ARCHITECTURE.md#layers-and-dependencies)
- [docs/ARCHITECTURE.md#how-sql-flows](../../docs/ARCHITECTURE.md#how-sql-flows)

### Steps

1. Answer from the map in AGENTS.md first; it already names every feature and its entry file.
2. Read only the sections above if more depth is needed.
3. For one feature run `node tools/orient/orient.mjs --expand <feature>`; open at most its entry file.

### Rules that apply

- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **one-owner-per-state** — Each piece of state has one owner; others read it through its interface and keep no second mutable copy.

## fix-bug

**Fix a bug.** Asked as: "fix this bug", "fix the error", "it fails when", "does not work", "crashes when".

### Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../docs/ARCHITECTURE.md#rules-for-the-app)

### Steps

1. Run `node tools/orient/orient.mjs "<the symptom>"` and read only the line ranges it names.
2. Write the failing test next to the code first; it stays as a permanent regression test.
3. Run the tests the card lists, not the whole suite.
4. Run `--impact <file>` before changing anything shared.

### Rules that apply

- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).
- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.

### Before you finish

- `node tools/inventory/tests.mjs --check`

## ipc-command

**Add or change a backend command (IPC).** Asked as: "add a command", "new backend command", "tauri command", "expose to the frontend", "new invoke".

### Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../docs/ARCHITECTURE.md#rules-for-the-app)

### Steps

1. Put the work in `services/` and the adapter in `commands/`; the command never repeats the guard, the catalog or the pools.
2. Register it in `lib.rs`.
3. Add it with its single owner module to `app/src/lib/backend.test.ts`.
4. Call it from the frontend only through `backend.ts`.

### Rules that apply

- **one-owner-per-command** — A new backend command is registered in `lib.rs` and added with its single owner module to `app/src/lib/backend.test.ts`.
- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.
- **code-in-a-feature** — Every code file belongs to a feature in `tools/architecture/model.json`.

### Before you finish

- `cd app && npx vitest run src/lib/backend.test.ts`
- `node tools/orient/features.mjs --check`

## ui-text

**Change the interface or its texts.** Asked as: "change a text", "translate", "new button", "change the interface", "ui message".

### Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../docs/ARCHITECTURE.md#rules-for-the-app)

### Steps

1. Every visible text goes through `app/src/lib/i18n/messages/` in Spanish and English, never inline.
2. Reuse the shared UI pieces (tooltip, select, field, menu, checkbox, button); nothing native.
3. Everything must be operable by keyboard.
4. Say Rowly DB to the user, never Khipu.

### Rules that apply

- **i18n-texts** — Text the user sees goes through `app/src/lib/i18n/messages/` in Spanish and English, never inline.
- **names** — Rowly DB is the product and what the user sees; Khipu is the internal engine name (crates, identifiers, settings keys).
- **proportional-work** — Work is proportional to what is visible, and optional costs fall on whoever enables them.

### Before you finish

- `cd app && npm run check`

## sql-behavior

**Change how SQL is analyzed, guarded or generated.** Asked as: "change the guard", "destructive statement", "editor diagnostics", "pagination", "generated sql".

### Read first

- [SQL_ENGINE.md#6-the-matrix](../../SQL_ENGINE.md#6-the-matrix)
- [SQL_ENGINE.md#61-safety](../../SQL_ENGINE.md#61-safety)
- [docs/ARCHITECTURE.md#how-sql-flows](../../docs/ARCHITECTURE.md#how-sql-flows)

### Steps

1. Read SQL_ENGINE.md before touching engines, drivers, generated SQL, analysis or execution.
2. The UI never decides if a statement is safe; the backend guard does.
3. A new bug becomes a permanent fixture or test (SQL_ENGINE §13).
4. What differs by engine is data or its own crate, never an engine name in common code.

### Rules that apply

- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.
- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

### Before you finish

- `node tools/architecture/graph.mjs --check`
- `node tools/inventory/coverage.mjs`

## add-engine

**Add a database engine or a version line.** Asked as: "add an engine", "new database engine", "new version line", "support sqlite", "new server version".

### Read first

- [ENGINE_GUIDE.md#the-path-at-a-glance](../../ENGINE_GUIDE.md#the-path-at-a-glance)
- [ENGINE_GUIDE.md#a-new-line-of-an-existing-engine](../../ENGINE_GUIDE.md#a-new-line-of-an-existing-engine)
- [ENGINE_GUIDE.md#done-means](../../ENGINE_GUIDE.md#done-means)
- [CONTRIBUTING.md#adding-a-database-engine](../../CONTRIBUTING.md#adding-a-database-engine)

### Steps

1. Start with `node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>`; the compiler and the tests name every step left.
2. Follow ENGINE_GUIDE.md in order; an engine without the full matrix is Experimental.
3. Run `node tools/inventory/status.mjs --write` for the generated tables.
4. A missing upstream feature is a documented gap, never a fork.

### Rules that apply

- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **published-deps-only** — Dependencies are published releases only: no forks, git dependencies or patches.
- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.

### Before you finish

- `node tools/inventory/coverage.mjs`
- `node tools/inventory/status.mjs`
- `node tools/architecture/graph.mjs --check`

## add-tests

**Add or fix tests.** Asked as: "add tests", "write tests", "cover with tests", "failing test", "how to run the tests", "add tests for a module", "where the tests go and what to register".

### Read first

- [SQL_ENGINE.md#102-rules](../../SQL_ENGINE.md#102-rules)
- [CONTRIBUTING.md#workflow](../../CONTRIBUTING.md#workflow)

### Steps

1. A test sits next to the code it covers (Vitest, `#[cfg(test)]`).
2. Add the test file to `tests/inventory.json` (owner, property, risk, gate).
3. Find what protects an area with `node tools/orient/orient.mjs --expand <feature>`; it lists its tests.
4. Real-server tests live in `crates/server-tests`; E2E in `app/tests/e2e`.

### Rules that apply

- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

### Before you finish

- `node tools/inventory/tests.mjs --check`

## tooling-ci

**Change CI, repository tools or architecture rules.** Asked as: "change the ci", "github workflow", "repository tool", "architecture rules", "allowed dependencies".

### Read first

- [docs/ARCHITECTURE.md#boundaries-that-check-themselves](../../docs/ARCHITECTURE.md#boundaries-that-check-themselves)
- [docs/ARCHITECTURE.md#sources-of-truth](../../docs/ARCHITECTURE.md#sources-of-truth)
- [CONTRIBUTING.md#workflow](../../CONTRIBUTING.md#workflow)

### Steps

1. Dependency rules and the feature catalogue are data in `tools/architecture/model.json`; edit the data, then run `--write`.
2. CI runs only what a change touches (`tools/ci/areas.json`); a new tool needs its path there.
3. Never edit generated blocks by hand.

### Rules that apply

- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
- **code-in-a-feature** — Every code file belongs to a feature in `tools/architecture/model.json`.
- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

### Before you finish

- `node tools/architecture/graph.mjs --check`
- `node tools/orient/features.mjs --check`

## write-docs

**Change documentation.** Asked as: "update the documentation", "edit the readme", "document this", "fix the guide", "translate a document".

### Read first

- [CONTRIBUTING.md#style](../../CONTRIBUTING.md#style)
- [docs/ARCHITECTURE.md#sources-of-truth](../../docs/ARCHITECTURE.md#sources-of-truth)

### Steps

1. Public docs are in English with a Spanish copy `*.es.md`; change both together.
2. Do not edit what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
3. Point to the document that owns a fact instead of repeating it.

### Rules that apply

- **spanish-pairs** — Docs that have a Spanish pair (`*.es.md`) change together with it.
- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
- **small-entry-file** — Keep `AGENTS.md` under 14 000 characters: it is loaded in every session.

### Before you finish

- `node tools/inventory/status.mjs`
- `node tools/orient/features.mjs --check`

## release

**Publish a release.** Asked as: "publish a release", "cut a release", "bump the version", "tag the release", "new app version".

### Read first

- [CONTRIBUTING.md#releasing](../../CONTRIBUTING.md#releasing)
- [CONTRIBUTING.md#release-highlight](../../CONTRIBUTING.md#release-highlight)

### Steps

1. Bump the version in `Cargo.toml`, `app/package.json` and `app/src-tauri/tauri.conf.json` with their lockfiles.
2. Pull request `develop` into `main`; the maintainer merges it, never the agent.
3. Tag the merge commit `vX.Y.Z`; the tag must match `tauri.conf.json`.
4. Never delete a release.

### Rules that apply

- **branch-flow** — Branch off `develop` and open the pull request into `develop`; `main` and `develop` take no direct pushes.

<!-- /generated -->
