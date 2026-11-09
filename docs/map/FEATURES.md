# Features

<!-- generated: features (tools/orient/features.mjs) -->

Where each thing a user or a task can name lives: its files, the tests that protect it and its neighbours. Generated from the `features` key of `tools/architecture/model.json` and `tests/inventory.json`; to change it, edit the model and run `node tools/orient/features.mjs --write`. Never edit this file by hand.

A trailing `/` is a folder. The terms are what a user or the interface calls it, in Spanish and English.

## Index

- [`app-shell`](#app-shell): The app shell: Tauri startup and state, the IPC between frontend and backend (one owner module per command), shared types.
- [`build-config`](#build-config): Project configuration files: Cargo workspace and app manifests, Vite, Vitest, Svelte and TypeScript config, and the Tauri configuration.
- [`ci-release`](#ci-release): Continuous integration and releases: the workflows, the area planner, release evidence, packaging and signing.
- [`connection-profiles`](#connection-profiles): Saved connections: the form, the landing page, the switcher, colours, environments and the stored password.
- [`console-files`](#console-files): SQL files and folders: open, save and watch .sql files, the file tree, the text of each console and encodings.
- [`driver-core`](#driver-core): The driver contract: the connector trait, sessions and consoles, query cancel, connection errors and result assembly shared by every driver.
- [`driver-mysql`](#driver-mysql): The MySQL and MariaDB driver: connection, TLS, version detection and introspection.
- [`driver-postgres`](#driver-postgres): The PostgreSQL driver: connection, TLS, version detection, introspection and listing databases.
- [`e2e-and-benchmarks`](#e2e-and-benchmarks): End-to-end tests of the real app, resource cycles and performance baselines.
- [`editor-completion`](#editor-completion): Autocompletion in the editor: catalog tables and columns, call hints, relations, tables created in the script and go-to-definition.
- [`editor-formatting`](#editor-formatting): Formatting SQL: the formatter, its line layout and the preview of generated SQL.
- [`editor-search`](#editor-search): Find and replace inside the editor.
- [`engine-core`](#engine-core): The engine core: the public API of the SQL engine crate and the version-line data it reads.
- [`engine-registration`](#engine-registration): How an engine is registered and described: driver registry, frontend profile, dialect. The path to add an engine.
- [`execution-guard`](#execution-guard): The guard that classifies a statement as destructive and asks for confirmation first; also covers SQL the app generates.
- [`explorer-tree`](#explorer-tree): The database explorer: schemas, tables and views, the visible-schemas picker, pinned tables and the table definition.
- [`i18n`](#i18n): Interface languages: the message catalogs by area, the locale, and the translation of backend error keys.
- [`keyboard-shortcuts`](#keyboard-shortcuts): Keyboard first: shortcuts, the shortcut sheet, focus zones, numpad keys, dialog keys and the vim mode foundations.
- [`language-server`](#language-server): The engine language server, a stub for now: it answers initialize and shutdown only.
- [`query-history`](#query-history): History of executed queries: the panel, search and reuse.
- [`query-parameters`](#query-parameters): Parameters in a query (named and positional): the dialog, type hints and remembered values.
- [`real-server-tests`](#real-server-tests): Tests against real servers: the harness, the disposable MySQL, MariaDB and PostgreSQL containers and the SQL corpus.
- [`repo-tooling`](#repo-tooling): Repository tooling: the architecture model and graph, the test inventory, status generation and the orientation tools.
- [`result-tabs`](#result-tabs): Result tabs and the output log: one tab per result, pinned results and the status of each run.
- [`results-editing`](#results-editing): Editing data from the grid: changing cells, NULL and DEFAULT, inserting and deleting rows, the preview and applying changes.
- [`results-export-copy`](#results-export-copy): Getting data out: export dialog, copy as, clipboard and the output copy.
- [`results-filter-sort`](#results-filter-sort): Filtering and sorting results: the filter builder, per-column filters and sort keys, run on the server.
- [`results-grid`](#results-grid): The results grid: virtual scrolling, cell navigation and selection, drag-select autoscroll, find in results, JSON cells and grid settings.
- [`results-paging`](#results-paging): Paging and counting rows: the pager, page size, total count and the pagination the engine writes.
- [`settings-theming`](#settings-theming): The settings panel, colour palettes and themes, icon optics and motion.
- [`sql-diagnostics`](#sql-diagnostics): Static analysis of SQL while typing: parser, diagnostics, error positions, popup and error help. Informs; never gates execution.
- [`sql-editor`](#sql-editor): The SQL editor itself: CodeMirror setup, comments, indentation, highlighting, paste and editor settings.
- [`statement-execution`](#statement-execution): Running SQL: splitting statements, executing the selection or the statement under the cursor, cancelling and the execution log.
- [`support-packs`](#support-packs): Version support packs: downloading and verifying updated engine version lines.
- [`terminal`](#terminal): The integrated terminal: bottom-panel sessions on a PTY, flow control, and a client session already connected to the active database.
- [`ui-components`](#ui-components): Shared UI pieces: buttons, checkboxes, selects, fields, context menus, dialogs, tooltips and notifications. One piece per control.
- [`updates`](#updates): Updates and release highlights: the new-version prompt, the updates section, the signed download and the optional release highlight.
- [`version-lines`](#version-lines): Version lines: which server releases are verified, their capabilities and the support data the app reads.
- [`website`](#website): The public website and its community pages, with the screenshots taken from the real app.
- [`workspace-tiles`](#workspace-tiles): The workspace: console tabs, tiled groups, drag to reorder and split, tab outline and the Workspace component that wires them.

## app-shell

The app shell: Tauri startup and state, the IPC between frontend and backend (one owner module per command), shared types.

- Domain: `backend`
- Terms (es): IPC, comando, Tauri, estado de la app, arranque, portal, ventana principal, backend
- Terms (en): IPC, Tauri command, app state, startup, portal, main window, backend
- Files: `app/src-tauri/src/lib.rs`, `app/src-tauri/src/main.rs`, `app/src-tauri/src/state.rs`, `app/src-tauri/src/desktop_portal.rs`, `app/src-tauri/src/webkit_env.rs`, `app/src-tauri/src/engine_context.rs`, `app/src-tauri/src/commands/mod.rs`, `app/src-tauri/src/services/mod.rs`, `app/src/lib/backend.ts`, `app/src/lib/types.ts`, `app/src/routes/`, `app/src/app.html`
- Tests: `app/src-tauri/src/desktop_portal.rs`, `app/src-tauri/src/engine_context.rs`, `app/src-tauri/src/lib.rs`, `app/src-tauri/src/state.rs`, `app/src-tauri/src/webkit_env.rs`, `app/src/lib/backend.test.ts`
- Related: [`engine-registration`](#engine-registration), [`connection-profiles`](#connection-profiles)
- Docs: [docs/ARCHITECTURE.md#rules-for-the-app](../../docs/ARCHITECTURE.md#rules-for-the-app)

## build-config

Project configuration files: Cargo workspace and app manifests, Vite, Vitest, Svelte and TypeScript config, and the Tauri configuration.

- Terms (es): cargo, tsconfig, vitest, svelte.config, tauri.conf, package.json, manifiesto
- Terms (en): cargo, tsconfig, vitest, svelte.config, tauri.conf, package.json, manifest
- Files: `Cargo.toml`, `app/package.json`, `app/vite.config.js`, `app/vitest.config.ts`, `app/svelte.config.js`, `app/tsconfig.json`, `app/src-tauri/tauri.conf.json`, `app/src-tauri/tauri.release.conf.json`, `app/src-tauri/Cargo.toml`
- Tests: none (configuration files: checked by the build and by CI, not by an inventoried test)
- Related: [`ci-release`](#ci-release), [`app-shell`](#app-shell)
- Docs: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## ci-release

Continuous integration and releases: the workflows, the area planner, release evidence, packaging and signing.

- Domain: `ci`
- Terms (es): CI, integración continua, workflow, release, publicar, compuerta, planner, empaquetado, firma
- Terms (en): CI, continuous integration, workflow, release, publish, gate, planner, packaging, signing
- Files: `.github/workflows/`, `tools/ci/`, `tools/release/`, `packaging/`
- Tests: `tools/ci/scenarios.test.mjs`, `tools/ci/select.test.mjs`, `tools/release/manifest.test.mjs`, `tools/test-dbs/evidence.test.mjs`, `tools/test-dbs/window.test.mjs`
- Related: [`repo-tooling`](#repo-tooling), [`updates`](#updates)
- Docs: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## connection-profiles

Saved connections: the form, the landing page, the switcher, colours, environments and the stored password.

- Domain: `frontend`
- Terms (es): conexión, conexiones, perfil, base de datos, servidor, contraseña, entorno, producción, color, grupo, probar conexión
- Terms (en): connection, profile, database, host, password, environment, production, test connection
- Files: `app/src/lib/components/ConnectionForm.svelte`, `app/src/lib/components/ConnectionLanding.svelte`, `app/src/lib/components/ConnectionSwitcher.svelte`, `app/src/lib/components/ConnectionAvatar.svelte`, `app/src/lib/components/DriverPicker.svelte`, `app/src/lib/components/DriverLogo.svelte`, `app/src/lib/components/GroupPicker.svelte`, `app/src/lib/components/EnvironmentBadge.svelte`, `app/src/lib/connections/`, `app/src/lib/stores/connectionProfiles.ts`, `app/src/lib/stores/connection.ts`, `app/src/lib/connectionColors.ts`, `app/src/lib/connectionWindow.ts`, `app/src/lib/credentials.ts`, `app/src-tauri/src/commands/connection.rs`, `app/src-tauri/src/credentials.rs`
- Tests: `app/src-tauri/src/commands/connection.rs`, `app/src-tauri/src/credentials.rs`, `app/src/lib/connections/connectionErrors.test.ts`, `app/src/lib/connections/connectionIdentity.test.ts`, `app/src/lib/connections/connectionTest.test.ts`, `app/src/lib/connections/explorerTree.test.ts`, `app/src/lib/stores/connectionCatalog.test.ts`, `app/src/lib/stores/connectionProfiles.test.ts`
- Related: [`explorer-tree`](#explorer-tree), [`engine-registration`](#engine-registration), [`driver-core`](#driver-core)
- Docs: [docs/ARCHITECTURE.md#who-owns-each-piece-of-state](../../docs/ARCHITECTURE.md#who-owns-each-piece-of-state)

## console-files

SQL files and folders: open, save and watch .sql files, the file tree, the text of each console and encodings.

- Domain: `frontend`
- Terms (es): archivos SQL, carpetas, guardar consola, abrir archivo, codificación, árbol de archivos, texto de la consola
- Terms (en): SQL files, folders, save console, open file, encoding, file tree
- Files: `app/src/lib/components/FileTree.svelte`, `app/src/lib/components/EncodingPicker.svelte`, `app/src/lib/workspace/consoleFiles.ts`, `app/src/lib/sqlFiles.ts`, `app/src/lib/stores/queryConsoles.ts`, `app/src/lib/stores/sqlFolders.ts`, `app/src/lib/textEncoding.ts`, `app/src-tauri/src/services/sql_files.rs`, `app/src-tauri/src/services/console_texts.rs`, `app/src-tauri/src/commands/files.rs`, `app/src-tauri/src/text_encoding.rs`
- Tests: `app/src-tauri/src/services/console_texts.rs`, `app/src-tauri/src/services/sql_files.rs`, `app/src-tauri/src/text_encoding.rs`, `app/src/lib/stores/queryConsoles.test.ts`, `app/src/lib/workspace/consoleFiles.test.ts`
- Related: [`workspace-tiles`](#workspace-tiles)

## driver-core

The driver contract: the connector trait, sessions and consoles, query cancel, connection errors and result assembly shared by every driver.

- Domain: `driver-core`
- Terms (es): conector, driver, sesión, consola, cancelar consulta, error de conexión, ensamblado de resultados
- Terms (en): connector, driver, session, console, cancel query, connection error, result assembly
- Files: `crates/driver-core/src/`
- Tests: `crates/driver-core/src/assembly.rs`, `crates/driver-core/src/connection_error.rs`, `crates/driver-core/src/console.rs`, `crates/driver-core/src/lib.rs`, `crates/driver-core/src/message.rs`, `crates/driver-core/src/query_cancel.rs`, `crates/server-tests/tests/contract.rs`
- Related: [`driver-mysql`](#driver-mysql), [`driver-postgres`](#driver-postgres), [`engine-registration`](#engine-registration)
- Docs: [ENGINE_GUIDE.md](../../ENGINE_GUIDE.md)

## driver-mysql

The MySQL and MariaDB driver: connection, TLS, version detection and introspection.

- Domain: `driver-mysql`
- Terms (es): MySQL, MariaDB, TLS, versión del servidor, introspección, SSL
- Terms (en): MySQL, MariaDB, TLS, server version, introspection, SSL
- Files: `crates/drivers/mysql/src/`
- Tests: `crates/drivers/mysql/src/introspect.rs`, `crates/drivers/mysql/src/lib.rs`, `crates/drivers/mysql/src/tls.rs`, `crates/drivers/mysql/src/version.rs`, `crates/server-tests/tests/contract.rs`, `crates/server-tests/tests/version_lines.rs`
- Related: [`driver-core`](#driver-core), [`driver-postgres`](#driver-postgres)
- Docs: [ENGINE_GUIDE.md](../../ENGINE_GUIDE.md)

## driver-postgres

The PostgreSQL driver: connection, TLS, version detection, introspection and listing databases.

- Domain: `driver-postgres`
- Terms (es): PostgreSQL, Postgres, TLS, versión del servidor, introspección, bases accesibles
- Terms (en): PostgreSQL, Postgres, TLS, server version, introspection, accessible databases
- Files: `crates/drivers/postgres/src/`
- Tests: `crates/drivers/postgres/src/introspect.rs`, `crates/drivers/postgres/src/tls.rs`, `crates/drivers/postgres/src/version.rs`, `crates/server-tests/tests/contract.rs`, `crates/server-tests/tests/version_lines.rs`
- Related: [`driver-core`](#driver-core), [`driver-mysql`](#driver-mysql)
- Docs: [ENGINE_GUIDE.md](../../ENGINE_GUIDE.md)

## e2e-and-benchmarks

End-to-end tests of the real app, resource cycles and performance baselines.

- Domain: `tooling`
- Terms (es): pruebas E2E, recursos, fugas, rendimiento, línea base
- Terms (en): E2E, resources, leaks, performance, baseline, benchmark
- Files: `app/tests/e2e/`, `tools/bench/`
- Tests: `app/tests/e2e/resources.mjs`, `app/tests/e2e/run.mjs`
- Related: [`workspace-tiles`](#workspace-tiles), [`ci-release`](#ci-release)

## editor-completion

Autocompletion in the editor: catalog tables and columns, call hints, relations, tables created in the script and go-to-definition.

- Domain: `frontend`
- Terms (es): autocompletar, sugerencias, completado, columnas, tablas, pista de llamada, definición
- Terms (en): autocomplete, completion, suggestions, columns, call hints, go to definition
- Files: `app/src/lib/editor/catalogCompletions.ts`, `app/src/lib/editor/completionPolicy.ts`, `app/src/lib/editor/completionSource.ts`, `app/src/lib/editor/callHints.ts`, `app/src/lib/editor/relations.ts`, `app/src/lib/editor/createdTables.ts`, `app/src/lib/sqlDefinitionLink.ts`, `app/src/lib/usageStats.ts`
- Tests: `app/src/lib/editor/backslashHighlight.test.ts`, `app/src/lib/editor/callHints.test.ts`, `app/src/lib/editor/catalogCompletions.server.test.ts`, `app/src/lib/editor/catalogCompletions.test.ts`, `app/src/lib/editor/completionPolicy.test.ts`, `app/src/lib/editor/completionSource.test.ts`, `app/src/lib/editor/createdTables.test.ts`, `app/src/lib/editor/relations.test.ts`, `app/src/lib/editor/writing.test.ts`, `crates/server-tests/tests/generated.rs`
- Related: [`sql-editor`](#sql-editor), [`explorer-tree`](#explorer-tree)

## editor-formatting

Formatting SQL: the formatter, its line layout and the preview of generated SQL.

- Domain: `frontend`
- Terms (es): formatear, formato, embellecer, vista previa del SQL, saltos de línea
- Terms (en): format, formatter, pretty print, SQL preview, line breaks
- Files: `app/src/lib/editor/formatter.ts`, `app/src/lib/editor/formatLayout.ts`, `app/src/lib/sqlPreviewFormat.ts`
- Tests: `app/src/lib/editor/formatLayout.test.ts`, `app/src/lib/editor/formatter.test.ts`, `app/src/lib/sqlPreviewFormat.test.ts`
- Related: [`sql-editor`](#sql-editor)

## editor-search

Find and replace inside the editor.

- Domain: `frontend`
- Terms (es): buscar, reemplazar, barra de búsqueda, coincidencias
- Terms (en): find, replace, search bar, matches
- Files: `app/src/lib/editorSearch/`, `app/src/lib/editor/search.ts`
- Tests: `app/src/lib/editor/search.dom.test.ts`, `app/src/lib/editor/search.test.ts`
- Related: [`sql-editor`](#sql-editor)

## engine-core

The engine core: the public API of the SQL engine crate and the version-line data it reads.

- Domain: `engine`
- Terms (es): motor SQL, núcleo, líneas de versión, capacidades, khipu-engine
- Terms (en): SQL engine, core, version lines, capabilities, khipu-engine
- Files: `crates/engine/src/lib.rs`, `crates/engine/src/lines.rs`
- Tests: `crates/engine/src/lib.rs`, `crates/engine/tests/lines.rs`
- Related: [`engine-registration`](#engine-registration), [`sql-diagnostics`](#sql-diagnostics), [`version-lines`](#version-lines)
- Docs: [SQL_ENGINE.md](../../SQL_ENGINE.md)

## engine-registration

How an engine is registered and described: driver registry, frontend profile, dialect. The path to add an engine.

- Domain: `registry`
- Terms (es): motor, registrar motor, nuevo motor, perfil de motor, dialecto, MySQL, MariaDB, PostgreSQL, palabras reservadas
- Terms (en): engine, register engine, new engine, engine profile, dialect, MySQL, MariaDB, PostgreSQL, reserved words
- Files: `app/src-tauri/src/drivers.rs`, `app/src/lib/engines/`, `app/src/lib/connections.ts`, `crates/engine/src/dialects/`, `tools/engine/`, `ENGINE_GUIDE.md`
- Tests: `app/src-tauri/src/drivers.rs`, `app/src/lib/engines/contract.test.ts`, `crates/engine/src/dialects/mod.rs`
- Related: [`driver-core`](#driver-core), [`version-lines`](#version-lines), [`connection-profiles`](#connection-profiles)
- Docs: [ENGINE_GUIDE.md](../../ENGINE_GUIDE.md), [docs/ARCHITECTURE.md#where-engine-specific-code-may-live](../../docs/ARCHITECTURE.md#where-engine-specific-code-may-live)

## execution-guard

The guard that classifies a statement as destructive and asks for confirmation first; also covers SQL the app generates.

- Domain: `engine`
- Terms (es): sentencia destructiva, confirmación, producción, DELETE sin WHERE, guarda, modo seguro, confirmar
- Terms (en): destructive statement, confirmation, production, DELETE without WHERE, guard, safe mode
- Files: `crates/engine/src/execution_guard.rs`, `app/src/lib/components/ExecutionGuard.svelte`
- Tests: `app/tests/e2e/run.mjs`, `crates/engine/src/execution_guard.rs`, `crates/server-tests/tests/safety.rs`
- Related: [`statement-execution`](#statement-execution), [`results-editing`](#results-editing)
- Docs: [docs/ARCHITECTURE.md#how-sql-flows](../../docs/ARCHITECTURE.md#how-sql-flows)

## explorer-tree

The database explorer: schemas, tables and views, the visible-schemas picker, pinned tables and the table definition.

- Domain: `frontend`
- Terms (es): explorador, schemas, esquema, tablas, vistas, objetos, fijar, filtrar objetos, definición de tabla, selector de base
- Terms (en): explorer, schema picker, tables, views, pin, filter objects, table definition
- Files: `app/src/lib/components/SchemaTree.svelte`, `app/src/lib/components/TableDefinitionModal.svelte`, `app/src/lib/tableDefinition.ts`, `app/src/lib/treeKeys.ts`, `app/src/lib/stores/pinnedTables.ts`, `app/src/lib/stores/sidebarLayout.ts`, `app/src-tauri/src/commands/catalog.rs`, `app/src-tauri/src/services/catalog.rs`, `crates/engine/src/catalog.rs`
- Tests: `app/src-tauri/src/commands/catalog.rs`, `app/src-tauri/src/services/catalog.rs`, `app/src/lib/stores/pinnedTables.test.ts`, `app/src/lib/stores/sidebarLayout.test.ts`, `app/src/lib/treeKeys.dom.test.ts`, `crates/engine/src/catalog.rs`
- Related: [`connection-profiles`](#connection-profiles), [`editor-completion`](#editor-completion), [`driver-core`](#driver-core)

## i18n

Interface languages: the message catalogs by area, the locale, and the translation of backend error keys.

- Domain: `frontend`
- Terms (es): idioma, traducción, mensajes, textos, internacionalización, locales
- Terms (en): language, translation, messages, strings, i18n, locale
- Files: `app/src/lib/i18n/`
- Tests: `app/src/lib/i18n/backendKeys.test.ts`, `app/src/lib/i18n/i18n.test.ts`
- Related: [`settings-theming`](#settings-theming)

## keyboard-shortcuts

Keyboard first: shortcuts, the shortcut sheet, focus zones, numpad keys, dialog keys and the vim mode foundations.

- Domain: `frontend`
- Terms (es): atajos, teclado, vim, foco, zona, hoja de atajos, teclas
- Terms (en): shortcuts, keyboard, vim mode, focus, focus zones, shortcut sheet, keys
- Files: `app/src/lib/keybindings.ts`, `app/src/lib/stores/shortcuts.ts`, `app/src/lib/components/ShortcutSheet.svelte`, `app/src/lib/focusZones.ts`, `app/src/lib/numpadKeys.ts`, `app/src/lib/workspace/commands.ts`, `app/src/lib/dialogKeys.ts`
- Tests: `app/src/lib/dialogKeys.test.ts`, `app/src/lib/focusZones.keys.test.ts`, `app/src/lib/focusZones.test.ts`, `app/src/lib/numpadKeys.test.ts`, `app/src/lib/workspace/commands.test.ts`
- Related: [`workspace-tiles`](#workspace-tiles), [`ui-components`](#ui-components)
- Docs: [docs/specs/atajos-de-teclado.md](../../docs/specs/atajos-de-teclado.md)

## language-server

The engine language server, a stub for now: it answers initialize and shutdown only.

- Domain: `lsp`
- Terms (es): servidor de lenguaje, LSP
- Terms (en): language server, LSP, stub
- Files: `crates/engine-lsp/src/`
- Tests: none (stub with no capabilities; nothing to test yet)
- Related: [`sql-diagnostics`](#sql-diagnostics)
- Docs: [docs/ARCHITECTURE.md#khipu-lsp](../../docs/ARCHITECTURE.md#khipu-lsp)

## query-history

History of executed queries: the panel, search and reuse.

- Domain: `frontend`
- Terms (es): historial, consultas anteriores, Ctrl+H, reutilizar consulta
- Terms (en): history, previous queries, query history, reuse query
- Files: `app/src/lib/components/QueryHistory.svelte`, `app/src/lib/stores/queryHistory.ts`
- Tests: `app/src/lib/stores/queryHistory.test.ts`
- Related: [`statement-execution`](#statement-execution)

## query-parameters

Parameters in a query (named and positional): the dialog, type hints and remembered values.

- Domain: `frontend`
- Terms (es): parámetros, variables, marcador, valores, :nombre, diálogo de parámetros
- Terms (en): parameters, bind variables, placeholders, values, parameters dialog
- Files: `app/src/lib/components/ParametersDialog.svelte`, `app/src/lib/workspace/parameters.ts`, `app/src/lib/sqlParameterHints.ts`, `app/src/lib/editor/parameterTypes.ts`, `app/src/lib/stores/queryParameters.ts`
- Tests: `app/src/lib/editor/parameterTypes.test.ts`, `app/src/lib/stores/queryParameters.test.ts`, `app/src/lib/workspace/parameters.edge.test.ts`, `app/src/lib/workspace/parameters.test.ts`
- Related: [`statement-execution`](#statement-execution)

## real-server-tests

Tests against real servers: the harness, the disposable MySQL, MariaDB and PostgreSQL containers and the SQL corpus.

- Domain: `server-tests`
- Terms (es): pruebas con servidor real, contrato, Sakila, Pagila, corpus SQL, matriz de pruebas
- Terms (en): real-server tests, contract, Sakila, Pagila, SQL corpus, test matrix
- Files: `crates/server-tests/`, `tools/test-dbs/`, `tests/sql/`
- Tests: `crates/server-tests/src/lib.rs`, `crates/server-tests/tests/analysis.rs`, `crates/server-tests/tests/contract.rs`, `crates/server-tests/tests/filters.rs`, `crates/server-tests/tests/generated.rs`, `crates/server-tests/tests/safety.rs`, `crates/server-tests/tests/version_lines.rs`
- Related: [`version-lines`](#version-lines), [`driver-core`](#driver-core)
- Docs: [SQL_ENGINE.md](../../SQL_ENGINE.md)

## repo-tooling

Repository tooling: the architecture model and graph, the test inventory, status generation and the orientation tools.

- Domain: `tooling`
- Terms (es): arquitectura, modelo, inventario de pruebas, herramientas, grafo, orientación, agentes
- Terms (en): architecture, model, test inventory, tooling, graph, orientation, agents
- Files: `tools/architecture/`, `tools/inventory/`, `tools/orient/`, `tests/inventory.json`, `tests/orient/`, `AGENTS.md`
- Tests: `tools/orient/eval.test.mjs`
- Related: [`ci-release`](#ci-release)
- Docs: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)

## result-tabs

Result tabs and the output log: one tab per result, pinned results and the status of each run.

- Domain: `frontend`
- Terms (es): pestaña de resultado, resultado fijado, salida, registro, varios resultados
- Terms (en): result tab, pinned result, output, log, multiple results
- Files: `app/src/lib/components/results/ResultPane.svelte`, `app/src/lib/components/results/OutputLog.svelte`, `app/src/lib/workspace/resultTabs.ts`, `app/src/lib/stores/pinnedResults.ts`
- Tests: `app/src/lib/stores/pinnedResults.test.ts`, `app/src/lib/workspace/resultTabs.test.ts`
- Related: [`workspace-tiles`](#workspace-tiles), [`results-grid`](#results-grid), [`statement-execution`](#statement-execution)
- Docs: [docs/ARCHITECTURE.md#tiled-tab-groups-consoles-and-results](../../docs/ARCHITECTURE.md#tiled-tab-groups-consoles-and-results)

## results-editing

Editing data from the grid: changing cells, NULL and DEFAULT, inserting and deleting rows, the preview and applying changes.

- Domain: `frontend`
- Terms (es): editar celdas, vista de registro, formulario vertical, insertar fila, NULL, DEFAULT, aplicar cambios, vista previa de cambios, eliminar fila, guardar cambios
- Terms (en): edit cells, insert row, delete row, NULL, DEFAULT, record view, vertical form, apply changes, changes preview
- Files: `app/src/lib/components/results/ChangesPreview.svelte`, `app/src/lib/components/results/RecordView.svelte`, `app/src/lib/results/recordView.ts`, `app/src/lib/stores/recordView.ts`, `app/src/lib/results/resultEditing.ts`, `app/src/lib/workspace/resultChanges.ts`, `app/src/lib/stores/resultEdits.ts`, `app/src-tauri/src/services/result_editing.rs`, `crates/engine/src/editing.rs`
- Tests: `app/src-tauri/src/services/result_editing.rs`, `app/src/lib/results/recordView.test.ts`, `app/src/lib/results/resultEditing.test.ts`, `app/src/lib/stores/resultEdits.test.ts`, `app/src/lib/workspace/resultChanges.test.ts`, `crates/engine/src/editing.rs`
- Related: [`results-grid`](#results-grid), [`execution-guard`](#execution-guard)

## results-export-copy

Getting data out: export dialog, copy as, clipboard and the output copy.

- Domain: `frontend`
- Terms (es): exportar, CSV, copiar, portapapeles, copiar como, formato de copia
- Terms (en): export, CSV, copy, clipboard, copy as, copy format
- Files: `app/src/lib/components/results/ExportDialog.svelte`, `app/src-tauri/src/services/export.rs`, `app/src/lib/clipboard.ts`, `app/src/lib/results/gridClipboard.ts`, `app/src/lib/results/outputCopy.ts`, `app/src/lib/stores/copyFormat.ts`
- Tests: `app/src-tauri/src/services/export.rs`, `app/src/lib/results/gridClipboard.test.ts`, `app/src/lib/results/outputCopy.test.ts`
- Related: [`results-grid`](#results-grid)

## results-filter-sort

Filtering and sorting results: the filter builder, per-column filters and sort keys, run on the server.

- Domain: `frontend`
- Terms (es): filtrar, ordenar, filtro de columna, WHERE, ORDER BY, valores de la columna
- Terms (en): filter, sort, column filter, WHERE, ORDER BY, column values
- Files: `app/src/lib/components/results/TableFilters.svelte`, `app/src/lib/components/results/ColumnFilterPopover.svelte`, `app/src/lib/results/filterBuilder.ts`, `app/src/lib/results/columnFilters.ts`, `app/src/lib/results/gridSort.ts`, `app/src/lib/workspace/tableQueries.ts`
- Tests: `app/src/lib/results/columnFilters.test.ts`, `app/src/lib/results/filterBuilder.test.ts`, `app/src/lib/results/gridSort.test.ts`, `app/src/lib/workspace/tableQueries.test.ts`
- Related: [`results-grid`](#results-grid), [`results-paging`](#results-paging)

## results-grid

The results grid: virtual scrolling, cell navigation and selection, drag-select autoscroll, find in results, JSON cells and grid settings.

- Domain: `frontend`
- Terms (es): grilla, rejilla, celdas, selección, scroll, JSON, buscar en resultados, columnas, filas
- Terms (en): grid, cells, selection, virtual scrolling, autoscroll, find in results, rows
- Files: `app/src/lib/components/results/DataGrid.svelte`, `app/src/lib/components/results/FindBar.svelte`, `app/src/lib/components/results/ToolbarButton.svelte`, `app/src/lib/results/cellTypes.ts`, `app/src/lib/results/gridAutoScroll.ts`, `app/src/lib/results/gridFind.ts`, `app/src/lib/results/gridNavigation.ts`, `app/src/lib/results/gridSelectionSummary.ts`, `app/src/lib/results/gridWindow.ts`, `app/src/lib/results/jsonHighlight.ts`, `app/src/lib/stores/gridSettings.ts`
- Tests: `app/src/lib/results/cellTypes.test.ts`, `app/src/lib/results/gridAutoScroll.test.ts`, `app/src/lib/results/gridFind.test.ts`, `app/src/lib/results/gridNavigation.test.ts`, `app/src/lib/results/gridSelectionSummary.test.ts`, `app/src/lib/results/gridWindow.test.ts`, `app/src/lib/results/jsonHighlight.test.ts`, `app/src/lib/stores/gridSettings.test.ts`
- Related: [`results-editing`](#results-editing), [`results-filter-sort`](#results-filter-sort), [`results-export-copy`](#results-export-copy), [`result-tabs`](#result-tabs)

## results-paging

Paging and counting rows: the pager, page size, total count and the pagination the engine writes.

- Domain: `engine`
- Terms (es): paginación, página, total de filas, contar, límite, tamaño de página
- Terms (en): pagination, page, page size, row count, total rows, limit
- Files: `app/src/lib/components/results/ResultPager.svelte`, `app/src/lib/stores/resultPaging.ts`, `crates/engine/src/pagination.rs`, `app/src-tauri/src/commands/results.rs`
- Tests: `app/src-tauri/src/commands/results.rs`, `crates/engine/src/pagination.rs`, `crates/server-tests/tests/filters.rs`
- Related: [`results-filter-sort`](#results-filter-sort), [`execution-guard`](#execution-guard)

## settings-theming

The settings panel, colour palettes and themes, icon optics and motion.

- Domain: `frontend`
- Terms (es): ajustes, configuración, tema, oscuro, claro, paleta, animaciones, movimiento
- Terms (en): settings, preferences, theme, dark, light, palette, motion, animations
- Files: `app/src/lib/components/SettingsPanel.svelte`, `app/src/lib/theming/`, `app/src/lib/iconOptics.ts`, `app/src/lib/motion.ts`, `app/src/lib/onePerFrame.ts`, `app/src/lib/styles/`
- Tests: `app/src/lib/motion.dom.test.ts`, `app/src/lib/onePerFrame.test.ts`, `app/src/lib/theming/codemirrorTheme.test.ts`, `app/src/lib/theming/palettes.test.ts`
- Related: [`ui-components`](#ui-components), [`i18n`](#i18n)

## sql-diagnostics

Static analysis of SQL while typing: parser, diagnostics, error positions, popup and error help. Informs; never gates execution.

- Domain: `engine`
- Terms (es): diagnósticos, errores, advertencias, análisis, parser, subrayado, ayuda del error
- Terms (en): diagnostics, errors, warnings, analysis, parser, squiggles, error help
- Files: `app/src/lib/editor/analysisRunner.ts`, `app/src/lib/editor/analysisSession.ts`, `app/src/lib/editor/diagnostics.ts`, `app/src/lib/editor/diagnosticPresentation.ts`, `app/src/lib/editor/errorHelp.ts`, `app/src/lib/components/DiagnosticPopup.svelte`, `crates/engine/src/parser.rs`, `crates/engine/src/diagnostics.rs`, `crates/engine/src/error_position.rs`
- Tests: `app/src/lib/editor/analysisRunner.test.ts`, `app/src/lib/editor/analysisSession.test.ts`, `app/src/lib/editor/diagnosticPresentation.dom.test.ts`, `app/src/lib/editor/diagnostics.dom.test.ts`, `app/src/lib/editor/diagnostics.test.ts`, `app/src/lib/editor/errorHelp.test.ts`, `crates/engine/src/diagnostics.rs`, `crates/engine/src/error_position.rs`, `crates/engine/src/parser.rs`, `crates/engine/tests/corpus.rs`, `crates/server-tests/tests/analysis.rs`
- Related: [`sql-editor`](#sql-editor), [`execution-guard`](#execution-guard)
- Docs: [docs/ARCHITECTURE.md#how-sql-flows](../../docs/ARCHITECTURE.md#how-sql-flows)

## sql-editor

The SQL editor itself: CodeMirror setup, comments, indentation, highlighting, paste and editor settings.

- Domain: `frontend`
- Terms (es): editor, consola SQL, código, comentarios, sangría, resaltado, pegar, configuración del editor
- Terms (en): editor, SQL console, comments, indentation, syntax highlighting, paste, editor settings
- Files: `app/src/lib/SqlEditor.svelte`, `app/src/lib/editor/behavior.ts`, `app/src/lib/editor/commands.ts`, `app/src/lib/editor/commentEditing.ts`, `app/src/lib/editor/commentHighlight.ts`, `app/src/lib/editor/commentStyle.ts`, `app/src/lib/editor/configuration.ts`, `app/src/lib/editor/context.ts`, `app/src/lib/editor/highlight.ts`, `app/src/lib/editor/indentation.ts`, `app/src/lib/editor/paste.ts`, `app/src/lib/sqlComments.ts`, `app/src/lib/sqlIndentationConfig.ts`, `app/src/lib/sqlEditorIcons.css`, `app/src/lib/stores/editorSettings.ts`
- Tests: `app/src/lib/editor/behavior.test.ts`, `app/src/lib/editor/commands.dom.test.ts`, `app/src/lib/editor/commentEditing.dom.test.ts`, `app/src/lib/editor/commentHighlight.test.ts`, `app/src/lib/editor/commentStyle.dom.test.ts`, `app/src/lib/editor/configuration.dom.test.ts`, `app/src/lib/editor/context.test.ts`, `app/src/lib/editor/highlight.test.ts`, `app/src/lib/editor/indentation.dom.test.ts`, `app/src/lib/editor/paste.dom.test.ts`, `app/src/lib/sqlComments.test.ts`
- Related: [`editor-completion`](#editor-completion), [`sql-diagnostics`](#sql-diagnostics), [`editor-formatting`](#editor-formatting), [`editor-search`](#editor-search), [`statement-execution`](#statement-execution)

## statement-execution

Running SQL: splitting statements, executing the selection or the statement under the cursor, cancelling and the execution log.

- Domain: `frontend`
- Terms (es): ejecutar, Ctrl+Enter, sentencia, consulta, cancelar, registro de ejecución, dividir sentencias
- Terms (en): run, execute, statement, query, cancel, execution log, split statements
- Files: `app/src/lib/workspace/executionSession.ts`, `app/src/lib/queryExecution.ts`, `app/src/lib/sqlStatements.ts`, `app/src/lib/editor/executionMarker.ts`, `app/src/lib/editor/statementIndex.ts`, `app/src/lib/stores/executionLog.ts`, `app/src-tauri/src/commands/query.rs`, `crates/driver-core/src/query_cancel.rs`
- Tests: `app/src-tauri/src/commands/query.rs`, `app/src/lib/editor/blankLines.test.ts`, `app/src/lib/editor/executionMarker.test.ts`, `app/src/lib/editor/largeDocuments.test.ts`, `app/src/lib/editor/statementIndex.test.ts`, `app/src/lib/sqlMixedCorpus.test.ts`, `app/src/lib/sqlStatements.test.ts`, `app/src/lib/workspace/executionSession.test.ts`, `app/tests/e2e/run.mjs`, `crates/driver-core/src/query_cancel.rs`
- Related: [`execution-guard`](#execution-guard), [`query-parameters`](#query-parameters), [`result-tabs`](#result-tabs), [`sql-editor`](#sql-editor)
- Docs: [docs/ARCHITECTURE.md#how-sql-flows](../../docs/ARCHITECTURE.md#how-sql-flows)

## support-packs

Version support packs: downloading and verifying updated engine version lines.

- Domain: `backend`
- Terms (es): paquetes de soporte, versiones soportadas, ventana de soporte, paquete de versiones
- Terms (en): support packages, supported versions, support window, version packs
- Files: `app/src/lib/stores/supportPackages.ts`, `app/src-tauri/src/support.rs`, `tools/support/`
- Tests: `app/src-tauri/src/support.rs`
- Related: [`version-lines`](#version-lines), [`updates`](#updates)
- Docs: [SQL_ENGINE.md](../../SQL_ENGINE.md)

## terminal

The integrated terminal: bottom-panel sessions on a PTY, flow control, and a client session already connected to the active database.

- Domain: `frontend`
- Terms (es): terminal, shell, psql, mysql, consola integrada, sesión conectada, PTY
- Terms (en): terminal, shell, psql, mysql, integrated terminal, connected session, PTY
- Files: `app/src/lib/components/Terminal.svelte`, `app/src/lib/components/TerminalSession.svelte`, `app/src/lib/terminal.ts`, `app/src-tauri/src/terminal.rs`
- Tests: `app/src-tauri/src/terminal.rs`, `app/src/lib/terminal.test.ts`
- Related: [`workspace-tiles`](#workspace-tiles), [`connection-profiles`](#connection-profiles)
- Docs: [docs/ARCHITECTURE.md#integrated-terminal](../../docs/ARCHITECTURE.md#integrated-terminal)

## ui-components

Shared UI pieces: buttons, checkboxes, selects, fields, context menus, dialogs, tooltips and notifications. One piece per control.

- Domain: `frontend`
- Terms (es): botón, casilla, selector, campo, menú contextual, tooltip, diálogo, notificación, confirmar diálogo
- Terms (en): button, checkbox, select, field, context menu, dialog, tooltip, notification, toast
- Files: `app/src/lib/components/Button.svelte`, `app/src/lib/components/Checkbox.svelte`, `app/src/lib/components/ColorPicker.svelte`, `app/src/lib/components/ConfirmDialog.svelte`, `app/src/lib/components/ContextMenu.svelte`, `app/src/lib/components/Field.svelte`, `app/src/lib/components/NumberStepper.svelte`, `app/src/lib/components/RowlyMark.svelte`, `app/src/lib/components/Select.svelte`, `app/src/lib/contextMenu.ts`, `app/src/lib/dialogMotion.ts`, `app/src/lib/tooltip.ts`, `app/src/lib/stores/notifications.ts`
- Tests: `app/src/lib/dialogMotion.test.ts`
- Related: [`settings-theming`](#settings-theming), [`keyboard-shortcuts`](#keyboard-shortcuts)

## updates

Updates and release highlights: the new-version prompt, the updates section, the signed download and the optional release highlight.

- Domain: `frontend`
- Terms (es): actualización, nueva versión, destacado, release, instalar actualización, versión disponible
- Terms (en): update, new version, release highlight, install update, version available
- Files: `app/src/lib/components/UpdatePrompt.svelte`, `app/src/lib/components/UpdatesSection.svelte`, `app/src/lib/stores/updates.ts`, `app/src-tauri/src/updates.rs`, `app/src-tauri/src/release_highlight.rs`
- Tests: `app/src-tauri/src/release_highlight.rs`, `app/src-tauri/src/updates.rs`, `app/src/lib/stores/updates.test.ts`, `app/src/lib/stores/updatesCache.test.ts`, `app/src/lib/stores/updatesInstall.test.ts`, `app/src/lib/stores/updatesPrompt.test.ts`
- Related: [`support-packs`](#support-packs), [`ci-release`](#ci-release)

## version-lines

Version lines: which server releases are verified, their capabilities and the support data the app reads.

- Domain: `line-data`
- Terms (es): línea de versión, versiones verificadas, soporte, capacidades, ventana de soporte
- Terms (en): version line, verified releases, support, capabilities, support window
- Files: `support/`, `tools/test-dbs/lines.json`, `tests/engines/`
- Tests: `crates/engine/tests/lines.rs`, `crates/server-tests/tests/version_lines.rs`
- Related: [`engine-core`](#engine-core), [`support-packs`](#support-packs), [`real-server-tests`](#real-server-tests)
- Docs: [SQL_ENGINE.md](../../SQL_ENGINE.md)

## website

The public website and its community pages, with the screenshots taken from the real app.

- Terms (es): sitio web, web, landing, comunidad, capturas, SEO
- Terms (en): website, site, landing page, community, screenshots, SEO
- Files: `site/`, `tools/site-shots/`, `.github/scripts/`
- Tests: none (checked by .github/scripts/check-site.py in CI, not by an inventoried test)
- Related: [`ci-release`](#ci-release)
- Docs: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## workspace-tiles

The workspace: console tabs, tiled groups, drag to reorder and split, tab outline and the Workspace component that wires them.

- Domain: `frontend`
- Terms (es): mosaico, pestañas, consola, grupos, arrastrar, reordenar, dividir, área de trabajo, ventana
- Terms (en): tiles, tabs, groups, drag, reorder, split, workspace, mosaic
- Files: `app/src/lib/components/Workspace.svelte`, `app/src/lib/components/MosaicArea.svelte`, `app/src/lib/components/TilePicker.svelte`, `app/src/lib/components/TabOutline.svelte`, `app/src/lib/workspace/mosaic.ts`, `app/src/lib/workspace/tabGroups.ts`, `app/src/lib/workspace/tabCommands.ts`, `app/src/lib/stores/consoleMosaic.ts`, `app/src/lib/reorder.ts`, `app/src/lib/dragGhost.ts`, `app/src/lib/tabScroll.ts`, `app/src/lib/sessionMount.ts`, `app/src/lib/settleTransitions.ts`
- Tests: `app/src/lib/dragGhost.dom.test.ts`, `app/src/lib/reorder.dom.test.ts`, `app/src/lib/sessionMount.dom.test.ts`, `app/src/lib/tabScroll.dom.test.ts`, `app/src/lib/workspace/consoleLifecycle.test.ts`, `app/src/lib/workspace/mosaic.test.ts`, `app/src/lib/workspace/tabCommands.test.ts`, `app/src/lib/workspace/tabGroups.test.ts`, `app/tests/e2e/run.mjs`
- Related: [`result-tabs`](#result-tabs), [`terminal`](#terminal), [`console-files`](#console-files)
- Docs: [docs/ARCHITECTURE.md#tiled-tab-groups-consoles-and-results](../../docs/ARCHITECTURE.md#tiled-tab-groups-consoles-and-results)

<!-- /generated -->
