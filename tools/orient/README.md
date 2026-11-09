# orient

**English** · [Español](README.es.md)

Orientation for any task, for any agent or person: bug, new feature, change, refactor, tests, or a question about the project. It reads the repository and prints a small card (about 500 tokens, never more than 1 200): where the thing lives, which line ranges to read, what to reuse, what depends on it, which tests to run and whether that is enough. It needs only Node and the repository: no service, no model, no dependency, no provider-specific setup. [AGENTS.md](../../AGENTS.md) is the entry point; everything here is plain Markdown, JSON and terminal commands.

```bash
node tools/orient/orient.mjs "the grid does not scroll while drag-selecting"   # level 0: the card
node tools/orient/orient.mjs --expand results-grid                            # level 1: its files and symbols
node tools/orient/orient.mjs --impact app/src/lib/results/gridAutoScroll.ts   # level 2: who uses it, whom it uses, tests
```

`--intent bug|feature|refactor|analysis|tests|modify` forces the kind of task (otherwise it is detected, and it only changes the shape of the card, never its confidence), `--budget <tokens>` the size, `--json` the output, `--no-graph` ignores Graphify even if present.

## How it works

One hand-written source, everything else derived:

- **Catalogue**: the `features` key of `tools/architecture/model.json` (what a task can name, with the words users and the interface use, in Spanish and English). `node tools/orient/features.mjs --check` validates it; `docs/map/FEATURES.md` is generated from it. Tests are not repeated: they come from `tests/inventory.json`.
- **Index** (`index.mjs`): per file, its symbols with line ranges, imports, Tauri IPC calls and the interface texts it shows. Cached in `.orient/` (ignored by git); it rereads only what changed in size or date, is rebuilt when the extractor's code changes, includes new files not yet added to git, and gives the same cards with or without the cache.
- **Retrieval** (`retrieve.mjs`): BM25 over features, files and tests; a feature reinforces its files; tasks that cross two areas keep room for the second one.
- **Card** (`card.mjs`): a different shape per kind of task, always within the budget. The last line says how far to trust it: `SUFFICIENT` only with high confidence; `PARTIAL` or `AMBIGUOUS` say which level to ask for next; `NO MATCH` says nothing in the repository uses those words.
- **Graphify** (`graphify.mjs`) is an optional extra: if `graphify-out/graph.json` exists, the card adds a line of neighbours marked "by name, may be off". It never changes confidence or what is proposed (a test checks it).

## Keeping the index fresh

Every `orient.mjs` call refreshes the index first (about 25 ms when nothing changed, 100 ms from scratch). Nothing else is needed. To do that work earlier, there are optional git hooks:

```bash
node tools/orient/hooks.mjs status                 # what is installed, and by whom
node tools/orient/hooks.mjs install [--graphify]   # post-commit, post-merge, post-checkout
node tools/orient/hooks.mjs uninstall              # removes only what install added
```

Nothing installs them: no npm script, no workflow, no other tool. They append a marked block to an existing shell hook (never overwrite a hook that is not shell) and cannot make a commit fail: they print nothing and exit cleanly even without Node or without `tools/orient`. `--graphify` also runs `graphify update .` in the background if Graphify is installed.

## Measuring it

`tests/orient/gold.json` holds 49 tasks taken from real commits (`files` and `tests` are what the change touched; the text is how someone would ask for it), split into `train` (the only one parameters may be tuned on), `holdout` and `validation` (measured, never tuned on). `tests/orient/negatives.json` holds out-of-scope tasks for which it must never say `SUFFICIENT`.

```bash
node tools/orient/eval.mjs --report                       # orient vs graphify query, from the records
node tools/orient/eval.mjs --check                        # CI: has orient got worse than tests/orient/orient.json?
node tools/orient/eval.mjs --runner orient --split train  # while tuning: train only
node tools/orient/eval.mjs --runner orient --no-graph --write   # after an intended change, record it
```

`--check` compares totals (not task by task) against the record and its `tolerance`: a small drop warns, a large one fails, an improvement never fails. A task added to the gold means regenerating both records (a test says so).

## Known limits

Measured at the end of the work; the current numbers are always `--report`.

- **`SUFFICIENT` is right 87 % of the time, not 90 %** (counting "at least half of the expected files were proposed"). It is always right about the area (some expected file is always among those proposed) but it does not know when a change spans several layers: the wrong ones were multi-file tasks across Rust and the frontend. Dispersion signals did not separate them, so none was added.
- **Some tasks get no correct file** (5 of 49 in the last measurement): when the code names things differently from the description, when the work is a contract that crosses engine, backend and frontend, or when it is styling with no vocabulary of its own. These are left as they are; the `--check` tolerance is what protects against making them worse.
- **Integration tests are often not found** (`contract.rs`, `safety.rs`): their owner is a crate, not the file being changed.
- **Files under `tests/` folders are treated as tests**, so a script such as `app/tests/e2e/resources.mjs` is listed as a test, never as a file to change.
- **A short task made only of common words gets `NO MATCH`** even if something relevant exists: it is the price of not guessing.
- **Precision is about 30 %**: expected answers have ~3 files and the card proposes up to 5. Cutting harder raises it by losing recall.
- **Small and partly biased evidence**: 49 tasks; the catalogue vocabulary was written knowing the history (the 11 later `train` tasks and the `validation` set are the unbiased check); the index is built on HEAD, which already contains each fix (as it also does for Graphify's graph).
- **Crude language handling**: accents and plural stripping plus a six-letter stem, in Spanish and English; symbols come from regular expressions, not parsers.
