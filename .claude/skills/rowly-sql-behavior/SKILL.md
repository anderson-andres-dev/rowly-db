---
name: rowly-sql-behavior
description: Change how SQL is analyzed, guarded or generated. Use when asked to: change the guard; destructive statement; editor diagnostics; pagination.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `sql-behavior` in tools/architecture/model.json -->

# Change how SQL is analyzed, guarded or generated

## Read first

- [SQL_ENGINE.md#6-the-matrix](../../../SQL_ENGINE.md#6-the-matrix)
- [SQL_ENGINE.md#61-safety](../../../SQL_ENGINE.md#61-safety)
- [docs/ARCHITECTURE.md#how-sql-flows](../../../docs/ARCHITECTURE.md#how-sql-flows)

## Steps

1. Read SQL_ENGINE.md before touching engines, drivers, generated SQL, analysis or execution.
2. The UI never decides if a statement is safe; the backend guard does.
3. A new bug becomes a permanent fixture or test (SQL_ENGINE §13).
4. What differs by engine is data or its own crate, never an engine name in common code.

## Rules that apply

- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.
- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

## Before you finish

- `node tools/architecture/graph.mjs --check`
- `node tools/inventory/coverage.mjs`
