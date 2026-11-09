# AGENTS.md

Rowly DB: a desktop SQL client (Tauri 2, Svelte, a Rust workspace) for MySQL, MariaDB and PostgreSQL. Khipu is the internal name of its engine; crates, identifiers and settings keys start with `khipu`, and everything the user sees says Rowly DB.

This file is the entry point for any coding agent. It points to the documents that own each fact; it does not repeat them.

## Find your way

Start with `node tools/orient/orient.mjs "<what you were asked>"` (bug, new feature, change, refactor, tests or a question). It returns a card of about 500 tokens: the feature involved, the line ranges to read, what to reuse, what depends on it, the tests to run and whether that is enough. If the card says `PARTIAL` or `AMBIGUOUS`, go one level deeper with `--expand <feature>` (its files and symbols) or `--impact <path|feature>` (who uses it and whom it uses). It needs only Node and the repository; the optional graph below adds hints when present. The index is cached in `.orient/` and refreshes itself.

The documents it draws from:

1. Layout, domains and where each kind of change goes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The dependency rules between domains are data in `tools/architecture/model.json` and are checked in CI.
2. What a task names ("the grid", "the explorer", "the terminal") and the files and tests behind it: [docs/map/FEATURES.md](docs/map/FEATURES.md), generated from the `features` key of `model.json`. Add a file to the feature it belongs to; CI fails on a code file no feature lists.
3. Which tests protect an area, with owner and CI gate: `tests/inventory.json`. A test sits next to the code it covers.
4. Engines, drivers, generated SQL, analysis or execution: read [SQL_ENGINE.md](SQL_ENGINE.md) first. Adding or changing an engine or a version line: [ENGINE_GUIDE.md](ENGINE_GUIDE.md).
5. Optional symbol graph: `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`. It is not versioned; build it locally with `graphify update .` (`graphifyy` on PyPI). Without it, use 1 to 3 and search the code.

Read only the area a task touches. Do not scan the whole repository.

## Rules that are easy to break

- Branch off `develop` and open the pull request into `develop`. `main` and `develop` take no direct pushes.
- Blocks between `<!-- generated: ... -->` markers are written by tools (`node tools/architecture/graph.mjs --write`, `node tools/inventory/status.mjs --write`, `node tools/orient/features.mjs --write`). Never edit them by hand.
- Every test file needs an entry in `tests/inventory.json`; `node tools/inventory/tests.mjs --check` fails until it has one.
- Text the user sees goes through `app/src/lib/i18n/messages/` (Spanish and English), not inline strings.
- Common code never names a concrete engine: engine-specific code lives in its own domain (see ARCHITECTURE, "Where engine-specific code may live").
- Dependencies are published releases only: no forks, git dependencies or patches (`node tools/inventory/dependencies.mjs`).
- Docs that have a Spanish pair (`*.es.md`) change together with it.

## Checks

The full list to run before a pull request is in [CONTRIBUTING.md](CONTRIBUTING.md#workflow). CI runs only what a change touches; the plan is in the `Plan` job summary and the rules in `tools/ci/areas.json`.

## After changing code

Refresh the optional graph with `graphify update .` if you use it. Nothing in the repository depends on it.
