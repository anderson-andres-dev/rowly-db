# Stack

<!-- generated: stack (tools/orient/stack.mjs) -->

The direct dependencies with the version this repository really resolves, and where to read the documentation of **that** version. Before using the API of a dependency, look it up here: a library's "latest" docs and what you remember may describe another major version. Generated from `Cargo.toml`, `Cargo.lock`, `app/package.json` and `app/package-lock.json` by `node tools/orient/stack.mjs --write`; never edit it by hand.

The version-specific link is `docs.rs/<crate>/<version>` for crates and the package's version page for npm. The guide link is the library's official site; it usually follows the latest release, so check its version selector against the resolved version.

## Rust (workspace)

| Crate | Declared | Resolved | Used by | Docs |
| :--- | :--- | :--- | :--- | :--- |
| `async-trait` | `0.1` | **0.1.92** | `khipu-driver-core`, `khipu-driver-mysql`, `khipu-driver-postgres` | [docs.rs](https://docs.rs/async-trait/0.1.92) |
| `base64` | `0.22.1` | **0.22.1** | `khipu-desktop` | [docs.rs](https://docs.rs/base64/0.22.1) |
| `futures-util` | `0.3` | **0.3.34** | `khipu-driver-mysql`, `khipu-driver-postgres` | [docs.rs](https://docs.rs/futures-util/0.3.34) |
| `keyring` | `4.2.0` | **4.2.0** | `khipu-desktop` | [docs.rs](https://docs.rs/keyring/4.2.0) |
| `minisign-verify` | `0.2.5` | **0.2.5** | `khipu-desktop` | [docs.rs](https://docs.rs/minisign-verify/0.2.5) |
| `portable-pty` | `=0.9.0` | **0.9.0** | `khipu-desktop` | [docs.rs](https://docs.rs/portable-pty/0.9.0) |
| `reqwest` | `0.13` | **0.13.5** | `khipu-desktop` | [docs.rs](https://docs.rs/reqwest/0.13.5) |
| `rustls` | `0.23` | **0.23.45** | `khipu-desktop` | [docs.rs](https://docs.rs/rustls/0.23.45) |
| `semver` | `1` | **1.0.28** | `khipu-desktop` | [docs.rs](https://docs.rs/semver/1.0.28) |
| `serde` | `1` | **1.0.229** | `khipu-desktop`, `khipu-driver-core`, `khipu-engine` | [docs.rs](https://docs.rs/serde/1.0.229) |
| `serde_json` | `1` | **1.0.151** | `khipu-desktop`, `khipu-driver-core`, `khipu-engine`, `khipu-lsp`, `rowly-server-tests` | [docs.rs](https://docs.rs/serde_json/1.0.151) |
| `sha2` | `0.10.9` | **0.10.9** | `khipu-desktop` | [docs.rs](https://docs.rs/sha2/0.10.9) |
| `sqlparser` | `0.56` | **0.56.0** | `khipu-engine` | [docs.rs](https://docs.rs/sqlparser/0.56.0) |
| `sqlx` | `0.8` | **0.8.6** | `khipu-driver-mysql`, `khipu-driver-postgres`, `rowly-server-tests` | [docs.rs](https://docs.rs/sqlx/0.8.6) |
| `tauri` | `2` | **2.11.6** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri/2.11.6) · [Tauri guide](https://v2.tauri.app/) |
| `tauri-build` | `2` | **2.6.3** | `khipu-desktop` (build) | [docs.rs](https://docs.rs/tauri-build/2.6.3) |
| `tauri-plugin-clipboard-manager` | `2` | **2.3.3** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri-plugin-clipboard-manager/2.3.3) |
| `tauri-plugin-dialog` | `2` | **2.7.3** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri-plugin-dialog/2.7.3) |
| `tauri-plugin-opener` | `2` | **2.5.5** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri-plugin-opener/2.5.5) |
| `tauri-plugin-updater` | `2` | **2.12.0** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri-plugin-updater/2.12.0) |
| `tauri-plugin-window-state` | `~2.4.1` | **2.4.1** | `khipu-desktop` | [docs.rs](https://docs.rs/tauri-plugin-window-state/2.4.1) |
| `thiserror` | `1` | **1.0.69** | `khipu-driver-core` | [docs.rs](https://docs.rs/thiserror/1.0.69) |
| `tokio` | `1` | **1.53.1** | `khipu-desktop`, `khipu-driver-core`, `khipu-driver-mysql`, `khipu-driver-postgres`, `khipu-lsp`, `rowly-server-tests` | [docs.rs](https://docs.rs/tokio/1.53.1) · [Tokio guide](https://tokio.rs/tokio/tutorial) |
| `tower-lsp` | `0.20` | **0.20.0** | `khipu-lsp` | [docs.rs](https://docs.rs/tower-lsp/0.20.0) |
| `trash` | `5` | **5.2.9** | `khipu-desktop` | [docs.rs](https://docs.rs/trash/5.2.9) |
| `url` | `2` | **2.5.8** | `khipu-desktop` | [docs.rs](https://docs.rs/url/2.5.8) |

## Frontend (`app/package.json`)

| Package | Declared | Resolved | Kind | Docs |
| :--- | :--- | :--- | :--- | :--- |
| `@codemirror/autocomplete` | `^6.20.3` | **6.20.3** | normal | [npm](https://www.npmjs.com/package/@codemirror/autocomplete/v/6.20.3) |
| `@codemirror/commands` | `^6.11.1` | **6.11.1** | normal | [npm](https://www.npmjs.com/package/@codemirror/commands/v/6.11.1) |
| `@codemirror/lang-sql` | `^6.10.0` | **6.10.0** | normal | [npm](https://www.npmjs.com/package/@codemirror/lang-sql/v/6.10.0) |
| `@codemirror/language` | `^6.12.4` | **6.12.4** | normal | [npm](https://www.npmjs.com/package/@codemirror/language/v/6.12.4) |
| `@codemirror/search` | `^6.7.2` | **6.7.2** | normal | [npm](https://www.npmjs.com/package/@codemirror/search/v/6.7.2) |
| `@codemirror/state` | `^6.7.5` | **6.7.5** | normal | [npm](https://www.npmjs.com/package/@codemirror/state/v/6.7.5) |
| `@codemirror/view` | `^6.43.12` | **6.43.12** | normal | [npm](https://www.npmjs.com/package/@codemirror/view/v/6.43.12) |
| `@lezer/common` | `^1.5.2` | **1.5.2** | normal | [npm](https://www.npmjs.com/package/@lezer/common/v/1.5.2) |
| `@lezer/highlight` | `^1.2.3` | **1.2.3** | normal | [npm](https://www.npmjs.com/package/@lezer/highlight/v/1.2.3) |
| `@lucide/svelte` | `^1.47.0` | **1.47.0** | normal | [npm](https://www.npmjs.com/package/@lucide/svelte/v/1.47.0) |
| `@sveltejs/adapter-static` | `^3.0.10` | **3.0.10** | dev | [npm](https://www.npmjs.com/package/@sveltejs/adapter-static/v/3.0.10) |
| `@sveltejs/kit` | `^2.65.1` | **2.70.3** | dev | [npm](https://www.npmjs.com/package/@sveltejs/kit/v/2.70.3) · [SvelteKit guide](https://svelte.dev/docs/kit) |
| `@sveltejs/vite-plugin-svelte` | `^7.1.2` | **7.3.0** | dev | [npm](https://www.npmjs.com/package/@sveltejs/vite-plugin-svelte/v/7.3.0) |
| `@tauri-apps/api` | `^2` | **2.11.1** | normal | [npm](https://www.npmjs.com/package/@tauri-apps/api/v/2.11.1) · [Tauri guide](https://v2.tauri.app/reference/javascript/api/) |
| `@tauri-apps/cli` | `^2` | **2.11.5** | dev | [npm](https://www.npmjs.com/package/@tauri-apps/cli/v/2.11.5) |
| `@tauri-apps/plugin-clipboard-manager` | `^2.3.3` | **2.3.3** | normal | [npm](https://www.npmjs.com/package/@tauri-apps/plugin-clipboard-manager/v/2.3.3) |
| `@tauri-apps/plugin-dialog` | `^2.7.3` | **2.7.3** | normal | [npm](https://www.npmjs.com/package/@tauri-apps/plugin-dialog/v/2.7.3) |
| `@tauri-apps/plugin-opener` | `^2.5.5` | **2.5.5** | normal | [npm](https://www.npmjs.com/package/@tauri-apps/plugin-opener/v/2.5.5) |
| `@xterm/addon-fit` | `0.11.0` | **0.11.0** | normal | [npm](https://www.npmjs.com/package/@xterm/addon-fit/v/0.11.0) |
| `@xterm/xterm` | `6.0.0` | **6.0.0** | normal | [npm](https://www.npmjs.com/package/@xterm/xterm/v/6.0.0) · [xterm.js guide](https://xtermjs.org/docs/) |
| `codemirror` | `^6.0.2` | **6.0.2** | normal | [npm](https://www.npmjs.com/package/codemirror/v/6.0.2) · [CodeMirror guide](https://codemirror.net/docs/) |
| `devicon` | `^2.17.0` | **2.17.0** | normal | [npm](https://www.npmjs.com/package/devicon/v/2.17.0) |
| `happy-dom` | `^20.14.5` | **20.14.5** | dev | [npm](https://www.npmjs.com/package/happy-dom/v/20.14.5) |
| `sql-formatter` | `^15.8.2` | **15.8.2** | normal | [npm](https://www.npmjs.com/package/sql-formatter/v/15.8.2) |
| `svelte` | `^5.56.3` | **5.57.1** | dev | [npm](https://www.npmjs.com/package/svelte/v/5.57.1) · [Svelte guide](https://svelte.dev/docs/svelte/overview) |
| `svelte-check` | `^4.6.0` | **4.7.6** | dev | [npm](https://www.npmjs.com/package/svelte-check/v/4.7.6) |
| `typescript` | `~6.0.3` | **6.0.3** | dev | [npm](https://www.npmjs.com/package/typescript/v/6.0.3) |
| `vite` | `^8.0.16` | **8.3.0** | dev | [npm](https://www.npmjs.com/package/vite/v/8.3.0) · [Vite guide](https://vite.dev/guide/) |
| `vitest` | `^5.0.1` | **5.0.1** | dev | [npm](https://www.npmjs.com/package/vitest/v/5.0.1) · [Vitest guide](https://vitest.dev/guide/) |

<!-- /generated -->
