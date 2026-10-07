# Graph Report - khipu  (2026-10-07)

## Corpus Check
- 505 files · ~552,518 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: (none) 10, .css 10, .sig 8)

## Summary
- 4844 nodes · 11441 edges · 215 communities (187 shown, 28 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 439 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33057f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- support.rs
- run.mjs
- postgres/src/lib.rs
- sqlFiles.ts
- createExecutionFlow
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- mysql/src/introspect.rs
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- sqlDefinitionLink.ts
- callHints.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- if
- compilerOptions
- drivers.rs
- sqlStatements.ts
- devDependencies
- credentials.rs
- completionSource.ts
- default.json
- khipu-desktop
- postgres/src/introspect.rs
- sql_path
- ConnectionEngineContext
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- String
- @codemirror/view
- tooltip.ts
- ResultPane.svelte
- resources.mjs
- context.ts
- pagination.rs
- postgres/src/version.rs
- i18n/index.ts
- diagnostics.rs
- editing.rs
- updates.rs
- MySqlConnector
- server-tests/src/lib.rs
- formatLayout.ts
- Añadir un motor de base de datos
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
- @codemirror/state
- svelte
- resultEditing.ts
- configuration.ts
- src/catalog.rs
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- Message
- analysisSession.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- QueryCancel
- State
- Conn
- resultTabs.ts
- theme.ts
- tests.mjs
- lib/types.ts
- resultChanges.ts
- connectionTest.ts
- DiagnosticPopup.svelte
- services/catalog.rs
- engines/index.ts
- analysisRunner.test.ts
- graph.mjs
- scripts
- main.js
- vitest
- Quality CI Workflow
- TilePicker.svelte
- cellTypes.ts
- executionSession.ts
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
- sql_files.rs
- dialogMotion.ts
- replace.ts
- Diagnostic
- publish.mjs
- String
- RawStatement<'q>
- +layout.svelte
- Extensiones opcionales y futura tienda — límites antes del runtime
- webkit_env.rs
- PostgresConnector
- explorerTree.ts
- NewlineMarker
- corpus.rs
- focusZones.ts
- sqlPreviewFormat.ts
- new.mjs
- invoke
- .new
- search.ts
- analysis.rs
- Adding a database engine
- ResultTabActions
- DestructiveClassification
- svelte
- files.rs
- tests/lines.rs
- AnalysisRunner
- Explorador de base de datos
- connection_error.rs
- desktop_portal.rs
- parser.rs
- ref_app
- Workspace.svelte
- EditorConfiguration
- unused.mjs
- fetch.sh
- khipu_driver_core
- text_encoding.rs
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
- TabsView
- vite.config.js
- SchemaTree.svelte
- gridNavigation.ts
- DataGrid.svelte
- error_position.rs
- diagnosticPresentation.dom.test.ts
- 5. Version lines
- Performance measurements
- editor/commands.ts
- diagnosticPresentation.ts
- Mediciones de rendimiento
- statementIndex.ts
- columnFilters.ts
- session.ts
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- closest_names
- Test databases
- createSearchPanel
- ConnectionConfig
- sidebarLayout.ts
- ChangesPreview.svelte
- DiagnosticPopup
- focusZones.keys.test.ts
- numpadKeys.ts
- ResultChangesController
- mysql.rs
- 6. The matrix
- LensMessage
- Bases de datos de prueba

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
- `Frontend (`app/src/lib`)` --references--> `engineForContext()`  [INFERRED]
  docs/ARCHITECTURE.es.md → app/src/lib/engines/index.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities (current state)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principios` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (215 total, 28 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.06
Nodes (51): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive() (+43 more)

### Community 1 - "support.rs"
Cohesion: 0.05
Nodes (109): a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), activate_installed(), ACTIVATION, an_http_error_says_its_status(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), an_unresolvable_host_says_there_is_no_network(), APP (+101 more)

### Community 2 - "run.mjs"
Cohesion: 0.08
Nodes (24): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+16 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.16
Nodes (19): async_trait, cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement (+11 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.06
Nodes (40): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+32 more)

### Community 5 - "createExecutionFlow"
Cohesion: 0.11
Nodes (26): appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting() (+18 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (28): CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, QueryColumn (+20 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.06
Nodes (43): FilterCondition, isFilterOperator(), activateQueryConsole(), appendConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts (+35 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "mysql/src/introspect.rs"
Cohesion: 0.07
Nodes (56): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+48 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.12
Nodes (28): TransactionStatement, cancelled_before_start(), CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, hex_encode(), is_unsupported_in_prepared_protocol() (+20 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "callHints.ts"
Cohesion: 0.09
Nodes (21): CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name, nameOf() (+13 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.07
Nodes (40): indexOf(), select(), getDriver(), forgetConnectionPassword(), loadConnectionPassword(), runtimePasswords, activeEngine, activeProfile (+32 more)

### Community 18 - "package.json"
Cohesion: 0.11
Nodes (16): description, license, name, type, version, codemirror, devicon, happy-dom (+8 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.20
Nodes (12): dotted(), effective_line(), identity(), line_support(), LineIdentity, one_year_after(), Option, status() (+4 more)

### Community 21 - "if"
Cohesion: 0.33
Nodes (6): if(), Dónde puede vivir el código de un motor, 2. `EngineDefinition`, 2. `EngineDefinition`, ⚠ Campos que cambian la superficie de seguridad del guard, ⚠ Fields that change the guard's security surface

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.16
Nodes (19): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+11 more)

### Community 24 - "sqlStatements.ts"
Cohesion: 0.08
Nodes (40): scanInChunks(), commentAwareWrap(), blockCommentEnd(), Comment, commentAt(), CommentKind, executablePrefix(), opensDashComment() (+32 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.05
Nodes (79): catalogPosition, complete(), schemas, afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), buildFkIndex(), buildKeywordCompletion() (+71 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.10
Nodes (47): build_parameters, ParameterMode, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL (+39 more)

### Community 32 - "ConnectionEngineContext"
Cohesion: 0.19
Nodes (9): a_request_from_another_generation_or_epoch_is_no_longer_current(), ConnectionEngineContext, Arc, Self, SupportStatus, SessionMode, the_context_keeps_its_shape(), VendorSupport (+1 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.11
Nodes (14): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities, Self (+6 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.13
Nodes (18): openInNewWindow(), openConnectionWindow(), PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver() (+10 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.06
Nodes (31): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+23 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (24): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+16 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (17): Checker<'a, '_>, output_columns(), Repaired, Expr, Ident, ObjectName, Query, SetExpr (+9 more)

### Community 45 - "@codemirror/view"
Cohesion: 0.11
Nodes (6): createMatchCounter(), MatchStatus, MAX_COUNTED, FindBar, ReplaceBar, @codemirror/view

### Community 46 - "tooltip.ts"
Cohesion: 0.19
Nodes (16): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+8 more)

### Community 47 - "ResultPane.svelte"
Cohesion: 0.06
Nodes (17): allState, style, applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t() (+9 more)

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (52): connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP, appHeapMb() (+44 more)

### Community 49 - "context.ts"
Cohesion: 0.13
Nodes (17): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+9 more)

### Community 50 - "pagination.rs"
Cohesion: 0.12
Nodes (31): ast, GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64() (+23 more)

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
Nodes (31): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+23 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (84): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+76 more)

### Community 56 - "MySqlConnector"
Cohesion: 0.14
Nodes (18): MySqlConnector, open_pool(), Capabilities, ConnectionConfig, DriverError, MySqlConnectOptions, MySqlPool, MySqlRow (+10 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.10
Nodes (28): Capability, classification(), classification_with(), Declared, declared_servers(), declared_version(), dotted(), entries() (+20 more)

### Community 58 - "formatLayout.ts"
Cohesion: 0.32
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 59 - "Añadir un motor de base de datos"
Cohesion: 0.12
Nodes (17): ConnectionErrorKind, 4. Driver and protocol, 12. Harness, corpus y servidores de prueba, 13. Cobertura, 14. Matriz, evidencia y CI, 15. Documentación, 4. Driver y protocolo, 5. Versión exacta: `ServerIdentity` (+9 more)

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
Cohesion: 0.15
Nodes (23): drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row(), KeyColumnRow (+15 more)

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
Nodes (67): finish(), onKey(), onMove(), beginDragging(), Ghost, liftGhost(), Point, merge() (+59 more)

### Community 71 - "@codemirror/state"
Cohesion: 0.06
Nodes (35): analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), blockClosingAt(), commentEditing, editor(), shown() (+27 more)

### Community 72 - "svelte"
Cohesion: 0.19
Nodes (12): executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES, MAX_LOG_TEXT, GRID_ROW_STYLES, GridRowStyle, gridSettings (+4 more)

### Community 73 - "resultEditing.ts"
Cohesion: 0.24
Nodes (15): addRow(), buildChanges(), ColumnValue, deleteRows(), fillCells(), newRowValues(), originalValue(), pasteBlock() (+7 more)

### Community 74 - "configuration.ts"
Cohesion: 0.11
Nodes (28): buildRoutineIndex(), RoutineIndex, buildCatalogCompletions(), COMMON_FUNCTIONS, Entry, prefixStartForNames(), schemaOption(), buildPhrases() (+20 more)

### Community 75 - "src/catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 76 - "super"
Cohesion: 0.17
Nodes (12): DEFINITION, UNPARSED, DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies, Option, DEFINITION (+4 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.20
Nodes (14): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+6 more)

### Community 78 - "desktop.py"
Cohesion: 0.06
Nodes (53): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+45 more)

### Community 79 - "findBar.ts"
Cohesion: 0.23
Nodes (17): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+9 more)

### Community 80 - "console_texts.rs"
Cohesion: 0.14
Nodes (23): frontend_commands(), String, io_failure(), prune(), read(), AppHandle, Message, Option (+15 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.19
Nodes (25): engine_selected(), error_text(), check_version(), engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected() (+17 more)

### Community 82 - "Message"
Cohesion: 0.14
Nodes (14): app_text_travels_as_key_and_params(), Message, raw_text_travels_as_a_plain_string(), BTreeMap, Formatter, From, Into, Option (+6 more)

### Community 83 - "analysisSession.ts"
Cohesion: 0.14
Nodes (16): BackendMessage, analysisCacheFor(), AnalysisContext, AnalysisDiagnostic, analysisDiagnostics(), AnalysisPosition, AnalysisSessionOptions, sameContext() (+8 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.19
Nodes (19): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+11 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (22): a_a_signed_index_and_its_packages_are_accepted(), MYSQL, ACTIVE_LINES, ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL (+14 more)

### Community 87 - "QueryCancel"
Cohesion: 0.23
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "State"
Cohesion: 0.15
Nodes (25): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+17 more)

### Community 89 - "Conn"
Cohesion: 0.12
Nodes (25): Conn, SchemaObjects, attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement() (+17 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.18
Nodes (24): addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+16 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "lib/types.ts"
Cohesion: 0.04
Nodes (61): ConnectionDriver, Request, TableEntry, ExecutionError, Fixture, FIXTURES, ORDERS, PROFILES (+53 more)

### Community 94 - "resultChanges.ts"
Cohesion: 0.11
Nodes (15): MessageKey, invalidCells(), applyChanges(), EditTarget, fetchEditInfo(), previewChanges(), ResultChanges, ChangesBackend (+7 more)

### Community 95 - "connectionTest.ts"
Cohesion: 0.15
Nodes (18): ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls(), summarizeError() (+10 more)

### Community 96 - "DiagnosticPopup.svelte"
Cohesion: 0.21
Nodes (8): focused(), mountTree(), focusRow(), itemOf(), rows(), treeKeys(), onClick(), onKeydown()

### Community 97 - "services/catalog.rs"
Cohesion: 0.47
Nodes (5): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), catalog

### Community 98 - "engines/index.ts"
Cohesion: 0.11
Nodes (35): byAnalyzerLocation(), byNearFragment(), byServerPosition(), ErrorLocator, firstLocated(), tokenAt(), ErrorHelp, ansiString() (+27 more)

### Community 99 - "analysisRunner.test.ts"
Cohesion: 0.14
Nodes (13): AnalysisRunnerOptions, subtract(), create(), runner(), typed(), ranges(), DiagnosticPopupState, diagnosticsField (+5 more)

### Community 100 - "graph.mjs"
Cohesion: 0.10
Nodes (16): blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS, edges (+8 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "vitest"
Cohesion: 0.06
Nodes (40): FormatSettings, slice(), format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure (+32 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "TilePicker.svelte"
Cohesion: 0.13
Nodes (11): active, byId, filtered, move(), onKeydown(), pick(), query, OPTICAL_SIZES (+3 more)

### Community 106 - "cellTypes.ts"
Cohesion: 0.18
Nodes (16): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+8 more)

### Community 107 - "executionSession.ts"
Cohesion: 0.08
Nodes (30): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, nextSort(), STANDARD_LEXICAL (+22 more)

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
Cohesion: 0.17
Nodes (11): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+3 more)

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
Cohesion: 0.14
Nodes (22): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), disconnect(), load_connection_password(), ConnectionConfig, ConnectionErrorKind (+14 more)

### Community 116 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "stores/shortcuts.ts"
Cohesion: 0.12
Nodes (17): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), TERMINAL_COMMANDS, formatShortcutEvent(), KEY_SYMBOLS, MODIFIER_KEYS (+9 more)

### Community 119 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.09
Nodes (28): query(), ENGINE_SOURCES, Backend (`app/src-tauri/src`), ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path (+20 more)

### Community 121 - "FileTree.svelte"
Cohesion: 0.10
Nodes (19): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), pickSqlFolder(), entry() (+11 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "sql_files.rs"
Cohesion: 0.25
Nodes (22): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+14 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.27
Nodes (9): moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint (+1 more)

### Community 125 - "replace.ts"
Cohesion: 0.70
Nodes (4): preserveCase(), replaceEverything(), replacementFor(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.23
Nodes (28): at_token(), byte_offset(), check(), Diagnostic, handler_action(), inspect_routine_chunk(), keyword_text(), mysql_routine_errors() (+20 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "String"
Cohesion: 0.31
Nodes (11): civil_date(), Lines, Release, RELEASES, HashMap, String, Vec, today() (+3 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.18
Nodes (8): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, vector_text(), MySql

### Community 130 - "+layout.svelte"
Cohesion: 0.09
Nodes (23): setSidebarRevealer(), initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+15 more)

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
Cohesion: 0.26
Nodes (15): catalog(), check(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos() (+7 more)

### Community 137 - "focusZones.ts"
Cohesion: 0.11
Nodes (33): clearMark(), Direction, DIRECTION_COMMANDS, flash(), flashTimers, focusZone(), holding(), installFocusZones() (+25 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "new.mjs"
Cohesion: 0.12
Nodes (17): Cinco cosas que no son lo mismo, 11. Version support packs, 11. Paquetes de soporte de versión, args, base, contract, contractPath, corpus (+9 more)

### Community 140 - "invoke"
Cohesion: 0.13
Nodes (21): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), saveConnectionPassword() (+13 more)

### Community 141 - ".new"
Cohesion: 0.22
Nodes (8): offset_at(), Position, quoted_routine_definition(), Repaired<'a>, From, Self, Suggestion, Location

### Community 142 - "search.ts"
Cohesion: 0.14
Nodes (18): __test, exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded() (+10 more)

### Community 143 - "analysis.rs"
Cohesion: 0.17
Nodes (22): call_and_show_create_return_their_rows(), char_offset(), everyday_queries(), is_syntax_error(), mixed_statements(), real_sql(), rows_of(), Option (+14 more)

### Community 144 - "Adding a database engine"
Cohesion: 0.11
Nodes (19): reservedWords(), 10. Generated SQL, 12. Harness, corpus and test servers, 13. Coverage, 14. Matrix, evidence and CI, 15. Documentation, 5. Exact release: `ServerIdentity`, 6. Version lines (+11 more)

### Community 146 - "DestructiveClassification"
Cohesion: 0.15
Nodes (39): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+31 more)

### Community 147 - "svelte"
Cohesion: 0.07
Nodes (15): neutral, Icon, icons, shortcutText(), $t(), colorLabel(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR (+7 more)

### Community 148 - "files.rs"
Cohesion: 0.27
Nodes (18): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+10 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.13
Nodes (19): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+11 more)

### Community 150 - "AnalysisRunner"
Cohesion: 0.15
Nodes (4): AnalysisRunner, Region, AnalysisSession, createAnalysisSession()

### Community 151 - "Explorador de base de datos"
Cohesion: 0.25
Nodes (7): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos

### Community 152 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 153 - "desktop_portal.rs"
Cohesion: 0.43
Nodes (7): report_slow_start(), Duration, Option, String, SLOW_START, slow_start_hint(), solo_avisa_de_un_arranque_lento()

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 155 - "ref_app"
Cohesion: 0.21
Nodes (7): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), usage, ref_app

### Community 156 - "Workspace.svelte"
Cohesion: 0.06
Nodes (15): close(), $t(), $t(), tabExists(), ContextMenuItem, app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch, closeTerminal() (+7 more)

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "khipu_driver_core"
Cohesion: 0.19
Nodes (17): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+9 more)

### Community 161 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

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
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 167 - "diagnostics.ts"
Cohesion: 0.11
Nodes (24): byPosition(), byQuotedName(), charToUtf16(), diagnosticAt(), diagnosticDecorations(), DiagnosticMark, diagnosticPainter, diagnosticsIn() (+16 more)

### Community 168 - "coverage.mjs"
Cohesion: 0.14
Nodes (12): cited, contract, coverage, ENGINES, lines, matrix, problems, rows (+4 more)

### Community 169 - "Engine"
Cohesion: 0.15
Nodes (8): Engine, .ALL, NoBackslashEscapes, ConnectionConfig, DriverError, Drop, TlsMode, try_admin()

### Community 170 - "DbConnector"
Cohesion: 0.15
Nodes (13): DbConnector, DriverError, QueryExecutionOptions, RowSink, ConnectionErrorKind, Formatter, Future, Output (+5 more)

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.16
Nodes (14): args, compare(), inWindow(), lineOf(), lines, numbers(), prefix(), problems (+6 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 177 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 178 - "SchemaTree.svelte"
Cohesion: 0.18
Nodes (11): destroy(), child(), forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), tabScroll() (+3 more)

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "DataGrid.svelte"
Cohesion: 0.21
Nodes (10): onMove(), onUp(), selectCell(), toggleInSelection(), CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount() (+2 more)

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 183 - "diagnosticPresentation.dom.test.ts"
Cohesion: 0.22
Nodes (9): createDiagnosticPopup(), applyFix(), cancelHoverClose(), close(), scheduleHoverClose(), mounted(), addDiagnostics, applyQuickFix() (+1 more)

### Community 184 - "5. Version lines"
Cohesion: 0.18
Nodes (13): Pruebas contra una base real, 5.1 The rule, 5.2 Support policy, 5.3 Lines today, 5.4 Line data, 5. Version lines, 5.1 La regla, 5.2 Política de soporte (+5 more)

### Community 185 - "Performance measurements"
Cohesion: 0.29
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 186 - "editor/commands.ts"
Cohesion: 0.09
Nodes (15): createEditorCommands(), EditorCommands, EditorCommandsOptions, TextRange, clearDiagnosticsIn, codeChar(), IDENTIFIER_CLOSE, isWordChar() (+7 more)

### Community 187 - "diagnosticPresentation.ts"
Cohesion: 0.24
Nodes (9): diagnosticCounter(), jump(), serverDiagnostics(), stopTypingIn(), Text, jumpToDiagnostic(), visibleDiagnosticCount(), groupByFixes() (+1 more)

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "statementIndex.ts"
Cohesion: 0.06
Nodes (58): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, LEXICALS (+50 more)

### Community 190 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 191 - "session.ts"
Cohesion: 0.33
Nodes (6): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf()

### Community 198 - "closest_names"
Cohesion: 0.50
Nodes (5): closest_keyword(), closest_names(), distance(), max_distance(), Iterator

### Community 200 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 201 - "createSearchPanel"
Cohesion: 0.33
Nodes (9): closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel(), toggleSearchPanel() (+1 more)

### Community 202 - "ConnectionConfig"
Cohesion: 0.27
Nodes (10): ConnectionConfig, TlsMode, TlsStatus, Límites conocidos, Limitaciones conocidas, SSL/TLS por conexión, Embedded engines, Motores embebidos (+2 more)

### Community 203 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 204 - "ChangesPreview.svelte"
Cohesion: 0.36
Nodes (4): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter()

### Community 206 - "focusZones.keys.test.ts"
Cohesion: 0.33
Nodes (7): FakeKey, g, hold(), KeyInit, letGo(), press(), release()

### Community 207 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 209 - "mysql.rs"
Cohesion: 0.29
Nodes (6): DEFINITION, ROUTINE_KINDS, SQL_MODE_QUERY, STARTERS, UNPARSED, UNPARSED_WRITES

### Community 210 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities (current state), 6. The matrix

### Community 212 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **806 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+801 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1578 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `sqlFiles.ts`, `explorerTree.ts`, `queryConsoles.ts`, `focusZones.ts`, `sqlPreviewFormat.ts`, `invoke`, `callHints.ts`, `search.ts`, `connection.ts`, `package.json`, `sqlStatements.ts`, `completionSource.ts`, `ref_app`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `context.ts`, `SchemaTree.svelte`, `i18n/index.ts`, `gridNavigation.ts`, `DataGrid.svelte`, `diagnosticPresentation.dom.test.ts`, `diagnosticPresentation.ts`, `parameterTypes.ts`, `statementIndex.ts`, `executionMarker.ts`, `columnFilters.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `@codemirror/state`, `svelte`, `resultEditing.ts`, `configuration.ts`, `sidebarLayout.ts`, `ChangesPreview.svelte`, `queryHistory.ts`, `focusZones.keys.test.ts`, `numpadKeys.ts`, `analysisSession.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `lib/types.ts`, `connectionTest.ts`, `DiagnosticPopup.svelte`, `engines/index.ts`, `analysisRunner.test.ts`, `cellTypes.ts`, `executionSession.ts`, `workspace/commands.ts`, `ExportDialog.svelte`, `connectionIdentity.ts`, `gridFind.ts`, `ref_node_fs`, `dialogMotion.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `sqlFiles.ts`, `queryConsoles.ts`, `focusZones.ts`, `invoke`, `connection.ts`, `package.json`, `ref_app`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPane.svelte`, `SchemaTree.svelte`, `i18n/index.ts`, `diagnosticPresentation.dom.test.ts`, `diagnosticPresentation.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `configuration.ts`, `sidebarLayout.ts`, `queryHistory.ts`, `findBar.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `resultChanges.ts`, `vitest`, `TilePicker.svelte`, `executionSession.ts`, `stores/shortcuts.ts`, `FileTree.svelte`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `support.rs`, `corpus.rs`, `.new`, `DestructiveClassification`, `engine_context.rs`, `tests/lines.rs`, `drivers.rs`, `parser.rs`, `ConnectionEngineContext`, `export.rs`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `server-tests/src/lib.rs`, `result_editing.rs`, `query.rs`, `super`, `Option`, `AppState`, `Diagnostic`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _806 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.06440677966101695 - nodes in this community are weakly interconnected._