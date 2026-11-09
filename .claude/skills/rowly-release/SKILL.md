---
name: rowly-release
description: Publish a release. Use when asked to: publish a release; cut a release; bump the version; tag the release.
---

<!-- generated: skill (tools/orient/playbooks.mjs); edit the playbook `release` in tools/architecture/model.json -->

# Publish a release

## Read first

- [CONTRIBUTING.md#releasing](../../../CONTRIBUTING.md#releasing)
- [CONTRIBUTING.md#release-highlight](../../../CONTRIBUTING.md#release-highlight)

## Steps

1. Bump the version in `Cargo.toml`, `app/package.json` and `app/src-tauri/tauri.conf.json` with their lockfiles.
2. Pull request `develop` into `main`; the maintainer merges it, never the agent.
3. Tag the merge commit `vX.Y.Z`; the tag must match `tauri.conf.json`.
4. Never delete a release.

## Rules that apply

- **branch-flow** — Branch off `develop` and open the pull request into `develop`; `main` and `develop` take no direct pushes.
