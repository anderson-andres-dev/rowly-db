---
name: rowly-fix-bug
description: Fix a bug. Use when asked to: fix this bug; fix the error; it fails when; does not work.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `fix-bug` in tools/architecture/model.json -->

# Fix a bug

## Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../../docs/ARCHITECTURE.md#rules-for-the-app)

## Steps

1. Run `node tools/orient/orient.mjs "<the symptom>"` and read only the line ranges it names.
2. Write the failing test next to the code first; it stays as a permanent regression test.
3. Run the tests the card lists, not the whole suite.
4. Run `--impact <file>` before changing anything shared.

## Rules that apply

- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).
- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.

## Before you finish

- `node tools/inventory/tests.mjs --check`
