# Graph Report - khipu  (2026-10-06)

## Corpus Check
- 493 files · ~537,551 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: (none) 10, .css 9, .sig 8)

## Summary
- 4729 nodes · 11141 edges · 211 communities (184 shown, 27 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 414 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a93150bd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- support.rs
- run.mjs
- postgres/src/lib.rs
- consoleFiles.ts
- createExecutionFlow
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- statementIndex.ts
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- sqlDefinitionLink.ts
- workspace/commands.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- ConnectionDriver
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- completionSource.ts
- default.json
- khipu-desktop
- postgres/src/introspect.rs
- sql_path
- configuration.ts
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
- resources.mjs
- analysisSession.ts
- pagination.rs
- EngineLines
- DestructiveClassification
- diagnostics.rs
- editing.rs
- updates.rs
- MySqlConnector
- server-tests/src/lib.rs
- sqlFiles.ts
- terminal.rs
- parameterTypes.ts
- buildCompletionSource
- executionMarker.ts
- assembly.rs
- lock
- query.rs
- messages/index.ts
- selected
- Contribuir
- gridClipboard.ts
- Workspace.svelte
- Engine
- blankLines.test.ts
- resultEditing.ts
- lib/types.ts
- contract.test.ts
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- DbConnector
- sqlStatements.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- QueryCancel
- State
- safety.rs
- resultTabs.ts
- theme.ts
- tests.mjs
- postgres/src/version.rs
- resultChanges.ts
- connectionTest.ts
- executionSession.ts
- callHints.ts
- engines/index.ts
- formatter.ts
- graph.mjs
- scripts
- main.js
- editorSettings.ts
- Quality CI Workflow
- iconOptics.ts
- cellTypes.ts
- invoke
- FileTree.svelte
- Option
- SQL engine quality contract
- ExportDialog.svelte
- AppState
- Contrato de calidad de los motores SQL
- sql_files.rs
- connection.rs
- write
- postgres/src/tls.rs
- createSearchPanel
- SqlLexical
- ref_node_fs
- formatLayout.ts
- console.rs
- text_encoding.rs
- ChangesPreview.svelte
- replace.ts
- Diagnostic
- publish.mjs
- result_editing.rs
- RawStatement<'q>
- +layout.svelte
- Extensiones opcionales y futura tienda — límites antes del runtime
- webkit_env.rs
- PostgresConnector
- explorerTree.ts
- NewlineMarker
- corpus.rs
- diagnostics.ts
- sqlPreviewFormat.ts
- new.mjs
- src/catalog.rs
- .new
- search.ts
- analysis.rs
- Adding a database engine
- ConnectionEngineContext
- Conn
- i18n/index.ts
- context.ts
- tests/lines.rs
- serde
- DataGrid.svelte
- connection_error.rs
- analysisRunner.test.ts
- parser.rs
- vitest
- SchemaTree.svelte
- .stream_query
- unused.mjs
- fetch.sh
- commands/catalog.rs
- TerminalSession.svelte
- gridSelectionSummary.ts
- Test databases
- ARCHITECTURE.es.md
- status.mjs
- search.dom.test.ts
- analysisRunner.ts
- coverage.mjs
- diagnosticPresentation.ts
- behavior.ts
- mysqlconnector
- postgresconnector
- RawStatement<'q>
- window.mjs
- lines.sh
- svelte.config.js
- diagnosticPresentation.dom.test.ts
- EditorConfiguration
- gridNavigation.ts
- gridWindow.test.ts
- error_position.rs
- DiagnosticPopup
- gridFind.ts
- ChangesView
- editor/commands.ts
- Performance measurements
- Mediciones de rendimiento
- commentEditing.ts
- columnFilters.ts
- Theme bootstrap IIFE (pre-paint CSS var injection)
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- Message
- @codemirror/state
- apply
- .connection
- closest_names
- Bases de datos de prueba
- FindBarActions
- 10. Tests, fixtures y simulaciones
- search.test.ts
- .fmt

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 113 edges
2. `vitest` - 93 edges
3. `svelte` - 53 edges
4. `Engine` - 52 edges
5. `@codemirror/state` - 44 edges
6. `analyze_statement()` - 40 edges
7. `SqlProfile` - 35 edges
8. `Diagnostic` - 35 edges
9. `ENGINES` - 34 edges
10. `selected()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Frontend (`app/src/lib`)` --references--> `engineForContext()`  [INFERRED]
  docs/ARCHITECTURE.es.md → app/src/lib/engines/index.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities (current state)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principios` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts
- `6.5 Capacidades (estado actual)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (211 total, 27 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (49): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive() (+41 more)

### Community 1 - "support.rs"
Cohesion: 0.07
Nodes (89): a_a_signed_index_and_its_packages_are_accepted(), a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), activate_installed(), ACTIVATION, an_http_error_says_its_status(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), an_unresolvable_host_says_there_is_no_network() (+81 more)

### Community 2 - "run.mjs"
Cohesion: 0.08
Nodes (24): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+16 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.17
Nodes (18): TransactionStatement, cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement (+10 more)

### Community 4 - "consoleFiles.ts"
Cohesion: 0.08
Nodes (17): #each(), forgetLog(), closeQueryConsole(), currentQueryConsole(), isQueryConsoleDirty(), QueryConsole, renameQueryConsole(), forgetResultEdits() (+9 more)

### Community 5 - "createExecutionFlow"
Cohesion: 0.10
Nodes (29): labelForKey(), $t(), tabExists(), appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole() (+21 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.09
Nodes (27): async_trait, CheckInfo, ColumnInfo, ConnectionConfig, DriverError, EventInfo, ForeignKeyInfo, IndexInfo (+19 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (38): isFilterOperator(), activateQueryConsole(), appendConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE (+30 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "statementIndex.ts"
Cohesion: 0.11
Nodes (31): doc, indexedState(), text, advance(), applyChanges(), backgroundIndexer, build(), hasTerminatedEnd() (+23 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.14
Nodes (24): QueryExecutionOptions, CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, hex_encode(), is_unsupported_in_prepared_protocol(), MAX_ROWS_TO_DRAIN (+16 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.21
Nodes (5): DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "workspace/commands.ts"
Cohesion: 0.05
Nodes (55): handleRecordKeydown(), activeZone, clearMark(), Direction, DIRECTION_COMMANDS, flash(), focusZone(), installFocusZones() (+47 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.07
Nodes (40): indexOf(), getDriver(), forgetConnectionPassword(), loadConnectionPassword(), runtimePasswords, saveConnectionPassword(), activeEngine, activeProfile (+32 more)

### Community 18 - "package.json"
Cohesion: 0.11
Nodes (17): description, license, name, type, version, codemirror, devicon, happy-dom (+9 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.14
Nodes (21): a_request_from_another_generation_or_epoch_is_no_longer_current(), civil_date(), dotted(), effective_line(), identity(), LineIdentity, Lines, one_year_after() (+13 more)

### Community 21 - "ConnectionDriver"
Cohesion: 0.11
Nodes (21): ConnectionDriver, FormatterDialect, ConnectionEngineContext, Arquitectura, Capas y dependencias, Cinco cosas que no son lo mismo, Cómo fluye el SQL, Frontend (`app/src/lib`) (+13 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.16
Nodes (19): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+11 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.14
Nodes (36): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+28 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.17
Nodes (19): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+11 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.08
Nodes (47): catalogTable(), COLUMN_TYPES, currentStatement(), dialectCache, EMPTY_TABLE_INDEX, extractFromContext(), extractFromTables(), FkIndex (+39 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.06
Nodes (66): build_parameters, apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind (+58 more)

### Community 32 - "configuration.ts"
Cohesion: 0.13
Nodes (22): findTableEntry(), resolveCatalogTable(), buildPhrases(), CODEMIRROR_PHRASES, createEditorConfiguration(), EditorConfigurationOptions, EditorSettingsSnapshot, InitialExtensions (+14 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.11
Nodes (14): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities, Self (+6 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.07
Nodes (28): neutral, openInNewWindow(), select(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, openConnectionWindow(), PasswordPolicy, MessageParams (+20 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.08
Nodes (27): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+19 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (24): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+16 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (17): Checker<'a, '_>, output_columns(), Repaired, Expr, Ident, ObjectName, Query, SetExpr (+9 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.18
Nodes (15): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+7 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.09
Nodes (18): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), load(), parse() (+10 more)

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (53): connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP, appHeapMb() (+45 more)

### Community 49 - "analysisSession.ts"
Cohesion: 0.10
Nodes (19): BackendMessage, Region, analysisCacheFor(), AnalysisContext, AnalysisDiagnostic, analysisDiagnostics(), AnalysisPosition, AnalysisSession (+11 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (30): GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64(), lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() (+22 more)

### Community 51 - "EngineLines"
Cohesion: 0.17
Nodes (20): Capability, check_line(), compare(), EngineLines, FORMAT, Line, numbers(), PACKAGE_FORMAT (+12 more)

### Community 52 - "DestructiveClassification"
Cohesion: 0.15
Nodes (39): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+31 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (55): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+47 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (33): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+25 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (84): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+76 more)

### Community 56 - "MySqlConnector"
Cohesion: 0.16
Nodes (16): MySqlConnector, open_pool(), Capabilities, ConnectionConfig, DriverError, MySqlConnectOptions, MySqlPool, Result (+8 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.15
Nodes (17): Capability, Declared, declared_servers(), declared_version(), entries(), Entry, evidence(), lines_json() (+9 more)

### Community 58 - "sqlFiles.ts"
Cohesion: 0.11
Nodes (30): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), pickSqlFolder(), renameConsoleFile() (+22 more)

### Community 59 - "terminal.rs"
Cohesion: 0.11
Nodes (28): alive(), create_terminal(), el_shell_no_hereda_las_rutas_de_la_appimage(), gone(), MAX_UNACKED, NEXT_ID, Outside, outside_appdir() (+20 more)

### Community 60 - "parameterTypes.ts"
Cohesion: 0.10
Nodes (33): BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS, OPERATOR (+25 more)

### Community 61 - "buildCompletionSource"
Cohesion: 0.08
Nodes (38): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), schemaOption() (+30 more)

### Community 62 - "executionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 63 - "assembly.rs"
Cohesion: 0.15
Nodes (23): drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row(), KeyColumnRow (+15 more)

### Community 64 - "lock"
Cohesion: 0.13
Nodes (22): close(), close_all(), close_window(), Flow, lock(), open(), Arc, Drop (+14 more)

### Community 65 - "query.rs"
Cohesion: 0.15
Nodes (28): a_script_is_checked_statement_by_statement(), analyze_sql(), cancel_query(), check_statement(), classify_statements(), count_query_rows(), DEFAULT_QUERY_ROW_LIMIT, execute_query() (+20 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.27
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "selected"
Cohesion: 0.18
Nodes (30): declared_tls(), IntoIterator, selected(), a_result_set_keeps_values_and_nulls(), a_server_error_keeps_its_code_and_position(), connector(), connects_and_lists_schemas_and_tables(), ddl_returns_a_command() (+22 more)

### Community 68 - "Contribuir"
Cohesion: 0.20
Nodes (10): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Novedad de la versión, Primeros pasos, Publicar una versión (+2 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.12
Nodes (24): writeClipboard(), COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue() (+16 more)

### Community 70 - "Workspace.svelte"
Cohesion: 0.10
Nodes (17): reorderResultTabs(), ContextMenuItem, moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove() (+9 more)

### Community 71 - "Engine"
Cohesion: 0.09
Nodes (23): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+15 more)

### Community 72 - "blankLines.test.ts"
Cohesion: 0.09
Nodes (20): LEXICALS, ONE_QUERY, SEVERAL, texts(), create(), LEXICALS, PIECES, split() (+12 more)

### Community 73 - "resultEditing.ts"
Cohesion: 0.24
Nodes (15): addRow(), buildChanges(), ColumnValue, deleteRows(), fillCells(), newRowValues(), originalValue(), pasteBlock() (+7 more)

### Community 74 - "lib/types.ts"
Cohesion: 0.08
Nodes (32): buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues(), newCondition() (+24 more)

### Community 75 - "contract.test.ts"
Cohesion: 0.12
Nodes (19): analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), editor(), shown(), views, painted() (+11 more)

### Community 76 - "super"
Cohesion: 0.09
Nodes (23): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), catalog, DEFINITION, UNPARSED, DoBlocks (+15 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.20
Nodes (14): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+6 more)

### Community 78 - "desktop.py"
Cohesion: 0.05
Nodes (54): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+46 more)

### Community 79 - "findBar.ts"
Cohesion: 0.26
Nodes (16): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+8 more)

### Community 80 - "console_texts.rs"
Cohesion: 0.14
Nodes (23): frontend_commands(), String, io_failure(), prune(), read(), AppHandle, Message, Option (+15 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.19
Nodes (25): engine_selected(), error_text(), check_version(), engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected() (+17 more)

### Community 82 - "DbConnector"
Cohesion: 0.16
Nodes (14): DbConnector, QueryColumn, QueryExecutionResult, RowSink, Formatter, Future, Message, Output (+6 more)

### Community 83 - "sqlStatements.ts"
Cohesion: 0.11
Nodes (29): scanInChunks(), commentAwareWrap(), blockCommentEnd(), Comment, commentAt(), CommentKind, executablePrefix(), opensDashComment() (+21 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.20
Nodes (18): EMPTY_EDITS, PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+10 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (22): MYSQL, same_single_statement(), ACTIVE_LINES, ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL (+14 more)

### Community 87 - "QueryCancel"
Cohesion: 0.23
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "State"
Cohesion: 0.15
Nodes (25): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+17 more)

### Community 89 - "safety.rs"
Cohesion: 0.14
Nodes (23): attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), INJECTIONS, Lcg (+15 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.13
Nodes (26): keepTabPosition(), addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab() (+18 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "postgres/src/version.rs"
Cohesion: 0.12
Nodes (11): Capability, Capabilities, capabilities_by_version(), COMPATIBILITY_FLOOR_MAJOR, Capabilities, Self, String, Vec (+3 more)

### Community 94 - "resultChanges.ts"
Cohesion: 0.13
Nodes (11): applyChanges(), ChangeError, EditTarget, fetchEditInfo(), previewChanges(), ResultChanges, ChangesBackend, ChangesPreview (+3 more)

### Community 95 - "connectionTest.ts"
Cohesion: 0.14
Nodes (19): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+11 more)

### Community 96 - "executionSession.ts"
Cohesion: 0.07
Nodes (30): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, nextSort(), STANDARD_LEXICAL (+22 more)

### Community 97 - "callHints.ts"
Cohesion: 0.09
Nodes (23): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+15 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.11
Nodes (35): byAnalyzerLocation(), byNearFragment(), byServerPosition(), ErrorLocator, firstLocated(), tokenAt(), ErrorHelp, ansiString() (+27 more)

### Community 99 - "formatter.ts"
Cohesion: 0.13
Nodes (20): FormatSettings, format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult (+12 more)

### Community 100 - "graph.mjs"
Cohesion: 0.10
Nodes (16): blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS, edges (+8 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "editorSettings.ts"
Cohesion: 0.14
Nodes (18): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+10 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "cellTypes.ts"
Cohesion: 0.18
Nodes (16): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+8 more)

### Community 107 - "invoke"
Cohesion: 0.14
Nodes (20): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), listSqlDir() (+12 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.12
Nodes (15): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY (+7 more)

### Community 109 - "Option"
Cohesion: 0.17
Nodes (19): analyze_statement_with(), DiagnosticMessage, expected_found(), friendly_syntax(), is_simple_token(), join_constraint(), key(), removed_syntax() (+11 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.07
Nodes (28): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+20 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.10
Nodes (12): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+4 more)

### Community 112 - "AppState"
Cohesion: 0.11
Nodes (28): a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, AppState, build_catalog(), ConsoleChange, context(), DatabaseExplorer, follow_console() (+20 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.08
Nodes (24): 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión, 13. Trabajar en un motor (personas e IA), 14.1 Nivel de soporte de cada motor, 14.2 Cobertura de cada fila, 14. Estado actual (+16 more)

### Community 114 - "sql_files.rs"
Cohesion: 0.25
Nodes (22): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+14 more)

### Community 115 - "connection.rs"
Cohesion: 0.14
Nodes (22): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), disconnect(), load_connection_password(), ConnectionConfig, ConnectionErrorKind (+14 more)

### Community 116 - "write"
Cohesion: 0.20
Nodes (20): bash(), cerrar_con_el_lector_detenido_no_deja_nada(), cien_aperturas_y_cierres_no_dejan_procesos_ni_registros(), close_all_cierra_las_de_todas_las_ventanas(), CLOSE_GRACE, drain(), el_shell_del_usuario_abre_responde_y_al_cerrar_no_queda(), el_tamano_llega_al_shell() (+12 more)

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.15
Nodes (11): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+3 more)

### Community 118 - "createSearchPanel"
Cohesion: 0.33
Nodes (9): closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel(), toggleSearchPanel() (+1 more)

### Community 119 - "SqlLexical"
Cohesion: 0.13
Nodes (17): blockText(), commentDecorations(), commentMarks(), commentStyle, commentStylePlugin, commentStyleTheme, styled(), views (+9 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.07
Nodes (31): query(), ENGINE_SOURCES, Backend (`app/src-tauri/src`), ref_lib, ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os (+23 more)

### Community 121 - "formatLayout.ts"
Cohesion: 0.31
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "text_encoding.rs"
Cohesion: 0.11
Nodes (31): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+23 more)

### Community 124 - "ChangesPreview.svelte"
Cohesion: 0.15
Nodes (14): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter(), moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick() (+6 more)

### Community 125 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.23
Nodes (28): at_token(), byte_offset(), check(), Diagnostic, handler_action(), inspect_routine_chunk(), keyword_text(), mysql_routine_errors() (+20 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "result_editing.rs"
Cohesion: 0.28
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+11 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.18
Nodes (8): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, vector_text(), MySql

### Community 130 - "+layout.svelte"
Cohesion: 0.08
Nodes (28): setSidebarRevealer(), initLocaleEffects(), onePerFrame(), frames, clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH (+20 more)

### Community 131 - "Extensiones opcionales y futura tienda — límites antes del runtime"
Cohesion: 0.17
Nodes (12): 1. Tres cosas que no se mezclan, 2. Superficies de extensión, 3. Paquete y confianza, 4. Ciclo de vida y fallos, 5. Presupuesto de ligereza, 6. Orden de trabajo y compuertas, Código ejecutable: propuesta sujeta a prototipo, Dos ejemplos que prueban límites distintos (+4 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.25
Nodes (6): apply(), DMABUF_VAR, SET_BY_ROWLY, should_disable_dmabuf(), AtomicBool, should_disable_dmabuf

### Community 133 - "PostgresConnector"
Cohesion: 0.15
Nodes (15): open_pool(), PostgresConnector, Capabilities, ConnectionConfig, DriverError, Error, PgPool, Result (+7 more)

### Community 134 - "explorerTree.ts"
Cohesion: 0.11
Nodes (22): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+14 more)

### Community 136 - "corpus.rs"
Cohesion: 0.26
Nodes (15): catalog(), check(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos() (+7 more)

### Community 137 - "diagnostics.ts"
Cohesion: 0.09
Nodes (26): byPosition(), byQuotedName(), charToUtf16(), clearDiagnosticsIn, diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter (+18 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "new.mjs"
Cohesion: 0.08
Nodes (29): Pruebas contra una base real, 11. Version support packs, 5.1 The rule, 5.2 Support policy, 5.3 Lines today, 5.4 Line data, 5. Version lines, 11. Paquetes de soporte de versión (+21 more)

### Community 140 - "src/catalog.rs"
Cohesion: 0.23
Nodes (10): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, CatalogTable, Option, String, Vec (+2 more)

### Community 141 - ".new"
Cohesion: 0.22
Nodes (8): offset_at(), Position, quoted_routine_definition(), Repaired<'a>, From, Self, Suggestion, Location

### Community 142 - "search.ts"
Cohesion: 0.12
Nodes (25): createMatchCounter(), MAX_COUNTED, exclusionMarks, newlineMarkers, createSession(), addExclusion, clearExclusions, exclusionField (+17 more)

### Community 143 - "analysis.rs"
Cohesion: 0.15
Nodes (26): is_error(), routines_corpus(), call_and_show_create_return_their_rows(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), is_syntax_error(), mixed_statements() (+18 more)

### Community 144 - "Adding a database engine"
Cohesion: 0.04
Nodes (55): if(), Request, reservedWords(), TableEntry, ConnectionConfig, ConnectionErrorKind, RelationKind, SchemaObjects (+47 more)

### Community 145 - "ConnectionEngineContext"
Cohesion: 0.19
Nodes (13): ConnectionEngineContext, line_support(), Arc, Option, Self, SupportStatus, SessionMode, status() (+5 more)

### Community 146 - "Conn"
Cohesion: 0.21
Nodes (9): classification(), classification_with(), Conn, dotted(), Option, QueryExecutionResult, Result, SchemaObjects (+1 more)

### Community 147 - "i18n/index.ts"
Cohesion: 0.06
Nodes (26): Icon, icons, allState, style, shortcutText(), $t(), index(), connectionDrivers (+18 more)

### Community 148 - "context.ts"
Cohesion: 0.12
Nodes (19): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+11 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.13
Nodes (19): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+11 more)

### Community 150 - "serde"
Cohesion: 0.16
Nodes (13): app_text_travels_as_key_and_params(), Message, raw_text_travels_as_a_plain_string(), BTreeMap, From, Into, Option, Self (+5 more)

### Community 151 - "DataGrid.svelte"
Cohesion: 0.12
Nodes (12): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit, installNumpadFix() (+4 more)

### Community 152 - "connection_error.rs"
Cohesion: 0.17
Nodes (12): ConnectionErrorKind, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind, Result (+4 more)

### Community 153 - "analysisRunner.test.ts"
Cohesion: 0.14
Nodes (11): create(), runner(), typed(), ranges(), addDiagnostics, diagnosticsField, setAnalysisIn, sqlDiagnostics (+3 more)

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 155 - "vitest"
Cohesion: 0.09
Nodes (20): initials(), luminance(), readableTextColor(), GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle() (+12 more)

### Community 156 - "SchemaTree.svelte"
Cohesion: 0.20
Nodes (10): destroy(), forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), tabScroll(), onWheel() (+2 more)

### Community 157 - ".stream_query"
Cohesion: 0.29
Nodes (8): cancelled_before_start(), Future, Message, Output, Pin, QueryExecutionResult, Self, Send

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "commands/catalog.rs"
Cohesion: 0.20
Nodes (16): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+8 more)

### Community 161 - "TerminalSession.svelte"
Cohesion: 0.13
Nodes (9): close(), $t(), closeTerminal(), createTerminal(), TerminalCallbacks, TerminalInfo, writeTerminal(), @xterm/addon-fit (+1 more)

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.19
Nodes (14): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+6 more)

### Community 163 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 165 - "status.mjs"
Cohesion: 0.18
Nodes (16): compare(), connections, coverage, coverageBlock(), DOCS, engines, enginesBlock(), json() (+8 more)

### Community 166 - "search.dom.test.ts"
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 167 - "analysisRunner.ts"
Cohesion: 0.19
Nodes (6): AnalysisRunner, AnalysisRunnerOptions, merge(), subtract(), DiagnosticPopupState, SqlDiagnostic

### Community 168 - "coverage.mjs"
Cohesion: 0.14
Nodes (12): cited, contract, coverage, ENGINES, lines, matrix, problems, rows (+4 more)

### Community 169 - "diagnosticPresentation.ts"
Cohesion: 0.24
Nodes (9): diagnosticCounter(), jump(), serverDiagnostics(), stopTypingIn(), Text, jumpToDiagnostic(), visibleDiagnosticCount(), groupByFixes() (+1 more)

### Community 170 - "behavior.ts"
Cohesion: 0.27
Nodes (9): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, typingSpan() (+1 more)

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.16
Nodes (14): args, compare(), inWindow(), lineOf(), lines, numbers(), prefix(), problems (+6 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 177 - "diagnosticPresentation.dom.test.ts"
Cohesion: 0.27
Nodes (7): createDiagnosticPopup(), applyFix(), cancelHoverClose(), close(), scheduleHoverClose(), mounted(), applyQuickFix()

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "gridWindow.test.ts"
Cohesion: 0.17
Nodes (7): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual(), ResultTabActions

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 184 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 185 - "ChangesView"
Cohesion: 0.24
Nodes (5): invalidCells(), ChangesView, blockedByInvalidValues(), currentChanges(), openPreview()

### Community 186 - "editor/commands.ts"
Cohesion: 0.09
Nodes (17): createEditorCommands(), currentSqlRange(), mounted(), Selection, state(), EditorCommands, EditorCommandsOptions, executionRequest (+9 more)

### Community 187 - "Performance measurements"
Cohesion: 0.29
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "commentEditing.ts"
Cohesion: 0.28
Nodes (6): blockClosingAt(), commentEditing, ENCLOSING, reaches(), typing, @lezer/common

### Community 190 - "columnFilters.ts"
Cohesion: 0.33
Nodes (9): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+1 more)

### Community 191 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 198 - "Message"
Cohesion: 0.51
Nodes (10): ack(), ack_terminal(), close_terminal(), not_found(), resize(), resize_terminal(), Message, Result (+2 more)

### Community 200 - "@codemirror/state"
Cohesion: 0.60
Nodes (4): createdTables(), lastPart(), created(), @codemirror/state

### Community 201 - "apply"
Cohesion: 0.40
Nodes (6): apply(), Option, TlsMode, ssl_mode(), PgConnectOptions, PgSslMode

### Community 202 - ".connection"
Cohesion: 0.40
Nodes (4): DriverError, Into, Self, String

### Community 203 - "closest_names"
Cohesion: 0.50
Nodes (5): closest_keyword(), closest_names(), distance(), max_distance(), Iterator

### Community 204 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 206 - "10. Tests, fixtures y simulaciones"
Cohesion: 0.50
Nodes (4): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **790 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+785 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1542 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `consoleFiles.ts`, `explorerTree.ts`, `statementIndex.ts`, `sqlPreviewFormat.ts`, `workspace/commands.ts`, `Adding a database engine`, `connection.ts`, `package.json`, `i18n/index.ts`, `context.ts`, `DataGrid.svelte`, `analysisRunner.test.ts`, `completionSource.ts`, `SchemaTree.svelte`, `configuration.ts`, `TerminalSession.svelte`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `diagnosticPresentation.ts`, `behavior.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `ResultPager.svelte`, `analysisSession.ts`, `diagnosticPresentation.dom.test.ts`, `gridNavigation.ts`, `gridWindow.test.ts`, `gridFind.ts`, `editor/commands.ts`, `parameterTypes.ts`, `buildCompletionSource`, `executionMarker.ts`, `columnFilters.ts`, `gridClipboard.ts`, `blankLines.test.ts`, `@codemirror/state`, `lib/types.ts`, `contract.test.ts`, `resultEditing.ts`, `queryHistory.ts`, `search.test.ts`, `sqlStatements.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `connectionTest.ts`, `executionSession.ts`, `callHints.ts`, `engines/index.ts`, `formatter.ts`, `cellTypes.ts`, `invoke`, `ExportDialog.svelte`, `SqlLexical`, `ref_node_fs`, `formatLayout.ts`, `ChangesPreview.svelte`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `result_editing.rs`, `support.rs`, `execution_guard.rs`, `corpus.rs`, `.new`, `ConnectionEngineContext`, `Conn`, `engine_context.rs`, `tests/lines.rs`, `drivers.rs`, `parser.rs`, `export.rs`, `pagination.rs`, `DestructiveClassification`, `diagnostics.rs`, `editing.rs`, `server-tests/src/lib.rs`, `query.rs`, `super`, `Option`, `AppState`, `Diagnostic`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `svelte` connect `vitest` to `+layout.svelte`, `consoleFiles.ts`, `queryConsoles.ts`, `workspace/commands.ts`, `connection.ts`, `package.json`, `i18n/index.ts`, `SchemaTree.svelte`, `diagnosticPresentation.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `diagnosticPresentation.dom.test.ts`, `sqlFiles.ts`, `buildCompletionSource`, `gridClipboard.ts`, `Workspace.svelte`, `queryHistory.ts`, `findBar.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `resultChanges.ts`, `executionSession.ts`, `editorSettings.ts`, `iconOptics.ts`, `invoke`, `FileTree.svelte`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _790 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._