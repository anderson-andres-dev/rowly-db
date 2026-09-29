# Graph Report - khipu  (2026-09-29)

## Corpus Check
- 261 files · ~327,463 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 2839 nodes · 6116 edges · 136 communities (125 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 256 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a4741a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- result_editing.rs
- postgres/src/lib.rs
- Result
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- theme.ts
- connection_error.rs
- tauri.conf.json
- sqlFiles.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- assembly.rs
- KhipuLanguageServer
- sqlDiagnostics.ts
- connection.ts
- package.json
- dependencies
- Theme bootstrap IIFE (pre-paint CSS var injection)
- svelte
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- sqlAnalysis.test.ts
- default.json
- khipu-desktop
- postgres/src/introspect.rs
- sql_path
- gridWindow.test.ts
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- editorSearchPanel.ts
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- sqlCallHints.ts
- ResultPager.svelte
- vitest
- resultEditing.ts
- pagination.rs
- focusZones.ts
- Borrador: copiado de resultados de consulta
- diagnostics.rs
- editing.rs
- updates.rs
- DestructiveClassification
- ConnectionForm.svelte
- sqlWriting.test.ts
- sidebarLayout.ts
- sqlExecutionMarker.ts
- messages/index.ts
- cellTypes.ts
- FileTree.svelte
- lib/types.ts
- src-tauri/src/lib.rs
- Workspace.svelte
- connectionTest.ts
- filterBuilder.ts
- gridClipboard.ts
- 3. Piezas
- explorerTree.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- +layout.svelte
- i18n/index.ts
- Message
- queryHistory.ts
- pinnedResults.ts
- Arquitectura
- ActiveConnection
- Quality CI Workflow
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- sqlRelations.ts
- resultEdits.ts
- Dialect
- ref_app
- notifications.ts
- khipu_driver_core
- error_position.rs
- reorder.ts
- console_texts.rs
- Explorador de base de datos
- sqlStatementIndex.ts
- Diagnósticos en el editor — diseño (tarea 4)
- sqlContext.ts
- stores/shortcuts.ts
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- commands.ts
- scripts
- main.js
- SettingsPanel.svelte
- parser.rs
- svelte
- gridFind.ts
- DataGrid.svelte
- sqlFormatter.ts
- extractDefaultTable
- svelte.config.js
- Perfiles de motor — diseño (tarea 17)
- 7. Entorno de la conexión — 🧪
- numpadKeys.ts
- invoke
- ConnectFailure
- sqlPreviewFormat.ts
- README.md (English)
- connectionIdentity.ts
- dialogMotion.ts
- Contribuir
- queryConsoles.test.ts
- gridNavigation.ts
- .fmt
- 6. Manejar la app
- 8. Historial de consultas — ✅
- installFocusZones
- ExportDialog.svelte
- 3. Arquitectura
- 4. Ejemplos con errores reales
- add-to-manifest.py
- webkit_env.rs
- 11. Scripts de varias sentencias — ✅
- 13. Modelo de foco por teclado — ✅
- 2. JOIN completo con alias automático
- copyFormat.ts

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `vitest` - 52 edges
3. `Dialect` - 51 edges
4. `svelte` - 33 edges
5. `AppState` - 24 edges
6. `translate` - 23 edges
7. `invoke()` - 22 edges
8. `buildCompletionSource()` - 22 edges
9. `v0.2.0 — Pulido de la experiencia` - 22 edges
10. `createSearchPanel()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts
- `Implementado` --references--> `deleteConnectionProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (136 total, 11 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (66): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+58 more)

### Community 2 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (58): async_trait, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl() (+50 more)

### Community 4 - "Result"
Cohesion: 0.22
Nodes (27): analyze_sql(), apply_result_changes(), AppState, cancel_query(), classify_statements(), connect(), count_query_rows(), database_explorer() (+19 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.11
Nodes (23): afterCompleteCondition(), buildCompletionSource(), buildKeywordCompletion(), COLUMN_TYPES, dialectCache, EMPTY_TABLE_INDEX, filterSchemaResult(), findTableEntry() (+15 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.06
Nodes (45): CheckInfo, ColumnInfo, ConnectionConfig, DbConnector, DriverError, EventInfo, ForeignKeyInfo, IndexInfo (+37 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (38): tabExists(), isFilterOperator(), StatementCheck, appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole() (+30 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.23
Nodes (14): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs) (+6 more)

### Community 9 - "theme.ts"
Cohesion: 0.06
Nodes (45): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+37 more)

### Community 10 - "connection_error.rs"
Cohesion: 0.06
Nodes (34): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+26 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlFiles.ts"
Cohesion: 0.10
Nodes (31): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), listSqlDir(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile() (+23 more)

### Community 13 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 14 - "assembly.rs"
Cohesion: 0.11
Nodes (29): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+21 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.07
Nodes (33): ranges(), byPosition(), charToUtf16(), clearDiagnosticsIn, diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter (+25 more)

### Community 17 - "connection.ts"
Cohesion: 0.11
Nodes (28): getDriver(), loadConnectionPassword(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult (+20 more)

### Community 18 - "package.json"
Cohesion: 0.12
Nodes (15): description, license, name, type, version, codemirror, @codemirror/commands, ref_node_process (+7 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 21 - "svelte"
Cohesion: 0.10
Nodes (11): active, danger, submit, executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES, MAX_LOG_TEXT (+3 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (20): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+12 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.07
Nodes (55): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+47 more)

### Community 25 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli, typescript (+2 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "sqlAnalysis.test.ts"
Cohesion: 0.09
Nodes (19): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), create(), runner(), typed() (+11 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "gridWindow.test.ts"
Cohesion: 0.11
Nodes (21): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual(), 1. Qué pasa hoy, 21a — Grid virtualizado por tramos (2026-09-28) (+13 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.12
Nodes (20): PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor() (+12 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.13
Nodes (18): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+10 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.07
Nodes (35): addExclusion, clearExclusions, createSearchPanel(), applyTexts(), buildQuery(), commit(), countMatches(), excludeCurrent() (+27 more)

### Community 45 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 46 - "sqlCallHints.ts"
Cohesion: 0.07
Nodes (30): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+22 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.10
Nodes (14): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize() (+6 more)

### Community 48 - "vitest"
Cohesion: 0.11
Nodes (20): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ENGINES, doc, text (+12 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.13
Nodes (21): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), onEscape(), onFocusIn(), onPointerDown() (+13 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (63): a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_trailing_comma_points_at_the_comma(), AFTER_LIST_KEYWORDS, an_unknown_qualifier(), analyze(), analyze_mixed_case(), analyze_statement() (+55 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (31): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+23 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "DestructiveClassification"
Cohesion: 0.17
Nodes (20): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_selection() (+12 more)

### Community 57 - "ConnectionForm.svelte"
Cohesion: 0.09
Nodes (13): neutral, indexOf(), tinted, Icon, icons, option(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR (+5 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.15
Nodes (19): buildFkIndex(), buildSqlSchema(), dialectFor(), accept(), CATALOG, complete(), labels(), ORDERS (+11 more)

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.06
Nodes (32): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange, editedLines() (+24 more)

### Community 61 - "messages/index.ts"
Cohesion: 0.25
Nodes (4): explorer(), defineMessages(), OtherLocale, Namespaces

### Community 62 - "cellTypes.ts"
Cohesion: 0.16
Nodes (18): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+10 more)

### Community 63 - "FileTree.svelte"
Cohesion: 0.12
Nodes (15): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY (+7 more)

### Community 64 - "lib/types.ts"
Cohesion: 0.09
Nodes (21): nextSort(), executeQuery(), PageRequest, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExecuteQueryResponse, ExplorerCheck (+13 more)

### Community 65 - "src-tauri/src/lib.rs"
Cohesion: 0.10
Nodes (36): a_script_is_checked_statement_by_statement(), check_statement(), create_sql_file(), DEFAULT_QUERY_ROW_LIMIT, delete_connection_password(), execute_query(), ExecuteQueryResponse, ExportRequest (+28 more)

### Community 66 - "Workspace.svelte"
Cohesion: 0.08
Nodes (10): writeClipboard(), close(), labelForKey(), $t(), ContextMenuItem, child(), writeClipboardText(), key() (+2 more)

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (23): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+15 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.17
Nodes (20): CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines(), parseClipboard() (+12 more)

### Community 70 - "3. Piezas"
Cohesion: 0.18
Nodes (10): 1. Qué pasa hoy, 2. La regla, 3. Piezas, 4. Orden, A. Índice de sentencias incremental (la base), B. Texto hacia el store y guardado, D. Diagnósticos (Error Lens) a escala, Documentos grandes en el editor — diseño (tarea 15) (+2 more)

### Community 71 - "explorerTree.ts"
Cohesion: 0.20
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.18
Nodes (12): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), normalizeTableAliases() (+4 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.05
Nodes (44): query(), 1. Arquitectura, 2. La memoria (`crates/memory`), 2b. Cómo aprende quién es, 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 5. Guardarraíles de datos, 7. Comunicación entre agentes (+36 more)

### Community 74 - "+layout.svelte"
Cohesion: 0.10
Nodes (19): initLocaleEffects(), onePerFrame(), frames, reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+11 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.19
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

### Community 76 - "Message"
Cohesion: 0.15
Nodes (27): absolute_dir(), create(), io_failure(), is_sql_file_name(), list_dir(), read(), rename(), Path (+19 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 79 - "Arquitectura"
Cohesion: 0.25
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 80 - "ActiveConnection"
Cohesion: 0.29
Nodes (9): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, DatabaseExplorer (+1 more)

### Community 81 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.12
Nodes (17): 10. Cancelar una consulta larga — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 9. Hoja de atajos — ✅, Estado (+9 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.22
Nodes (13): hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor(), show() (+5 more)

### Community 84 - "sqlRelations.ts"
Cohesion: 0.21
Nodes (13): Token, aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, StatementRelation (+5 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.21
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 86 - "Dialect"
Cohesion: 0.18
Nodes (10): ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), String, Vec, tokens() (+2 more)

### Community 87 - "ref_app"
Cohesion: 0.13
Nodes (22): relationRef(), applyAndRecord(), catalogTable(), insertAs(), insertText(), joinCandidates(), joinOptions(), onOptions() (+14 more)

### Community 88 - "notifications.ts"
Cohesion: 0.14
Nodes (17): pickSqlFolder(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), flushConsolePersistence(), hydrateLargeTexts() (+9 more)

### Community 89 - "khipu_driver_core"
Cohesion: 0.15
Nodes (16): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, CatalogForeignKey, CatalogTable (+8 more)

### Community 90 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 91 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.22
Nodes (9): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos (+1 more)

### Community 94 - "sqlStatementIndex.ts"
Cohesion: 0.05
Nodes (69): indexedState(), LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts(), typingSpan(), advance() (+61 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.20
Nodes (8): 1. Qué se ve, 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, Diagnósticos en el editor — diseño (tarea 4), Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 96 - "sqlContext.ts"
Cohesion: 0.13
Nodes (19): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+11 more)

### Community 97 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (12): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys() (+4 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.20
Nodes (9): 0. Hoy, 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden, 8. Decidido (2026-09-27) (+1 more)

### Community 100 - "commands.ts"
Cohesion: 0.23
Nodes (14): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+6 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.14
Nodes (12): applyTheme(), hexToRgb(), nextTheme(), PATTERNS, selectTab(), setupTabs(), startBird(), frame() (+4 more)

### Community 103 - "SettingsPanel.svelte"
Cohesion: 0.28
Nodes (3): shortcutText(), $t(), release()

### Community 104 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 105 - "svelte"
Cohesion: 0.19
Nodes (10): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable() (+2 more)

### Community 106 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 107 - "DataGrid.svelte"
Cohesion: 0.32
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 108 - "sqlFormatter.ts"
Cohesion: 0.23
Nodes (10): CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), formatSqlBlock(), indentation(), isClause(), Quote, scanFormattedSql() (+2 more)

### Community 109 - "extractDefaultTable"
Cohesion: 0.53
Nodes (6): currentStatement(), extractDefaultTable(), extractFromContext(), extractFromTables(), toRelation(), C. Autocompletado

### Community 110 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 111 - "Perfiles de motor — diseño (tarea 17)"
Cohesion: 0.25
Nodes (7): ConnectionDriver, 3. El perfil (frontend), 4. El perfil (Rust), 5. Contrato de pruebas, 6. Agregar un motor (guía), 7. Orden, Perfiles de motor — diseño (tarea 17)

### Community 112 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 113 - "numpadKeys.ts"
Cohesion: 0.43
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 114 - "invoke"
Cohesion: 0.19
Nodes (12): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), runtimePasswords (+4 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 117 - "README.md (English)"
Cohesion: 1.00
Nodes (3): app/README.md (Tauri + SvelteKit + TypeScript template note), README.md (English), README.es.md (Spanish)

### Community 118 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 119 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 120 - "Contribuir"
Cohesion: 0.22
Nodes (11): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión (+3 more)

### Community 122 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 124 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 126 - "installFocusZones"
Cohesion: 0.52
Nodes (7): installFocusZones(), isPrefix(), onKeydown(), onKeyup(), onWindowBlur(), stopMoving(), swallow()

### Community 127 - "ExportDialog.svelte"
Cohesion: 0.22
Nodes (9): detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS, highlightSql() (+1 more)

### Community 128 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 129 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 131 - "add-to-manifest.py"
Cohesion: 0.50
Nodes (3): json, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 134 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 135 - "13. Modelo de foco por teclado — ✅"
Cohesion: 0.67
Nodes (3): 13. Modelo de foco por teclado — ✅, Decisión, Problema

### Community 140 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

### Community 142 - "copyFormat.ts"
Cohesion: 0.40
Nodes (4): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **553 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+548 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 988 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `theme.ts`, `sqlDiagnostics.ts`, `package.json`, `sqlAnalysis.test.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `sqlCallHints.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `cellTypes.ts`, `lib/types.ts`, `connectionTest.ts`, `filterBuilder.ts`, `gridClipboard.ts`, `explorerTree.ts`, `+layout.svelte`, `i18n/index.ts`, `queryHistory.ts`, `pinnedResults.ts`, `sqlRelations.ts`, `resultEdits.ts`, `sqlStatementIndex.ts`, `sqlContext.ts`, `commands.ts`, `svelte`, `gridFind.ts`, `sqlFormatter.ts`, `numpadKeys.ts`, `invoke`, `sqlPreviewFormat.ts`, `connectionIdentity.ts`, `dialogMotion.ts`, `queryConsoles.test.ts`, `gridNavigation.ts`, `ExportDialog.svelte`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `queryConsoles.ts`, `theme.ts`, `sqlFiles.ts`, `copyFormat.ts`, `connection.ts`, `package.json`, `svelte`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `ResultPager.svelte`, `focusZones.ts`, `sidebarLayout.ts`, `FileTree.svelte`, `editorSettings.ts`, `i18n/index.ts`, `queryHistory.ts`, `pinnedResults.ts`, `tooltip.ts`, `resultEdits.ts`, `ref_app`, `notifications.ts`, `reorder.ts`, `stores/shortcuts.ts`, `queryConsoles.test.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `connection.ts`, `Arquitectura`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _553 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._