# Graph Report - khipu  (2026-10-07)

## Corpus Check
- 500 files · ~547,452 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: (none) 10, .css 9, .sig 8)

## Summary
- 4810 nodes · 11346 edges · 200 communities (171 shown, 29 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 438 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `456bcfe8`
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
- sqlStatements.ts
- completion_calls
- tauri.conf.json
- mysql/src/lib.rs
- DefinitionLinkPlugin
- installFocusZones
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
- notifications.ts
- pagination.rs
- i18n/index.ts
- diagnostics.rs
- editing.rs
- updates.rs
- MySqlConnector
- server-tests/src/lib.rs
- analysisSession.ts
- Añadir un motor de base de datos
- parameterTypes.ts
- vitest
- executionMarker.ts
- assembly.rs
- terminal.rs
- query.rs
- messages/index.ts
- selected
- Contribuir
- gridClipboard.ts
- workspace/mosaic.ts
- lock
- DataGrid.svelte
- resultEditing.ts
- lib/types.ts
- services/catalog.rs
- super
- queryHistory.ts
- desktop.py
- findBar.ts
- console_texts.rs
- version_lines.rs
- DbConnector
- theme.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- QueryCancel
- results.rs
- Conn
- resultTabs.ts
- codemirrorTheme.ts
- tests.mjs
- close
- ResultChangesController
- connectionTest.ts
- executionSession.test.ts
- serde
- mysql.ts
- line
- graph.mjs
- scripts
- main.js
- formatter.ts
- Quality CI Workflow
- ConsolePicker.svelte
- cellTypes.ts
- invoke
- text_encoding.rs
- Option
- SQL engine quality contract
- ExportDialog.svelte
- state.rs
- Contrato de calidad de los motores SQL
- sql_files.rs
- connection.rs
- createSearchPanel
- postgres/src/tls.rs
- Vec
- catalog_bench.rs
- ref_node_fs
- FileTree.svelte
- console.rs
- files.rs
- ChangesPreview.svelte
- replaceBar.ts
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
- stores/shortcuts.ts
- sqlPreviewFormat.ts
- new.mjs
- focusZones.ts
- Position
- search.ts
- analysis.rs
- Adding a database engine
- Message
- DestructiveClassification
- ConnectionForm.svelte
- context.ts
- tests/lines.rs
- palettes.test.ts
- workspace/commands.ts
- connection_error.rs
- src/catalog.rs
- parser.rs
- ColumnFilterPopover.svelte
- SchemaTree.svelte
- EditorConfiguration
- unused.mjs
- fetch.sh
- AppState
- TerminalSession.svelte
- gridSelectionSummary.ts
- Test databases
- ARCHITECTURE.es.md
- status.mjs
- search.dom.test.ts
- diagnostics.ts
- coverage.mjs
- Engine
- ConsoleFiles
- mysqlconnector
- postgresconnector
- RawStatement<'q>
- window.mjs
- lines.sh
- focusZones.keys.test.ts
- Workspace.svelte
- gridNavigation.ts
- gridWindow.test.ts
- error_position.rs
- gridFind.ts
- ChangesView
- EditorCommands
- Performance measurements
- Mediciones de rendimiento
- SqlEditor.svelte
- columnFilters.ts
- session.ts
- crates_engine_tests_corpus_mixed_errors
- crates_engine_tests_corpus_mixed_mariadb
- crates_engine_tests_corpus_mixed_mysql
- crates_engine_tests_corpus_mixed_postgres
- Open
- svelte

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 113 edges
2. `vitest` - 95 edges
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

## Communities (200 total, 29 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (49): Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), backslashes_in_strings(), begin_and_end_as_names_do_not_open_or_close_blocks(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive() (+41 more)

### Community 1 - "support.rs"
Cohesion: 0.05
Nodes (109): a_a_signed_index_and_its_packages_are_accepted(), a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says(), a_server_that_never_answers_is_a_timeout(), activate_installed(), ACTIVATION, an_http_error_says_its_status(), an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected(), an_unresolvable_host_says_there_is_no_network() (+101 more)

### Community 2 - "run.mjs"
Cohesion: 0.08
Nodes (24): APP, args, count(), flows, PORT, resetData(), run(), seedProfiles() (+16 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.14
Nodes (23): async_trait, QueryExecutionOptions, cancelled_before_start(), CONNECT_TIMEOUT, execute_on_connection(), ExecutionOutcome, MAX_ROWS_TO_DRAIN, postgres_error_to_result() (+15 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.07
Nodes (36): finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole() (+28 more)

### Community 5 - "executionSession.ts"
Cohesion: 0.10
Nodes (31): nextSort(), appendLog(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation() (+23 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.10
Nodes (29): CheckInfo, ColumnInfo, ConnectionConfig, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+21 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (35): isFilterOperator(), activateQueryConsole(), appendConsole(), consoleTitle(), createId(), createQueryConsole(), diskTexts, EMPTY_EXECUTION_STATE (+27 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.18
Nodes (16): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs) (+8 more)

### Community 9 - "sqlStatements.ts"
Cohesion: 0.04
Nodes (101): LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts(), currentSqlRange(), mounted(), state() (+93 more)

### Community 10 - "completion_calls"
Cohesion: 0.31
Nodes (9): call_arguments(), completion_calls(), completion_calls_run_on_the_real_servers(), completion_fixtures(), Option, SchemaObjects, String, Vec (+1 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "mysql/src/lib.rs"
Cohesion: 0.12
Nodes (29): cancelled_before_start(), CONNECT_TIMEOUT, ER_UNSUPPORTED_PS, execute_on_connection(), ExecutionOutcome, hex_encode(), is_unsupported_in_prepared_protocol(), MAX_ROWS_TO_DRAIN (+21 more)

### Community 14 - "installFocusZones"
Cohesion: 0.19
Nodes (21): clearMark(), flash(), focusZone(), holding(), installFocusZones(), cancelMarkTimer(), markCurrent(), modifierOf() (+13 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.09
Nodes (34): toConnectionFailure(), getDriver(), loadConnectionPassword(), activeEngine, activeProfile, catalogTables, completeConnection(), connect() (+26 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (20): description, license, name, type, version, config, codemirror, devicon (+12 more)

### Community 19 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+12 more)

### Community 20 - "engine_context.rs"
Cohesion: 0.10
Nodes (33): a_request_from_another_generation_or_epoch_is_no_longer_current(), civil_date(), ConnectionEngineContext, dotted(), effective_line(), identity(), line_support(), LineIdentity (+25 more)

### Community 21 - "Arquitectura"
Cohesion: 0.15
Nodes (13): if(), Arquitectura, Capas y dependencias, Cómo fluye el SQL, Dónde puede vivir el código de un motor, Fronteras que se comprueban solas, `khipu-lsp`, La idea (+5 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (18): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, C, ConnectionConfig (+10 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.14
Nodes (36): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+28 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.29
Nodes (12): delete(), entry(), existing_entry(), load(), nothing_stored(), Error, Option, Result (+4 more)

### Community 27 - "completionSource.ts"
Cohesion: 0.05
Nodes (86): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, option(), prefixStartForNames(), schemaOption() (+78 more)

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
Cohesion: 0.06
Nodes (42): activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit, RoutineIndex (+34 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.06
Nodes (25): Capability, Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, COMPATIBILITY_FLOOR_MARIADB, COMPATIBILITY_FLOOR_MYSQL, Flavor, Capabilities (+17 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.13
Nodes (19): PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy() (+11 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.06
Nodes (31): CachedCheck, checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease() (+23 more)

### Community 43 - "export.rs"
Cohesion: 0.14
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.15
Nodes (18): Checker<'a, '_>, closest_names(), output_columns(), Expr, Ident, Iterator, ObjectName, Query (+10 more)

### Community 46 - "tooltip.ts"
Cohesion: 0.19
Nodes (16): shortcutKeyParts(), ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved (+8 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.09
Nodes (18): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), forgetPinnedTables(), isPinned() (+10 more)

### Community 48 - "resources.mjs"
Cohesion: 0.06
Nodes (53): shown(), connectInspector(), liveHeap(), pageSocket(), sleep(), addSession(), alive(), APP (+45 more)

### Community 49 - "notifications.ts"
Cohesion: 0.21
Nodes (11): confirmTrash(), pickSqlFolder(), trashSqlFile(), dismissNotice(), notice, notifyError(), notifySuccess(), show() (+3 more)

### Community 50 - "pagination.rs"
Cohesion: 0.12
Nodes (31): GuardOptions, con_no_backslash_escapes_y_barras_no_se_reescribe(), count_sql(), guarded(), is_read_only_query(), literal_limit(), literal_u64(), lo_que_se_ejecuta_es_una_lectura_con_las_mismas_cadenas() (+23 more)

### Community 51 - "i18n/index.ts"
Cohesion: 0.16
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), numberFormat, systemLocale(), translator() (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (44): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+36 more)

### Community 54 - "editing.rs"
Cohesion: 0.11
Nodes (33): ast, analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto() (+25 more)

### Community 55 - "updates.rs"
Cohesion: 0.05
Nodes (83): a_broken_or_unexpected_highlight_is_refused(), a_missing_file_or_image_falls_back_to_the_classic_prompt(), a_valid_highlight_is_read(), data_url(), fetch(), FORMAT, Highlight, HIGHLIGHT_FILE (+75 more)

### Community 56 - "MySqlConnector"
Cohesion: 0.16
Nodes (16): MySqlConnector, open_pool(), Capabilities, ConnectionConfig, DriverError, MySqlConnectOptions, MySqlPool, Result (+8 more)

### Community 57 - "server-tests/src/lib.rs"
Cohesion: 0.10
Nodes (28): Capability, classification(), classification_with(), Declared, declared_servers(), declared_version(), dotted(), entries() (+20 more)

### Community 58 - "analysisSession.ts"
Cohesion: 0.07
Nodes (24): BackendMessage, AnalysisRunner, merge(), Region, subtract(), runner(), analysisCacheFor(), AnalysisContext (+16 more)

### Community 59 - "Añadir un motor de base de datos"
Cohesion: 0.11
Nodes (19): ConnectionErrorKind, 4. Driver and protocol, 12. Harness, corpus y servidores de prueba, 13. Cobertura, 14. Matriz, evidencia y CI, 15. Documentación, 1. Identidad: motor, dialecto, driver, 3. Parser (+11 more)

### Community 60 - "parameterTypes.ts"
Cohesion: 0.10
Nodes (33): BETWEEN_FIRST, BETWEEN_SECOND, COLUMN, columnNextTo(), LEFT, NAME, NOT_COLUMNS, OPERATOR (+25 more)

### Community 61 - "vitest"
Cohesion: 0.06
Nodes (33): at(), found(), Request, Selection, blockClosingAt(), commentEditing, editor(), views (+25 more)

### Community 62 - "executionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 63 - "assembly.rs"
Cohesion: 0.15
Nodes (24): Item, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+16 more)

### Community 64 - "terminal.rs"
Cohesion: 0.11
Nodes (27): alive(), create_terminal(), el_shell_no_hereda_las_rutas_de_la_appimage(), en_windows_powershell_7_antes_que_windows_powershell_y_si_no_comspec(), gone(), MAX_UNACKED, NEXT_ID, Outside (+19 more)

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
Nodes (12): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Sitio web (+4 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.13
Nodes (22): COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+14 more)

### Community 70 - "workspace/mosaic.ts"
Cohesion: 0.07
Nodes (52): reorderResultTabs(), query(), setZoneNavigator(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup() (+44 more)

### Community 71 - "lock"
Cohesion: 0.12
Nodes (22): close_all(), close_window(), Flow, lock(), open(), Arc, Drop, FnOnce (+14 more)

### Community 72 - "DataGrid.svelte"
Cohesion: 0.13
Nodes (15): onMove(), onUp(), selectCell(), toggleInSelection(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT (+7 more)

### Community 73 - "resultEditing.ts"
Cohesion: 0.12
Nodes (25): addRow(), applyChanges(), buildChanges(), ColumnValue, deleteRows(), EditTarget, fetchEditInfo(), fillCells() (+17 more)

### Community 74 - "lib/types.ts"
Cohesion: 0.04
Nodes (75): ConnectionDriver, connectionDrivers, DriverDefinition, analyzedWords(), context(), highlightedKeywords(), highlightedStrings(), buildRoutineIndex() (+67 more)

### Community 75 - "services/catalog.rs"
Cohesion: 0.47
Nodes (5): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, tables_to_catalog(), catalog

### Community 76 - "super"
Cohesion: 0.10
Nodes (23): report_slow_start(), Duration, Option, String, SLOW_START, slow_start_hint(), solo_avisa_de_un_arranque_lento(), DoBlocks (+15 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.19
Nodes (15): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+7 more)

### Community 78 - "desktop.py"
Cohesion: 0.06
Nodes (53): argparse, datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, gzip, json, os (+45 more)

### Community 79 - "findBar.ts"
Cohesion: 0.22
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

### Community 83 - "theme.ts"
Cohesion: 0.13
Nodes (22): EditorPalette, palettes, resolveScheme(), ShellPalette, THEME_FAMILIES, ThemeFamily, themeVariant, ThemeVariants (+14 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.12
Nodes (17): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6) (+9 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (16): EMPTY_EDITS, PendingEdits, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EMPTY_STATE, patch(), resetResultEdits() (+8 more)

### Community 86 - "Dialect"
Cohesion: 0.09
Nodes (22): MYSQL, same_single_statement(), ACTIVE_LINES, ALL, cada_motor_tiene_su_identidad(), coincide_con_el_contrato_compartido_con_el_frontend(), Dialect, .ALL (+14 more)

### Community 87 - "QueryCancel"
Cohesion: 0.23
Nodes (5): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option

### Community 88 - "results.rs"
Cohesion: 0.14
Nodes (24): apply_result_changes(), export_query_to_file(), ExportRequest, ExportSummary, preview_result_changes(), production_write_allowed(), result_edit_info(), Message (+16 more)

### Community 89 - "Conn"
Cohesion: 0.12
Nodes (25): Conn, SchemaObjects, attacks_corpus(), FRAGMENTS_MYSQL, FRAGMENTS_PG, fresh(), fresh_scratch(), fuzzing_the_guard_against_the_real_servers_finds_no_second_statement() (+17 more)

### Community 90 - "resultTabs.ts"
Cohesion: 0.14
Nodes (25): addPinnedTab(), addResultTab(), consoleOfKey(), forgetPinnedResults(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+17 more)

### Community 91 - "codemirrorTheme.ts"
Cohesion: 0.18
Nodes (10): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+2 more)

### Community 92 - "tests.mjs"
Cohesion: 0.08
Nodes (24): args, byPath, cargo, cargoBinary(), check, DECISIONS, e2eEntry(), GATES (+16 more)

### Community 93 - "close"
Cohesion: 0.24
Nodes (19): bash(), cerrar_con_el_lector_detenido_no_deja_nada(), cien_aperturas_y_cierres_no_dejan_procesos_ni_registros(), close(), close_all_cierra_las_de_todas_las_ventanas(), CLOSE_GRACE, drain(), el_shell_del_usuario_abre_responde_y_al_cerrar_no_queda() (+11 more)

### Community 95 - "connectionTest.ts"
Cohesion: 0.15
Nodes (17): ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, describeTls(), summarizeError(), summarizeReport() (+9 more)

### Community 96 - "executionSession.test.ts"
Cohesion: 0.07
Nodes (23): cancelQuery(), classifyStatements(), countQueryRows(), executeQuery(), PageRequest, StatementCheck, STANDARD_LEXICAL, applySessionContext() (+15 more)

### Community 97 - "serde"
Cohesion: 0.13
Nodes (15): app_text_travels_as_key_and_params(), Message, raw_text_travels_as_a_plain_string(), BTreeMap, Formatter, From, Into, Option (+7 more)

### Community 98 - "mysql.ts"
Cohesion: 0.12
Nodes (33): byAnalyzerLocation(), byNearFragment(), byServerPosition(), charToUtf16(), firstLocated(), lineColumnToOffset(), lineStart(), tokenAt() (+25 more)

### Community 99 - "line"
Cohesion: 0.13
Nodes (16): reservedWords(), 10. Generated SQL, 6. Version lines, 10. SQL generado, 6. Líneas de versión, 11. Version support packs, 5.1 The rule, 5.3 Lines today (+8 more)

### Community 100 - "graph.mjs"
Cohesion: 0.10
Nodes (16): blocks, CLASSES, crates, dataNames, debt, dependencies(), DOCS, edges (+8 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "formatter.ts"
Cohesion: 0.07
Nodes (52): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+44 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "ConsolePicker.svelte"
Cohesion: 0.10
Nodes (14): active, byId, filtered, move(), onKeydown(), pick(), query, active (+6 more)

### Community 106 - "cellTypes.ts"
Cohesion: 0.18
Nodes (16): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, modifiers() (+8 more)

### Community 107 - "invoke"
Cohesion: 0.12
Nodes (23): backendText(), invoke(), isKeyed(), OWNERS, rustFiles, sources, translatedRejection(), forgetConnectionPassword() (+15 more)

### Community 108 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 109 - "Option"
Cohesion: 0.23
Nodes (12): analyze_statement_with(), closest_keyword(), expected_found(), join_constraint(), max_distance(), removed_syntax(), Line, Option (+4 more)

### Community 110 - "SQL engine quality contract"
Cohesion: 0.07
Nodes (28): 10.1 Layout, 10.2 Rules, 10.3 Simulations, 10. Tests, fixtures and simulations, 12.1 New engine, 12.2 New line of an existing engine, 12.3 New exact release within a line, 12. Adding an engine, a line or a release (+20 more)

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.10
Nodes (12): format(), highlightSql(), KEYWORDS, detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType() (+4 more)

### Community 112 - "state.rs"
Cohesion: 0.11
Nodes (27): a_new_mode_is_a_new_generation_and_a_new_connection_is_a_reset(), ActiveConnection, build_catalog(), ConsoleChange, context(), DatabaseExplorer, follow_console(), may_change_session_mode() (+19 more)

### Community 113 - "Contrato de calidad de los motores SQL"
Cohesion: 0.07
Nodes (28): 10.1 Estructura, 10.2 Reglas, 10.3 Simulaciones, 10. Tests, fixtures y simulaciones, 12.1 Motor nuevo, 12.2 Línea nueva de un motor existente, 12.3 Versión exacta nueva dentro de una línea, 12. Agregar un motor, una línea o una versión (+20 more)

### Community 114 - "sql_files.rs"
Cohesion: 0.25
Nodes (22): absolute_dir(), create(), encoding_label(), io_failure(), is_sql_file_name(), list_dir(), read(), rename() (+14 more)

### Community 115 - "connection.rs"
Cohesion: 0.13
Nodes (23): a_connection_failure_keeps_its_shape(), connect(), ConnectFailure, delete_connection_password(), load_connection_password(), ConnectionConfig, ConnectionErrorKind, DriverError (+15 more)

### Community 116 - "createSearchPanel"
Cohesion: 0.21
Nodes (11): closeAndFocusEditor(), createSearchPanel(), renderMode(), mount(), dropSelectionPrefill(), editorSearch(), openInMode(), openReplacePanel() (+3 more)

### Community 117 - "postgres/src/tls.rs"
Cohesion: 0.12
Nodes (17): apply(), connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError (+9 more)

### Community 118 - "Vec"
Cohesion: 0.23
Nodes (13): catalog_cases(), CatalogView, check(), Checker, el_catalogo_en_cada_motor(), Expect, la_sintaxis_en_cada_motor(), mysql_select_into_errors() (+5 more)

### Community 119 - "catalog_bench.rs"
Cohesion: 0.18
Nodes (15): analyze_statement, classify_sql, corpus(), drop_large(), large_schema_sql(), LARGE_TABLES, main(), ms() (+7 more)

### Community 120 - "ref_node_fs"
Cohesion: 0.07
Nodes (31): ENGINE_SOURCES, Novedad de la versión, Publicar una versión, ref_lib, ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os (+23 more)

### Community 121 - "FileTree.svelte"
Cohesion: 0.09
Nodes (20): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), close(), $t() (+12 more)

### Community 122 - "console.rs"
Cohesion: 0.12
Nodes (18): atomic, a_connection_that_does_not_open_leaves_the_slot_empty(), ConsoleConnection, ConsoleConnection<C>, ConsoleGuard, ConsoleGuard<'_, C>, opening_the_first_connection_loses_no_session_and_closing_one_does(), AtomicU64 (+10 more)

### Community 123 - "files.rs"
Cohesion: 0.27
Nodes (18): create_sql_file(), list_sql_dir(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file(), AppHandle, Message (+10 more)

### Community 124 - "ChangesPreview.svelte"
Cohesion: 0.16
Nodes (14): onKeydown(), onKeydownCapture(), blocksHeldEnter(), confirmsOnEnter(), moveDialogActionFocus(), Box, installDialogMotion(), isBackdropClick() (+6 more)

### Community 125 - "replaceBar.ts"
Cohesion: 0.19
Nodes (11): MatchStatus, MAX_COUNTED, preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), ReplaceBar (+3 more)

### Community 126 - "Diagnostic"
Cohesion: 0.21
Nodes (31): at_token(), Diagnostic, DiagnosticMessage, ends_expression(), friendly_syntax(), handler_action(), inspect_routine_chunk(), is_plain_name() (+23 more)

### Community 127 - "publish.mjs"
Cohesion: 0.14
Nodes (21): ref_node_crypto, base, env, mysql, out, r2, ten, valid (+13 more)

### Community 128 - "result_editing.rs"
Cohesion: 0.28
Nodes (19): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Message (+11 more)

### Community 129 - "RawStatement<'q>"
Cohesion: 0.14
Nodes (10): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, vector_text(), DEFINITION (+2 more)

### Community 130 - "+layout.svelte"
Cohesion: 0.08
Nodes (30): initLocaleEffects(), onePerFrame(), frames, clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH (+22 more)

### Community 131 - "Extensiones opcionales y futura tienda — límites antes del runtime"
Cohesion: 0.17
Nodes (12): 1. Tres cosas que no se mezclan, 2. Superficies de extensión, 3. Paquete y confianza, 4. Ciclo de vida y fallos, 5. Presupuesto de ligereza, 6. Orden de trabajo y compuertas, Código ejecutable: propuesta sujeta a prototipo, Dos ejemplos que prueban límites distintos (+4 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.25
Nodes (6): apply(), DMABUF_VAR, SET_BY_ROWLY, should_disable_dmabuf(), AtomicBool, should_disable_dmabuf

### Community 133 - "PostgresConnector"
Cohesion: 0.16
Nodes (14): open_pool(), PostgresConnector, Capabilities, ConnectionConfig, DriverError, PgPool, Result, SchemaObjects (+6 more)

### Community 134 - "explorerTree.ts"
Cohesion: 0.11
Nodes (22): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+14 more)

### Community 136 - "corpus.rs"
Cohesion: 0.24
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 137 - "stores/shortcuts.ts"
Cohesion: 0.13
Nodes (17): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), inTerminal(), TERMINAL_COMMANDS, formatShortcutEvent(), KEY_SYMBOLS (+9 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "new.mjs"
Cohesion: 0.15
Nodes (13): args, base, contract, contractPath, corpus, dialects, fail(), file (+5 more)

### Community 140 - "focusZones.ts"
Cohesion: 0.14
Nodes (12): Direction, DIRECTION_COMMANDS, flashTimers, lastFocused, navigators, neighborZone(), SAME_COLUMN, setSidebarRevealer() (+4 more)

### Community 141 - "Position"
Cohesion: 0.20
Nodes (12): byte_offset(), distance(), offset_at(), Position, position_at(), Repaired<'a>, From, subquery_errors() (+4 more)

### Community 142 - "search.ts"
Cohesion: 0.14
Nodes (17): __test, exclusionMarks, newlineMarkers, addExclusion, clearExclusions, exclusionField, inScope(), isExcluded() (+9 more)

### Community 143 - "analysis.rs"
Cohesion: 0.17
Nodes (22): call_and_show_create_return_their_rows(), char_offset(), everyday_queries(), is_syntax_error(), mixed_statements(), real_sql(), rows_of(), Option (+14 more)

### Community 144 - "Adding a database engine"
Cohesion: 0.10
Nodes (23): ConnectionConfig, TlsStatus, Límites conocidos, 12. Harness, corpus and test servers, 13. Coverage, 14. Matrix, evidence and CI, 15. Documentation, 1. Identity: engine, dialect, driver (+15 more)

### Community 145 - "Message"
Cohesion: 0.38
Nodes (12): ack(), ack_terminal(), close_terminal(), not_found(), resize(), resize_terminal(), Message, Result (+4 more)

### Community 146 - "DestructiveClassification"
Cohesion: 0.15
Nodes (39): AlterTableOperation, after_handler_conditions(), classify(), classify_alter_table(), classify_by_structure(), classify_destructive_sql(), classify_drop(), classify_production() (+31 more)

### Community 147 - "ConnectionForm.svelte"
Cohesion: 0.08
Nodes (14): neutral, indexOf(), openInNewWindow(), select(), Icon, icons, colorLabel(), CONNECTION_COLORS (+6 more)

### Community 148 - "context.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 149 - "tests/lines.rs"
Cohesion: 0.13
Nodes (19): a_version_selects_the_closest_line_below_it(), every_registered_engine_declares_its_own_lines_and_the_test_servers_use_them(), every_reserved_word_of_a_line_is_one_its_fixtures_prove(), every_test_server_and_every_verified_version_selects_the_line_it_proves(), fixture(), no_known_consumer_declares_versioned_behavior_by_itself_again(), registry(), removed_in() (+11 more)

### Community 150 - "palettes.test.ts"
Cohesion: 0.15
Nodes (12): contrast(), DARK_BEFORE, FAMILIES, LIGHT_COMMENT_MIN, LIGHT_FAMILIES, LIGHT_SYNTAX_MIN, luminance(), PORTED_DARK_FAMILIES (+4 more)

### Community 151 - "workspace/commands.ts"
Cohesion: 0.21
Nodes (16): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, handlerKey(), handlers, registerCommand() (+8 more)

### Community 152 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

### Community 153 - "src/catalog.rs"
Cohesion: 0.27
Nodes (8): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, Option, String, Vec, serialize

### Community 154 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 156 - "SchemaTree.svelte"
Cohesion: 0.11
Nodes (16): writeClipboard(), destroy(), child(), writeClipboardText(), tabScroll(), onWheel(), reveal(), update() (+8 more)

### Community 158 - "unused.mjs"
Cohesion: 0.11
Nodes (16): commands, configText, dependencies, escape(), exportsWithoutConsumer, frontFiles, handler, lib (+8 more)

### Community 159 - "fetch.sh"
Cohesion: 0.33
Nodes (6): dataset(), matches(), fetch.sh script, pg(), selected(), up.sh script

### Community 160 - "AppState"
Cohesion: 0.17
Nodes (21): database_explorer(), list_tables(), BTreeMap, CatalogTable, DatabaseExplorer, Message, Option, Result (+13 more)

### Community 161 - "TerminalSession.svelte"
Cohesion: 0.16
Nodes (7): closeTerminal(), createTerminal(), TerminalCallbacks, TerminalInfo, writeTerminal(), @xterm/addon-fit, @xterm/xterm

### Community 162 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (15): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+7 more)

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
Cohesion: 0.18
Nodes (10): click(), findArea(), findRow(), flush(), replaceAll(), replaceArea(), replaceRow(), select() (+2 more)

### Community 167 - "diagnostics.ts"
Cohesion: 0.05
Nodes (52): AnalysisRunnerOptions, create(), typed(), ranges(), createDiagnosticPopup(), applyFix(), cancelHoverClose(), close() (+44 more)

### Community 168 - "coverage.mjs"
Cohesion: 0.14
Nodes (12): cited, contract, coverage, ENGINES, lines, matrix, problems, rows (+4 more)

### Community 169 - "Engine"
Cohesion: 0.15
Nodes (8): Engine, .ALL, NoBackslashEscapes, ConnectionConfig, DriverError, Drop, TlsMode, try_admin()

### Community 173 - "RawStatement<'q>"
Cohesion: 0.20
Nodes (7): RawStatement<'q>, Arguments, BoxDynError, Execute, Option, Statement, Postgres

### Community 174 - "window.mjs"
Cohesion: 0.16
Nodes (14): args, compare(), inWindow(), lineOf(), lines, numbers(), prefix(), problems (+6 more)

### Community 175 - "lines.sh"
Cohesion: 0.73
Nodes (5): down(), name(), probes(), lines.sh script, up()

### Community 176 - "focusZones.keys.test.ts"
Cohesion: 0.33
Nodes (7): FakeKey, g, hold(), KeyInit, letGo(), press(), release()

### Community 178 - "Workspace.svelte"
Cohesion: 0.05
Nodes (19): shortcutText(), $t(), index(), #each(), keepTabPosition(), labelForKey(), onMove(), onUp() (+11 more)

### Community 180 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 181 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 182 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 184 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 185 - "ChangesView"
Cohesion: 0.24
Nodes (5): invalidCells(), ChangesView, blockedByInvalidValues(), currentChanges(), openPreview()

### Community 187 - "Performance measurements"
Cohesion: 0.33
Nodes (6): Budget, Keystroke-to-paint and grid frames, Performance measurements, References, Resource cycles, Running

### Community 188 - "Mediciones de rendimiento"
Cohesion: 0.33
Nodes (6): Ciclos de recursos, Cómo se ejecuta, Mediciones de rendimiento, Presupuesto, Referencias, Tecla a pintado y cuadros del grid

### Community 189 - "SqlEditor.svelte"
Cohesion: 0.15
Nodes (8): createEditorCommands(), EditorCommandsOptions, stopTypingIn(), MessageParams, MessageKey, blur(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 190 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 191 - "session.ts"
Cohesion: 0.36
Nodes (6): ReplaceOptions, createSession(), SearchSession, filteredQuery(), QuerySpec, specOf()

### Community 206 - "svelte"
Cohesion: 0.23
Nodes (10): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles(), load(), parse(), queryParameterValues, RememberedParameter (+2 more)

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **804 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+799 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `sqlFiles.ts`, `executionSession.ts`, `explorerTree.ts`, `sqlStatements.ts`, `sqlPreviewFormat.ts`, `focusZones.ts`, `search.ts`, `connection.ts`, `package.json`, `ConnectionForm.svelte`, `palettes.test.ts`, `workspace/commands.ts`, `completionSource.ts`, `SchemaTree.svelte`, `configuration.ts`, `TerminalSession.svelte`, `gridSelectionSummary.ts`, `search.dom.test.ts`, `diagnostics.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `ResultPager.svelte`, `focusZones.keys.test.ts`, `i18n/index.ts`, `gridNavigation.ts`, `gridWindow.test.ts`, `gridFind.ts`, `analysisSession.ts`, `parameterTypes.ts`, `executionMarker.ts`, `columnFilters.ts`, `gridClipboard.ts`, `workspace/mosaic.ts`, `DataGrid.svelte`, `resultEditing.ts`, `lib/types.ts`, `queryHistory.ts`, `svelte`, `theme.ts`, `resultEdits.ts`, `resultTabs.ts`, `connectionTest.ts`, `executionSession.test.ts`, `mysql.ts`, `formatter.ts`, `cellTypes.ts`, `invoke`, `ExportDialog.svelte`, `ref_node_fs`, `ChangesPreview.svelte`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `+layout.svelte`, `sqlFiles.ts`, `executionSession.ts`, `queryConsoles.ts`, `stores/shortcuts.ts`, `focusZones.ts`, `connection.ts`, `package.json`, `completionSource.ts`, `diagnostics.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `ResultPager.svelte`, `notifications.ts`, `i18n/index.ts`, `vitest`, `gridClipboard.ts`, `workspace/mosaic.ts`, `DataGrid.svelte`, `resultEditing.ts`, `queryHistory.ts`, `findBar.ts`, `theme.ts`, `resultEdits.ts`, `resultTabs.ts`, `executionSession.test.ts`, `formatter.ts`, `ConsolePicker.svelte`, `invoke`, `FileTree.svelte`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `result_editing.rs`, `support.rs`, `execution_guard.rs`, `corpus.rs`, `DestructiveClassification`, `engine_context.rs`, `tests/lines.rs`, `drivers.rs`, `parser.rs`, `export.rs`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `server-tests/src/lib.rs`, `query.rs`, `super`, `Option`, `state.rs`, `Vec`, `Diagnostic`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _804 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._