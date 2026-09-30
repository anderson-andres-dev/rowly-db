# Graph Report - khipu  (2026-09-30)

## Corpus Check
- 306 files · ~386,274 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 3183 nodes · 6990 edges · 154 communities (140 shown, 14 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 252 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a22dde3`
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
- text_encoding.rs
- tauri.conf.json
- state.ts
- sqlDefinitionLink.ts
- FileTree.svelte
- KhipuLanguageServer
- Product
- connection.ts
- package.json
- dependencies
- ref_app
- Message
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
- jsonHighlight.ts
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
- contract.test.ts
- sqlFormatter.ts
- sqlExecutionMarker.ts
- sqlStatementIndex.ts
- cellTypes.ts
- .remember
- editorSearchPanel.dom.test.ts
- messages/index.ts
- lib/types.ts
- Contribuir
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
- sidebarLayout.ts
- v0.2.0 — Pulido de la experiencia
- theme.ts
- @codemirror/state
- resultEdits.ts
- Dialect
- svelte
- reportPersistFailure
- AnalysisRunner
- pinnedResults.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- console_texts.rs
- Explorador de base de datos
- gridSelectionSummary.ts
- 3. Arquitectura
- invoke
- Theme bootstrap IIFE (pre-paint CSS var injection)
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- vitest
- scripts
- main.js
- 3. Piezas
- super
- ColumnFilterPopover.svelte
- gridFind.ts
- sqlDiagnostics.ts
- sqlFolders.ts
- 6. Manejar la app
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- ConnectionConfig
- Diagnósticos en el editor — diseño (tarea 4)
- 4. Ejemplos con errores reales
- Anexo A. Reglas de escritura, memoria y app (borrador)
- ConnectFailure
- error_position.rs
- replace.ts
- SqlEditor.svelte
- Workspace.svelte
- 8. Interfaz
- 2. La memoria (`crates/memory`)
- result_editing.rs
- svelte.config.js
- dialogMotion.ts
- sqlParameterHints.ts
- Diagnostic
- 1. Arquitectura
- Arquitectura
- vite.config.js
- +layout.svelte
- Quality CI Workflow
- webkit_env.rs
- gridNavigation.ts
- sqlCallHints.ts
- @codemirror/view
- corpus.rs
- 1. Qué se ve
- 7. Entorno de la conexión — 🧪
- 11. Scripts de varias sentencias — ✅
- ActiveConnection
- Position
- editorSearchPanel.ts
- DataGrid.svelte
- currentQueryConsole
- 10. Cancelar una consulta larga — ✅
- 8. Historial de consultas — ✅
- CONTRIBUTING.md
- iconOptics.ts
- gridSettings.ts
- pinnedTables.ts
- queryConsoles.test.ts
- FindBarActions
- .fmt

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `vitest` - 68 edges
3. `Dialect` - 61 edges
4. `svelte` - 39 edges
5. `@codemirror/state` - 26 edges
6. `AppState` - 24 edges
7. `analyze_statement()` - 23 edges
8. `translate` - 22 edges
9. `buildCompletionSource()` - 22 edges
10. `v0.2.0 — Pulido de la experiencia` - 22 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `7. Pulido del análisis (2026-09-29)` --references--> `created()`  [INFERRED]
  docs/specs/v0.2-diagnosticos.md → app/src/lib/sqlCreatedTables.test.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- 1-file cycle: `app/src-tauri/src/drivers.rs -> app/src-tauri/src/drivers.rs`

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (154 total, 14 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.07
Nodes (46): AlterTableOperation, add_column_insert_create_select_are_not_destructive(), classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query() (+38 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (67): QueryExecutionOptions, TransactionStatement, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS (+59 more)

### Community 2 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (62): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env(), config_with_tls() (+54 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.14
Nodes (22): openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS, SqlDirEntry (+14 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.07
Nodes (57): sqlTokens(), Token, aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS (+49 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (25): async_trait, CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+17 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.07
Nodes (42): tabExists(), isFilterOperator(), activateQueryConsole(), appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole() (+34 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.36
Nodes (10): Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs), crates/driver-core layer (DbConnector contract), crates/drivers/* layer (khipu-driver-mysql, khipu-driver-postgres, ... over sqlx), crates/engine layer (dialect-agnostic core), crates/engine-lsp layer (tower-lsp server, khipu-lsp) (+2 more)

### Community 9 - "DbConnector"
Cohesion: 0.19
Nodes (11): DbConnector, DriverError, RowSink, ConnectionErrorKind, Formatter, Future, Output, Pin (+3 more)

### Community 10 - "text_encoding.rs"
Cohesion: 0.16
Nodes (13): cada_encoding_va_y_vuelve_igual(), decode(), decode_utf16(), encode(), Result, String, Vec, SAMPLE (+5 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "state.ts"
Cohesion: 0.13
Nodes (17): ReplaceOptions, createSession(), SearchSession, addExclusion, clearExclusions, filteredQuery(), inScope(), isExcluded() (+9 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "FileTree.svelte"
Cohesion: 0.14
Nodes (16): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+8 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 17 - "connection.ts"
Cohesion: 0.11
Nodes (27): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectionState (+19 more)

### Community 18 - "package.json"
Cohesion: 0.11
Nodes (17): description, license, name, type, version, codemirror, @codemirror/commands, devicon (+9 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "ref_app"
Cohesion: 0.20
Nodes (8): clampPageSize(), defaultPageSize, FACTORY_PAGE_SIZE, load(), MAX_PAGE_SIZE, PAGE_SIZE_OPTIONS, usage, ref_app

### Community 21 - "Message"
Cohesion: 0.18
Nodes (23): cancel_query(), create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file() (+15 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.16
Nodes (20): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+12 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.06
Nodes (61): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), COLUMNS_SQL, event_row(), EVENTS_SQL (+53 more)

### Community 25 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, happy-dom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli (+3 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "svelte"
Cohesion: 0.09
Nodes (13): neutral, tinted, Icon, icons, option(), shortcutText(), $t(), CONNECTION_COLORS (+5 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "jsonHighlight.ts"
Cohesion: 0.08
Nodes (30): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual(), detectJsonColumns(), escapeHtml() (+22 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.08
Nodes (17): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+9 more)

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
Cohesion: 0.14
Nodes (20): Checker<'a, '_>, join_constraint(), output_columns(), Expr, Ident, ObjectName, Option, Query (+12 more)

### Community 45 - "FindBar"
Cohesion: 0.15
Nodes (3): MatchStatus, FindBar, ReplaceBar

### Community 46 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.12
Nodes (7): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t()

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.08
Nodes (38): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+30 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (20): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+12 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.06
Nodes (55): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+47 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.07
Nodes (49): a_missing_comma_between_values(), a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_trailing_comma_points_at_the_comma(), a_view_without_described_columns_flags_none(), AFTER_LIST_KEYWORDS, AFTER_MISSING_TABLE, AFTER_MISSING_VALUE (+41 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (30): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+22 more)

### Community 55 - "updates.rs"
Cohesion: 0.07
Nodes (53): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+45 more)

### Community 56 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 57 - "stores/shortcuts.ts"
Cohesion: 0.15
Nodes (8): handleRecordKeydown(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, shortcutOverrides, shortcuts

### Community 58 - "contract.test.ts"
Cohesion: 0.08
Nodes (36): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, codeChar(), IDENTIFIER_CLOSE (+28 more)

### Community 59 - "sqlFormatter.ts"
Cohesion: 0.13
Nodes (34): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+26 more)

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.08
Nodes (24): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+16 more)

### Community 61 - "sqlStatementIndex.ts"
Cohesion: 0.05
Nodes (71): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts() (+63 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - ".remember"
Cohesion: 0.20
Nodes (9): query(), 2b. Cómo aprende quién es, 5. Guardarraíles de datos, 9. Subtareas, Escritura, Fuente en el repo, Lectura, Reglas propias del usuario (+1 more)

### Community 65 - "editorSearchPanel.dom.test.ts"
Cohesion: 0.14
Nodes (13): click(), findArea(), findRow(), flush(), mount(), replaceAll(), replaceArea(), replaceRow() (+5 more)

### Community 66 - "messages/index.ts"
Cohesion: 0.13
Nodes (14): ENGINE_SOURCES, defineMessages(), OtherLocale, Namespaces, CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar() (+6 more)

### Community 67 - "lib/types.ts"
Cohesion: 0.08
Nodes (34): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+26 more)

### Community 68 - "Contribuir"
Cohesion: 0.25
Nodes (8): Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión, Sitio web

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
Cohesion: 0.17
Nodes (12): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), normalizeTableAliases() (+4 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.17
Nodes (11): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), 7. Comunicación entre agentes, Agente abierto desde fuera, Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora) (+3 more)

### Community 74 - "filterBuilder.ts"
Cohesion: 0.09
Nodes (27): ConnectionDriver, engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator (+19 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.19
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
Cohesion: 0.32
Nodes (14): autosize(), element(), icon(), ICONS, insertNewline(), label(), textField(), toggleButton() (+6 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.11
Nodes (44): a_script_is_checked_statement_by_statement(), analyze_sql(), apply_result_changes(), AppState, check_statement(), classify_statements(), connect(), count_query_rows() (+36 more)

### Community 81 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.12
Nodes (16): 14. Pulido tras la primera prueba — 🧪, 1. Recordar la ventana — ✅, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 9. Hoja de atajos — ✅, Estado (+8 more)

### Community 83 - "theme.ts"
Cohesion: 0.06
Nodes (44): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+36 more)

### Community 84 - "@codemirror/state"
Cohesion: 0.18
Nodes (14): createdTables(), lastPart(), created(), typingSpan(), activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines() (+6 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (14): EMPTY_EDITS, PendingEdits, ResultEditInfo, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 86 - "Dialect"
Cohesion: 0.12
Nodes (15): MYSQL, ALL, Dialect, .ALL, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), MARIADB_UNPARSED (+7 more)

### Community 87 - "svelte"
Cohesion: 0.19
Nodes (9): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), invoke, release, listed (+1 more)

### Community 88 - "reportPersistFailure"
Cohesion: 0.25
Nodes (9): flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole, queueDiskText(), reportPersistFailure(), textKey(), writeConsoles(), writeDiskTexts() (+1 more)

### Community 89 - "AnalysisRunner"
Cohesion: 0.18
Nodes (4): AnalysisRunner, merge(), subtract(), runner()

### Community 90 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 91 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.25
Nodes (8): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos, SSL/TLS por conexión

### Community 94 - "gridSelectionSummary.ts"
Cohesion: 0.18
Nodes (15): PasteBlock, DecimalSum, formatDecimal(), isNumericType(), NUMERIC_TYPES, SelectionSummary, summarizeSelection(), SummaryInput (+7 more)

### Community 95 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 96 - "invoke"
Cohesion: 0.11
Nodes (21): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+13 more)

### Community 97 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.12
Nodes (16): t(), 0. Hoy, 1. Resaltar lo que coincide, 2. JOIN completo con alias automático, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid (+8 more)

### Community 100 - "vitest"
Cohesion: 0.09
Nodes (24): initials(), luminance(), readableTextColor(), ENGINES, completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST (+16 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.29
Nodes (4): detected, live, menu, setupTabs()

### Community 103 - "3. Piezas"
Cohesion: 0.15
Nodes (12): statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 2. La regla, 3. Piezas, 5. Hecho (+4 more)

### Community 104 - "super"
Cohesion: 0.13
Nodes (6): Capabilities, MIN_MAJOR, ParserError, Result, validate(), super

### Community 106 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 107 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (43): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), charToUtf16() (+35 more)

### Community 108 - "sqlFolders.ts"
Cohesion: 0.14
Nodes (15): folderMenuItems(), startCreate(), pickSqlFolder(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load() (+7 more)

### Community 109 - "6. Manejar la app"
Cohesion: 0.29
Nodes (7): commandDefinition, 6. Manejar la app, Acuse: qué pasó con cada acción, Capacidades: un registro con tipos, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 110 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 111 - "ConnectionConfig"
Cohesion: 0.29
Nodes (4): ConnectionConfig, Self, TlsMode, Debug

### Community 112 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.29
Nodes (5): 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, 7. Pulido del análisis (2026-09-29), Diagnósticos en el editor — diseño (tarea 4)

### Community 113 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 114 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "replace.ts"
Cohesion: 0.43
Nodes (7): preserveCase(), replaceCurrent(), replaceEverything(), replacementFor(), excludeCurrent(), currentMatch(), matchesIn()

### Community 118 - "SqlEditor.svelte"
Cohesion: 0.11
Nodes (4): close(), ContextMenuItem, app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch

### Community 119 - "Workspace.svelte"
Cohesion: 0.07
Nodes (12): active, danger, submit, labelForKey(), $t(), nextSort(), executionLog, LogEntry (+4 more)

### Community 120 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 121 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 122 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 123 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 124 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 125 - "sqlParameterHints.ts"
Cohesion: 0.20
Nodes (7): RoutineIndex, hintDecorations(), hintPainter, hintTheme, ParameterHint, parameterHintConfig, parameterHints

### Community 126 - "Diagnostic"
Cohesion: 0.22
Nodes (20): at_token(), Diagnostic, DiagnosticMessage, ends_expression(), expected_found(), friendly_syntax(), is_plain_name(), is_value() (+12 more)

### Community 127 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 128 - "Arquitectura"
Cohesion: 0.25
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 129 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 130 - "+layout.svelte"
Cohesion: 0.10
Nodes (18): initLocaleEffects(), onePerFrame(), frames, reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+10 more)

### Community 131 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.07
Nodes (40): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+32 more)

### Community 135 - "@codemirror/view"
Cohesion: 0.17
Nodes (7): MAX_COUNTED, exclusionMarks, NewlineMarker, newlineMarkers, exclusionField, @codemirror/search, @codemirror/view

### Community 136 - "corpus.rs"
Cohesion: 0.32
Nodes (11): catalog(), check(), created(), lo_comun_no_da_falsos_positivos_en_ningun_motor(), lo_de_mysql_y_mariadb_no_da_falsos_positivos(), lo_de_postgres_no_da_falsos_positivos(), CatalogTable, String (+3 more)

### Community 137 - "1. Qué se ve"
Cohesion: 0.50
Nodes (4): 1. Qué se ve, Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 138 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 139 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 140 - "ActiveConnection"
Cohesion: 0.13
Nodes (19): ActiveConnection, build_catalog(), DatabaseExplorer, Arc, BTreeMap, SchemaObjects, TlsStatus, CatalogColumn (+11 more)

### Community 141 - "Position"
Cohesion: 0.13
Nodes (20): byte_offset(), closest_keyword(), closest_names(), distance(), max_distance(), offset_at(), Position, position_at() (+12 more)

### Community 142 - "editorSearchPanel.ts"
Cohesion: 0.21
Nodes (15): createMatchCounter(), count(), scopeForReplace(), scopeFromSelection(), searchMode, closeAndFocusEditor(), createSearchPanel(), renderMode() (+7 more)

### Community 143 - "DataGrid.svelte"
Cohesion: 0.17
Nodes (9): onMove(), onUp(), selectCell(), toggleInSelection(), installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT (+1 more)

### Community 144 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

### Community 149 - "CONTRIBUTING.md"
Cohesion: 0.29
Nodes (7): app/README.md (Tauri + SvelteKit + TypeScript template note), DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, README.md (English), README.es.md (Spanish)

### Community 151 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 152 - "gridSettings.ts"
Cohesion: 0.43
Nodes (6): GRID_ROW_STYLES, GridRowStyle, gridSettings, loadGridSettings(), normalizeRowStyle(), setGridRowStyle()

### Community 155 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 156 - "queryConsoles.test.ts"
Cohesion: 0.60
Nodes (4): createMemoryStorage(), freshQueryConsoles(), imported, importQueryConsoles()

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **608 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+603 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1087 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `+layout.svelte`, `gridNavigation.ts`, `sqlCallHints.ts`, `sqlSchema.ts`, `editorSearchPanel.ts`, `DataGrid.svelte`, `package.json`, `gridSettings.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `jsonHighlight.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `contract.test.ts`, `sqlFormatter.ts`, `sqlExecutionMarker.ts`, `sqlStatementIndex.ts`, `cellTypes.ts`, `editorSearchPanel.dom.test.ts`, `messages/index.ts`, `lib/types.ts`, `gridClipboard.ts`, `columnFilters.ts`, `filterBuilder.ts`, `i18n/index.ts`, `queryHistory.ts`, `sidebarLayout.ts`, `theme.ts`, `@codemirror/state`, `resultEdits.ts`, `svelte`, `pinnedResults.ts`, `gridSelectionSummary.ts`, `invoke`, `engines/index.ts`, `gridFind.ts`, `sqlDiagnostics.ts`, `Workspace.svelte`, `dialogMotion.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `svelte` connect `svelte` to `sqlFiles.ts`, `queryConsoles.ts`, `FileTree.svelte`, `connection.ts`, `package.json`, `ref_app`, `iconOptics.ts`, `gridSettings.ts`, `pinnedTables.ts`, `queryConsoles.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `tooltip.ts`, `focusZones.ts`, `stores/shortcuts.ts`, `gridClipboard.ts`, `reorder.ts`, `editorSettings.ts`, `i18n/index.ts`, `queryHistory.ts`, `findBar.ts`, `sidebarLayout.ts`, `theme.ts`, `resultEdits.ts`, `pinnedResults.ts`, `sqlFolders.ts`, `Workspace.svelte`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `Arquitectura`, `connection.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _608 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07402031930333818 - nodes in this community are weakly interconnected._