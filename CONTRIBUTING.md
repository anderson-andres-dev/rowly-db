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

If you change an engine, driver, generated SQL, analysis or execution, first read [SQL_ENGINE.md](SQL_ENGINE.md). It is the permanent quality contract: the S/A/G/D matrix, versions, real-server tests, gates and known gaps. Adding or changing a database engine, a version line or a verified release follows [ENGINE_GUIDE.md](ENGINE_GUIDE.md). Design notes are work plans and do not replace either.

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
node tools/inventory/coverage.mjs           # every SQL_ENGINE §6 row answered for every engine
node tools/inventory/dependencies.mjs       # only published releases of dependencies
node tools/inventory/status.mjs             # generated state of README and SQL_ENGINE up to date
node tools/architecture/graph.mjs --check   # dependencies allowed and architecture graph up to date
```

Blocks between `<!-- generated: … -->` markers are written by those tools; never edit them by hand. `status.mjs --write` and `graph.mjs --write` regenerate them. `graphify-out/` is the exploratory symbol graph; refresh it with `graphify update .` when you change code, if you have [graphify](https://github.com/Graphify-Labs/graphify) (`graphifyy` on PyPI) installed.

CI runs the same gate with Rust 1.90 (`.github/workflows/quality.yml`); a newer local clippy can miss a lint that 1.90 reports, so `cargo +1.90 clippy --workspace --all-targets -- -D warnings` reproduces it exactly. Every test file needs an entry in `tests/inventory.json` with its owner, the property it protects, its risk, its gate and a decision; the `--check` fails until it has one.

The **E2E** workflow builds the app and drives it on Linux/WebKitGTK against disposable MySQL and PostgreSQL servers. `app/tests/e2e/run.mjs` uses the keyboard through `tauri-driver`: connecting, running with Ctrl+Enter, confirming and cancelling a destructive statement, the production confirmation in the console and the grid, counting the total, and the console text after a restart. It needs `WebKitWebDriver`, so it usually runs only in CI. `app/tests/e2e/resources.mjs` opens the app with the WebKit inspector and checks that reconnecting, opening and closing consoles and idling leave no memory, editors or work behind; it also runs locally with `xvfb-run` ([tools/bench/README.md](tools/bench/README.md#resource-cycles)). Windows/WebView2 and macOS/WKWebView remain a manual smoke test before a release.

New code goes in its domain folder ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#rules-for-the-app)): `workspace/`, `editor/`, `results/` or `connections/` in the frontend; `commands/` adapts and `services/` does the work in the backend. Its test lives next to it. A new backend command is registered in `lib.rs` and added, with its single owner module, to `app/src/lib/backend.test.ts`.

## Tests against a real database

`cargo test --workspace` needs no database. Tests that do are marked `#[ignore]` and run against the servers of `tools/test-dbs` (MySQL, MariaDB and PostgreSQL with the Sakila / Pagila sample databases), one container per exact release, pinned by digest in `tools/test-dbs/lines.json`:

```bash
tools/test-dbs/up.sh                       # or one verified release: tools/test-dbs/up.sh postgres=13.23
cargo test -p rowly-server-tests -- --ignored --test-threads=1
```

`safety` tests the guard, `analysis` the statement splitter and the analyzer, `generated` the SQL the app writes; `contract` tests the drivers through the API the app uses: results, truncation, errors, session, introspection and TLS (what each image offers is the `tls` of its release in `lines.json`). Before running, the harness checks that the server is the release `lines.json` declares. What a release lacks counts as N/A only if the server rejects it. See `tools/test-dbs/README.md`.

`tools/test-dbs/lines.sh` checks version-line boundaries. CI runs all of this on every engine PR, for every verified exact release (`.github/workflows/sql-engine.yml`); the commands and rules are in [SQL_ENGINE.md, §7](SQL_ENGINE.md#7-gates). Do not advertise a release as verified without its complete evidence.

Version support packs (SQL_ENGINE.md, §11) come from `support/` with `node tools/support/publish.mjs --out <dir> --evidence <sql-engine.yml real-* and lines-* artifacts from the same commit>`, with the update signing key in `TAURI_SIGNING_PRIVATE_KEY`; the tool refuses without complete evidence. Test fixtures are regenerated with `node tests/support/fixtures.mjs` and signed with `tests/support/test-key`, a test-only key.

When preparing a release, check support dates against each vendor's official notices, then run `python3 tools/support/vendor-support.py` from the repository root. The script uses `endoflife.date` as a release list and applies official exceptions where dates disagree. Review the diff of `tools/support/vendor-support.json` and run `node tools/inventory/status.mjs --write`, which regenerates SQL_ENGINE §5.3 from it.

The support window moves with the calendar: 90 days before a verified release leaves it, `tools/test-dbs/window.mjs` warns in Quality (without failing), and the app release is not published while it stays in `verified` after the date. Then move it from `verified` to `retired` in `tools/test-dbs/lines.json`, with `until` and `evidence` (commit and run of its last green `sql-engine.yml` evidence); its line stays and keeps connecting, as SQL_ENGINE §5.2 says. Regenerate the state with `node tools/inventory/status.mjs --write`.

## Adding a database engine

Follow [ENGINE_GUIDE.md](ENGINE_GUIDE.md). It starts with the template, which registers the engine, and from there the compiler and the tests name every step left:

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

An integration without the full matrix remains experimental, not verified support (SQL_ENGINE §4).

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
- Only published releases of dependencies: no forks, no unpublished branches or commits, no patches of our own (`tools/inventory/dependencies.mjs` fails on them). What upstream lacks stays as a documented gap in SQL_ENGINE.md, §9.
- No abstractions ahead of need. If an engine needs something `DbConnector` does not cover, raise it in an issue first.
- Public docs are written in English with a Spanish copy in `*.es.md`. Keep both in sync. Temporary design notes are in Spanish.
