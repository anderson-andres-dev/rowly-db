# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 333 files · ~419,793 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3401 nodes · 7710 edges · 175 communities (160 shown, 15 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 281 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `817354e8`
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
- result_editing.rs
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatements.ts
- classify_sql_with
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
- 3. Piezas
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
- mysql/src/tls.rs
- sqlExecutionMarker.ts
- sqlFormatLayout.ts
- cellTypes.ts
- explorerTree.ts
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
- codemirrorTheme.ts
- @codemirror/state
- resultEdits.ts
- Dialect
- svelte
- notifications.ts
- AnalysisRunner
- pinnedResults.ts
- theme.ts
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- Diagnósticos en el editor — diseño (tarea 4)
- invoke
- ParserError
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- sqlFormatter.ts
- postgres/src/tls.rs
- PostgresConnector
- gridFind.ts
- sqlDiagnostics.ts
- FileTree.svelte
- palettes.test.ts
- .connect
- ExportDialog.svelte
- ActiveConnection
- commands.ts
- DestructiveClassification
- ConnectFailure
- super
- lib/types.ts
- SqlEditor.svelte
- Workspace.svelte
- sqlIndentation.ts
- createSearchPanel
- installFocusZones
- gridWindow.test.ts
- dialogMotion.ts
- ColumnFilterPopover.svelte
- syntax_diagnostic
- session.ts
- numpadKeys.ts
- closest_names
- +layout.svelte
- QueryCancel
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- NewlineMarker
- corpus.rs
- ref_app
- vitest
- parser.rs
- khipu_driver_core
- Vec
- editorSearchPanel.ts
- DataGrid.svelte
- .run_query
- focusZones.keys.test.ts
- contract.test.ts
- RawStatement<'q>
- apply
- apply
- SchemaTree.svelte
- 5. Hecho
- gridSettings.ts
- @codemirror/view
- appendConsole
- pinnedTables.ts
- queryConsoles.test.ts
- 6. Manejar la app
- parseConsole
- up.sh script
- FindBarActions
- join_constraint
- Anexo A. Reglas de escritura, memoria y app (borrador)
- Test databases
- Bases de datos de prueba
- 5. Guardarraíles de datos
- Message
- 2. La memoria (`crates/memory`)
- 8. Interfaz
- 1. Arquitectura
- .remember
- mysqlconnector
- postgresconnector
- currentQueryConsole
- .fmt

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
- `Implementado` --references--> `deleteConnectionProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (175 total, 15 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (44): a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify_selection(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation() (+36 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (71): QueryExecutionOptions, TransactionStatement, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS (+63 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.19
Nodes (18): config_from_env(), CONNECT_TIMEOUT, execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql(), execute_query_returns_result_set_with_null_and_types(), execute_query_truncates_at_max_rows(), ExecutionOutcome (+10 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.13
Nodes (25): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+17 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.06
Nodes (71): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS (+63 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (28): async_trait, CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo (+20 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.10
Nodes (27): StatementCheck, beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE, EMPTY_STATE (+19 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.05
Nodes (46): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+38 more)

### Community 9 - "DbConnector"
Cohesion: 0.15
Nodes (12): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Output, Pin (+4 more)

### Community 10 - "real_server.rs"
Cohesion: 0.07
Nodes (55): admin(), classification(), classification_with(), Conn, Engine, .ALL, entries(), error_text() (+47 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "result_editing.rs"
Cohesion: 0.08
Nodes (40): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+32 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.09
Nodes (34): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult (+26 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (21): description, license, name, type, version, OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE (+13 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatements.ts"
Cohesion: 0.05
Nodes (76): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts() (+68 more)

### Community 21 - "classify_sql_with"
Cohesion: 0.23
Nodes (12): a_script_is_checked_statement_by_statement(), check_statement(), in_production_every_write_needs_confirmation(), Cow, classify_sql_with(), double_backslashes(), expand_executable_comments(), GuardOptions (+4 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.20
Nodes (17): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+9 more)

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
Cohesion: 0.52
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "3. Piezas"
Cohesion: 0.18
Nodes (10): 1. Qué pasa hoy, 2. La regla, 3. Piezas, 4. Orden, A. Grid virtualizado por tramos (la base), B. Sidebar y splitter, C. Efectos caros fuera, E. WebKitGTK en Linux (+2 more)

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
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (16): Checker<'a, '_>, output_columns(), Expr, Ident, ObjectName, Query, SetExpr, Statement (+8 more)

### Community 45 - "FindBar"
Cohesion: 0.17
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.16
Nodes (6): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t()

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.08
Nodes (38): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+30 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (20): ast, statement_is_read_only(), count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number() (+12 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.17
Nodes (14): Direction, DIRECTIONS, flash(), focusZone(), isUsable(), lastFocused, moveFocus(), neighborZone() (+6 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (52): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+44 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (30): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+22 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 57 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (12): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys() (+4 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.12
Nodes (21): ENGINES, complete(), schemas, slice(), buildFkIndex(), buildSqlSchema(), dialectFor(), extractDefaultTable() (+13 more)

### Community 59 - "mysql/src/tls.rs"
Cohesion: 0.13
Nodes (14): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+6 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 61 - "sqlFormatLayout.ts"
Cohesion: 0.32
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.19
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.15
Nodes (12): click(), findArea(), findRow(), flush(), replaceAll(), replaceArea(), replaceRow(), select() (+4 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (23): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+15 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.11
Nodes (18): ConnectionDriver, Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real (+10 more)

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
Cohesion: 0.13
Nodes (19): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+11 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.17
Nodes (11): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, Agente abierto desde fuera, Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora) (+3 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.16
Nodes (17): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+9 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.17
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
Cohesion: 0.35
Nodes (13): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+5 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (42): analyze_sql(), apply_result_changes(), AppState, classify_statements(), connect(), count_query_rows(), database_explorer(), DEFAULT_QUERY_ROW_LIMIT (+34 more)

### Community 81 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.07
Nodes (29): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+21 more)

### Community 83 - "codemirrorTheme.ts"
Cohesion: 0.12
Nodes (17): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+9 more)

### Community 84 - "@codemirror/state"
Cohesion: 0.19
Nodes (13): createdTables(), lastPart(), created(), typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines() (+5 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (14): PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 86 - "Dialect"
Cohesion: 0.10
Nodes (18): MYSQL, MYSQL, ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual() (+10 more)

### Community 87 - "svelte"
Cohesion: 0.19
Nodes (9): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), invoke, release, listed (+1 more)

### Community 88 - "notifications.ts"
Cohesion: 0.20
Nodes (13): dismissNotice(), notice, notifyError(), notifySuccess(), show(), flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole (+5 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.18
Nodes (4): AnalysisRunner, merge(), subtract(), runner()

### Community 90 - "pinnedResults.ts"
Cohesion: 0.26
Nodes (10): tabExists(), addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+2 more)

### Community 91 - "theme.ts"
Cohesion: 0.16
Nodes (17): resolveScheme(), ThemeFamily, themeVariant, DEFAULT_THEME_CHOICE, editorPalette, effectiveScheme, initThemeEffects(), isSchemePreference() (+9 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (14): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+6 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.08
Nodes (23): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+15 more)

### Community 96 - "invoke"
Cohesion: 0.14
Nodes (16): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+8 more)

### Community 97 - "ParserError"
Cohesion: 0.35
Nodes (19): after_handler_conditions(), classify_by_structure(), classify_routine(), classify_text(), classify_unparsed(), do_block_changes_data(), parse_single_statement(), routine_error() (+11 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.11
Nodes (35): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+27 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.07
Nodes (32): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+24 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.16
Nodes (18): format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult, formatSqlBlock() (+10 more)

### Community 104 - "postgres/src/tls.rs"
Cohesion: 0.15
Nodes (11): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+3 more)

### Community 105 - "PostgresConnector"
Cohesion: 0.23
Nodes (9): connects_and_lists_schemas_and_tables_against_real_postgres(), PostgresConnector, DriverError, Result, SchemaObjects, ServerVersion, String, TlsStatus (+1 more)

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (43): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), charToUtf16() (+35 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.10
Nodes (19): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), pickSqlFolder(), closeSqlFolder() (+11 more)

### Community 109 - "palettes.test.ts"
Cohesion: 0.15
Nodes (12): contrast(), DARK_BEFORE, FAMILIES, LIGHT_COMMENT_MIN, LIGHT_FAMILIES, LIGHT_SYNTAX_MIN, luminance(), PORTED_DARK_FAMILIES (+4 more)

### Community 110 - ".connect"
Cohesion: 0.22
Nodes (13): config_with_tls(), expected_tls(), open_pool(), ConnectionConfig, Error, PgPool, Self, TlsMode (+5 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (10): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+2 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.24
Nodes (13): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, schemas_to_load() (+5 more)

### Community 113 - "commands.ts"
Cohesion: 0.21
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+7 more)

### Community 114 - "DestructiveClassification"
Cohesion: 0.21
Nodes (15): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_set_expr() (+7 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "super"
Cohesion: 0.21
Nodes (7): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS, super

### Community 117 - "lib/types.ts"
Cohesion: 0.11
Nodes (18): nextSort(), PageRequest, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent (+10 more)

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.15
Nodes (4): writeClipboard(), writeClipboardText(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 119 - "Workspace.svelte"
Cohesion: 0.07
Nodes (14): active, danger, submit, labelForKey(), $t(), executionLog, LogEntry, LogKind (+6 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.27
Nodes (12): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+4 more)

### Community 121 - "createSearchPanel"
Cohesion: 0.26
Nodes (10): searchMode, closeAndFocusEditor(), createSearchPanel(), renderMode(), mount(), dropSelectionPrefill(), editorSearch(), openInMode() (+2 more)

### Community 122 - "installFocusZones"
Cohesion: 0.26
Nodes (13): clearMark(), installFocusZones(), isPrefix(), onEscape(), onFocusIn(), onKeydown(), onKeyup(), onPointerDown() (+5 more)

### Community 123 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 126 - "syntax_diagnostic"
Cohesion: 0.18
Nodes (26): at_token(), DiagnosticMessage, ends_expression(), expected_found(), friendly_syntax(), handler_action(), is_plain_name(), is_value() (+18 more)

### Community 127 - "session.ts"
Cohesion: 0.36
Nodes (6): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf()

### Community 128 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 129 - "closest_names"
Cohesion: 0.29
Nodes (8): closest_keyword(), closest_names(), distance(), max_distance(), Item, split_location(), unknown_statement(), Iterator

### Community 130 - "+layout.svelte"
Cohesion: 0.09
Nodes (17): initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens (+9 more)

### Community 131 - "QueryCancel"
Cohesion: 0.23
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.06
Nodes (39): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+31 more)

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (14): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos() (+6 more)

### Community 137 - "ref_app"
Cohesion: 0.20
Nodes (8): clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE, load(), MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS, usage, ref_app

### Community 138 - "vitest"
Cohesion: 0.15
Nodes (15): initials(), luminance(), readableTextColor(), ENGINE_SOURCES, CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar() (+7 more)

### Community 139 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 140 - "khipu_driver_core"
Cohesion: 0.15
Nodes (14): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, CatalogForeignKey, CatalogTable (+6 more)

### Community 141 - "Vec"
Cohesion: 0.20
Nodes (24): byte_offset(), CatalogView, Checker, Diagnostic, inspect_routine_chunk(), mysql_routine_errors(), mysql_select_into_errors(), offset_at() (+16 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.14
Nodes (18): exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded(), matchFilter() (+10 more)

### Community 143 - "DataGrid.svelte"
Cohesion: 0.32
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 144 - ".run_query"
Cohesion: 0.35
Nodes (8): cancelled_before_start(), postgres_error_to_result(), RawStatement, Future, Output, Pin, QueryExecutionResult, Send

### Community 145 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 146 - "contract.test.ts"
Cohesion: 0.22
Nodes (11): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, codeChar(), IDENTIFIER_CLOSE (+3 more)

### Community 147 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 148 - "apply"
Cohesion: 0.40
Nodes (6): apply(), MySqlConnectOptions, Option, TlsMode, ssl_mode(), MySqlSslMode

### Community 149 - "apply"
Cohesion: 0.40
Nodes (6): apply(), Option, TlsMode, ssl_mode(), PgConnectOptions, PgSslMode

### Community 150 - "SchemaTree.svelte"
Cohesion: 0.22
Nodes (3): close(), ContextMenuItem, child()

### Community 151 - "5. Hecho"
Cohesion: 0.40
Nodes (5): 21a — Grid virtualizado por tramos (2026-09-28), 21b — Sidebar, splitter y blur (2026-09-28), 21c — WebKitGTK (2026-09-28), 21d — Columnas virtualizadas (2026-09-28), 5. Hecho

### Community 152 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 153 - "@codemirror/view"
Cohesion: 0.50
Nodes (3): createMatchCounter(), MAX_COUNTED, @codemirror/view

### Community 154 - "appendConsole"
Cohesion: 0.29
Nodes (8): activateQueryConsole(), appendConsole(), createId(), createQueryConsole(), ensureQueryConsole(), nextConsoleOrdinal(), openSqlFileConsole(), openTableConsole()

### Community 155 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 156 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 157 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 158 - "parseConsole"
Cohesion: 0.29
Nodes (7): isFilterOperator(), consoleTitle(), loadState(), parseCondition(), parseConsole(), parseTableTab(), isTextEncoding()

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 161 - "join_constraint"
Cohesion: 0.67
Nodes (3): join_constraint(), JoinConstraint, JoinOperator

### Community 162 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 163 - "Test databases"
Cohesion: 0.50
Nodes (3): Server tests, Test databases, Use

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.50
Nodes (3): Bases de datos de prueba, Pruebas contra servidor, Uso

### Community 165 - "5. Guardarraíles de datos"
Cohesion: 0.33
Nodes (6): query(), 5. Guardarraíles de datos, 9. Subtareas, Escritura, Lectura, Siempre

### Community 166 - "Message"
Cohesion: 0.18
Nodes (23): cancel_query(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file() (+15 more)

### Community 167 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 168 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 169 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 170 - ".remember"
Cohesion: 0.50
Nodes (3): 2b. Cómo aprende quién es, Fuente en el repo, Reglas propias del usuario

### Community 173 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **627 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+622 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1133 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `numpadKeys.ts`, `+layout.svelte`, `gridNavigation.ts`, `sqlCallHints.ts`, `sqlSchema.ts`, `editorSearchPanel.ts`, `focusZones.keys.test.ts`, `package.json`, `contract.test.ts`, `sqlStatements.ts`, `connection.ts`, `gridSettings.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sqlExecutionMarker.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sidebarLayout.ts`, `codemirrorTheme.ts`, `@codemirror/state`, `resultEdits.ts`, `svelte`, `pinnedResults.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `palettes.test.ts`, `ExportDialog.svelte`, `commands.ts`, `lib/types.ts`, `sqlIndentation.ts`, `gridWindow.test.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `ParserError`, `corpus.rs`, `real_server.rs`, `export.rs`, `parser.rs`, `Vec`, `result_editing.rs`, `src-tauri/src/lib.rs`, `ActiveConnection`, `DestructiveClassification`, `pagination.rs`, `classify_sql_with`, `diagnostics.rs`, `drivers.rs`, `editing.rs`, `syntax_diagnostic`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `ConnectionDriver` connect `ConnectionDriver` to `engines/index.ts`, `connectionProfiles.ts`, `filterBuilder.ts`, `connection.ts`, `contract.test.ts`, `svelte`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _627 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._