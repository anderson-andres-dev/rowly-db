# Graph Report - khipu  (2026-09-27)

## Corpus Check
- 241 files · ~238,268 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .css 6, .icns 1)

## Summary
- 2614 nodes · 5691 edges · 125 communities (112 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 213 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e06fa32`
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
- sqlRelations.ts
- explorerTree.ts
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
- ResultPane.svelte
- sidebarLayout.ts
- sqlExecutionMarker.ts
- messages/index.ts
- Message
- FileTree.svelte
- lib/types.ts
- src-tauri/src/lib.rs
- Workspace.svelte
- connectionTest.ts
- filterBuilder.ts
- gridClipboard.ts
- sqlContext.ts
- largeDocuments.test.ts
- editorSettings.ts
- onPointerDown
- +layout.svelte
- connection_error.rs
- sql_files.rs
- queryHistory.ts
- pinnedResults.ts
- sqlFolders.ts
- sqlStatements.ts
- invoke
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- parser.rs
- resultEdits.ts
- Dialect
- svelte
- sqlDefinitionLink.ts
- 2. Inventario: lo que depende del motor
- error_position.rs
- super
- console_texts.rs
- TlsMode
- 3. Arquitectura
- Diagnósticos en el editor — diseño (tarea 4)
- 4. Ejemplos con errores reales
- 3. Piezas
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- 5. Hecho (2026-09-27)
- scripts
- ExportDialog.svelte
- postgres/src/version.rs
- 7. Entorno de la conexión — 🧪
- iconOptics.ts
- gridFind.ts
- sqlParameterHints.ts
- sqlFormatter.ts
- queryConsoles.test.ts
- svelte.config.js
- 11. Scripts de varias sentencias — ✅
- 13. Modelo de foco por teclado — ✅
- add-to-manifest.py
- sqlStatementIndex.test.ts
- ConnectFailure
- vitest
- 2. JOIN completo con alias automático
- sqlPreviewFormat.ts
- reorder.ts
- currentQueryConsole
- .fmt

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `Dialect` - 51 edges
3. `vitest` - 43 edges
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

## Communities (125 total, 13 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (65): cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection(), execute_query_returns_command_for_ddl() (+57 more)

### Community 2 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (60): QueryExecutionOptions, a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env() (+52 more)

### Community 4 - "AppState"
Cohesion: 0.14
Nodes (32): ActiveConnection, analyze_sql(), apply_result_changes(), AppState, connect(), database_explorer(), DatabaseExplorer, disconnect() (+24 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.07
Nodes (57): relationRef(), afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), buildFkIndex(), buildSqlSchema(), catalogTable(), COLUMN_TYPES (+49 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.07
Nodes (41): async_trait, ColumnInfo, ConnectionConfig, DbConnector, DriverError, EventInfo, ForeignKeyInfo, IndexInfo (+33 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (41): tabExists(), isFilterOperator(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+33 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.07
Nodes (41): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+33 more)

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
Cohesion: 0.17
Nodes (20): openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS, SqlDirEntry (+12 more)

### Community 13 - "sqlRelations.ts"
Cohesion: 0.23
Nodes (12): aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, StatementRelation, statementRelations() (+4 more)

### Community 14 - "explorerTree.ts"
Cohesion: 0.22
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.07
Nodes (34): byPosition(), byQuotedName(), charToUtf16(), clearDiagnosticsIn, diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter (+26 more)

### Community 17 - "connection.ts"
Cohesion: 0.12
Nodes (25): indexOf(), toConnectionFailure(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection (+17 more)

### Community 18 - "package.json"
Cohesion: 0.11
Nodes (17): description, license, name, type, version, codemirror, @codemirror/commands, devicon (+9 more)

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
Cohesion: 0.19
Nodes (19): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+11 more)

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
Nodes (17): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), create(), runner(), typed() (+9 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.06
Nodes (71): build_parameters, crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow (+63 more)

### Community 32 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.13
Nodes (12): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+4 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.12
Nodes (20): ConnectionDriver, PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor() (+12 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.13
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.06
Nodes (35): addExclusion, clearExclusions, createSearchPanel(), buildQuery(), commit(), countMatches(), excludeCurrent(), refreshStatus() (+27 more)

### Community 45 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 46 - "sqlCallHints.ts"
Cohesion: 0.15
Nodes (15): buildRoutineIndex(), CallArgument, CatalogRoutine, findCalls(), isName(), Name, nameOf(), ParameterHint (+7 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "sqlStatementIndex.ts"
Cohesion: 0.16
Nodes (19): advance(), applyChanges(), build(), hasTerminatedEnd(), indexMore, IndexValue, mapResume(), marks() (+11 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.13
Nodes (19): for(), addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditableColumn, EditTarget (+11 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 51 - "contract.test.ts"
Cohesion: 0.12
Nodes (15): Fixture, FIXTURES, ORDERS, PROFILES, USERS, standardSql, ExecutionError, CatalogTable (+7 more)

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
Cohesion: 0.06
Nodes (51): commandDefinition, commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey() (+43 more)

### Community 58 - "ResultPane.svelte"
Cohesion: 0.10
Nodes (11): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit, executionLog (+3 more)

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.10
Nodes (20): executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimes, ExecutionTimeWidget (+12 more)

### Community 61 - "messages/index.ts"
Cohesion: 0.25
Nodes (4): explorer(), defineMessages(), OtherLocale, Namespaces

### Community 62 - "Message"
Cohesion: 0.20
Nodes (22): cancel_query(), count_query_rows(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text() (+14 more)

### Community 63 - "FileTree.svelte"
Cohesion: 0.14
Nodes (16): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+8 more)

### Community 64 - "lib/types.ts"
Cohesion: 0.11
Nodes (19): nextSort(), PageRequest, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent (+11 more)

### Community 65 - "src-tauri/src/lib.rs"
Cohesion: 0.15
Nodes (20): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), DEFAULT_QUERY_ROW_LIMIT, execute_query(), ExecuteQueryResponse, ExportRequest, ExportSummary (+12 more)

### Community 66 - "Workspace.svelte"
Cohesion: 0.09
Nodes (10): close(), labelForKey(), $t(), ContextMenuItem, applyTexts(), label(), table(), app_src_lib_sqleditoricons (+2 more)

### Community 67 - "connectionTest.ts"
Cohesion: 0.13
Nodes (20): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+12 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.15
Nodes (22): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+14 more)

### Community 70 - "sqlContext.ts"
Cohesion: 0.13
Nodes (19): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+11 more)

### Community 71 - "largeDocuments.test.ts"
Cohesion: 0.15
Nodes (16): doc, indexedState(), text, typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), statementDecorations() (+8 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.24
Nodes (8): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), setFormatterLineWidth()

### Community 73 - "onPointerDown"
Cohesion: 0.42
Nodes (9): prefersReducedMotion(), onPointerDown(), cleanup(), onMove(), onUp(), resetStyles(), settle(), startDrag() (+1 more)

### Community 74 - "+layout.svelte"
Cohesion: 0.09
Nodes (18): installDialogMotion(), initLocaleEffects(), reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens (+10 more)

### Community 75 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

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
Cohesion: 0.14
Nodes (15): folderMenuItems(), startCreate(), pickSqlFolder(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load() (+7 more)

### Community 80 - "sqlStatements.ts"
Cohesion: 0.16
Nodes (20): statementNear(), chooseStatement(), compiled, escapeClass(), isSpace(), lineOf(), opensEscapeString(), rulesFor() (+12 more)

### Community 81 - "invoke"
Cohesion: 0.12
Nodes (19): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+11 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.11
Nodes (19): 10. Cancelar una consulta larga — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 8. Historial de consultas — ✅, 9. Hoja de atajos — ✅ (+11 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.19
Nodes (11): hide(), place(), prettyShortcut(), resolve(), Resolved, show(), tooltip(), onFocus() (+3 more)

### Community 84 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (14): PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 86 - "Dialect"
Cohesion: 0.17
Nodes (11): ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), Box, String, Vec (+3 more)

### Community 87 - "svelte"
Cohesion: 0.19
Nodes (11): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS, forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables (+3 more)

### Community 88 - "sqlDefinitionLink.ts"
Cohesion: 0.17
Nodes (8): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange, @codemirror/view

### Community 89 - "2. Inventario: lo que depende del motor"
Cohesion: 0.67
Nodes (3): 2. Inventario: lo que depende del motor, Backend (Rust), Frontend

### Community 90 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 91 - "super"
Cohesion: 0.14
Nodes (17): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, CatalogForeignKey, CatalogTable (+9 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "TlsMode"
Cohesion: 0.15
Nodes (12): ConnectionConfig, TlsMode, TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas (+4 more)

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
Cohesion: 0.15
Nodes (12): 15c — Autocompletado (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 2. La regla, 3. Piezas, 4. Orden, 5. Hecho, B. Texto hacia el store y guardado (+4 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.13
Nodes (31): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+23 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.20
Nodes (9): 0. Hoy, 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden, 8. Decidido (2026-09-27) (+1 more)

### Community 100 - "5. Hecho (2026-09-27)"
Cohesion: 0.17
Nodes (11): labelsFor(), TableIndex, RoutineParameter, 1. Qué se muestra, 2. Datos, 3. Rendimiento, 4. Orden, 5. Hecho (2026-09-27) (+3 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 103 - "postgres/src/version.rs"
Cohesion: 0.15
Nodes (7): Capabilities, capabilities_by_version(), MIN_MAJOR, Capabilities, Self, String, ServerVersion

### Community 104 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.20
Nodes (12): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+4 more)

### Community 107 - "sqlParameterHints.ts"
Cohesion: 0.19
Nodes (8): callHints(), RoutineIndex, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig, parameterHints

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
Cohesion: 0.33
Nodes (5): 1. Recordar la ventana — ✅, json, main(), Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

### Community 114 - "sqlStatementIndex.test.ts"
Cohesion: 0.23
Nodes (9): nextStart(), previousEnd(), sqlLexical, statementsIn(), statementTextAt(), indexed(), LEXICALS, PIECES (+1 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "vitest"
Cohesion: 0.27
Nodes (6): initials(), luminance(), readableTextColor(), ENGINES, slice(), vitest

### Community 117 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

### Community 118 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 119 - "reorder.ts"
Cohesion: 0.33
Nodes (4): reorderResultTabs(), moveItem(), reorderable(), ReorderParams

### Community 120 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **468 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+463 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 887 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `sqlSchema.ts`, `theme.ts`, `sqlRelations.ts`, `explorerTree.ts`, `sqlDiagnostics.ts`, `package.json`, `i18n/index.ts`, `sqlAnalysis.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `sqlCallHints.ts`, `resultEditing.ts`, `contract.test.ts`, `focusZones.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `lib/types.ts`, `connectionTest.ts`, `filterBuilder.ts`, `gridClipboard.ts`, `sqlContext.ts`, `largeDocuments.test.ts`, `queryHistory.ts`, `pinnedResults.ts`, `sqlStatements.ts`, `invoke`, `resultEdits.ts`, `svelte`, `ExportDialog.svelte`, `gridFind.ts`, `sqlFormatter.ts`, `queryConsoles.test.ts`, `sqlStatementIndex.test.ts`, `sqlPreviewFormat.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `sqlSchema.ts`, `queryConsoles.ts`, `theme.ts`, `sqlFiles.ts`, `connection.ts`, `package.json`, `i18n/index.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `ResultPager.svelte`, `focusZones.ts`, `ResultPane.svelte`, `sidebarLayout.ts`, `FileTree.svelte`, `editorSettings.ts`, `queryHistory.ts`, `pinnedResults.ts`, `sqlFolders.ts`, `tooltip.ts`, `resultEdits.ts`, `iconOptics.ts`, `queryConsoles.test.ts`, `reorder.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `src-tauri/src/lib.rs`, `result_editing.rs`, `AppState`, `export.rs`, `pagination.rs`, `parser.rs`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `DestructiveClassification`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _468 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._