---
name: rowly-ui-text
description: Change the interface or its texts. Use when asked to: change a text; translate; new button; change the interface.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `ui-text` in tools/architecture/model.json -->

# Change the interface or its texts

## Read first

- [docs/ARCHITECTURE.md#rules-for-the-app](../../../docs/ARCHITECTURE.md#rules-for-the-app)

## Steps

1. Every visible text goes through `app/src/lib/i18n/messages/` in Spanish and English, never inline.
2. Reuse the shared UI pieces (tooltip, select, field, menu, checkbox, button); nothing native.
3. Everything must be operable by keyboard.
4. Say Rowly DB to the user, never Khipu.

## Rules that apply

- **i18n-texts** — Text the user sees goes through `app/src/lib/i18n/messages/` in Spanish and English, never inline.
- **names** — Rowly DB is the product and what the user sees; Khipu is the internal engine name (crates, identifiers, settings keys).
- **proportional-work** — Work is proportional to what is visible, and optional costs fall on whoever enables them.

## Before you finish

- `cd app && npm run check`
