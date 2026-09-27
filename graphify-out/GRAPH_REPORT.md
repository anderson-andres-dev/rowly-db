# Graph Report - khipu  (2026-09-26)

## Corpus Check
- 175 files · ~165,639 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 7, .css 2, .icns 1)

## Summary
- 1794 nodes · 3723 edges · 91 communities (79 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f66f0cee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- execution_guard.rs
- mysql/src/lib.rs
- resultEdits.ts
- postgres/src/lib.rs
- src-tauri/src/lib.rs
- sqlSchema.ts
- driver-core/src/lib.rs
- queryConsoles.ts
- docs/ARCHITECTURE.md
- theme.ts
- svelte
- tauri.conf.json
- sqlFiles.ts
- sqlDefinitionLink.ts
- connection.ts
- KhipuLanguageServer
- explorerTree.ts
- connectionProfiles.ts
- package.json
- dependencies
- i18n/index.ts
- super
- compilerOptions
- postgres/src/tls.rs
- mysql/src/tls.rs
- devDependencies
- credentials.rs
- scripts
- default.json
- khipu-desktop
- DriverError
- sql_path
- assembly.rs
- app-environment.ts
- ssr
- mysql/src/version.rs
- CLAUDE.md
- sqlContext.ts
- stores/updates.ts
- export.rs
- editorSearchPanel.ts
- vitest
- gridFind.ts
- ResultPager.svelte
- Explorador de base de datos
- resultEditing.ts
- sqlCompletionPolicy.ts
- types.ts
- Borrador: copiado de resultados de consulta
- FileTree.svelte
- Dialect
- updates.rs
- sqlSchema.test.ts
- connectionTest.ts
- gridClipboard.test.ts
- sidebarLayout.ts
- sqlExecutionMarker.ts
- gridClipboard.ts
- messages/index.ts
- pagination.rs
- result_editing.rs
- extractFromContext
- Workspace.svelte
- editorSettings.ts
- connectionIdentity.ts
- ref_app
- ExportDialog.svelte
- sqlEditorBehavior.ts
- svelte
- reorder.ts
- startFilePanelResize
- stores/shortcuts.ts
- SettingsPanel.svelte
- notifications.ts
- ResultPane.svelte
- sqlFolders.ts
- withExecution
- DataGrid.svelte
- add-to-manifest.py
- parser.rs
- queryExecution.ts
- credentials.ts
- StatusGutterMarker
- +layout.svelte

## God Nodes (most connected - your core abstractions)
1. `DriverError` - 50 edges
2. `Dialect` - 34 edges
3. `svelte` - 26 edges
4. `vitest` - 26 edges
5. `TableInfo` - 20 edges
6. `createSearchPanel()` - 19 edges
7. `AppState` - 18 edges
8. `DbConnector` - 18 edges
9. `translate` - 17 edges
10. `TableSet` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Flujo de datos` --references--> `buildExplorerTree()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/explorerTree.ts
- `SSL/TLS por conexión` --references--> `TlsMode`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/types.ts
- `Flujo de datos` --references--> `connect()`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/stores/connection.ts
- `SSL/TLS por conexión` --references--> `TlsStatus`  [INFERRED]
  docs/design/explorador-base-de-datos.md → app/src/lib/types.ts
- `app/README.md (Tauri + SvelteKit + TypeScript template note)` --semantically_similar_to--> `README.md (English)`  [INFERRED] [semantically similar]
  app/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Quality Pipeline (workflow + its jobs)** — _github_workflows_quality_workflow, _github_workflows_quality_rust_job, _github_workflows_quality_node_job [EXTRACTED 1.00]
- **Branch protection to tagged-release pipeline flow** — contributing_branch_flow, _github_workflows_quality_workflow, _github_workflows_release_workflow [EXTRACTED 1.00]
- **TablePlus edit-review-commit UX pattern group** — docs_design_tableplus_ux_arquitectura_explore_inspect_modify_review_commit, docs_design_tableplus_ux_arquitectura_pending_changes_commit, docs_design_tableplus_ux_arquitectura_application_shell [INFERRED 0.85]

## Communities (91 total, 12 thin omitted)

### Community 0 - "execution_guard.rs"
Cohesion: 0.09
Nodes (41): AlterTableOperation, add_column_insert_create_select_are_not_destructive(), classify(), classify_alter_table(), classify_destructive_sql(), classify_drop(), classify_query(), classify_selection() (+33 more)

### Community 1 - "mysql/src/lib.rs"
Cohesion: 0.06
Nodes (61): QueryExecutionOptions, config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_mysql(), ER_UNSUPPORTED_PS, execute_on_connection(), execute_query_returns_command_for_ddl() (+53 more)

### Community 2 - "resultEdits.ts"
Cohesion: 0.20
Nodes (14): PendingEdits, ResultEditInfo, RowRange, clearResultPendingEdits(), commitResultEdits(), editStateFor(), EditStep, EMPTY_STATE (+6 more)

### Community 3 - "postgres/src/lib.rs"
Cohesion: 0.06
Nodes (55): async_trait, config_from_env(), config_with_tls(), CONNECT_TIMEOUT, connects_and_lists_schemas_and_tables_against_real_postgres(), execute_on_connection(), execute_query_returns_command_for_ddl(), execute_query_returns_error_with_code_and_position_for_bad_sql() (+47 more)

### Community 4 - "src-tauri/src/lib.rs"
Cohesion: 0.09
Nodes (61): ActiveConnection, apply_result_changes(), AppState, connect(), count_query_rows(), create_sql_file(), database_explorer(), DatabaseExplorer (+53 more)

### Community 5 - "sqlSchema.ts"
Cohesion: 0.15
Nodes (18): buildCompletionSource(), buildKeywordCompletion(), buildMultiTableCompletionSource(), dialectCache, filterSchemaResult(), findTableColumns(), findTableEntry(), FkIndex (+10 more)

### Community 6 - "driver-core/src/lib.rs"
Cohesion: 0.08
Nodes (36): CheckInfo, ColumnInfo, ConnectionConfig, DbConnector, EventInfo, ForeignKeyInfo, IndexInfo, KeyInfo (+28 more)

### Community 7 - "queryConsoles.ts"
Cohesion: 0.10
Nodes (26): activateQueryConsole(), appendConsole(), closeQueryConsole(), consoleTitle(), createId(), createQueryConsole(), EMPTY_EXECUTION_STATE, EMPTY_STATE (+18 more)

### Community 8 - "docs/ARCHITECTURE.md"
Cohesion: 0.07
Nodes (41): Node job (check, build), Rust job (fmt, clippy, test), Quality CI Workflow, Release job (multi-platform build & publish), tauri-apps/tauri-action, Release CI Workflow, app/README.md (Tauri + SvelteKit + TypeScript template note), CSS_VAR_NAMES field-to-CSS-variable mapping (+33 more)

### Community 9 - "theme.ts"
Cohesion: 0.06
Nodes (42): BUILTIN_FUNCTIONS, builtinCallMark, TOKEN_CHROME, WORD_OPERATORS, wordClassHighlight, wordOperatorMark, ColorScheme, EditorPalette (+34 more)

### Community 10 - "svelte"
Cohesion: 0.11
Nodes (13): neutral, cornerActions(), indexOf(), $t(), tinted, CONNECTION_COLORS, NEUTRAL_IDENTITY_COLOR, BackendKind (+5 more)

### Community 11 - "tauri.conf.json"
Cohesion: 0.06
Nodes (30): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+22 more)

### Community 12 - "sqlFiles.ts"
Cohesion: 0.15
Nodes (20): finishEdit(), onEditKeydown(), createSqlFile(), openSqlFileAtPath(), openSqlFileWithDialog(), renameConsoleFile(), renameSqlFile(), saveConsole() (+12 more)

### Community 13 - "sqlDefinitionLink.ts"
Cohesion: 0.18
Nodes (7): CatalogTableRef, definitionLinkExtension(), DefinitionLinkOptions, DefinitionLinkPlugin, isModifierHeld(), linkRangeField, setLinkRange

### Community 14 - "connection.ts"
Cohesion: 0.13
Nodes (21): loadConnectionPassword(), catalogTables, completeConnection(), connect(), connection, ConnectionState, ConnectResult, connectToProfile() (+13 more)

### Community 15 - "KhipuLanguageServer"
Cohesion: 0.15
Nodes (11): CompletionParams, CompletionResponse, KhipuLanguageServer, Client, Option, Result, InitializeParams, InitializeResult (+3 more)

### Community 16 - "explorerTree.ts"
Cohesion: 0.19
Nodes (16): buildExplorerTree(), columnList(), expandableKeys(), ExplorerIcon, ExplorerNode, folder(), matches(), schemaNode() (+8 more)

### Community 17 - "connectionProfiles.ts"
Cohesion: 0.15
Nodes (16): ConnectionDriver, PasswordPolicy, ConnectionConfig, ConnectionProfile, connectionProfiles, isDriver(), isHexColor(), isPasswordPolicy() (+8 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (20): description, license, name, type, version, config, codemirror, @codemirror/commands (+12 more)

### Community 19 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, codemirror, @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-sql, @codemirror/language, @codemirror/search, @codemirror/state (+9 more)

### Community 20 - "i18n/index.ts"
Cohesion: 0.18
Nodes (17): interpolate(), loadPreference(), locale, localePreference, lookup(), MessageParams, systemLocale(), translator() (+9 more)

### Community 21 - "super"
Cohesion: 0.11
Nodes (31): preserves_column_metadata(), preserves_foreign_keys(), IntoIterator, Item, tables_to_catalog(), absolute_dir(), create(), is_sql_file_name() (+23 more)

### Community 22 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 23 - "postgres/src/tls.rs"
Cohesion: 0.08
Nodes (36): connect(), ConnectedDatabase, DatabaseKind, open(), report(), Arc, ConnectionConfig, Option (+28 more)

### Community 24 - "mysql/src/tls.rs"
Cohesion: 0.13
Nodes (19): apply(), connection_error(), io_error(), is_tls_failure(), read_status(), Error, ErrorKind, MySqlPool (+11 more)

### Community 25 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit, @sveltejs/vite-plugin-svelte, @tauri-apps/cli, typescript (+2 more)

### Community 26 - "credentials.rs"
Cohesion: 0.40
Nodes (9): delete(), entry(), load(), Option, Result, String, save(), SERVICE (+1 more)

### Community 27 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, check:watch, dev, prepare, preview, tauri (+1 more)

### Community 28 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 29 - "khipu-desktop"
Cohesion: 0.47
Nodes (6): khipu-desktop, khipu-driver-core, khipu-driver-mysql, khipu-driver-postgres, khipu-engine, khipu-lsp

### Community 30 - "DriverError"
Cohesion: 0.07
Nodes (72): DriverError, COLUMNS_SQL, event_row(), EVENTS_SQL, fetch(), foreign_key_row(), FOREIGN_KEYS_SQL, format_parameter() (+64 more)

### Community 32 - "assembly.rs"
Cohesion: 0.14
Nodes (25): crate, drops_rows_for_unknown_relations(), group(), groups_multi_column_keys_in_column_order(), groups_non_adjacent_rows_of_the_same_constraint(), ignores_duplicate_relation_names(), IndexColumnRow, key_row() (+17 more)

### Community 37 - "mysql/src/version.rs"
Cohesion: 0.07
Nodes (19): Capabilities, check_constraints_depend_on_flavor_and_version(), CheckConstraints, Flavor, MIN_MARIADB, MIN_MYSQL, Capabilities, Self (+11 more)

### Community 41 - "sqlContext.ts"
Cohesion: 0.18
Nodes (13): classifyContext(), classifyFrame(), CLAUSE_KEYWORDS, ClauseKind, FrameState, JOIN_MODIFIERS, lex(), Lexical (+5 more)

### Community 42 - "stores/updates.ts"
Cohesion: 0.13
Nodes (18): checkForUpdates(), checking, checkOnStartup(), DEFAULT_PREFS, errorCode(), InstallKind, installRelease(), installState (+10 more)

### Community 43 - "export.rs"
Cohesion: 0.15
Nodes (22): ALLOWED_EXTENSIONS, columns(), csv_field(), export(), ExportFormat, FileSink, is_json(), is_numeric() (+14 more)

### Community 44 - "editorSearchPanel.ts"
Cohesion: 0.07
Nodes (31): addExclusion, clearExclusions, createSearchPanel(), applyTexts(), buildQuery(), commit(), excludeCurrent(), label() (+23 more)

### Community 45 - "vitest"
Cohesion: 0.19
Nodes (11): CLAUSES_WITH_INLINE_BODY, compactStructuredLayout(), compactStructuredLayoutPass(), formatSqlBlock(), indentation(), isClause(), Quote, scanFormattedSql() (+3 more)

### Community 46 - "gridFind.ts"
Cohesion: 0.20
Nodes (12): buildMatcher(), cellText(), escapeRegex(), findInPage(), FindMatch, FindOptions, FindResult, MAX_MATCHES (+4 more)

### Community 47 - "ResultPager.svelte"
Cohesion: 0.11
Nodes (16): applyCustom(), changePageSize(), goLast(), hideTooltip(), lastOffsetFor(), navButton(), prettyShortcut(), showTooltip() (+8 more)

### Community 48 - "Explorador de base de datos"
Cohesion: 0.20
Nodes (9): TlsStatus, Compatibilidad entre versiones, Contrato del driver, Explorador de base de datos, Limitaciones conocidas, MySQL / MariaDB — `information_schema`, PostgreSQL — `pg_catalog`, Próximos pasos (+1 more)

### Community 49 - "resultEditing.ts"
Cohesion: 0.14
Nodes (18): addRow(), buildChanges(), ChangeError, ColumnValue, deleteRows(), EditableColumn, EditTarget, newRowValues() (+10 more)

### Community 50 - "sqlCompletionPolicy.ts"
Cohesion: 0.22
Nodes (10): COMMON_STARTERS, completionPolicy, MYSQL_STARTERS, NO_BOOST(), POSTGRES_STARTERS, RELATION_TAIL_BASE, RELATION_TAIL_BOOST, relationTailKeywords() (+2 more)

### Community 51 - "types.ts"
Cohesion: 0.12
Nodes (14): CatalogColumn, ColumnCatalogInfo, ExplorerCheck, ExplorerColumn, ExplorerEvent, ExplorerForeignKey, ExplorerIndex, ExplorerKey (+6 more)

### Community 52 - "Borrador: copiado de resultados de consulta"
Cohesion: 0.11
Nodes (17): Alcance inicial sugerido, Borrador: copiado de resultados de consulta, Comportamiento propuesto, Consideraciones, Consideraciones, Criterio para pasar a implementación, Decisiones pendientes antes de implementar, Estado (+9 more)

### Community 53 - "FileTree.svelte"
Cohesion: 0.20
Nodes (10): active, editValue, fileMenuItems(), folderMenuItems(), requestTrash(), startCreate(), startRename(), $t() (+2 more)

### Community 54 - "Dialect"
Cohesion: 0.11
Nodes (34): analyze_editable_query(), build_change_statements(), CellValue, ColumnValue, distingue_columnas_alias_y_expresiones(), EditableQuery, escapa_valores_e_identificadores_por_dialecto(), ident_name() (+26 more)

### Community 55 - "updates.rs"
Cohesion: 0.10
Nodes (44): command_succeeds(), current_version(), detect_install_kind(), DOWNLOAD_BASE_ENV, GithubAsset, GithubRelease, http_client(), install_package() (+36 more)

### Community 56 - "sqlSchema.test.ts"
Cohesion: 0.20
Nodes (10): applyAndRecord(), buildFkIndex(), buildSqlSchema(), extractDefaultTable(), CATALOG, complete(), ORDERS, USERS (+2 more)

### Community 57 - "connectionTest.ts"
Cohesion: 0.26
Nodes (10): colorLabel(), describeTls(), summarizeError(), summarizeReport(), summaryText(), encrypted, TestOutcome, TestSummary (+2 more)

### Community 58 - "gridClipboard.test.ts"
Cohesion: 0.22
Nodes (7): CopyColumn, PasteBlock, rememberCopy(), columns, NULL, options, CellValue

### Community 59 - "sidebarLayout.ts"
Cohesion: 0.39
Nodes (7): clampSidebarWidth(), DEFAULT_SIDEBAR_WIDTH, loadSidebarWidth(), MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, releaseSidebarDrag(), sidebarWidth

### Community 60 - "sqlExecutionMarker.ts"
Cohesion: 0.17
Nodes (10): executionMarker, executionMarkerField, ExecutionMarkerStatus, executionTimeDecorations(), ExecutionTimeWidget, formatExecutionTime(), markerFromResult(), setExecutionMarker (+2 more)

### Community 61 - "gridClipboard.ts"
Cohesion: 0.15
Nodes (19): writeClipboard(), COPY_FORMATS, CopyFormat, CopyOptions, csvField(), externalValue(), jsonValue(), markdownField() (+11 more)

### Community 62 - "messages/index.ts"
Cohesion: 0.30
Nodes (3): defineMessages(), OtherLocale, Namespaces

### Community 63 - "pagination.rs"
Cohesion: 0.14
Nodes (19): ast, count_sql(), is_read_only_query(), literal_limit(), literal_u64(), MYSQL, number(), ordena_por_posicion_reemplazando_el_order_by() (+11 more)

### Community 64 - "result_editing.rs"
Cohesion: 0.30
Nodes (18): edit_info(), EditableColumn, EditTarget, find_table(), names(), ResultEditInfo, BTreeMap, Option (+10 more)

### Community 65 - "extractFromContext"
Cohesion: 0.67
Nodes (4): currentStatement(), extractFromContext(), extractFromTables(), toRelation()

### Community 66 - "Workspace.svelte"
Cohesion: 0.09
Nodes (12): #each(), labelForKey(), onKeydown(), reorderResultTabs(), $t(), ContextMenuItem, table(), moveItem() (+4 more)

### Community 67 - "editorSettings.ts"
Cohesion: 0.24
Nodes (8): DEFAULT_FORMATTER_LINE_WIDTH, defaultEditorSettings(), editorSettings, loadEditorSettings(), MAX_FORMATTER_LINE_WIDTH, MIN_FORMATTER_LINE_WIDTH, normalizeLineWidth(), setFormatterLineWidth()

### Community 68 - "connectionIdentity.ts"
Cohesion: 0.70
Nodes (3): initials(), luminance(), readableTextColor()

### Community 69 - "ref_app"
Cohesion: 0.25
Nodes (7): applyForwardJoin(), applyReverseJoin(), buildJoinCompletionSource(), boostFor(), recordUsage(), usage, ref_app

### Community 70 - "ExportDialog.svelte"
Cohesion: 0.17
Nodes (11): format(), detectJsonColumns(), escapeHtml(), highlightJson(), HTML_ESCAPES, isJsonColumnType(), looksLikeJsonDocument(), MAX_HIGHLIGHTED_CHARS (+3 more)

### Community 71 - "sqlEditorBehavior.ts"
Cohesion: 0.24
Nodes (9): activeStatementHighlight, autoUppercaseSqlKeywords, findStatement(), statementDecorations(), editFor(), uppercaseKeywordEdit, @codemirror/lang-sql, @codemirror/language (+1 more)

### Community 72 - "svelte"
Cohesion: 0.29
Nodes (9): addPinnedTab(), consoleOfKey(), pinnedResults, PinnedTab, removePinnedTab(), resultKey(), setResultPinned(), unpinnedTabs() (+1 more)

### Community 73 - "reorder.ts"
Cohesion: 0.26
Nodes (11): prefersReducedMotion(), reorderable(), onPointerDown(), cleanup(), onMove(), onUp(), resetStyles(), settle() (+3 more)

### Community 74 - "startFilePanelResize"
Cohesion: 0.39
Nodes (9): setFilePanelHeight(), clampFilePanelHeight(), onFilePanelHandleKeydown(), startFilePanelResize(), onMove(), onUp(), startSidebarResize(), onMove() (+1 more)

### Community 75 - "stores/shortcuts.ts"
Cohesion: 0.16
Nodes (9): eventMatchesShortcut(), formatShortcutEvent(), MODIFIER_KEYS, ResolvedShortcut, ShortcutDefinition, shortcutDefinitions, shortcutOverrides, shortcuts (+1 more)

### Community 76 - "SettingsPanel.svelte"
Cohesion: 0.22
Nodes (3): option(), $t(), release()

### Community 77 - "notifications.ts"
Cohesion: 0.31
Nodes (8): confirmTrash(), trashSqlFile(), dismissNotice(), notice, notifyError(), notifySuccess(), show(), detachQueryConsoleFile()

### Community 78 - "ResultPane.svelte"
Cohesion: 0.20
Nodes (3): executionLog, LogEntry, LogKind

### Community 79 - "sqlFolders.ts"
Cohesion: 0.18
Nodes (11): pickSqlFolder(), DEFAULT_FILE_PANEL_HEIGHT, EMPTY, listRecord(), load(), MIN_FILE_PANEL_HEIGHT, setSqlFolder(), sqlFolders (+3 more)

### Community 80 - "withExecution"
Cohesion: 0.20
Nodes (14): tabExists(), beginQueryExecution(), cancelQueryConfirmation(), clearQueryResult(), executionForConsole(), finishQueryExecution(), requireQueryConfirmation(), setQueryCounting() (+6 more)

### Community 81 - "DataGrid.svelte"
Cohesion: 0.50
Nodes (3): for(), onMove(), onUp()

### Community 82 - "add-to-manifest.py"
Cohesion: 0.40
Nodes (3): json, Agrega el paquete de Arch a latest.json del release. tauri-action genera…, sys

### Community 83 - "parser.rs"
Cohesion: 0.25
Nodes (3): ParserError, Result, validate()

### Community 84 - "queryExecution.ts"
Cohesion: 0.28
Nodes (4): nextSort(), PageRequest, ExecuteQueryResponse, SortKey

### Community 85 - "credentials.ts"
Cohesion: 0.29
Nodes (3): forgetConnectionPassword(), runtimePasswords, @tauri-apps/api

### Community 87 - "+layout.svelte"
Cohesion: 0.20
Nodes (8): installDialogMotion(), initLocaleEffects(), reset(), app_src_lib_styles_tokens, handleSidebarFind(), onSidebarFindKeydown(), onSidebarHandleKeydown(), window

## Ambiguous Edges - Review These
- `CSS_VAR_NAMES field-to-CSS-variable mapping` → `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references
- `SHELL_PALETTES literal (datagrip/vscode x dark/light)` → `palettes.ts palette definitions (external reference, file not read in this chunk)`  [AMBIGUOUS]
  app/src/app.html · relation: references

## Knowledge Gaps
- **311 isolated node(s):** `name`, `version`, `description`, `license`, `type` (+306 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 616 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CSS_VAR_NAMES field-to-CSS-variable mapping` and `theme.ts SHELL_PALETTE_CSS_VARS (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `SHELL_PALETTES literal (datagrip/vscode x dark/light)` and `palettes.ts palette definitions (external reference, file not read in this chunk)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `svelte` connect `svelte` to `resultEdits.ts`, `queryConsoles.ts`, `theme.ts`, `sqlFiles.ts`, `connection.ts`, `connectionProfiles.ts`, `package.json`, `i18n/index.ts`, `stores/updates.ts`, `editorSearchPanel.ts`, `ResultPager.svelte`, `sidebarLayout.ts`, `gridClipboard.ts`, `editorSettings.ts`, `ref_app`, `reorder.ts`, `stores/shortcuts.ts`, `notifications.ts`, `ResultPane.svelte`, `sqlFolders.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Explorador de base de datos` connect `Explorador de base de datos` to `connection.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `SSL/TLS por conexión` connect `Explorador de base de datos` to `connectionProfiles.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _311 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `execution_guard.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.08585858585858586 - nodes in this community are weakly interconnected._