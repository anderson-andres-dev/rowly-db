<script lang="ts">
  import { onePerFrame } from "$lib/onePerFrame";
  import { get } from "svelte/store";
  import { focusZoneAction } from "$lib/focusZones";
  import { registerCommand, registerCommands } from "$lib/commands";
  import { tooltip } from "$lib/tooltip";
  import { tick } from "svelte";
  import { flip } from "svelte/animate";
  import { fade, fly } from "svelte/transition";
  import { CircleCheck, FileCode, Plus, SquareTerminal, Table, TriangleAlert, X } from "@lucide/svelte";
  import SqlEditor from "$lib/SqlEditor.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import ExecutionGuard from "$lib/components/ExecutionGuard.svelte";
  import ResultPane from "$lib/components/results/ResultPane.svelte";
  import TableDefinitionModal from "$lib/components/TableDefinitionModal.svelte";
  import type { CatalogTableRef } from "$lib/sqlDefinitionLink";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { activeEngine, catalogTables, connection, isProduction, refreshCatalog } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import { shortcuts } from "$lib/stores/shortcuts";

  import { extractFromContext } from "$lib/sqlSchema";
  import { queryHistory } from "$lib/stores/queryHistory";
  import { STANDARD_LEXICAL, type SqlLexical } from "$lib/sqlStatements";
  import { findParameters, parameterNames, substituteParameters } from "$lib/sqlParameters";
  import { parameterColumns, type ParameterColumn } from "$lib/sqlParameterTypes";
  import QueryHistory from "$lib/components/QueryHistory.svelte";
  import { defaultPageSize } from "$lib/stores/resultPaging";
  import { appendLog, executionLog } from "$lib/stores/executionLog";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import ParametersDialog from "$lib/components/ParametersDialog.svelte";
  import ChangesPreview from "$lib/components/results/ChangesPreview.svelte";
  import ExportDialog, { type ExportSummary } from "$lib/components/results/ExportDialog.svelte";
  import TableFilters from "$lib/components/results/TableFilters.svelte";
  import { copySettings } from "$lib/stores/copyFormat";
  import { numberFormat, t } from "$lib/i18n";
  import {
    addResultTab,
    consoleOfKey,
    pinnedResults,
    resultKey,
    setResultPinned,
  } from "$lib/stores/pinnedResults";
  import {
    EMPTY_EDITS,
    pendingCount,
  } from "$lib/resultEditing";
  import {
    editStateFor,
    resultEdits,
    commitResultEdits,
    undoResultEdit,
  } from "$lib/stores/resultEdits";
  import type {
    CatalogColumn,
    CatalogTable,
    ColumnCatalogInfo,
    QueryExecutionResult,
  } from "$lib/types";
  import {
    consoleDisplayTitle,
    activateQueryConsole,
    createQueryConsole,
    ensureQueryConsole,
    executionForConsole,
    isQueryConsoleDirty,
    queryConsoles,
    reorderQueryConsoles,
    setTableFilters,
    type QueryConsole,
    type TableTab,
    updateQueryConsoleSql,
    fileEncoding,
    setQueryConsoleEncoding,
  } from "$lib/stores/queryConsoles";
  import { flipDuration, moveItem, reorderable } from "$lib/reorder";
  import { dismissNotice, notice, notifyError, notifySuccess } from "$lib/stores/notifications";
  import {
    OUTPUT_TAB,
    createResultTabActions,
    firstFromTable,
    orderTabs,
    pinnedIdOf,
    replaceTabKey,
    visibleTab,
  } from "$lib/workspace/resultTabs";
  import { filterColumns, oneQueryAtATime, tableSql } from "$lib/workspace/tableQueries";
  import { createExecutionFlow, formatMs as formatDuration } from "$lib/workspace/executionSession";
  import { createResultChanges } from "$lib/workspace/resultChanges";
  import { createConsoleFiles } from "$lib/workspace/consoleFiles";

  const profileId = $derived($connection.profileId ?? "default");
  const consoles = $derived($queryConsoles.consoles.filter((item) => item.profileId === profileId));
  const activeId = $derived($queryConsoles.activeByProfile[profileId]);
  const activeConsole = $derived(consoles.find((item) => item.id === activeId));
  // --- Pestañas de resultado ------------------------------------------
  // Cada pestaña tiene su propio estado (resultado, pagina, total, cambios,
  // historial) guardado bajo su clave: la consola para la pestaña normal,
  // "<consola>#pin<n>" para cada fijada. `liveExecution` es la normal (la
  // que usa el editor); `execution` es la de la pestaña que se esta viendo.
  const pinnedTabs = $derived(activeConsole ? ($pinnedResults[activeConsole.id] ?? []) : []);
  const liveExecution = $derived(
    activeConsole ? executionForConsole($queryConsoles, activeConsole.id) : executionForConsole($queryConsoles, ""),
  );
  // "output" o la clave de la pestaña elegida, por consola.
  let selectedTabByConsole = $state<Record<string, string>>({});

  function tabExists(consoleId: string, tab: string): boolean {
    if (tab === OUTPUT_TAB) return true;
    if (tab === consoleId) return executionForConsole($queryConsoles, consoleId).result?.type === "resultSet";
    return ($pinnedResults[consoleId] ?? []).some((item) => resultKey(consoleId, item.id) === tab);
  }

  const selectedTab = $derived.by(() => {
    if (!activeConsole) return OUTPUT_TAB;
    const consoleId = activeConsole.id;
    return visibleTab(
      consoleId,
      selectedTabByConsole[consoleId],
      (tab) => tabExists(consoleId, tab),
      liveExecution.result?.type === "resultSet",
    );
  });

  function selectTab(consoleId: string, tab: string) {
    selectedTabByConsole = { ...selectedTabByConsole, [consoleId]: tab };
  }

  // Clave cuyo estado se muestra (con la Salida elegida, la normal).
  const viewKey = $derived(activeConsole ? (selectedTab === OUTPUT_TAB ? activeConsole.id : selectedTab) : "");
  const execution = $derived(executionForConsole($queryConsoles, viewKey));
  const activeProfile = $derived($connectionProfiles.find((profile) => profile.id === profileId));
  // Tabla principal (primer FROM) de la consulta que produjo el resultado
  // vigente — no la del texto actual del editor, que puede haber cambiado
  // desde la ejecucion. Solo resuelve el caso simple (sin JOIN); con varias
  // tablas se toma la primera, igual que el resto de heuristicas de
  // sqlSchema.ts.
  // firstFromTable complementa a extractFromContext, que es del
  // autocompletado y depende de la posicion del cursor: sobre el texto
  // entero a veces no resuelve una consulta simple.
  const resultTableName = $derived.by(() => {
    const sql = execution.resultSql;
    if (!sql) return undefined;
    return extractFromContext(sql, sql.length)?.table ?? firstFromTable(sql)?.table;
  });
  // Rotula un resultado como DataGrip: "schema.tabla". La fuente mas
  // confiable es el analisis de edicion del backend (AST + catalogo); si la
  // consulta no es editable, la primera tabla del FROM; sin tabla ("SELECT
  // 1"), "Resultado".
  function labelForKey(key: string): string | null {
    const sql = executionForConsole($queryConsoles, key).resultSql;
    if (!sql || !activeProfile) return null;
    const target = editStateFor($resultEdits, key).info?.target;
    if (target) return `${target.schema}.${target.table}`;
    const from = firstFromTable(sql);
    if (!from) return $t("workspace.result");
    return `${from.schema ?? (activeProfile.database || activeProfile.name)}.${from.table}`;
  }

  const resultSourceLabel = $derived(labelForKey(viewKey));

  // Orden de las pestañas de resultado (arrastrables), por consola: claves
  // en el orden en que el usuario las dejo. Las nuevas se agregan al final
  // y la normal conserva su lugar entre ejecuciones (su clave es la misma).
  let resultTabOrder = $state<Record<string, string[]>>({});

  // Fijadas primero (en el orden en que se fijaron) y la normal al final,
  // salvo que el usuario las haya reordenado.
  const resultTabs = $derived.by(() => {
    if (!activeConsole) return [];
    const consoleId = activeConsole.id;
    const tabs = pinnedTabs.map((item) => {
      const key = resultKey(consoleId, item.id);
      return { key, label: labelForKey(key) ?? $t("workspace.result"), pinned: item.pinned };
    });
    if (liveExecution.result?.type === "resultSet") {
      tabs.push({ key: consoleId, label: labelForKey(consoleId) ?? $t("workspace.result"), pinned: false });
    }
    return orderTabs(tabs, resultTabOrder[consoleId]);
  });

  function keepTabPosition(consoleId: string, fromKey: string, toKey: string) {
    const current = resultTabs.map((tab) => tab.key);
    resultTabOrder = { ...resultTabOrder, [consoleId]: replaceTabKey(resultTabOrder[consoleId], current, fromKey, toKey) };
  }

  // Fijar, desfijar, cerrar y olvidar (workspace/resultTabs.ts).
  const tabActions = createResultTabActions({
    selectTab,
    keepPosition: keepTabPosition,
    confirmDiscard: (key) => confirmDiscardPending(key),
  });
  const pinCurrentResult = tabActions.pin;
  const unpinTab = tabActions.unpin;
  const replaceableKeys = tabActions.replaceableKeys;
  const dropUnpinnedResults = tabActions.dropUnpinned;
  const forgetConsoleResults = tabActions.forgetConsole;
  const closeResultTab = tabActions.close;

  function reorderResultTabs(from: number, to: number) {
    if (!activeConsole) return;
    const keys = moveItem(
      resultTabs.map((tab) => tab.key),
      from,
      to,
    );
    resultTabOrder = { ...resultTabOrder, [activeConsole.id]: keys };
  }
  // Para cada columna del resultado que coincide (por nombre) con una
  // columna del catalogo ya cargado, expone si es PK/FK y su comentario —
  // sin pedirle nada nuevo al backend, reusando el catalogo que ya existe
  // para el arbol de tablas y el autocompletado.
  //
  // Busca en TODAS las tablas, no solo en resultTableName: con un JOIN
  // (USING/ON), columnas como "clie_codi" vienen de la tabla unida, no de
  // la primera del FROM, y resultTableName solo resuelve esa primera. Si
  // el mismo nombre de columna existe en mas de una tabla, gana
  // resultTableName cuando aplica (es la señal mas confiable de a que
  // tabla pertenece), y si no, la primera tabla del catalogo que la tenga.
  const resultColumnCatalogInfo = $derived.by((): Map<string, ColumnCatalogInfo> | null => {
    const tables = $catalogTables;
    if (tables.length === 0) return null;

    function toColumnInfo(column: CatalogColumn, table: CatalogTable): ColumnCatalogInfo {
      const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column.toLowerCase()));
      return {
        isPrimaryKey: column.isPrimaryKey,
        isForeignKey: fkColumns.has(column.name.toLowerCase()),
        comment: column.comment,
      };
    }

    const map = new Map<string, ColumnCatalogInfo>();
    for (const table of tables) {
      for (const column of table.columns) {
        const key = column.name.toLowerCase();
        if (!map.has(key)) map.set(key, toColumnInfo(column, table));
      }
    }

    const mainTable = tables.find((t) => t.name.toLowerCase() === resultTableName?.toLowerCase());
    if (mainTable) {
      for (const column of mainTable.columns) {
        map.set(column.name.toLowerCase(), toColumnInfo(column, mainTable));
      }
    }

    return map;
  });
  let tableDefinitionRequest = $state<CatalogTableRef | null>(null);
  // "schema@host", igual que resultSourceLabel usa "database || name" como
  // nombre de schema (ver mas abajo) - la misma convencion para las dos
  // etiquetas de origen que puede ver el usuario.
  const dataSourceLabel = $derived(
    activeProfile ? `${activeProfile.database || activeProfile.name}@${activeProfile.host}` : "",
  );
  let editorFraction = $state(0.6);
  let workspaceBody = $state<HTMLElement>();
  let tabMenu = $state<{ x: number; y: number; id: string } | null>(null);
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let renameInput = $state<HTMLInputElement>();

  function shortcutKeys(id: string): string {
    return $shortcuts.find((shortcut) => shortcut.id === id)?.keys ?? "";
  }

  const tabMenuItems = $derived.by((): ContextMenuItem[] => {
    const id = tabMenu?.id;
    if (!id) return [];
    const item = consoles.find((candidate) => candidate.id === id);
    if (!item) return [];
    return [
      {
        label: $t("workspace.rename"),
        shortcut: shortcutKeys("rename-query-console"),
        action: () => startRename(item.id, item.title),
      },
      // Una pestaña de tabla no tiene texto que guardar.
      ...(item.table
        ? []
        : [
            {
              label: $t("common.save"),
              shortcut: shortcutKeys("save-query-console"),
              separatorBefore: true,
              action: () => void files.save(item),
            },
            {
              label: $t("workspace.saveAs"),
              shortcut: shortcutKeys("save-query-console-as"),
              action: () => void files.saveAs(item),
            },
          ]),
      {
        label: $t(item.table ? "workspace.menu.closeTable" : item.filePath ? "workspace.menu.closeFile" : "workspace.menu.closeConsole"),
        shortcut: shortcutKeys("close-query-console"),
        separatorBefore: true,
        action: () => requestClose(item.id),
      },
      {
        label: $t("workspace.newConsole"),
        shortcut: shortcutKeys("new-query-console"),
        separatorBefore: true,
        action: () => {
          createQueryConsole(profileId);
        },
      },
      {
        label: $t("workspace.menu.openFile"),
        shortcut: shortcutKeys("open-sql-file"),
        action: () => void files.open(),
      },
    ];
  });

  // --- Archivos y cierre de consolas (workspace/consoleFiles.ts) ----------
  const files = createConsoleFiles({
    profileId: () => profileId,
    displayTitle: (title) => consoleDisplayTitle(title, $t),
    fallbackTitle: () => $t("workspace.consoleFallback"),
    confirmDiscard: (key) => confirmDiscardPending(key),
    forgetResults: forgetConsoleResults,
    notifyError,
  });
  const pendingClose = files.pendingClose;

  $effect(() => {
    ensureQueryConsole(profileId);
  });

  // --- Desborde de la barra de pestañas -----------------------------------
  // Las pestañas scrollean por debajo del boton "+" (que queda fijo a la
  // derecha); un desvanecido en cada borde con contenido oculto sugiere que
  // hay mas pestañas de ese lado.
  let tabsScroll = $state<HTMLDivElement>();
  let tabsOverflow = $state({ start: false, end: false });

  function updateTabsOverflow() {
    const el = tabsScroll;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    if (start !== tabsOverflow.start || end !== tabsOverflow.end) tabsOverflow = { start, end };
  }

  // La rueda vertical del mouse desplaza la barra en horizontal.
  function onTabsWheel(event: WheelEvent) {
    const el = tabsScroll;
    if (!el || el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }

  $effect(() => {
    const el = tabsScroll;
    if (!el) return;
    const observer = new ResizeObserver(updateTabsOverflow);
    observer.observe(el);
    // No pasivo a proposito: preventDefault evita que la rueda scrollee
    // tambien la pagina.
    el.addEventListener("wheel", onTabsWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onTabsWheel);
    };
  });

  // Al activar o crear una pestaña, la barra se desliza hasta dejarla a la
  // vista: una pestaña nueva entra por la derecha y empuja a las demas.
  // Espera a que termine la animacion de entrada (fly, 150ms) para medir el
  // ancho final.
  $effect(() => {
    const id = activeId;
    consoles.length;
    const el = tabsScroll;
    if (!id || !el) return;
    const timer = setTimeout(() => {
      const tab = el.querySelector<HTMLElement>(`[data-console-id="${CSS.escape(id)}"]`);
      tab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      updateTabsOverflow();
    }, 160);
    return () => clearTimeout(timer);
  });

  function closeConsole(event: Event, id: string) {
    event.stopPropagation();
    requestClose(id);
  }

  function openTabMenu(event: MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new Event("khipu:context-menu"));
    activateQueryConsole(profileId, id);
    tabMenu = { x: event.clientX, y: event.clientY, id };
  }

  async function startRename(id: string, title: string) {
    renamingId = id;
    renameValue = consoleDisplayTitle(title, $t);
    await tick();
    renameInput?.focus();
    renameInput?.select();
  }

  function finishRename(save: boolean) {
    const id = renamingId;
    renamingId = null;
    if (save && id) files.rename(id, renameValue);
  }

  function requestClose(id: string) {
    tabMenu = null;
    void files.requestClose(id);
  }

  // Comandos de las pestañas (lib/commands.ts); la tecla la pone
  // keybindings.ts. Con el modal de cerrar pendiente, ninguno aplica.
  $effect(() => {
    const whenIdle = (run: () => boolean | void) => () => $pendingClose === null && run() !== false;
    return registerCommands("global", {
      "new-query-console": whenIdle(() => {
        tabMenu = null;
        renamingId = null;
        createQueryConsole(profileId);
      }),
      "rename-query-console": whenIdle(() => {
        const item = activeConsole;
        if (!item) return false;
        void startRename(item.id, item.title);
      }),
      "save-query-console-as": whenIdle(() => {
        const item = activeConsole;
        if (!item || item.table) return false;
        void files.saveAs(item);
      }),
      "save-query-console": whenIdle(() => {
        const item = activeConsole;
        if (!item || item.table) return false;
        void files.save(item);
      }),
      "next-result-page": whenIdle(() => stepPage(1)),
      "previous-result-page": whenIdle(() => stepPage(-1)),
      "open-sql-file": whenIdle(() => {
        void files.open();
      }),
      "cancel-query": whenIdle(() => !!activeConsole && cancelExecution(activeConsole.id)),
      "query-history": whenIdle(() => {
        if (!activeConsole || activeConsole.table) return false;
        if (historyOpen) closeHistory(true);
        else historyOpen = true;
      }),
      "close-query-console": whenIdle(() => {
        const item = activeConsole;
        if (!item) return false;
        requestClose(item.id);
      }),
    });
  });

  // --- Pestañas de tabla ----------------------------------------------------
  // Doble clic en una tabla del explorador: sus datos a pantalla completa
  // (sin editor), con el constructor visual de filtros. Por dentro es una consulta
  // "SELECT * FROM tabla ..." en la pestaña, asi que tiene TODO lo del
  // resultado: editar, paginar, ordenar, buscar, exportar, fijar.
  let tableFilterError = $state<Record<string, string | null>>({});
  const tableLoadAttempted = new Set<string>();

  function quoteIdentifier(name: string): string {
    // Sin conexion no hay pestaña de tabla que armar.
    return $activeEngine ? $activeEngine.identifier(name) : name;
  }

  // Una sola consulta a la vez por pestaña (oneQueryAtATime); la vuelta
  // extra lee los filtros del store. La ejecucion es la del flujo.
  const runTableQuery = oneQueryAtATime(runTableQueryOnce);

  async function runTableQueryOnce(consoleId: string) {
    const item = get(queryConsoles).consoles.find((candidate) => candidate.id === consoleId);
    if (!item?.table) return;
    const error = await executions.table(consoleId, tableSql(item.table, quoteIdentifier));
    if (error !== undefined) tableFilterError = { ...tableFilterError, [consoleId]: error };
  }

  function applyTableFilters(consoleId: string, filters: Pick<TableTab, "where" | "conditions">) {
    setTableFilters(consoleId, filters);
    void runTableQuery(consoleId);
  }

  // Columnas que ofrece el constructor de filtros: las del catalogo (con su
  // tipo, para citar bien los valores); si la tabla no esta en el catalogo,
  // las del resultado.
  const tableFilterColumns = $derived(
    activeConsole?.table ? filterColumns(activeConsole.table, $catalogTables, liveExecution.result) : [],
  );

  // Al abrir (o volver a) una pestaña de tabla sin datos todavia, se carga.
  $effect(() => {
    const item = activeConsole;
    if (!item?.table || tableLoadAttempted.has(item.id)) return;
    if (liveExecution.result !== null || liveExecution.isExecuting) return;
    tableLoadAttempted.add(item.id);
    void runTableQuery(item.id);
  });

  // --- Buscar segun la zona activa ------------------------------------------
  // El comando find sale en la zona activa (foco o ultimo clic,
  // focusZones.ts), nunca en la que tiene el mouse encima: editor -> su
  // barra de buscar/reemplazar; resultado -> la barra del grid. El sidebar
  // lo resuelve +layout.svelte.
  let sqlEditor = $state<ReturnType<typeof SqlEditor>>();

  // Primer foco de una zona a la que se llega con el teclado (focusZones.ts).
  function focusIn(zone: HTMLElement, selector: string): boolean {
    const target = zone.querySelector<HTMLElement>(selector);
    target?.focus({ preventScroll: true });
    return !!target;
  }
  let resultPane = $state<ReturnType<typeof ResultPane>>();
  let editorPane = $state<HTMLElement>();
  let resultRegion = $state<HTMLElement>();

  $effect(() => {
    const cleanupEditor = registerCommand("find", "editor", () => {
      if (!sqlEditor) return false;
      sqlEditor.toggleSearch();
    });
    const cleanupResults = registerCommand("find", "results", () => {
      resultPane?.toggleFind();
    });
    const cleanupReplace = registerCommand("replace", "editor", () => {
      if (!sqlEditor) return false;
      sqlEditor.toggleReplace();
    });
    return () => {
      cleanupEditor();
      cleanupResults();
      cleanupReplace();
    };
  });

  // --- Salida -----------------------------------------------------------
  const logSchema = $derived(activeProfile ? activeProfile.database || activeProfile.name : "");

  const formatMs = (elapsedMs: number) => formatDuration(elapsedMs, (value) => $numberFormat.format(value));

  // --- Historial (Ctrl+E) ---------------------------------------------------
  // Capa flotante sobre el editor; al cerrarla, el foco vuelve al editor en
  // la posicion exacta del cursor.
  let historyOpen = $state(false);
  const historyEntries = $derived($queryHistory[profileId] ?? []);

  function closeHistory(refocusEditor: boolean) {
    historyOpen = false;
    if (refocusEditor) sqlEditor?.focus();
  }

  function insertFromHistory(sql: string) {
    historyOpen = false;
    sqlEditor?.insertAtCursor(sql);
  }

  function executeFromHistory(sql: string) {
    const consoleId = activeConsole?.id;
    closeHistory(true);
    if (consoleId) void requestExecution(consoleId, sql);
  }

  // --- Cambios del grid -------------------------------------------------
  // Borrador, vista previa y aplicacion (workspace/resultChanges.ts).
  const resultChanges = createResultChanges({
    text: (key, params) => $t(key, params),
    number: (value) => $numberFormat.format(value),
    schema: () => logSchema,
    production: () => $isProduction,
    notifyError,
    reload: (key) => void reloadResult(key),
  });
  const preview = resultChanges.preview;
  const applyingChanges = resultChanges.applying;
  const applyError = resultChanges.error;
  const discardPrompt = resultChanges.discardPrompt;
  const prepareResultEditing = resultChanges.prepare;
  const pendingEditsCount = resultChanges.pendingCount;
  const confirmDiscardPending = resultChanges.confirmDiscard;
  const openChangesPreview = resultChanges.openPreview;
  const submitChanges = resultChanges.submit;

  // --- Ejecucion --------------------------------------------------------
  // Pedir, confirmar, ejecutar, paginar, ordenar, recargar y scripts, con su
  // registro en la Salida (workspace/executionSession.ts). Cada ejecucion
  // lleva un id: mientras corre, cancelExecution() le pide al servidor que
  // la interrumpa; termina como "cancelada", no como error.
  const executions = createExecutionFlow({
    profileId: () => profileId,
    schema: () => logSchema,
    lexical: () => $activeEngine?.lexical ?? STANDARD_LEXICAL,
    text: (key, params) => $t(key, params),
    number: (value) => $numberFormat.format(value),
    defaultPageSize: () => $defaultPageSize,
    showTab: selectTab,
    resultReady: prepareResultEditing,
    confirmDiscard: confirmDiscardPending,
    replaceableKeys,
    dropUnpinned: dropUnpinnedResults,
    newScriptTab: (consoleId) => resultKey(consoleId, addResultTab(consoleId, false)),
    fillParameters,
    markStatement: (consoleId, index, outcome) => {
      if (activeConsole?.id === consoleId) sqlEditor?.markStatement(index, outcome);
    },
    refreshCatalog,
    notifyError,
  });
  const cancelling = executions.cancelling;
  const cancelExecution = executions.cancel;
  const requestExecution = executions.request;
  const confirmPendingExecution = executions.confirmPending;
  const cancelPendingExecution = executions.cancelPending;
  const reloadResult = executions.reload;
  const navigatePage = executions.navigate;
  const sortResult = executions.sort;
  const countTotalRows = executions.count;

  // --- Edicion del resultado -------------------------------------------
  const editState = $derived(activeConsole ? editStateFor($resultEdits, viewKey) : null);

  // --- Exportar datos ---------------------------------------------------
  // Clave de la pestaña que se exporta.
  let exportFor = $state<string | null>(null);
  const exportSource = $derived.by(() => {
    if (!exportFor) return null;
    const source = executionForConsole($queryConsoles, exportFor);
    if (source.result?.type !== "resultSet" || !source.resultSql) return null;
    return {
      label: labelForKey(exportFor) ?? $t("workspace.result"),
      sql: source.resultSql,
      sort: source.sort,
      result: source.result,
      tableName: exportTableName(exportFor),
    };
  });

  function exportTableName(key: string): string {
    const info = editStateFor($resultEdits, key).info;
    return info ? `${info.target.schema}.${info.target.table}` : (labelForKey(key) ?? $t("grid.defaultTableName"));
  }

  function onExported(key: string, summary: ExportSummary) {
    const one = summary.rows === 1;
    const params = { count: $numberFormat.format(summary.rows), path: summary.path };
    appendLog(consoleOfKey(key), {
      kind: "info",
      text: $t(one ? "workspace.output.exportedOne" : "workspace.output.exportedOther", {
        ...params,
        ms: formatMs(summary.elapsedMs),
      }),
    });
    notifySuccess($t(one ? "workspace.notify.exportedOne" : "workspace.notify.exportedOther", params));
  }

  // Ctrl+Alt+Abajo / Ctrl+Alt+Arriba.
  function stepPage(direction: 1 | -1): boolean {
    if (!activeConsole || execution.isExecuting) return false;
    const { page, result } = execution;
    if (!page?.pageable || result?.type !== "resultSet") return false;
    if (direction === 1 && !result.truncated) return false;
    if (direction === -1 && page.offset === 0) return false;
    const offset = Math.max(0, page.offset + direction * page.pageSize);
    void navigatePage(viewKey, offset, page.pageSize);
    return true;
  }

  // Parametros con nombre (:nombre, sqlParameters.ts): se piden antes de
  // ejecutar, cada uno con el tipo de la columna con que se compara
  // (sqlParameterTypes.ts, del catalogo ya cargado), y se reemplazan en el
  // texto. null: se cancelo el dialogo.
  let parametersPrompt = $state<{
    parameters: { name: string; column: ParameterColumn | null }[];
    lexical: SqlLexical;
    resolve: (values: Map<string, string> | null) => void;
  } | null>(null);

  function fillParameters(sql: string, lexical: SqlLexical): Promise<string | null> {
    const parameters = findParameters(sql, lexical);
    if (parameters.length === 0) return Promise.resolve(sql);
    const columns = parameterColumns(sql, parameters, lexical, $catalogTables);
    return new Promise((resolve) => {
      parametersPrompt = {
        parameters: parameterNames(parameters).map((name) => ({ name, column: columns.get(name) ?? null })),
        lexical,
        resolve: (values) => {
          parametersPrompt = null;
          resolve(values ? substituteParameters(sql, parameters, values) : null);
        },
      };
    });
  }

  function startResize(event: PointerEvent) {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    // A lo sumo un cambio de tamaño por cuadro (ver onePerFrame); el
    // rectangulo se mide una vez, no en cada pointermove.
    const rect = workspaceBody?.getBoundingClientRect();
    const live = onePerFrame((fraction: number) => (editorFraction = fraction));

    function onMove(moveEvent: PointerEvent) {
      if (!rect) return;
      const fraction = (moveEvent.clientY - rect.top) / rect.height;
      live.set(Math.min(0.85, Math.max(0.15, fraction)));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      live.flush();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onSplitterKeydown(event: KeyboardEvent) {
    const step = 0.02;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      editorFraction = Math.max(0.15, editorFraction - step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      editorFraction = Math.min(0.85, editorFraction + step);
    }
  }
</script>



<div class="workspace">
  <div class="console-tabs">
  <div
    class="tabs-scroll"
    use:reorderable={{ items: ".console-tab", onmove: (from, to) => reorderQueryConsoles(profileId, from, to) }}
    class:fade-start={tabsOverflow.start}
    class:fade-end={tabsOverflow.end}
    role="tablist"
    aria-label={$t("workspace.tabs.aria")}
    bind:this={tabsScroll}
    onscroll={updateTabsOverflow}
  >
    {#each consoles as item (item.id)}
      {@const dirty = isQueryConsoleDirty(item)}
      <div
        class="console-tab"
        data-console-id={item.id}
        class:active={item.id === activeId}
        class:dirty
        role="tab"
        tabindex="0"
        aria-selected={item.id === activeId}
        onclick={() => activateQueryConsole(profileId, item.id)}
        oncontextmenu={(event) => openTabMenu(event, item.id)}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ") activateQueryConsole(profileId, item.id);
        }}
        animate:flip={{ duration: flipDuration(150) }}
        in:fly={{ x: -8, duration: 150 }}
        out:fade={{ duration: 120 }}
      >
        {#if item.table}
          <Table size={13} class="console-tab-icon" aria-hidden="true" />
        {:else if item.filePath}
          <FileCode size={13} class="console-tab-icon" aria-hidden="true" />
        {:else}
          <SquareTerminal size={13} class="console-tab-icon" aria-hidden="true" />
        {/if}
        {#if renamingId === item.id}
          <input
            class="rename-input"
            aria-label={$t("workspace.tabs.renameAria")}
            bind:this={renameInput}
            bind:value={renameValue}
            onclick={(event) => event.stopPropagation()}
            onkeydown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") finishRename(true);
              if (event.key === "Escape") finishRename(false);
            }}
            onblur={() => finishRename(true)}
          />
        {:else}
          <span
            class="console-tab-title"
            use:tooltip={item.table ? `${item.table.schema}.${item.table.name}` : (item.filePath ?? undefined)}>{consoleDisplayTitle(item.title, $t)}</span
          >
        {/if}
        <button
          type="button"
          class="close-tab"
          aria-label={$t(dirty ? "workspace.tabs.closeDirty" : "workspace.tabs.close", { title: consoleDisplayTitle(item.title, $t) })}
          use:tooltip={dirty
            ? $t(item.filePath ? "workspace.tabs.unsavedFile" : "workspace.tabs.unsavedConsole", {
                shortcut: shortcutKeys("save-query-console"),
              })
            : undefined}
          onclick={(event) => closeConsole(event, item.id)}
        >
          <span class="dirty-dot" aria-hidden="true"></span>
          <X size={12} class="close-icon" aria-hidden="true" />
        </button>
      </div>
    {/each}
  </div>
    <button
      type="button"
      class="new-console"
      use:tooltip={$t("workspace.tabs.newTitle", { shortcut: shortcutKeys("new-query-console") })}
      aria-label={$t("workspace.tabs.newAria")}
      onclick={() => createQueryConsole(profileId)}
    >
      <Plus size={14} aria-hidden="true" />
    </button>
  </div>
  {#if !activeConsole}
    <div class="workspace-empty" in:fade={{ duration: 150 }}>
      <SquareTerminal size={30} strokeWidth={1.25} class="workspace-empty-icon" aria-hidden="true" />
      <div class="workspace-empty-actions">
        <button type="button" onclick={() => createQueryConsole(profileId)}>
          <span>{$t("workspace.newConsole")}</span>
          <kbd>{shortcutKeys("new-query-console")}</kbd>
        </button>
        <button type="button" onclick={() => void files.open()}>
          <span>{$t("workspace.openFile")}</span>
          <kbd>{shortcutKeys("open-sql-file")}</kbd>
        </button>
      </div>
    </div>
  {:else}
  <section class="workspace-body" bind:this={workspaceBody}>
    {#if !activeConsole?.table}
    <div
      class="editor-pane"
      bind:this={editorPane}
      use:focusZoneAction={{ zone: "editor", focusDefault: (zone) => focusIn(zone, ".cm-content") }}
      style={`flex-basis: ${editorFraction * 100}%`}
    >
      <!-- Una consola grande cuyo texto todavia se lee del disco (al
           arrancar) no monta el editor hasta tenerlo. -->
      {#if activeConsole && !activeConsole.textPending}
        <div class="editor-host">
          {#key activeConsole.id}
            <SqlEditor
              bind:this={sqlEditor}
              value={activeConsole.sql}
              onchange={(sql) => updateQueryConsoleSql(activeConsole.id, sql)}
              onexecute={(sql) => requestExecution(activeConsole.id, sql)}
              executing={liveExecution.isExecuting}
              result={liveExecution.result}
              onopentabledefinition={(ref) => (tableDefinitionRequest = ref)}
            />
          {/key}
        </div>

        {#if historyOpen}
          <QueryHistory
            entries={historyEntries}
            oninsert={insertFromHistory}
            onexecute={executeFromHistory}
            onclose={closeHistory}
          />
        {/if}
      {/if}
    </div>
    {#if liveExecution.pendingConfirmation && activeConsole}
      <!-- Cada confirmacion nueva abre su propio modal. -->
      {#key liveExecution.pendingConfirmation}
        <ExecutionGuard
          count={liveExecution.pendingConfirmation.script?.statements.length ?? 1}
          production={$isProduction}
          oncancel={() => cancelPendingExecution(activeConsole.id)}
          onconfirm={() => confirmPendingExecution(activeConsole.id)}
        />
      {/key}
    {/if}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(editorFraction * 100)}
      aria-valuemin={15}
      aria-valuemax={85}
      tabindex="0"
      onpointerdown={startResize}
      onkeydown={onSplitterKeydown}
    ></div>
    {/if}
    <div
      class="result-region"
      bind:this={resultRegion}
      use:focusZoneAction={{ zone: "results", focusDefault: (zone) => focusIn(zone, '[role="grid"]') }}
    >
      <ResultPane
        bind:this={resultPane}
        isExecuting={execution.isExecuting}
        result={execution.result}
        resultSql={execution.resultSql}
        resultAt={execution.resultAt}
        sourceLabel={resultSourceLabel}
        columnCatalogInfo={resultColumnCatalogInfo}
        page={execution.page}
        totalRows={execution.totalRows}
        counting={execution.counting}
        nextPageShortcut={shortcutKeys("next-result-page")}
        previousPageShortcut={shortcutKeys("previous-result-page")}
        onnavigate={(offset, pageSize) => void navigatePage(viewKey, offset, pageSize)}
        sort={execution.sort}
        onsort={(column, additive) => void sortResult(viewKey, column, additive)}
        oncount={() => countTotalRows(viewKey)}
        editInfo={editState?.info ?? null}
        editBlockedReason={editState?.blockedReason ?? null}
        edits={editState?.edits ?? EMPTY_EDITS}
        onedits={(edits, at) => commitResultEdits(viewKey, edits, at)}
        lastEditStep={editState?.history.at(-1) ?? null}
        onundo={() => undoResultEdit(viewKey)}
        onreload={() => void reloadResult(viewKey)}
        outputLog={activeConsole ? ($executionLog[activeConsole.id] ?? []) : []}
        consoleRunning={liveExecution.isExecuting}
        oncancelquery={() => activeConsole && cancelExecution(activeConsole.id)}
        cancellingQuery={!!activeConsole && $cancelling[activeConsole.id] === true}
        tabs={resultTabs}
        activeTab={selectedTab}
        onselecttab={(tab) => activeConsole && selectTab(activeConsole.id, tab)}
        onreordertabs={reorderResultTabs}
        onclosetab={(key) => void closeResultTab(key)}
        onexport={() => (exportFor = viewKey)}
        onpin={() => activeConsole && pinCurrentResult(activeConsole.id)}
        fileEncoding={activeConsole && !activeConsole.table ? fileEncoding(activeConsole) : null}
        onencodingchange={(encoding) => activeConsole && setQueryConsoleEncoding(activeConsole.id, encoding)}
        onunpin={() => unpinTab(viewKey)}
        onrepin={() => {
          const id = pinnedIdOf(viewKey);
          if (activeConsole && id !== null) setResultPinned(activeConsole.id, id, true);
        }}
        onpreview={() => void openChangesPreview(viewKey)}
        onsubmit={() => void submitChanges(viewKey)}
        onnotice={notifyError}
        filters={activeConsole?.table ? tableFiltersBar : undefined}
        tableView={!!activeConsole?.table}
        filterCount={activeConsole?.table?.where ? activeConsole.table.conditions.filter((condition) => condition.column).length : 0}
        filterError={!!(activeConsole && tableFilterError[activeConsole.id])}
      />
      {#snippet tableFiltersBar()}
        {#if activeConsole?.table && $activeEngine}
          {@const consoleId = activeConsole.id}
          {@const table = activeConsole.table}
          <TableFilters
            filters={table}
            columns={tableFilterColumns}
            engine={$activeEngine}
            error={tableFilterError[consoleId] ?? null}
            busy={liveExecution.isExecuting}
            onapply={(filters) => applyTableFilters(consoleId, filters)}
            onclose={() => resultPane?.closeFilters()}
          />
        {/if}
      {/snippet}
    </div>
  </section>
  {/if}
</div>

{#if tableDefinitionRequest}
  <TableDefinitionModal
    dataSource={dataSourceLabel}
    schema={tableDefinitionRequest.schema}
    table={tableDefinitionRequest.table}
    onclose={() => (tableDefinitionRequest = null)}
  />
{/if}

{#if tabMenu}
  <ContextMenu
    x={tabMenu.x}
    y={tabMenu.y}
    items={tabMenuItems}
    onclose={() => (tabMenu = null)}
  />
{/if}

{#if parametersPrompt}
  {@const prompt = parametersPrompt}
  <ParametersDialog
    parameters={prompt.parameters}
    lexical={prompt.lexical}
    onconfirm={(values) => prompt.resolve(values)}
    oncancel={() => prompt.resolve(null)}
  />
{/if}

{#if $discardPrompt}
  {@const prompt = $discardPrompt}
  <ConfirmDialog
    title={$t("workspace.discard.title")}
    message={$t("workspace.discard.message")}
    confirmLabel={$t("common.discard")}
    onconfirm={() => prompt.resolve(true)}
    oncancel={() => prompt.resolve(false)}
  />
{/if}

{#if exportFor && exportSource}
  {@const consoleId = exportFor}
  <ExportDialog
    source={exportSource.label}
    sql={exportSource.sql}
    sort={exportSource.sort}
    columns={exportSource.result.columns}
    rows={exportSource.result.rows}
    tableName={exportSource.tableName}
    initialFormat={$copySettings.format}
    initialHeaders={$copySettings.headers}
    onexported={(summary) => onExported(consoleId, summary)}
    oncopied={(count) =>
      notifySuccess(
        $t(count === 1 ? "workspace.notify.copiedOne" : "workspace.notify.copiedOther", {
          count: $numberFormat.format(count),
        }),
      )}
    onclose={() => (exportFor = null)}
  />
{/if}

{#if $preview}
  {@const current = $preview}
  <ChangesPreview
    statements={current.statements}
    changes={current.changes}
    applying={$applyingChanges}
    error={$applyError}
    dismiss={current.dismiss}
    production={$isProduction}
    onapply={() => void submitChanges(current.consoleId, true)}
    onclose={resultChanges.closePreview}
  />
{/if}

{#if $notice}
  {@const current = $notice}
  <div class="notice" class:success={current.kind === "success"} role="alert" transition:fly={{ y: 8, duration: 160 }}>
    {#if current.kind === "success"}
      <CircleCheck size={14} class="notice-icon" aria-hidden="true" />
    {:else}
      <TriangleAlert size={14} class="notice-icon" aria-hidden="true" />
    {/if}
    <span>{current.message}</span>
    <button type="button" class="notice-close" aria-label={$t("workspace.notice.close")} onclick={() => dismissNotice(current.id)}>
      <X size={12} aria-hidden="true" />
    </button>
  </div>
{/if}

{#if $pendingClose}
  <ConfirmDialog
    tone="warning"
    title={$t("workspace.close.title", { title: $pendingClose.title })}
    message={$t("workspace.close.message")}
    confirmLabel={$t("common.save")}
    alternateLabel={$t("common.discard")}
    onconfirm={() => void files.saveAndClose()}
    onalternate={files.discardAndClose}
    oncancel={files.cancelClose}
  />
{/if}

<style>
  .workspace {
    display: flex;
    min-height: 0;
    height: 100%;
    flex-direction: column;
  }

  .console-tabs {
    display: flex;
    min-width: 0;
    min-height: 2.25rem;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  /* El scroll es nativo (rueda, trackpad, arrastre) pero sin barra visible:
     el desvanecido de los bordes ya indica que hay mas pestañas. */
  .tabs-scroll {
    --fade: 2rem;
    display: flex;
    min-width: 0;
    flex: 0 1 auto;
    align-items: center;
    gap: var(--space-1);
    overflow-x: auto;
    scrollbar-width: none;
    scroll-padding-inline: var(--fade);
  }

  .tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .tabs-scroll.fade-end {
    mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
  }

  .tabs-scroll.fade-start {
    mask-image: linear-gradient(to right, transparent, #000 var(--fade));
  }

  .tabs-scroll.fade-start.fade-end {
    mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
  }

  .console-tab,
  .new-console {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    min-height: 1.75rem;
    box-sizing: border-box;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  /* Pestaña tomada al arrastrar (reorder.ts): por encima de las demas, con
     una sombra sutil. */
  .console-tab:global(.reorder-dragging) {
    /* Sin fondo propio, al arrastrarla se veria vacia. */
    background: var(--surface-elevated);
    position: relative;
    z-index: 2;
    box-shadow: var(--shadow-elevated);
    cursor: grabbing;
  }

  .console-tab {
    gap: var(--space-2);
    min-width: 7rem;
    padding: 0 var(--space-2) 0 var(--space-3);
  }

  /* Mismo resaltado que las pestañas del resultado (ResultPane): sin
     bordes; en reposo solo texto e icono, la activa con un relleno tenue y
     su icono en acento. */
  .console-tab:hover,
  .new-console:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  .console-tab.active {
    background: color-mix(in srgb, var(--text-primary) 9%, transparent);
    color: var(--text-primary);
  }

  .console-tab:focus-visible,
  .new-console:focus-visible,
  .close-tab:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .console-tab :global(.console-tab-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
    opacity: 0.8;
  }

  .console-tab.active :global(.console-tab-icon) {
    color: var(--accent);
    opacity: 1;
  }

  .console-tab-title {
    white-space: nowrap;
  }

  /* Boton de cierre de tamaño fijo: la bolita de "sin guardar" y la X
     ocupan el mismo lugar, asi la pestaña no cambia de ancho al alternar.
     Con cambios pendientes se ve la bolita; al pasar el mouse por la
     pestaña (o enfocar el boton) se cambia por la X, como en los editores
     de codigo. */
  .close-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .dirty-dot {
    position: absolute;
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent);
    opacity: 0;
    transform: scale(0.4);
    transition:
      opacity 140ms ease,
      transform 180ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .close-tab :global(.close-icon) {
    transition: opacity 120ms ease;
  }

  .console-tab.dirty .dirty-dot {
    opacity: 1;
    transform: scale(1);
  }

  .console-tab.dirty .close-tab :global(.close-icon) {
    opacity: 0;
  }

  .console-tab.dirty:hover .dirty-dot,
  .console-tab.dirty .close-tab:focus-visible .dirty-dot {
    opacity: 0;
    transform: scale(0.4);
  }

  .console-tab.dirty:hover .close-tab :global(.close-icon),
  .console-tab.dirty .close-tab:focus-visible :global(.close-icon) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .dirty-dot,
    .close-tab :global(.close-icon) {
      transition: none;
    }
  }

  .rename-input {
    width: 7rem;
    min-width: 0;
    padding: 2px var(--space-1);
    border: 1px solid var(--focus-ring);
    border-radius: calc(var(--radius-sm) - 2px);
    outline: none;
    background: var(--surface);
    color: var(--text-primary);
    font: inherit;
  }

  .close-tab:hover {
    background: var(--surface);
  }

  .new-console {
    width: 1.75rem;
    background: transparent;
  }

  /* Fijo a la derecha de las pestañas; cuando desbordan, las pestañas
     pasan por debajo del desvanecido y el boton no se mueve. */
  .console-tabs > .new-console {
    flex-shrink: 0;
  }

  /* Sin pestañas abiertas: accesos directos centrados, al estilo de la
     pantalla vacia de un editor. */
  .workspace-empty {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-5);
    background: var(--surface-content);
    user-select: none;
  }

  .workspace-empty :global(.workspace-empty-icon) {
    color: color-mix(in srgb, var(--text-secondary) 55%, transparent);
  }

  .workspace-empty-actions {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 15rem;
  }

  .workspace-empty-actions button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-5);
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .workspace-empty-actions button:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .workspace-empty-actions button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .workspace-empty-actions kbd {
    color: color-mix(in srgb, var(--text-secondary) 75%, transparent);
    font: inherit;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .workspace-body {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-pane {
    position: relative;
    display: flex;
    min-height: 0;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
  }

  .editor-host {
    position: relative;
    min-height: 0;
    flex: 1;
  }



  /* Una franja de 6px para agarrar comodo con el mouse, pero solo pinta una
     linea de 1px centrada adentro (no un bloque con borde arriba y abajo:
     dos lineas a 4px de distancia se leen como una "linea doblada", no
     como una barra). El resto de la franja es hit-area invisible. */
  .splitter {
    position: relative;
    flex-shrink: 0;
    height: 6px;
    background: transparent;
    cursor: row-resize;
    touch-action: none;
  }

  .splitter::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
    transform: translateY(-50%);
  }

  .splitter:hover::after,
  .splitter:focus-visible::after {
    background: var(--accent);
  }

  .splitter:focus-visible {
    outline: none;
  }

  .result-region {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .notice {
    position: fixed;
    right: var(--space-4);
    bottom: var(--space-4);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    max-width: min(26rem, calc(100vw - 2rem));
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
    box-sizing: border-box;
    border: 1px solid color-mix(in srgb, var(--danger) 35%, var(--border));
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .notice :global(.notice-icon) {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--danger);
  }

  .notice.success {
    border-color: color-mix(in srgb, var(--success) 35%, var(--border));
  }

  .notice.success :global(.notice-icon) {
    color: var(--success);
  }

  .notice span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .notice-close {
    display: inline-flex;
    flex-shrink: 0;
    padding: 2px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .notice-close:hover {
    background: var(--surface);
    color: var(--text-primary);
  }
</style>
