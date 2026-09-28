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

## Workflow

`main` holds released versions and `develop` is where work comes together. Neither accepts direct pushes.

1. Branch off `develop` as `feature/<name>`.
2. Open a pull request into `develop`.
3. Wait for the `quality` check to pass.
4. Once it is reviewed and tested in the app, it gets merged.

Before opening the pull request, run:

```bash
cargo fmt --all
cargo clippy --workspace --all-targets
cargo test --workspace
cd app && npm run check && npm test
```

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

## Adding a database engine

Everything that changes from one engine to another lives in the `Dialect` enum in `crates/engine/src/lib.rs` and in the engine profile in `app/src/lib/engines/`. Nothing falls back to another engine, so if something is missing, the build fails and tells you what.

1. **Driver.** Create `crates/drivers/<engine>`, implement `DbConnector` from `khipu-driver-core` and add the crate to the workspace.
2. **Rust.** Add the engine to `DatabaseKind` in `app/src-tauri/src/drivers.rs`, and to `Dialect` and its `ALL` list in `crates/engine/src/lib.rs`. The compiler points at each decision left.
3. **Frontend.** Add it to `app/src/lib/connections.ts` with its name, logo and default port, and write its profile in `app/src/lib/engines/<engine>.ts`.
4. **Contract.** Fill in its `FIXTURES` in `app/src/lib/engines/contract.test.ts` and run both test suites.

With that, autocomplete, JOINs by foreign key, diagnostics and large files work on the new engine. If `sqlparser` has no dialect for it, open an issue before you start.

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

The landing page lives in `site/`: plain HTML, CSS and JavaScript, English at `site/index.html` and Spanish at `site/es/index.html`. Keep both in sync. Every push to `main` that touches `site/` publishes it to GitHub Pages. To try it locally, run `python3 -m http.server --directory site`.

## Style

- Short commit messages in the imperative, in English or Spanish.
- No abstractions ahead of need. If an engine needs something `DbConnector` does not cover, raise it in an issue first.
- Public docs are written in English with a Spanish copy in `*.es.md`. Keep both in sync. Design notes in `docs/specs` and `docs/design` are in Spanish.
