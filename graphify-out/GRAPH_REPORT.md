# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 367 files · ~424,740 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 9, .css 8, .icns 1)

## Summary
- 3415 nodes · 7864 edges · 177 communities (164 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 209 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13defcfa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- mysql/src/tls.rs
- postgres/src/lib.rs
- sqlFiles.ts
- commands.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- sqlStatementIndex.test.ts
- real_server.rs
- tauri.conf.json
- QueryExecutionOptions
- sqlDefinitionLink.ts
- svelte
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatementIndex.ts
- SQL_ENGINE.es.md
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
- SqlProfile
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
- ParserError
- diagnostics.rs
- editing.rs
- updates.rs
- MySqlConnector
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
- Contribuir
- gridClipboard.ts
- reorder.ts
- columnFilters.ts
- stores/shortcuts.ts
- DestructiveClassification
- filterBuilder.ts
- i18n/index.ts
- sql_files.rs
- queryHistory.ts
- render-site.py
- findBar.ts
- src-tauri/src/lib.rs
- version_lines.rs
- sqlCommentStyle.ts
- sqlStatements.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- super
- FileTree.svelte
- AnalysisRunner
- pinnedResults.ts
- theme.ts
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- sqlIndentation.ts
- lib/backend.ts
- sqlCatalogCompletions.ts
- engines/index.ts
- sqlRelations.ts
- sqlContext.ts
- scripts
- main.js
- sqlFormatter.ts
- Quality CI Workflow
- iconOptics.ts
- gridFind.ts
- sqlDiagnostics.ts
- sqlFolders.ts
- Option
- SQL engine quality contract
- ExportDialog.svelte
- ActiveConnection
- Contrato de calidad de los motores SQL
- sqlWriting.test.ts
- ConnectFailure
- error_position.rs
- postgres/src/tls.rs
- editorSearchPanel.ts
- ResultPane.svelte
- vitest
- SqlEditor.svelte
- Consolidación de Rowly DB y presupuesto de rendimiento — diseño
- text_encoding.rs
- dialogMotion.ts
- replace.ts
- Diagnostic
- classify_sql_with
- DataGrid.svelte
- RawStatement<'q>
- startFilePanelResize
- Extensiones opcionales y futura tienda — límites antes del runtime
- webkit_env.rs
- vendorSupport.ts
- lib/types.ts
- decorations.ts
- corpus.rs
- @codemirror/state
- sqlPreviewFormat.ts
- gridWindow.test.ts
- catalog.rs
- .new
- state.ts
- Workspace.svelte
- real_sql
- @codemirror/view
- sidebarLayout.ts
- focusZones.keys.test.ts
- queryConsoles.test.ts
- Contrato de motores y líneas de versión — organización del núcleo
- fuzzing_the_guard_against_the_real_servers_finds_no_second_statement
- numpadKeys.ts
- queryParameters.ts
- Vec
- parser.rs
- gridSettings.ts
- svelte
- .stream_query
- apply
- up.sh script
- error_text
- apply
- 6. The matrix
- Test databases
- Bases de datos de prueba
- reportPersistFailure
- Message
- 6. La matriz
- open_pool
- FindBarActions
- .fmt
- mysqlconnector
- postgresconnector
- lines.sh
- svelte.config.js
- vite.config.js
- +layout.svelte

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 84 edges
2. `vitest` - 80 edges
3. `Message` - 71 edges
4. `svelte` - 41 edges
5. `analyze_statement()` - 38 edges
6. `@codemirror/state` - 35 edges
7. `Diagnostic` - 32 edges
8. `ENGINES` - 28 edges
9. `Engine` - 28 edges
10. `buildCompletionSource()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `12.1 New engine` --references--> `ConnectionDriver`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/connections.ts
- `12.1 Motor nuevo` --references--> `ConnectionDriver`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/connections.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principios` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (177 total, 13 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.08
Nodes (44): a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify_selection(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation() (+36 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.15
Nodes (26): config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_for_bad_sql(), execute_query_returns_result_set_with_null_and_types() (+18 more)

### Community 2 - "mysql/src/tls.rs"
Cohesion: 0.13
Nodes (14): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+6 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.07
Nodes (56): cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql() (+48 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.14
Nodes (24): openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS, SqlDirEntry (+16 more)

### Community 5 - "commands.ts"
Cohesion: 0.24
Nodes (13): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+5 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.05
Nodes (65): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), edit_info(), EditableColumn, EditTarget (+57 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (39): tabExists(), isFilterOperator(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+31 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (18): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+10 more)

### Community 9 - "sqlStatementIndex.test.ts"
Cohesion: 0.14
Nodes (14): texts(), LEXICALS, PIECES, split(), lineOf(), SCAN_OVERLAP, splitStatements(), statementAt() (+6 more)

### Community 10 - "real_server.rs"
Cohesion: 0.11
Nodes (24): attacks_corpus(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), INJECTIONS (+16 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "QueryExecutionOptions"
Cohesion: 0.22
Nodes (17): QueryExecutionOptions, cancelled_before_start(), execute_on_connection(), ExecutionOutcome, is_unsupported_in_prepared_protocol(), mysql_cell_to_query_value(), mysql_error_to_result(), RawStatement (+9 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "svelte"
Cohesion: 0.10
Nodes (10): close(), onKeydown(), onKeydownCapture(), option(), shortcutText(), $t(), count(), child() (+2 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (32): toConnectionFailure(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectResult (+24 more)

### Community 18 - "package.json"
Cohesion: 0.14
Nodes (13): description, license, name, type, version, codemirror, happy-dom, svelte-check (+5 more)

### Community 19 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+10 more)

### Community 20 - "sqlStatementIndex.ts"
Cohesion: 0.08
Nodes (39): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, advance() (+31 more)

### Community 21 - "SQL_ENGINE.es.md"
Cohesion: 0.23
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.20
Nodes (17): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+9 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.07
Nodes (60): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+52 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "ConnectionForm.svelte"
Cohesion: 0.10
Nodes (11): neutral, indexOf(), tinted, Icon, icons, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, connectionDrivers (+3 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.52
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "SqlProfile"
Cohesion: 0.13
Nodes (12): SqlProfile, RoutineIndex, ErrorLocator, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig (+4 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.11
Nodes (22): ConnectionDriver, PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver() (+14 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.10
Nodes (23): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+15 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.13
Nodes (20): Checker<'a, '_>, closest_names(), max_distance(), output_columns(), Expr, Ident, Item, ObjectName (+12 more)

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
Cohesion: 0.10
Nodes (33): names(), findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql(), pad(), parameterNames() (+25 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (20): ast, statement_is_read_only(), count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number() (+12 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.12
Nodes (27): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), isPrefix(), onEscape() (+19 more)

### Community 52 - "ParserError"
Cohesion: 0.35
Nodes (19): after_handler_conditions(), classify_by_structure(), classify_routine(), classify_text(), classify_unparsed(), do_block_changes_data(), parse_single_statement(), routine_error() (+11 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (51): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+43 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (30): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+22 more)

### Community 55 - "updates.rs"
Cohesion: 0.08
Nodes (51): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+43 more)

### Community 56 - "MySqlConnector"
Cohesion: 0.27
Nodes (9): MySqlConnector, DriverError, Result, SchemaObjects, ServerVersion, String, TlsStatus, Vec (+1 more)

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
Nodes (51): aliasFor(), initials(), relationRef(), afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), buildKeywordCompletion(), catalogTable() (+43 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.21
Nodes (13): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+5 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "connectionTest.ts"
Cohesion: 0.13
Nodes (19): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+11 more)

### Community 68 - "Contribuir"
Cohesion: 0.25
Nodes (8): Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión, Sitio web

### Community 69 - "gridClipboard.ts"
Cohesion: 0.13
Nodes (22): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+14 more)

### Community 70 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.33
Nodes (9): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+1 more)

### Community 72 - "stores/shortcuts.ts"
Cohesion: 0.15
Nodes (13): commandDefinition, handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut (+5 more)

### Community 73 - "DestructiveClassification"
Cohesion: 0.21
Nodes (15): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_set_expr() (+7 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.17
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
Cohesion: 0.35
Nodes (13): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+5 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (42): analyze_sql(), apply_result_changes(), AppState, classify_statements(), connect(), count_query_rows(), database_explorer(), DEFAULT_QUERY_ROW_LIMIT (+34 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.22
Nodes (21): engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected(), fixture(), label(), Line (+13 more)

### Community 82 - "sqlCommentStyle.ts"
Cohesion: 0.18
Nodes (13): blockText(), commentDecorations(), commentMarks(), commentStyle, commentStylePlugin, commentStyleTheme, emphasis, Mark (+5 more)

### Community 83 - "sqlStatements.ts"
Cohesion: 0.09
Nodes (35): commentAwareWrap(), blockCommentEnd(), Comment, commentAt(), CommentKind, executablePrefix(), opensDashComment(), opensLineComment() (+27 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.23
Nodes (13): PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE, patch() (+5 more)

### Community 86 - "Dialect"
Cohesion: 0.10
Nodes (18): MYSQL, MYSQL, ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual() (+10 more)

### Community 87 - "super"
Cohesion: 0.21
Nodes (6): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, super

### Community 88 - "FileTree.svelte"
Cohesion: 0.15
Nodes (15): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+7 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.18
Nodes (4): AnalysisRunner, merge(), subtract(), runner()

### Community 90 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.19
Nodes (14): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+6 more)

### Community 95 - "sqlIndentation.ts"
Cohesion: 0.30
Nodes (11): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+3 more)

### Community 96 - "lib/backend.ts"
Cohesion: 0.10
Nodes (21): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+13 more)

### Community 97 - "sqlCatalogCompletions.ts"
Cohesion: 0.14
Nodes (15): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS (+7 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.15
Nodes (26): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+18 more)

### Community 99 - "sqlRelations.ts"
Cohesion: 0.23
Nodes (11): Token, END_FROM_LIST, isName(), nameOf(), NOT_ALIAS, StatementRelation, statementRelations(), takenNames() (+3 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.07
Nodes (54): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+46 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.20
Nodes (12): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+4 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (45): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), byQuotedName() (+37 more)

### Community 108 - "sqlFolders.ts"
Cohesion: 0.13
Nodes (16): folderMenuItems(), startCreate(), state(), pickSqlFolder(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord() (+8 more)

### Community 109 - "Option"
Cohesion: 0.21
Nodes (13): closest_keyword(), DiagnosticMessage, expected_found(), friendly_syntax(), is_simple_token(), join_constraint(), BTreeMap, Option (+5 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.09
Nodes (22): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 11. Version support packs, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line (+14 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (10): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+2 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.24
Nodes (13): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, schemas_to_load() (+5 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.09
Nodes (22): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 11. Paquetes de soporte de versión, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea (+14 more)

### Community 114 - "sqlWriting.test.ts"
Cohesion: 0.18
Nodes (16): buildFkIndex(), buildSqlSchema(), extractDefaultTable(), accept(), CATALOG, complete(), labels(), ORDERS (+8 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.22
Nodes (9): catalog_refresh_reloads_visible_schemas(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection() (+1 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.15
Nodes (11): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+3 more)

### Community 118 - "editorSearchPanel.ts"
Cohesion: 0.25
Nodes (13): createMatchCounter(), scopeForReplace(), scopeFromSelection(), searchMode, closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill() (+5 more)

### Community 119 - "ResultPane.svelte"
Cohesion: 0.07
Nodes (13): allState, style, active, danger, submit, executionLog, LogEntry, LogKind (+5 more)

### Community 120 - "vitest"
Cohesion: 0.08
Nodes (19): initials(), luminance(), readableTextColor(), ENGINES, ENGINE_SOURCES, blockClosingAt(), commentEditing, ENCLOSING (+11 more)

### Community 121 - "SqlEditor.svelte"
Cohesion: 0.13
Nodes (7): writeClipboard(), writeClipboardText(), createdTables(), lastPart(), created(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 122 - "Consolidación de Rowly DB y presupuesto de rendimiento — diseño"
Cohesion: 0.15
Nodes (13): 1. Reglas de arquitectura, 2. Inventario y límites propuestos, 3. Presupuesto y medición, 4. Reorganización de pruebas de producto, 6. Criterios para aceptar la consolidación, Compuertas de producto, Consolidación de Rowly DB y presupuesto de rendimiento — diseño, Contratos antes de mover código (+5 more)

### Community 123 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.21
Nodes (11): blocksHeldEnter(), confirmsOnEnter(), moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside() (+3 more)

### Community 125 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.25
Nodes (28): at_token(), byte_offset(), Diagnostic, ends_expression(), handler_action(), inspect_routine_chunk(), is_plain_name(), is_value() (+20 more)

### Community 127 - "classify_sql_with"
Cohesion: 0.23
Nodes (12): a_script_is_checked_statement_by_statement(), check_statement(), in_production_every_write_needs_confirmation(), Cow, classify_sql_with(), double_backslashes(), expand_executable_comments(), GuardOptions (+4 more)

### Community 128 - "DataGrid.svelte"
Cohesion: 0.32
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 129 - "RawStatement<'q>"
Cohesion: 0.18
Nodes (8): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, vector_text(), MySql

### Community 130 - "startFilePanelResize"
Cohesion: 0.21
Nodes (11): onePerFrame(), frames, setFilePanelHeight(), clampFilePanelHeight(), onFilePanelHandleKeydown(), startFilePanelResize(), onMove(), onUp() (+3 more)

### Community 131 - "Extensiones opcionales y futura tienda — límites antes del runtime"
Cohesion: 0.17
Nodes (12): 1. Tres cosas que no se mezclan, 2. Superficies de extensión, 3. Paquete y confianza, 4. Ciclo de vida y fallos, 5. Presupuesto de ligereza, 6. Orden de trabajo y compuertas, Código ejecutable: propuesta sujeta a prototipo, Dos ejemplos que prueban límites distintos (+4 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "vendorSupport.ts"
Cohesion: 0.15
Nodes (13): compare(), ENGINES, numbers(), Release, SupportStatus, today, vendorSupport, edgeRow() (+5 more)

### Community 134 - "lib/types.ts"
Cohesion: 0.07
Nodes (34): Fixture, FIXTURES, ORDERS, PROFILES, USERS, buildRoutineIndex(), CallArgument, callHints() (+26 more)

### Community 135 - "decorations.ts"
Cohesion: 0.22
Nodes (4): exclusionMarks, NewlineMarker, newlineMarkers, exclusionField

### Community 136 - "corpus.rs"
Cohesion: 0.22
Nodes (15): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+7 more)

### Community 137 - "@codemirror/state"
Cohesion: 0.26
Nodes (10): typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit (+2 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 140 - "catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 141 - ".new"
Cohesion: 0.20
Nodes (9): distance(), offset_at(), Position, postgres_opaque_definition(), Repaired<'a>, From, Self, Suggestion (+1 more)

### Community 142 - "state.ts"
Cohesion: 0.15
Nodes (12): addExclusion, clearExclusions, inScope(), isExcluded(), matchFilter(), QuerySpec, Range, scopeOf() (+4 more)

### Community 143 - "Workspace.svelte"
Cohesion: 0.20
Nodes (4): labelForKey(), $t(), ContextMenuItem, at()

### Community 144 - "real_sql"
Cohesion: 0.18
Nodes (21): entries(), is_error(), Vec, call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Entry (+13 more)

### Community 145 - "@codemirror/view"
Cohesion: 0.25
Nodes (8): MAX_COUNTED, ReplaceOptions, createSession(), SearchSession, filteredQuery(), specOf(), @codemirror/search, @codemirror/view

### Community 146 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 147 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 148 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 149 - "Contrato de motores y líneas de versión — organización del núcleo"
Cohesion: 0.20
Nodes (10): 2. Contexto efectivo por conexión, 3. Dónde vive cada regla, 4. Resolver una línea y fallar de forma conservadora, 6. Pruebas que siguen a cada motor y línea, 7. Plan de implementación y dependencia, Contrato de motores y líneas de versión — organización del núcleo, Estado y fuentes de verdad, Tres operaciones de mantenimiento distintas (+2 more)

### Community 150 - "fuzzing_the_guard_against_the_real_servers_finds_no_second_statement"
Cohesion: 0.52
Nodes (4): fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), Lcg, mutate(), whitespace_positions()

### Community 151 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 152 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 153 - "Vec"
Cohesion: 0.39
Nodes (8): CatalogView, Checker, mysql_select_into_errors(), Repaired, Vec, subquery_errors(), syntax_errors(), SqlparserDialect

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 155 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 156 - "svelte"
Cohesion: 0.16
Nodes (10): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), backend, invoke, release (+2 more)

### Community 157 - ".stream_query"
Cohesion: 0.57
Nodes (4): Future, Output, Pin, Send

### Community 158 - "apply"
Cohesion: 0.40
Nodes (6): apply(), MySqlConnectOptions, Option, TlsMode, ssl_mode(), MySqlSslMode

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 160 - "error_text"
Cohesion: 0.67
Nodes (3): error_text(), is_syntax_error(), QueryExecutionResult

### Community 161 - "apply"
Cohesion: 0.40
Nodes (6): apply(), Option, TlsMode, ssl_mode(), PgConnectOptions, PgSslMode

### Community 162 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities, 6. The matrix

### Community 163 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 165 - "reportPersistFailure"
Cohesion: 0.22
Nodes (10): flushConsolePersistence(), flushConsoleTexts(), hydrateLargeTexts(), PersistedConsole, queueDiskText(), reportPersistFailure(), textKey(), writeConsoles() (+2 more)

### Community 166 - "Message"
Cohesion: 0.18
Nodes (23): cancel_query(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file() (+15 more)

### Community 167 - "6. La matriz"
Cohesion: 0.33
Nodes (6): 6.1 Seguridad, 6.2 Análisis y diagnósticos, 6.3 SQL generado y autocompletado, 6.4 Drivers e introspección, 6.5 Capacidades, 6. La matriz

### Community 168 - "open_pool"
Cohesion: 0.40
Nodes (5): open_pool(), MySqlConnectOptions, MySqlPool, TlsMode, session_options()

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 177 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 179 - "+layout.svelte"
Cohesion: 0.12
Nodes (8): initLocaleEffects(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_review_dialog, app_src_lib_styles_tokens, app_src_lib_styles_tooltip, handleRefreshTables()

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **590 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+585 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1107 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `startFilePanelResize`, `commands.ts`, `lib/types.ts`, `vendorSupport.ts`, `@codemirror/state`, `sqlStatementIndex.test.ts`, `gridWindow.test.ts`, `sqlPreviewFormat.ts`, `connection.ts`, `package.json`, `focusZones.keys.test.ts`, `sqlStatementIndex.ts`, `queryConsoles.test.ts`, `sidebarLayout.ts`, `numpadKeys.ts`, `queryParameters.ts`, `gridSettings.ts`, `svelte`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlExecutionMarker.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sqlCommentStyle.ts`, `sqlStatements.ts`, `resultEdits.ts`, `pinnedResults.ts`, `theme.ts`, `gridSelectionSummary.ts`, `sqlIndentation.ts`, `lib/backend.ts`, `sqlCatalogCompletions.ts`, `engines/index.ts`, `sqlRelations.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `ExportDialog.svelte`, `sqlWriting.test.ts`, `editorSearchPanel.ts`, `SqlEditor.svelte`, `dialogMotion.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `driver-core/src/lib.rs`, `corpus.rs`, `DestructiveClassification`, `export.rs`, `.new`, `src-tauri/src/lib.rs`, `ActiveConnection`, `pagination.rs`, `ParserError`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `Vec`, `parser.rs`, `Engine`, `Diagnostic`, `classify_sql_with`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `SqlProfile` connect `SqlProfile` to `sqlCatalogCompletions.ts`, `engines/index.ts`, `6. The matrix`, `sqlContext.ts`, `lib/types.ts`, `sqlFormatter.ts`, `6. La matriz`, `sqlDiagnostics.ts`, `SQL engine quality contract`, `Contrato de calidad de los motores SQL`, `Contrato de motores y líneas de versión — organización del núcleo`, `sqlSchema.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _590 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._