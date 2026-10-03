# Contributing

**English** · [Español](CONTRIBUTING.es.md)

Thanks for helping out. The project is young and many design decisions are still open, so for anything large, open an issue first and let's talk it through.

## Names

Rowly DB is the product. Khipu is the internal name of its engine, which is why crates, identifiers and settings keys start with `khipu`. Keep them that way. Everything the user sees says Rowly DB.

## Getting started

```bash
cargo build
cd app
npm install
npm run tauri dev
```

You need Rust 1.85+ and Node.js 20.19+. [ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how the code is laid out and where each kind of change goes.

If you change an engine, driver, generated SQL, analysis or execution, first read [SQL_ENGINE.md](SQL_ENGINE.md). It is the permanent quality contract: the S/A/G/D matrix, versions, real-server tests, gates and known gaps. Design notes are work plans and do not replace that contract.

## Workflow

`main` holds released versions and `develop` is where work comes together. Neither accepts direct pushes.

1. Branch off `develop` as `feature/<name>`.
2. Open a pull request into `develop`.
3. Wait for the `quality` check to pass.
4. Once it is reviewed and tested in the app, it gets merged.

Before opening the pull request, run:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cd app && npm run check && npm test && npm run build
cd .. && node tools/inventory/tests.mjs --check
```

CI runs the same gate with Rust 1.90 (`.github/workflows/quality.yml`); a newer local clippy can miss a lint that 1.90 reports, so `cargo +1.90 clippy --workspace --all-targets -- -D warnings` reproduces it exactly. Every test file needs an entry in `tests/inventory.json` with its owner, the property it protects, its risk, its gate and a decision; the `--check` fails until it has one.

The **E2E** workflow builds the app and drives it on Linux/WebKitGTK through `tauri-driver` with a disposable MySQL (`app/tests/e2e/run.mjs`): connecting, running with Ctrl+Enter, confirming and cancelling a destructive statement, the production confirmation and the console text surviving a restart. It needs `WebKitWebDriver` and `tauri-driver`, so it normally runs in CI only. Windows/WebView2 and macOS/WKWebView stay a manual smoke test before a release.

## Tests against a real database

`cargo test --workspace` needs no database. Tests that do are marked `#[ignore]` and run against the servers of `tools/test-dbs` (MySQL, MariaDB and PostgreSQL with the Sakila / Pagila sample databases), one container per exact release, pinned by digest in `tools/test-dbs/lines.json`:

```bash
tools/test-dbs/up.sh                       # or one verified release: tools/test-dbs/up.sh postgres=13.23
cargo test -p rowly-server-tests -- --ignored --test-threads=1
```

`real_server` tests the guard, the statement splitter, the analyzer and the SQL the app writes; `contract` tests the drivers through the API the app uses: results, truncation, errors, session, introspection and TLS (what each image offers is the `tls` of its release in `lines.json`). Before running, the harness checks that the server is the release `lines.json` declares. What a release lacks counts as N/A only if the server rejects it. See `tools/test-dbs/README.md`.

`tools/test-dbs/lines.sh` checks version-line boundaries. CI runs all of this on every engine PR, for every verified exact release (`.github/workflows/sql-engine.yml`); the commands and rules are in [SQL_ENGINE.md, §7](SQL_ENGINE.md#7-gates). Do not advertise a release as verified without its complete evidence.

When preparing a release, check support dates against each vendor's official notices, then run `python3 tools/support/vendor-support.py` from the repository root. The script uses `endoflife.date` as a release list and applies official exceptions where dates disagree. Review the diff of `tools/support/vendor-support.json` and update the table in [SQL_ENGINE.md, §5](SQL_ENGINE.md#5-version-lines) from the same evidence.

## Adding a database engine

Follow [SQL_ENGINE.md, §12](SQL_ENGINE.md#12-adding-an-engine-step-by-step) to distinguish **engine**, **driver**, **line** and **exact release**. Start with the template, then let the compiler and the tests walk you through the rest: every step left fails with the file it needs.

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

It creates the engine's `EngineDefinition` in `crates/engine/src/dialects/<id>.rs` (starting from the nearby engine's values, under a `PENDIENTE` block), adds it to the registry (`Dialect`, `ALL` and `definition()` in `crates/engine/src/lib.rs`), adds its entry to `tests/engines/contract.json` as `"pending": true`, and creates `tests/sql/<id>/`. Then, in order:

1. **`cargo build`**: each per-engine test answer (`PerEngine` in `diagnostics.rs`) and the list order in the `lib.rs` contract.
2. **The definition.** Write every field of `EngineDefinition` with the engine's own answer, proven against its server, and remove the `PENDIENTE` block. An inherited value nobody tested is an engine that silently follows another one's rules. Valid syntax its parser cannot read goes in `unparsed_syntax`.
3. **`cargo test`** names the rest of the Rust side: `DatabaseKind` and its driver in `app/src-tauri/src/drivers.rs` (a new protocol is a crate in `crates/drivers/<protocol>` implementing `DbConnector`), `Engine` in `crates/server-tests`, and the shared contract.
4. **Frontend.** `ConnectionDriver` in `app/src/lib/connections.ts` (name, logo, default port), its profile in `app/src/lib/engines/<id>.ts`, `ENGINES` and the `FIXTURES` of `contract.test.ts`. Its identifier quote, backslash rule and executable comments must match `tests/engines/contract.json`; then remove `"pending"`.
5. **Servers and support.** Lines, probes and verified releases pinned by digest in `tools/test-dbs/lines.json` (and its container), vendor dates in `tools/support/vendor-support.json`.
6. **The matrix.** `node tools/inventory/coverage.mjs` lists every `SQL_ENGINE.md` row without an answer for the engine: a test that includes it, an `N/A` with a reason, or a declared gap (`gapEngines`).

Then run the engine gate on every exact release you intend to advertise and check that existing engines remain green. An integration without the full matrix remains experimental, not verified support.

## Releasing

For maintainers.

1. Bump the version in `Cargo.toml`, `app/package.json` and `app/src-tauri/tauri.conf.json`, along with their lockfiles.
2. Open a pull request from `develop` into `main` and merge it once `quality` passes.
3. Tag the merge commit:

   ```bash
   git switch main
   git pull --ff-only
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

The tag starts `release.yml`, which builds and signs the installers for every system, the `latest.json` that the app reads for updates, and a PKGBUILD ready for the AUR. The tag must match the version in `tauri.conf.json`. A tag like `v0.3.0-rc.1` publishes a pre-release.

Never delete a release. The app lets people go back to any published version.

Updates are signed with the key stored in the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets. If that key is lost, installed copies will reject every future update, so keep a backup.

## Website

The landing page lives in `site/`: plain HTML, CSS and JavaScript, English at `site/index.html` and Spanish at `site/es/index.html`. Keep both in sync. Pages are templates: `{{version}}` and `{{site}}` are filled in by `.github/scripts/render-site.py` with the latest published release and the site address (the `SITE_URL` repository variable, GitHub Pages by default). GitHub Pages republishes the site on every push to `main` that touches `site/` and after each Release run. To try it locally, run `python3 .github/scripts/render-site.py _site && python3 -m http.server --directory _site`. Screenshots live in `site/assets/img/shots/`, in light and dark, taken from the real app with sample data.

## Style

- Short commit messages in the imperative, in English or Spanish.
- No abstractions ahead of need. If an engine needs something `DbConnector` does not cover, raise it in an issue first.
- Public docs are written in English with a Spanish copy in `*.es.md`. Keep both in sync. Temporary design notes are in Spanish.
