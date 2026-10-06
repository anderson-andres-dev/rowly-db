# Performance measurements

English | [Español](README.es.md)

Reproducible measurements that every performance-sensitive change is compared against. They are **regression gates**, not latency promises: each change is compared with the reference on the same machine, and a result within the reference's measured spread is repeated before any decision. Benchmarks are kept apart from the functional tests so that a loaded shared runner cannot fail a pull request.

```text
tools/bench/
  linux/desktop.py          startup, memory and idle of the real app (Linux/Hyprland)
  frontend/                 per-keystroke cost of the editor's pure modules (Node, no WebView)
  compare.py                compares a new measurement with a reference folder
  baseline/<label>/         reference summaries (JSON); full traces stay out of Git
crates/server-tests/examples/catalog_bench.rs
                            connect, introspection, guard and analysis per engine (real servers)
```

## Budget

| Scenario | What is measured | Rule |
|---|---|---|
| Cold and warm startup, 20 runs | Time to window, PSS once settled, initial JS | No more than 5 % over the reference median; within the machine's spread, repeat before deciding |
| Five minutes without interaction, with and without a connection | CPU, memory, timers, backend calls | No growing slope; no work or network from disabled extensions |
| Typing in 10,000 lines and opening a 1 M-line document | Per-keystroke index, analysis and context cost | Within the reference spread; large documents get no more than 10 % worse and never block the UI |
| 300 reconnections, 300 console cycles and 300 terminal cycles | Live heap, objects, backend, mounted editors and styles | After warm-up, no sustained slope; any growth is explained and bounded (see [Resource cycles](#resource-cycles)) |
| MySQL, MariaDB and PostgreSQL with small and large catalogs | Connection, introspection, analysis | A UI change or a disabled extension adds no SQL queries |

The percentages are **regression** gates, not latency promises on every machine. A failure is reproduced on the same machine and comes with a CPU, memory or frame trace.

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

# Keystroke-to-paint and grid frames in the real app (see below)
cd app && xvfb-run --auto-servernum node tests/e2e/resources.mjs --app <binary> --measure <dir>/linux-rowly-latency.json

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
| `baseline/c5-cachyos` | The end of the consolidation, measured alternating with `v0.3.0-cachyos` in the same session; `node-editor.json` is the median of 5 runs | CachyOS, kernel 7.1.8, `balanced` profile |
| `baseline/hardening-cachyos` | Keystroke-to-paint and grid frames (`linux-rowly-latency.json`), the first time they were measured: median of 3 runs of the release binary under Xvfb, each run kept in `runs` | CachyOS, kernel 7.1.8, `balanced` profile |
| `baseline/terminal-pre` | `develop` at `af33348` (v0.4.0) before the integrated terminal: bundle, warm startup, idle, `resources.mjs` cycles and the first byte of the login shell outside the app; binary and package sizes in `summary.json` | Omarchy, kernel 7.2.5, `performance` profile |
| `baseline/terminal-post` | Integrated terminal T3: the same as `terminal-pre`, with `af33348` measured again on this machine (`*.pre-local.json`) and the CI AppImage before and after; the comparison against the budgets is in `summary.json` | CachyOS, kernel 7.1.8, `performance` profile, on battery |

`node-editor.json` has no dispersion field, so a single run against another single run can flag noise at the microsecond scale. Before calling it a regression, repeat both sides (five alternating runs) and compare medians.

## Resource cycles

`app/tests/e2e/resources.mjs` runs in the E2E workflow (Linux/WebKitGTK) and is a gate, not a number to compare: it opens the real app with the WebKit remote inspector, drives it with clicks and DOM events, and measures what gives a leak away.

| Cycle | What it does | Gate |
|---|---|---|
| 300 reconnections | Alternates a MySQL and a PostgreSQL profile, going back to the list each time | Each one shows its own server; analysis uses the current connection's catalog |
| 300 consoles | Open (Ctrl+Shift+Q), run (Ctrl+Enter), switch palette in Settings, close (Ctrl+F4) | A single editor is left at the end |
| Idle with a connection | 300 s with a result on screen | No backend call or `setInterval`; under 10 % of one core |
| 300 terminals | Open with Alt+F12, wait for the shell, close | No shell left alive and the backend back to its thread count |
| Idle with the terminal | 300 s with the terminal open | Same as idle with a connection |
| Large output | 50 MB of base64, then `yes` for 30 s | The 50 MB finish; during the burst and under `yes`, at most 2 event-loop ticks (or 2 %) wait over 200 ms; under `yes`, between 10 s and 30 s, own memory grows no more than 10 MB in the backend and 60 MB in WebKit |

In all of them, from the warm-up (cycle 50) on, nothing grows: the live JavaScript heap after collecting (±10 % or 2 MB), live objects (±5 %), the floor of the backend's own memory (`Anonymous`, ±5 % or 2 MB), mounted editors and styles. If the heap grows, the error names the classes that added objects.

The WebKitWebProcess PSS is reported but is not a gate: it rises with memory the collector already freed and WebKit keeps, and flattens on its own (over 1500 reconnections, around 600–700, with and without the JIT) while the live heap stays flat. At idle, under Xvfb without a GPU, the blinking cursor and the GTK compositor take ~3 % of one core.

Locally: `xvfb-run node app/tests/e2e/resources.mjs --app <binary>`, with `run.mjs`'s databases and PostgreSQL on `E2E_PG_PORT`/`E2E_PG_USER`. `E2E_ONLY` picks a cycle; `E2E_RECONNECTIONS`, `E2E_CONSOLE_CYCLES`, `E2E_TERMINAL_CYCLES` and `E2E_IDLE_SECONDS` change their length.

## Keystroke-to-paint and grid frames

`resources.mjs --measure <file>` runs two measurements instead of the cycles, with the same app, profile and inspector, and writes their percentiles. They are a **release benchmark**, compared against a reference from the same machine, not a CI gate: under Xvfb without a GPU the tail moves too much between runs (keystroke p95 on 10,000 lines went from 159 to 249 ms in three runs), and a shared runner would only add noise.

| Measurement | How | `hardening-cachyos` (median of 3) |
|---|---|---|
| Keystroke to paint, 20 and 10,000 lines | 200 keys at the end of the document, one every 80 ms, typed with `execCommand("insertText")` (CodeMirror reads them from the DOM like real typing). Each one counts until the next frame has been painted: the next `requestAnimationFrame`, then a message. That includes waiting for the frame, so the floor is about one frame. | 20 lines: p50 21, p95 25, p99 28 ms. 10,000 lines: p50 27, p95 205, p99 373 ms |
| Grid frames, 2000 × 120 | A 2000-row, 120-column result (page size 2000), scrolled once per frame: 210 frames down, 90 to the right. Each frame interval is kept, and the most `<td>` mounted at once. | p50 17, p95 27, p99 41 ms; 23 of 300 frames over 25 ms, none over 50 ms; at most 17,920 cells mounted |

What these numbers say: with ordinary text, typing is painted on the next frame; scrolling the grid does not drop more than a frame at a time, and its DOM stays bounded by what is visible. With 10,000 lines, the median is the same but some keystrokes take 200–400 ms. Nothing measured this before, so it is not known to be a regression. Finding the cause needs a profile of those keystrokes, and that is still pending.

Windows/WebView2 and macOS/WKWebView are measured on those machines. A missing scenario is reported as missing, never as passed.
