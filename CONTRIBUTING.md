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

`cargo test --workspace` needs no database. Tests that do are marked `#[ignore]` and run on demand:

```bash
cargo test -p khipu-driver-mysql -- --ignored
cargo test -p khipu-driver-postgres -- --ignored
```

They read the connection from these variables, where `<ENGINE>` is `MYSQL` or `POSTGRES`:

| Variable | Value |
| :--- | :--- |
| `KHIPU_TEST_<ENGINE>_HOST` | Server host |
| `KHIPU_TEST_<ENGINE>_PORT` | Server port |
| `KHIPU_TEST_<ENGINE>_USER` | User |
| `KHIPU_TEST_<ENGINE>_PASSWORD` | Password |
| `KHIPU_TEST_<ENGINE>_DATABASE` | Database |
| `KHIPU_TEST_<ENGINE>_EXPECT_TLS` | Optional. `encrypted`, `fallback` or `none` |
| `KHIPU_TEST_<ENGINE>_CA_CERT` | Optional. CA that signed the server certificate |

If one is missing, the test stops and tells you which. `EXPECT_TLS` is what the server should negotiate in automatic mode: `fallback` covers servers with TLS that rustls cannot negotiate, like MySQL 5.7. With `CA_CERT` set, the CA verification modes are tested too, and the certificate must include the test host.

The guard, the statement splitter and the drivers are also tested together against real servers (MySQL, MariaDB and PostgreSQL with the Sakila / Pagila sample databases). `tools/test-dbs/up.sh` starts them in Docker and `cargo test -p rowly-server-tests -- --ignored --test-threads=1` runs the tests; see `tools/test-dbs/README.md`.

`tools/test-dbs/lines.json` and `tools/test-dbs/lines.sh` check version-line boundaries. The full command and its current limits are in [SQL_ENGINE.md, §7](SQL_ENGINE.md#7-gates). Today the real-server suite does not run completely for every exact release or in CI; report tested releases in the PR and do not advertise a release as verified without its entire applicable matrix.

When preparing a release, check support dates against each vendor's official notices, then run `python3 tools/support/vendor-support.py` from the repository root. The script uses `endoflife.date` as a release list and applies official exceptions where dates disagree. Review the diff of `app/src/lib/engines/vendorSupport.json` and update the table in [SQL_ENGINE.md, §5](SQL_ENGINE.md#5-version-lines) from the same evidence.

## Adding a database engine

Follow [SQL_ENGINE.md, §12](SQL_ENGINE.md#12-adding-an-engine-step-by-step) to distinguish **engine**, **driver**, **line** and **exact release**. These are the current code paths; the compiler flags some missing decisions, and the S/A/G/D matrix catches the rest.

1. **Driver.** If it needs its own protocol, create `crates/drivers/<engine>`, implement `DbConnector` from `khipu-driver-core` and add the crate to the workspace. If it speaks a supported engine's protocol, reuse that driver after testing types, TLS and introspection.
2. **Rust.** Add the engine to `DatabaseKind` in `app/src-tauri/src/drivers.rs`, which picks its driver, and to `Dialect` and its `ALL` list in `crates/engine/src/lib.rs`. The compiler points at each decision left. The engine has the same name in `DatabaseKind`, `Dialect` and the frontend's `ConnectionDriver`.
3. **Frontend.** Add it to `app/src/lib/connections.ts` with its name, logo and default port, and write its profile in `app/src/lib/engines/<engine>.ts`.
4. **Contract.** Fill in its `FIXTURES` in `app/src/lib/engines/contract.test.ts`, decide its answer in each `PerEngine` case in `crates/engine/src/diagnostics.rs`, and add corpus and exact servers in `tests/sql/` and `tools/test-dbs/lines.json`. Review every applicable row of `SQL_ENGINE.md` and document each `N/A` with a reason.

Then run the `SQL_ENGINE.md` engine gate on every exact release you intend to advertise and check that existing engines remain green. A nearby parser, such as the one MariaDB shares with MySQL, is acceptable only if tests prove it neither hides destructive SQL nor produces false diagnostics; list valid syntax it cannot read in `Dialect::unparsed_syntax`. An integration without the full matrix remains experimental, not verified support.

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
