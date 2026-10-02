# Graph Report - khipu  (2026-10-02)

## Corpus Check
- 334 files · ~422,543 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 9, .css 7, .icns 1)

## Summary
- 3423 nodes · 7766 edges · 164 communities (148 shown, 16 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 284 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d67a0a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- assembly.rs
- postgres/src/lib.rs
- sqlFiles.ts
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- DbConnector
- real_server.rs
- tauri.conf.json
- createReplaceBar
- sqlDefinitionLink.ts
- text_encoding.rs
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- sqlStatements.ts
- Contribuir
- compilerOptions
- drivers.rs
- mysql/src/introspect.rs
- devDependencies
- credentials.rs
- svelte
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
- connection_error.rs
- stores/shortcuts.ts
- sqlWriting.test.ts
- serde
- sqlExecutionMarker.ts
- sqlFormatLayout.ts
- cellTypes.ts
- explorerTree.ts
- editorSearchPanel.dom.test.ts
- messages/index.ts
- connectionTest.ts
- ConnectionDriver
- gridClipboard.ts
- reorder.ts
- columnFilters.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- filterBuilder.ts
- i18n/index.ts
- sql_files.rs
- queryHistory.ts
- render-site.py
- findBar.ts
- src-tauri/src/lib.rs
- TransactionError
- v0.2.0 — Pulido de la experiencia
- codemirrorTheme.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- resultEdits.ts
- Dialect
- svelte
- notifications.ts
- AnalysisRunner
- pinnedResults.ts
- theme.ts
- console_texts.rs
- TlsMode
- gridSelectionSummary.ts
- Diagnósticos en el editor — diseño (tarea 4)
- invoke
- Theme bootstrap IIFE (pre-paint CSS var injection)
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- sqlFormatter.ts
- Quality CI Workflow
- iconOptics.ts
- gridFind.ts
- vitest
- FileTree.svelte
- palettes.test.ts
- textEncoding.ts
- ExportDialog.svelte
- ActiveConnection
- commands.ts
- connectionIdentity.ts
- ConnectFailure
- error_position.rs
- queryExecution.ts
- SqlEditor.svelte
- Workspace.svelte
- sqlIndentation.ts
- editorSearchPanel.ts
- installFocusZones
- gridWindow.test.ts
- dialogMotion.ts
- StatementMark
- Diagnostic
- DataGrid.svelte
- +layout.svelte
- webkit_env.rs
- gridNavigation.ts
- lib/types.ts
- decorations.ts
- corpus.rs
- sqlPreviewFormat.ts
- parser.rs
- super
- Position
- state.ts
- focusZones.keys.test.ts
- contract.test.ts
- 5. Hecho
- gridSettings.ts
- openSqlFileConsole
- pinnedTables.ts
- queryConsoles.test.ts
- 6. Manejar la app
- up.sh script
- FindBarActions
- Anexo A. Reglas de escritura, memoria y app (borrador)
- Test databases
- Bases de datos de prueba
- 5. Guardarraíles de datos
- Message
- 2. La memoria (`crates/memory`)
- 8. Interfaz
- 1. Arquitectura
- .remember
- mysqlconnector
- postgresconnector
- currentQueryConsole
- .fmt

## God Nodes (most connected - your core abstractions)
1. `Dialect` - 84 edges
2. `vitest` - 73 edges
3. `Message` - 71 edges
4. `svelte` - 40 edges
5. `analyze_statement()` - 38 edges
6. `Diagnostic` - 32 edges
7. `@codemirror/state` - 30 edges
8. `buildCompletionSource()` - 28 edges
9. `Engine` - 26 edges
10. `AppState` - 24 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `7. Pulido del análisis (2026-09-29)` --references--> `created()`  [INFERRED]
  docs/specs/v0.2-diagnosticos.md → app/src/lib/sqlCreatedTables.test.ts
- `10. Errores mientras se escribe (2026-09-27)` --references--> `diagnosticsIn()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlDiagnostics.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (164 total, 16 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.05
Nodes (88): AlterTableOperation, Cow, a_versioned_comment_is_read_both_ways_and_the_stricter_wins(), accepted(), add_column_insert_create_select_are_not_destructive(), after_handler_conditions(), begin_and_end_as_names_do_not_open_or_close_blocks(), classify() (+80 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (68): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+60 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (63): async_trait, a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env() (+55 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.13
Nodes (24): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile() (+16 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.06
Nodes (68): argumentsSnippet(), buildCatalogCompletions(), catalogPosition, COMMON_FUNCTIONS, Entry, MYSQL_FUNCTIONS, option(), POSTGRES_FUNCTIONS (+60 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode, RelationKind (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (35): isFilterOperator(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle(), createQueryConsole() (+27 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.17
Nodes (17): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core) (+9 more)

### Community 9 - "DbConnector"
Cohesion: 0.18
Nodes (13): DbConnector, DriverError, QueryColumn, QueryExecutionResult, RowSink, ConnectionErrorKind, Formatter, Future (+5 more)

### Community 10 - "real_server.rs"
Cohesion: 0.06
Nodes (69): admin(), classification(), classification_with(), Conn, Engine, .ALL, entries(), error_text() (+61 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "createReplaceBar"
Cohesion: 0.33
Nodes (10): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), createReplaceBar(), excludeCurrent(), syncQuery(), currentMatch() (+2 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.07
Nodes (39): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectionState (+31 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (19): description, license, name, type, version, config, devicon, happy-dom (+11 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "sqlStatements.ts"
Cohesion: 0.05
Nodes (76): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts() (+68 more)

### Community 21 - "Contribuir"
Cohesion: 0.14
Nodes (13): Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión, Sitio web (+5 more)

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

### Community 27 - "svelte"
Cohesion: 0.09
Nodes (14): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), CONNECTION_COLORS (+6 more)

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
Cohesion: 0.18
Nodes (10): 1. Qué pasa hoy, 2. La regla, 3. Piezas, 4. Orden, A. Grid virtualizado por tramos (la base), B. Sidebar y splitter, C. Efectos caros fuera, E. WebKitGTK en Linux (+2 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.08
Nodes (17): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+9 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.13
Nodes (17): PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy() (+9 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.11
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "String"
Cohesion: 0.14
Nodes (20): Checker<'a, '_>, join_constraint(), output_columns(), Expr, Ident, ObjectName, Option, Query (+12 more)

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
Cohesion: 0.08
Nodes (38): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+30 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.17
Nodes (14): Direction, DIRECTIONS, flash(), focusZone(), isUsable(), lastFocused, moveFocus(), neighborZone() (+6 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.07
Nodes (42): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_misspelled_verb_or_a_wrong_end_inside_a_routine_is_reported_where_it_is(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE (+34 more)

### Community 54 - "editing.rs"
Cohesion: 0.09
Nodes (49): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+41 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 57 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (12): handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys() (+4 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.10
Nodes (28): ENGINES, complete(), schemas, slice(), buildFkIndex(), buildSqlSchema(), currentStatement(), dialectFor() (+20 more)

### Community 59 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 61 - "sqlFormatLayout.ts"
Cohesion: 0.32
Nodes (18): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+10 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "explorerTree.ts"
Cohesion: 0.18
Nodes (15): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+7 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.14
Nodes (13): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+5 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.20
Nodes (6): ENGINE_SOURCES, defineMessages(), OtherLocale, Namespaces, ref_node_fs, ref_node_path

### Community 67 - "connectionTest.ts"
Cohesion: 0.13
Nodes (20): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+12 more)

### Community 68 - "ConnectionDriver"
Cohesion: 0.18
Nodes (11): ConnectionDriver, Agregar un motor de base de datos, 2. Inventario: lo que depende del motor, 3. El perfil (frontend), 4. El perfil (Rust), 5. Contrato de pruebas, 6. Agregar un motor (guía), 7. Orden (+3 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.12
Nodes (24): writeClipboard(), COPY_FORMATS, CopyColumn, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue() (+16 more)

### Community 70 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 71 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.14
Nodes (18): DEFAULT_INDENT_SIZE, IndentSize, IndentStyle, DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH (+10 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.17
Nodes (11): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, Agente abierto desde fuera, Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora) (+3 more)

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
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "render-site.py"
Cohesion: 0.15
Nodes (12): datetime, app_version(), main(), Copia site/ a una carpeta de salida y rellena {{version}}, {{site}}, {{base}} y…, json, os, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, pathlib (+4 more)

### Community 79 - "findBar.ts"
Cohesion: 0.29
Nodes (14): MAX_COUNTED, autosize(), element(), icon(), ICONS, insertNewline(), label(), textField() (+6 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.09
Nodes (45): a_script_is_checked_statement_by_statement(), apply_result_changes(), AppState, cancel_query(), catalog_refresh_reloads_visible_schemas(), check_statement(), classify_statements(), connect() (+37 more)

### Community 81 - "TransactionError"
Cohesion: 0.25
Nodes (5): ConnectionConfig, Self, TlsMode, TransactionError, Debug

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.08
Nodes (26): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+18 more)

### Community 83 - "codemirrorTheme.ts"
Cohesion: 0.12
Nodes (17): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+9 more)

### Community 84 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.23
Nodes (13): PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE, patch() (+5 more)

### Community 86 - "Dialect"
Cohesion: 0.07
Nodes (31): analyze_mixed_case(), catalog_cases(), CatalogView, check(), Checker, el_catalogo_en_cada_motor(), Expect, la_sintaxis_en_cada_motor() (+23 more)

### Community 87 - "svelte"
Cohesion: 0.19
Nodes (9): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), invoke, release, listed (+1 more)

### Community 88 - "notifications.ts"
Cohesion: 0.20
Nodes (13): dismissNotice(), notice, notifyError(), notifySuccess(), show(), flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole (+5 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.18
Nodes (4): AnalysisRunner, merge(), subtract(), runner()

### Community 90 - "pinnedResults.ts"
Cohesion: 0.26
Nodes (10): tabExists(), addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+2 more)

### Community 91 - "theme.ts"
Cohesion: 0.16
Nodes (17): resolveScheme(), ThemeFamily, themeVariant, DEFAULT_THEME_CHOICE, editorPalette, effectiveScheme, initThemeEffects(), isSchemePreference() (+9 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "TlsMode"
Cohesion: 0.17
Nodes (12): ConnectionConfig, TlsMode, TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas (+4 more)

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (15): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+7 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.08
Nodes (23): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+15 more)

### Community 96 - "invoke"
Cohesion: 0.18
Nodes (13): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+5 more)

### Community 97 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.11
Nodes (17): t(), 0. Hoy, 10. Errores mientras se escribe (2026-09-27), 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea) (+9 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.07
Nodes (31): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+23 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "sqlFormatter.ts"
Cohesion: 0.17
Nodes (17): format(), applyIndentation(), CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), FormatFailure, FormatResult, formatSqlBlock() (+9 more)

### Community 104 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 105 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 106 - "gridFind.ts"
Cohesion: 0.22
Nodes (11): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+3 more)

### Community 107 - "vitest"
Cohesion: 0.05
Nodes (53): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), byQuotedName() (+45 more)

### Community 108 - "FileTree.svelte"
Cohesion: 0.08
Nodes (20): active, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), ContextMenuItem, state() (+12 more)

### Community 109 - "palettes.test.ts"
Cohesion: 0.15
Nodes (12): contrast(), DARK_BEFORE, FAMILIES, LIGHT_COMMENT_MIN, LIGHT_FAMILIES, LIGHT_SYNTAX_MIN, luminance(), PORTED_DARK_FAMILIES (+4 more)

### Community 110 - "textEncoding.ts"
Cohesion: 0.33
Nodes (4): QueryConsole, DEFAULT_TEXT_ENCODING, TEXT_ENCODINGS, TextEncoding

### Community 111 - "ExportDialog.svelte"
Cohesion: 0.13
Nodes (12): close(), format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument() (+4 more)

### Community 112 - "ActiveConnection"
Cohesion: 0.20
Nodes (15): ActiveConnection, build_catalog(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap, SchemaObjects (+7 more)

### Community 113 - "commands.ts"
Cohesion: 0.21
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+7 more)

### Community 114 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 115 - "ConnectFailure"
Cohesion: 0.29
Nodes (7): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, test_connection(), TestConnectionReport

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "queryExecution.ts"
Cohesion: 0.14
Nodes (12): nextSort(), cancelQuery(), executeQuery(), PageRequest, StatementCheck, PendingQueryConfirmation, QueryExecutionState, DestructiveStatement (+4 more)

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.14
Nodes (6): createdTables(), lastPart(), created(), mousemove(), app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 119 - "Workspace.svelte"
Cohesion: 0.06
Nodes (14): allState, style, active, danger, submit, labelForKey(), $t(), executionLog (+6 more)

### Community 120 - "sqlIndentation.ts"
Cohesion: 0.27
Nodes (12): backspaceIndent(), buildTabCompletionKeymap(), indentationExtension(), tabCompletionBinding(), tabIndent(), editor(), views, indentationUnit() (+4 more)

### Community 121 - "editorSearchPanel.ts"
Cohesion: 0.23
Nodes (14): createMatchCounter(), count(), scopeForReplace(), scopeFromSelection(), searchMode, closeAndFocusEditor(), createSearchPanel(), dropSelectionPrefill() (+6 more)

### Community 122 - "installFocusZones"
Cohesion: 0.26
Nodes (13): clearMark(), installFocusZones(), isPrefix(), onEscape(), onFocusIn(), onKeydown(), onKeyup(), onPointerDown() (+5 more)

### Community 123 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 126 - "Diagnostic"
Cohesion: 0.19
Nodes (34): at_token(), byte_offset(), Diagnostic, DiagnosticMessage, ends_expression(), expected_found(), friendly_syntax(), handler_action() (+26 more)

### Community 128 - "DataGrid.svelte"
Cohesion: 0.17
Nodes (9): onMove(), onUp(), selectCell(), toggleInSelection(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT (+1 more)

### Community 130 - "+layout.svelte"
Cohesion: 0.08
Nodes (26): initLocaleEffects(), onePerFrame(), frames, clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH (+18 more)

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "lib/types.ts"
Cohesion: 0.04
Nodes (54): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+46 more)

### Community 135 - "decorations.ts"
Cohesion: 0.22
Nodes (4): exclusionMarks, NewlineMarker, newlineMarkers, exclusionField

### Community 136 - "corpus.rs"
Cohesion: 0.20
Nodes (16): catalog(), check(), comentario_mysql_de_version_no_da_diagnosticos(), consolas_mezcladas_no_dan_falsos_positivos(), created(), errores_ordinarios_siguen_detectandose(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos() (+8 more)

### Community 138 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 139 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 140 - "super"
Cohesion: 0.11
Nodes (17): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), Capabilities, MIN_MAJOR, CatalogColumn (+9 more)

### Community 141 - "Position"
Cohesion: 0.14
Nodes (17): closest_keyword(), closest_names(), distance(), max_distance(), offset_at(), Position, Repaired<'a>, From (+9 more)

### Community 142 - "state.ts"
Cohesion: 0.13
Nodes (17): ReplaceOptions, createSession(), SearchSession, addExclusion, clearExclusions, filteredQuery(), inScope(), isExcluded() (+9 more)

### Community 145 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 146 - "contract.test.ts"
Cohesion: 0.22
Nodes (11): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, codeChar(), IDENTIFIER_CLOSE (+3 more)

### Community 151 - "5. Hecho"
Cohesion: 0.40
Nodes (5): 21a — Grid virtualizado por tramos (2026-09-28), 21b — Sidebar, splitter y blur (2026-09-28), 21c — WebKitGTK (2026-09-28), 21d — Columnas virtualizadas (2026-09-28), 5. Hecho

### Community 152 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 154 - "openSqlFileConsole"
Cohesion: 0.67
Nodes (4): activateQueryConsole(), createId(), openSqlFileConsole(), openTableConsole()

### Community 155 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 156 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

### Community 157 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 159 - "up.sh script"
Cohesion: 0.50
Nodes (3): fetch.sh script, pg(), up.sh script

### Community 162 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 163 - "Test databases"
Cohesion: 0.50
Nodes (3): Server tests, Test databases, Use

### Community 164 - "Bases de datos de prueba"
Cohesion: 0.50
Nodes (3): Bases de datos de prueba, Pruebas contra servidor, Uso

### Community 165 - "5. Guardarraíles de datos"
Cohesion: 0.33
Nodes (6): query(), 5. Guardarraíles de datos, 9. Subtareas, Escritura, Lectura, Siempre

### Community 166 - "Message"
Cohesion: 0.19
Nodes (24): analyze_sql(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file() (+16 more)

### Community 167 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 168 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 169 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 170 - ".remember"
Cohesion: 0.50
Nodes (3): 2b. Cómo aprende quién es, Fuente en el repo, Reglas propias del usuario

### Community 173 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **631 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+626 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1141 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `DataGrid.svelte`, `+layout.svelte`, `gridNavigation.ts`, `lib/types.ts`, `sqlSchema.ts`, `sqlPreviewFormat.ts`, `focusZones.keys.test.ts`, `package.json`, `contract.test.ts`, `sqlStatements.ts`, `connection.ts`, `gridSettings.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sqlExecutionMarker.ts`, `cellTypes.ts`, `explorerTree.ts`, `editorSearchPanel.dom.test.ts`, `messages/index.ts`, `connectionTest.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `codemirrorTheme.ts`, `resultEdits.ts`, `svelte`, `pinnedResults.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `sqlContext.ts`, `sqlFormatter.ts`, `gridFind.ts`, `palettes.test.ts`, `ExportDialog.svelte`, `commands.ts`, `connectionIdentity.ts`, `queryExecution.ts`, `SqlEditor.svelte`, `sqlIndentation.ts`, `editorSearchPanel.ts`, `gridWindow.test.ts`, `dialogMotion.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Dialect` connect `Dialect` to `execution_guard.rs`, `corpus.rs`, `real_server.rs`, `export.rs`, `parser.rs`, `src-tauri/src/lib.rs`, `ActiveConnection`, `pagination.rs`, `diagnostics.rs`, `editing.rs`, `drivers.rs`, `Diagnostic`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Message` connect `Message` to `mysql/src/lib.rs`, `postgres/src/lib.rs`, `driver-core/src/lib.rs`, `DbConnector`, `export.rs`, `sql_files.rs`, `.fmt`, `src-tauri/src/lib.rs`, `TransactionError`, `editing.rs`, `mysql/src/introspect.rs`, `serde`, `console_texts.rs`, `postgres/src/introspect.rs`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _631 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.054982817869415807 - nodes in this community are weakly interconnected._