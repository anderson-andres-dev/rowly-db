# Graph Report - khipu  (2026-10-01)

## Corpus Check
- 333 files · ~418,795 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3398 nodes · 7707 edges · 173 communities (157 shown, 16 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 281 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5486f29`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- assembly.rs
- postgres/src/lib.rs
- sqlFiles.ts
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- DbConnector
- real_server.rs
- tauri.conf.json
- replace.ts
- sqlDefinitionLink.ts
- Engine
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatements.ts
- src-tauri/src/lib.rs
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- svelte
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
- String
- FindBar
- tooltip.ts
- ResultPager.svelte
- sqlParameterTypes.ts
- resultEditing.ts
- pagination.rs
- focusZones.ts
- Borrador: copiado de resultados de consulta
- diagnostics.rs
- editing.rs
- updates.rs
- connection_error.rs
- stores/shortcuts.ts
- sqlWriting.test.ts
- sqlFormatLayout.ts
- sqlExecutionMarker.ts
- sqlStatementIndex.ts
- cellTypes.ts
- lib/types.ts
- @codemirror/state
- messages/index.ts
- connectionTest.ts
- ConnectionDriver
- gridClipboard.ts
- reorder.ts
- columnFilters.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- filterBuilder.ts
- i18n/index.ts
- Message
- queryHistory.ts
- render-site.py
- findBar.ts
- AppState
- sidebarLayout.ts
- v0.2.0 — Pulido de la experiencia
- theme.ts
- sqlEditorBehavior.ts
- resultEdits.ts
- Dialect
- queryParameters.ts
- notifications.ts
- AnalysisRunner
- pinnedResults.ts
- QueryExecutionOptions
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- 3. Arquitectura
- invoke
- classify_sql_with
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- vitest
- 3. Piezas
- .execute_query
- gridFind.ts
- sqlDiagnostics.ts
- FileTree.svelte
- Workspace.svelte
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- jsonHighlight.ts
- ActiveConnection
- commands.ts
- DestructiveClassification
- ConnectFailure
- error_position.rs
- SortKey
- SqlEditor.svelte
- ResultPane.svelte
- sqlIndentation.ts
- backendKeys.test.ts
- MySqlConnector
- PostgresConnector
- dialogMotion.ts
- sqlParameterHints.ts
- Diagnostic
- Vec
- RawStatement<'q>
- RawStatement<'q>
- +layout.svelte
- super
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- @codemirror/view
- corpus.rs
- sqlCatalogCompletions.ts
- sqlPreviewFormat.ts
- TransactionError
- catalog.rs
- Option
- editorSearchPanel.ts
- DataGrid.svelte
- 6. Manejar la app
- focusZones.keys.test.ts
- contract.test.ts
- ref_app
- installFocusZones
- sqlPaste.ts
- resultPaging.ts
- Diagnósticos en el editor — diseño (tarea 4)
- svelte
- 4. Ejemplos con errores reales
- connectionIdentity.ts
- pinnedTables.ts
- queryConsoles.test.ts
- 8. Interfaz
- 1. Arquitectura
- up.sh script
- FindBarActions
- 1. Qué se ve
- 7. Entorno de la conexión — 🧪
- Test databases
- Bases de datos de prueba
- PartValue
- .fmt
- 11. Scripts de varias sentencias — ✅
- 13. Modelo de foco por teclado — ✅
- 8. Historial de consultas — ✅
- 9. Hoja de atajos — ✅
- mysqlconnector
- postgresconnector

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 84 edges
2. `vitest` - 72 edges
3. `Message` - 71 edges
4. `svelte` - 40 edges
5. `analyze_statement()` - 37 edges
6. `Diagnostic` - 31 edges
7. `@codemirror/state` - 29 edges
8. `buildCompletionSource()` - 28 edges
9. `AppState` - 24 edges
10. `Engine` - 23 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `7. Pulido del análisis (2026-09-29)` --references--> `created()`  [INFERRED]
  docs/specs/v0.2-diagnosticos.md → app/src/lib/sqlCreatedTables.test.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (173 total, 16 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (44): a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify_selection(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation() (+36 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.11
Nodes (34): async_trait, config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_for_bad_sql() (+26 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.15
Nodes (29): config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql(), execute_query_returns_result_set_with_null_and_types() (+21 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.11
Nodes (29): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+21 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.08
Nodes (52): sqlTokens(), aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, relationRef() (+44 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode, RelationKind (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (39): isFilterOperator(), activateQueryConsole(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+31 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.05
Nodes (46): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+38 more)

### Community 9 - "DbConnector"
Cohesion: 0.18
Nodes (13): DbConnector, DriverError, QueryColumn, QueryExecutionResult, RowSink, ConnectionErrorKind, Formatter, Future (+5 more)

### Community 10 - "real_server.rs"
Cohesion: 0.12
Nodes (31): entries(), is_error(), Vec, attacks_corpus(), common_valid_ddl_and_dml_is_never_objected_to(), Entry, FRAGMENTS_MYSQL, FRAGMENTS_PG (+23 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "replace.ts"
Cohesion: 0.70
Nodes (4): preserveCase(), replaceEverything(), replacementFor(), matchesIn()

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "Engine"
Cohesion: 0.12
Nodes (24): admin(), classification(), classification_with(), Conn, Engine, .ALL, error_text(), ConnectionConfig (+16 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (29): activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult, connectToProfile(), databaseExplorer (+21 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (22): description, license, name, type, version, OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE (+14 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatements.ts"
Cohesion: 0.07
Nodes (42): LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts(), statementNear(), split(), ALL_COLUMNS_AFTER (+34 more)

### Community 21 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (37): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), create_sql_file(), DEFAULT_QUERY_ROW_LIMIT, delete_connection_password(), execute_query(), ExecuteQueryResponse (+29 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.20
Nodes (17): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+9 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.06
Nodes (61): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), COLUMNS_SQL, event_row(), EVENTS_SQL (+53 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "svelte"
Cohesion: 0.07
Nodes (15): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), CONNECTION_COLORS (+7 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.52
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

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
Cohesion: 0.11
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (22): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+14 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (16): Checker<'a, '_>, output_columns(), Expr, Ident, ObjectName, Query, SetExpr, Statement (+8 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.15
Nodes (7): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t()

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.08
Nodes (38): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+30 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (21): ast, statement_is_read_only(), count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number() (+13 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.13
Nodes (20): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), onEscape(), onFocusIn(), onPointerDown() (+12 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.07
Nodes (43): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+35 more)

### Community 54 - "editing.rs"
Cohesion: 0.09
Nodes (49): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+41 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (66): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+58 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 57 - "stores/shortcuts.ts"
Cohesion: 0.15
Nodes (15): runCommand(), runFirstCommand(), handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS (+7 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.11
Nodes (27): catalogPosition, complete(), schemas, applyAndRecord(), buildFkIndex(), buildSqlSchema(), currentStatement(), dialectFor() (+19 more)

### Community 59 - "sqlFormatLayout.ts"
Cohesion: 0.32
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.09
Nodes (23): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+15 more)

### Community 61 - "sqlStatementIndex.ts"
Cohesion: 0.08
Nodes (35): doc, indexedState(), text, advance(), applyChanges(), backgroundIndexer, build(), hasTerminatedEnd() (+27 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "lib/types.ts"
Cohesion: 0.10
Nodes (26): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+18 more)

### Community 65 - "@codemirror/state"
Cohesion: 0.14
Nodes (11): click(), findArea(), findRow(), mount(), replaceAll(), replaceArea(), replaceRow(), select() (+3 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (22): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+14 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.10
Nodes (21): indexOf(), ConnectionDriver, getDriver(), Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres (+13 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.18
Nodes (18): CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines(), parseClipboard() (+10 more)

### Community 70 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.13
Nodes (19): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+11 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.08
Nodes (24): 2. La memoria (`crates/memory`), 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, Agente abierto desde fuera, Anexo A. Reglas de escritura, memoria y app (borrador), Asistente integrado con memoria de negocio — diseño, `base.md` (+16 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.16
Nodes (17): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+9 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.15
Nodes (18): interpolate(), loadPreference(), locale, localePreference, lookup(), MessageParams, numberFormat, systemLocale() (+10 more)

### Community 76 - "Message"
Cohesion: 0.19
Nodes (25): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+17 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "render-site.py"
Cohesion: 0.15
Nodes (12): datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, json, os, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, pathlib (+4 more)

### Community 79 - "findBar.ts"
Cohesion: 0.24
Nodes (18): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+10 more)

### Community 80 - "AppState"
Cohesion: 0.21
Nodes (23): analyze_sql(), apply_result_changes(), AppState, cancel_query(), connect(), count_query_rows(), database_explorer(), disconnect() (+15 more)

### Community 81 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.12
Nodes (16): 10. Cancelar una consulta larga — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, Estado (+8 more)

### Community 83 - "theme.ts"
Cohesion: 0.06
Nodes (45): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+37 more)

### Community 84 - "sqlEditorBehavior.ts"
Cohesion: 0.27
Nodes (9): typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.23
Nodes (13): PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE, patch() (+5 more)

### Community 86 - "Dialect"
Cohesion: 0.08
Nodes (19): MYSQL, ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), MARIADB_UNPARSED (+11 more)

### Community 87 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 88 - "notifications.ts"
Cohesion: 0.18
Nodes (14): dismissNotice(), notice, notifyError(), notifySuccess(), show(), flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole (+6 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.10
Nodes (13): AnalysisRunner, merge(), subtract(), runner(), query(), 2b. Cómo aprende quién es, 5. Guardarraíles de datos, 9. Subtareas (+5 more)

### Community 90 - "pinnedResults.ts"
Cohesion: 0.26
Nodes (10): tabExists(), addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+2 more)

### Community 91 - "QueryExecutionOptions"
Cohesion: 0.18
Nodes (21): QueryExecutionOptions, cancelled_before_start(), execute_on_connection(), ExecutionOutcome, is_unsupported_in_prepared_protocol(), mysql_cell_to_query_value(), mysql_error_to_result(), RawStatement (+13 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (15): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+7 more)

### Community 95 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 96 - "invoke"
Cohesion: 0.12
Nodes (19): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+11 more)

### Community 97 - "classify_sql_with"
Cohesion: 0.20
Nodes (28): Cow, after_handler_conditions(), classify_by_structure(), classify_routine(), classify_sql_with(), classify_text(), classify_unparsed(), do_block_changes_data() (+20 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "vitest"
Cohesion: 0.13
Nodes (21): ENGINES, slice(), format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure (+13 more)

### Community 104 - "3. Piezas"
Cohesion: 0.11
Nodes (18): flush(), type(), statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 1. Qué pasa hoy (+10 more)

### Community 105 - ".execute_query"
Cohesion: 0.25
Nodes (11): cancelled_before_start(), ExecutionOutcome, postgres_error_to_result(), RawStatement, From, Future, Output, Pin (+3 more)

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (43): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), charToUtf16() (+35 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.08
Nodes (21): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), ContextMenuItem, child() (+13 more)

### Community 109 - "Workspace.svelte"
Cohesion: 0.17
Nodes (4): close(), labelForKey(), $t(), at()

### Community 110 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.18
Nodes (10): TableIndex, 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, 7. Hecho (2026-09-27) (+2 more)

### Community 111 - "jsonHighlight.ts"
Cohesion: 0.28
Nodes (9): detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS, highlightSql() (+1 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.22
Nodes (15): ActiveConnection, build_catalog(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap, SchemaObjects (+7 more)

### Community 113 - "commands.ts"
Cohesion: 0.22
Nodes (12): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+4 more)

### Community 114 - "DestructiveClassification"
Cohesion: 0.21
Nodes (15): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_set_expr() (+7 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "SortKey"
Cohesion: 0.29
Nodes (6): nextSort(), PageRequest, QueryExecutionState, QueryExecutionResult, ResultPage, SortKey

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.13
Nodes (7): writeClipboard(), writeClipboardText(), createdTables(), lastPart(), created(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 119 - "ResultPane.svelte"
Cohesion: 0.07
Nodes (13): allState, style, active, danger, submit, executionLog, LogEntry, LogKind (+5 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.27
Nodes (12): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+4 more)

### Community 121 - "backendKeys.test.ts"
Cohesion: 0.50
Nodes (3): ENGINE_SOURCES, ref_node_fs, ref_node_path

### Community 122 - "MySqlConnector"
Cohesion: 0.29
Nodes (9): MySqlConnector, DriverError, MySqlRow, Result, SchemaObjects, ServerVersion, String, Vec (+1 more)

### Community 123 - "PostgresConnector"
Cohesion: 0.25
Nodes (8): PostgresConnector, DriverError, Result, SchemaObjects, ServerVersion, String, TlsStatus, Vec

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "sqlParameterHints.ts"
Cohesion: 0.20
Nodes (7): RoutineIndex, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig, parameterHints

### Community 126 - "Diagnostic"
Cohesion: 0.19
Nodes (33): at_token(), Diagnostic, DiagnosticMessage, ends_expression(), friendly_syntax(), handler_action(), inspect_routine_chunk(), is_plain_name() (+25 more)

### Community 127 - "Vec"
Cohesion: 0.23
Nodes (13): catalog_cases(), CatalogView, check(), Checker, el_catalogo_en_cada_motor(), Expect, la_sintaxis_en_cada_motor(), mysql_select_into_errors() (+5 more)

### Community 128 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, MySql

### Community 129 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 130 - "+layout.svelte"
Cohesion: 0.08
Nodes (22): initLocaleEffects(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText(), onePerFrame(), frames (+14 more)

### Community 131 - "super"
Cohesion: 0.21
Nodes (6): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, super

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.10
Nodes (24): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+16 more)

### Community 135 - "@codemirror/view"
Cohesion: 0.17
Nodes (7): MAX_COUNTED, exclusionMarks, NewlineMarker, newlineMarkers, exclusionField, @codemirror/search, @codemirror/view

### Community 136 - "corpus.rs"
Cohesion: 0.20
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 137 - "sqlCatalogCompletions.ts"
Cohesion: 0.22
Nodes (11): buildCatalogCompletions(), COMMON_FUNCTIONS, Entry, insert(), MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS, prefixStartForNames() (+3 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "TransactionError"
Cohesion: 0.25
Nodes (5): ConnectionConfig, Self, TlsMode, TransactionError, Debug

### Community 140 - "catalog.rs"
Cohesion: 0.23
Nodes (10): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, CatalogTable, Option, String, Vec (+2 more)

### Community 141 - "Option"
Cohesion: 0.12
Nodes (23): byte_offset(), closest_keyword(), closest_names(), distance(), expected_found(), join_constraint(), max_distance(), offset_at() (+15 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.13
Nodes (27): createMatchCounter(), createSession(), addExclusion, clearExclusions, filteredQuery(), inScope(), isExcluded(), matchFilter() (+19 more)

### Community 143 - "DataGrid.svelte"
Cohesion: 0.32
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 144 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 145 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 146 - "contract.test.ts"
Cohesion: 0.33
Nodes (6): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError

### Community 147 - "ref_app"
Cohesion: 0.33
Nodes (5): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS, ref_app

### Community 148 - "installFocusZones"
Cohesion: 0.52
Nodes (7): installFocusZones(), isPrefix(), onKeydown(), onKeyup(), onWindowBlur(), stopMoving(), swallow()

### Community 149 - "sqlPaste.ts"
Cohesion: 0.53
Nodes (5): codeChar(), IDENTIFIER_CLOSE, isWordChar(), normalizePastedSql(), quotedEnd()

### Community 150 - "resultPaging.ts"
Cohesion: 0.33
Nodes (6): clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE, load(), MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS

### Community 151 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.29
Nodes (5): 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, 7. Pulido del análisis (2026-09-29), Diagnósticos en el editor — diseño (tarea 4)

### Community 152 - "svelte"
Cohesion: 0.19
Nodes (10): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle(), invoke, release (+2 more)

### Community 153 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 154 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 155 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 156 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 157 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 158 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 161 - "1. Qué se ve"
Cohesion: 0.50
Nodes (4): 1. Qué se ve, Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 162 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 163 - "Test databases"
Cohesion: 0.50
Nodes (3): Server tests, Test databases, Use

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.50
Nodes (3): Bases de datos de prueba, Pruebas contra servidor, Uso

### Community 167 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 168 - "13. Modelo de foco por teclado — ✅"
Cohesion: 0.67
Nodes (3): 13. Modelo de foco por teclado — ✅, Decisión, Problema

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **627 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+622 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1131 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `gridNavigation.ts`, `sqlCallHints.ts`, `sqlSchema.ts`, `sqlPreviewFormat.ts`, `focusZones.keys.test.ts`, `package.json`, `contract.test.ts`, `sqlStatements.ts`, `connection.ts`, `svelte`, `connectionIdentity.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sqlExecutionMarker.ts`, `sqlStatementIndex.ts`, `cellTypes.ts`, `lib/types.ts`, `@codemirror/state`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sidebarLayout.ts`, `theme.ts`, `sqlEditorBehavior.ts`, `resultEdits.ts`, `queryParameters.ts`, `pinnedResults.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `jsonHighlight.ts`, `commands.ts`, `SortKey`, `SqlEditor.svelte`, `sqlIndentation.ts`, `backendKeys.test.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `classify_sql_with`, `corpus.rs`, `export.rs`, `Engine`, `ActiveConnection`, `DestructiveClassification`, `pagination.rs`, `src-tauri/src/lib.rs`, `editing.rs`, `drivers.rs`, `diagnostics.rs`, `Diagnostic`, `Vec`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `ConnectionDriver` connect `ConnectionDriver` to `engines/index.ts`, `connectionProfiles.ts`, `filterBuilder.ts`, `connection.ts`, `contract.test.ts`, `svelte`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _627 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._