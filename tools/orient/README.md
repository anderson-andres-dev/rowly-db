# orient

**English** · [Español](README.es.md)

Orientation for any task, for any agent or person: bug, new feature, change, refactor, tests, or a question about the project. It reads the repository and prints a small card (about 500 tokens, never more than 1 200): where the thing lives, which line ranges to read, what to reuse, what depends on it, which tests to run and whether that is enough. It needs only Node and the repository: no service, no model, no dependency, no provider-specific setup. [AGENTS.md](../../AGENTS.md) is the entry point and [docs/AI.md](../../docs/AI.md) explains how the whole toolkit (map, playbooks, rules, this tool, versions) fits together; everything here is plain Markdown, JSON and terminal commands.

```bash
node tools/orient/orient.mjs "the grid does not scroll while drag-selecting"   # level 0: the card
node tools/orient/orient.mjs --expand results-grid                            # level 1: its files and symbols
node tools/orient/orient.mjs --impact app/src/lib/results/gridAutoScroll.ts   # level 2: who uses it, whom it uses, tests
```

`--intent bug|feature|refactor|analysis|tests|modify` forces the kind of task (otherwise it is detected, and it only changes the shape of the card, never its confidence), `--budget <tokens>` the size, `--json` the output, `--no-graph` ignores Graphify even if present.

## Status in one page

What it is and what is proven, in plain terms (numbers: `node tools/orient/eval.mjs --report`; limits in detail further down):

| Question | Answer |
|---|---|
| Does it point to the right files? | Often, not always: better than `graphify query` on every measured split, and weaker on new, varied tasks than the headline average. |
| Does it help an agent? | Little for locating files: a small model that can search this repository finds them by itself in about ten tool calls (see "With real agents"). It is a hint, not a substitute. What *Impact* and *Tests* add was not measured. |
| Can I trust `LIKELY`? | Only as "probably the right area": it is right about two times in three. |
| Does it work with any AI? | Yes: Node and `git`, a Markdown card or versioned JSON, no provider, optional hooks and log. Each agent finds `AGENTS.md` its own way (table below). |
| Is it solid on other systems and bigger repositories? | Linux with Node 24 is verified; macOS, Windows and Node 20 are set up in CI but have not run yet. A synthetic 20 000-file repository indexes in under 2 s. |

**Not closed**, on purpose or for lack of means: recall on varied tasks is about half; precision is low because the card proposes up to five files for answers of about three; `LIKELY` cannot be predicted better with the signals we have; only Spanish and English; the evaluation set is small (177 tasks) and partly spent, so tuning again needs new real work (collect it with `--log` and `--feedback`); the playbook skills are generated from `model.json` and an MCP server is shipped (see below), but neither has been measured to help agents beyond the trials in `docs/AI.md`.

## How it works

`AGENTS.md` carries a generated map of the repository (one line per feature, plus a short description of the layers and a table of what to do with a generic request), so an agent starts with the layout loaded and does not scan. It is rebuilt from the same catalogue by `features.mjs --write`, and CI checks it is up to date.

One hand-written source, everything else derived:

- **Catalogue**: the `features` key of `tools/architecture/model.json` (what a task can name, with the words users and the interface use, in Spanish and English). `node tools/orient/features.mjs --check` validates it; `docs/map/FEATURES.md` is generated from it. Tests are not repeated: they come from `tests/inventory.json`.
- **Index** (`index.mjs`): per file, its symbols with line ranges, imports, Tauri IPC calls and the interface texts it shows. Cached in `.orient/` (ignored by git); it rereads only what changed in size or date, is rebuilt when the extractor's code changes, includes new files not yet added to git, and gives the same cards with or without the cache.
- **Retrieval** (`retrieve.mjs`): BM25 over features, files and tests; a feature reinforces its files; tasks that cross two areas keep room for the second one.
- **Card** (`card.mjs`): a different shape per kind of task, always within the budget. The last line says how far to trust it: `LIKELY` only with high confidence and it means "probably the right area", not "nothing else to read"; `PARTIAL` or `AMBIGUOUS` say which level to ask for next; `NO MATCH` says nothing in the repository uses those words.
- **Graphify** (`graphify.mjs`) is an optional extra: if `graphify-out/graph.json` exists, the card adds a line of neighbours marked "by name, may be off". It never changes confidence or what is proposed (a test checks it).

## Keeping the index fresh

Every `orient.mjs` call refreshes the index first (about 25 ms when nothing changed, 100 ms from scratch). Nothing else is needed. To do that work earlier, there are optional git hooks:

```bash
node tools/orient/hooks.mjs status                 # what is installed, and by whom
node tools/orient/hooks.mjs install [--graphify]   # post-commit, post-merge, post-checkout
node tools/orient/hooks.mjs uninstall              # removes only what install added
```

Nothing installs them: no npm script, no workflow, no other tool. They append a marked block to an existing shell hook (never overwrite a hook that is not shell) and cannot make a commit fail: they print nothing and exit cleanly even without Node or without `tools/orient`. `--graphify` also runs `graphify update .` in the background if Graphify is installed.

## Wrapping it for another tool (MCP, skill)

The playbooks ship as skills (`.claude/skills/rowly-<id>` and `.agents/skills/rowly-<id>`), generated from `tools/architecture/model.json` and checked in CI; `orient.mjs --playbook "<request>"` prints the same procedure (`--json`: `kind: "playbook"`, schema version 1). The tool itself ships as an MCP server, `tools/orient/mcp.mjs` (stdio, no dependency), declared in `.mcp.json` so Claude Code finds it; its tools (`playbook`, `orient`, `expand`, `impact`, `stack`) return the same text as the command line, and [docs/AI.md](../../docs/AI.md#the-mcp-server) lists them. Any other agent that can run a terminal command needs none of this: `orient.mjs "<task>" --json` is the whole interface (see the contract above). The MCP server reports its own protocol, not the `--json` schema version, so a change to either is noticed in its own tests.

## How each agent finds the entry point

`AGENTS.md` is the entry point. What the vendors document (checked on the pages linked; the status says how far):

| Agent | Reads `AGENTS.md`? | In this repository |
|---|---|---|
| Claude Code | Yes, since v2.1.277, **only when there is no `CLAUDE.md`**; with one it reads that instead. Per its [memory docs](https://code.claude.com/docs/en/memory#agents-md) the official way to combine them is an `@AGENTS.md` import in `CLAUDE.md`. | `CLAUDE.md` is that import (`@AGENTS.md`), so `AGENTS.md` is loaded into every session. |
| OpenAI Codex | Yes ([guide](https://developers.openai.com/codex/guides/agents-md); not read directly, from secondary sources). Skills: it scans `.agents/skills` up to the repository root ([skills docs](https://learn.chatgpt.com/docs/build-skills), checked). | The generated playbook skills in `.agents/skills`. |
| GitHub Copilot coding agent | Yes ([changelog](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions)). Reports on Copilot CLI disagree. | Nothing to add. |
| Gemini CLI | Not by default: it reads `GEMINI.md`; `context.fileName` can add `AGENTS.md` ([docs](https://www.geminicli.com/docs/cli/gemini-md)). | `GEMINI.md` is a one-line pointer. |
| Cursor | Reported by third parties (rules docs: [cursor.com/docs/rules](https://cursor.com/docs/rules), not verified here). | Nothing to add. |

Any other agent that can run a terminal command can use `node tools/orient/orient.mjs`; none of this is needed for that. The pointer files hold no instructions of their own, so there is nothing to keep in sync.

## The `--json` contract

`orient.mjs ... --json` prints one JSON object whose keys are fixed. Changing them means raising `schemaVersion` (a test pins the exact keys).

| `kind` | keys |
|---|---|
| `card` | `schemaVersion`, `kind`, `intent`, `confidence` (`level`: `high`\|`medium`\|`low`\|`none`, plus `margin`, `coverage`, `evidence`), `likely` (true only with `high`), `noMatch`, `primary` (files to read, in order), `files` (everything the card names), `tests`, `tokens` |
| `expand`, `impact` | `schemaVersion`, `kind`, `files`, `tests`, `tokens` |

`--with-markdown` adds a `markdown` key with the card text. Paths are repository-relative with `/`.

## Usage log and feedback (optional)

Off by default. `--log` (or `ORIENT_LOG=<path>`) appends one JSON line per query to `.orient/log.jsonl` (ignored by git): time, kind, task, confidence, proposed files and tests. `node tools/orient/orient.mjs --feedback good|partial|bad [note]` marks the last logged query. It never leaves the machine and nothing reads it automatically: it is raw material to find where the card failed with real use.

## With Claude Code and Graphify

`.claude/settings.json` carries a hook installed by Graphify (`graphify hook-guard`) that tells Claude Code to run `graphify query` before searching. It is Graphify's, not orient's, and it was left as is. The two coexist: `AGENTS.md` says to start with `orient` (it needs nothing installed), and Graphify remains an optional second opinion when `graphify-out/graph.json` exists. If you want only one, remove the hook from your own settings; nothing in orient depends on it.

## With real agents

Retrieval metrics say whether the right file is in the card, not whether an agent does better with it. `agent-eval.mjs` measures that for localization: given a task, an agent says which files it would change first and which tests it would run, with or without the card.

1. Make a plain copy of the repository **without git history and without the answers**: `git archive HEAD | tar -x -C <snapshot>`, then delete `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `tools/orient`, `tests/orient` and `docs/map`.
2. `node tools/orient/agent-eval.mjs prompts --out <dir> --snapshot <snapshot>` writes `<id>.A.txt` (no card) and `<id>.B.txt` (with the card) for 20 tasks: 10 from `validation5` (UI work) and 10 from `seen4` (SQL guard and analyzer work), chosen by a fixed rule.
3. Run each prompt with the agent or model you want, each in a fresh session, and have it write its JSON answer to `<id>.A.json` or `<id>.B.json`. Note tokens, tool calls and seconds in a `usage.json` (`{"<id>.A": {"tokens": n, "toolUses": n, "durationMs": n}}`).
4. `node tools/orient/agent-eval.mjs score --answers <dir> --usage usage.json --write` scores files (recall@5, precision) and tests against what the task's commit touched and writes `tests/orient/agent-eval.json`.

It costs tokens, so it is not part of CI.

**Result of the first run** (Claude Haiku subagents, one run per condition, 20 tasks: 10 from `validation5` and 10 from `seen4`; each agent had only Read, Grep and Glob on a copy with no git history, no gold files and no orient):

| | recall@5 | precision | hit@5 | tests | tokens | tool calls | seconds |
|---|---|---|---|---|---|---|---|
| A: no card | 79 % | 33 % | 90 % | 71 % | 51 261 | 10.7 | 32.0 |
| B: with card | 81 % | 38 % | 95 % | 71 % | 49 930 | 10.5 | 30.3 |
| the card alone | 32 % | – | 55 % | – | – | – | – |

On `validation5` both conditions found every file; on `seen4` (SQL guard and analyzer) B was 62 % against 58 %. By task, B was better in 1, worse in 0 and equal in 19. **Read it plainly: for locating files, a small model that can search this repository finds them by itself in about ten tool calls, and the card changes little** (+2 points of recall, +4 of precision, about 3 % fewer tokens, which is inside the noise of one run). The card alone is far worse than the agent (32 % against 79 %), so it is a hint, not a substitute. This run does not measure what the Impact and Tests sections add, or what the card does for agents that cannot search or work on repositories much larger than this one.

Limits of this measurement: one run per condition and 20 tasks; the agents work on HEAD, where each fix already exists, and the copy still contains the architecture documents and `tools/architecture/model.json`, which are themselves a map; the token figure includes about 40 000 tokens of fixed overhead of each subagent, so small savings cannot show; it measures localization, not solving the task.



**Generic requests with the map in `AGENTS.md`** (4 Haiku subagents, one run each, two requests: "analyze the repository and tell me how it is organized" and "how could I make query results exportable to a JSON file: files, reuse, tests"; A = copy without `AGENTS.md` or orient, B = the repository as it is now):

| request | A: tokens / tool calls / files read | B: tokens / tool calls / files read |
|---|---|---|
| analyze the repository | 58 227 / 6 / 4 | 46 852 / 5 / 2 |
| make results exportable to JSON | 57 250 / 8 / 3 | 45 002 / 6 / 3 |

Both conditions answered correctly (both found that JSON export already exists and named the same files); B used about 20 % fewer tokens and 17 to 25 % fewer tool calls and its answer was taken from the map. One run each and two requests: it points in the right direction, it does not prove it. The tokens include the same fixed overhead as above, so the real saving in exploration is larger than the percentage.

## Portability and performance

It uses only Node's standard library and `git`; Node 20 or later. Repository paths are handled as `/` paths whatever the system, CRLF line endings are tolerated, and the only parts that need a POSIX `sh` are the optional git hooks (their tests are skipped on Windows). The `orient-portable` job in `node.yml` runs the tests and `eval.mjs --check` on Ubuntu, macOS and Windows with Node 20 and 22. **It was added here but has not run yet**: until it does, it is verified only on Linux with Node 24, and the macOS and Windows entries are advisory (a failure there does not block CI) until they have run green once.

`node tools/orient/bench.mjs` builds a synthetic repository and measures it. On the machine used (one run, so read it as an order of magnitude):

| files | index from scratch | index with cache | one card |
|---|---|---|---|
| 1 000 | 0.15 s | 0.09 s | 3 ms |
| 5 000 | 0.5 s | 0.4 s | 9 ms |
| 20 000 | 1.7 s | 1.2 s | 36 ms |

This repository has about 300 indexed files (0.1 s). The bench found a real cost (looking up each file's features against every catalogue entry) that made 20 000 files take 3.8 s; it is fixed.

`eval.mjs --check --strict` also fails on any drop above the warning threshold. It runs in the nightly and manual full validation, so a slow drift cannot build up unnoticed; pull requests keep the normal tolerance.

There is no unused history left to build more evaluation tasks from: every commit that could be turned into a task already is. Future tuning needs new real work. `--log` and `--feedback` (above) are the way to collect it.

## Measuring it

`tests/orient/gold.json` holds 177 tasks taken from real commits (`files` and `tests` are what the change touched; the text is how someone would ask for it), split into `train` (the only one parameters may be tuned on) and `holdout`, `seen`, `seen2`, `seen3`, `seen4` and `validation5` (measured, never tuned on; all but the last were looked at in earlier rounds, `validation5` was measured once, at the end of the last one). `tests/orient/negatives.json` holds out-of-scope tasks for which it must never say `LIKELY`, and `tests/orient/short.json` one- and two-word queries that must not end in `NO MATCH`.

```bash
node tools/orient/eval.mjs --report                       # orient vs graphify query, from the records
node tools/orient/eval.mjs --check                        # CI: has orient got worse than tests/orient/orient.json?
node tools/orient/eval.mjs --runner orient --split train  # while tuning: train only
node tools/orient/eval.mjs --runner orient --no-graph --write   # after an intended change, record it
```

`--check` compares totals (not task by task) against the record and its `tolerance`: a small drop warns, a large one fails, an improvement never fails. A task added to the gold means regenerating both records (a test says so).

## Known limits

Measured at the end of the work; the current numbers are always `--report`.

- **`LIKELY` is right 64 % of the time, not 90 %** (counting "at least half of the expected files were proposed"), and in 84 % at least one expected file was among those proposed; on `seen4` (the hardest slice) it was 0 of 5 and 3 of 5. Treat it as "probably the right area" and always check Impact and the tests. The signals available do not predict it: each separates right from wrong cards barely better than chance, and the best rule found on `train` fell below the current one under leave-one-out, so no rule was added.
- **Retrieval is weaker on new, varied tasks than the headline suggests**: recall@5 is 47 % over all 177 tasks, 41 % on `validation5` (UI work) and 26 % on `seen4` (SQL guard and analyzer work). 50 of 177 tasks get no correct file at all: when the code names things differently from the description, when the work is a contract that crosses engine, backend and frontend, or when it is styling with no vocabulary of its own. The last round (feature vocabulary derived from the code of its files, configuration files, Rust `use` dependencies for Impact) raised `train` (recall 49 → 54 %) and the clean `validation5` (hit@5 54 → 63 %) but was flat on the tasks already seen (about −1 pp) and lowered the tests found on some of them, so do not read it as a general gain. It still beats `graphify query` on every split (6 % over all tasks, 4 % on `validation5`).
- **Integration tests** (`contract.rs`, `safety.rs`) are now declared per feature in the catalogue (`tests`), which raised the tests found on `train` (60 → 70 %) and `holdout` (50 → 70 %) and left `seen2` unchanged (80 %); the ones whose feature is not among the two best matches are still missed.
- **Files under `tests/` folders are treated as tests**, so a script such as `app/tests/e2e/resources.mjs` is listed as a test, never as a file to change.
- **The E2E scripts are not indexed**, by measurement (adding them made `train` worse). **Configuration files are** (`Cargo.toml`, `package.json`, Vite/Svelte/TypeScript/Tauri config) under a `build-config` feature with specific terms: it did not hurt recall and gives those tasks an answer, but no task in the set exercises it.
- **Short queries** (one or two words) return a card with `AMBIGUOUS` instead of `NO MATCH` when a rare word exists in the repository (hit@5 83 % over the twelve) and are never `LIKELY`.
- **The kind of task is a heuristic.** A task with no sign of an error or a refactor now gets the feature view (where to change, what to reuse): it agreed with the labels of the gold set 70 % of the time on `train`, up from 45 %. It changes the shape of the card, never its confidence or the files.
- **Not done**: suffix-based stemming, a tool to suggest catalogue terms and a third source of declared tests (taking the tests of the third best feature changed nothing). Per-file dependencies for Svelte markup are also missing; Rust ones exist now but only feed Impact, because in the search they added noise.
- **A short task made only of common words gets `NO MATCH`** even if something relevant exists: it is the price of not guessing.
- **Precision is about 30 %**: expected answers have ~3 files and the card proposes up to 5. Cutting harder raises it by losing recall.
- **Small and partly biased evidence**: 177 tasks, the last 24 almost all UI work (the only commits left unused); the catalogue vocabulary was written knowing part of the history (the later `train` tasks and `validation5` are the unbiased check); the index is built on HEAD, which already contains each fix (as it also does for Graphify's graph). Out-of-scope tasks declared `LIKELY` 0 % of the time.
- **Crude language handling**: accents and plural stripping plus a six-letter stem, in Spanish and English. A Spanish/English synonym table was tried and removed: it raised `train` but not the tasks measured once. Symbols come from regular expressions, not parsers.
