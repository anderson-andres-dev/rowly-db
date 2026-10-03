# Performance measurements

English | [Español](README.es.md)

Reproducible measurements that every consolidation phase is compared against. They are **regression gates**, not latency promises: each phase compares itself with the reference on the same machine, and a result within the reference's measured spread is repeated before any decision. Benchmarks are kept apart from the functional tests so that a loaded shared runner cannot fail a pull request.

```text
tools/bench/
  linux/desktop.py          startup, memory and idle of the real app (Linux/Hyprland)
  frontend/                 per-keystroke cost of the editor's pure modules (Node, no WebView)
  compare.py                compares a new measurement with a reference folder
  baseline/<label>/         reference summaries (JSON); full traces stay out of Git
crates/server-tests/examples/catalog_bench.rs
                            connect, introspection, guard and analysis per engine (real servers)
```

## Running

```bash
# Real app, release binary, isolated empty profile, off-screen special workspace
python3 tools/bench/linux/desktop.py startup --app rowly --binary <path> --mode warm --runs 20 --label <label> --out <dir>/linux-rowly-startup-warm.json
python3 tools/bench/linux/desktop.py startup --app rowly --binary <path> --mode cold --runs 20 --label <label> --out <dir>/linux-rowly-startup-cold.json
python3 tools/bench/linux/desktop.py idle    --app rowly --binary <path> --seconds 300 --label <label> --out <dir>/linux-rowly-idle.json

# Editor modules in Node
cd app && BENCH_OUT=<dir>/node-editor.json npx vitest run --config ../tools/bench/frontend/vitest.config.mts

# Engines against tools/test-dbs (one run at a time, never against a user database)
tools/test-dbs/up.sh
cargo run --release -p rowly-server-tests --example catalog_bench -- <dir>/catalog.json

# Compare with the reference
python3 tools/bench/compare.py tools/bench/baseline/v0.3.0 <dir>
```

`desktop.py` measures from outside the app and never sends it input: time until the window exists, time until the process tree goes idle (less than 20 ms of CPU in the last second), PSS of the whole tree five seconds later, and the TCP endpoints it opens. `--app beekeeper` runs the same scenarios on Beekeeper Studio for the product comparison. A `cold` run evicts the files the app maps from the page cache with `posix_fadvise` (no root needed); libraries that another process keeps mapped cannot be evicted, so it is an approximate cold start.

Do not run measurements while building or testing: other load on the machine changes the results.

## References

Compare only against a reference taken on the same machine and system:

| Reference | What was measured | Where |
|---|---|---|
| `baseline/v0.3.0` | The published release binary (`rowly-db-bin 0.3.0-1`), with Beekeeper Studio and the engine benchmark | Omarchy, kernel 7.2.5, profile `performance` |
| `baseline/v0.3.0-cachyos` | `v0.3.0` built from its tag (`npx tauri build --no-bundle`), the same way as the branch it is compared with | CachyOS, kernel 7.1.8, profile `balanced` (same CPU) |

`node-editor.json` has no dispersion field, so a single run against another single run can flag noise at the microsecond scale. Before calling it a regression, repeat both sides (five alternating runs) and compare medians.

## What is not measured yet

These scenarios need the app to be instrumented (`performance.mark` and Rust `Instant` around each operation) or to be driven by input, and neither exists yet: keystroke-to-paint latency, grid frame times, the 300 open/close cycles, and idle with an open connection. Windows/WebView2 and macOS/WKWebView are measured on those machines. A missing scenario is reported as missing, never as passed.
