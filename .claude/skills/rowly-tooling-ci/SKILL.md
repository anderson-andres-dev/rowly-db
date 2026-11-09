---
name: rowly-tooling-ci
description: Change CI, repository tools or architecture rules. Use when asked to: change the ci; github workflow; repository tool; architecture rules.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `tooling-ci` in tools/architecture/model.json -->

# Change CI, repository tools or architecture rules

## Read first

- [docs/ARCHITECTURE.md#boundaries-that-check-themselves](../../../docs/ARCHITECTURE.md#boundaries-that-check-themselves)
- [docs/ARCHITECTURE.md#sources-of-truth](../../../docs/ARCHITECTURE.md#sources-of-truth)
- [CONTRIBUTING.md#workflow](../../../CONTRIBUTING.md#workflow)

## Steps

1. Dependency rules and the feature catalogue are data in `tools/architecture/model.json`; edit the data, then run `--write`.
2. CI runs only what a change touches (`tools/ci/areas.json`); a new tool needs its path there.
3. Never edit generated blocks by hand.

## Rules that apply

- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
- **code-in-a-feature** — Every code file belongs to a feature in `tools/architecture/model.json`.
- **tests-in-inventory** — Every test file has an entry in `tests/inventory.json` (owner, property, risk, gate).

## Before you finish

- `node tools/architecture/graph.mjs --check`
- `node tools/orient/features.mjs --check`
