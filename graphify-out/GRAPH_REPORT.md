# Graph Report - khipu  (2026-10-04)

## Corpus Check
- 466 files · ~510,911 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 31 file(s) not represented in the graph (top: (none) 10, .css 8, .sig 8)

## Summary
- 4505 nodes · 10547 edges · 200 communities (172 shown, 28 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 381 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc4c3942`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- support.rs
- run.mjs
- postgres/src/lib.rs
- sqlFiles.ts
- executionSession.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- vitest
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- sqlDefinitionLink.ts
- focusZones.ts
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- engine_context.rs
- Arquitectura
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- svelte
- default.json
- khipu-engine
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
- i18n/index.ts
- DestructiveClassification
- diagnostics.rs
- editing.rs
- updates.rs
- Result
- server-tests/src/lib.rs
- connection_error.rs
- result_editing.rs
- parameterTypes.ts
- completionSource.ts
- executionMarker.ts
- assembly.rs
- serde
- query.rs
- messages/index.ts
- selected
- Contribuir
- gridClipboard.ts
- Workspace.svelte
- Engine
- workspace/commands.ts
- resultEditing.ts
- filterBuilder.ts
- commentStyle.ts
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
- ConnectionConfig
- resultChanges.ts
- indentation.ts
- queryExecution.ts
- contract.test.ts
- engines/index.ts
- Añadir un motor de base de datos
- graph.mjs
- scripts
- main.js
- formatter.ts
- Quality CI Workflow
- iconOptics.ts
- cellTypes.ts
- invoke
- FileTree.svelte
- closest_names
- SQL engine quality contract
- ExportDialog.svelte
- state.rs
- Contrato de calidad de los motores SQL
- sql_files.rs
- connection.rs
- error_position.rs
- postgres/src/tls.rs
- createSearchPanel
- ResultPane.svelte
- ref_node_fs
- SqlEditor.svelte
- console.rs
- text_encoding.rs
- dialogMotion.ts
- replace.ts
- inspect_routine_chunk
- publish.mjs
- ref_app
- RawStatement<'q>
- +layout.svelte
- Extensiones opcionales y futura tienda — límites antes del runtime
- webkit_env.rs
- PostgresConnector
- lib/types.ts
- NewlineMarker
- corpus.rs
- diagnostics.ts
- sqlPreviewFormat.ts
- new.mjs
- src/catalog.rs
- Diagnostic
- search.ts
- analysis.rs
- Adding a database engine
- @codemirror/search
- ChangesPreview.svelte
- queryParameters.ts
- context.ts
- tests/lines.rs
- executionSession.test.ts
- numpadKeys.ts
- behavior.ts
- focusZones.keys.test.ts
- parser.rs
- svelte
- pinnedTables.ts
- MySqlConnector
- unused.mjs
- fetch.sh
- commands/catalog.rs
- DataGrid.svelte
- gridSelectionSummary.ts
- Test databases
- ARCHITECTURE.es.md
- status.mjs
- search.dom.test.ts
- apply
- coverage.mjs
- FindBarActions
- .connection
- mysqlconnector
- postgresconnector
- RawStatement<'q>
- window.mjs
- lines.sh
- svelte.config.js
- vite.config.js
- EditorConfiguration
- gridNavigation.ts
- gridWindow.test.ts
- .fmt
- DiagnosticPopup
- ResultChangesController
- ResultTabActions
- EditorCommands
- Performance measurements
- Mediciones de rendimiento
- connectionIdentity.ts
- join_constraint
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 113 edges
2. `vitest` - 89 edges
3. `svelte` - 53 edges
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
- `Flujo de datos` --references--> `buildExplorerTree()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/connections/explorerTree.ts
- `Frontend (`app/src/lib`)` --references--> `engineForContext()`  [INFERRED]
  docs/ARCHITECTURE.es.md → app/src/lib/engines/index.ts
- `2. Principles` --references--> `SqlProfile`  [INFERRED]
  SQL_ENGINE.md → app/src/lib/engines/types.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (200 total, 28 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (49): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive() (+41 more)

### Community 1 - "support.rs"
Cohesion: 0.06
Nodes (103): a_a_signed_index_and_its_packages_are_accepted(), activate_installed(), ACTIVATION, an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), APP, app_version(), apply(), Available (+95 more)

### Community 2 - "run.mjs"
Cohesion: 0.07
Nodes (25): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.15
Nodes (20): async_trait, cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result(), RawStatement (+12 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.06
Nodes (39): finishEdit(), onEditKeydown(), translate, createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), pickSqlFolder(), renameConsoleFile() (+31 more)

### Community 5 - "executionSession.ts"
Cohesion: 0.11
Nodes (29): nextSort(), appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation() (+21 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (27): CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, QueryColumn (+19 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (36): isFilterOperator(), activateQueryConsole(), appendConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE (+28 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.18
Nodes (16): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs) (+8 more)

### Community 9 - "vitest"
Cohesion: 0.05
Nodes (63): LEXICALS, ONE_QUERY, ranges(), SEVERAL, texts(), currentSqlRange(), mounted(), Selection (+55 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.16
Nodes (21): CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, is_unsupported_in_prepared_protocol(), MAX_ROWS_TO_DRAIN, mysql_cell_to_query_value(), mysql_error_to_result() (+13 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.20
Nodes (6): definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "focusZones.ts"
Cohesion: 0.12
Nodes (26): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), isPrefix(), onEscape() (+18 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.05
Nodes (56): indexOf(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+48 more)

### Community 18 - "package.json"
Cohesion: 0.13
Nodes (14): description, license, name, type, version, codemirror, happy-dom, sql-formatter (+6 more)

### Community 19 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+10 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.10
Nodes (33): a_request_from_another_generation_or_epoch_is_no_longer_current(), civil_date(), ConnectionEngineContext, dotted(), effective_line(), identity(), line_support(), LineIdentity (+25 more)

### Community 21 - "Arquitectura"
Cohesion: 0.15
Nodes (13): query(), Arquitectura, Backend (`app/src-tauri/src`), Capas y dependencias, Cómo fluye el SQL, Frontend (`app/src/lib`), Fronteras que se comprueban solas, `khipu-lsp` (+5 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.16
Nodes (19): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+11 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.07
Nodes (56): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+48 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "svelte"
Cohesion: 0.07
Nodes (17): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), colorLabel() (+9 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-engine"
Cohesion: 0.62
Nodes (7): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp, rowly-server-tests

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.10
Nodes (47): build_parameters, ParameterMode, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL (+39 more)

### Community 32 - "configuration.ts"
Cohesion: 0.06
Nodes (36): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+28 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.06
Nodes (25): Capability, Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities (+17 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.13
Nodes (17): PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy() (+9 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.08
Nodes (26): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+18 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (24): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+16 more)

### Community 44 - "String"
Cohesion: 0.16
Nodes (16): Checker<'a, '_>, output_columns(), Expr, Ident, ObjectName, Query, SetExpr, Statement (+8 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "resources.mjs"
Cohesion: 0.07
Nodes (36): shown(), connectInspector(), liveHeap(), pageSocket(), sleep(), APP, args, assertStable() (+28 more)

### Community 49 - "analysisSession.ts"
Cohesion: 0.07
Nodes (25): BackendMessage, AnalysisRunner, merge(), Region, subtract(), runner(), analysisCacheFor(), AnalysisContext (+17 more)

### Community 50 - "pagination.rs"
Cohesion: 0.13
Nodes (29): GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64(), lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() (+21 more)

### Community 51 - "i18n/index.ts"
Cohesion: 0.18
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), numberFormat, systemLocale(), translator() (+9 more)

### Community 52 - "DestructiveClassification"
Cohesion: 0.15
Nodes (39): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+31 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (48): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+40 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (33): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+25 more)

### Community 55 - "updates.rs"
Cohesion: 0.09
Nodes (50): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+42 more)

### Community 56 - "Result"
Cohesion: 0.17
Nodes (14): hex_encode(), open_pool(), ConnectionConfig, DriverError, MySqlConnectOptions, MySqlRow, Result, SchemaObjects (+6 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.09
Nodes (30): Capability, classification(), classification_with(), Conn, Declared, declared_servers(), declared_version(), dotted() (+22 more)

### Community 58 - "connection_error.rs"
Cohesion: 0.17
Nodes (12): ConnectionErrorKind, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind, Result (+4 more)

### Community 59 - "result_editing.rs"
Cohesion: 0.28
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+11 more)

### Community 60 - "parameterTypes.ts"
Cohesion: 0.09
Nodes (33): BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS, OPERATOR (+25 more)

### Community 61 - "completionSource.ts"
Cohesion: 0.04
Nodes (89): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), schemaOption() (+81 more)

### Community 62 - "executionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 63 - "assembly.rs"
Cohesion: 0.15
Nodes (24): drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row(), KeyColumnRow (+16 more)

### Community 64 - "serde"
Cohesion: 0.16
Nodes (13): app_text_travels_as_key_and_params(), Message, raw_text_travels_as_a_plain_string(), BTreeMap, From, Into, Option, Self (+5 more)

### Community 65 - "query.rs"
Cohesion: 0.14
Nodes (31): a_script_is_checked_statement_by_statement(), analyze_sql(), cancel_query(), check_statement(), classify_statements(), count_query_rows(), DEFAULT_QUERY_ROW_LIMIT, execute_query() (+23 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.26
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 67 - "selected"
Cohesion: 0.17
Nodes (31): declared_tls(), IntoIterator, Item, selected(), a_result_set_keeps_values_and_nulls(), a_server_error_keeps_its_code_and_position(), connector(), connects_and_lists_schemas_and_tables() (+23 more)

### Community 68 - "Contribuir"
Cohesion: 0.22
Nodes (9): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión (+1 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.12
Nodes (24): writeClipboard(), COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue() (+16 more)

### Community 70 - "Workspace.svelte"
Cohesion: 0.07
Nodes (17): #each(), reorderResultTabs(), tabExists(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup() (+9 more)

### Community 71 - "Engine"
Cohesion: 0.10
Nodes (23): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+15 more)

### Community 72 - "workspace/commands.ts"
Cohesion: 0.10
Nodes (26): handleRecordKeydown(), activeZone, Zone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut (+18 more)

### Community 73 - "resultEditing.ts"
Cohesion: 0.13
Nodes (25): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+17 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.13
Nodes (19): buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues(), newCondition() (+11 more)

### Community 75 - "commentStyle.ts"
Cohesion: 0.18
Nodes (13): blockText(), commentDecorations(), commentMarks(), commentStyle, commentStylePlugin, commentStyleTheme, styled(), views (+5 more)

### Community 76 - "super"
Cohesion: 0.09
Nodes (24): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), catalog, DEFINITION, UNPARSED (+16 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.19
Nodes (15): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+7 more)

### Community 78 - "desktop.py"
Cohesion: 0.06
Nodes (53): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+45 more)

### Community 79 - "findBar.ts"
Cohesion: 0.29
Nodes (14): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+6 more)

### Community 80 - "console_texts.rs"
Cohesion: 0.14
Nodes (23): frontend_commands(), String, io_failure(), prune(), read(), AppHandle, Message, Option (+15 more)

### Community 81 - "version_lines.rs"
Cohesion: 0.19
Nodes (25): engine_selected(), error_text(), check_version(), engine_named(), entry_since(), every_column_type_a_line_returns_is_read(), every_version_line_is_told_apart_from_the_previous_one(), expected() (+17 more)

### Community 82 - "DbConnector"
Cohesion: 0.16
Nodes (12): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Message, Output (+4 more)

### Community 83 - "sqlStatements.ts"
Cohesion: 0.09
Nodes (38): scanInChunks(), commentAwareWrap(), codeChar(), IDENTIFIER_CLOSE, isWordChar(), normalizePastedSql(), quotedEnd(), IndexValue (+30 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.18
Nodes (17): PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+9 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (22): MYSQL, same_single_statement(), ACTIVE_LINES, ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL (+14 more)

### Community 87 - "QueryCancel"
Cohesion: 0.21
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "State"
Cohesion: 0.15
Nodes (25): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+17 more)

### Community 89 - "safety.rs"
Cohesion: 0.14
Nodes (24): attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement(), INJECTIONS, Lcg (+16 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.13
Nodes (27): keepTabPosition(), labelForKey(), $t(), addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults (+19 more)

### Community 91 - "theme.ts"
Cohesion: 0.06
Nodes (45): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+37 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "ConnectionConfig"
Cohesion: 0.13
Nodes (17): ConnectionConfig, TlsMode, TlsStatus, Límites conocidos, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos (+9 more)

### Community 94 - "resultChanges.ts"
Cohesion: 0.12
Nodes (17): invalidCells(), applyChanges(), buildChanges(), EditTarget, fetchEditInfo(), previewChanges(), ResultChanges, forgetResultEdits() (+9 more)

### Community 95 - "indentation.ts"
Cohesion: 0.16
Nodes (16): blockClosingAt(), commentEditing, ENCLOSING, reaches(), typing, backspaceIndent(), buildTabCompletionKeymap(), editor() (+8 more)

### Community 96 - "queryExecution.ts"
Cohesion: 0.09
Nodes (24): confirmTrash(), cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, trashSqlFile() (+16 more)

### Community 97 - "contract.test.ts"
Cohesion: 0.14
Nodes (13): Request, TableEntry, ExecutionError, Fixture, FIXTURES, ORDERS, PROFILES, USERS (+5 more)

### Community 98 - "engines/index.ts"
Cohesion: 0.08
Nodes (46): ConnectionDriver, editFor(), uppercaseKeywordEdit, byAnalyzerLocation(), byNearFragment(), byQuotedName(), byServerPosition(), charToUtf16() (+38 more)

### Community 99 - "Añadir un motor de base de datos"
Cohesion: 0.08
Nodes (26): reservedWords(), 10. Generated SQL, 6. Version lines, 10. SQL generado, 12. Harness, corpus y servidores de prueba, 13. Cobertura, 14. Matriz, evidencia y CI, 15. Documentación (+18 more)

### Community 100 - "graph.mjs"
Cohesion: 0.09
Nodes (18): ref_node_child_process, blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS (+10 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "formatter.ts"
Cohesion: 0.07
Nodes (53): FormatSettings, alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass() (+45 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "cellTypes.ts"
Cohesion: 0.16
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+9 more)

### Community 107 - "invoke"
Cohesion: 0.14
Nodes (20): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), listSqlDir() (+12 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.09
Nodes (19): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), close(), ContextMenuItem (+11 more)

### Community 109 - "closest_names"
Cohesion: 0.25
Nodes (9): closest_keyword(), closest_names(), distance(), expected_found(), max_distance(), Item, Iterator, split_location() (+1 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.07
Nodes (28): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+20 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.17
Nodes (11): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+3 more)

### Community 112 - "state.rs"
Cohesion: 0.11
Nodes (27): the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine(), a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, build_catalog(), ConsoleChange, context(), DatabaseExplorer, follow_console() (+19 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.07
Nodes (28): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión (+20 more)

### Community 114 - "sql_files.rs"
Cohesion: 0.25
Nodes (22): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+14 more)

### Community 115 - "connection.rs"
Cohesion: 0.14
Nodes (22): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), disconnect(), load_connection_password(), ConnectionConfig, ConnectionErrorKind (+14 more)

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.15
Nodes (11): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+3 more)

### Community 118 - "createSearchPanel"
Cohesion: 0.33
Nodes (9): closeAndFocusEditor(), createSearchPanel(), renderMode(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel(), toggleSearchPanel() (+1 more)

### Community 119 - "ResultPane.svelte"
Cohesion: 0.08
Nodes (16): allState, style, active, danger, submit, collator, ColumnFilters, columnValueCounts() (+8 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.12
Nodes (13): ENGINE_SOURCES, ref_lib, ref_node_fs, ref_node_path, DOCUMENTS, ENGINE, expected, lines (+5 more)

### Community 121 - "SqlEditor.svelte"
Cohesion: 0.13
Nodes (11): createEditorCommands(), EditorCommandsOptions, mappedCursorOffset(), TextRange, stopTypingIn(), clearDiagnosticsIn, MessageParams, MessageKey (+3 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "text_encoding.rs"
Cohesion: 0.11
Nodes (31): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+23 more)

### Community 124 - "dialogMotion.ts"
Cohesion: 0.27
Nodes (9): moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint (+1 more)

### Community 125 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 126 - "inspect_routine_chunk"
Cohesion: 0.20
Nodes (27): at_token(), DiagnosticMessage, ends_expression(), friendly_syntax(), handler_action(), inspect_routine_chunk(), is_plain_name(), is_simple_token() (+19 more)

### Community 127 - "publish.mjs"
Cohesion: 0.13
Nodes (22): ref_node_crypto, ref_node_url, base, env, mysql, out, r2, ten (+14 more)

### Community 128 - "ref_app"
Cohesion: 0.21
Nodes (10): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, usage (+2 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.22
Nodes (6): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement

### Community 130 - "+layout.svelte"
Cohesion: 0.11
Nodes (18): initLocaleEffects(), onePerFrame(), frames, setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls, app_src_lib_styles_review_dialog (+10 more)

### Community 131 - "Extensiones opcionales y futura tienda — límites antes del runtime"
Cohesion: 0.17
Nodes (12): 1. Tres cosas que no se mezclan, 2. Superficies de extensión, 3. Paquete y confianza, 4. Ciclo de vida y fallos, 5. Presupuesto de ligereza, 6. Orden de trabajo y compuertas, Código ejecutable: propuesta sujeta a prototipo, Dos ejemplos que prueban límites distintos (+4 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "PostgresConnector"
Cohesion: 0.15
Nodes (15): open_pool(), PostgresConnector, Capabilities, ConnectionConfig, DriverError, Error, PgPool, Result (+7 more)

### Community 134 - "lib/types.ts"
Cohesion: 0.08
Nodes (31): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+23 more)

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 137 - "diagnostics.ts"
Cohesion: 0.06
Nodes (52): AnalysisRunnerOptions, create(), typed(), at(), found(), createDiagnosticPopup(), applyFix(), cancelHoverClose() (+44 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "new.mjs"
Cohesion: 0.10
Nodes (21): 11. Version support packs, 11. Paquetes de soporte de versión, 5.1 La regla, 5.2 Política de soporte, 5.3 Las líneas hoy, 5.4 Datos de línea, 5. Líneas de versión, args (+13 more)

### Community 140 - "src/catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 141 - "Diagnostic"
Cohesion: 0.14
Nodes (29): analyze_statement_with(), byte_offset(), CatalogView, check(), Checker, Diagnostic, mysql_routine_errors(), mysql_select_into_errors() (+21 more)

### Community 142 - "search.ts"
Cohesion: 0.13
Nodes (21): __test, exclusionMarks, newlineMarkers, createSession(), addExclusion, clearExclusions, exclusionField, filteredQuery() (+13 more)

### Community 143 - "analysis.rs"
Cohesion: 0.17
Nodes (22): call_and_show_create_return_their_rows(), char_offset(), everyday_queries(), is_syntax_error(), mixed_statements(), real_sql(), rows_of(), Option (+14 more)

### Community 144 - "Adding a database engine"
Cohesion: 0.09
Nodes (22): if(), Dónde puede vivir el código de un motor, 12. Harness, corpus and test servers, 13. Coverage, 14. Matrix, evidence and CI, 15. Documentation, 1. Identity: engine, dialect, driver, 2. `EngineDefinition` (+14 more)

### Community 145 - "@codemirror/search"
Cohesion: 0.40
Nodes (3): createMatchCounter(), MAX_COUNTED, @codemirror/search

### Community 146 - "ChangesPreview.svelte"
Cohesion: 0.36
Nodes (4): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter()

### Community 147 - "queryParameters.ts"
Cohesion: 0.36
Nodes (5): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues()

### Community 148 - "context.ts"
Cohesion: 0.13
Nodes (17): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+9 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.14
Nodes (18): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+10 more)

### Community 150 - "executionSession.test.ts"
Cohesion: 0.12
Nodes (13): executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES, MAX_LOG_TEXT, queryHistory, createExecutionSession(), ExecutionBackend (+5 more)

### Community 151 - "numpadKeys.ts"
Cohesion: 0.36
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 152 - "behavior.ts"
Cohesion: 0.36
Nodes (7): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), typingSpan(), statementContaining()

### Community 153 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 155 - "svelte"
Cohesion: 0.29
Nodes (8): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle(), backend, svelte

### Community 156 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 157 - "MySqlConnector"
Cohesion: 0.19
Nodes (14): QueryExecutionOptions, cancelled_before_start(), MySqlConnector, Capabilities, Future, Message, MySqlPool, Output (+6 more)

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "commands/catalog.rs"
Cohesion: 0.20
Nodes (16): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+8 more)

### Community 161 - "DataGrid.svelte"
Cohesion: 0.38
Nodes (4): onMove(), onUp(), selectCell(), toggleInSelection()

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.20
Nodes (13): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+5 more)

### Community 163 - "Test databases"
Cohesion: 0.40
Nodes (4): Server tests, Test databases, Use, Version lines

### Community 164 - "ARCHITECTURE.es.md"
Cohesion: 0.27
Nodes (6): app/README.md (Tauri + SvelteKit + TypeScript template note), README.es.md (Spanish), Bases de datos de prueba, Líneas de versión, Pruebas contra servidor, Uso

### Community 165 - "status.mjs"
Cohesion: 0.18
Nodes (16): compare(), connections, coverage, coverageBlock(), DOCS, engines, enginesBlock(), json() (+8 more)

### Community 166 - "search.dom.test.ts"
Cohesion: 0.17
Nodes (11): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+3 more)

### Community 167 - "apply"
Cohesion: 0.40
Nodes (6): apply(), Option, TlsMode, ssl_mode(), PgConnectOptions, PgSslMode

### Community 168 - "coverage.mjs"
Cohesion: 0.14
Nodes (12): cited, contract, coverage, ENGINES, lines, matrix, problems, rows (+4 more)

### Community 170 - ".connection"
Cohesion: 0.40
Nodes (4): DriverError, Into, Self, String

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.25
Nodes (10): at, compare(), lineOf(), lines, numbers(), prefix(), problems, releases (+2 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 177 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 187 - "Performance measurements"
Cohesion: 0.33
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 190 - "join_constraint"
Cohesion: 0.67
Nodes (3): join_constraint(), JoinConstraint, JoinOperator

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **771 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+766 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1489 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `ref_app`, `+layout.svelte`, `sqlFiles.ts`, `executionSession.ts`, `lib/types.ts`, `queryConsoles.ts`, `diagnostics.ts`, `sqlPreviewFormat.ts`, `search.ts`, `focusZones.ts`, `connection.ts`, `package.json`, `ChangesPreview.svelte`, `context.ts`, `queryParameters.ts`, `executionSession.test.ts`, `numpadKeys.ts`, `focusZones.keys.test.ts`, `svelte`, `pinnedTables.ts`, `configuration.ts`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `analysisSession.ts`, `i18n/index.ts`, `gridNavigation.ts`, `gridWindow.test.ts`, `parameterTypes.ts`, `completionSource.ts`, `connectionIdentity.ts`, `executionMarker.ts`, `gridClipboard.ts`, `workspace/commands.ts`, `resultEditing.ts`, `filterBuilder.ts`, `commentStyle.ts`, `queryHistory.ts`, `sqlStatements.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `indentation.ts`, `contract.test.ts`, `engines/index.ts`, `formatter.ts`, `cellTypes.ts`, `invoke`, `ExportDialog.svelte`, `ResultPane.svelte`, `ref_node_fs`, `dialogMotion.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `ref_app`, `sqlFiles.ts`, `executionSession.ts`, `queryConsoles.ts`, `diagnostics.ts`, `focusZones.ts`, `connection.ts`, `package.json`, `queryParameters.ts`, `executionSession.test.ts`, `pinnedTables.ts`, `configuration.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `i18n/index.ts`, `gridClipboard.ts`, `Workspace.svelte`, `workspace/commands.ts`, `queryHistory.ts`, `findBar.ts`, `resultEdits.ts`, `resultTabs.ts`, `theme.ts`, `resultChanges.ts`, `queryExecution.ts`, `formatter.ts`, `iconOptics.ts`, `invoke`, `FileTree.svelte`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `support.rs`, `corpus.rs`, `Diagnostic`, `engine_context.rs`, `tests/lines.rs`, `drivers.rs`, `parser.rs`, `export.rs`, `pagination.rs`, `DestructiveClassification`, `diagnostics.rs`, `editing.rs`, `server-tests/src/lib.rs`, `result_editing.rs`, `query.rs`, `super`, `state.rs`, `inspect_routine_chunk`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _771 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._