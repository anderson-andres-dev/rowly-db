# Graph Report - khipu  (2026-09-29)

## Corpus Check
- 275 files · ~340,522 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 2948 nodes · 6370 edges · 157 communities (139 shown, 18 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 253 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2be3cb0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- FileTree.svelte
- postgres/src/lib.rs
- sqlFiles.ts
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- theme.ts
- connection_error.rs
- tauri.conf.json
- assembly.rs
- sqlDefinitionLink.ts
- codemirrorTheme.ts
- KhipuLanguageServer
- sqlDiagnostics.ts
- connection.ts
- package.json
- dependencies
- lib/types.ts
- palettes.test.ts
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
- 3. Piezas
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- editorSearchPanel.ts
- PostgreSQL a la par de MySQL — diseño (tarea 18)
- svelte
- ResultPager.svelte
- sqlParameterTypes.ts
- resultEditing.ts
- pagination.rs
- focusZones.ts
- Borrador: copiado de resultados de consulta
- diagnostics.rs
- editing.rs
- updates.rs
- DbConnector
- result_editing.rs
- sqlWriting.test.ts
- sidebarLayout.ts
- sqlExecutionMarker.ts
- sqlStatementIndex.ts
- cellTypes.ts
- commands.ts
- SqlEditor.svelte
- pinnedResults.ts
- .remember
- connectionTest.ts
- filterBuilder.ts
- gridClipboard.ts
- ActiveConnection
- messages/index.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- +layout.svelte
- i18n/index.ts
- Message
- queryHistory.ts
- khipu_driver_core
- translate
- src-tauri/src/lib.rs
- DestructiveClassification
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- gridWindow.test.ts
- resultEdits.ts
- Dialect
- TransactionError
- stores/shortcuts.ts
- serde
- reportPersistFailure
- onPointerDown
- console_texts.rs
- Explorador de base de datos
- SettingsPanel.svelte
- 4. Ejemplos con errores reales
- AnalysisRunner
- iconOptics.ts
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- vitest
- scripts
- main.js
- ColumnFilterPopover.svelte
- parser.rs
- pinnedTables.ts
- gridFind.ts
- DataGrid.svelte
- sqlFormatter.ts
- Anexo A. Reglas de escritura, memoria y app (borrador)
- vite.config.js
- .fmt
- Workspace.svelte
- focusZones.keys.test.ts
- invoke
- connect
- error_position.rs
- commit
- copyFormat.ts
- dialogMotion.ts
- Contribuir
- sqlPreviewFormat.ts
- gridNavigation.ts
- numpadKeys.ts
- sqlFolders.ts
- query
- 5. Hecho
- ExportDialog.svelte
- installFocusZones
- Perfiles de motor — diseño (tarea 17)
- columnFilters.ts
- 2. JOIN completo con alias automático
- webkit_env.rs
- svelte
- sqlCallHints.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- 2. La memoria (`crates/memory`)
- Theme bootstrap IIFE (pre-paint CSS var injection)
- README.md (English)
- 8. Interfaz
- Quality CI Workflow
- currentQueryConsole
- queryConsoles.test.ts
- 1. Arquitectura
- 6. Manejar la app
- connectionIdentity.ts
- Arquitectura
- AppState
- ExecutionTimeWidget
- PartValue
- 7. Comunicación entre agentes
- StatusGutterMarker
- svelte.config.js
- add-to-manifest.py

## God Nodes (most connected - your core abstractions)
1. `Message` - 71 edges
2. `vitest` - 59 edges
3. `Dialect` - 51 edges
4. `svelte` - 35 edges
5. `AppState` - 24 edges
6. `translate` - 23 edges
7. `invoke()` - 22 edges
8. `buildCompletionSource()` - 22 edges
9. `v0.2.0 — Pulido de la experiencia` - 22 edges
10. `createSearchPanel()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `D. Diagnósticos (Error Lens) a escala` --references--> `invoke()`  [INFERRED]
  docs/specs/v0.2-documentos-grandes.md → app/src/lib/backend.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts
- `Implementado` --references--> `deleteConnectionProfile()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (157 total, 18 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (68): async_trait, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+60 more)

### Community 2 - "FileTree.svelte"
Cohesion: 0.15
Nodes (15): active, confirmTrash(), fileMenuItems(), finishEdit(), onEditKeydown(), requestTrash(), startRename(), createSqlFile() (+7 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.05
Nodes (62): QueryExecutionOptions, a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, cancelled_before_start(), config_from_env() (+54 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.15
Nodes (22): listSqlDir(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole(), saveConsoleAs(), SQL_FILTERS (+14 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.07
Nodes (54): aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, relationRef(), StatementRelation (+46 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode, RelationKind (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.08
Nodes (37): isFilterOperator(), StatementCheck, appendConsole(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), closeQueryConsole(), consoleTitle() (+29 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.23
Nodes (14): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs) (+6 more)

### Community 9 - "theme.ts"
Cohesion: 0.13
Nodes (23): ColorScheme, EditorPalette, palettes, resolveScheme(), ShellPalette, THEME_FAMILIES, ThemeFamily, themeVariant (+15 more)

### Community 10 - "connection_error.rs"
Cohesion: 0.06
Nodes (33): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+25 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "codemirrorTheme.ts"
Cohesion: 0.15
Nodes (12): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+4 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (53): AnalysisRunnerOptions, Region, create(), typed(), ranges(), addDiagnostics, byPosition(), charToUtf16() (+45 more)

### Community 17 - "connection.ts"
Cohesion: 0.11
Nodes (26): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connect(), connection, ConnectionState (+18 more)

### Community 18 - "package.json"
Cohesion: 0.14
Nodes (13): description, license, name, type, version, codemirror, @codemirror/commands, sql-formatter (+5 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "lib/types.ts"
Cohesion: 0.10
Nodes (20): nextSort(), PageRequest, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExecuteQueryResponse, ExplorerCheck, ExplorerColumn (+12 more)

### Community 21 - "palettes.test.ts"
Cohesion: 0.15
Nodes (12): contrast(), DARK_BEFORE, FAMILIES, LIGHT_COMMENT_MIN, LIGHT_FAMILIES, LIGHT_SYNTAX_MIN, luminance(), PORTED_DARK_FAMILIES (+4 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "drivers.rs"
Cohesion: 0.17
Nodes (20): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, DriverError (+12 more)

### Community 24 - "mysql/src/introspect.rs"
Cohesion: 0.07
Nodes (55): COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter(), format_schedule() (+47 more)

### Community 25 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli, typescript (+2 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "ConnectionForm.svelte"
Cohesion: 0.11
Nodes (10): neutral, tinted, option(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, BackendKind, connectionDrivers, DriverDefinition (+2 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "3. Piezas"
Cohesion: 0.18
Nodes (10): 1. Qué pasa hoy, 2. La regla, 3. Piezas, 4. Orden, A. Grid virtualizado por tramos (la base), B. Sidebar y splitter, C. Efectos caros fuera, E. WebKitGTK en Linux (+2 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.11
Nodes (22): ConnectionDriver, PasswordPolicy, ConnectionConfig, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver() (+14 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.13
Nodes (18): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+10 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.12
Nodes (19): addExclusion, clearExclusions, currentMatch(), editorSearch(), exclusionField, exclusionMarks, ICONS, matchesIn() (+11 more)

### Community 45 - "PostgreSQL a la par de MySQL — diseño (tarea 18)"
Cohesion: 0.25
Nodes (7): 1. Varios schemas (lo más visible), 2. Nombres que necesitan comillas, 3. Falsos errores del análisis, 4. Textos `E'…'` de PostgreSQL, 5. Mayúsculas al resolver nombres en el análisis, 6. Orden, PostgreSQL a la par de MySQL — diseño (tarea 18)

### Community 46 - "svelte"
Cohesion: 0.10
Nodes (10): Icon, icons, executionLog, LogEntry, LogKind, MAX_LOG_ENTRIES, MAX_LOG_TEXT, entry() (+2 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (12): applyCustom(), changePageSize(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize(), defaultPageSize (+4 more)

### Community 48 - "sqlParameterTypes.ts"
Cohesion: 0.08
Nodes (40): MYSQL, names(), POSTGRES, findParameters(), formatted(), isoDate(), isoTime(), looksLikeSql() (+32 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.15
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditTarget, fillCells(), newRowValues() (+10 more)

### Community 50 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 51 - "focusZones.ts"
Cohesion: 0.13
Nodes (20): clearMark(), Direction, DIRECTIONS, flash(), focusZone(), onEscape(), onFocusIn(), onPointerDown() (+12 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "diagnostics.rs"
Cohesion: 0.06
Nodes (63): a_misspelled_clause_taken_as_an_alias(), a_misspelled_keyword_at_the_start(), a_trailing_comma_points_at_the_comma(), AFTER_LIST_KEYWORDS, an_unknown_qualifier(), analyze(), analyze_mixed_case(), analyze_statement() (+55 more)

### Community 54 - "editing.rs"
Cohesion: 0.12
Nodes (31): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+23 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "DbConnector"
Cohesion: 0.18
Nodes (13): DbConnector, DriverError, QueryColumn, QueryExecutionResult, RowSink, ConnectionErrorKind, Formatter, Future (+5 more)

### Community 57 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.13
Nodes (23): buildFkIndex(), buildSqlSchema(), currentStatement(), dialectFor(), extractDefaultTable(), extractFromContext(), extractFromTables(), accept() (+15 more)

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.14
Nodes (21): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+13 more)

### Community 61 - "sqlStatementIndex.ts"
Cohesion: 0.05
Nodes (69): doc, indexedState(), text, LEXICALS, ONE_QUERY, scanInChunks(), SEVERAL, texts() (+61 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "commands.ts"
Cohesion: 0.21
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+7 more)

### Community 64 - "SqlEditor.svelte"
Cohesion: 0.21
Nodes (3): app_src_lib_sqleditoricons, app_src_lib_styles_editorsearch, state

### Community 65 - "pinnedResults.ts"
Cohesion: 0.26
Nodes (10): tabExists(), addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey() (+2 more)

### Community 66 - ".remember"
Cohesion: 0.40
Nodes (4): 2b. Cómo aprende quién es, Fuente en el repo, Reglas propias del usuario, Salud de la memoria

### Community 67 - "connectionTest.ts"
Cohesion: 0.13
Nodes (20): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+12 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.18
Nodes (16): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+8 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.14
Nodes (22): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+14 more)

### Community 70 - "ActiveConnection"
Cohesion: 0.19
Nodes (16): ActiveConnection, build_catalog(), database_explorer(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap (+8 more)

### Community 71 - "messages/index.ts"
Cohesion: 0.12
Nodes (18): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+10 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.17
Nodes (12): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), normalizeTableAliases() (+4 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.22
Nodes (8): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora), Objetivo, Principios

### Community 74 - "+layout.svelte"
Cohesion: 0.10
Nodes (19): initLocaleEffects(), onePerFrame(), frames, reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+11 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.19
Nodes (16): interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale(), translator(), FALLBACK_LOCALE (+8 more)

### Community 76 - "Message"
Cohesion: 0.22
Nodes (22): absolute_dir(), create(), io_failure(), is_sql_file_name(), list_dir(), read(), rename(), Path (+14 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "khipu_driver_core"
Cohesion: 0.15
Nodes (14): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), CatalogColumn, CatalogForeignKey, CatalogTable (+6 more)

### Community 79 - "translate"
Cohesion: 0.21
Nodes (9): createSearchPanel(), countMatches(), refreshStatus(), showCount(), textField(), element(), icon(), translate (+1 more)

### Community 80 - "src-tauri/src/lib.rs"
Cohesion: 0.12
Nodes (35): a_script_is_checked_statement_by_statement(), check_statement(), classify_statements(), count_query_rows(), create_sql_file(), DEFAULT_QUERY_ROW_LIMIT, delete_connection_password(), execute_query() (+27 more)

### Community 81 - "DestructiveClassification"
Cohesion: 0.17
Nodes (20): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_selection() (+12 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.07
Nodes (30): 10. Cancelar una consulta larga — ✅, 11. Scripts de varias sentencias — ✅, 12. Mensajes del backend traducibles — ✅, 13. Modelo de foco por teclado — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅ (+22 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.21
Nodes (14): ensureElement(), hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor() (+6 more)

### Community 84 - "gridWindow.test.ts"
Cohesion: 0.44
Nodes (6): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual()

### Community 85 - "resultEdits.ts"
Cohesion: 0.21
Nodes (15): EMPTY_EDITS, PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep (+7 more)

### Community 86 - "Dialect"
Cohesion: 0.18
Nodes (10): ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), String, Vec, tokens() (+2 more)

### Community 87 - "TransactionError"
Cohesion: 0.25
Nodes (5): ConnectionConfig, Self, TlsMode, TransactionError, Debug

### Community 88 - "stores/shortcuts.ts"
Cohesion: 0.14
Nodes (14): commandDefinition, handleRecordKeydown(), activeZone, installKeybindings(), onKeydown(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut (+6 more)

### Community 89 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 90 - "reportPersistFailure"
Cohesion: 0.29
Nodes (8): flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole, queueDiskText(), reportPersistFailure(), textKey(), writeConsoles(), writeDiskTexts()

### Community 91 - "onPointerDown"
Cohesion: 0.42
Nodes (9): prefersReducedMotion(), onPointerDown(), cleanup(), onMove(), onUp(), resetStyles(), settle(), startDrag() (+1 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.25
Nodes (16): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+8 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (10): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog` (+2 more)

### Community 95 - "4. Ejemplos con errores reales"
Cohesion: 0.08
Nodes (22): QuickFix, 1. Qué se ve, 2. Estados, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad (+14 more)

### Community 96 - "AnalysisRunner"
Cohesion: 0.07
Nodes (20): AnalysisRunner, merge(), subtract(), runner(), statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27) (+12 more)

### Community 97 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (33): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+25 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.20
Nodes (9): 0. Hoy, 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden, 8. Decidido (2026-09-27) (+1 more)

### Community 100 - "vitest"
Cohesion: 0.08
Nodes (29): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ENGINES, standardSql, completionPolicy (+21 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.14
Nodes (12): applyTheme(), hexToRgb(), nextTheme(), PATTERNS, selectTab(), setupTabs(), startBird(), frame() (+4 more)

### Community 104 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 105 - "pinnedTables.ts"
Cohesion: 0.43
Nodes (5): forgetPinnedTables(), isPinned(), PinnedTable, pinnedTables, togglePinnedTable()

### Community 106 - "gridFind.ts"
Cohesion: 0.24
Nodes (10): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+2 more)

### Community 107 - "DataGrid.svelte"
Cohesion: 0.15
Nodes (8): onMove(), onUp(), selectCell(), toggleInSelection(), active, danger, submit, label()

### Community 108 - "sqlFormatter.ts"
Cohesion: 0.13
Nodes (33): alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions, listPass() (+25 more)

### Community 109 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 110 - "vite.config.js"
Cohesion: 0.50
Nodes (3): ref_node_process, @sveltejs/kit, vite

### Community 112 - "Workspace.svelte"
Cohesion: 0.10
Nodes (11): close(), labelForKey(), reorderResultTabs(), $t(), ContextMenuItem, applyTexts(), child(), key() (+3 more)

### Community 113 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 114 - "invoke"
Cohesion: 0.17
Nodes (13): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+5 more)

### Community 115 - "connect"
Cohesion: 0.29
Nodes (8): connect(), ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, test_connection(), TestConnectionReport

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "commit"
Cohesion: 0.25
Nodes (5): buildQuery(), commit(), excludeCurrent(), isExcluded(), NewlineMarker

### Community 118 - "copyFormat.ts"
Cohesion: 0.40
Nodes (4): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS

### Community 119 - "dialogMotion.ts"
Cohesion: 0.29
Nodes (8): Box, installDialogMotion(), isBackdropClick(), OPEN_GRACE_MS, outside(), box, insidePoint, outsidePoint

### Community 120 - "Contribuir"
Cohesion: 0.22
Nodes (11): Agregar un motor de base de datos, Contribuir, Estilo, Flujo de trabajo, Nombres, Primeros pasos, Pruebas contra una base real, Publicar una versión (+3 more)

### Community 121 - "sqlPreviewFormat.ts"
Cohesion: 0.38
Nodes (8): CLAUSE_BREAKS, collapseWhitespace(), formatPreviewSql(), isWordChar(), scan(), Scanned, splitClauses(), wrap()

### Community 122 - "gridNavigation.ts"
Cohesion: 0.33
Nodes (6): edgeRow(), GridBounds, GridCell, NAVIGATION_KEYS, navigationTarget(), stepRows()

### Community 123 - "numpadKeys.ts"
Cohesion: 0.43
Nodes (5): installNumpadFix(), onKeydown(), isTextTarget(), NUMPAD_TEXT, numpadText()

### Community 124 - "sqlFolders.ts"
Cohesion: 0.14
Nodes (15): folderMenuItems(), startCreate(), pickSqlFolder(), closeSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load() (+7 more)

### Community 125 - "query"
Cohesion: 0.33
Nodes (6): query(), 5. Guardarraíles de datos, 9. Subtareas, Escritura, Lectura, Siempre

### Community 126 - "5. Hecho"
Cohesion: 0.40
Nodes (5): 21a — Grid virtualizado por tramos (2026-09-28), 21b — Sidebar, splitter y blur (2026-09-28), 21c — WebKitGTK (2026-09-28), 21d — Columnas virtualizadas (2026-09-28), 5. Hecho

### Community 127 - "ExportDialog.svelte"
Cohesion: 0.20
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 128 - "installFocusZones"
Cohesion: 0.52
Nodes (7): installFocusZones(), isPrefix(), onKeydown(), onKeyup(), onWindowBlur(), stopMoving(), swallow()

### Community 129 - "Perfiles de motor — diseño (tarea 17)"
Cohesion: 0.22
Nodes (8): 2. Inventario: lo que depende del motor, 4. El perfil (Rust), 5. Contrato de pruebas, 6. Agregar un motor (guía), 7. Orden, Backend (Rust), Frontend, Perfiles de motor — diseño (tarea 17)

### Community 130 - "columnFilters.ts"
Cohesion: 0.29
Nodes (10): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+2 more)

### Community 131 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "svelte"
Cohesion: 0.24
Nodes (8): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), usage, ref_app, svelte

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.07
Nodes (32): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+24 more)

### Community 135 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 136 - "2. La memoria (`crates/memory`)"
Cohesion: 0.33
Nodes (6): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla

### Community 137 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 138 - "README.md (English)"
Cohesion: 1.00
Nodes (3): app/README.md (Tauri + SvelteKit + TypeScript template note), README.md (English), README.es.md (Spanish)

### Community 139 - "8. Interfaz"
Cohesion: 0.33
Nodes (6): 8. Interfaz, Contenido del panel, Otras vistas, bajo demanda, Posición del panel, Tamaños, Teclado dentro de la terminal

### Community 140 - "Quality CI Workflow"
Cohesion: 0.29
Nodes (7): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, Flujo de ramas y releases (branch protection + release flow)

### Community 141 - "currentQueryConsole"
Cohesion: 0.67
Nodes (4): currentQueryConsole(), flushConsoleTexts(), registerConsoleTextFlush(), 15b — Texto al store y guardado (2026-09-27)

### Community 143 - "1. Arquitectura"
Cohesion: 0.40
Nodes (5): 1. Arquitectura, Agentes soportados, Carpeta de sesión, El agente encerrado por defecto, Sesiones atadas a una conexión

### Community 144 - "6. Manejar la app"
Cohesion: 0.40
Nodes (5): 6. Manejar la app, Acuse: qué pasó con cada acción, Estado: qué hay en pantalla, Mostrar, no dibujar, Reglas propias de la IA sobre la app

### Community 145 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 146 - "Arquitectura"
Cohesion: 0.25
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 147 - "AppState"
Cohesion: 0.18
Nodes (23): analyze_sql(), apply_result_changes(), AppState, cancel_query(), disconnect(), export_query_to_file(), ExportSummary, list_tables() (+15 more)

### Community 150 - "7. Comunicación entre agentes"
Cohesion: 0.67
Nodes (3): 7. Comunicación entre agentes, Agente abierto desde fuera, Reglas

### Community 155 - "svelte.config.js"
Cohesion: 0.40
Nodes (3): config, @sveltejs/adapter-static, @sveltejs/vite-plugin-svelte

### Community 156 - "add-to-manifest.py"
Cohesion: 0.50
Nodes (3): json, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **581 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+576 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1026 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `columnFilters.ts`, `sqlSchema.ts`, `sqlCallHints.ts`, `svelte`, `theme.ts`, `queryConsoles.test.ts`, `sqlDiagnostics.ts`, `connectionIdentity.ts`, `package.json`, `lib/types.ts`, `palettes.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `sqlStatementIndex.ts`, `cellTypes.ts`, `commands.ts`, `pinnedResults.ts`, `connectionTest.ts`, `filterBuilder.ts`, `gridClipboard.ts`, `messages/index.ts`, `+layout.svelte`, `i18n/index.ts`, `queryHistory.ts`, `gridWindow.test.ts`, `resultEdits.ts`, `pinnedTables.ts`, `gridFind.ts`, `sqlFormatter.ts`, `focusZones.keys.test.ts`, `invoke`, `dialogMotion.ts`, `sqlPreviewFormat.ts`, `gridNavigation.ts`, `numpadKeys.ts`, `ExportDialog.svelte`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `Arquitectura`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `SSL/TLS por conexión` connect `Explorador de base de datos` to `connectionProfiles.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _581 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._