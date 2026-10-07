# Graph Report - khipu  (2026-10-07)

## Corpus Check
- 505 files · ~553,822 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: (none) 10, .css 10, .sig 8)

## Summary
- 4861 nodes · 11475 edges · 214 communities (188 shown, 26 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 444 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fb2fef1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- EngineLines
- run.mjs
- postgres/src/lib.rs
- queryConsoles.ts
- editorSettings.ts
- driver-core/src/lib.rs
- Conn
- docs/ARCHITECTURE.md
- text
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- configuration.ts
- callHints.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- resolve
- compilerOptions
- drivers.rs
- contract.test.ts
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
- lock
- i18n/index.ts
- diagnostics.rs
- editing.rs
- updates.rs
- Result
- server-tests/src/lib.rs
- support.rs
- Añadir un motor de base de datos
- parameterTypes.ts
- mysql/src/tls.rs
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
- reorder.ts
- createExecutionFlow
- MySqlConnector
- Adding a database engine
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- filterBuilder.ts
- analysisSession.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- QueryCancel
- results.rs
- safety.rs
- resultTabs.ts
- theme.ts
- tests.mjs
- commentEditing.dom.test.ts
- tabGroups.ts
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
- executionSession.ts
- workspace/commands.ts
- Option
- SQL engine quality contract
- ExportDialog.svelte
- state.rs
- Contrato de calidad de los motores SQL
- connectionIdentity.ts
- connection.rs
- svelte.config.js
- postgres/src/tls.rs
- stores/shortcuts.ts
- ResultPane.svelte
- ref_node_fs
- FileTree.svelte
- console.rs
- mysql/src/introspect.rs
- dialogMotion.ts
- replace.ts
- Diagnostic
- publish.mjs
- lib/backend.ts
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
- .with
- search.ts
- analysis.rs
- createSearchPanel
- ResultTabActions
- create_terminal
- svelte
- sql_files.rs
- tests/lines.rs
- sqlStatements.ts
- Result
- connection_error.rs
- desktop_portal.rs
- evidence.mjs
- MosaicArea.svelte
- Workspace.svelte
- resultEditing.ts
- unused.mjs
- fetch.sh
- AppState
- line
- gridSelectionSummary.ts
- onPointerDown
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
- svelte
- keybindings.ts
- sqlPreviewFormat.ts
- vitest
- gridWindow.test.ts
- error_position.rs
- MessageParams
- EditorConfiguration
- Performance measurements
- EditorCommands
- notifications.ts
- Mediciones de rendimiento
- statementIndex.ts
- .index
- session.ts
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- ColumnFilterPopover.svelte
- Test databases
- numpadKeys.ts
- queryParameters.ts
- sidebarLayout.ts
- ResultChangesController
- services/catalog.rs
- focusZones.keys.test.ts
- Explorador de base de datos
- if
- consoleMosaic.ts
- queryConsoles.test.ts
- vite.config.js

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
- `Flujo de datos` --references--> `buildExplorerTree()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/connections/explorerTree.ts
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

## Communities (214 total, 26 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.05
Nodes (90): AlterTableOperation, Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), after_handler_conditions(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks() (+82 more)

### Community 1 - "EngineLines"
Cohesion: 0.17
Nodes (22): Capability, check_line(), compare(), EngineLines, FORMAT, Line, numbers(), Origin (+14 more)

### Community 2 - "run.mjs"
Cohesion: 0.08
Nodes (24): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+16 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.18
Nodes (17): cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement, RESTORE_SERVER_TIME_ZONE (+9 more)

### Community 4 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (35): isFilterOperator(), appendConsole(), consoleTitle(), createQueryConsole(), currentQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE, EMPTY_STATE (+27 more)

### Community 5 - "editorSettings.ts"
Cohesion: 0.13
Nodes (19): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+11 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (28): async_trait, CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo (+20 more)

### Community 7 - "Conn"
Cohesion: 0.21
Nodes (9): classification(), classification_with(), Conn, dotted(), Option, QueryExecutionResult, Result, SchemaObjects (+1 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "text"
Cohesion: 0.28
Nodes (22): event_row(), fetch(), foreign_key_row(), index_row(), introspect_schema(), key_row(), opt_text(), read_checks() (+14 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.16
Nodes (21): CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, is_unsupported_in_prepared_protocol(), MAX_ROWS_TO_DRAIN, mysql_cell_to_query_value(), mysql_error_to_result() (+13 more)

### Community 13 - "configuration.ts"
Cohesion: 0.06
Nodes (37): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, RoutineIndex (+29 more)

### Community 14 - "callHints.ts"
Cohesion: 0.09
Nodes (20): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), Name, nameOf() (+12 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.08
Nodes (37): toConnectionFailure(), getDriver(), forgetConnectionPassword(), loadConnectionPassword(), runtimePasswords, saveConnectionPassword(), activeEngine, activeProfile (+29 more)

### Community 18 - "package.json"
Cohesion: 0.12
Nodes (14): description, license, name, type, version, codemirror, happy-dom, svelte-check (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.10
Nodes (33): a_request_from_another_generation_or_epoch_is_no_longer_current(), civil_date(), ConnectionEngineContext, dotted(), effective_line(), identity(), line_support(), LineIdentity (+25 more)

### Community 21 - "resolve"
Cohesion: 0.33
Nodes (16): disabling_a_line_moves_its_servers_to_the_closest_active_line_below_and_one_stays_active(), downloaded(), fixtures(), h_an_interrupted_or_failed_install_keeps_the_previous_package(), i_j_an_update_changes_the_revision_and_removing_it_returns_the_included_one(), installed_r2(), key(), l_a_package_that_says_another_engine_or_line_than_its_entry_is_rejected() (+8 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (18): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+10 more)

### Community 24 - "contract.test.ts"
Cohesion: 0.09
Nodes (31): analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), painted(), dialectFor(), sqlTokens(), ExecutionError (+23 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.04
Nodes (91): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), schemaOption() (+83 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.10
Nodes (47): build_parameters, ParameterMode, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL (+39 more)

### Community 32 - "sqlFiles.ts"
Cohesion: 0.12
Nodes (27): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), listSqlDir(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile() (+19 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.06
Nodes (25): Capability, Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities (+17 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.09
Nodes (27): openInNewWindow(), openConnectionWindow(), PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles (+19 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.06
Nodes (31): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+23 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (24): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+16 more)

### Community 44 - "String"
Cohesion: 0.15
Nodes (19): Checker<'a, '_>, closest_names(), output_columns(), Repaired, Expr, Ident, Iterator, ObjectName (+11 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.19
Nodes (16): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+8 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (53): connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP, appHeapMb() (+45 more)

### Community 49 - "context.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (30): GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64(), lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() (+22 more)

### Community 51 - "lock"
Cohesion: 0.10
Nodes (25): close_all(), close_window(), Flow, lock(), open(), Arc, Drop, FnOnce (+17 more)

### Community 52 - "i18n/index.ts"
Cohesion: 0.18
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), numberFormat, systemLocale(), translator() (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (52): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+44 more)

### Community 54 - "editing.rs"
Cohesion: 0.05
Nodes (68): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+60 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (84): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+76 more)

### Community 56 - "Result"
Cohesion: 0.17
Nodes (14): hex_encode(), open_pool(), ConnectionConfig, DriverError, MySqlConnectOptions, MySqlRow, Result, SchemaObjects (+6 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.15
Nodes (17): Capability, Declared, declared_servers(), declared_version(), entries(), Entry, evidence(), lines_json() (+9 more)

### Community 58 - "support.rs"
Cohesion: 0.09
Nodes (42): a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), ACTIVATION, an_http_error_says_its_status(), an_unresolvable_host_says_there_is_no_network(), APP, assert_no_reqwest_text(), BASE_URL_ENV (+34 more)

### Community 59 - "Añadir un motor de base de datos"
Cohesion: 0.11
Nodes (20): reservedWords(), 10. Generated SQL, 6. Version lines, 10. SQL generado, 12. Harness, corpus y servidores de prueba, 13. Cobertura, 14. Matriz, evidencia y CI, 15. Documentación (+12 more)

### Community 60 - "parameterTypes.ts"
Cohesion: 0.10
Nodes (33): BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS, OPERATOR (+25 more)

### Community 61 - "mysql/src/tls.rs"
Cohesion: 0.10
Nodes (20): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+12 more)

### Community 62 - "executionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 63 - "assembly.rs"
Cohesion: 0.15
Nodes (23): drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row(), KeyColumnRow (+15 more)

### Community 64 - "terminal.rs"
Cohesion: 0.13
Nodes (39): ack(), ack_terminal(), alive(), bash(), cerrar_con_el_lector_detenido_no_deja_nada(), cien_aperturas_y_cierres_no_dejan_procesos_ni_registros(), close(), close_all_cierra_las_de_todas_las_ventanas() (+31 more)

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
Cohesion: 0.13
Nodes (22): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+14 more)

### Community 70 - "workspace/mosaic.ts"
Cohesion: 0.18
Nodes (22): at(), contains(), Direction, Divider, dividers(), dropSide(), halves(), leaf() (+14 more)

### Community 71 - "lib/types.ts"
Cohesion: 0.13
Nodes (19): TableTab, CatalogColumn, CatalogTable, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent, ExplorerForeignKey (+11 more)

### Community 72 - "reorder.ts"
Cohesion: 0.14
Nodes (7): beginDragging(), Ghost, liftGhost(), Point, prefersReducedMotion(), reorderable(), ReorderParams

### Community 73 - "createExecutionFlow"
Cohesion: 0.12
Nodes (25): tabExists(), appendLog(), beginQueryExecution(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting() (+17 more)

### Community 74 - "MySqlConnector"
Cohesion: 0.19
Nodes (14): QueryExecutionOptions, cancelled_before_start(), MySqlConnector, Capabilities, Future, Message, MySqlPool, Output (+6 more)

### Community 75 - "Adding a database engine"
Cohesion: 0.11
Nodes (18): ConnectionErrorKind, 12. Harness, corpus and test servers, 13. Coverage, 14. Matrix, evidence and CI, 15. Documentation, 3. Parser, 4. Driver and protocol, 5. Exact release: `ServerIdentity` (+10 more)

### Community 76 - "super"
Cohesion: 0.11
Nodes (18): DEFINITION, UNPARSED, DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies, Option, DEFINITION (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.20
Nodes (14): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+6 more)

### Community 78 - "desktop.py"
Cohesion: 0.05
Nodes (54): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+46 more)

### Community 79 - "findBar.ts"
Cohesion: 0.27
Nodes (14): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+6 more)

### Community 80 - "console_texts.rs"
Cohesion: 0.14
Nodes (23): frontend_commands(), String, io_failure(), prune(), read(), AppHandle, Message, Option (+15 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.19
Nodes (25): engine_selected(), error_text(), check_version(), engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected() (+17 more)

### Community 82 - "filterBuilder.ts"
Cohesion: 0.19
Nodes (13): buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues(), newCondition() (+5 more)

### Community 83 - "analysisSession.ts"
Cohesion: 0.07
Nodes (26): BackendMessage, AnalysisRunner, merge(), Region, subtract(), runner(), analysisCacheFor(), AnalysisContext (+18 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.19
Nodes (19): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+11 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (17): ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual() (+9 more)

### Community 87 - "QueryCancel"
Cohesion: 0.21
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "results.rs"
Cohesion: 0.13
Nodes (25): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+17 more)

### Community 89 - "safety.rs"
Cohesion: 0.14
Nodes (23): attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), INJECTIONS, Lcg (+15 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.14
Nodes (25): addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+17 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "commentEditing.dom.test.ts"
Cohesion: 0.16
Nodes (9): blockClosingAt(), commentEditing, editor(), shown(), views, ENCLOSING, reaches(), typing (+1 more)

### Community 94 - "tabGroups.ts"
Cohesion: 0.28
Nodes (15): Mosaic, rects(), choose(), copyGroups(), Corner, cornerGroup(), emptyGroups(), groupTabs() (+7 more)

### Community 95 - "connectionTest.ts"
Cohesion: 0.14
Nodes (18): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+10 more)

### Community 96 - "DiagnosticPopup.svelte"
Cohesion: 0.16
Nodes (10): writeClipboard(), writeClipboardText(), focused(), mountTree(), focusRow(), itemOf(), rows(), treeKeys() (+2 more)

### Community 97 - "install_support_package"
Cohesion: 0.34
Nodes (20): activate_installed(), app_version(), apply(), Available, base_url(), check_support_updates(), current_status(), install_support_package() (+12 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.08
Nodes (46): ConnectionDriver, labelsFor(), SmartEnv, byAnalyzerLocation(), byNearFragment(), byServerPosition(), ErrorLocator, firstLocated() (+38 more)

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
Nodes (37): FormatSettings, alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass() (+29 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "TilePicker.svelte"
Cohesion: 0.10
Nodes (14): active, danger, submit, active, byId, filtered, move(), onKeydown() (+6 more)

### Community 106 - "cellTypes.ts"
Cohesion: 0.16
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+9 more)

### Community 107 - "executionSession.ts"
Cohesion: 0.07
Nodes (32): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, nextSort(), STANDARD_LEXICAL (+24 more)

### Community 108 - "workspace/commands.ts"
Cohesion: 0.19
Nodes (16): Zone, commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, handlerKey(), handlers (+8 more)

### Community 109 - "Option"
Cohesion: 0.19
Nodes (13): analyze_statement_with(), closest_keyword(), distance(), expected_found(), join_constraint(), max_distance(), removed_syntax(), Line (+5 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.07
Nodes (28): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+20 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.16
Nodes (11): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+3 more)

### Community 112 - "state.rs"
Cohesion: 0.11
Nodes (27): SessionMode, a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, build_catalog(), ConsoleChange, context(), DatabaseExplorer, follow_console() (+19 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.07
Nodes (28): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión (+20 more)

### Community 114 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 115 - "connection.rs"
Cohesion: 0.14
Nodes (22): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), load_connection_password(), ConnectionConfig, ConnectionErrorKind, DriverError (+14 more)

### Community 116 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "stores/shortcuts.ts"
Cohesion: 0.13
Nodes (10): handleRecordKeydown(), KEY_SYMBOLS, MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, ShortcutEventLike (+2 more)

### Community 119 - "ResultPane.svelte"
Cohesion: 0.12
Nodes (15): onMove(), onUp(), selectCell(), toggleInSelection(), tiles(), buildMatcher(), cellText(), escapeRegex() (+7 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.09
Nodes (19): ENGINE_SOURCES, ref_lib, ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path, ref_node_test (+11 more)

### Community 121 - "FileTree.svelte"
Cohesion: 0.11
Nodes (18): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), error(), entry() (+10 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "mysql/src/introspect.rs"
Cohesion: 0.13
Nodes (14): COLUMNS_SQL, EVENTS_SQL, FOREIGN_KEYS_SQL, format_parameter(), format_schedule(), INDEXES_SQL, KEYS_SQL, parameter_mode() (+6 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.27
Nodes (9): moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint (+1 more)

### Community 125 - "replace.ts"
Cohesion: 0.27
Nodes (9): MAX_COUNTED, preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn() (+1 more)

### Community 126 - "Diagnostic"
Cohesion: 0.17
Nodes (40): at_token(), byte_offset(), CatalogView, Checker, Diagnostic, ends_expression(), handler_action(), inspect_routine_chunk() (+32 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "lib/backend.ts"
Cohesion: 0.09
Nodes (17): backendText(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), active, closing (+9 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.22
Nodes (6): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement

### Community 130 - "+layout.svelte"
Cohesion: 0.11
Nodes (22): setSidebarRevealer(), initLocaleEffects(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_native, app_src_lib_styles_review_dialog (+14 more)

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
Cohesion: 0.18
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 137 - "focusZones.ts"
Cohesion: 0.12
Nodes (32): clearMark(), Direction, DIRECTION_COMMANDS, flash(), flashTimers, focusZone(), holding(), installFocusZones() (+24 more)

### Community 138 - "columnFilters.ts"
Cohesion: 0.33
Nodes (9): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+1 more)

### Community 139 - "new.mjs"
Cohesion: 0.15
Nodes (13): args, base, contract, contractPath, corpus, dialects, fail(), file (+5 more)

### Community 140 - "invoke"
Cohesion: 0.29
Nodes (12): invoke(), checkSupportUpdates(), installSupportPackage(), loadSupportLines(), removeSupportPackage(), run(), setSupportLineEnabled(), supportBusy (+4 more)

### Community 141 - ".with"
Cohesion: 0.33
Nodes (7): DiagnosticMessage, friendly_syntax(), is_simple_token(), BTreeMap, Self, ToString, unterminated()

### Community 142 - "search.ts"
Cohesion: 0.14
Nodes (17): __test, exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded() (+9 more)

### Community 143 - "analysis.rs"
Cohesion: 0.15
Nodes (26): is_error(), routines_corpus(), call_and_show_create_return_their_rows(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), is_syntax_error(), mixed_statements() (+18 more)

### Community 144 - "createSearchPanel"
Cohesion: 0.26
Nodes (10): closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel(), toggleSearchPanel() (+2 more)

### Community 146 - "create_terminal"
Cohesion: 0.19
Nodes (16): create_terminal(), el_shell_no_hereda_las_rutas_de_la_appimage(), Outside, outside_appdir(), Option, Path, PathBuf, String (+8 more)

### Community 147 - "svelte"
Cohesion: 0.07
Nodes (13): neutral, indexOf(), select(), Icon, icons, shortcutText(), $t(), CONNECTION_COLORS (+5 more)

### Community 148 - "sql_files.rs"
Cohesion: 0.06
Nodes (61): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+53 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.14
Nodes (18): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+10 more)

### Community 150 - "sqlStatements.ts"
Cohesion: 0.07
Nodes (46): scanInChunks(), commentAwareWrap(), blockText(), commentDecorations(), commentMarks(), commentStyle, commentStylePlugin, commentStyleTheme (+38 more)

### Community 151 - "Result"
Cohesion: 0.28
Nodes (8): fitting(), install(), IntoIterator, PathBuf, Result, set_enabled(), Store, write_atomically()

### Community 152 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 153 - "desktop_portal.rs"
Cohesion: 0.43
Nodes (7): report_slow_start(), Duration, Option, String, SLOW_START, slow_start_hint(), solo_avisa_de_un_arranque_lento()

### Community 154 - "evidence.mjs"
Cohesion: 0.22
Nodes (11): query(), Backend (`app/src-tauri/src`), ref_node_url, ENGINE, LINE_SUITES, origin(), read(), results() (+3 more)

### Community 155 - "MosaicArea.svelte"
Cohesion: 0.17
Nodes (12): clampRatio(), dropTarget(), finish(), onDividerKeydown(), onKey(), onMove(), startResize(), onMove() (+4 more)

### Community 156 - "Workspace.svelte"
Cohesion: 0.07
Nodes (12): close(), onKeydown(), onKeydownCapture(), $t(), ContextMenuItem, blocksHeldEnter(), confirmsOnEnter(), app_src_lib_sqleditoricons (+4 more)

### Community 157 - "resultEditing.ts"
Cohesion: 0.12
Nodes (25): addRow(), applyChanges(), buildChanges(), ColumnValue, deleteRows(), EditTarget, fetchEditInfo(), fillCells() (+17 more)

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "AppState"
Cohesion: 0.17
Nodes (21): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+13 more)

### Community 161 - "line"
Cohesion: 0.16
Nodes (15): Pruebas contra una base real, 5.1 The rule, 5.2 Support policy, 5.3 Lines today, 5.4 Line data, 5. Version lines, 5.1 La regla, 5.2 Política de soporte (+7 more)

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.20
Nodes (13): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+5 more)

### Community 163 - "onPointerDown"
Cohesion: 0.42
Nodes (10): onPointerDown(), cleanup(), detach(), onMove(), onUp(), resetStyles(), settle(), startDrag() (+2 more)

### Community 164 - "ARCHITECTURE.es.md"
Cohesion: 0.30
Nodes (5): README.es.md (Spanish), Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 165 - "status.mjs"
Cohesion: 0.18
Nodes (16): compare(), connections, coverage, coverageBlock(), DOCS, engines, enginesBlock(), json() (+8 more)

### Community 166 - "search.dom.test.ts"
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 167 - "diagnostics.ts"
Cohesion: 0.04
Nodes (60): AnalysisRunnerOptions, create(), typed(), ranges(), createDiagnosticPopup(), applyFix(), cancelHoverClose(), close() (+52 more)

### Community 168 - "coverage.mjs"
Cohesion: 0.14
Nodes (12): cited, contract, coverage, ENGINES, lines, matrix, problems, rows (+4 more)

### Community 169 - "Engine"
Cohesion: 0.09
Nodes (23): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+15 more)

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

### Community 176 - "svelte"
Cohesion: 0.08
Nodes (16): forgetLog(), closeQueryConsole(), QueryConsole, queryConsoles, renameQueryConsole(), withoutExecution(), ConsoleFiles, createConsoleFiles() (+8 more)

### Community 177 - "keybindings.ts"
Cohesion: 0.23
Nodes (13): activeZone, installKeybindings(), onKeydown(), onKeyup(), track(), withHeld(), Modifier, modifierOfCode() (+5 more)

### Community 178 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 180 - "vitest"
Cohesion: 0.16
Nodes (13): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows(), GRID_ROW_STYLES, GridRowStyle (+5 more)

### Community 181 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 183 - "MessageParams"
Cohesion: 0.24
Nodes (5): MessageParams, invalidCells(), ChangesView, blockedByInvalidValues(), openPreview()

### Community 185 - "Performance measurements"
Cohesion: 0.29
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 187 - "notifications.ts"
Cohesion: 0.31
Nodes (8): pickSqlFolder(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), setSqlFolder(), handleOpenFolder()

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "statementIndex.ts"
Cohesion: 0.05
Nodes (67): LEXICALS, ONE_QUERY, SEVERAL, texts(), createEditorCommands(), currentSqlRange(), mounted(), Selection (+59 more)

### Community 190 - ".index"
Cohesion: 0.18
Nodes (8): a_a_signed_index_and_its_packages_are_accepted(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), ACTIVE_LINES, ningun_modulo_del_nucleo_compara_motores(), Arc, Option, Result, RwLock

### Community 191 - "session.ts"
Cohesion: 0.29
Nodes (7): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf(), 11. Paquetes de soporte de versión

### Community 200 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 201 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 202 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 203 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 205 - "services/catalog.rs"
Cohesion: 0.47
Nodes (5): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), catalog

### Community 206 - "focusZones.keys.test.ts"
Cohesion: 0.19
Nodes (12): fits(), FakeKey, g, hold(), KeyInit, letGo(), press(), release() (+4 more)

### Community 207 - "Explorador de base de datos"
Cohesion: 0.25
Nodes (7): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos

### Community 208 - "if"
Cohesion: 0.33
Nodes (6): if(), Dónde puede vivir el código de un motor, 2. `EngineDefinition`, 2. `EngineDefinition`, ⚠ Campos que cambian la superficie de seguridad del guard, ⚠ Fields that change the guard's security surface

### Community 209 - "consoleMosaic.ts"
Cohesion: 0.60
Nodes (4): editorGroups, load(), parseMosaic(), parseGroups()

### Community 210 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1583 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `lib/backend.ts`, `explorerTree.ts`, `focusZones.ts`, `columnFilters.ts`, `configuration.ts`, `callHints.ts`, `search.ts`, `connection.ts`, `package.json`, `sqlStatements.ts`, `contract.test.ts`, `completionSource.ts`, `Workspace.svelte`, `MosaicArea.svelte`, `resultEditing.ts`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `diagnostics.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `svelte`, `context.ts`, `sqlPreviewFormat.ts`, `i18n/index.ts`, `gridWindow.test.ts`, `parameterTypes.ts`, `statementIndex.ts`, `executionMarker.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `lib/types.ts`, `reorder.ts`, `numpadKeys.ts`, `queryParameters.ts`, `sidebarLayout.ts`, `queryHistory.ts`, `focusZones.keys.test.ts`, `filterBuilder.ts`, `analysisSession.ts`, `queryConsoles.test.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `commentEditing.dom.test.ts`, `tabGroups.ts`, `connectionTest.ts`, `DiagnosticPopup.svelte`, `engines/index.ts`, `SchemaTree.svelte`, `formatter.ts`, `cellTypes.ts`, `executionSession.ts`, `workspace/commands.ts`, `ExportDialog.svelte`, `connectionIdentity.ts`, `ResultPane.svelte`, `ref_node_fs`, `dialogMotion.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `queryConsoles.ts`, `editorSettings.ts`, `focusZones.ts`, `invoke`, `connection.ts`, `package.json`, `completionSource.ts`, `resultEditing.ts`, `sqlFiles.ts`, `diagnostics.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `keybindings.ts`, `i18n/index.ts`, `vitest`, `notifications.ts`, `statementIndex.ts`, `gridClipboard.ts`, `reorder.ts`, `queryParameters.ts`, `sidebarLayout.ts`, `queryHistory.ts`, `findBar.ts`, `consoleMosaic.ts`, `queryConsoles.test.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `SchemaTree.svelte`, `TilePicker.svelte`, `executionSession.ts`, `stores/shortcuts.ts`, `FileTree.svelte`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `Conn`, `corpus.rs`, `engine_context.rs`, `resolve`, `tests/lines.rs`, `drivers.rs`, `Result`, `export.rs`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `server-tests/src/lib.rs`, `support.rs`, `.index`, `query.rs`, `super`, `install_support_package`, `Option`, `state.rs`, `Diagnostic`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _811 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05339105339105339 - nodes in this community are weakly interconnected._