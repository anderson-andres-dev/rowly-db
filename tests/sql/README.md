# SQL corpus

The SQL the engine tests run, laid out as described in [SQL_ENGINE.md](../../SQL_ENGINE.md#10-tests-fixtures-and-simulations) §10.

```text
common/                valid in every line of every engine: no-diagnostics.sql, mixed-errors.json, mixed-routines.json
<engine>/
  common/              valid in every line of the engine: valid.sql, attacks.sql, routines.sql,
                       no-diagnostics.sql, mixed.json (MariaDB uses MySQL's, except mixed.json)
  setup.sql            run on every server of the engine before its fixtures; errors are ignored
                       (objects a line lacks simply fail there)
  <line>/
    accepts.sql        new in this line: accepted on both ends of the line, rejected on both ends of the previous one
    rejects.sql        removed in this line: rejected on both ends of the line, accepted on both ends of the previous one
    reads.sql          results the driver must read on every server of the line; `-- expect:` gives the first cell; `-- gap: <error>` marks a known driver gap (SQL_ENGINE §9) that must fail with that error until it is fixed
```

Lines and the servers at each end are in `tools/test-dbs/lines.json`. Entries are separated by a line `-- ---`; each one is a single statement, with a comment saying what it proves. Objects go in the scratch database or schema `rowly_lines`, which `setup.sql` recreates.

```bash
tools/test-dbs/lines.sh up postgres
cargo test -p rowly-server-tests --test version_lines -- --ignored --test-threads=1
```
