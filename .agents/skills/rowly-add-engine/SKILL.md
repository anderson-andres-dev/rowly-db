---
name: rowly-add-engine
description: Add a database engine or a version line. Use when asked to: add an engine; new database engine; new version line; support sqlite.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `add-engine` in tools/architecture/model.json -->

# Add a database engine or a version line

## Read first

- [ENGINE_GUIDE.md#the-path-at-a-glance](../../../ENGINE_GUIDE.md#the-path-at-a-glance)
- [ENGINE_GUIDE.md#a-new-line-of-an-existing-engine](../../../ENGINE_GUIDE.md#a-new-line-of-an-existing-engine)
- [ENGINE_GUIDE.md#done-means](../../../ENGINE_GUIDE.md#done-means)
- [CONTRIBUTING.md#adding-a-database-engine](../../../CONTRIBUTING.md#adding-a-database-engine)

## Steps

1. Start with `node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>`; the compiler and the tests name every step left.
2. Follow ENGINE_GUIDE.md in order; an engine without the full matrix is Experimental.
3. Run `node tools/inventory/status.mjs --write` for the generated tables.
4. A missing upstream feature is a documented gap, never a fork.

## Rules that apply

- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **published-deps-only** — Dependencies are published releases only: no forks, git dependencies or patches.
- **generated-blocks** — Never edit by hand what sits between `<!-- generated: ... -->` markers; rerun the tool with `--write`.

## Before you finish

- `node tools/inventory/coverage.mjs`
- `node tools/inventory/status.mjs`
- `node tools/architecture/graph.mjs --check`
