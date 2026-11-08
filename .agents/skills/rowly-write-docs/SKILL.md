---
name: rowly-write-docs
description: Change documentation. Use when asked to: update the documentation; edit the readme; document this; fix the guide.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `write-docs` in tools/architecture/model.json -->

# Change documentation

## Read first

- [CONTRIBUTING.md#style](../../../CONTRIBUTING.md#style)
- [docs/ARCHITECTURE.md#sources-of-truth](../../../docs/ARCHITECTURE.md#sources-of-truth)

## Steps

1. Public docs are in English with a Spanish copy `*.es.md`; change both together.
2. Do not edit what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
3. Point to the document that owns a fact instead of repeating it.

## Rules that apply

- **spanish-pairs** — Docs that have a Spanish pair (`*.es.md`) change together with it.
- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.
- **small-entry-file** — Keep `AGENTS.md` under 14 000 characters: it is loaded in every session.

## Before you finish

- `node tools/inventory/status.mjs`
- `node tools/orient/features.mjs --check`
