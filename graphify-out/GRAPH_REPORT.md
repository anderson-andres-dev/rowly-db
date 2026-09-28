# Graph Report - khipu  (2026-09-28)

## Corpus Check
- 245 files · ~285,023 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .css 6, .icns 1)

## Summary
- 2682 nodes · 5768 edges · 135 communities (124 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 221 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `60ce0785`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- result_editing.rs
- postgres/src/lib.rs
- AppState
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- theme.ts
- connection_error.rs
- tauri.conf.json
- sqlFiles.ts
- sqlRelations.ts
- assembly.rs
- KhipuLanguageServer
- sqlDiagnostics.ts
- connection.ts
- package.json
- dependencies
- i18n/index.ts
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
- serde
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
- sqlStatementIndex.ts
- resultEditing.ts
- pagination.rs
- contract.test.ts
- Borrador: copiado de resultados de consulta
- diagnostics.rs
- editing.rs
- updates.rs
- DestructiveClassification
- focusZones.ts
- Workspace.svelte
- sidebarLayout.ts
- sqlExecutionMarker.ts
- messages/index.ts
- Message
- FileTree.svelte
- lib/types.ts
- src-tauri/src/lib.rs
- SqlEditor.svelte
- connectionTest.ts
- filterBuilder.ts
- gridClipboard.ts
- sqlContext.ts
- largeDocuments.test.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- +layout.svelte
- commands.ts
- sql_files.rs
- queryHistory.ts
- pinnedResults.ts
- sqlFolders.ts
- sqlStatementIndex.test.ts
- invoke
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- QueryExecutionOptions
- resultEdits.ts
- Dialect
- svelte
- sqlDefinitionLink.ts
- MySqlConnector
- super
- stores/shortcuts.ts
- console_texts.rs
- Explorador de base de datos
- 3. Arquitectura
- Diagnósticos en el editor — diseño (tarea 4)
- 4. Ejemplos con errores reales
- 3. Piezas
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlStatements.ts
- scripts
- ExportDialog.svelte
- QueryCancel
- 7. Entorno de la conexión — 🧪
- iconOptics.ts
- gridFind.ts
- DataGrid.svelte
- sqlFormatter.ts
- queryConsoles.test.ts
- svelte.config.js
- 11. Scripts de varias sentencias — ✅
- 13. Modelo de foco por teclado — ✅
- add-to-manifest.py
- 2. La memoria (`crates/memory`)
- ConnectFailure
- vitest
- RawStatement<'q>
- sqlPreviewFormat.ts
- dialogMotion.ts
- Contribuir
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- CONTRIBUTING.md
- Theme bootstrap IIFE (pre-paint CSS var injection)
- Quality CI Workflow
- 6. Manejar la app
- open_pool
- copyFormat.ts
- .fmt
- extractDefaultTable
- 8. Interfaz
- Arquitectura
- 1. Arquitectura
- vite.config.js
- StatementMark

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `Dialect` - 51 edges
3. `vitest` - 44 edges
4. `svelte` - 33 edges
5. `AppState` - 24 edges
6. `translate` - 23 edges
7. `invoke()` - 22 edges
8. `v0.2.0 — Pulido de la experiencia` - 22 edges
9. `createSearchPanel()` - 21 edges
10. `SqlProfile` - 21 edges

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

## Communities (135 total, 11 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.17
Nodes (24): async_trait, config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_for_bad_sql() (+16 more)

### Community 2 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.07
Nodes (53): cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql() (+45 more)

### Community 4 - "AppState"
Cohesion: 0.14
Nodes (32): ActiveConnection, analyze_sql(), apply_result_changes(), AppState, connect(), database_explorer(), DatabaseExplorer, disconnect() (+24 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.09
Nodes (43): relationRef(), afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), buildFkIndex(), buildKeywordCompletion(), buildSqlSchema(), catalogTable() (+35 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.07
Nodes (40): CheckInfo, ColumnInfo, ConnectionConfig, DbConnector, DriverError, EventInfo, ForeignKeyInfo, IndexInfo (+32 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (44): tabExists(), isFilterOperator(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+36 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.28
Nodes (12): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs), crates/driver-core layer (DbConnector contract), crates/drivers/* layer (khipu-driver-mysql, khipu-driver-postgres, ... over sqlx) (+4 more)

### Community 9 - "theme.ts"
Cohesion: 0.06
Nodes (42): BUILTIN_FUNCTIONS, builtinCallMark, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight, wordOperatorMark, ColorScheme, EditorPalette (+34 more)

### Community 10 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlFiles.ts"
Cohesion: 0.14
Nodes (24): openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS, SqlDirEntry (+16 more)

### Community 13 - "sqlRelations.ts"
Cohesion: 0.18
Nodes (15): sqlTokens(), aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, StatementRelation (+7 more)

### Community 14 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.07
Nodes (33): byPosition(), byQuotedName(), charToUtf16(), clearDiagnosticsIn, diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter (+25 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (28): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connection, ConnectionState, ConnectResult (+20 more)

### Community 18 - "package.json"
Cohesion: 0.13
Nodes (14): description, license, name, type, version, codemirror, @codemirror/commands, devicon (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "i18n/index.ts"
Cohesion: 0.19
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

### Community 21 - "svelte"
Cohesion: 0.09
Nodes (14): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), CONNECTION_COLORS (+6 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.08
Nodes (36): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), connect(), ConnectedDatabase, DatabaseKind (+28 more)

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
Cohesion: 0.12
Nodes (12): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), create(), runner(), typed() (+4 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.14
Nodes (17): ConnectionDriver, PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, isDriver(), isHexColor(), isPasswordPolicy() (+9 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.08
Nodes (32): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+24 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.06
Nodes (34): addExclusion, clearExclusions, createSearchPanel(), buildQuery(), commit(), countMatches(), excludeCurrent(), refreshStatus() (+26 more)

### Community 45 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.20
Nodes (9): TableIndex, 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, 7. Hecho (2026-09-27) (+1 more)

### Community 46 - "sqlCallHints.ts"
Cohesion: 0.05
Nodes (48): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+40 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.14
Nodes (8): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t(), Consistencia de los `.md`

### Community 48 - "sqlStatementIndex.ts"
Cohesion: 0.19
Nodes (21): advance(), applyChanges(), build(), hasTerminatedEnd(), indexMore, mapResume(), marks(), nextStart() (+13 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.13
Nodes (19): for(), addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditableColumn, EditTarget (+11 more)

### Community 50 - "pagination.rs"
Cohesion: 0.16
Nodes (17): count_sql(), is_read_only_query(), literal_limit(), literal_u64(), number(), ordena_por_posicion_reemplazando_el_order_by(), paginate_sql(), parse_pageable_query() (+9 more)

### Community 51 - "contract.test.ts"
Cohesion: 0.09
Nodes (24): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, dialectFor(), accept() (+16 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (63): a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_trailing_comma_points_at_the_comma(), AFTER_LIST_KEYWORDS, an_unknown_qualifier(), analyze(), analyze_mixed_case(), analyze_statement() (+55 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (31): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+23 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "DestructiveClassification"
Cohesion: 0.17
Nodes (20): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_selection() (+12 more)

### Community 57 - "focusZones.ts"
Cohesion: 0.13
Nodes (24): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), onEscape(), onFocusIn() (+16 more)

### Community 58 - "Workspace.svelte"
Cohesion: 0.13
Nodes (6): labelForKey(), $t(), executionLog, LogEntry, LogKind, at()

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.10
Nodes (20): executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimes, ExecutionTimeWidget (+12 more)

### Community 61 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 62 - "Message"
Cohesion: 0.20
Nodes (22): cancel_query(), count_query_rows(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text() (+14 more)

### Community 63 - "FileTree.svelte"
Cohesion: 0.12
Nodes (18): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+10 more)

### Community 64 - "lib/types.ts"
Cohesion: 0.10
Nodes (19): nextSort(), ConnectionConfig, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent, ExplorerForeignKey (+11 more)

### Community 65 - "src-tauri/src/lib.rs"
Cohesion: 0.15
Nodes (20): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), DEFAULT_QUERY_ROW_LIMIT, execute_query(), ExecuteQueryResponse, ExportRequest, ExportSummary (+12 more)

### Community 66 - "SqlEditor.svelte"
Cohesion: 0.11
Nodes (6): close(), ContextMenuItem, applyTexts(), label(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 67 - "connectionTest.ts"
Cohesion: 0.13
Nodes (21): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+13 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.16
Nodes (17): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+9 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.15
Nodes (22): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+14 more)

### Community 70 - "sqlContext.ts"
Cohesion: 0.11
Nodes (21): ENGINES, completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame() (+13 more)

### Community 71 - "largeDocuments.test.ts"
Cohesion: 0.15
Nodes (16): doc, indexedState(), text, typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), statementDecorations() (+8 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.24
Nodes (8): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), setFormatterLineWidth()

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.09
Nodes (22): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 5. Guardarraíles de datos, 7. Comunicación entre agentes, Agente abierto desde fuera, Anexo A. Reglas de escritura, memoria y app (borrador), Asistente integrado con memoria de negocio — diseño, `base.md` (+14 more)

### Community 74 - "+layout.svelte"
Cohesion: 0.12
Nodes (16): initLocaleEffects(), reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens, app_src_lib_styles_tooltip (+8 more)

### Community 75 - "commands.ts"
Cohesion: 0.16
Nodes (19): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+11 more)

### Community 76 - "sql_files.rs"
Cohesion: 0.26
Nodes (18): absolute_dir(), create(), io_failure(), is_sql_file_name(), list_dir(), read(), rename(), Path (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.18
Nodes (14): filterHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load(), MAX_HISTORY_ENTRIES (+6 more)

### Community 78 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 79 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (12): folderMenuItems(), startCreate(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT (+4 more)

### Community 80 - "sqlStatementIndex.test.ts"
Cohesion: 0.14
Nodes (16): standardSql, sqlLexical, statementNear(), indexed(), LEXICALS, PIECES, split(), chooseStatement() (+8 more)

### Community 81 - "invoke"
Cohesion: 0.12
Nodes (19): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+11 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.10
Nodes (21): 10. Cancelar una consulta larga — ✅, 12. Mensajes del backend traducibles — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 8. Historial de consultas — ✅ (+13 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.19
Nodes (11): hide(), place(), prettyShortcut(), resolve(), Resolved, show(), tooltip(), onFocus() (+3 more)

### Community 84 - "QueryExecutionOptions"
Cohesion: 0.20
Nodes (16): QueryExecutionOptions, cancelled_before_start(), execute_on_connection(), ExecutionOutcome, mysql_error_to_result(), RawStatement, read_result_set(), From (+8 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.21
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 86 - "Dialect"
Cohesion: 0.16
Nodes (12): MYSQL, ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), String, Vec (+4 more)

### Community 87 - "svelte"
Cohesion: 0.15
Nodes (14): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE (+6 more)

### Community 88 - "sqlDefinitionLink.ts"
Cohesion: 0.17
Nodes (8): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange, @codemirror/view

### Community 89 - "MySqlConnector"
Cohesion: 0.23
Nodes (11): hex_encode(), MySqlConnector, DriverError, Result, SchemaObjects, ServerVersion, String, TlsStatus (+3 more)

### Community 90 - "super"
Cohesion: 0.12
Nodes (10): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS, ParserError, Result (+2 more)

### Community 91 - "stores/shortcuts.ts"
Cohesion: 0.15
Nodes (8): handleRecordKeydown(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, shortcutOverrides, shortcuts

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.29
Nodes (6): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos

### Community 94 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.20
Nodes (8): 1. Qué se ve, 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, Diagnósticos en el editor — diseño (tarea 4), Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 96 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 97 - "3. Piezas"
Cohesion: 0.13
Nodes (14): statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 2. La regla, 3. Piezas, 4. Orden (+6 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.13
Nodes (31): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+23 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "sqlStatements.ts"
Cohesion: 0.22
Nodes (13): ScanResult, compiled, escapeClass(), isSpace(), opensEscapeString(), rulesFor(), SCAN_OVERLAP, scanChunk() (+5 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "ExportDialog.svelte"
Cohesion: 0.18
Nodes (9): detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS, highlightSql() (+1 more)

### Community 103 - "QueryCancel"
Cohesion: 0.21
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 104 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "DataGrid.svelte"
Cohesion: 0.20
Nodes (7): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit

### Community 108 - "sqlFormatter.ts"
Cohesion: 0.23
Nodes (10): CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), formatSqlBlock(), indentation(), isClause(), Quote, scanFormattedSql() (+2 more)

### Community 110 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 111 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 112 - "13. Modelo de foco por teclado — ✅"
Cohesion: 0.67
Nodes (3): 13. Modelo de foco por teclado — ✅, Decisión, Problema

### Community 113 - "add-to-manifest.py"
Cohesion: 0.50
Nodes (3): json, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

### Community 114 - "2. La memoria (`crates/memory`)"
Cohesion: 0.18
Nodes (10): 2. La memoria (`crates/memory`), 2b. Cómo aprende quién es, 9. Subtareas, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Fuente en el repo, Huella de una tabla (+2 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "vitest"
Cohesion: 0.43
Nodes (4): initials(), luminance(), readableTextColor(), vitest

### Community 117 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, MySql

### Community 118 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 119 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 120 - "Contribuir"
Cohesion: 0.22
Nodes (10): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión (+2 more)

### Community 121 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 122 - "CONTRIBUTING.md"
Cohesion: 0.32
Nodes (5): app/README.md (Tauri + SvelteKit + TypeScript template note), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, README.md (English), README.es.md (Spanish)

### Community 123 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 124 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 125 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 126 - "open_pool"
Cohesion: 0.29
Nodes (7): is_unsupported_in_prepared_protocol(), mysql_cell_to_query_value(), open_pool(), Error, MySqlPool, MySqlRow, TlsMode

### Community 127 - "copyFormat.ts"
Cohesion: 0.40
Nodes (4): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS

### Community 129 - "extractDefaultTable"
Cohesion: 0.53
Nodes (6): currentStatement(), extractDefaultTable(), extractFromContext(), extractFromTables(), toRelation(), C. Autocompletado

### Community 130 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 131 - "Arquitectura"
Cohesion: 0.40
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 132 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 133 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **516 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+511 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 932 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `lib/types.ts`, `connectionTest.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `theme.ts`, `sqlRelations.ts`, `sqlDiagnostics.ts`, `connection.ts`, `package.json`, `i18n/index.ts`, `sqlAnalysis.test.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `sqlCallHints.ts`, `resultEditing.ts`, `contract.test.ts`, `focusZones.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `lib/types.ts`, `connectionTest.ts`, `filterBuilder.ts`, `gridClipboard.ts`, `sqlContext.ts`, `largeDocuments.test.ts`, `commands.ts`, `queryHistory.ts`, `pinnedResults.ts`, `sqlStatementIndex.test.ts`, `invoke`, `resultEdits.ts`, `svelte`, `ExportDialog.svelte`, `gridFind.ts`, `sqlFormatter.ts`, `queryConsoles.test.ts`, `sqlPreviewFormat.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `SSL/TLS por conexión` connect `lib/types.ts` to `Explorador de base de datos`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _516 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._