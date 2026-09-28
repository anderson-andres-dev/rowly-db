# Graph Report - khipu  (2026-09-28)

## Corpus Check
- 247 files · ~307,295 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 2721 nodes · 5846 edges · 135 communities (122 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 225 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a313a88f`
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
- postgres/src/tls.rs
- tauri.conf.json
- sqlFiles.ts
- stores/shortcuts.ts
- assembly.rs
- KhipuLanguageServer
- sqlDiagnostics.ts
- connection.ts
- package.json
- dependencies
- i18n/index.ts
- ConnectionForm.svelte
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
- vitest
- export.rs
- editorSearchPanel.ts
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- contract.test.ts
- ResultPager.svelte
- sqlStatementIndex.test.ts
- resultEditing.ts
- pagination.rs
- sqlWriting.test.ts
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
- DbConnector
- invoke
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- connection_error.rs
- resultEdits.ts
- Dialect
- svelte
- sqlDefinitionLink.ts
- super
- error_position.rs
- reorder.ts
- console_texts.rs
- Explorador de base de datos
- sqlStatementIndex.ts
- Diagnósticos en el editor — diseño (tarea 4)
- withExecution
- Perfiles de motor — diseño (tarea 17)
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- notifications.ts
- scripts
- main.js
- svelte
- parser.rs
- iconOptics.ts
- gridFind.ts
- DataGrid.svelte
- sqlFormatter.ts
- sqlStatements.ts
- svelte.config.js
- postgres/src/version.rs
- Anexo A. Reglas de escritura, memoria y app (borrador)
- 3. Piezas
- sqlParameterHints.ts
- ConnectFailure
- gridClipboard.test.ts
- ConnectionConfig
- currentQueryConsole
- dialogMotion.ts
- Contribuir
- 3. Arquitectura
- vite.config.js
- 4. Ejemplos con errores reales
- queryConsoles.test.ts
- 6. Manejar la app
- .fmt
- 8. Interfaz
- add-to-manifest.py
- 11. Scripts de varias sentencias — ✅
- 13. Modelo de foco por teclado — ✅
- 7. Entorno de la conexión — 🧪

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `Dialect` - 51 edges
3. `vitest` - 45 edges
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
- `Implementado` --references--> `deleteConnectionProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts
- `Consistencia de los `.md`` --references--> `format()`  [INFERRED]
  docs/specs/v0.3-asistente-mcp.md → app/src/lib/components/results/ResultPager.svelte

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (135 total, 13 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (62): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+54 more)

### Community 2 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (60): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env(), config_with_tls() (+52 more)

### Community 4 - "AppState"
Cohesion: 0.14
Nodes (32): ActiveConnection, analyze_sql(), apply_result_changes(), AppState, connect(), database_explorer(), DatabaseExplorer, disconnect() (+24 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.07
Nodes (55): Token, aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, relationRef() (+47 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (27): async_trait, CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+19 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (33): isFilterOperator(), PageRequest, StatementCheck, activateQueryConsole(), appendConsole(), closeQueryConsole(), consoleTitle(), createId() (+25 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.05
Nodes (46): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+38 more)

### Community 9 - "theme.ts"
Cohesion: 0.06
Nodes (42): BUILTIN_FUNCTIONS, builtinCallMark, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight, wordOperatorMark, ColorScheme, EditorPalette (+34 more)

### Community 10 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlFiles.ts"
Cohesion: 0.15
Nodes (21): confirmTrash(), listSqlDir(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs() (+13 more)

### Community 13 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (12): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys() (+4 more)

### Community 14 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.07
Nodes (34): byPosition(), byQuotedName(), charToUtf16(), clearDiagnosticsIn, diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter (+26 more)

### Community 17 - "connection.ts"
Cohesion: 0.09
Nodes (30): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectionState (+22 more)

### Community 18 - "package.json"
Cohesion: 0.14
Nodes (13): description, license, name, type, version, codemirror, @codemirror/commands, devicon (+5 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "i18n/index.ts"
Cohesion: 0.19
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

### Community 21 - "ConnectionForm.svelte"
Cohesion: 0.13
Nodes (8): neutral, tinted, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, BackendKind, connectionDrivers, DriverDefinition, MessageKey

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
Cohesion: 0.10
Nodes (15): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), create(), runner(), typed() (+7 more)

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
Cohesion: 0.13
Nodes (12): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+4 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.11
Nodes (22): ConnectionDriver, PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver() (+14 more)

### Community 42 - "vitest"
Cohesion: 0.06
Nodes (41): initials(), luminance(), readableTextColor(), nextSort(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES (+33 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.06
Nodes (35): addExclusion, clearExclusions, createSearchPanel(), applyTexts(), buildQuery(), commit(), countMatches(), excludeCurrent() (+27 more)

### Community 45 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 46 - "contract.test.ts"
Cohesion: 0.08
Nodes (32): Fixture, FIXTURES, ORDERS, PROFILES, USERS, standardSql, buildRoutineIndex(), CallArgument (+24 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.10
Nodes (14): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize() (+6 more)

### Community 48 - "sqlStatementIndex.test.ts"
Cohesion: 0.15
Nodes (18): nextStart(), previousEnd(), sqlLexical, statementNear(), statementsIn(), statementTextAt(), indexed(), LEXICALS (+10 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.14
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditableColumn, EditTarget, newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 51 - "sqlWriting.test.ts"
Cohesion: 0.12
Nodes (25): buildFkIndex(), buildSqlSchema(), currentStatement(), dialectFor(), extractDefaultTable(), extractFromContext(), extractFromTables(), accept() (+17 more)

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

### Community 57 - "focusZones.ts"
Cohesion: 0.13
Nodes (24): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), onEscape(), onFocusIn() (+16 more)

### Community 58 - "Workspace.svelte"
Cohesion: 0.14
Nodes (6): labelForKey(), $t(), executionLog, LogEntry, LogKind, at()

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.10
Nodes (23): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+15 more)

### Community 61 - "messages/index.ts"
Cohesion: 0.12
Nodes (18): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+10 more)

### Community 62 - "Message"
Cohesion: 0.20
Nodes (22): cancel_query(), count_query_rows(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text() (+14 more)

### Community 63 - "FileTree.svelte"
Cohesion: 0.21
Nodes (8): active, fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile(), entry()

### Community 64 - "lib/types.ts"
Cohesion: 0.14
Nodes (13): CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent, ExplorerForeignKey, ExplorerIndex, ExplorerKey (+5 more)

### Community 65 - "src-tauri/src/lib.rs"
Cohesion: 0.15
Nodes (20): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), DEFAULT_QUERY_ROW_LIMIT, execute_query(), ExecuteQueryResponse, ExportRequest, ExportSummary (+12 more)

### Community 66 - "SqlEditor.svelte"
Cohesion: 0.11
Nodes (5): ContextMenuItem, child(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch, state

### Community 67 - "connectionTest.ts"
Cohesion: 0.14
Nodes (19): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+11 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.16
Nodes (19): writeClipboard(), COPY_FORMATS, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+11 more)

### Community 70 - "sqlContext.ts"
Cohesion: 0.11
Nodes (20): ENGINES, completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame() (+12 more)

### Community 71 - "largeDocuments.test.ts"
Cohesion: 0.15
Nodes (16): doc, indexedState(), text, typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), statementDecorations() (+8 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.18
Nodes (12): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), normalizeTableAliases() (+4 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.07
Nodes (30): 1. Arquitectura, 2. La memoria (`crates/memory`), 2b. Cómo aprende quién es, 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 5. Guardarraíles de datos, 7. Comunicación entre agentes, 9. Subtareas (+22 more)

### Community 74 - "+layout.svelte"
Cohesion: 0.12
Nodes (17): initLocaleEffects(), reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens, app_src_lib_styles_tooltip (+9 more)

### Community 75 - "commands.ts"
Cohesion: 0.21
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+7 more)

### Community 76 - "sql_files.rs"
Cohesion: 0.26
Nodes (18): absolute_dir(), create(), io_failure(), is_sql_file_name(), list_dir(), read(), rename(), Path (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.20
Nodes (13): filterHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load(), MAX_HISTORY_ENTRIES (+5 more)

### Community 78 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 79 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (12): folderMenuItems(), startCreate(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT (+4 more)

### Community 80 - "DbConnector"
Cohesion: 0.19
Nodes (11): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Output, Pin (+3 more)

### Community 81 - "invoke"
Cohesion: 0.15
Nodes (15): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+7 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.11
Nodes (19): 10. Cancelar una consulta larga — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 8. Historial de consultas — ✅, 9. Hoja de atajos — ✅ (+11 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.17
Nodes (14): close(), element(), ensureElement(), hide(), place(), prettyShortcut(), resolve(), Resolved (+6 more)

### Community 84 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.21
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 86 - "Dialect"
Cohesion: 0.18
Nodes (10): ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), String, Vec, tokens() (+2 more)

### Community 87 - "svelte"
Cohesion: 0.24
Nodes (8): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), usage, ref_app, svelte

### Community 88 - "sqlDefinitionLink.ts"
Cohesion: 0.17
Nodes (8): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange, @codemirror/view

### Community 89 - "super"
Cohesion: 0.14
Nodes (17): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, CatalogForeignKey, CatalogTable (+9 more)

### Community 90 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 91 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 94 - "sqlStatementIndex.ts"
Cohesion: 0.16
Nodes (18): advance(), applyChanges(), build(), hasTerminatedEnd(), indexMore, IndexValue, mapResume(), marks() (+10 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.20
Nodes (8): 1. Qué se ve, 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, Diagnósticos en el editor — diseño (tarea 4), Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 96 - "withExecution"
Cohesion: 0.20
Nodes (14): tabExists(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting() (+6 more)

### Community 97 - "Perfiles de motor — diseño (tarea 17)"
Cohesion: 0.33
Nodes (5): 4. El perfil (Rust), 5. Contrato de pruebas, 6. Agregar un motor (guía), 7. Orden, Perfiles de motor — diseño (tarea 17)

### Community 98 - "engines/index.ts"
Cohesion: 0.13
Nodes (31): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+23 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "notifications.ts"
Cohesion: 0.17
Nodes (14): pickSqlFolder(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), hydrateLargeTexts(), PersistedConsole (+6 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.14
Nodes (12): applyTheme(), hexToRgb(), nextTheme(), PATTERNS, selectTab(), setupTabs(), startBird(), frame() (+4 more)

### Community 103 - "svelte"
Cohesion: 0.11
Nodes (7): Icon, icons, option(), shortcutText(), $t(), path, svelte

### Community 104 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "DataGrid.svelte"
Cohesion: 0.18
Nodes (8): for(), onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit

### Community 108 - "sqlFormatter.ts"
Cohesion: 0.23
Nodes (10): CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), formatSqlBlock(), indentation(), isClause(), Quote, scanFormattedSql() (+2 more)

### Community 109 - "sqlStatements.ts"
Cohesion: 0.18
Nodes (16): ScanResult, blankLineIn(), compiled, CONTINUES, escapeClass(), isSpace(), lineOf(), opensEscapeString() (+8 more)

### Community 110 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 111 - "postgres/src/version.rs"
Cohesion: 0.15
Nodes (7): Capabilities, capabilities_by_version(), MIN_MAJOR, Capabilities, Self, String, ServerVersion

### Community 112 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 113 - "3. Piezas"
Cohesion: 0.15
Nodes (12): 15c — Autocompletado (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 2. La regla, 3. Piezas, 4. Orden, 5. Hecho, B. Texto hacia el store y guardado (+4 more)

### Community 114 - "sqlParameterHints.ts"
Cohesion: 0.20
Nodes (7): RoutineIndex, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig, parameterHints

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "gridClipboard.test.ts"
Cohesion: 0.25
Nodes (7): CopyColumn, PasteBlock, rememberCopy(), columns, NULL, options, CellValue

### Community 117 - "ConnectionConfig"
Cohesion: 0.40
Nodes (3): ConnectionConfig, TlsMode, Debug

### Community 118 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

### Community 119 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 120 - "Contribuir"
Cohesion: 0.22
Nodes (11): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión (+3 more)

### Community 121 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 122 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 123 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 125 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 130 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 131 - "add-to-manifest.py"
Cohesion: 0.50
Nodes (3): json, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

### Community 134 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 135 - "13. Modelo de foco por teclado — ✅"
Cohesion: 0.67
Nodes (3): 13. Modelo de foco por teclado — ✅, Decisión, Problema

### Community 136 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.67
Nodes (3): 7. Entorno de la conexión — 🧪, Decisión, Problema

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **520 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+515 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 946 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `sqlSchema.ts`, `theme.ts`, `sqlDiagnostics.ts`, `package.json`, `i18n/index.ts`, `sqlAnalysis.test.ts`, `connectionProfiles.ts`, `editorSearchPanel.ts`, `contract.test.ts`, `sqlStatementIndex.test.ts`, `resultEditing.ts`, `sqlWriting.test.ts`, `focusZones.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `messages/index.ts`, `connectionTest.ts`, `filterBuilder.ts`, `sqlContext.ts`, `largeDocuments.test.ts`, `commands.ts`, `queryHistory.ts`, `pinnedResults.ts`, `invoke`, `resultEdits.ts`, `svelte`, `gridFind.ts`, `sqlFormatter.ts`, `gridClipboard.test.ts`, `dialogMotion.ts`, `queryConsoles.test.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `docs/ARCHITECTURE.md`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Asistente integrado con memoria de negocio — diseño` connect `Asistente integrado con memoria de negocio — diseño` to `Anexo A. Reglas de escritura, memoria y app (borrador)`, `8. Interfaz`, `6. Manejar la app`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _520 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._