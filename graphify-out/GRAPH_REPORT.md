# Graph Report - khipu  (2026-09-26)

## Corpus Check
- 184 files · ~172,123 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .css 6, .icns 1)

## Summary
- 1871 nodes · 3875 edges · 95 communities (82 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2633c54d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- resultEdits.ts
- postgres/src/lib.rs
- src-tauri/src/lib.rs
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- theme.ts
- iconOptics.ts
- tauri.conf.json
- sqlFiles.ts
- sqlDefinitionLink.ts
- types.ts
- KhipuLanguageServer
- pagination.rs
- connection.ts
- package.json
- dependencies
- i18n/index.ts
- svelte
- compilerOptions
- drivers.rs
- mysql/src/tls.rs
- devDependencies
- credentials.rs
- scripts
- default.json
- khipu-desktop
- mysql/src/introspect.rs
- sql_path
- super
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- editorSearchPanel.ts
- jsonHighlight.ts
- gridFind.ts
- ResultPager.svelte
- TlsMode
- resultEditing.ts
- postgres/src/tls.rs
- messages/index.ts
- Borrador: copiado de resultados de consulta
- postgres/src/introspect.rs
- editing.rs
- updates.rs
- sqlContext.ts
- Dialect
- result_editing.rs
- sidebarLayout.ts
- sqlExecutionMarker.ts
- gridClipboard.ts
- sql_files.rs
- FileTree.svelte
- DriverError
- sqlCompletionPolicy.ts
- SqlEditor.svelte
- editorSettings.ts
- sqlFormatter.ts
- ref_app
- connectionTest.ts
- sqlEditorBehavior.ts
- svelte
- reorder.ts
- +layout.svelte
- stores/shortcuts.ts
- ConnectionForm.svelte
- credentials.ts
- Workspace.svelte
- sqlFolders.ts
- sqlSchema.test.ts
- sqlPreviewFormat.ts
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- codemirrorTheme.ts
- copyFormat.ts
- parser.rs
- vitest
- 7. Entorno de la conexión — 🧪
- StatusGutterMarker
- openSqlFileConsole
- query_error

## God Nodes (most connected - your core abstractions)
1. `DriverError` - 50 edges
2. `Dialect` - 36 edges
3. `svelte` - 28 edges
4. `vitest` - 27 edges
5. `v0.2.0 — Pulido de la experiencia` - 22 edges
6. `TableInfo` - 20 edges
7. `createSearchPanel()` - 19 edges
8. `AppState` - 18 edges
9. `translate` - 18 edges
10. `DbConnector` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Flujo de datos` --references--> `buildExplorerTree()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/explorerTree.ts
- `Flujo de datos` --references--> `connect()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/stores/connection.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts
- `Mapa del código` --references--> `isTlsMode()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connectionProfiles.ts
- `Mapa del código` --references--> `parseProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connectionProfiles.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (95 total, 13 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (64): async_trait, QueryExecutionOptions, config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+56 more)

### Community 2 - "resultEdits.ts"
Cohesion: 0.19
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.07
Nodes (52): config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql(), execute_query_returns_result_set_with_null_and_types() (+44 more)

### Community 4 - "src-tauri/src/lib.rs"
Cohesion: 0.09
Nodes (61): ActiveConnection, apply_result_changes(), AppState, connect(), count_query_rows(), create_sql_file(), database_explorer(), DatabaseExplorer (+53 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.13
Nodes (22): buildCompletionSource(), buildKeywordCompletion(), buildMultiTableCompletionSource(), currentStatement(), dialectCache, extractFromContext(), extractFromTables(), filterSchemaResult() (+14 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.08
Nodes (36): CheckInfo, ColumnInfo, ConnectionConfig, DbConnector, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo (+28 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.10
Nodes (30): #each(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle(), createQueryConsole() (+22 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.07
Nodes (41): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+33 more)

### Community 9 - "theme.ts"
Cohesion: 0.08
Nodes (35): ColorScheme, EditorPalette, palettes, resolveScheme(), ShellPalette, contrast(), DARK_BEFORE, FAMILIES (+27 more)

### Community 10 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlFiles.ts"
Cohesion: 0.13
Nodes (23): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+15 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "types.ts"
Cohesion: 0.09
Nodes (23): nextSort(), PageRequest, PendingQueryConfirmation, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, DestructiveStatement, ExecuteQueryResponse (+15 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 17 - "connection.ts"
Cohesion: 0.12
Nodes (23): indexOf(), getDriver(), loadConnectionPassword(), activeProfile, catalogTables, completeConnection(), connection, ConnectionState (+15 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (19): description, license, name, type, version, config, codemirror, @codemirror/commands (+11 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "i18n/index.ts"
Cohesion: 0.20
Nodes (15): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, translator(), FALLBACK_LOCALE, isLocale() (+7 more)

### Community 21 - "svelte"
Cohesion: 0.10
Nodes (10): Icon, icons, onMove(), onUp(), format(), submit, shortcutText(), $t() (+2 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (19): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, Option (+11 more)

### Community 24 - "mysql/src/tls.rs"
Cohesion: 0.13
Nodes (19): apply(), connection_error(), io_error(), is_tls_failure(), read_status(), Error, ErrorKind, MySqlPool (+11 more)

### Community 25 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli, typescript (+2 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "mysql/src/introspect.rs"
Cohesion: 0.15
Nodes (31): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+23 more)

### Community 32 - "super"
Cohesion: 0.08
Nodes (42): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, crate, drops_rows_for_unknown_relations() (+34 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.17
Nodes (15): CONNECTION_ENVIRONMENTS, ConnectionEnvironment, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy(), isTlsMode(), loadProfiles() (+7 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.13
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.15
Nodes (22): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), ExportFormat, FileSink, is_json(), is_numeric() (+14 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.07
Nodes (33): addExclusion, clearExclusions, createSearchPanel(), applyTexts(), buildQuery(), commit(), excludeCurrent(), refreshStatus() (+25 more)

### Community 45 - "jsonHighlight.ts"
Cohesion: 0.28
Nodes (9): detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS, highlightSql() (+1 more)

### Community 46 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "TlsMode"
Cohesion: 0.17
Nodes (11): ConnectionConfig, TlsMode, TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema` (+3 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.13
Nodes (19): for(), addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditableColumn, EditTarget (+11 more)

### Community 50 - "postgres/src/tls.rs"
Cohesion: 0.15
Nodes (16): apply(), certificate_errors_are_labelled(), connection_error(), io_error(), is_tls_failure(), read_status(), Error, ErrorKind (+8 more)

### Community 51 - "messages/index.ts"
Cohesion: 0.11
Nodes (20): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), schemaNode() (+12 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "postgres/src/introspect.rs"
Cohesion: 0.12
Nodes (22): balanced(), check_expression(), COLUMNS_SQL, CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow, FOREIGN_KEYS_SQL, indexes_sql(), introspect_schema() (+14 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (32): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+24 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "sqlContext.ts"
Cohesion: 0.18
Nodes (13): classifyContext(), classifyFrame(), CLAUSE_KEYWORDS, ClauseKind, FrameState, JOIN_MODIFIERS, lex(), Lexical (+5 more)

### Community 57 - "Dialect"
Cohesion: 0.14
Nodes (22): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_selection() (+14 more)

### Community 58 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.18
Nodes (17): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, setFilePanelHeight() (+9 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.17
Nodes (10): executionMarker, executionMarkerField, ExecutionMarkerStatus, executionTimeDecorations(), ExecutionTimeWidget, formatExecutionTime(), markerFromResult(), setExecutionMarker (+2 more)

### Community 61 - "gridClipboard.ts"
Cohesion: 0.14
Nodes (22): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+14 more)

### Community 62 - "sql_files.rs"
Cohesion: 0.28
Nodes (16): absolute_dir(), create(), is_sql_file_name(), list_dir(), read(), rename(), PathBuf, Result (+8 more)

### Community 63 - "FileTree.svelte"
Cohesion: 0.21
Nodes (9): active, fileMenuItems(), requestTrash(), startRename(), dismissNotice(), notice, notifyError(), notifySuccess() (+1 more)

### Community 64 - "DriverError"
Cohesion: 0.34
Nodes (17): DriverError, constraint_column_row(), decode_trigger_type(), fetch(), foreign_key_row(), get(), index_rows(), map_rows() (+9 more)

### Community 65 - "sqlCompletionPolicy.ts"
Cohesion: 0.22
Nodes (10): COMMON_STARTERS, completionPolicy, MYSQL_STARTERS, NO_BOOST(), POSTGRES_STARTERS, RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords() (+2 more)

### Community 66 - "SqlEditor.svelte"
Cohesion: 0.16
Nodes (4): ContextMenuItem, app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch, state

### Community 67 - "editorSettings.ts"
Cohesion: 0.24
Nodes (8): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), setFormatterLineWidth()

### Community 68 - "sqlFormatter.ts"
Cohesion: 0.23
Nodes (10): CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), formatSqlBlock(), indentation(), isClause(), Quote, scanFormattedSql() (+2 more)

### Community 69 - "ref_app"
Cohesion: 0.25
Nodes (7): applyForwardJoin(), applyReverseJoin(), buildJoinCompletionSource(), boostFor(), recordUsage(), usage, ref_app

### Community 70 - "connectionTest.ts"
Cohesion: 0.26
Nodes (10): colorLabel(), describeTls(), summarizeError(), summarizeReport(), summaryText(), encrypted, TestOutcome, TestSummary (+2 more)

### Community 71 - "sqlEditorBehavior.ts"
Cohesion: 0.24
Nodes (9): activeStatementHighlight, autoUppercaseSqlKeywords, findStatement(), statementDecorations(), editFor(), uppercaseKeywordEdit, @codemirror/lang-sql, @codemirror/language (+1 more)

### Community 72 - "svelte"
Cohesion: 0.20
Nodes (12): tabExists(), addPinnedTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+4 more)

### Community 73 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 74 - "+layout.svelte"
Cohesion: 0.12
Nodes (14): installDialogMotion(), initLocaleEffects(), pickSqlFolder(), reset(), setSqlFolder(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+6 more)

### Community 75 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (11): handleRecordKeydown(), eventMatchesShortcut(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions (+3 more)

### Community 76 - "ConnectionForm.svelte"
Cohesion: 0.12
Nodes (9): neutral, tinted, option(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, BackendKind, connectionDrivers, DriverDefinition (+1 more)

### Community 77 - "credentials.ts"
Cohesion: 0.18
Nodes (6): ConnectionDriver, forgetConnectionPassword(), PasswordPolicy, runtimePasswords, ConnectionProfile, @tauri-apps/api

### Community 78 - "Workspace.svelte"
Cohesion: 0.15
Nodes (6): labelForKey(), onKeydown(), $t(), executionLog, LogEntry, LogKind

### Community 79 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (12): folderMenuItems(), startCreate(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT (+4 more)

### Community 80 - "sqlSchema.test.ts"
Cohesion: 0.20
Nodes (10): applyAndRecord(), buildFkIndex(), buildSqlSchema(), extractDefaultTable(), CATALOG, complete(), ORDERS, USERS (+2 more)

### Community 81 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.07
Nodes (28): 10. Cancelar una consulta larga — ⏳, 11. Scripts de varias sentencias — ⏳, 12. Mensajes del backend traducibles — ⏳, 13. Modelo de foco por teclado — 🔄, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado (+20 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.19
Nodes (12): close(), hide(), place(), prettyShortcut(), resolve(), Resolved, show(), tooltip() (+4 more)

### Community 84 - "codemirrorTheme.ts"
Cohesion: 0.20
Nodes (7): BUILTIN_FUNCTIONS, builtinCallMark, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight, wordOperatorMark, @lezer/highlight

### Community 85 - "copyFormat.ts"
Cohesion: 0.40
Nodes (4): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS

### Community 86 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 87 - "vitest"
Cohesion: 0.43
Nodes (4): initials(), luminance(), readableTextColor(), vitest

### Community 88 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.33
Nodes (6): connect(), Flujo de datos, 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 90 - "openSqlFileConsole"
Cohesion: 0.67
Nodes (4): activateQueryConsole(), createId(), openSqlFileConsole(), openTableConsole()

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **346 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+341 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 656 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `svelte` connect `svelte` to `resultEdits.ts`, `queryConsoles.ts`, `theme.ts`, `iconOptics.ts`, `sqlFiles.ts`, `connection.ts`, `package.json`, `i18n/index.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `ResultPager.svelte`, `sidebarLayout.ts`, `FileTree.svelte`, `editorSettings.ts`, `ref_app`, `reorder.ts`, `stores/shortcuts.ts`, `Workspace.svelte`, `sqlFolders.ts`, `tooltip.ts`, `copyFormat.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `TlsMode` to `7. Entorno de la conexión — 🧪`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _346 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._
- **Should `mysql/src/lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05981012658227848 - nodes in this community are weakly interconnected._