# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 364 files · ~439,829 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3536 nodes · 7952 edges · 172 communities (158 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 302 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea81720c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- assembly.rs
- postgres/src/lib.rs
- sqlFiles.ts
- commands.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- DbConnector
- real_server.rs
- tauri.conf.json
- 3. Piezas
- sqlDefinitionLink.ts
- Workspace.svelte
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatements.ts
- Arquitectura
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- lib/connections.ts
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
- AppState
- Engine
- connection_error.rs
- serde
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
- stores/shortcuts.ts
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
- sqlFormatLayout.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- super
- notifications.ts
- classify_sql_with
- pinnedResults.ts
- theme.ts
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- Diagnósticos en el editor — diseño (tarea 4)
- invoke
- editorSettings.ts
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
- FileTree.svelte
- lib/types.ts
- SQL engine quality contract
- ExportDialog.svelte
- ActiveConnection
- Contrato de calidad de los motores SQL
- vitest
- ConnectFailure
- error_position.rs
- postgres/src/tls.rs
- createSearchPanel
- ResultPane.svelte
- sqlIndentation.ts
- result_editing.rs
- DestructiveClassification
- text_encoding.rs
- dialogMotion.ts
- replace.ts
- Diagnostic
- Soporte de versiones por línea — diseño
- DataGrid.svelte
- withExecution
- +layout.svelte
- sidebarLayout.ts
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- NewlineMarker
- corpus.rs
- @codemirror/state
- sqlPreviewFormat.ts
- Vec
- catalog.rs
- .new
- editorSearchPanel.ts
- Theme bootstrap IIFE (pre-paint CSS var injection)
- real_sql
- @codemirror/search
- contract.test.ts
- session.ts
- queryConsoles.test.ts
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- fuzzing_the_guard_against_the_real_servers_finds_no_second_statement
- Option
- svelte
- vendorSupport.ts
- ConnectionConfig
- parser.rs
- FindBarActions
- khipu_driver_core
- SQL_ENGINE.md
- up.sh script
- error_text
- textEncoding.ts
- 6. The matrix
- Test databases
- Bases de datos de prueba
- currentQueryConsole
- Message
- 6. La matriz
- mysqlconnector
- postgresconnector
- lines.sh
- 2. JOIN completo con alias automático

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

## Communities (172 total, 14 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (44): a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation() (+36 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (69): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+61 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (58): TransactionStatement, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl() (+50 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.17
Nodes (20): finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole() (+12 more)

### Community 5 - "commands.ts"
Cohesion: 0.14
Nodes (21): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+13 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (25): async_trait, CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+17 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.09
Nodes (30): isFilterOperator(), activateQueryConsole(), appendConsole(), closeQueryConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts (+22 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "DbConnector"
Cohesion: 0.19
Nodes (11): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Output, Pin (+3 more)

### Community 10 - "real_server.rs"
Cohesion: 0.11
Nodes (24): attacks_corpus(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), INJECTIONS (+16 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "3. Piezas"
Cohesion: 0.11
Nodes (18): flush(), type(), statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 1. Qué pasa hoy (+10 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "Workspace.svelte"
Cohesion: 0.07
Nodes (8): close(), option(), labelForKey(), $t(), ContextMenuItem, app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch, svelte

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.09
Nodes (33): indexOf(), toConnectionFailure(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection (+25 more)

### Community 18 - "package.json"
Cohesion: 0.10
Nodes (18): description, license, name, type, version, config, devicon, happy-dom (+10 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatements.ts"
Cohesion: 0.05
Nodes (80): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts() (+72 more)

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
Cohesion: 0.07
Nodes (55): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+47 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "lib/connections.ts"
Cohesion: 0.12
Nodes (9): neutral, tinted, Icon, icons, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, connectionDrivers, DriverDefinition (+1 more)

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
Cohesion: 0.13
Nodes (18): PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy() (+10 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.09
Nodes (22): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+14 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.13
Nodes (20): Checker<'a, '_>, closest_names(), max_distance(), output_columns(), Expr, Ident, Item, ObjectName (+12 more)

### Community 45 - "FindBar"
Cohesion: 0.17
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
Cohesion: 0.16
Nodes (17): count_sql(), is_read_only_query(), literal_limit(), literal_u64(), number(), ordena_por_posicion_reemplazando_el_order_by(), paginate_sql(), parse_pageable_query() (+9 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.10
Nodes (32): activeZone, clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), isPrefix() (+24 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (51): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+43 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (32): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+24 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "AppState"
Cohesion: 0.22
Nodes (22): analyze_sql(), apply_result_changes(), AppState, cancel_query(), count_query_rows(), database_explorer(), disconnect(), export_query_to_file() (+14 more)

### Community 57 - "Engine"
Cohesion: 0.13
Nodes (17): admin(), classification(), classification_with(), Conn, Engine, .ALL, engine_selected(), ConnectionConfig (+9 more)

### Community 58 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 59 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 61 - "sqlSchema.ts"
Cohesion: 0.04
Nodes (92): ENGINE_SOURCES, argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option() (+84 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.19
Nodes (14): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+6 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.21
Nodes (8): click(), findArea(), findRow(), replaceAll(), replaceArea(), replaceRow(), select(), selectLines()

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (21): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+13 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.11
Nodes (20): ConnectionDriver, Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real (+12 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.15
Nodes (21): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+13 more)

### Community 70 - "onPointerDown"
Cohesion: 0.42
Nodes (9): prefersReducedMotion(), onPointerDown(), cleanup(), onMove(), onUp(), resetStyles(), settle(), startDrag() (+1 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 72 - "stores/shortcuts.ts"
Cohesion: 0.12
Nodes (10): handleRecordKeydown(), shortcutText(), $t(), setFormatterLineWidth(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition (+2 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.04
Nodes (48): commandDefinition, query(), 1. Arquitectura, 2. La memoria (`crates/memory`), 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 5. Guardarraíles de datos, 6. Manejar la app (+40 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.19
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

### Community 76 - "sql_files.rs"
Cohesion: 0.23
Nodes (21): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+13 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "render-site.py"
Cohesion: 0.13
Nodes (14): datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, json, os, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, pathlib (+6 more)

### Community 79 - "findBar.ts"
Cohesion: 0.32
Nodes (14): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+6 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.12
Nodes (24): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), connect(), DEFAULT_QUERY_ROW_LIMIT, execute_query(), ExecuteQueryResponse, ExportRequest (+16 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.22
Nodes (21): engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected(), fixture(), label(), Line (+13 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.07
Nodes (30): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+22 more)

### Community 83 - "sqlFormatLayout.ts"
Cohesion: 0.32
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (14): EMPTY_EDITS, PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (19): MYSQL, same_single_statement(), ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual() (+11 more)

### Community 87 - "super"
Cohesion: 0.21
Nodes (6): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, super

### Community 88 - "notifications.ts"
Cohesion: 0.14
Nodes (17): confirmTrash(), trashSqlFile(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), detachQueryConsoleFile() (+9 more)

### Community 89 - "classify_sql_with"
Cohesion: 0.23
Nodes (27): Cow, after_handler_conditions(), classify_by_structure(), classify_destructive_sql(), classify_routine(), classify_sql(), classify_sql_with(), classify_text() (+19 more)

### Community 90 - "pinnedResults.ts"
Cohesion: 0.26
Nodes (10): tabExists(), addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+2 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (45): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+37 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.29
Nodes (7): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.19
Nodes (14): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+6 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.08
Nodes (23): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+15 more)

### Community 96 - "invoke"
Cohesion: 0.13
Nodes (18): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+10 more)

### Community 97 - "editorSettings.ts"
Cohesion: 0.16
Nodes (14): DEFAULT_INDENT_SIZE, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeIndentSize(), normalizeIndentStyle() (+6 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.18
Nodes (10): 0. Hoy, 10. Errores mientras se escribe (2026-09-27), 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden (+2 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.12
Nodes (19): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+11 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.16
Nodes (18): format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult, formatSqlBlock() (+10 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.04
Nodes (49): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), create(), runner(), typed() (+41 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.10
Nodes (20): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), state(), pickSqlFolder() (+12 more)

### Community 109 - "lib/types.ts"
Cohesion: 0.10
Nodes (20): nextSort(), PageRequest, ConnectionConfig, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent (+12 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.11
Nodes (19): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 11. Version support packs, 12. Adding an engine, step by step, 13. Working on an engine (people and AI), 1. What is under test (+11 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (10): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+2 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.24
Nodes (14): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, Vec (+6 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.11
Nodes (19): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 11. Paquetes de soporte de versión, 12. Agregar un motor, paso a paso, 13. Trabajar en un motor (personas e IA), 1. Qué se prueba (+11 more)

### Community 114 - "vitest"
Cohesion: 0.16
Nodes (13): initials(), luminance(), readableTextColor(), ENGINES, slice(), accept(), CATALOG, editor() (+5 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "createSearchPanel"
Cohesion: 0.26
Nodes (10): searchMode, closeAndFocusEditor(), createSearchPanel(), renderMode(), mount(), dropSelectionPrefill(), editorSearch(), openInMode() (+2 more)

### Community 119 - "ResultPane.svelte"
Cohesion: 0.06
Nodes (16): allState, style, active, danger, submit, reorderResultTabs(), moveItem(), reorderable() (+8 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.22
Nodes (14): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+6 more)

### Community 121 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 122 - "DestructiveClassification"
Cohesion: 0.20
Nodes (15): AlterTableOperation, classify(), classify_alter_table(), classify_drop(), classify_production(), classify_query(), classify_selection(), classify_set_expr() (+7 more)

### Community 123 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.25
Nodes (28): at_token(), byte_offset(), Diagnostic, ends_expression(), handler_action(), inspect_routine_chunk(), is_plain_name(), is_value() (+20 more)

### Community 127 - "Soporte de versiones por línea — diseño"
Cohesion: 0.16
Nodes (14): reservedWords(), 1. Qué hay en un paquete, 2. Dónde viven, 3. De la versión del servidor a la línea, 4. Estados, 5. La pantalla Motores, 6. Firma y seguridad, 7. Publicar un paquete (+6 more)

### Community 128 - "DataGrid.svelte"
Cohesion: 0.17
Nodes (9): onMove(), onUp(), selectCell(), toggleInSelection(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT (+1 more)

### Community 129 - "withExecution"
Cohesion: 0.22
Nodes (13): beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting(), setQuerySort() (+5 more)

### Community 130 - "+layout.svelte"
Cohesion: 0.11
Nodes (17): initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_tokens (+9 more)

### Community 131 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.08
Nodes (29): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+21 more)

### Community 136 - "corpus.rs"
Cohesion: 0.22
Nodes (15): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+7 more)

### Community 137 - "@codemirror/state"
Cohesion: 0.22
Nodes (11): createdTables(), lastPart(), created(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations() (+3 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "Vec"
Cohesion: 0.39
Nodes (8): CatalogView, Checker, mysql_select_into_errors(), Repaired, Vec, subquery_errors(), syntax_errors(), SqlparserDialect

### Community 140 - "catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 141 - ".new"
Cohesion: 0.20
Nodes (9): distance(), offset_at(), Position, postgres_opaque_definition(), Repaired<'a>, From, Self, Suggestion (+1 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.13
Nodes (19): exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded(), matchFilter() (+11 more)

### Community 143 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 144 - "real_sql"
Cohesion: 0.18
Nodes (21): entries(), is_error(), Vec, call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Entry (+13 more)

### Community 145 - "@codemirror/search"
Cohesion: 0.40
Nodes (4): createMatchCounter(), count(), MAX_COUNTED, @codemirror/search

### Community 146 - "contract.test.ts"
Cohesion: 0.20
Nodes (12): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, codeChar(), IDENTIFIER_CLOSE (+4 more)

### Community 147 - "session.ts"
Cohesion: 0.36
Nodes (6): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf()

### Community 148 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 149 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 150 - "fuzzing_the_guard_against_the_real_servers_finds_no_second_statement"
Cohesion: 0.52
Nodes (4): fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), Lcg, mutate(), whitespace_positions()

### Community 151 - "Option"
Cohesion: 0.21
Nodes (13): closest_keyword(), DiagnosticMessage, expected_found(), friendly_syntax(), is_simple_token(), join_constraint(), BTreeMap, Option (+5 more)

### Community 152 - "svelte"
Cohesion: 0.11
Nodes (22): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS, GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings() (+14 more)

### Community 153 - "vendorSupport.ts"
Cohesion: 0.31
Nodes (7): compare(), ENGINES, numbers(), Release, SupportStatus, today, vendorSupport

### Community 154 - "ConnectionConfig"
Cohesion: 0.29
Nodes (4): ConnectionConfig, Self, TlsMode, Debug

### Community 155 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 157 - "khipu_driver_core"
Cohesion: 0.38
Nodes (6): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), khipu_driver_core

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 160 - "error_text"
Cohesion: 0.67
Nodes (3): error_text(), is_syntax_error(), QueryExecutionResult

### Community 161 - "textEncoding.ts"
Cohesion: 0.33
Nodes (4): QueryConsole, DEFAULT_TEXT_ENCODING, TEXT_ENCODINGS, TextEncoding

### Community 162 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities, 6. The matrix

### Community 163 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 165 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

### Community 166 - "Message"
Cohesion: 0.16
Nodes (23): create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file() (+15 more)

### Community 170 - "6. La matriz"
Cohesion: 0.33
Nodes (6): 6.1 Seguridad, 6.2 Análisis y diagnósticos, 6.3 SQL generado y autocompletado, 6.4 Drivers e introspección, 6.5 Capacidades, 6. La matriz

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **683 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+678 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1194 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `DataGrid.svelte`, `+layout.svelte`, `sidebarLayout.ts`, `commands.ts`, `gridNavigation.ts`, `sqlCallHints.ts`, `@codemirror/state`, `sqlPreviewFormat.ts`, `editorSearchPanel.ts`, `connection.ts`, `package.json`, `contract.test.ts`, `sqlStatements.ts`, `queryConsoles.test.ts`, `svelte`, `vendorSupport.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlExecutionMarker.ts`, `sqlSchema.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `resultEdits.ts`, `pinnedResults.ts`, `theme.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `lib/types.ts`, `ExportDialog.svelte`, `sqlIndentation.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `SqlProfile` connect `engines/index.ts` to `6. The matrix`, `sqlContext.ts`, `sqlCallHints.ts`, `sqlFormatter.ts`, `6. La matriz`, `SQL engine quality contract`, `Contrato de calidad de los motores SQL`, `contract.test.ts`, `sqlSchema.ts`, `Soporte de versiones por línea — diseño`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `classify_sql_with`, `corpus.rs`, `export.rs`, `Vec`, `.new`, `src-tauri/src/lib.rs`, `ActiveConnection`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `result_editing.rs`, `DestructiveClassification`, `parser.rs`, `Diagnostic`, `Engine`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _683 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07547169811320754 - nodes in this community are weakly interconnected._