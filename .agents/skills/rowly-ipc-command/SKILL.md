---
name: rowly-ipc-command
description: Add or change a backend command (IPC). Use when asked to: add a command; new backend command; tauri command; expose to the frontend.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `ipc-command` in tools/architecture/model.json -->

# Add or change a backend command (IPC)

## Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../../docs/ARCHITECTURE.md#rules-for-the-app)

## Steps

1. Put the work in `services/` and the adapter in `commands/`; the command never repeats the guard, the catalog or the pools.
2. Register it in `lib.rs`.
3. Add it with its single owner module to `app/src/lib/backend.test.ts`.
4. Call it from the frontend only through `backend.ts`.

## Rules that apply

- **one-owner-per-command** — A new backend command is registered in `lib.rs` and added with its single owner module to `app/src/lib/backend.test.ts`.
- **one-path-to-run-sql** — SQL runs through one path (classify, confirm, execute); the UI never decides whether a statement is safe, the backend guard does.
- **code-in-a-feature** — Every code file belongs to a feature in `tools/architecture/model.json`.

## Before you finish

- `cd app && npx vitest run src/lib/backend.test.ts`
- `node tools/orient/features.mjs --check`
