# Adding a database engine

**English** · [Español](ENGINE_GUIDE.es.md)

How to add an engine to Rowly DB, or change one, correctly. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first: it explains the five things this guide keeps apart (engine, dialect, protocol driver, exact release, behavior line) and why shared code never names an engine. [SQL_ENGINE.md](SQL_ENGINE.md) is the contract: what every engine must prove and on which versions. This guide is the path; that document is the bar.

## Before you start: what are you adding?

| You want to | It is | Go to |
| :--- | :--- | :--- |
| Support a database Rowly DB does not know (SQLite, SQL Server…) | A new **engine** | This whole guide |
| Support a database that speaks a protocol Rowly DB already has, with its own SQL rules (as MariaDB with MySQL's) | A new **engine** that reuses a **driver** | This whole guide; step 4 tells you when reusing is allowed |
| Support a newer major of a known engine that behaves differently | A new **line** | [A new line of an existing engine](#a-new-line-of-an-existing-engine) |
| Advertise one more exact server release as verified | A new **exact release** | [A new exact release](#a-new-exact-release) |
| Ship new line data (a reserved word, a capability) to installed apps | A **support pack** | [Support packs are not engines](#support-packs-are-not-engines) |

## The path at a glance

Start with the template, then let the compiler and the tests walk you: each step left fails with the file it needs.

```bash
node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
```

| # | Step | Where | What fails until it is done |
| :--- | :--- | :--- | :--- |
| 1 | Identity and registry | `crates/engine/src/lib.rs`, `dialects/mod.rs` (the template does it) | `cargo build` |
| 2 | `EngineDefinition`, every field decided | `crates/engine/src/dialects/<id>.rs` | `ninguna_definicion_queda_pendiente` while the `PENDIENTE` block remains |
| 3 | Parser | `parser` in the definition | the corpus tests of step 12 |
| 4 | Driver and backend registry | `crates/drivers/<protocol>`, `app/src-tauri/src/drivers.rs`, `Cargo.toml` | `cada_motor_del_frontend_llega_como_el_suyo` |
| 5 | Exact release and version parsing | the driver's `version.rs` | `version.rs` unit tests, D6 |
| 6 | Version lines as data | `support/<id>.json` and `lines` in the definition | `crates/engine/tests/lines.rs` |
| 7 | Introspection | the driver's `introspect.rs` | D3 against a real server |
| 8 | Analyzer answers | `PerEngine` in `crates/engine/src/diagnostics.rs` (`mod contract`) | `cargo test` compile error |
| 9 | Guard | nothing per engine: the definition's fields | S1–S7 |
| 10 | Generated SQL | the definition's quoting fields | G1, G6, G7 |
| 11 | Frontend | `app/src/lib/connections.ts`, `app/src/lib/engines/<id>.ts`, `ENGINES` | `npm run check`, `contract.test.ts` |
| 12 | Harness, corpus, servers | `crates/server-tests`, `tests/sql/<id>/`, `tools/test-dbs/` | `the_harness_covers_every_engine_of_the_registry`, `lines.rs` |
| 13 | Coverage | `tests/sql/coverage.json` | `node tools/inventory/coverage.mjs` |
| 14 | CI and evidence | `tools/test-dbs/lines.json` (the matrix reads it) | `sql-engine.yml`, `evidence.mjs` |
| 15 | Documentation | generated state, the line reasons, §6.5, §8.2, §9 | `node tools/inventory/status.mjs`, `node tools/architecture/graph.mjs --check` |

The template copies the values of the engine you name with `--like` under a `PENDIENTE` block, so it compiles from the first minute. **An inherited value nobody tested is an engine that silently follows another one's rules.** Every value must end up decided and proven for the new engine.

## 1. Identity: engine, dialect, driver

`node tools/engine/new.mjs <id> --like <engine>`:

- creates `crates/engine/src/dialects/<id>.rs` and registers it in `dialects/mod.rs`;
- adds the `Dialect` variant, its place in `Dialect::ALL` and its arm in `Dialect::definition()` (`crates/engine/src/lib.rs`, the only `match` on engines in the core);
- adds the engine to `tests/engines/contract.json` as `"pending": true`;
- creates `tests/sql/<id>/setup.sql`.

The id (lowercase, `[a-z][a-z0-9]*`) is the same everywhere: `Dialect::id()`, `DatabaseKind` (backend, serde), `ConnectionDriver` (frontend), `Engine::name()` (server-tests), `support/<id>.json`, the keys of `tools/test-dbs/lines.json` and `tools/support/vendor-support.json`. Tests compare each copy with `Dialect::ALL`.

## 2. `EngineDefinition`

Every field is required: there is no `Default`. Decide each one for the new engine and prove it against its server.

| Field | What it decides | Read by |
| :--- | :--- | :--- |
| `id` | The engine's id | registries |
| `parser` | The sqlparser dialect that tokenizes and parses the engine's SQL | guard, analyzer, pagination, editing ⚠ |
| `statement_starters` | Words a statement can start with | guard ⚠, analyzer (typo targets) |
| `unparsed_syntax` | Valid syntax the parser rejects, as word sequences (`...` is a gap of any length): no syntax diagnostic | analyzer |
| `unparsed_writes` | Valid writes the parser cannot read, recognized by their first words | guard ⚠ |
| `system_tables`, `system_table_prefixes` | Tables named without schema that are not in the catalog | analyzer |
| `folds_unquoted_to_lowercase` | Whether an unquoted name is stored in lowercase | analyzer (A6), generated SQL |
| `backslash_escapes` | Whether `\` escapes inside `'…'` | guard ⚠, analyzer, generated literals |
| `identifier_quote` | The identifier quote; an inner one is doubled | generated SQL (G1) |
| `insert_defaults` | How a row with every default is written | generated SQL |
| `executable_comments` | Comments whose content the server runs (`/*!`, `/*M!`) | guard ⚠ |
| `routine_kinds` | What a `CREATE` of a routine can create | guard ⚠ |
| `routine_bodies` | `Block` (checked inside, like MySQL) or `Quoted` (an opaque string, like PostgreSQL) | guard ⚠, analyzer |
| `do_blocks` | `Expression` (MySQL `DO`) or `Anonymous` (an unclassifiable code block, PostgreSQL) | guard ⚠ |
| `select_into_variable_lists` | `SELECT … INTO a, b` into several variables | analyzer |
| `sql_mode_query` | The query that tells whether the session uses `NO_BACKSLASH_ESCAPES` | session mode → guard ⚠ |
| `lines` | `include_str!` of `support/<id>.json` | lines (step 6) |

A mechanism the new engine needs and no field expresses becomes **a new field or a new variant** of the definition, used by shared code and tested on every existing engine. Never an `if` on the engine: the boundary tests reject it (ARCHITECTURE, "Boundaries that check themselves").

### ⚠ Fields that change the guard's security surface

These are not dialect preferences. **Changing one of them changes what the guard lets run without confirmation.** Each needs a reason proven against the real server, and the safety rows (S1–S7) on every verified release:

| Field | How it can weaken the guard |
| :--- | :--- |
| `parser` | It decides how the guard tokenizes: where strings, comments and statements end. A "nearby" parser that reads the engine's strings differently can hide a second statement. Use one only after proving it neither hides destructive SQL nor flags valid syntax. |
| `unparsed_writes` | A text matching one of these patterns is accepted after a single-statement check only, as `NotDestructive` outside production. Every pattern widens what passes without the parser. |
| `statement_starters` | Text the parser cannot read but that starts with one of these words is judged by its structure instead of rejected. |
| `routine_bodies` | `Quoted` reduces checking a routine to counting top-level `;`; `Block` validates the body. Choose by what the server really does. |
| `routine_kinds`, `do_blocks` | What a `CREATE` of code may create, and whether `DO` is an expression or a code block whose effect must be rejected when it may change data. |
| `executable_comments` | Comments the server runs. Missing one means code hidden in a "comment" passes as a comment (S4). |
| `backslash_escapes`, `sql_mode_query` | How strings end, and whether the guard learns that the session changed it (S5). A wrong value moves where the guard thinks a string closes. |

The guard reads no line data: a support pack can never change these (D10).

## 3. Parser

Rowly DB uses `sqlparser`. Pick its dialect for the engine (`parser`). Then:

- what the server accepts and sqlparser rejects goes in `unparsed_syntax` (no diagnostic) and, if it writes, in `unparsed_writes` (guard);
- what sqlparser reads differently from the server is a guard risk: prove it with `safety` cases in the engine's `attacks.sql`;
- statements are split in the frontend (`app/src/lib/sqlStatements.ts`), configured by the profile's `SqlLexical` (step 11); the backend guard checks each statement again.

## 4. Driver and protocol

A driver is a crate in `crates/drivers/<protocol>` that implements `DbConnector` (`crates/driver-core/src/lib.rs`).

Required: `connect`, `server`, `tls_status`, `list_schemas`, `current_schema`, `introspect_schema`, `table_definition`, `execute_query`, `execute_in_transaction`, `stream_query`. With a default you may override: `list_tables`, `execute_query_cancellable`, `console_epoch`, `cancel_query`.

Rules the contract documents and the tests check:

- `execute_query` and `stream_query` run **one** statement on the window's console connection (`ConsoleConnection`); prepare before running when the protocol allows it (defense in depth, SQL_ENGINE §8).
- The catalog, introspection and cancelling use the pool; result editing uses the pool in one transaction (`execute_in_transaction`).
- Connection errors are classified (`ConnectionErrorKind`) and TLS follows the profile's mode, each driver in its own `tls.rs`.

**Reuse an existing driver** only when the engine speaks its protocol and the tests for types, TLS and introspection pass for it. MariaDB reuses `khipu-driver-mysql`; the driver detects which engine it is talking to (`version.rs`) and reports it.

Register the engine in the backend: `DatabaseKind` and both factory `match`es in `app/src-tauri/src/drivers.rs` (the only backend file that names a driver). A new crate also goes into the workspace (`Cargo.toml`), `app/src-tauri/Cargo.toml`, `crates/server-tests/Cargo.toml`, and as a domain in `tools/architecture/model.json` (`--check` tells you).

Dependencies: only published releases. No forks, no git dependencies, no patches (`tools/inventory/dependencies.mjs`). What upstream lacks is a documented gap (SQL_ENGINE §9), never a fork.

## 5. Exact release: `ServerIdentity`

On connect the driver reads the server's version and returns `ServerIdentity { engine, version, label }`: the engine it really is (a "MySQL" profile pointed at MariaDB reports `mariadb`), the version as numbers, and a display label. Nothing reads the label to decide; the frontend never derives a line or version (a test forbids it).

The driver also owns its **compatibility floor** (`COMPATIBILITY_FLOOR_*` in `version.rs`): the oldest catalog it is written to read. It never refuses a connection; below it the explorer warns. A test keeps it equal to the start of the engine's first line.

The driver reads which catalog queries it can use from the line data (`Dialect::lines().supports(capability, version)`), never by comparing versions itself (`no_known_consumer_declares_versioned_behavior_by_itself_again`).

## 6. Version lines

What changes between releases is **data** in `support/<id>.json`, embedded by the definition (`lines`) and parsed by `khipu_engine::lines`. Format (SQL_ENGINE §5.4):

```json
{ "format": 1, "engine": "<id>", "lines": [
  { "line": "8.0", "revision": 1, "capabilities": { "checkConstraints": "8.0.16" },
    "reservedWords": ["rank"], "removedSyntax": [{ "words": ["^", "SHOW", "SLAVE", "STATUS"], "instead": "SHOW REPLICA STATUS" }] }
] }
```

- **A line exists only if a fixture tells it apart** from the previous one (SQL_ENGINE §5.1). The first line is the base: it starts at the compatibility floor.
- **`revision`** starts at 1 and goes up **every time that line's data changes**. A downloaded pack replaces a line only with a higher revision.
- **`capabilities`**: catalog capability → the release it exists from (may be a patch inside the line). The names are the `Capability` enum (`crates/engine/src/lines.rs`), which is closed: a capability no engine has yet is a core change, with the driver code that uses it.
- **`reservedWords`**: words the line makes reserved. Each needs its `AS <word>` in the line's `rejects.sql`. Generated SQL quotes every word reserved on any line (G6).
- **`removedSyntax`**: token sequences the line removed (`^` and `$` anchor), with what to use instead. Each marks an entry of the line's `rejects.sql`, from that line on and never before (A9).
- The loader rejects unknown fields, unordered or repeated lines, revision 0 and a capability outside its line. `crates/engine/tests/lines.rs` proves every datum has its fixture; D7 proves the boundaries on real servers.

The same lines go in `tools/test-dbs/lines.json`: probes at both ends of each line (and on both sides of each `-- since:`), and the **verified** exact releases, every image pinned by digest. Vendor dates go in `tools/support/vendor-support.json` (`python3 tools/support/vendor-support.py`); they are display only.

## 7. Introspection and catalog

`introspect_schema(schema)` returns the shared model `SchemaObjects` (`crates/driver-core`): tables (with columns, keys, foreign keys, indexes, triggers, checks), routines with their parameters and modes, sequences, events, and `warnings` for any category the server would not give. Differences between engines are empty lists, `Option` fields and enums (`RelationKind`, `RoutineKind`, `ParameterMode`), never a field named after an engine. "Schema" is what the engine uses to namespace tables: a database in MySQL, a schema in PostgreSQL.

Catalog queries are the driver's (`introspect.rs`), chosen by the capabilities of the server's line. `docs/design/explorador-base-de-datos.md` (Spanish) describes what each object needs.

The backend turns `SchemaObjects` into the engine's `SchemaCatalog` (`services/catalog.rs`): nothing to do per engine. D3 proves classification against the real server; whether introspected content matches the server (D4) is still a gap for every engine.

## 8. Analyzer

The analyzer (`crates/engine/src/diagnostics.rs`) is configured by the definition and the line data; it has no per-engine branches. To add an engine, give its answer in each `PerEngine` of `mod contract` (the test does not compile without it): what is a syntax error and what is a catalog error on that engine. Valid corpus SQL must produce no diagnostic (A1); every prefix of it must not panic (A3).

## 9. Guard

There is no guard code per engine: it reads the fields marked ⚠ in step 2. The **minimum safety** of any engine is the S rows of SQL_ENGINE §6 on every verified release, against the real server:

- S1: a `;` inside its strings, comments, identifiers or dollar quotes never splits;
- S2: nothing the guard accepts runs as two statements, measured **without** the driver's prepare barrier, with the fuzz finding enough dangerous cases to measure anything;
- S3: whatever damages data asks for confirmation; S7: every production write is confirmed;
- S4–S6: executable comments, the session's string mode and unparsable syntax are judged, never waved through.

Add the engine's attacks to `tests/sql/<id>/common/attacks.sql`.

## 10. Generated SQL

What Rowly DB writes must run on its engine (G1–G7):

- identifiers and literals: `Dialect::quote_identifier`, `string_literal` and `string_literal_with` (from `identifier_quote` and `backslash_escapes`); the frontend profile writes the same (pinned by `tests/engines/contract.json`);
- a row of defaults: `insert_defaults`; grid changes: `khipu_engine::editing`;
- reserved words: the base list in `editing.rs` plus every line's `reservedWords`;
- sorting, paging and counting: `khipu_engine::pagination`, which rewrites the parsed query and renders `LIMIT n OFFSET m`. Every rewrite must read back identical and pass the guard again, or the original text runs.

## 11. Frontend

- `app/src/lib/connections.ts`: `ConnectionDriver` and its entry in `connectionDrivers` (name, logo, default port).
- `app/src/lib/engines/<id>.ts`: its `EngineProfile` (lexing for the splitter, quoting, `quoteString`, editor and formatter dialects, statement starters, built-in functions, reserved words with `lineReservedWords(support/<id>.json)`, server error help and location, `passedInCall`, connection URL); then `ENGINES` in `engines/index.ts`. `FormatterDialect` in `engines/types.ts` lists the sql-formatter dialects.
- `engines/contract.test.ts`: its `FIXTURES` entry (the type requires it); its identifier quote, backslash rule and executable comments must match `tests/engines/contract.json`. Then remove `"pending"`.

Only these files may name the engine; a test rejects any other.

## 12. Harness, corpus and test servers

- `crates/server-tests/src/lib.rs`: the `Engine` variant and every `match` on it (they are exhaustive, so the compiler lists them: connector, container, credentials, ports, corpora). A new protocol adds a `Conn` variant and its `multi_statement` (the server without the driver's barrier).
- `tests/sql/<id>/`: `setup.sql`, `common/` (`valid.sql`, `attacks.sql`, `routines.sql`, `no-diagnostics.sql`, `mixed.json`) and one folder per line (`accepts.sql`, `rejects.sql`, `reads.sql`), as SQL_ENGINE §10.1 describes.
- `tools/test-dbs/`: a service in `docker-compose.yml` (its default image must be a verified release of `lines.json`; a test checks it), its seed and dataset, and the engine name in `up.sh` and `lines.sh`.

## 13. Coverage

`tests/sql/coverage.json` answers every row of SQL_ENGINE §6 for every engine: a test that includes it, an `N/A` with a reason, or a declared gap (`gapEngines`). `node tools/inventory/coverage.mjs` lists what is missing, and fails on a real-server test that proves no row.

## 14. Matrix, evidence and CI

There is no second list: `sql-engine.yml` builds its matrix from `verified` and the probes of `tools/test-dbs/lines.json`. Each verified release runs the real suites against its pinned image; the harness stops if the server is not the declared release. `tools/test-dbs/evidence.mjs` then requires complete evidence for every verified release. `tools/test-dbs/window.mjs` checks that the verified releases match the vendor support window. A change in `crates/**`, `support/**`, `tests/sql/**` or `tools/test-dbs/**` triggers it.

## 15. Documentation

- Run `node tools/inventory/status.mjs --write`: the README engine table, SQL_ENGINE §5.3 and the coverage of §14.2 come from the data.
- Add its rows to the "why each line exists" table in SQL_ENGINE §5.3 (the tool checks they match `support/`), its column in §6.5, its own decisions in §8.2 and its gaps in §9.
- Record its level in SQL_ENGINE §14.1 with the evidence.
- `tools/architecture/model.json` if it adds a crate.

## Done means

The engine is **Integrable** (SQL_ENGINE §4) when, on every exact release it advertises: the PR and engine PR gates are green with complete evidence, every applicable row of §6 has a test, an `N/A` with its reason or a gap at P2 or lower in §9, and P0 = 0 and P1 = 0. Until then it is Experimental: it is neither released as supported nor advertised.

## A new line of an existing engine

1. Find what tells it apart: a corpus entry that passes on the new line and fails on the previous one, or the other way round. Without one, the releases share a line (SQL_ENGINE §5.1).
2. Declare it in `support/<engine>.json` with `revision: 1`, each datum with its fixture; add its probes to `tools/test-dbs/lines.json`. If it needs a new parser, protocol, type or catalog query, release the app that implements it first.
3. Run D7 and the applicable matrix on every release to be advertised as verified; then `status.mjs --write` and the line's reason in §5.3.

## A new exact release

1. Pin its image by digest in `verified` of `tools/test-dbs/lines.json`. The harness reads the server's real version and compares it; never infer it from the image name.
2. Run every applicable row of §6 (`sql-engine.yml` does it on the PR). If its behavior differs, it is a new line; if not, it joins the verified set.
3. Without that evidence it is not verified: it may connect with its line's rules, and the app says "unverified".

## Support packs are not engines

A support pack (SQL_ENGINE §11) carries **only line data** of an engine the app already knows: a new revision of a line or a new line that uses only mechanisms the app already has. It cannot declare an engine, change the guard, a parser or a driver, or say that something is verified or supported. A new engine is always an app release.

## Embedded engines

**Rowly DB does not have an architectural decision for engines without a server process yet.** Today `ConnectionConfig` (`crates/driver-core`) is host, port, database, user, password and TLS. So are the connection form, saved profiles (`app/src/lib/stores/connectionProfiles.ts`), the connect payload (`stores/connection.ts`) and `TlsStatus`. The test harness, the matrix and the evidence assume a container image pinned by digest.

Do not bend those types to fit an embedded engine, and do not add an abstraction ahead of it. Open an issue: the decision is made when an embedded engine is actually implemented.

## Trying the guide: SQLite

What a new developer gets from this repository today, step by step:

| Step | What the repository tells you | Decision still missing |
| :--- | :--- | :--- |
| 1 Identity | `new.mjs sqlite --like postgres` (`"` quotes, no backslash escapes) | — |
| 2 Definition | Every field and which are ⚠ | `routine_bodies`: SQLite triggers are `BEGIN … END` with no control flow, and neither `Block` nor `Quoted` describes that exactly. It needs a new variant, tested on every engine |
| 3 Parser | sqlparser has `SQLiteDialect` | — |
| 4 Driver | A `DbConnector` crate; sqlx publishes a SQLite driver | **`ConnectionConfig` and TLS** ([Embedded engines](#embedded-engines)): Rowly DB has no decision yet |
| 5 Exact release | `sqlite_version()` fits `ServerIdentity` | Which release is "the server" when the app links the library: **no decision yet** |
| 6 Lines | `support/sqlite.json`, line rule | Vendor support: SQLite has no LTS or EOL dates, and §5.2 does not define its window |
| 7 Introspection | `SchemaObjects`: attached databases as schemas, no routines, sequences or events (empty lists) | — |
| 8–10 Analyzer, guard, generated SQL | Fields and rows; `LIMIT`/`OFFSET` works in SQLite | — |
| 11 Frontend | Profile, `ENGINES`, `connections.ts` (lang-sql has a SQLite dialect) | The connection form is network-only (same decision as step 4) |
| 12–14 Harness, matrix, evidence | Layout and rows | **"Real server" = the linked library with its version and dataset pinned** (SQL_ENGINE says so), but `lines.json`, the harness and `sql-engine.yml` only know container images: no mechanism yet |

**For a network engine, this guide is complete:** every step has an owner, a file and a test that fails until it is done. **For an embedded engine like SQLite**, the missing decisions are exactly three: how a connection to a file is configured (`ConnectionConfig`, form, profiles, TLS), what "exact release" and "verified" mean when the app ships the library, and how the matrix pins and runs it without a container.
