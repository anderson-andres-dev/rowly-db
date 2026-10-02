# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 363 files · ~439,356 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3534 nodes · 7934 edges · 191 communities (173 shown, 18 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 300 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82838ed0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- assembly.rs
- postgres/src/lib.rs
- sqlFiles.ts
- buildCompletionSource
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- DbConnector
- real_server.rs
- tauri.conf.json
- sqlStatements.ts
- sqlDefinitionLink.ts
- svelte
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatementIndex.ts
- Arquitectura
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- ConnectionForm.svelte
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
- Conn
- mysql/src/tls.rs
- message.rs
- sqlExecutionMarker.ts
- sqlSchema.ts
- cellTypes.ts
- explorerTree.ts
- editorSearchPanel.dom.test.ts
- messages/index.ts
- connectionTest.ts
- ConnectionDriver
- gridClipboard.ts
- onPointerDown
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
- version_lines.rs
- v0.2.0 — Pulido de la experiencia
- codemirrorTheme.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- queryParameters.ts
- FileTree.svelte
- classify_sql_with
- pinnedResults.ts
- theme.ts
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- 3. Arquitectura
- invoke
- Theme bootstrap IIFE (pre-paint CSS var injection)
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- sqlFormatter.ts
- Quality CI Workflow
- iconOptics.ts
- gridFind.ts
- sqlDiagnostics.ts
- sqlFolders.ts
- lib/types.ts
- SQL engine quality contract
- ExportDialog.svelte
- ActiveConnection
- Contrato de calidad de los motores SQL
- vitest
- ConnectFailure
- error_position.rs
- postgres/src/tls.rs
- SqlEditor.svelte
- Workspace.svelte
- sqlIndentation.ts
- result_editing.rs
- DestructiveClassification
- commands.ts
- dialogMotion.ts
- sqlRelations.ts
- syntax_diagnostic
- Soporte de versiones por línea — diseño
- DataGrid.svelte
- text_encoding.rs
- +layout.svelte
- Engine
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- @codemirror/view
- corpus.rs
- sqlEditorBehavior.ts
- sqlPreviewFormat.ts
- Diagnostic
- catalog.rs
- inspect_routine_chunk
- editorSearchPanel.ts
- sidebarLayout.ts
- entries
- sqlCatalogCompletions.ts
- contract.test.ts
- replace.ts
- AnalysisRunner
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- fuzzing_the_guard_against_the_real_servers_finds_no_second_statement
- Option
- svelte
- vendorSupport.ts
- TransactionError
- super
- ColumnFilterPopover.svelte
- stores/shortcuts.ts
- SQL_ENGINE.md
- up.sh script
- focusZones.keys.test.ts
- 6. The matrix
- Anexo A. Reglas de escritura, memoria y app (borrador)
- Test databases
- Bases de datos de prueba
- 5. Guardarraíles de datos
- Message
- 2. La memoria (`crates/memory`)
- 8. Interfaz
- 1. Arquitectura
- 6. La matriz
- mysqlconnector
- postgresconnector
- currentQueryConsole
- numpadKeys.ts
- lines.sh
- 2. JOIN completo con alias automático
- khipu_driver_core
- Diagnósticos en el editor — diseño (tarea 4)
- 4. Ejemplos con errores reales
- .remember
- svelte.config.js
- StatusGutterMarker
- vite.config.js
- 1. Qué se ve
- 7. Entorno de la conexión — 🧪
- 11. Scripts de varias sentencias — ✅
- 10. Cancelar una consulta larga — ✅
- 8. Historial de consultas — ✅

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 84 edges
2. `vitest` - 74 edges
3. `Message` - 71 edges
4. `svelte` - 40 edges
5. `analyze_statement()` - 38 edges
6. `Diagnostic` - 32 edges
7. `@codemirror/state` - 30 edges
8. `SqlProfile` - 29 edges
9. `buildCompletionSource()` - 28 edges
10. `Engine` - 28 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `12. Adding an engine, step by step` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `12. Agregar un motor, paso a paso` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (191 total, 18 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (43): a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation() (+35 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (68): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+60 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (63): async_trait, a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env() (+55 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.14
Nodes (23): openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS, SqlDirEntry (+15 more)

### Community 5 - "buildCompletionSource"
Cohesion: 0.10
Nodes (27): catalogPosition, complete(), schemas, afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), buildFkIndex(), buildKeywordCompletion() (+19 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode, RelationKind (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (44): tabExists(), isFilterOperator(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+36 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "DbConnector"
Cohesion: 0.18
Nodes (13): DbConnector, DriverError, QueryColumn, QueryExecutionResult, RowSink, ConnectionErrorKind, Formatter, Future (+5 more)

### Community 10 - "real_server.rs"
Cohesion: 0.10
Nodes (33): call_arguments(), char_offset(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Entry, everyday_queries(), FRAGMENTS_MYSQL (+25 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlStatements.ts"
Cohesion: 0.08
Nodes (38): texts(), ScanResult, split(), ALL_COLUMNS_AFTER, ALWAYS_FOLLOWS_LEAD, blankLineIn(), BODY_WORDS, compiled (+30 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "svelte"
Cohesion: 0.13
Nodes (7): close(), option(), shortcutText(), $t(), count(), setFormatterLineWidth(), svelte

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.08
Nodes (35): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult (+27 more)

### Community 18 - "package.json"
Cohesion: 0.14
Nodes (13): description, license, name, type, version, codemirror, happy-dom, sql-formatter (+5 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatementIndex.ts"
Cohesion: 0.08
Nodes (42): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, typingSpan() (+34 more)

### Community 21 - "Arquitectura"
Cohesion: 0.40
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

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

### Community 27 - "ConnectionForm.svelte"
Cohesion: 0.11
Nodes (10): neutral, tinted, Icon, icons, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, connectionDrivers, DriverDefinition (+2 more)

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
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.11
Nodes (23): Checker<'a, '_>, contains_pattern(), has_unparsed_syntax(), join_constraint(), output_columns(), Repaired, CatalogTable, Expr (+15 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.16
Nodes (15): child(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+7 more)

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
Cohesion: 0.16
Nodes (17): count_sql(), is_read_only_query(), literal_limit(), literal_u64(), number(), ordena_por_posicion_reemplazando_el_order_by(), paginate_sql(), parse_pageable_query() (+9 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.11
Nodes (28): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), isPrefix(), onEscape() (+20 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.07
Nodes (42): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+34 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (32): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+24 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 57 - "Conn"
Cohesion: 0.15
Nodes (16): classification(), classification_with(), Conn, error_text(), Option, QueryExecutionResult, Result, SchemaObjects (+8 more)

### Community 58 - "mysql/src/tls.rs"
Cohesion: 0.10
Nodes (20): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+12 more)

### Community 59 - "message.rs"
Cohesion: 0.21
Nodes (8): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.10
Nodes (23): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+15 more)

### Community 61 - "sqlSchema.ts"
Cohesion: 0.11
Nodes (27): StatementRelation, takenNames(), COLUMN_TYPES, currentStatement(), dialectCache, EMPTY_TABLE_INDEX, extractDefaultTable(), extractFromContext() (+19 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.21
Nodes (13): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+5 more)

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
Cohesion: 0.12
Nodes (18): ConnectionDriver, Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real (+10 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.13
Nodes (23): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+15 more)

### Community 70 - "onPointerDown"
Cohesion: 0.42
Nodes (9): prefersReducedMotion(), onPointerDown(), cleanup(), onMove(), onUp(), resetStyles(), settle(), startDrag() (+1 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.33
Nodes (9): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+1 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.15
Nodes (15): DEFAULT_INDENT_SIZE, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeIndentSize(), normalizeIndentStyle() (+7 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.17
Nodes (11): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, Agente abierto desde fuera, Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora) (+3 more)

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
Cohesion: 0.18
Nodes (16): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+8 more)

### Community 78 - "render-site.py"
Cohesion: 0.13
Nodes (14): datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, json, os, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, pathlib (+6 more)

### Community 79 - "findBar.ts"
Cohesion: 0.20
Nodes (18): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+10 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (43): a_script_is_checked_statement_by_statement(), analyze_sql(), apply_result_changes(), AppState, cancel_query(), check_statement(), classify_statements(), connect() (+35 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.21
Nodes (19): engine_named(), entry_since(), every_version_line_is_told_apart_from_the_previous_one(), fixture(), label(), Line, numbers(), Probe (+11 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.12
Nodes (16): 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 9. Hoja de atajos — ✅, Estado (+8 more)

### Community 83 - "codemirrorTheme.ts"
Cohesion: 0.18
Nodes (10): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+2 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.21
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 86 - "Dialect"
Cohesion: 0.10
Nodes (18): MYSQL, ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), MARIADB_UNPARSED (+10 more)

### Community 87 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 88 - "FileTree.svelte"
Cohesion: 0.12
Nodes (18): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+10 more)

### Community 89 - "classify_sql_with"
Cohesion: 0.19
Nodes (30): Cow, after_handler_conditions(), classify_by_structure(), classify_destructive_sql(), classify_routine(), classify_sql(), classify_sql_with(), classify_text() (+22 more)

### Community 90 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 91 - "theme.ts"
Cohesion: 0.08
Nodes (35): ColorScheme, EditorPalette, palettes, resolveScheme(), ShellPalette, contrast(), DARK_BEFORE, FAMILIES (+27 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.22
Nodes (9): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos (+1 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.20
Nodes (13): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+5 more)

### Community 95 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 96 - "invoke"
Cohesion: 0.12
Nodes (19): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+11 more)

### Community 97 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 98 - "engines/index.ts"
Cohesion: 0.14
Nodes (28): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+20 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.18
Nodes (10): 0. Hoy, 10. Errores mientras se escribe (2026-09-27), 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden (+2 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.09
Nodes (25): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+17 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.12
Nodes (36): ENGINES, alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass() (+28 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (47): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byAnalyzerLocation(), byNearFragment() (+39 more)

### Community 108 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (12): folderMenuItems(), startCreate(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT (+4 more)

### Community 109 - "lib/types.ts"
Cohesion: 0.11
Nodes (18): nextSort(), PageRequest, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent (+10 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.11
Nodes (19): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 11. Version support packs, 12. Adding an engine, step by step, 13. Working on an engine (people and AI), 1. What is under test (+11 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.19
Nodes (17): ActiveConnection, build_catalog(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap, SchemaObjects (+9 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.11
Nodes (19): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 11. Paquetes de soporte de versión, 12. Agregar un motor, paso a paso, 13. Trabajar en un motor (personas e IA), 1. Qué se prueba (+11 more)

### Community 114 - "vitest"
Cohesion: 0.19
Nodes (8): initials(), luminance(), readableTextColor(), ENGINE_SOURCES, slice(), ref_node_fs, ref_node_path, vitest

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.11
Nodes (9): writeClipboard(), ContextMenuItem, writeClipboardText(), createdTables(), lastPart(), created(), mousemove(), app_src_lib_sqleditoricons (+1 more)

### Community 119 - "Workspace.svelte"
Cohesion: 0.07
Nodes (15): labelForKey(), reorderResultTabs(), $t(), moveItem(), reorderable(), ReorderParams, executionLog, LogEntry (+7 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.24
Nodes (13): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+5 more)

### Community 121 - "result_editing.rs"
Cohesion: 0.27
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+11 more)

### Community 122 - "DestructiveClassification"
Cohesion: 0.22
Nodes (14): AlterTableOperation, classify(), classify_alter_table(), classify_drop(), classify_production(), classify_query(), classify_selection(), classify_set_expr() (+6 more)

### Community 123 - "commands.ts"
Cohesion: 0.18
Nodes (17): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+9 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "sqlRelations.ts"
Cohesion: 0.14
Nodes (25): Token, aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, relationRef() (+17 more)

### Community 126 - "syntax_diagnostic"
Cohesion: 0.21
Nodes (23): at_token(), DiagnosticMessage, ends_expression(), friendly_syntax(), is_plain_name(), is_simple_token(), is_value(), key() (+15 more)

### Community 127 - "Soporte de versiones por línea — diseño"
Cohesion: 0.16
Nodes (14): reservedWords(), 1. Qué hay en un paquete, 2. Dónde viven, 3. De la versión del servidor a la línea, 4. Estados, 5. La pantalla Motores, 6. Firma y seguridad, 7. Publicar un paquete (+6 more)

### Community 128 - "DataGrid.svelte"
Cohesion: 0.16
Nodes (7): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit

### Community 129 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 130 - "+layout.svelte"
Cohesion: 0.11
Nodes (18): initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens (+10 more)

### Community 131 - "Engine"
Cohesion: 0.24
Nodes (6): admin(), Engine, .ALL, engine_selected(), ConnectionConfig, try_admin()

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.08
Nodes (30): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+22 more)

### Community 135 - "@codemirror/view"
Cohesion: 0.18
Nodes (6): MAX_COUNTED, exclusionMarks, NewlineMarker, newlineMarkers, @codemirror/search, @codemirror/view

### Community 136 - "corpus.rs"
Cohesion: 0.22
Nodes (15): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+7 more)

### Community 137 - "sqlEditorBehavior.ts"
Cohesion: 0.33
Nodes (7): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "Diagnostic"
Cohesion: 0.21
Nodes (17): analyze_mixed_case(), CatalogView, check(), Checker, Diagnostic, mysql_select_into_errors(), Open, postgres_distingue_mayusculas_como_el_servidor() (+9 more)

### Community 140 - "catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 141 - "inspect_routine_chunk"
Cohesion: 0.23
Nodes (14): byte_offset(), handler_action(), inspect_routine_chunk(), keyword_text(), mysql_routine_errors(), offset_at(), Position, position_at() (+6 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.13
Nodes (25): createMatchCounter(), addExclusion, clearExclusions, exclusionField, inScope(), isExcluded(), matchFilter(), Range (+17 more)

### Community 143 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 144 - "entries"
Cohesion: 0.27
Nodes (10): entries(), is_error(), Vec, attacks_corpus(), common_valid_ddl_and_dml_is_never_objected_to(), no_text_the_guard_accepts_runs_more_than_one_statement_on_the_server(), routines_corpus(), skeletons() (+2 more)

### Community 145 - "sqlCatalogCompletions.ts"
Cohesion: 0.18
Nodes (13): argumentsSnippet(), buildCatalogCompletions(), COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS, prefixStartForNames() (+5 more)

### Community 146 - "contract.test.ts"
Cohesion: 0.22
Nodes (11): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, codeChar(), IDENTIFIER_CLOSE (+3 more)

### Community 147 - "replace.ts"
Cohesion: 0.24
Nodes (10): preserveCase(), replaceEverything(), replacementFor(), ReplaceOptions, createSession(), SearchSession, filteredQuery(), matchesIn() (+2 more)

### Community 148 - "AnalysisRunner"
Cohesion: 0.18
Nodes (4): AnalysisRunner, merge(), subtract(), runner()

### Community 149 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.18
Nodes (10): TableIndex, 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, 7. Hecho (2026-09-27) (+2 more)

### Community 150 - "fuzzing_the_guard_against_the_real_servers_finds_no_second_statement"
Cohesion: 0.52
Nodes (4): fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), Lcg, mutate(), whitespace_positions()

### Community 151 - "Option"
Cohesion: 0.27
Nodes (10): closest_keyword(), closest_names(), distance(), expected_found(), max_distance(), Item, Option, split_location() (+2 more)

### Community 152 - "svelte"
Cohesion: 0.11
Nodes (17): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle(), forgetPinnedTables(), isPinned() (+9 more)

### Community 153 - "vendorSupport.ts"
Cohesion: 0.31
Nodes (7): compare(), ENGINES, numbers(), Release, SupportStatus, today, vendorSupport

### Community 154 - "TransactionError"
Cohesion: 0.25
Nodes (5): ConnectionConfig, Self, TlsMode, TransactionError, Debug

### Community 155 - "super"
Cohesion: 0.22
Nodes (4): ParserError, Result, validate(), super

### Community 157 - "stores/shortcuts.ts"
Cohesion: 0.11
Nodes (19): commandDefinition, handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut (+11 more)

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 160 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 161 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities, 6. The matrix

### Community 162 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 163 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 165 - "5. Guardarraíles de datos"
Cohesion: 0.33
Nodes (6): query(), 5. Guardarraíles de datos, 9. Subtareas, Escritura, Lectura, Siempre

### Community 166 - "Message"
Cohesion: 0.16
Nodes (23): create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file() (+15 more)

### Community 167 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 168 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 169 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 170 - "6. La matriz"
Cohesion: 0.33
Nodes (6): 6.1 Seguridad, 6.2 Análisis y diagnósticos, 6.3 SQL generado y autocompletado, 6.4 Drivers e introspección, 6.5 Capacidades, 6. La matriz

### Community 173 - "currentQueryConsole"
Cohesion: 0.22
Nodes (10): currentQueryConsole(), flushConsolePersistence(), flushConsoleTexts(), hydrateLargeTexts(), registerConsoleTextFlush(), textKey(), writeConsoles(), closeWindow() (+2 more)

### Community 174 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

### Community 177 - "khipu_driver_core"
Cohesion: 0.38
Nodes (6): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), khipu_driver_core

### Community 178 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.29
Nodes (5): 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, 7. Pulido del análisis (2026-09-29), Diagnósticos en el editor — diseño (tarea 4)

### Community 179 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 180 - ".remember"
Cohesion: 0.40
Nodes (4): 2b. Cómo aprende quién es, Fuente en el repo, Reglas propias del usuario, Salud de la memoria

### Community 181 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 183 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 184 - "1. Qué se ve"
Cohesion: 0.50
Nodes (4): 1. Qué se ve, Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 185 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 186 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **683 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+678 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1195 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `gridNavigation.ts`, `sqlCallHints.ts`, `buildCompletionSource`, `queryConsoles.ts`, `sqlEditorBehavior.ts`, `sqlPreviewFormat.ts`, `sqlStatements.ts`, `editorSearchPanel.ts`, `sidebarLayout.ts`, `sqlCatalogCompletions.ts`, `package.json`, `contract.test.ts`, `sqlStatementIndex.ts`, `connection.ts`, `svelte`, `vendorSupport.ts`, `focusZones.keys.test.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `numpadKeys.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlExecutionMarker.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `resultEdits.ts`, `queryParameters.ts`, `pinnedResults.ts`, `theme.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `lib/types.ts`, `ExportDialog.svelte`, `SqlEditor.svelte`, `sqlIndentation.ts`, `commands.ts`, `dialogMotion.ts`, `sqlRelations.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `SqlProfile` connect `engines/index.ts` to `6. The matrix`, `sqlContext.ts`, `sqlCallHints.ts`, `sqlFormatter.ts`, `6. La matriz`, `sqlDiagnostics.ts`, `SQL engine quality contract`, `sqlCatalogCompletions.ts`, `contract.test.ts`, `Contrato de calidad de los motores SQL`, `sqlSchema.ts`, `Soporte de versiones por línea — diseño`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `Engine`, `corpus.rs`, `Diagnostic`, `inspect_routine_chunk`, `drivers.rs`, `super`, `export.rs`, `String`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `Conn`, `src-tauri/src/lib.rs`, `classify_sql_with`, `ActiveConnection`, `result_editing.rs`, `DestructiveClassification`, `syntax_diagnostic`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _683 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07767722473604827 - nodes in this community are weakly interconnected._