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

## Resource cycles

`app/tests/e2e/resources.mjs` runs in the E2E workflow (Linux/WebKitGTK) and is a gate, not a number to compare: it opens the real app with the WebKit remote inspector, drives it with clicks and DOM events, and measures what gives a leak away.

| Cycle | What it does | Gate |
|---|---|---|
| 300 reconnections | Alternates a MySQL and a PostgreSQL profile, going back to the list each time | Each one shows its own server; analysis uses the current connection's catalog |
| 300 consoles | Open (Ctrl+Shift+Q), run (Ctrl+Enter), switch palette in Settings, close (Ctrl+F4) | A single editor is left at the end |
| Idle with a connection | 300 s with a result on screen | No backend call or `setInterval`; under 10 % of one core |

In all of them, from the warm-up (cycle 50) on, nothing grows: the live JavaScript heap after collecting (±10 % or 2 MB), live objects (±5 %), the floor of the backend's own memory (`Anonymous`, ±5 % or 2 MB), mounted editors and styles. If the heap grows, the error names the classes that added objects.

The WebKitWebProcess PSS is reported but is not a gate: it rises with memory the collector already freed and WebKit keeps, and flattens on its own (over 1500 reconnections, around 600–700, with and without the JIT) while the live heap stays flat. At idle, under Xvfb without a GPU, the blinking cursor and the GTK compositor take ~3 % of one core.

Locally: `xvfb-run node app/tests/e2e/resources.mjs --app <binary>`, with `run.mjs`'s databases and PostgreSQL on `E2E_PG_PORT`/`E2E_PG_USER`. `E2E_ONLY` picks a cycle; `E2E_RECONNECTIONS`, `E2E_CONSOLE_CYCLES` and `E2E_IDLE_SECONDS` change their length.

## What is not measured yet

Keystroke-to-paint latency and grid frame times: they need the app instrumented (`performance.mark` and Rust `Instant` around each operation). Windows/WebView2 and macOS/WKWebView are measured on those machines. A missing scenario is reported as missing, never as passed.
