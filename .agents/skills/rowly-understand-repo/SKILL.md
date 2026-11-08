---
name: rowly-understand-repo
description: Understand or explain the repository. Use when asked to: analyze the repo; explain the project; how is it organized; what does this repository do.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `understand-repo` in tools/architecture/model.json -->

# Understand or explain the repository

## Read first

- [docs/ARCHITECTURE.md#the-idea](../../../docs/ARCHITECTURE.md#the-idea)
- [docs/ARCHITECTURE.md#layers-and-dependencies](../../../docs/ARCHITECTURE.md#layers-and-dependencies)
- [docs/ARCHITECTURE.md#how-sql-flows](../../../docs/ARCHITECTURE.md#how-sql-flows)

## Steps

1. Answer from the map in AGENTS.md first; it already names every feature and its entry file.
2. Read only the sections above if more depth is needed.
3. For one feature run `node tools/orient/orient.mjs --expand <feature>`; open at most its entry file.

## Rules that apply

- **engine-neutral-common-code** — Common code never names a concrete engine; engine-specific code lives in its own domain.
- **one-owner-per-state** — Each piece of state has one owner; others read it through its interface and keep no second mutable copy.
