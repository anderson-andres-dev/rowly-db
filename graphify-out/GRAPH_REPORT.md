# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 373 files · ~444,995 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3588 nodes · 8096 edges · 180 communities (165 shown, 15 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 308 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a781c04d`
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
- reorder.ts
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
- sqlStatements.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- super
- notifications.ts
- sqlAnalysis.ts
- pinnedResults.ts
- theme.ts
- console_texts.rs
- connect
- gridSelectionSummary.ts
- Diagnósticos en el editor — diseño (tarea 4)
- invoke
- sqlCatalogCompletions.ts
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
- SqlProfile
- buildCompletionSource
- ConnectFailure
- error_position.rs
- postgres/src/tls.rs
- editorSearchPanel.ts
- ColumnFilterPopover.svelte
- @codemirror/state
- SqlEditor.svelte
- sqlParameters.ts
- text_encoding.rs
- dialogMotion.ts
- replaceBar.ts
- inspect_routine_chunk
- Soporte de versiones por línea — diseño
- DataGrid.svelte
- SettingsPanel.svelte
- +layout.svelte
- vitest
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- @codemirror/view
- corpus.rs
- sqlEditorBehavior.ts
- sqlPreviewFormat.ts
- gridWindow.test.ts
- catalog.rs
- Diagnostic
- state.ts
- Theme bootstrap IIFE (pre-paint CSS var injection)
- real_sql
- Comentarios — diseño
- contract.test.ts
- focusZones.keys.test.ts
- queryConsoles.test.ts
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- fuzzing_the_guard_against_the_real_servers_finds_no_second_statement
- SortKey
- svelte
- vendorSupport.ts
- TransactionError
- gridSettings.ts
- pinnedTables.ts
- khipu_driver_core
- SQL_ENGINE.md
- up.sh script
- error_text
- textEncoding.ts
- 6. The matrix
- Test databases
- Bases de datos de prueba
- flushConsolePersistence
- Message
- ref_app
- 6. Manejar la app
- installFocusZones
- Anexo A. Reglas de escritura, memoria y app (borrador)
- mysqlconnector
- postgresconnector
- 2. La memoria (`crates/memory`)
- 8. Interfaz
- lines.sh
- svelte.config.js
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 84 edges
2. `vitest` - 78 edges
3. `Message` - 71 edges
4. `svelte` - 40 edges
5. `analyze_statement()` - 38 edges
6. `@codemirror/state` - 35 edges
7. `Diagnostic` - 32 edges
8. `SqlProfile` - 29 edges
9. `ENGINES` - 28 edges
10. `buildCompletionSource()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `12. Adding an engine, step by step` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `7. Pulido del análisis (2026-09-29)` --references--> `created()`  [INFERRED]
  docs/specs/v0.2-diagnosticos.md → app/src/lib/sqlCreatedTables.test.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (180 total, 15 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.05
Nodes (88): AlterTableOperation, Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), after_handler_conditions(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify() (+80 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (69): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+61 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (58): async_trait, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl() (+50 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.18
Nodes (21): finishEdit(), onEditKeydown(), translate, createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), pickSqlFolder(), renameConsoleFile() (+13 more)

### Community 5 - "commands.ts"
Cohesion: 0.22
Nodes (12): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+4 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode, RelationKind (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (42): tabExists(), isFilterOperator(), activateQueryConsole(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole() (+34 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "DbConnector"
Cohesion: 0.18
Nodes (13): DbConnector, DriverError, QueryColumn, QueryExecutionResult, RowSink, ConnectionErrorKind, Formatter, Future (+5 more)

### Community 10 - "real_server.rs"
Cohesion: 0.11
Nodes (24): attacks_corpus(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), INJECTIONS (+16 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "3. Piezas"
Cohesion: 0.20
Nodes (10): flush(), type(), 2. La regla, 3. Piezas, 4. Orden, B. Texto hacia el store y guardado, D. Diagnósticos (Error Lens) a escala, Documentos grandes en el editor — diseño (tarea 15) (+2 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "Workspace.svelte"
Cohesion: 0.08
Nodes (11): close(), labelForKey(), $t(), ContextMenuItem, executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES (+3 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (28): activeProfile, catalogTables, completeConnection(), connection, ConnectResult, connectToProfile(), databaseExplorer, deleteConnectionProfile() (+20 more)

### Community 18 - "package.json"
Cohesion: 0.13
Nodes (14): description, license, name, type, version, codemirror, devicon, happy-dom (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+10 more)

### Community 20 - "sqlStatementIndex.ts"
Cohesion: 0.06
Nodes (52): doc, indexedState(), text, LEXICALS, ONE_QUERY, SEVERAL, texts(), advance() (+44 more)

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

### Community 27 - "ConnectionForm.svelte"
Cohesion: 0.11
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

### Community 32 - "3. Piezas"
Cohesion: 0.12
Nodes (15): 1. Qué pasa hoy, 21a — Grid virtualizado por tramos (2026-09-28), 21b — Sidebar, splitter y blur (2026-09-28), 21c — WebKitGTK (2026-09-28), 21d — Columnas virtualizadas (2026-09-28), 2. La regla, 3. Piezas, 4. Orden (+7 more)

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
Cohesion: 0.12
Nodes (23): Checker<'a, '_>, closest_names(), join_constraint(), max_distance(), output_columns(), Expr, Ident, Item (+15 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.16
Nodes (6): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t()

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.13
Nodes (18): ParameterType, SqlParameter, BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME (+10 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), number(), ordena_por_posicion_reemplazando_el_order_by(), paginate_sql() (+11 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.13
Nodes (20): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), onEscape(), onFocusIn(), onPointerDown() (+12 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (50): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+42 more)

### Community 54 - "editing.rs"
Cohesion: 0.09
Nodes (49): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+41 more)

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
Cohesion: 0.07
Nodes (52): sqlTokens(), aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, relationRef() (+44 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.18
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.19
Nodes (9): click(), findArea(), findRow(), mount(), replaceAll(), replaceArea(), replaceRow(), select() (+1 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.20
Nodes (6): ENGINE_SOURCES, defineMessages(), OtherLocale, Namespaces, ref_node_fs, ref_node_path

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (22): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+14 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.10
Nodes (22): indexOf(), ConnectionDriver, getDriver(), Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres (+14 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.12
Nodes (24): writeClipboard(), COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue() (+16 more)

### Community 70 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 72 - "stores/shortcuts.ts"
Cohesion: 0.15
Nodes (15): runCommand(), runFirstCommand(), handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS (+7 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.09
Nodes (22): query(), 1. Arquitectura, 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 5. Guardarraíles de datos, 7. Comunicación entre agentes, 9. Subtareas, Agente abierto desde fuera (+14 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.17
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

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
Cohesion: 0.25
Nodes (12): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+4 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.12
Nodes (24): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), connect(), DEFAULT_QUERY_ROW_LIMIT, execute_query(), ExecuteQueryResponse, ExportRequest (+16 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.22
Nodes (21): engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected(), fixture(), label(), Line (+13 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.08
Nodes (26): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+18 more)

### Community 83 - "sqlStatements.ts"
Cohesion: 0.07
Nodes (48): scanInChunks(), commentAwareWrap(), blockCommentEnd(), Comment, commentAt(), CommentKind, executablePrefix(), opensDashComment() (+40 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.23
Nodes (13): PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE, patch() (+5 more)

### Community 86 - "Dialect"
Cohesion: 0.08
Nodes (20): ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), MARIADB_UNPARSED, MYSQL_STARTERS (+12 more)

### Community 87 - "super"
Cohesion: 0.21
Nodes (6): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, super

### Community 88 - "notifications.ts"
Cohesion: 0.14
Nodes (17): confirmTrash(), trashSqlFile(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), detachQueryConsoleFile() (+9 more)

### Community 89 - "sqlAnalysis.ts"
Cohesion: 0.08
Nodes (19): AnalysisRunner, AnalysisRunnerOptions, merge(), Region, subtract(), runner(), SqlDiagnostic, ScanResult (+11 more)

### Community 90 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (45): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+37 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "connect"
Cohesion: 0.13
Nodes (15): connect(), TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema` (+7 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (15): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+7 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.08
Nodes (23): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+15 more)

### Community 96 - "invoke"
Cohesion: 0.12
Nodes (19): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+11 more)

### Community 97 - "sqlCatalogCompletions.ts"
Cohesion: 0.12
Nodes (19): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS (+11 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.17
Nodes (23): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+15 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

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
Cohesion: 0.06
Nodes (63): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+55 more)

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
Nodes (46): create(), typed(), ranges(), addDiagnostics, byAnalyzerLocation(), byNearFragment(), byPosition(), byQuotedName() (+38 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.11
Nodes (18): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), state(), entry() (+10 more)

### Community 109 - "lib/types.ts"
Cohesion: 0.15
Nodes (12): CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent, ExplorerForeignKey, ExplorerIndex, ExplorerKey (+4 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.11
Nodes (19): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 11. Version support packs, 12. Adding an engine, step by step, 13. Working on an engine (people and AI), 1. What is under test (+11 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.24
Nodes (14): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, Vec (+6 more)

### Community 113 - "SqlProfile"
Cohesion: 0.05
Nodes (35): SqlProfile, RoutineIndex, ErrorLocator, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig (+27 more)

### Community 114 - "buildCompletionSource"
Cohesion: 0.12
Nodes (22): afterCompleteCondition(), buildCompletionSource(), buildKeywordCompletion(), filterSchemaResult(), mergeCompatibleResults(), rankKeywordResult(), accept(), CATALOG (+14 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "editorSearchPanel.ts"
Cohesion: 0.25
Nodes (13): createMatchCounter(), scopeForReplace(), scopeFromSelection(), searchMode, closeAndFocusEditor(), createSearchPanel(), dropSelectionPrefill(), editorSearch() (+5 more)

### Community 120 - "@codemirror/state"
Cohesion: 0.13
Nodes (14): blockClosingAt(), commentEditing, ENCLOSING, reaches(), editor(), views, typing, painted() (+6 more)

### Community 121 - "SqlEditor.svelte"
Cohesion: 0.15
Nodes (5): createdTables(), lastPart(), created(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 122 - "sqlParameters.ts"
Cohesion: 0.24
Nodes (15): names(), findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql(), pad(), parameterNames() (+7 more)

### Community 123 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "replaceBar.ts"
Cohesion: 0.35
Nodes (10): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), createReplaceBar(), excludeCurrent(), syncQuery(), currentMatch() (+2 more)

### Community 126 - "inspect_routine_chunk"
Cohesion: 0.17
Nodes (31): at_token(), closest_keyword(), DiagnosticMessage, ends_expression(), expected_found(), friendly_syntax(), handler_action(), inspect_routine_chunk() (+23 more)

### Community 127 - "Soporte de versiones por línea — diseño"
Cohesion: 0.16
Nodes (14): reservedWords(), 1. Qué hay en un paquete, 2. Dónde viven, 3. De la versión del servidor a la línea, 4. Estados, 5. La pantalla Motores, 6. Firma y seguridad, 7. Publicar un paquete (+6 more)

### Community 128 - "DataGrid.svelte"
Cohesion: 0.11
Nodes (12): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit, installNumpadFix() (+4 more)

### Community 129 - "SettingsPanel.svelte"
Cohesion: 0.22
Nodes (3): option(), shortcutText(), $t()

### Community 130 - "+layout.svelte"
Cohesion: 0.08
Nodes (26): initLocaleEffects(), onePerFrame(), frames, clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH (+18 more)

### Community 131 - "vitest"
Cohesion: 0.31
Nodes (5): initials(), luminance(), readableTextColor(), slice(), vitest

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.11
Nodes (23): ENGINES, buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor() (+15 more)

### Community 135 - "@codemirror/view"
Cohesion: 0.17
Nodes (7): MAX_COUNTED, exclusionMarks, NewlineMarker, newlineMarkers, exclusionField, @codemirror/search, @codemirror/view

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (14): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos() (+6 more)

### Community 137 - "sqlEditorBehavior.ts"
Cohesion: 0.27
Nodes (9): typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit (+1 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 140 - "catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 141 - "Diagnostic"
Cohesion: 0.16
Nodes (26): byte_offset(), CatalogView, check(), Checker, Diagnostic, distance(), mysql_routine_errors(), mysql_select_into_errors() (+18 more)

### Community 142 - "state.ts"
Cohesion: 0.13
Nodes (17): ReplaceOptions, createSession(), SearchSession, addExclusion, clearExclusions, filteredQuery(), inScope(), isExcluded() (+9 more)

### Community 143 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 144 - "real_sql"
Cohesion: 0.18
Nodes (21): entries(), is_error(), Vec, call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Entry (+13 more)

### Community 145 - "Comentarios — diseño"
Cohesion: 0.14
Nodes (13): count(), Comentarios — diseño, Cómo se comporta cada motor, Decidido, Diseño, Estado, Lo que falla hoy, Objetivo (+5 more)

### Community 146 - "contract.test.ts"
Cohesion: 0.33
Nodes (6): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError

### Community 147 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 148 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 149 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.18
Nodes (10): TableIndex, 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, 7. Hecho (2026-09-27) (+2 more)

### Community 150 - "fuzzing_the_guard_against_the_real_servers_finds_no_second_statement"
Cohesion: 0.52
Nodes (4): fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), Lcg, mutate(), whitespace_positions()

### Community 151 - "SortKey"
Cohesion: 0.29
Nodes (6): nextSort(), PageRequest, QueryExecutionState, QueryExecutionResult, ResultPage, SortKey

### Community 152 - "svelte"
Cohesion: 0.19
Nodes (9): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), invoke, release, listed (+1 more)

### Community 153 - "vendorSupport.ts"
Cohesion: 0.31
Nodes (7): compare(), ENGINES, numbers(), Release, SupportStatus, today, vendorSupport

### Community 154 - "TransactionError"
Cohesion: 0.25
Nodes (5): ConnectionConfig, Self, TlsMode, TransactionError, Debug

### Community 155 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 156 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

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

### Community 165 - "flushConsolePersistence"
Cohesion: 0.33
Nodes (6): flushConsolePersistence(), flushConsoleTexts(), registerConsoleTextFlush(), closeWindow(), 15b — Texto al store y guardado (2026-09-27), 21e — Uso prolongado (2026-09-28)

### Community 166 - "Message"
Cohesion: 0.16
Nodes (23): create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file() (+15 more)

### Community 167 - "ref_app"
Cohesion: 0.29
Nodes (7): clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE, load(), MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS, ref_app

### Community 168 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 169 - "installFocusZones"
Cohesion: 0.52
Nodes (7): installFocusZones(), isPrefix(), onKeydown(), onKeyup(), onWindowBlur(), stopMoving(), swallow()

### Community 170 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 173 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 174 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 177 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **698 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1217 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `DataGrid.svelte`, `+layout.svelte`, `commands.ts`, `gridNavigation.ts`, `sqlCallHints.ts`, `sqlEditorBehavior.ts`, `sqlPreviewFormat.ts`, `gridWindow.test.ts`, `connection.ts`, `package.json`, `contract.test.ts`, `focusZones.keys.test.ts`, `sqlStatementIndex.ts`, `queryConsoles.test.ts`, `SortKey`, `svelte`, `vendorSupport.ts`, `gridSettings.ts`, `pinnedTables.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlExecutionMarker.ts`, `sqlSchema.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `messages/index.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sqlStatements.ts`, `resultEdits.ts`, `pinnedResults.ts`, `theme.ts`, `gridSelectionSummary.ts`, `invoke`, `sqlCatalogCompletions.ts`, `engines/index.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `ExportDialog.svelte`, `buildCompletionSource`, `editorSearchPanel.ts`, `@codemirror/state`, `SqlEditor.svelte`, `sqlParameters.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `corpus.rs`, `export.rs`, `Diagnostic`, `src-tauri/src/lib.rs`, `ActiveConnection`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `Engine`, `inspect_routine_chunk`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `SqlProfile` connect `SqlProfile` to `sqlCatalogCompletions.ts`, `engines/index.ts`, `6. The matrix`, `sqlContext.ts`, `sqlCallHints.ts`, `sqlFormatter.ts`, `sqlDiagnostics.ts`, `SQL engine quality contract`, `contract.test.ts`, `sqlStatements.ts`, `sqlSchema.ts`, `Soporte de versiones por línea — diseño`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.054982817869415807 - nodes in this community are weakly interconnected._