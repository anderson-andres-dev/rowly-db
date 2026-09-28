# Contributing to Rowly DB

**English** · [Español](CONTRIBUTING.es.md)

Thanks for your interest. The project is young, so there is plenty of room
for design decisions: open an issue before a large PR.

**Rowly DB** is the product name; **Khipu** is the internal name of its
engine. You will see `khipu-*` in the code (crates, identifiers, settings
keys): that is intentional and should not be renamed. Anything the user sees
says Rowly DB.

## Before you start

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) to understand why the
repo is split into `engine` / `driver-core` / `drivers/*` / `app`, and which
layer your change belongs to.

## Local setup

```bash
mise use -g rust@latest   # or rustup
cargo build
cd app && npm install && npm run tauri dev
```

## Adding a new database engine

Everything that differs between engines lives in two places: the `Dialect`
enum in Rust (`crates/engine/src/lib.rs`) and the engine profile in the
frontend (`app/src/lib/engines/`). Nothing falls back to another engine: if
something is missing, **it does not compile**. The full design is in
`docs/specs/v0.2-perfiles-de-motor.md` (Spanish).

1. **Driver**: `cargo new --lib crates/drivers/<engine>` and implement the
   `DbConnector` trait from `khipu-driver-core`, including
   `introspect_schema` (see `docs/design/explorador-base-de-datos.md`). Add
   it to `[workspace] members` in the root `Cargo.toml`.
2. **Rust**: add the variant to `DatabaseKind`
   (`app/src-tauri/src/drivers.rs`) and to `Dialect`. The compiler points at
   every decision left to make: its `sqlparser` parser, quoting, literals,
   case, the default row. Add it to `ALL` in the contract in
   `crates/engine/src/lib.rs`.
3. **Frontend**: add the engine to `ConnectionDriver` and
   `connectionDrivers` (`app/src/lib/connections.ts`: name, logo, port), and
   its profile in `app/src/lib/engines/<engine>.ts`, with its entry in
   `ENGINES`: quotes and comments (`lexical`), editor and formatter dialect,
   statement-opening keywords, reserved words, error codes, how to locate an
   error in its messages, and the connection URL.
4. **Contract**: add its data to `FIXTURES` in
   `app/src/lib/engines/contract.test.ts` (the type requires it) and run
   `npm test` and `cargo test --workspace`. With that, autocomplete, aliases,
   JOIN by foreign key, inline diagnostics and large-document performance
   already work with the new engine.
5. Open the PR.

If `sqlparser` has no dialect for the engine, discuss it in an issue before
sending the PR.

## Driver contract tests

`cargo test --workspace` passes without any database available: tests that
need a real connection are marked `#[ignore = "requires database"]`, so a
normal run skips them.

To run them against a real instance:

```bash
cargo test -p khipu-driver-mysql -- --ignored
cargo test -p khipu-driver-postgres -- --ignored
```

Environment variables each one needs:

- MySQL: `KHIPU_TEST_MYSQL_HOST`, `KHIPU_TEST_MYSQL_PORT`, `KHIPU_TEST_MYSQL_USER`,
  `KHIPU_TEST_MYSQL_PASSWORD`, `KHIPU_TEST_MYSQL_DATABASE`
- PostgreSQL: `KHIPU_TEST_POSTGRES_HOST`, `KHIPU_TEST_POSTGRES_PORT`,
  `KHIPU_TEST_POSTGRES_USER`, `KHIPU_TEST_POSTGRES_PASSWORD`,
  `KHIPU_TEST_POSTGRES_DATABASE`

If one is missing, the test panics with a message saying what to set (no
need to memorize them: the panic message lists them).

Optional, for the TLS tests (`<ENGINE>` is `MYSQL` or `POSTGRES`):

- `KHIPU_TEST_<ENGINE>_EXPECT_TLS`: what the server should negotiate in
  Automatic mode. `encrypted` if it has modern TLS, `fallback` if it offers
  TLS that rustls cannot negotiate (MySQL 5.7), `none` if TLS is disabled.
  Without it, only what holds for any server is checked.
- `KHIPU_TEST_<ENGINE>_CA_CERT`: path to the CA that signed the server
  certificate, to test "Verify CA" and "Verify CA and host". The
  certificate must include the test host in its subjectAltName.

## Branches and releases

- `main` is the default branch and `develop` the integration branch. Nothing
  is pushed directly to either: both have branch protection (PR + 1
  approval + green `quality.yml` checks + no force-push).

1. Open a PR from `feature/...` into `develop`.
2. `quality.yml` runs automatically (Rust fmt/clippy/test + Node check/build).
3. Make sure the `quality` check is green.
4. Review and test the change functionally in development.
5. Approve and merge the PR into `develop`.
6. To publish a version, bump it in `Cargo.toml`, `app/package.json` and
   `app/src-tauri/tauri.conf.json` (with their lockfiles) and open a PR
   `develop → main`.
7. Wait for `quality` again, approve and merge.
8. Tag the `main` commit:
   ```bash
   git switch main
   git pull --ff-only
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
9. The tag triggers `release.yml` (multi-platform build); wait for it to
   finish green.

### What a release publishes

- Installers for Debian/Ubuntu (`.deb`), Fedora (`.rpm`), any Linux
  (AppImage), Arch (`.pkg.tar.zst`), Windows and macOS, all signed.
- `latest.json`, which Settings > Updates uses to install that version.
- `rowly-db-bin.PKGBUILD`, with checksums already filled in, for publishing
  to the AUR (copy it as `PKGBUILD` into the AUR repo, run
  `makepkg --printsrcinfo > .SRCINFO`, commit and push).

The version in `app/src-tauri/tauri.conf.json` must match the tag
(`v0.2.0` ↔ `0.2.0`); the workflow fails otherwise. A tag with a hyphen
(`v0.3.0-rc.1`) publishes a pre-release.

**Releases are never deleted.** The app lets users go back to any published
version; deleting one removes it from that list.

### Update signing

The workflow signs with the private key in the `TAURI_SIGNING_PRIVATE_KEY`
and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets; the public key is in
`tauri.conf.json`. If that private key is lost, installed copies will not
accept updates signed with another one: keep it backed up. Building the
repo does not need it.

## Style

- Rust: `cargo fmt` + `cargo clippy` before every PR
- Commits: short messages in the imperative, in English or Spanish
- Docs: English is the main language; every public document has a Spanish
  version (`*.es.md`). Design notes in `docs/specs/` and `docs/design/` are
  in Spanish
- No speculative abstractions: if a new engine needs something the
  `DbConnector` trait does not cover, discuss it in the issue before bending
  the existing interface
