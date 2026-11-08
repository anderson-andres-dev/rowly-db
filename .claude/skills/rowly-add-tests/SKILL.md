---
name: rowly-add-tests
description: Add or fix tests. Use when asked to: add tests; write tests; cover with tests; failing test.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `add-tests` in tools/architecture/model.json -->

# Add or fix tests

## Read first

- [SQL_ENGINE.md#102-rules](../../../SQL_ENGINE.md#102-rules)
- [CONTRIBUTING.md#workflow](../../../CONTRIBUTING.md#workflow)

## Steps

1. A test sits next to the code it covers (Vitest, `#[cfg(test)]`).
2. Add the test file to `tests/inventory.json` (owner, property, risk, gate).
3. Find what protects an area with `node tools/orient/orient.mjs --expand <feature>`; it lists its tests.
4. Real-server tests live in `crates/server-tests`; E2E in `app/tests/e2e`.

## Rules that apply

- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

## Before you finish

- `node tools/inventory/tests.mjs --check`
