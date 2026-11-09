# Working with AI agents

**English** · [Español](AI.es.md)

Any agent (Claude Code, Codex, Copilot, Gemini, Cursor, or a person with a terminal) that opens this repository and gets a generic request ("analyze the repo", "how can I make this change", "fix this") should not start by scanning. The repository tells it how it works and where the context is, depending on what it wants to do. This page explains how, so you can trust it and change it.

Nothing here depends on a provider: the source is Markdown, JSON and Node scripts. The files for a specific agent are generated and optional.

## The five pieces

| Piece | What it does | Where it lives |
| :--- | :--- | :--- |
| Knowledge | The map: every feature, its files, its tests, its neighbours; search over it. | `tools/architecture/model.json` (`features`), [docs/map/FEATURES.md](map/FEATURES.md), `tools/orient/` |
| Skills | One procedure per kind of change: what to read, steps, rules, checks. | `model.json` (`playbooks`), [docs/map/PLAYBOOKS.md](map/PLAYBOOKS.md), `.claude/skills/` and `.agents/skills/` (generated) |
| Rules | The persistent decisions, each with its reason and the command that checks it. | `model.json` (`rules`), the block in [AGENTS.md](../AGENTS.md) |
| Tool interface | A command line that answers "where is it, what else changes, which tests". | `node tools/orient/orient.mjs` (`--playbook`, `--expand`, `--impact`, versioned `--json`) |
| Documentation | The real version of each dependency and where to read the docs of that version. | [docs/map/STACK.md](map/STACK.md), generated from the lockfiles |

There is **one** curated source, `tools/architecture/model.json`. Everything else is generated from it (or from the lockfiles) and checked in CI, so nothing drifts.

## From a request to the context

1. The agent loads [AGENTS.md](../AGENTS.md): how the repository works, the playbook router, the map, the rules. About 14 KB at most, on purpose.
2. A kind of change with a procedure → its playbook (`node tools/orient/orient.mjs --playbook "<request>"`, or the `rowly-<id>` skill). Anything else → `node tools/orient/orient.mjs "<request>"`, a card of about 500 tokens: files and line ranges, what to reuse, what depends on it, tests to run.
3. If it needs a dependency's API, it checks the version in [docs/map/STACK.md](map/STACK.md) first.
4. It opens files only to confirm, by line range.

## How each agent gets there

| Agent | Entry | Note |
| :--- | :--- | :--- |
| Claude Code | `CLAUDE.md` (`@AGENTS.md`) and the skills in `.claude/skills/` | Claude reads `AGENTS.md` itself only when there is no `CLAUDE.md`, so the file imports it. |
| Codex | `AGENTS.md` and the skills in `.agents/skills/` | Codex scans `.agents/skills` from the working directory to the repository root. |
| GitHub Copilot | `AGENTS.md` | Nothing to add. |
| Gemini CLI | `GEMINI.md`, a one-line pointer to `AGENTS.md` | |
| Cursor and others | `AGENTS.md` if they read it; otherwise point them at it | Any agent that can run a terminal command can use `orient`. |

The pointer and skill files hold no instructions of their own: they are generated and `node tools/orient/features.mjs --check` fails if they differ from the source. Details on what each vendor documents: [tools/orient/README.md](../tools/orient/README.md#how-each-agent-finds-the-entry-point).

## Changing the toolkit

1. Edit `tools/architecture/model.json`: `features`, `rules` or `playbooks`. Never edit what sits between `<!-- generated: ... -->` markers, nor `docs/map/*`, nor the skills.
2. Run `node tools/orient/features.mjs --write` (and `node tools/orient/stack.mjs --write` after changing dependencies).
3. Run the checks: `node tools/orient/features.mjs --check`, `node tools/orient/stack.mjs --check`, `node --test tools/orient/*.test.mjs`, `node tools/orient/eval.mjs --check --strict`.
4. Keep `AGENTS.md` under 14 000 characters: it is paid on every request. Public docs go with their Spanish pair.

## What is proven and what is not

- The map in `AGENTS.md` cut the tokens a model spent on generic requests by about 20 % in a small trial (analyze the repo: 58 227 → 46 852; export to JSON: 57 250 → 45 002).
- The search finds the right files about half of the time on varied tasks (recall@5 ≈ 47 % over 177 tasks, better than the Graphify baseline on every split). `LIKELY` is right about two times in three. A small model without the card finds the files by itself almost as well: the card is a hint, not a substitute.
- With the full toolkit, six generic requests on a small model (Haiku, one run, read-only; [record](../tests/orient/toolkit-trial.json)) cost 4 % fewer tokens and 26 tool calls instead of 34 than at the previous state, with the same checklist met on five of six and one request (change a UI text) where the toolkit answer did not find the key or the component. None of the six used `--playbook` or a skill: the measured effect is that of the reorganized `AGENTS.md`, not of the playbooks.
- Playbooks are matched by a keyword search checked against 20 phrases written by the authors, not against independent requests.
- Not built: a documentation retrieval service or an MCP server. `orient --json` is the whole interface if you want one.

Measurements and limits in detail: [tools/orient/README.md](../tools/orient/README.md).
