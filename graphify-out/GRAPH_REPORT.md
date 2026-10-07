# Graph Report - khipu  (2026-10-07)

## Corpus Check
- 510 files · ~556,146 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 33 file(s) not represented in the graph (top: (none) 10, .css 10, .sig 8)

## Summary
- 4902 nodes · 11555 edges · 208 communities (182 shown, 26 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 446 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f356f08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- editing.rs
- run.mjs
- postgres/src/lib.rs
- queryConsoles.ts
- DestructiveClassification
- driver-core/src/lib.rs
- updates.rs
- docs/ARCHITECTURE.md
- mysql/src/introspect.rs
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- @codemirror/state
- configuration.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- postgres/src/version.rs
- compilerOptions
- outputCopy.ts
- contract.test.ts
- devDependencies
- credentials.rs
- completionSource.ts
- default.json
- khipu-desktop
- postgres/src/introspect.rs
- sql_path
- sqlDefinitionLink.ts
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- String
- @codemirror/view
- sql_files.rs
- ResultPager.svelte
- resources.mjs
- context.ts
- pagination.rs
- diagnostics.ts
- resultEditing.ts
- diagnostics.rs
- svelte
- release_highlight.rs
- MySqlConnector
- server-tests/src/lib.rs
- support.rs
- lib/types.ts
- vitest
- sqlFiles.ts
- executionMarker.ts
- assembly.rs
- terminal.rs
- query.rs
- messages/index.ts
- selected
- mysql/src/tls.rs
- gridClipboard.ts
- workspace/mosaic.ts
- filterBuilder.ts
- connection_error.rs
- executionSession.ts
- ConnectionEngineContext
- list_releases
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- serde
- analysisSession.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- AnalysisRunner
- Dialect
- QueryCancel
- State
- safety.rs
- resultTabs.ts
- theme.ts
- tests.mjs
- result_editing.rs
- svelte
- connectionTest.ts
- diagnosticPresentation.ts
- parser.rs
- i18n/index.ts
- analysisRunner.test.ts
- graph.mjs
- scripts
- main.js
- editorSettings.ts
- Quality CI Workflow
- TilePicker.svelte
- cellTypes.ts
- executionSession.test.ts
- workspace/commands.ts
- Option
- SQL engine quality contract
- ExportDialog.svelte
- state.rs
- Contrato de calidad de los motores SQL
- formatter.ts
- connection.rs
- 6. The matrix
- postgres/src/tls.rs
- stores/shortcuts.ts
- diagnosticPresentation.dom.test.ts
- ref_node_fs
- formatLayout.ts
- console.rs
- tooltip.ts
- ChangesPreview.svelte
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
- Position
- search.ts
- analysis.rs
- Vec
- ResultTabActions
- FileTree.svelte
- ConnectionForm.svelte
- text_encoding.rs
- tests/lines.rs
- SqlLexical
- Bases de datos de prueba
- catalog_bench.rs
- desktop_portal.rs
- SchemaTree.svelte
- createSearchPanel
- Workspace.svelte
- DiagnosticPopup
- unused.mjs
- fetch.sh
- AppState
- Contribuir
- gridSelectionSummary.ts
- keybindings.ts
- ARCHITECTURE.es.md
- status.mjs
- search.dom.test.ts
- engines/index.ts
- commentEditing.dom.test.ts
- Engine
- DbConnector
- mysqlconnector
- postgresconnector
- RawStatement<'q>
- window.mjs
- lines.sh
- createConsoleFiles
- treeKeys.ts
- MessageKey
- gridNavigation.ts
- DataGrid.svelte
- error_position.rs
- resultChanges.ts
- EditorConfiguration
- Performance measurements
- src/catalog.rs
- Open
- Mediciones de rendimiento
- sqlStatements.ts
- SqlEditor.svelte
- session.ts
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- ResultPane.svelte
- Test databases
- numpadKeys.ts
- ResultChangesController
- sidebarLayout.ts
- Option
- connectionIdentity.ts
- focusZones.keys.test.ts
- LensMessage

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 113 edges
2. `vitest` - 99 edges
3. `svelte` - 54 edges
4. `Engine` - 52 edges
5. `@codemirror/state` - 44 edges
6. `analyze_statement()` - 40 edges
7. `SqlProfile` - 35 edges
8. `Diagnostic` - 35 edges
9. `ENGINES` - 34 edges
10. `selected()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `6.5 Capabilities (current state)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts
- `2. Principios` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts
- `6.5 Capacidades (estado actual)` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.es.md → app/src/lib/engines/types.ts
- `14.2 Coverage of each row` --references--> `splitStatements()`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/sqlStatements.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (208 total, 26 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (51): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify_selection(), cte_around_update_without_where_requires_confirmation() (+43 more)

### Community 1 - "editing.rs"
Cohesion: 0.11
Nodes (33): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+25 more)

### Community 2 - "run.mjs"
Cohesion: 0.08
Nodes (24): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+16 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.19
Nodes (16): cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement, RESTORE_SERVER_TIME_ZONE (+8 more)

### Community 4 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (38): isFilterOperator(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), activateQueryConsole(), appendConsole() (+30 more)

### Community 5 - "DestructiveClassification"
Cohesion: 0.14
Nodes (39): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+31 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (29): CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+21 more)

### Community 7 - "updates.rs"
Cohesion: 0.10
Nodes (31): download_base(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, is_rate_limited(), manifiesto_por_tag(), omite_borradores(), ordena_de_la_mas_nueva_a_la_mas_vieja_y_marca_la_relacion() (+23 more)

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
Cohesion: 0.11
Nodes (32): async_trait, QueryExecutionOptions, cancelled_before_start(), CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, hex_encode() (+24 more)

### Community 13 - "@codemirror/state"
Cohesion: 0.07
Nodes (38): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, blockText() (+30 more)

### Community 14 - "configuration.ts"
Cohesion: 0.07
Nodes (37): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+29 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.08
Nodes (38): select(), toConnectionFailure(), forgetConnectionPassword(), loadConnectionPassword(), activeEngine, activeProfile, catalogTables, completeConnection() (+30 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (19): description, license, name, type, version, config, codemirror, happy-dom (+11 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.15
Nodes (19): a_request_from_another_generation_or_epoch_is_no_longer_current(), civil_date(), dotted(), effective_line(), identity(), LineIdentity, Lines, one_year_after() (+11 more)

### Community 21 - "postgres/src/version.rs"
Cohesion: 0.12
Nodes (11): Capability, Capabilities, capabilities_by_version(), COMPATIBILITY_FLOOR_MAJOR, Capabilities, Self, String, Vec (+3 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "outputCopy.ts"
Cohesion: 0.21
Nodes (12): COPY_CHOICES, CopyAmount, DEFAULT_COPY_AMOUNT, formatTimestamp(), lastLines(), loadCopyAmount(), MAX_CUSTOM_LINES, outputLines() (+4 more)

### Community 24 - "contract.test.ts"
Cohesion: 0.09
Nodes (33): ConnectionDriver, analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), painted(), dialectFor(), sqlTokens() (+25 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.05
Nodes (79): argumentsSnippet(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), complete(), schemas (+71 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.10
Nodes (46): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+38 more)

### Community 32 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

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
Cohesion: 0.15
Nodes (18): Checker<'a, '_>, closest_names(), output_columns(), Expr, Ident, Iterator, ObjectName, Query (+10 more)

### Community 45 - "@codemirror/view"
Cohesion: 0.11
Nodes (6): createMatchCounter(), MatchStatus, MAX_COUNTED, FindBar, ReplaceBar, @codemirror/view

### Community 46 - "sql_files.rs"
Cohesion: 0.25
Nodes (22): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+14 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.18
Nodes (5): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton()

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (52): connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP, appHeapMb() (+44 more)

### Community 49 - "context.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.12
Nodes (31): GuardOptions, statement_is_read_only(), con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64() (+23 more)

### Community 51 - "diagnostics.ts"
Cohesion: 0.10
Nodes (27): byAnalyzerLocation(), byNearFragment(), byPosition(), byQuotedName(), byServerPosition(), charToUtf16(), diagnosticAt(), diagnosticDecorations() (+19 more)

### Community 52 - "resultEditing.ts"
Cohesion: 0.12
Nodes (28): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+20 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (44): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+36 more)

### Community 54 - "svelte"
Cohesion: 0.09
Nodes (6): allState, style, shortcutText(), $t(), setFormatterLineWidth(), svelte

### Community 55 - "release_highlight.rs"
Cohesion: 0.13
Nodes (33): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+25 more)

### Community 56 - "MySqlConnector"
Cohesion: 0.14
Nodes (18): MySqlConnector, open_pool(), Capabilities, ConnectionConfig, DriverError, MySqlConnectOptions, MySqlPool, MySqlRow (+10 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.14
Nodes (19): Capability, Declared, declared_servers(), dotted(), entries(), Entry, error_text(), evidence() (+11 more)

### Community 58 - "support.rs"
Cohesion: 0.05
Nodes (110): a_a_signed_index_and_its_packages_are_accepted(), a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), activate_installed(), ACTIVATION, an_http_error_says_its_status(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), an_unresolvable_host_says_there_is_no_network() (+102 more)

### Community 59 - "lib/types.ts"
Cohesion: 0.03
Nodes (76): if(), Request, reservedWords(), TableEntry, ConnectionConfig, CatalogColumn, CatalogTable, ColumnCatalogInfo (+68 more)

### Community 60 - "vitest"
Cohesion: 0.08
Nodes (37): slice(), BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS (+29 more)

### Community 61 - "sqlFiles.ts"
Cohesion: 0.11
Nodes (30): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), pickSqlFolder(), renameConsoleFile() (+22 more)

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

### Community 68 - "mysql/src/tls.rs"
Cohesion: 0.10
Nodes (20): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+12 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.13
Nodes (22): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+14 more)

### Community 70 - "workspace/mosaic.ts"
Cohesion: 0.05
Nodes (69): clampRatio(), dropTarget(), finish(), onDividerKeydown(), onKey(), onMove(), startResize(), onMove() (+61 more)

### Community 71 - "filterBuilder.ts"
Cohesion: 0.15
Nodes (15): schemaOption(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+7 more)

### Community 72 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 73 - "executionSession.ts"
Cohesion: 0.11
Nodes (30): tabExists(), nextSort(), appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution() (+22 more)

### Community 74 - "ConnectionEngineContext"
Cohesion: 0.24
Nodes (7): ConnectionEngineContext, Arc, Self, SessionMode, the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine(), the_context_keeps_its_shape(), ServerIdentity

### Community 75 - "list_releases"
Cohesion: 0.18
Nodes (20): command_succeeds(), current_version(), detect_install_kind(), http_client(), install_package(), install_release(), InstallKind, linux_package_kind() (+12 more)

### Community 76 - "super"
Cohesion: 0.11
Nodes (18): DEFINITION, UNPARSED, DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies, Option, DEFINITION (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): flushConsoleTexts(), filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry() (+9 more)

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

### Community 85 - "AnalysisRunner"
Cohesion: 0.16
Nodes (4): AnalysisRunner, Region, AnalysisSession, createAnalysisSession()

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
Cohesion: 0.14
Nodes (25): addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+17 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "result_editing.rs"
Cohesion: 0.28
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+11 more)

### Community 94 - "svelte"
Cohesion: 0.13
Nodes (18): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle(), createMemoryStorage(), freshQueryConsoles() (+10 more)

### Community 95 - "connectionTest.ts"
Cohesion: 0.14
Nodes (18): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError() (+10 more)

### Community 96 - "diagnosticPresentation.ts"
Cohesion: 0.23
Nodes (10): diagnosticCounter(), jump(), serverDiagnostics(), stopTypingIn(), Text, jumpToDiagnostic(), visibleDiagnosticCount(), ErrorHelp (+2 more)

### Community 97 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 98 - "i18n/index.ts"
Cohesion: 0.16
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), numberFormat, systemLocale(), translator() (+9 more)

### Community 99 - "analysisRunner.test.ts"
Cohesion: 0.12
Nodes (14): AnalysisRunnerOptions, merge(), subtract(), create(), runner(), typed(), ranges(), DiagnosticPopupState (+6 more)

### Community 100 - "graph.mjs"
Cohesion: 0.11
Nodes (16): blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS, edges (+8 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "editorSettings.ts"
Cohesion: 0.15
Nodes (17): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+9 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "TilePicker.svelte"
Cohesion: 0.09
Nodes (14): active, danger, submit, active, byId, filtered, move(), onKeydown() (+6 more)

### Community 106 - "cellTypes.ts"
Cohesion: 0.18
Nodes (16): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+8 more)

### Community 107 - "executionSession.test.ts"
Cohesion: 0.07
Nodes (27): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, STANDARD_LEXICAL, applySessionContext() (+19 more)

### Community 108 - "workspace/commands.ts"
Cohesion: 0.22
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, handlerKey(), handlers, registerCommand() (+7 more)

### Community 109 - "Option"
Cohesion: 0.23
Nodes (12): analyze_statement_with(), closest_keyword(), expected_found(), join_constraint(), max_distance(), removed_syntax(), Line, Option (+4 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.09
Nodes (22): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+14 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.18
Nodes (10): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+2 more)

### Community 112 - "state.rs"
Cohesion: 0.09
Nodes (32): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, build_catalog(), ConsoleChange (+24 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.07
Nodes (28): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión (+20 more)

### Community 114 - "formatter.ts"
Cohesion: 0.15
Nodes (19): FormatSettings, format(), upperOperatorWords(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult (+11 more)

### Community 115 - "connection.rs"
Cohesion: 0.14
Nodes (22): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), disconnect(), load_connection_password(), ConnectionConfig, ConnectionErrorKind (+14 more)

### Community 116 - "6. The matrix"
Cohesion: 0.33
Nodes (6): 6.1 Safety, 6.2 Analysis and diagnostics, 6.3 Generated SQL and autocomplete, 6.4 Drivers and introspection, 6.5 Capabilities (current state), 6. The matrix

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.07
Nodes (35): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+27 more)

### Community 118 - "stores/shortcuts.ts"
Cohesion: 0.13
Nodes (10): handleRecordKeydown(), KEY_SYMBOLS, MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, ShortcutEventLike (+2 more)

### Community 119 - "diagnosticPresentation.dom.test.ts"
Cohesion: 0.20
Nodes (10): createDiagnosticPopup(), applyFix(), cancelHoverClose(), close(), scheduleHoverClose(), mounted(), addDiagnostics, applyQuickFix() (+2 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.08
Nodes (27): query(), ENGINE_SOURCES, Backend (`app/src-tauri/src`), ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path (+19 more)

### Community 121 - "formatLayout.ts"
Cohesion: 0.34
Nodes (17): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+9 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "tooltip.ts"
Cohesion: 0.19
Nodes (16): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+8 more)

### Community 124 - "ChangesPreview.svelte"
Cohesion: 0.16
Nodes (14): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter(), moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick() (+6 more)

### Community 125 - "replace.ts"
Cohesion: 0.70
Nodes (4): preserveCase(), replaceEverything(), replacementFor(), matchesIn()

### Community 126 - "Diagnostic"
Cohesion: 0.21
Nodes (31): at_token(), Diagnostic, DiagnosticMessage, ends_expression(), friendly_syntax(), handler_action(), inspect_routine_chunk(), is_plain_name() (+23 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "TerminalSession.svelte"
Cohesion: 0.11
Nodes (11): active, closing, closeTerminal(), createTerminal(), TerminalCallbacks, TerminalInfo, writeTerminal(), body() (+3 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.18
Nodes (8): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, vector_text(), MySql

### Community 130 - "+layout.svelte"
Cohesion: 0.09
Nodes (24): setSidebarRevealer(), initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+16 more)

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
Cohesion: 0.12
Nodes (21): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+13 more)

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 137 - "focusZones.ts"
Cohesion: 0.11
Nodes (33): clearMark(), Direction, DIRECTION_COMMANDS, flash(), flashTimers, focusZone(), holding(), installFocusZones() (+25 more)

### Community 138 - "columnFilters.ts"
Cohesion: 0.18
Nodes (15): setColumnFilters(), forgetColumnFilters(), recallColumnFilters(), rememberColumnFilters(), Saved, filters, collator, ColumnFilters (+7 more)

### Community 139 - "new.mjs"
Cohesion: 0.07
Nodes (28): 11. Version support packs, 11. Paquetes de soporte de versión, args, base, contract, contractPath, corpus, dialects (+20 more)

### Community 140 - "invoke"
Cohesion: 0.12
Nodes (22): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), runtimePasswords (+14 more)

### Community 141 - "Position"
Cohesion: 0.20
Nodes (12): byte_offset(), distance(), offset_at(), Position, position_at(), Repaired<'a>, From, subquery_errors() (+4 more)

### Community 142 - "search.ts"
Cohesion: 0.14
Nodes (18): __test, exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded() (+10 more)

### Community 143 - "analysis.rs"
Cohesion: 0.14
Nodes (27): is_error(), routines_corpus(), QueryExecutionResult, call_and_show_create_return_their_rows(), char_offset(), common_valid_ddl_and_dml_is_never_objected_to(), everyday_queries(), is_syntax_error() (+19 more)

### Community 144 - "Vec"
Cohesion: 0.23
Nodes (13): catalog_cases(), CatalogView, check(), Checker, el_catalogo_en_cada_motor(), Expect, la_sintaxis_en_cada_motor(), mysql_select_into_errors() (+5 more)

### Community 146 - "FileTree.svelte"
Cohesion: 0.12
Nodes (15): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY (+7 more)

### Community 147 - "ConnectionForm.svelte"
Cohesion: 0.10
Nodes (10): neutral, indexOf(), Icon, icons, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, connectionDrivers, DriverDefinition (+2 more)

### Community 148 - "text_encoding.rs"
Cohesion: 0.11
Nodes (31): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+23 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.13
Nodes (19): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+11 more)

### Community 150 - "SqlLexical"
Cohesion: 0.14
Nodes (19): commentAwareWrap(), applyIndentation(), codeChar(), IDENTIFIER_CLOSE, isWordChar(), normalizePastedSql(), quotedEnd(), IndexValue (+11 more)

### Community 151 - "Bases de datos de prueba"
Cohesion: 0.40
Nodes (4): Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 152 - "catalog_bench.rs"
Cohesion: 0.18
Nodes (15): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+7 more)

### Community 153 - "desktop_portal.rs"
Cohesion: 0.43
Nodes (7): report_slow_start(), Duration, Option, String, SLOW_START, slow_start_hint(), solo_avisa_de_un_arranque_lento()

### Community 154 - "SchemaTree.svelte"
Cohesion: 0.18
Nodes (10): destroy(), child(), forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable(), tabScroll() (+2 more)

### Community 155 - "createSearchPanel"
Cohesion: 0.33
Nodes (9): closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel(), toggleSearchPanel() (+1 more)

### Community 156 - "Workspace.svelte"
Cohesion: 0.09
Nodes (8): $t(), clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE, load(), MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS, ExecutionFlow

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "AppState"
Cohesion: 0.16
Nodes (20): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+12 more)

### Community 161 - "Contribuir"
Cohesion: 0.09
Nodes (24): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Novedad de la versión, Primeros pasos, Pruebas contra una base real (+16 more)

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.20
Nodes (13): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+5 more)

### Community 163 - "keybindings.ts"
Cohesion: 0.21
Nodes (13): activeZone, installKeybindings(), onKeydown(), onKeyup(), track(), withHeld(), Modifier, modifierOfCode() (+5 more)

### Community 165 - "status.mjs"
Cohesion: 0.18
Nodes (16): compare(), connections, coverage, coverageBlock(), DOCS, engines, enginesBlock(), json() (+8 more)

### Community 166 - "search.dom.test.ts"
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 167 - "engines/index.ts"
Cohesion: 0.12
Nodes (31): firstLocated(), ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), lineReservedWords() (+23 more)

### Community 168 - "commentEditing.dom.test.ts"
Cohesion: 0.18
Nodes (8): blockClosingAt(), commentEditing, editor(), shown(), views, ENCLOSING, reaches(), typing

### Community 169 - "Engine"
Cohesion: 0.11
Nodes (12): Conn, declared_version(), Engine, .ALL, NoBackslashEscapes, ConnectionConfig, DriverError, Drop (+4 more)

### Community 170 - "DbConnector"
Cohesion: 0.17
Nodes (12): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Output, Pin (+4 more)

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.16
Nodes (14): args, compare(), inWindow(), lineOf(), lines, numbers(), prefix(), problems (+6 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "createConsoleFiles"
Cohesion: 0.08
Nodes (12): forgetLog(), closeQueryConsole(), QueryConsole, renameQueryConsole(), withoutExecution(), ConsoleFiles, createConsoleFiles(), close() (+4 more)

### Community 177 - "treeKeys.ts"
Cohesion: 0.27
Nodes (6): mountTree(), focusRow(), itemOf(), treeKeys(), onClick(), onKeydown()

### Community 178 - "MessageKey"
Cohesion: 0.14
Nodes (14): MessageKey, invalidCells(), CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned (+6 more)

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "DataGrid.svelte"
Cohesion: 0.19
Nodes (11): onMove(), onUp(), selectCell(), toggleInSelection(), tiles(), CHUNK_ROWS, chunkWindow, GROUP_COLS (+3 more)

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 183 - "resultChanges.ts"
Cohesion: 0.12
Nodes (26): applyChanges(), EditTarget, fetchEditInfo(), PendingEdits, previewChanges(), ResultChanges, RowRange, clearResultPendingEdits() (+18 more)

### Community 185 - "Performance measurements"
Cohesion: 0.29
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 186 - "src/catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "sqlStatements.ts"
Cohesion: 0.04
Nodes (89): LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts(), createEditorCommands(), currentSqlRange(), mounted() (+81 more)

### Community 190 - "SqlEditor.svelte"
Cohesion: 0.13
Nodes (8): writeClipboard(), close(), ContextMenuItem, writeClipboardText(), app_src_lib_sqleditoricons, entry(), app_src_lib_styles_editorsearch, focused()

### Community 191 - "session.ts"
Cohesion: 0.33
Nodes (6): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf()

### Community 198 - "ResultPane.svelte"
Cohesion: 0.11
Nodes (12): addNewRow(), closeFind(), commitCell(), deleteSelectedRows(), fillSelectedCells(), openFind(), pasteFromClipboard(), $t() (+4 more)

### Community 200 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 201 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 203 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 204 - "Option"
Cohesion: 0.48
Nodes (7): line_support(), Option, SupportStatus, status(), SupportStatus, vendor_support(), VendorSupport

### Community 205 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 206 - "focusZones.keys.test.ts"
Cohesion: 0.19
Nodes (12): fits(), FakeKey, g, hold(), KeyInit, letGo(), press(), release() (+4 more)

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **816 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+811 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1598 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `TerminalSession.svelte`, `+layout.svelte`, `explorerTree.ts`, `focusZones.ts`, `columnFilters.ts`, `invoke`, `@codemirror/state`, `configuration.ts`, `search.ts`, `connection.ts`, `package.json`, `SqlLexical`, `outputCopy.ts`, `contract.test.ts`, `SchemaTree.svelte`, `completionSource.ts`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `engines/index.ts`, `commentEditing.dom.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `createConsoleFiles`, `context.ts`, `MessageKey`, `diagnostics.ts`, `resultEditing.ts`, `gridNavigation.ts`, `DataGrid.svelte`, `resultChanges.ts`, `treeKeys.ts`, `lib/types.ts`, `sqlStatements.ts`, `executionMarker.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `filterBuilder.ts`, `numpadKeys.ts`, `executionSession.ts`, `sidebarLayout.ts`, `connectionIdentity.ts`, `focusZones.keys.test.ts`, `queryHistory.ts`, `analysisSession.ts`, `resultTabs.ts`, `theme.ts`, `svelte`, `connectionTest.ts`, `i18n/index.ts`, `analysisRunner.test.ts`, `cellTypes.ts`, `executionSession.test.ts`, `workspace/commands.ts`, `ExportDialog.svelte`, `formatter.ts`, `diagnosticPresentation.dom.test.ts`, `ref_node_fs`, `ChangesPreview.svelte`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `queryConsoles.ts`, `focusZones.ts`, `invoke`, `configuration.ts`, `connection.ts`, `package.json`, `FileTree.svelte`, `SchemaTree.svelte`, `Workspace.svelte`, `keybindings.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `createConsoleFiles`, `resultChanges.ts`, `sqlFiles.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `executionSession.ts`, `sidebarLayout.ts`, `queryHistory.ts`, `findBar.ts`, `resultTabs.ts`, `theme.ts`, `diagnosticPresentation.ts`, `i18n/index.ts`, `editorSettings.ts`, `TilePicker.svelte`, `executionSession.test.ts`, `stores/shortcuts.ts`, `diagnosticPresentation.dom.test.ts`, `tooltip.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `editing.rs`, `DestructiveClassification`, `corpus.rs`, `Vec`, `engine_context.rs`, `tests/lines.rs`, `export.rs`, `pagination.rs`, `diagnostics.rs`, `server-tests/src/lib.rs`, `support.rs`, `query.rs`, `ConnectionEngineContext`, `super`, `result_editing.rs`, `parser.rs`, `Option`, `state.rs`, `postgres/src/tls.rs`, `Diagnostic`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _816 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0655367231638418 - nodes in this community are weakly interconnected._