# Graph Report - khipu  (2026-09-29)

## Corpus Check
- 275 files · ~341,098 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 8, .css 7, .icns 1)

## Summary
- 2946 nodes · 6376 edges · 156 communities (143 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 253 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c139b62`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- sqlStatements.ts
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
- gridWindow.test.ts
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- connectionProfiles.ts
- stores/updates.ts
- export.rs
- editorSearchPanel.ts
- @codemirror/state
- Workspace.svelte
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
- 2b. Cómo aprende quién es
- connectionTest.ts
- filterBuilder.ts
- gridClipboard.ts
- ActiveConnection
- messages/index.ts
- editorSettings.ts
- Asistente integrado con memoria de negocio — diseño
- +layout.svelte
- i18n/index.ts
- sql_files.rs
- queryHistory.ts
- catalog.rs
- translate
- Message
- DestructiveClassification
- v0.2.0 — Pulido de la experiencia
- tooltip.ts
- postgres/src/tls.rs
- resultEdits.ts
- Dialect
- Option
- stores/shortcuts.ts
- serde
- notifications.ts
- reorder.ts
- console_texts.rs
- Explorador de base de datos
- sqlRelations.ts
- Diagnósticos en el editor — diseño (tarea 4)
- 3. Piezas
- iconOptics.ts
- engines/index.ts
- Autocompletado inteligente — diseño (tarea 16)
- sqlContext.ts
- scripts
- main.js
- withExecution
- parser.rs
- super
- gridFind.ts
- AnalysisRunner
- sqlFormatter.ts
- Anexo A. Reglas de escritura, memoria y app (borrador)
- 3. Arquitectura
- .fmt
- 4. Ejemplos con errores reales
- focusZones.keys.test.ts
- invoke
- ConnectFailure
- error_position.rs
- commit
- ref_app
- dialogMotion.ts
- Contribuir
- sqlPreviewFormat.ts
- gridNavigation.ts
- numpadKeys.ts
- sqlFolders.ts
- query
- catalog_adapter.rs
- DataGrid.svelte
- apply
- contract.test.ts
- columnFilters.ts
- 2. JOIN completo con alias automático
- webkit_env.rs
- svelte
- sqlCallHints.ts
- TablePlus UX & Architecture Analysis (design reference for Khipu)
- 2. La memoria (`crates/memory`)
- Theme bootstrap IIFE (pre-paint CSS var injection)
- CONTRIBUTING.md
- 8. Interfaz
- Quality CI Workflow
- currentQueryConsole
- queryConsoles.test.ts
- 1. Arquitectura
- 6. Manejar la app
- vitest
- Arquitectura
- src-tauri/src/lib.rs
- ExecutionTimeWidget
- PartValue
- 7. Comunicación entre agentes
- 7. Entorno de la conexión — 🧪
- 11. Scripts de varias sentencias — ✅
- StatusGutterMarker
- 13. Modelo de foco por teclado — ✅
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
- `3. El perfil (frontend)` --references--> `ConnectionDriver`  [INFERRED]
  docs/specs/v0.2-perfiles-de-motor.md → app/src/lib/connections.ts
- `0. Hoy` --references--> `buildCompletionSource()`  [INFERRED]
  docs/specs/v0.2-autocompletado.md → app/src/lib/sqlSchema.ts
- `Implementado` --references--> `splitStatements()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/sqlStatements.ts
- `Implementado` --references--> `connect()`  [INFERRED]
  docs/specs/v0.2-pulido.md → app/src/lib/stores/connection.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (156 total, 13 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.10
Nodes (26): add_column_insert_create_select_are_not_destructive(), cte_around_update_without_where_requires_confirmation(), cte_with_where_is_not_destructive(), delete_returning_without_where_requires_confirmation(), delete_using_without_where_requires_confirmation(), delete_with_leading_comment_without_where_requires_confirmation(), delete_with_where_is_not_destructive(), delete_with_where_true_is_not_destructive() (+18 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (66): QueryExecutionOptions, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection() (+58 more)

### Community 2 - "sqlStatements.ts"
Cohesion: 0.10
Nodes (28): scanInChunks(), ScanResult, ALL_COLUMNS_AFTER, ALWAYS_FOLLOWS_LEAD, blankLineIn(), compiled, CONTINUE_WORDS, CONTINUES (+20 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (58): async_trait, cancelled_before_start(), config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl() (+50 more)

### Community 4 - "sqlFiles.ts"
Cohesion: 0.13
Nodes (25): confirmTrash(), finishEdit(), onEditKeydown(), createSqlFile(), listSqlDir(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile() (+17 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.09
Nodes (39): relationRef(), afterCompleteCondition(), applyAndRecord(), buildCompletionSource(), catalogTable(), COLUMN_TYPES, dialectCache, EMPTY_TABLE_INDEX (+31 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.11
Nodes (22): CheckInfo, ColumnInfo, DriverError, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo, ParameterMode (+14 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.09
Nodes (27): isFilterOperator(), StatementCheck, activateQueryConsole(), appendConsole(), closeQueryConsole(), consoleTitle(), createId(), createQueryConsole() (+19 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.28
Nodes (12): DbConnector trait (contributor guidance), Dialect enum (crates/engine), Cómo sumar un motor de base de datos nuevo (procedure), app/src-tauri shell layer, DbConnector trait (crates/driver-core), Dialect enum (MySql/Postgres, crates/engine/src/lib.rs), crates/driver-core layer (DbConnector contract), crates/drivers/* layer (khipu-driver-mysql, khipu-driver-postgres, ... over sqlx) (+4 more)

### Community 9 - "theme.ts"
Cohesion: 0.13
Nodes (23): ColorScheme, EditorPalette, palettes, resolveScheme(), ShellPalette, THEME_FAMILIES, ThemeFamily, themeVariant (+15 more)

### Community 10 - "connection_error.rs"
Cohesion: 0.13
Nodes (16): ConnectionErrorKind, DriverError, io_error_kind(), is_lookup_failure(), probe_reports_a_closed_port_at_once(), probe_tcp(), Duration, ErrorKind (+8 more)

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
Cohesion: 0.17
Nodes (11): buildCmTheme(), BUILTIN_FUNCTIONS, builtinCallMark, createCmTheme(), themes, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight (+3 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "sqlDiagnostics.ts"
Cohesion: 0.05
Nodes (42): AnalysisRunnerOptions, merge(), Region, create(), typed(), ranges(), addDiagnostics, byPosition() (+34 more)

### Community 17 - "connection.ts"
Cohesion: 0.10
Nodes (28): indexOf(), getDriver(), activeProfile, catalogTables, completeConnection(), connection, ConnectResult, connectToProfile() (+20 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (20): description, license, name, type, version, config, codemirror, @codemirror/commands (+12 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "lib/types.ts"
Cohesion: 0.09
Nodes (24): nextSort(), PageRequest, ConnectionConfig, QueryExecutionState, CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn (+16 more)

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
Cohesion: 0.10
Nodes (11): neutral, tinted, Icon, icons, option(), CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, BackendKind (+3 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "postgres/src/introspect.rs"
Cohesion: 0.11
Nodes (45): build_parameters, balanced(), build_parameters(), check_expression(), COLUMNS_SQL, constraint_column_row(), CONSTRAINT_COLUMNS_SQL, ConstraintColumnRow (+37 more)

### Community 32 - "gridWindow.test.ts"
Cohesion: 0.11
Nodes (21): CHUNK_ROWS, chunkWindow, GROUP_COLS, groupCount(), groupWindow(), rowAtVisual(), 1. Qué pasa hoy, 21a — Grid virtualizado por tramos (2026-09-28) (+13 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "connectionProfiles.ts"
Cohesion: 0.13
Nodes (18): ConnectionDriver, PasswordPolicy, CONNECTION_ENVIRONMENTS, ConnectionEnvironment, ConnectionProfile, connectionProfiles, isDriver(), isHexColor() (+10 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.12
Nodes (19): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+11 more)

### Community 43 - "export.rs"
Cohesion: 0.13
Nodes (23): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), export_as(), ExportFormat, FileSink, is_json() (+15 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.12
Nodes (19): addExclusion, clearExclusions, currentMatch(), editorSearch(), exclusionField, exclusionMarks, ICONS, matchesIn() (+11 more)

### Community 45 - "@codemirror/state"
Cohesion: 0.12
Nodes (16): RoutineIndex, activeStatementHighlight, autoUppercaseSqlKeywords, lineColumns(), measureStatementLines(), statementDecorations(), editFor(), uppercaseKeywordEdit (+8 more)

### Community 46 - "Workspace.svelte"
Cohesion: 0.06
Nodes (17): close(), active, danger, submit, shortcutText(), $t(), labelForKey(), $t() (+9 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (13): applyCustom(), changePageSize(), format(), goLast(), lastOffsetFor(), navButton(), $t(), clampPageSize() (+5 more)

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
Cohesion: 0.10
Nodes (32): activeZone, clearMark(), Direction, DIRECTIONS, flash(), focusZone(), installFocusZones(), isPrefix() (+24 more)

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
Cohesion: 0.24
Nodes (9): DbConnector, RowSink, Formatter, Future, Output, Pin, Result, Send (+1 more)

### Community 57 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 58 - "sqlWriting.test.ts"
Cohesion: 0.14
Nodes (22): buildFkIndex(), buildSqlSchema(), currentStatement(), extractDefaultTable(), extractFromContext(), extractFromTables(), accept(), CATALOG (+14 more)

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.33
Nodes (8): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth, onSidebarHandleKeydown()

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.14
Nodes (21): editedLines(), executionMarker, executionMarkerField, ExecutionMarkerInput, ExecutionMarkerStatus, executionPart, executionTimeDecorations(), executionTimePositions() (+13 more)

### Community 61 - "sqlStatementIndex.ts"
Cohesion: 0.08
Nodes (43): doc, indexedState(), text, LEXICALS, ONE_QUERY, SEVERAL, texts(), typingSpan() (+35 more)

### Community 62 - "cellTypes.ts"
Cohesion: 0.17
Nodes (17): BOOLEAN, enumValues(), impossibleClock(), impossibleIsoDate(), INTEGER_ALIASES, INTEGER_RANGES, InvalidCell, invalidCells() (+9 more)

### Community 63 - "commands.ts"
Cohesion: 0.21
Nodes (15): commandDefinitions, CommandGroup, CommandHandler, commandsCollide(), CommandZone, definitionsById, handlerKey(), handlers (+7 more)

### Community 64 - "SqlEditor.svelte"
Cohesion: 0.10
Nodes (8): active, fileMenuItems(), requestTrash(), startRename(), ContextMenuItem, app_src_lib_sqleditoricons, entry(), app_src_lib_styles_editorsearch

### Community 65 - "pinnedResults.ts"
Cohesion: 0.29
Nodes (9): addPinnedTab(), addResultTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned() (+1 more)

### Community 66 - "2b. Cómo aprende quién es"
Cohesion: 0.67
Nodes (3): 2b. Cómo aprende quién es, Fuente en el repo, Reglas propias del usuario

### Community 67 - "connectionTest.ts"
Cohesion: 0.12
Nodes (23): colorLabel(), ConnectionTarget, explainConnectionFailure(), ExplainedFailure, KNOWN_KINDS, target, toConnectionFailure(), describeTls() (+15 more)

### Community 68 - "filterBuilder.ts"
Cohesion: 0.16
Nodes (17): engineFor(), buildWhere(), conditionSql(), FILTER_OPERATORS, FilterCondition, FilterJoin, FilterOperator, listValues() (+9 more)

### Community 69 - "gridClipboard.ts"
Cohesion: 0.15
Nodes (22): writeClipboard(), CopyColumn, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField(), normalizeNewlines() (+14 more)

### Community 70 - "ActiveConnection"
Cohesion: 0.22
Nodes (14): ActiveConnection, build_catalog(), DatabaseExplorer, ExportRequest, PageRequest, Arc, BTreeMap, SchemaObjects (+6 more)

### Community 71 - "messages/index.ts"
Cohesion: 0.11
Nodes (19): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), pinKey() (+11 more)

### Community 72 - "editorSettings.ts"
Cohesion: 0.17
Nodes (12): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), normalizeTableAliases() (+4 more)

### Community 73 - "Asistente integrado con memoria de negocio — diseño"
Cohesion: 0.22
Nodes (8): 3. Recuperación: el contexto justo, 4. Herramientas (servidor MCP), Asistente integrado con memoria de negocio — diseño, Estado, Formato compacto, Fuera de alcance (por ahora), Objetivo, Principios

### Community 74 - "+layout.svelte"
Cohesion: 0.10
Nodes (18): initLocaleEffects(), onePerFrame(), frames, reset(), setFilePanelHeight(), app_src_lib_styles_alert_dialog, app_src_lib_styles_buttons, app_src_lib_styles_controls (+10 more)

### Community 75 - "i18n/index.ts"
Cohesion: 0.12
Nodes (18): allState, style, interpolate(), loadPreference(), localePreference, lookup(), MessageParams, systemLocale() (+10 more)

### Community 76 - "sql_files.rs"
Cohesion: 0.26
Nodes (18): absolute_dir(), create(), io_failure(), is_sql_file_name(), list_dir(), read(), rename(), Path (+10 more)

### Community 77 - "queryHistory.ts"
Cohesion: 0.16
Nodes (17): filterHistory(), flushQueryHistory(), groupHistoryByDay(), HistoryDay, HistoryEntry, HistoryOutcome, isEntry(), load() (+9 more)

### Community 78 - "catalog.rs"
Cohesion: 0.23
Nodes (10): CatalogColumn, CatalogForeignKey, CatalogTable, CatalogColumn, CatalogTable, Option, String, Vec (+2 more)

### Community 79 - "translate"
Cohesion: 0.19
Nodes (10): createSearchPanel(), countMatches(), refreshStatus(), showCount(), textField(), element(), icon(), translate (+2 more)

### Community 80 - "Message"
Cohesion: 0.21
Nodes (20): create_sql_file(), delete_connection_password(), list_sql_dir(), load_connection_password(), prune_console_texts(), read_console_text(), read_sql_file(), rename_sql_file() (+12 more)

### Community 81 - "DestructiveClassification"
Cohesion: 0.17
Nodes (20): AlterTableOperation, classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_production(), classify_query(), classify_selection() (+12 more)

### Community 82 - "v0.2.0 — Pulido de la experiencia"
Cohesion: 0.11
Nodes (19): 10. Cancelar una consulta larga — ✅, 14. Pulido tras la primera prueba — 🧪, 2. Timeout de conexión — ✅, 3. Ctrl+Enter duplicado — descartado, 4. Posición del error en el editor — ✅, 5. Última conexión — ✅, 8. Historial de consultas — ✅, 9. Hoja de atajos — ✅ (+11 more)

### Community 83 - "tooltip.ts"
Cohesion: 0.20
Nodes (13): hide(), hideTooltipFor(), place(), prettyShortcut(), resolve(), Resolved, scheduleTooltipFor(), show() (+5 more)

### Community 84 - "postgres/src/tls.rs"
Cohesion: 0.14
Nodes (12): connection_error(), io_error(), is_tls_failure(), kind_of(), read_status(), ConnectionErrorKind, DriverError, Error (+4 more)

### Community 85 - "resultEdits.ts"
Cohesion: 0.22
Nodes (14): PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 86 - "Dialect"
Cohesion: 0.18
Nodes (10): ALL, Dialect, la_fila_con_valores_por_defecto_es_sql_valido(), los_identificadores_entre_comillas_se_leen_igual(), los_literales_de_texto_se_leen_igual(), String, Vec, tokens() (+2 more)

### Community 87 - "Option"
Cohesion: 0.20
Nodes (9): ConnectionConfig, QueryColumn, QueryExecutionResult, Option, Self, TlsMode, TlsStatus, TransactionError (+1 more)

### Community 88 - "stores/shortcuts.ts"
Cohesion: 0.17
Nodes (9): commandDefinition, handleRecordKeydown(), MODIFIER_KEYS, ResolvedShortcut, setShortcutKeys(), ShortcutDefinition, shortcutDefinitions, shortcutOverrides (+1 more)

### Community 89 - "serde"
Cohesion: 0.19
Nodes (9): app_text_travels_as_key_and_params(), raw_text_travels_as_a_plain_string(), BTreeMap, Into, Self, String, ToString, fmt (+1 more)

### Community 90 - "notifications.ts"
Cohesion: 0.18
Nodes (14): dismissNotice(), notice, notifyError(), notifySuccess(), show(), flushConsolePersistence(), hydrateLargeTexts(), PersistedConsole (+6 more)

### Community 91 - "reorder.ts"
Cohesion: 0.21
Nodes (13): reorderResultTabs(), moveItem(), prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp() (+5 more)

### Community 92 - "console_texts.rs"
Cohesion: 0.23
Nodes (17): io_failure(), prune(), read(), AppHandle, Option, Path, PathBuf, Result (+9 more)

### Community 93 - "Explorador de base de datos"
Cohesion: 0.29
Nodes (7): Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Flujo de datos, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos

### Community 94 - "sqlRelations.ts"
Cohesion: 0.21
Nodes (15): sqlTokens(), aliasFor(), END_FROM_LIST, initials(), isName(), nameOf(), NOT_ALIAS, StatementRelation (+7 more)

### Community 95 - "Diagnósticos en el editor — diseño (tarea 4)"
Cohesion: 0.20
Nodes (8): 1. Qué se ve, 2. Estados, 5. Límites y decisiones abiertas, 6. Pasos, Diagnósticos en el editor — diseño (tarea 4), Líneas con error (siempre), Navegación activa (Siguiente / Anterior error), Ventana de detalle (errores complejos)

### Community 96 - "3. Piezas"
Cohesion: 0.12
Nodes (16): statementsChangedIn(), 15c — Autocompletado (2026-09-27), 15d — Error Lens a escala (2026-09-27), 15e — Scripts enormes y búsqueda (2026-09-27), 15f — Medir (2026-09-27), 1. Qué pasa hoy, 2. La regla, 3. Piezas (+8 more)

### Community 97 - "iconOptics.ts"
Cohesion: 0.33
Nodes (4): OPTICAL_SIZES, TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE, @lucide/svelte

### Community 98 - "engines/index.ts"
Cohesion: 0.12
Nodes (34): ansiString(), caseInsensitiveName(), COMMON_RESERVED, COMMON_STARTERS, foldedName(), identifierWith(), quoteWith(), QUOTING_RESERVED (+26 more)

### Community 99 - "Autocompletado inteligente — diseño (tarea 16)"
Cohesion: 0.20
Nodes (9): 0. Hoy, 1. Resaltar lo que coincide, 3. ON y columnas con sentido, 4. Ranking, 5. Después (no en esta tarea), 6. El destello blanco del grid, 7. Orden, 8. Decidido (2026-09-27) (+1 more)

### Community 100 - "sqlContext.ts"
Cohesion: 0.13
Nodes (18): completionPolicy, NO_BOOST(), RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords(), classifyContext(), classifyFrame(), CLAUSE_KEYWORDS (+10 more)

### Community 101 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 102 - "main.js"
Cohesion: 0.15
Nodes (12): applyTheme(), hexToRgb(), nextTheme(), PATTERNS, selectTab(), setupTabs(), startBird(), frame() (+4 more)

### Community 103 - "withExecution"
Cohesion: 0.20
Nodes (14): tabExists(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting() (+6 more)

### Community 104 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 105 - "super"
Cohesion: 0.19
Nodes (6): a_late_cancel_never_touches_the_connection_again(), CancelState, QueryCancel, Mutex, Option, super

### Community 106 - "gridFind.ts"
Cohesion: 0.20
Nodes (12): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+4 more)

### Community 107 - "AnalysisRunner"
Cohesion: 0.21
Nodes (3): AnalysisRunner, subtract(), runner()

### Community 108 - "sqlFormatter.ts"
Cohesion: 0.13
Nodes (34): alignColumnDefinitions(), alignConditionsPass(), alignJoinsPass(), alignPass(), hasComment(), indentOf(), joinConditionPass(), LayoutOptions (+26 more)

### Community 109 - "Anexo A. Reglas de escritura, memoria y app (borrador)"
Cohesion: 0.29
Nodes (7): Anexo A. Reglas de escritura, memoria y app (borrador), `base.md`, `locales/de.md`, `locales/en.md`, `locales/es.md`, `locales/fr.md`, `locales/pt-BR.md`

### Community 110 - "3. Arquitectura"
Cohesion: 0.29
Nodes (7): QuickFix, 3.1 Dos fuentes, un solo formato, 3.2 Conversión de offsets (el detalle que rompe todo si se olvida), 3.3 En el editor, 3.4 Comandos (registro de la 13c), 3.5 Accesibilidad, 3. Arquitectura

### Community 112 - "4. Ejemplos con errores reales"
Cohesion: 0.29
Nodes (7): 4. Ejemplos con errores reales, Clave foránea (ejecución, Postgres 23503), Columna inexistente (estático, catálogo), Coma de más antes de FROM, GROUP BY mal estructurado (ejecución, Postgres 42803), Palabra clave mal escrita, Sintaxis cerca de WHERE (estático, MySQL o Postgres)

### Community 113 - "focusZones.keys.test.ts"
Cohesion: 0.43
Nodes (6): FakeKey, g, prefix(), press(), release(), win()

### Community 114 - "invoke"
Cohesion: 0.12
Nodes (16): BackendMessage, backendText(), invoke(), isKeyed(), rustFiles, translatedRejection(), forgetConnectionPassword(), loadConnectionPassword() (+8 more)

### Community 115 - "ConnectFailure"
Cohesion: 0.25
Nodes (8): ConnectFailure, ConnectionConfig, ConnectionErrorKind, DriverError, From, Self, test_connection(), TestConnectionReport

### Community 116 - "error_position.rs"
Cohesion: 0.24
Nodes (6): is_word_char(), map_error_position(), Option, Vec, word_starts(), WRAPPER_WORDS

### Community 117 - "commit"
Cohesion: 0.25
Nodes (5): buildQuery(), commit(), excludeCurrent(), isExcluded(), NewlineMarker

### Community 118 - "ref_app"
Cohesion: 0.33
Nodes (5): COPY_FORMATS, CopyFormat, copySettings, DEFAULTS, ref_app

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

### Community 126 - "catalog_adapter.rs"
Cohesion: 0.47
Nodes (5): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog()

### Community 127 - "DataGrid.svelte"
Cohesion: 0.15
Nodes (13): onMove(), onUp(), selectCell(), toggleInSelection(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES (+5 more)

### Community 128 - "apply"
Cohesion: 0.40
Nodes (6): apply(), Option, TlsMode, ssl_mode(), PgConnectOptions, PgSslMode

### Community 129 - "contract.test.ts"
Cohesion: 0.12
Nodes (17): Fixture, FIXTURES, ORDERS, PROFILES, USERS, ExecutionError, dialectFor(), CatalogTable (+9 more)

### Community 130 - "columnFilters.ts"
Cohesion: 0.33
Nodes (9): collator, ColumnFilters, columnValueCounts(), NULL_KEY, rowsHiddenByFilters(), ROWS, ValueCount, valueKey() (+1 more)

### Community 131 - "2. JOIN completo con alias automático"
Cohesion: 0.29
Nodes (7): t(), 2. JOIN completo con alias automático, Alias también en el FROM, Cuándo aparece, El alias, Orden, Qué inserta

### Community 132 - "webkit_env.rs"
Cohesion: 0.40
Nodes (4): apply(), DMABUF_VAR, should_disable_dmabuf(), should_disable_dmabuf

### Community 133 - "svelte"
Cohesion: 0.39
Nodes (6): load(), parse(), queryParameterValues, RememberedParameter, rememberParameterValues(), svelte

### Community 134 - "sqlCallHints.ts"
Cohesion: 0.07
Nodes (34): buildRoutineIndex(), CallArgument, callHints(), CatalogRoutine, findCalls(), isName(), labelsFor(), Name (+26 more)

### Community 135 - "TablePlus UX & Architecture Analysis (design reference for Khipu)"
Cohesion: 0.25
Nodes (9): ApplicationShell abstract component architecture, Command palette / Open Anything, TablePlus UX & Architecture Analysis (design reference for Khipu), Domain-oriented sidebar navigation, Explore -> Inspect -> Modify -> Review -> Commit flow, Inline editing, Pending changes / Preview / Commit / Safe Mode pattern, Preview tabs (+1 more)

### Community 136 - "2. La memoria (`crates/memory`)"
Cohesion: 0.29
Nodes (7): 2. La memoria (`crates/memory`), Consistencia de los `.md`, Dos tipos de memoria, Dónde vive cada cosa, Estructura de tablas: primero la memoria, después la base, Huella de una tabla, Salud de la memoria

### Community 137 - "Theme bootstrap IIFE (pre-paint CSS var injection)"
Cohesion: 0.25
Nodes (8): CSS_VAR_NAMES field-to-CSS-variable mapping, app/src/app.html (SvelteKit shell HTML), SHELL_PALETTES literal (datagrip/vscode x dark/light), palettes.ts palette definitions (external reference, file not read in this chunk), theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk), Theme bootstrap IIFE (pre-paint CSS var injection), Rationale: palette literals duplicated inline to avoid flash-of-unstyled-theme before SvelteKit ES modules load, app/src frontend layer (Svelte + CodeMirror 6)

### Community 138 - "CONTRIBUTING.md"
Cohesion: 0.28
Nodes (5): app/README.md (Tauri + SvelteKit + TypeScript template note), Driver contract tests (#[ignore = "requires database"] pattern), Driver factory branch in app/src-tauri/src/drivers.rs, README.md (English), README.es.md (Spanish)

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

### Community 145 - "vitest"
Cohesion: 0.21
Nodes (7): initials(), luminance(), readableTextColor(), ENGINES, slice(), groupByFixes(), vitest

### Community 146 - "Arquitectura"
Cohesion: 0.40
Nodes (5): Arquitectura, Capas, Dialectos, La idea, Para seguir

### Community 147 - "src-tauri/src/lib.rs"
Cohesion: 0.12
Nodes (41): a_script_is_checked_statement_by_statement(), analyze_sql(), apply_result_changes(), AppState, cancel_query(), check_statement(), classify_statements(), connect() (+33 more)

### Community 150 - "7. Comunicación entre agentes"
Cohesion: 0.67
Nodes (3): 7. Comunicación entre agentes, Agente abierto desde fuera, Reglas

### Community 151 - "7. Entorno de la conexión — 🧪"
Cohesion: 0.50
Nodes (4): 7. Entorno de la conexión — 🧪, Decisión, Implementado, Problema

### Community 152 - "11. Scripts de varias sentencias — ✅"
Cohesion: 0.67
Nodes (3): 11. Scripts de varias sentencias — ✅, Decisión (2026-09-27), Implementado

### Community 154 - "13. Modelo de foco por teclado — ✅"
Cohesion: 0.67
Nodes (3): 13. Modelo de foco por teclado — ✅, Decisión, Problema

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1023 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `vitest` connect `vitest` to `contract.test.ts`, `columnFilters.ts`, `sqlStatements.ts`, `svelte`, `sqlCallHints.ts`, `theme.ts`, `queryConsoles.test.ts`, `sqlDiagnostics.ts`, `connection.ts`, `package.json`, `lib/types.ts`, `palettes.test.ts`, `gridWindow.test.ts`, `connectionProfiles.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `@codemirror/state`, `sqlParameterTypes.ts`, `resultEditing.ts`, `focusZones.ts`, `sqlWriting.test.ts`, `sidebarLayout.ts`, `sqlExecutionMarker.ts`, `sqlStatementIndex.ts`, `cellTypes.ts`, `commands.ts`, `pinnedResults.ts`, `connectionTest.ts`, `filterBuilder.ts`, `gridClipboard.ts`, `messages/index.ts`, `+layout.svelte`, `i18n/index.ts`, `queryHistory.ts`, `resultEdits.ts`, `sqlRelations.ts`, `sqlContext.ts`, `gridFind.ts`, `sqlFormatter.ts`, `focusZones.keys.test.ts`, `invoke`, `dialogMotion.ts`, `sqlPreviewFormat.ts`, `gridNavigation.ts`, `numpadKeys.ts`, `DataGrid.svelte`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `CONTRIBUTING.md`, `lib/types.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `SSL/TLS por conexión` connect `lib/types.ts` to `Explorador de base de datos`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _581 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.10416666666666667 - nodes in this community are weakly interconnected._