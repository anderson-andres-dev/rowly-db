# Graph Report - khipu  (2026-10-01)

## Corpus Check
- 318 files · ~404,202 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 3286 nodes · 7383 edges · 161 communities (147 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 261 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac1d2eb3`
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
- text_encoding.rs
- tauri.conf.json
- replace.ts
- sqlDefinitionLink.ts
- notifications.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatements.ts
- Message
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
- editorSearchPanel.dom.test.ts
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
- sql_files.rs
- queryHistory.ts
- render-site.py
- findBar.ts
- src-tauri/src/lib.rs
- sidebarLayout.ts
- v0.2.0 — Pulido de la experiencia
- theme.ts
- sqlEditorBehavior.ts
- resultEdits.ts
- Dialect
- svelte
- reportPersistFailure
- AnalysisRunner
- pinnedResults.ts
- mysql/src/tls.rs
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- Diagnósticos en el editor — diseño (tarea 4)
- invoke
- classify_sql
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- sqlFormatter.ts
- parser.rs
- ColumnFilterPopover.svelte
- gridFind.ts
- sqlDiagnostics.ts
- sqlFolders.ts
- FileTree.svelte
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- ExportDialog.svelte
- ActiveConnection
- commands.ts
- DestructiveClassification
- ConnectFailure
- error_position.rs
- queryExecution.ts
- SqlEditor.svelte
- Workspace.svelte
- sqlIndentation.ts
- vitest
- result_editing.rs
- svelte.config.js
- dialogMotion.ts
- sqlParameterHints.ts
- Vec
- sqlRelations.ts
- serde
- vite.config.js
- +layout.svelte
- QueryCancel
- webkit_env.rs
- gridNavigation.ts
- contract.test.ts
- @codemirror/view
- corpus.rs
- sqlCatalogCompletions.ts
- sqlPreviewFormat.ts
- .execute_query_cancellable
- super
- .new
- editorSearchPanel.ts
- DataGrid.svelte
- currentQueryConsole
- focusZones.keys.test.ts
- numpadKeys.ts
- appendConsole
- installFocusZones
- sqlPaste.ts
- closest_names
- iconOptics.ts
- gridSettings.ts
- DiagnosticMessage
- connectionIdentity.ts
- pinnedTables.ts
- queryConsoles.test.ts
- StatusGutterMarker
- .fmt

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 75 edges
2. `vitest` - 72 edges
3. `Message` - 71 edges
4. `svelte` - 40 edges
5. `analyze_statement()` - 35 edges
6. `Diagnostic` - 30 edges
7. `@codemirror/state` - 29 edges
8. `buildCompletionSource()` - 28 edges
9. `AppState` - 24 edges
10. `SqlProfile` - 22 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `7. Pulido del análisis (2026-09-29)` --references--> `created()`  [INFERRED]
  docs/specs/v0.2-diagnosticos.md → app/src/lib/sqlCreatedTables.test.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `deleteConnectionProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (161 total, 14 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (34): accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation() (+26 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (66): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+58 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (57): cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql() (+49 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.15
Nodes (22): finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole() (+14 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.09
Nodes (42): aliasFor(), initials(), relationRef(), afterCompleteCondition(), buildCompletionSource(), buildKeywordCompletion(), catalogTable(), COLUMN_TYPES (+34 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (26): async_trait, CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+18 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (35): tabExists(), isFilterOperator(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle(), diskTexts (+27 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.05
Nodes (46): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+38 more)

### Community 9 - "DbConnector"
Cohesion: 0.18
Nodes (9): ConnectionConfig, DbConnector, DriverError, ConnectionErrorKind, Formatter, Result, TlsMode, Debug (+1 more)

### Community 10 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "replace.ts"
Cohesion: 0.24
Nodes (10): preserveCase(), replaceEverything(), replacementFor(), ReplaceOptions, createSession(), SearchSession, filteredQuery(), matchesIn() (+2 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "notifications.ts"
Cohesion: 0.21
Nodes (11): confirmTrash(), pickSqlFolder(), trashSqlFile(), dismissNotice(), notice, notifyError(), notifySuccess(), show() (+3 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (30): activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult, connectToProfile(), databaseExplorer (+22 more)

### Community 18 - "package.json"
Cohesion: 0.13
Nodes (14): description, license, name, type, version, codemirror, happy-dom, sql-formatter (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatements.ts"
Cohesion: 0.08
Nodes (40): scanInChunks(), texts(), ScanResult, ALL_COLUMNS_AFTER, ALWAYS_FOLLOWS_LEAD, blankLineIn(), BODY_WORDS, compiled (+32 more)

### Community 21 - "Message"
Cohesion: 0.18
Nodes (23): cancel_query(), classify_statements(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text() (+15 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.16
Nodes (20): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+12 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.15
Nodes (35): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+27 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "svelte"
Cohesion: 0.08
Nodes (15): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), CONNECTION_COLORS (+7 more)

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
Cohesion: 0.08
Nodes (17): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+9 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.12
Nodes (20): PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor() (+12 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.11
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.14
Nodes (20): Checker<'a, '_>, join_constraint(), output_columns(), Expr, Ident, ObjectName, Option, Query (+12 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.08
Nodes (38): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+30 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (21): ast, Statement, statement_is_read_only(), count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL (+13 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.13
Nodes (21): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), onEscape(), onFocusIn(), onPointerDown() (+13 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (55): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE, AFTER_MISSING_VALUE (+47 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (30): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+22 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 57 - "stores/shortcuts.ts"
Cohesion: 0.11
Nodes (19): commandDefinition, handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut (+11 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.11
Nodes (28): complete(), schemas, applyAndRecord(), buildFkIndex(), buildSqlSchema(), currentStatement(), dialectFor(), extractDefaultTable() (+20 more)

### Community 59 - "sqlFormatLayout.ts"
Cohesion: 0.34
Nodes (17): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+9 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.10
Nodes (23): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+15 more)

### Community 61 - "sqlStatementIndex.ts"
Cohesion: 0.08
Nodes (39): doc, indexedState(), text, LEXICALS, ONE_QUERY, SEVERAL, advance(), applyChanges() (+31 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "lib/types.ts"
Cohesion: 0.10
Nodes (26): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+18 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.10
Nodes (19): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+11 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (22): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+14 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.10
Nodes (20): indexOf(), ConnectionDriver, getDriver(), Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres (+12 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.13
Nodes (22): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+14 more)

### Community 70 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.14
Nodes (18): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+10 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.06
Nodes (35): 1. Arquitectura, 2. La memoria (`crates/memory`), 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, 8. Interfaz, Agente abierto desde fuera, Agentes soportados (+27 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.16
Nodes (17): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+9 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.15
Nodes (18): interpolate(), loadPreference(), locale, localePreference, lookup(), MessageParams, numberFormat, systemLocale() (+10 more)

### Community 76 - "sql_files.rs"
Cohesion: 0.23
Nodes (21): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+13 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "render-site.py"
Cohesion: 0.15
Nodes (12): datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, json, os, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, pathlib (+4 more)

### Community 79 - "findBar.ts"
Cohesion: 0.20
Nodes (18): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+10 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (40): a_script_is_checked_statement_by_statement(), analyze_sql(), apply_result_changes(), AppState, check_statement(), connect(), count_query_rows(), database_explorer() (+32 more)

### Community 81 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.07
Nodes (29): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+21 more)

### Community 83 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 84 - "sqlEditorBehavior.ts"
Cohesion: 0.27
Nodes (9): typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.24
Nodes (12): PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EMPTY_STATE, patch(), resetResultEdits() (+4 more)

### Community 86 - "Dialect"
Cohesion: 0.11
Nodes (17): MYSQL, MYSQL, same_single_statement(), ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual() (+9 more)

### Community 87 - "svelte"
Cohesion: 0.13
Nodes (11): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), invoke, release, listed (+3 more)

### Community 88 - "reportPersistFailure"
Cohesion: 0.25
Nodes (9): flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole, queueDiskText(), reportPersistFailure(), textKey(), writeConsoles(), writeDiskTexts() (+1 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.08
Nodes (19): AnalysisRunner, merge(), subtract(), runner(), query(), statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27) (+11 more)

### Community 90 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 91 - "mysql/src/tls.rs"
Cohesion: 0.10
Nodes (20): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+12 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.16
Nodes (16): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+8 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.08
Nodes (23): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+15 more)

### Community 96 - "invoke"
Cohesion: 0.18
Nodes (13): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+5 more)

### Community 97 - "classify_sql"
Cohesion: 0.29
Nodes (19): Cow, after_handler_conditions(), classify_destructive_sql(), classify_routine(), classify_sql(), classify_text(), expand_executable_comments(), line_end() (+11 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.12
Nodes (20): catalogPosition, completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame() (+12 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.17
Nodes (16): upperOperatorWords(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult, formatSqlText() (+8 more)

### Community 104 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (43): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), charToUtf16() (+35 more)

### Community 108 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (12): folderMenuItems(), startCreate(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT (+4 more)

### Community 109 - "FileTree.svelte"
Cohesion: 0.14
Nodes (7): active, fileMenuItems(), requestTrash(), startRename(), close(), ContextMenuItem, child()

### Community 110 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.18
Nodes (10): TableIndex, 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, 7. Hecho (2026-09-27) (+2 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.22
Nodes (15): ActiveConnection, build_catalog(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap, SchemaObjects (+7 more)

### Community 113 - "commands.ts"
Cohesion: 0.23
Nodes (14): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+6 more)

### Community 114 - "DestructiveClassification"
Cohesion: 0.22
Nodes (14): AlterTableOperation, classify(), classify_alter_table(), classify_drop(), classify_production(), classify_query(), classify_selection(), classify_set_expr() (+6 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "queryExecution.ts"
Cohesion: 0.18
Nodes (9): nextSort(), cancelQuery(), executeQuery(), PageRequest, StatementCheck, PendingQueryConfirmation, DestructiveStatement, ExecuteQueryResponse (+1 more)

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.13
Nodes (7): writeClipboard(), writeClipboardText(), createdTables(), lastPart(), created(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 119 - "Workspace.svelte"
Cohesion: 0.07
Nodes (14): active, danger, submit, labelForKey(), $t(), executionLog, LogEntry, LogKind (+6 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.30
Nodes (11): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+3 more)

### Community 121 - "vitest"
Cohesion: 0.21
Nodes (8): ENGINES, ENGINE_SOURCES, slice(), format(), formatSqlBlock(), ref_node_fs, ref_node_path, vitest

### Community 122 - "result_editing.rs"
Cohesion: 0.27
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+11 more)

### Community 123 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "sqlParameterHints.ts"
Cohesion: 0.20
Nodes (7): RoutineIndex, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig, parameterHints

### Community 126 - "Vec"
Cohesion: 0.27
Nodes (26): at_token(), Diagnostic, ends_expression(), handler_action(), inspect_routine_chunk(), is_value(), key(), keyword_text() (+18 more)

### Community 127 - "sqlRelations.ts"
Cohesion: 0.23
Nodes (11): Token, END_FROM_LIST, isName(), nameOf(), NOT_ALIAS, StatementRelation, statementRelations(), takenNames() (+3 more)

### Community 128 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 129 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 130 - "+layout.svelte"
Cohesion: 0.10
Nodes (19): initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens (+11 more)

### Community 131 - "QueryCancel"
Cohesion: 0.23
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "contract.test.ts"
Cohesion: 0.09
Nodes (29): Fixture, FIXTURES, ORDERS, PROFILES, USERS, buildRoutineIndex(), CallArgument, callHints() (+21 more)

### Community 135 - "@codemirror/view"
Cohesion: 0.18
Nodes (6): MAX_COUNTED, exclusionMarks, NewlineMarker, newlineMarkers, @codemirror/search, @codemirror/view

### Community 136 - "corpus.rs"
Cohesion: 0.29
Nodes (12): catalog(), check(), created(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos(), CatalogTable, String (+4 more)

### Community 137 - "sqlCatalogCompletions.ts"
Cohesion: 0.29
Nodes (9): buildCatalogCompletions(), COMMON_FUNCTIONS, Entry, insert(), MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS, prefixStartForNames() (+1 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - ".execute_query_cancellable"
Cohesion: 0.44
Nodes (5): RowSink, Future, Output, Pin, Send

### Community 140 - "super"
Cohesion: 0.10
Nodes (19): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), Capabilities, MIN_MAJOR, CatalogColumn (+11 more)

### Community 141 - ".new"
Cohesion: 0.16
Nodes (14): byte_offset(), offset_at(), Position, postgres_opaque_definition(), Repaired<'a>, From, Self, split_location() (+6 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.13
Nodes (25): createMatchCounter(), addExclusion, clearExclusions, exclusionField, inScope(), isExcluded(), matchFilter(), Range (+17 more)

### Community 143 - "DataGrid.svelte"
Cohesion: 0.32
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 144 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

### Community 145 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 146 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 147 - "appendConsole"
Cohesion: 0.29
Nodes (8): activateQueryConsole(), appendConsole(), createId(), createQueryConsole(), ensureQueryConsole(), nextConsoleOrdinal(), openSqlFileConsole(), openTableConsole()

### Community 148 - "installFocusZones"
Cohesion: 0.52
Nodes (7): installFocusZones(), isPrefix(), onKeydown(), onKeyup(), onWindowBlur(), stopMoving(), swallow()

### Community 149 - "sqlPaste.ts"
Cohesion: 0.53
Nodes (5): codeChar(), IDENTIFIER_CLOSE, isWordChar(), normalizePastedSql(), quotedEnd()

### Community 150 - "closest_names"
Cohesion: 0.40
Nodes (6): closest_keyword(), closest_names(), distance(), max_distance(), Item, Iterator

### Community 151 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 152 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 153 - "DiagnosticMessage"
Cohesion: 0.40
Nodes (6): DiagnosticMessage, expected_found(), friendly_syntax(), is_simple_token(), BTreeMap, unterminated()

### Community 154 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 155 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 156 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **615 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+610 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1108 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `gridNavigation.ts`, `contract.test.ts`, `sqlPreviewFormat.ts`, `editorSearchPanel.ts`, `focusZones.keys.test.ts`, `package.json`, `numpadKeys.ts`, `sqlStatements.ts`, `connection.ts`, `gridSettings.ts`, `connectionIdentity.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sqlExecutionMarker.ts`, `sqlStatementIndex.ts`, `cellTypes.ts`, `lib/types.ts`, `editorSearchPanel.dom.test.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sidebarLayout.ts`, `theme.ts`, `sqlEditorBehavior.ts`, `resultEdits.ts`, `svelte`, `pinnedResults.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `ExportDialog.svelte`, `commands.ts`, `queryExecution.ts`, `SqlEditor.svelte`, `sqlIndentation.ts`, `dialogMotion.ts`, `sqlRelations.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `classify_sql`, `parser.rs`, `corpus.rs`, `export.rs`, `.new`, `src-tauri/src/lib.rs`, `ActiveConnection`, `DestructiveClassification`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `result_editing.rs`, `Vec`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `sqlFiles.ts`, `queryConsoles.ts`, `notifications.ts`, `connection.ts`, `package.json`, `iconOptics.ts`, `gridSettings.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `focusZones.ts`, `stores/shortcuts.ts`, `gridClipboard.ts`, `reorder.ts`, `editorSettings.ts`, `i18n/index.ts`, `queryHistory.ts`, `findBar.ts`, `sidebarLayout.ts`, `theme.ts`, `resultEdits.ts`, `pinnedResults.ts`, `sqlFolders.ts`, `Workspace.svelte`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _615 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08416389811738649 - nodes in this community are weakly interconnected._