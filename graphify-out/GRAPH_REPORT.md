# Graph Report - khipu  (2026-10-07)

## Corpus Check
- 505 files · ~553,528 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: (none) 10, .css 10, .sig 8)

## Summary
- 4877 nodes · 11503 edges · 214 communities (188 shown, 26 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 445 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b95a71d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- EngineLines
- webdriver.mjs
- postgres/src/lib.rs
- queryConsoles.ts
- editorSettings.ts
- driver-core/src/lib.rs
- Conn
- docs/ARCHITECTURE.md
- mysql/src/introspect.rs
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- DefinitionLinkPlugin
- configuration.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- Store
- compilerOptions
- drivers.rs
- diagnosticPresentation.ts
- devDependencies
- credentials.rs
- completionSource.ts
- default.json
- khipu-desktop
- postgres/src/introspect.rs
- sql_path
- sqlFiles.ts
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
- context.ts
- pagination.rs
- postgres/src/version.rs
- i18n/index.ts
- diagnostics.rs
- editing.rs
- updates.rs
- Result
- server-tests/src/lib.rs
- support.rs
- Adding a database engine
- parameterTypes.ts
- result_editing.rs
- executionMarker.ts
- assembly.rs
- terminal.rs
- query.rs
- messages/index.ts
- selected
- Contribuir
- gridClipboard.ts
- workspace/mosaic.ts
- lib/types.ts
- gridSettings.ts
- executionSession.ts
- MySqlConnector
- run.mjs
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- serde
- analysisSession.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- svelte
- Dialect
- QueryCancel
- State
- safety.rs
- resultTabs.ts
- theme.ts
- tests.mjs
- vitest
- AnalysisRunner
- connectionTest.ts
- DiagnosticPopup.svelte
- install_support_package
- engines/index.ts
- SchemaTree.svelte
- graph.mjs
- scripts
- main.js
- formatter.ts
- Quality CI Workflow
- TilePicker.svelte
- cellTypes.ts
- executionSession.test.ts
- workspace/commands.ts
- Option
- SQL engine quality contract
- ExportDialog.svelte
- AppState
- Contrato de calidad de los motores SQL
- connectionIdentity.ts
- connection.rs
- svelte.config.js
- postgres/src/tls.rs
- stores/shortcuts.ts
- gridFind.ts
- ref_node_fs
- FileTree.svelte
- console.rs
- analysisRunner.test.ts
- dialogMotion.ts
- replace.ts
- Diagnostic
- publish.mjs
- TerminalSession.svelte
- RawStatement<'q>
- +layout.svelte
- Extensiones opcionales y futura tienda — límites antes del runtime
- webkit_env.rs
- PostgresConnector
- explorerTree.ts
- NewlineMarker
- corpus.rs
- focusZones.ts
- columnFilters.ts
- new.mjs
- invoke
- .new
- search.ts
- analysis.rs
- createSearchPanel
- ResultTabActions
- DestructiveClassification
- svelte
- sql_files.rs
- tests/lines.rs
- SqlLexical
- Rejected
- connection_error.rs
- desktop_portal.rs
- parser.rs
- onePerFrame.ts
- Workspace.svelte
- resultEditing.ts
- unused.mjs
- fetch.sh
- khipu_driver_core
- line
- gridSelectionSummary.ts
- catalog_bench.rs
- ARCHITECTURE.es.md
- status.mjs
- search.dom.test.ts
- diagnostics.ts
- coverage.mjs
- Engine
- DbConnector
- mysqlconnector
- postgresconnector
- RawStatement<'q>
- window.mjs
- lines.sh
- consoleFiles.ts
- keybindings.ts
- diagnosticPresentation.dom.test.ts
- gridNavigation.ts
- gridWindow.test.ts
- error_position.rs
- createResultChanges
- ConnectionEngineContext
- Performance measurements
- EditorCommands
- String
- Mediciones de rendimiento
- sqlStatements.ts
- .index
- session.ts
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- DiagnosticPopup
- Test databases
- src/catalog.rs
- queryParameters.ts
- sidebarLayout.ts
- ChangesPreview.svelte
- services/catalog.rs
- focusZones.keys.test.ts
- 6. The matrix
- LensMessage
- closest_names
- Bases de datos de prueba
- ResultPane.svelte
- vite.config.js
- TabsView

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 113 edges
2. `vitest` - 97 edges
3. `svelte` - 54 edges
4. `Engine` - 52 edges
5. `@codemirror/state` - 44 edges
6. `analyze_statement()` - 40 edges
7. `SqlProfile` - 35 edges
8. `Diagnostic` - 35 edges
9. `ENGINES` - 34 edges
10. `selected()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `1. Identity: engine, dialect, driver` --references--> `ConnectionDriver`  [INFERRED]
  ENGINE_GUIDE.md → app/src/lib/connections.ts
- `1. Identidad: motor, dialecto, driver` --references--> `ConnectionDriver`  [INFERRED]
  ENGINE_GUIDE.es.md → app/src/lib/connections.ts
- `Frontend (`app/src/lib`)` --references--> `engineForContext()`  [INFERRED]
  docs/ARCHITECTURE.es.md → app/src/lib/engines/index.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities (current state)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (214 total, 26 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (49): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive() (+41 more)

### Community 1 - "EngineLines"
Cohesion: 0.17
Nodes (22): Capability, check_line(), compare(), EngineLines, FORMAT, Line, numbers(), Origin (+14 more)

### Community 2 - "webdriver.mjs"
Cohesion: 0.13
Nodes (11): DOM_KEYS, Element, elementId(), KEYS, request(), Session, X11_KEYS, x11Chord() (+3 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.18
Nodes (17): cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement, RESTORE_SERVER_TIME_ZONE (+9 more)

### Community 4 - "queryConsoles.ts"
Cohesion: 0.06
Nodes (42): isFilterOperator(), activateQueryConsole(), appendConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE (+34 more)

### Community 5 - "editorSettings.ts"
Cohesion: 0.11
Nodes (27): backspaceIndent(), buildTabCompletionKeymap(), editor(), views, indentationExtension(), tabCompletionBinding(), tabIndent(), DEFAULT_INDENT_SIZE (+19 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (30): async_trait, CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo (+22 more)

### Community 7 - "Conn"
Cohesion: 0.17
Nodes (14): classification(), Conn, dotted(), error_text(), is_error(), record(), QueryExecutionResult, Result (+6 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "mysql/src/introspect.rs"
Cohesion: 0.14
Nodes (36): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+28 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.16
Nodes (21): CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, is_unsupported_in_prepared_protocol(), MAX_ROWS_TO_DRAIN, mysql_cell_to_query_value(), mysql_error_to_result() (+13 more)

### Community 14 - "configuration.ts"
Cohesion: 0.04
Nodes (48): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+40 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.08
Nodes (37): indexOf(), select(), toConnectionFailure(), getDriver(), loadConnectionPassword(), activeEngine, activeProfile, catalogTables (+29 more)

### Community 18 - "package.json"
Cohesion: 0.12
Nodes (15): description, license, name, type, version, codemirror, happy-dom, sql-formatter (+7 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.20
Nodes (12): dotted(), effective_line(), identity(), line_support(), LineIdentity, one_year_after(), Option, status() (+4 more)

### Community 21 - "Store"
Cohesion: 0.20
Nodes (21): disabling_a_line_moves_its_servers_to_the_closest_active_line_below_and_one_stays_active(), downloaded(), fitting(), fixtures(), h_an_interrupted_or_failed_install_keeps_the_previous_package(), i_j_an_update_changes_the_revision_and_removing_it_returns_the_included_one(), install(), installed_r2() (+13 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (18): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+10 more)

### Community 24 - "diagnosticPresentation.ts"
Cohesion: 0.22
Nodes (10): diagnosticCounter(), jump(), serverDiagnostics(), stopTypingIn(), Text, jumpToDiagnostic(), visibleDiagnosticCount(), ErrorHelp (+2 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.06
Nodes (68): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), schemaOption() (+60 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.06
Nodes (66): build_parameters, apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind (+58 more)

### Community 32 - "sqlFiles.ts"
Cohesion: 0.16
Nodes (22): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+14 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.11
Nodes (14): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities, Self (+6 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.09
Nodes (24): openInNewWindow(), Icon, icons, openConnectionWindow(), PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile (+16 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.06
Nodes (31): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+23 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (24): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+16 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (17): Checker<'a, '_>, output_columns(), Repaired, Expr, Ident, ObjectName, Query, SetExpr (+9 more)

### Community 45 - "FindBar"
Cohesion: 0.17
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.19
Nodes (16): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+8 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.12
Nodes (11): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE (+3 more)

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (52): connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP, appHeapMb() (+44 more)

### Community 49 - "context.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (30): GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64(), lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() (+22 more)

### Community 51 - "postgres/src/version.rs"
Cohesion: 0.12
Nodes (11): Capability, Capabilities, capabilities_by_version(), COMPATIBILITY_FLOOR_MAJOR, Capabilities, Self, String, Vec (+3 more)

### Community 52 - "i18n/index.ts"
Cohesion: 0.18
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), numberFormat, systemLocale(), translator() (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (55): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+47 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (33): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+25 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (85): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+77 more)

### Community 56 - "Result"
Cohesion: 0.17
Nodes (14): hex_encode(), open_pool(), ConnectionConfig, DriverError, MySqlConnectOptions, MySqlRow, Result, SchemaObjects (+6 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.15
Nodes (16): Capability, Declared, declared_servers(), declared_version(), entries(), Entry, lines_json(), NO_BACKSLASH_ESCAPES_OFF (+8 more)

### Community 58 - "support.rs"
Cohesion: 0.10
Nodes (35): a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), ACTIVATION, an_http_error_says_its_status(), an_unresolvable_host_says_there_is_no_network(), APP, assert_no_reqwest_text(), Available (+27 more)

### Community 59 - "Adding a database engine"
Cohesion: 0.04
Nodes (68): if(), reservedWords(), TableEntry, ConnectionConfig, ConnectionErrorKind, RelationKind, SchemaObjects, TlsStatus (+60 more)

### Community 60 - "parameterTypes.ts"
Cohesion: 0.10
Nodes (33): BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS, OPERATOR (+25 more)

### Community 61 - "result_editing.rs"
Cohesion: 0.28
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+11 more)

### Community 62 - "executionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 63 - "assembly.rs"
Cohesion: 0.14
Nodes (25): Item, crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow (+17 more)

### Community 64 - "terminal.rs"
Cohesion: 0.06
Nodes (80): ack(), ack_terminal(), alive(), bash(), cerrar_con_el_lector_detenido_no_deja_nada(), cien_aperturas_y_cierres_no_dejan_procesos_ni_registros(), close(), close_all() (+72 more)

### Community 65 - "query.rs"
Cohesion: 0.15
Nodes (28): a_script_is_checked_statement_by_statement(), analyze_sql(), cancel_query(), check_statement(), classify_statements(), count_query_rows(), DEFAULT_QUERY_ROW_LIMIT, execute_query() (+20 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.26
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "selected"
Cohesion: 0.18
Nodes (30): declared_tls(), IntoIterator, selected(), a_result_set_keeps_values_and_nulls(), a_server_error_keeps_its_code_and_position(), connector(), connects_and_lists_schemas_and_tables(), ddl_returns_a_command() (+22 more)

### Community 68 - "Contribuir"
Cohesion: 0.20
Nodes (10): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Novedad de la versión, Primeros pasos, Publicar una versión (+2 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.11
Nodes (24): writeClipboard(), COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue() (+16 more)

### Community 70 - "workspace/mosaic.ts"
Cohesion: 0.05
Nodes (68): clampRatio(), dropTarget(), finish(), onDividerKeydown(), onKey(), onMove(), startResize(), onMove() (+60 more)

### Community 71 - "lib/types.ts"
Cohesion: 0.08
Nodes (32): buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues(), newCondition() (+24 more)

### Community 72 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 73 - "executionSession.ts"
Cohesion: 0.11
Nodes (29): nextSort(), appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation() (+21 more)

### Community 74 - "MySqlConnector"
Cohesion: 0.19
Nodes (14): QueryExecutionOptions, cancelled_before_start(), MySqlConnector, Capabilities, Future, Message, MySqlPool, Output (+6 more)

### Community 75 - "run.mjs"
Cohesion: 0.13
Nodes (14): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+6 more)

### Community 76 - "super"
Cohesion: 0.11
Nodes (18): DEFINITION, UNPARSED, DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies, Option, DEFINITION (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.19
Nodes (15): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+7 more)

### Community 78 - "desktop.py"
Cohesion: 0.06
Nodes (53): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+45 more)

### Community 79 - "findBar.ts"
Cohesion: 0.27
Nodes (14): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+6 more)

### Community 80 - "console_texts.rs"
Cohesion: 0.14
Nodes (23): frontend_commands(), String, io_failure(), prune(), read(), AppHandle, Message, Option (+15 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.20
Nodes (24): engine_selected(), check_version(), engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected(), fixture() (+16 more)

### Community 82 - "serde"
Cohesion: 0.13
Nodes (15): app_text_travels_as_key_and_params(), Message, raw_text_travels_as_a_plain_string(), BTreeMap, Formatter, From, Into, Option (+7 more)

### Community 83 - "analysisSession.ts"
Cohesion: 0.14
Nodes (16): BackendMessage, analysisCacheFor(), AnalysisContext, AnalysisDiagnostic, analysisDiagnostics(), AnalysisPosition, AnalysisSessionOptions, sameContext() (+8 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "svelte"
Cohesion: 0.14
Nodes (23): EMPTY_EDITS, PendingEdits, RowRange, executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES, MAX_LOG_TEXT (+15 more)

### Community 86 - "Dialect"
Cohesion: 0.11
Nodes (17): MYSQL, same_single_statement(), ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido() (+9 more)

### Community 87 - "QueryCancel"
Cohesion: 0.21
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "State"
Cohesion: 0.15
Nodes (25): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+17 more)

### Community 89 - "safety.rs"
Cohesion: 0.13
Nodes (24): routines_corpus(), attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), INJECTIONS (+16 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.17
Nodes (25): addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+17 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "vitest"
Cohesion: 0.05
Nodes (48): analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), Request, complete(), schemas, blockClosingAt() (+40 more)

### Community 94 - "AnalysisRunner"
Cohesion: 0.14
Nodes (5): AnalysisRunner, merge(), Region, AnalysisSession, createAnalysisSession()

### Community 95 - "connectionTest.ts"
Cohesion: 0.14
Nodes (18): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+10 more)

### Community 96 - "DiagnosticPopup.svelte"
Cohesion: 0.22
Nodes (7): focused(), mountTree(), focusRow(), itemOf(), treeKeys(), onClick(), onKeydown()

### Community 97 - "install_support_package"
Cohesion: 0.41
Nodes (17): activate_installed(), app_version(), apply(), check_support_updates(), current_status(), install_support_package(), LineStatus, Message (+9 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.11
Nodes (35): ConnectionDriver, byAnalyzerLocation(), byServerPosition(), firstLocated(), tokenAt(), ansiString(), caseInsensitiveName(), COMMON_RESERVED (+27 more)

### Community 99 - "SchemaTree.svelte"
Cohesion: 0.18
Nodes (10): destroy(), child(), forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), tabScroll() (+2 more)

### Community 100 - "graph.mjs"
Cohesion: 0.11
Nodes (16): blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS, edges (+8 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "formatter.ts"
Cohesion: 0.12
Nodes (35): FormatSettings, alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass() (+27 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "TilePicker.svelte"
Cohesion: 0.22
Nodes (7): active, byId, filtered, move(), onKeydown(), pick(), query

### Community 106 - "cellTypes.ts"
Cohesion: 0.18
Nodes (16): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+8 more)

### Community 107 - "executionSession.test.ts"
Cohesion: 0.08
Nodes (25): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, STANDARD_LEXICAL, applySessionContext() (+17 more)

### Community 108 - "workspace/commands.ts"
Cohesion: 0.22
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, handlerKey(), handlers, registerCommand() (+7 more)

### Community 109 - "Option"
Cohesion: 0.17
Nodes (19): analyze_statement_with(), DiagnosticMessage, expected_found(), friendly_syntax(), is_simple_token(), join_constraint(), key(), removed_syntax() (+11 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.09
Nodes (22): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+14 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (10): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+2 more)

### Community 112 - "AppState"
Cohesion: 0.10
Nodes (31): the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine(), a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, AppState, build_catalog(), ConsoleChange, context(), DatabaseExplorer (+23 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.07
Nodes (28): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión (+20 more)

### Community 114 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 115 - "connection.rs"
Cohesion: 0.16
Nodes (20): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), disconnect(), load_connection_password(), ConnectionConfig, ConnectionErrorKind (+12 more)

### Community 116 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "stores/shortcuts.ts"
Cohesion: 0.13
Nodes (10): handleRecordKeydown(), KEY_SYMBOLS, MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, ShortcutEventLike (+2 more)

### Community 119 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.09
Nodes (27): query(), ENGINE_SOURCES, Backend (`app/src-tauri/src`), ref_node_assert, ref_node_fs, ref_node_os, ref_node_path, ref_node_test (+19 more)

### Community 121 - "FileTree.svelte"
Cohesion: 0.09
Nodes (21): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), error(), pickSqlFolder() (+13 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "analysisRunner.test.ts"
Cohesion: 0.17
Nodes (10): AnalysisRunnerOptions, subtract(), create(), runner(), typed(), DiagnosticPopupState, setAnalysisIn, SqlDiagnostic (+2 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.27
Nodes (9): moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint (+1 more)

### Community 125 - "replace.ts"
Cohesion: 0.36
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.23
Nodes (28): at_token(), byte_offset(), check(), Diagnostic, handler_action(), inspect_routine_chunk(), keyword_text(), mysql_routine_errors() (+20 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "TerminalSession.svelte"
Cohesion: 0.16
Nodes (8): active, closing, closeTerminal(), createTerminal(), TerminalCallbacks, TerminalInfo, writeTerminal(), @xterm/addon-fit

### Community 129 - "RawStatement<'q>"
Cohesion: 0.22
Nodes (6): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement

### Community 130 - "+layout.svelte"
Cohesion: 0.10
Nodes (17): setSidebarRevealer(), initLocaleEffects(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText(), app_src_lib_styles_alert_dialog (+9 more)

### Community 131 - "Extensiones opcionales y futura tienda — límites antes del runtime"
Cohesion: 0.17
Nodes (12): 1. Tres cosas que no se mezclan, 2. Superficies de extensión, 3. Paquete y confianza, 4. Ciclo de vida y fallos, 5. Presupuesto de ligereza, 6. Orden de trabajo y compuertas, Código ejecutable: propuesta sujeta a prototipo, Dos ejemplos que prueban límites distintos (+4 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.25
Nodes (6): apply(), DMABUF_VAR, SET_BY_ROWLY, should_disable_dmabuf(), AtomicBool, should_disable_dmabuf

### Community 133 - "PostgresConnector"
Cohesion: 0.14
Nodes (16): open_pool(), PostgresConnector, Capabilities, ConnectionConfig, DriverError, Error, PgPool, Result (+8 more)

### Community 134 - "explorerTree.ts"
Cohesion: 0.11
Nodes (22): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+14 more)

### Community 136 - "corpus.rs"
Cohesion: 0.26
Nodes (15): catalog(), check(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos() (+7 more)

### Community 137 - "focusZones.ts"
Cohesion: 0.11
Nodes (33): clearMark(), Direction, DIRECTION_COMMANDS, flash(), flashTimers, focusZone(), holding(), installFocusZones() (+25 more)

### Community 138 - "columnFilters.ts"
Cohesion: 0.14
Nodes (12): allState, style, collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS (+4 more)

### Community 139 - "new.mjs"
Cohesion: 0.15
Nodes (13): args, base, contract, contractPath, corpus, dialects, fail(), file (+5 more)

### Community 140 - "invoke"
Cohesion: 0.12
Nodes (23): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), forgetConnectionPassword() (+15 more)

### Community 141 - ".new"
Cohesion: 0.22
Nodes (8): offset_at(), Position, quoted_routine_definition(), Repaired<'a>, From, Self, Suggestion, Location

### Community 142 - "search.ts"
Cohesion: 0.13
Nodes (18): __test, createMatchCounter(), MAX_COUNTED, exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField (+10 more)

### Community 143 - "analysis.rs"
Cohesion: 0.20
Nodes (20): call_and_show_create_return_their_rows(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), mixed_statements(), real_sql(), rows_of(), Option (+12 more)

### Community 144 - "createSearchPanel"
Cohesion: 0.20
Nodes (13): closeAndFocusEditor(), createSearchPanel(), renderMode(), mount(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel() (+5 more)

### Community 146 - "DestructiveClassification"
Cohesion: 0.14
Nodes (40): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+32 more)

### Community 147 - "svelte"
Cohesion: 0.07
Nodes (10): neutral, shortcutText(), $t(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, connectionDrivers, DriverDefinition, setFormatterLineWidth() (+2 more)

### Community 148 - "sql_files.rs"
Cohesion: 0.08
Nodes (53): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+45 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.13
Nodes (19): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+11 more)

### Community 150 - "SqlLexical"
Cohesion: 0.08
Nodes (33): commentAwareWrap(), blockText(), commentDecorations(), commentMarks(), commentStyle, commentStylePlugin, commentStyleTheme, styled() (+25 more)

### Community 151 - "Rejected"
Cohesion: 0.24
Nodes (13): check_package(), fetch(), fetch_index(), fetch_with(), Network, parse_index(), read_index(), Rejected (+5 more)

### Community 152 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 153 - "desktop_portal.rs"
Cohesion: 0.43
Nodes (7): report_slow_start(), Duration, Option, String, SLOW_START, slow_start_hint(), solo_avisa_de_un_arranque_lento()

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 155 - "onePerFrame.ts"
Cohesion: 0.21
Nodes (11): onePerFrame(), frames, setFilePanelHeight(), clampFilePanelHeight(), onFilePanelHandleKeydown(), startFilePanelResize(), onMove(), onUp() (+3 more)

### Community 156 - "Workspace.svelte"
Cohesion: 0.07
Nodes (8): close(), $t(), tabExists(), ContextMenuItem, app_src_lib_sqleditoricons, setEditorGroups(), app_src_lib_styles_editorsearch, ExecutionFlow

### Community 157 - "resultEditing.ts"
Cohesion: 0.09
Nodes (27): addRow(), applyChanges(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fetchEditInfo() (+19 more)

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "khipu_driver_core"
Cohesion: 0.19
Nodes (17): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+9 more)

### Community 161 - "line"
Cohesion: 0.16
Nodes (15): Pruebas contra una base real, Cinco cosas que no son lo mismo, 5.1 The rule, 5.2 Support policy, 5.3 Lines today, 5.4 Line data, 5. Version lines, 5.1 La regla (+7 more)

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.20
Nodes (13): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+5 more)

### Community 163 - "catalog_bench.rs"
Cohesion: 0.18
Nodes (15): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+7 more)

### Community 165 - "status.mjs"
Cohesion: 0.18
Nodes (16): compare(), connections, coverage, coverageBlock(), DOCS, engines, enginesBlock(), json() (+8 more)

### Community 166 - "search.dom.test.ts"
Cohesion: 0.18
Nodes (10): click(), findArea(), findRow(), flush(), replaceAll(), replaceArea(), replaceRow(), select() (+2 more)

### Community 167 - "diagnostics.ts"
Cohesion: 0.09
Nodes (28): ranges(), byNearFragment(), byPosition(), byQuotedName(), charToUtf16(), diagnosticAt(), diagnosticDecorations(), DiagnosticMark (+20 more)

### Community 168 - "coverage.mjs"
Cohesion: 0.12
Nodes (13): 11. Paquetes de soporte de versión, cited, contract, coverage, ENGINES, lines, matrix, problems (+5 more)

### Community 169 - "Engine"
Cohesion: 0.15
Nodes (9): Engine, .ALL, evidence(), NoBackslashEscapes, ConnectionConfig, DriverError, Drop, TlsMode (+1 more)

### Community 170 - "DbConnector"
Cohesion: 0.16
Nodes (12): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Message, Output (+4 more)

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.16
Nodes (14): args, compare(), inWindow(), lineOf(), lines, numbers(), prefix(), problems (+6 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "consoleFiles.ts"
Cohesion: 0.09
Nodes (16): forgetLog(), closeQueryConsole(), currentQueryConsole(), isQueryConsoleDirty(), QueryConsole, renameQueryConsole(), forgetResultEdits(), ConsoleFiles (+8 more)

### Community 177 - "keybindings.ts"
Cohesion: 0.21
Nodes (13): activeZone, installKeybindings(), onKeydown(), onKeyup(), track(), withHeld(), Modifier, modifierOfCode() (+5 more)

### Community 178 - "diagnosticPresentation.dom.test.ts"
Cohesion: 0.20
Nodes (10): createDiagnosticPopup(), applyFix(), cancelHoverClose(), close(), scheduleHoverClose(), mounted(), addDiagnostics, applyQuickFix() (+2 more)

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 183 - "createResultChanges"
Cohesion: 0.15
Nodes (15): MessageKey, invalidCells(), CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned (+7 more)

### Community 184 - "ConnectionEngineContext"
Cohesion: 0.19
Nodes (9): a_request_from_another_generation_or_epoch_is_no_longer_current(), ConnectionEngineContext, Arc, Self, SupportStatus, SessionMode, the_context_keeps_its_shape(), VendorSupport (+1 more)

### Community 185 - "Performance measurements"
Cohesion: 0.29
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 187 - "String"
Cohesion: 0.31
Nodes (11): civil_date(), Lines, Release, RELEASES, HashMap, String, Vec, today() (+3 more)

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "sqlStatements.ts"
Cohesion: 0.04
Nodes (94): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, LEXICALS (+86 more)

### Community 190 - ".index"
Cohesion: 0.22
Nodes (7): a_a_signed_index_and_its_packages_are_accepted(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), ACTIVE_LINES, ningun_modulo_del_nucleo_compara_motores(), Arc, Result, RwLock

### Community 191 - "session.ts"
Cohesion: 0.29
Nodes (7): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf(), 11. Version support packs

### Community 200 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 201 - "src/catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 202 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 203 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 204 - "ChangesPreview.svelte"
Cohesion: 0.36
Nodes (4): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter()

### Community 205 - "services/catalog.rs"
Cohesion: 0.47
Nodes (5): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), catalog

### Community 206 - "focusZones.keys.test.ts"
Cohesion: 0.19
Nodes (12): fits(), FakeKey, g, hold(), KeyInit, letGo(), press(), release() (+4 more)

### Community 207 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities (current state), 6. The matrix

### Community 209 - "closest_names"
Cohesion: 0.50
Nodes (5): closest_keyword(), closest_names(), distance(), max_distance(), Iterator

### Community 210 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 211 - "ResultPane.svelte"
Cohesion: 0.06
Nodes (22): onMove(), onUp(), selectCell(), toggleInSelection(), addNewRow(), closeFind(), commitCell(), deleteSelectedRows() (+14 more)

### Community 212 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **811 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+806 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1592 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `queryConsoles.ts`, `editorSettings.ts`, `explorerTree.ts`, `focusZones.ts`, `columnFilters.ts`, `invoke`, `configuration.ts`, `search.ts`, `connection.ts`, `package.json`, `SqlLexical`, `diagnosticPresentation.ts`, `completionSource.ts`, `onePerFrame.ts`, `resultEditing.ts`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `consoleFiles.ts`, `context.ts`, `diagnosticPresentation.dom.test.ts`, `i18n/index.ts`, `gridNavigation.ts`, `gridWindow.test.ts`, `createResultChanges`, `parameterTypes.ts`, `sqlStatements.ts`, `executionMarker.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `lib/types.ts`, `gridSettings.ts`, `executionSession.ts`, `queryParameters.ts`, `sidebarLayout.ts`, `ChangesPreview.svelte`, `queryHistory.ts`, `focusZones.keys.test.ts`, `analysisSession.ts`, `svelte`, `resultTabs.ts`, `theme.ts`, `connectionTest.ts`, `DiagnosticPopup.svelte`, `SchemaTree.svelte`, `formatter.ts`, `cellTypes.ts`, `executionSession.test.ts`, `workspace/commands.ts`, `ExportDialog.svelte`, `connectionIdentity.ts`, `gridFind.ts`, `ref_node_fs`, `analysisRunner.test.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `queryConsoles.ts`, `editorSettings.ts`, `focusZones.ts`, `invoke`, `configuration.ts`, `connection.ts`, `package.json`, `diagnosticPresentation.ts`, `completionSource.ts`, `resultEditing.ts`, `sqlFiles.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `consoleFiles.ts`, `keybindings.ts`, `diagnosticPresentation.dom.test.ts`, `i18n/index.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `gridSettings.ts`, `executionSession.ts`, `queryParameters.ts`, `sidebarLayout.ts`, `queryHistory.ts`, `findBar.ts`, `ResultPane.svelte`, `resultTabs.ts`, `theme.ts`, `SchemaTree.svelte`, `executionSession.test.ts`, `stores/shortcuts.ts`, `FileTree.svelte`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `corpus.rs`, `.new`, `DestructiveClassification`, `engine_context.rs`, `Store`, `tests/lines.rs`, `drivers.rs`, `parser.rs`, `export.rs`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `ConnectionEngineContext`, `server-tests/src/lib.rs`, `support.rs`, `result_editing.rs`, `.index`, `query.rs`, `super`, `install_support_package`, `Option`, `AppState`, `Diagnostic`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _811 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._