# Test databases

MySQL, MariaDB and PostgreSQL in Docker, loaded with the classic **Sakila** database (MySQL and MariaDB) and its PostgreSQL port **Pagila**: the same DVD-rental model in the three engines, with tables, views, stored procedures, functions and triggers. They are the target of the server tests in `crates/server-tests`.

| Engine | Image | Port | Database |
|---|---|---|---|
| MySQL | `mysql:8.4` | 33306 | `sakila`, `rowly_test` |
| MariaDB | `mariadb:11` | 33307 | `sakila`, `rowly_test` |
| PostgreSQL | `pgvector/pgvector:pg18` | 55432 | `pagila` (schema `rowly_test`) |

User and password are `rowly` / `rowly` (root password of MySQL and MariaDB: `rowly`). Ports are bound to `127.0.0.1` only.

## Use

```bash
tools/test-dbs/up.sh          # starts the three and loads whatever is missing
cargo test -p rowly-server-tests -- --ignored --test-threads=1
docker compose -f tools/test-dbs/docker-compose.yml down   # stop; data is kept
```

Data lives in named volumes, so it survives `down`; `down -v` deletes it. `up.sh` is idempotent: run it whenever you want them up. It downloads Sakila and Pagila into `tools/test-dbs/data/` (not versioned; they are not ours).

`rowly_test` holds a canary table the security tests check after running hostile text. Tests create their own routines through the same path as the app (guard, then driver).

## Version lines

`lines.sh` starts one empty server for each end of each version line listed in `lines.json` (SQL_ENGINE.md §5), with its data in memory. The test `version_lines` proves that each line is told apart from the previous one, with the fixtures in `tests/sql/<engine>/<line>/`.

```bash
tools/test-dbs/lines.sh up postgres      # or mysql, mariadb; no argument: all of them
cargo test -p rowly-server-tests --test version_lines -- --ignored --test-threads=1
tools/test-dbs/lines.sh down postgres
tools/test-dbs/lines.sh list             # lines, images and ports
```

They are pulled from `public.ecr.aws/docker/library`, the public mirror of the official images, so that twenty servers do not hit Docker Hub's anonymous pull limit. Ports go from 34001 (MySQL), 34101 (MariaDB) and 34201 (PostgreSQL). Root (or `postgres`) password: `rowly`. Starting a whole engine at once takes about 3 GB of RAM for MySQL, less for the others.

## Server tests

- `the_routines_corpus_…`: a corpus of procedures, functions, triggers and events (`crates/server-tests/corpus`) goes through the guard and is created and called on each server.
- `the_definitions_the_server_returns_…`: every definition the servers hand back for Sakila and Pagila (`SHOW CREATE …`, `pg_get_functiondef`) must be accepted by the guard.
- `no_text_the_guard_accepts_…` and `fuzzing_the_guard_…`: texts with a second statement hidden in them run on the real server; if the guard accepted one, the canary must be intact. The fuzz mutates valid routines; `ROWLY_FUZZ_CASES`, `ROWLY_FUZZ_SEED` and `ROWLY_ENGINES=mysql,postgres` tune it.
- `tls_verification_uses_the_configured_ca`: copies the CA MySQL generated for its own certificate out of the container (`docker exec … cat /var/lib/mysql/ca.pem`) and checks `VerifyCa` and `VerifyIdentity` against it and against `tls/unrelated-ca.pem`, a test CA that signs nothing (no private key is kept).
