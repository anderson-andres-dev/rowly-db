<script lang="ts">
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
  import { catalogTables, connection, isProduction } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import { eventMatchesShortcut, shortcuts } from "$lib/stores/shortcuts";
  import { extractFromContext } from "$lib/sqlSchema";
  import { countQueryRows, executeQuery, type PageRequest } from "$lib/queryExecution";
  import { defaultPageSize } from "$lib/stores/resultPaging";
  import { appendLog, executionLog, forgetLog } from "$lib/stores/executionLog";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import ChangesPreview from "$lib/components/results/ChangesPreview.svelte";
  import ExportDialog, { type ExportSummary } from "$lib/components/results/ExportDialog.svelte";
  import TableFilters from "$lib/components/results/TableFilters.svelte";
  import { copySettings } from "$lib/stores/copyFormat";
  import { numberFormat, t } from "$lib/i18n";
  import {
    addPinnedTab,
    consoleOfKey,
    forgetPinnedResults,
    pinnedResults,
    removePinnedTab,
    resultKey,
    setResultPinned,
    unpinnedTabs,
  } from "$lib/stores/pinnedResults";
  import {
    EMPTY_EDITS,
    applyChanges,
    buildChanges,
    fetchEditInfo,
    pendingCount,
    previewChanges,
    type ChangeError,
    type EditTarget,
    type ResultChanges,
  } from "$lib/resultEditing";
  import {
    editStateFor,
    forgetResultEdits,
    resetResultEdits,
    resultEdits,
    setResultEditInfo,
    clearResultPendingEdits,
    commitResultEdits,
    undoResultEdit,
    moveResultEdits,
  } from "$lib/stores/resultEdits";
  import type {
    CatalogColumn,
    CatalogTable,
    ColumnCatalogInfo,
    DestructiveStatement,
    ExecuteQueryResponse,
    QueryExecutionResult,
  } from "$lib/types";
  import {
    consoleDisplayTitle,
    activateQueryConsole,
    beginQueryExecution,
    cancelQueryConfirmation,
    closeQueryConsole,
    createQueryConsole,
    ensureQueryConsole,
    executionForConsole,
    finishQueryExecution,
    isQueryConsoleDirty,
    queryConsoles,
    renameQueryConsole,
    reorderQueryConsoles,
    setTableFilters,
    type QueryConsole,
    requireQueryConfirmation,
    setQueryCounting,
    setQuerySort,
    clearQueryResult,
    forgetExecutionState,
    moveExecutionState,
    stopQueryExecution,
    setQueryTotalRows,
    takeQueryConfirmation,
    updateQueryConsoleSql,
  } from "$lib/stores/queryConsoles";
  import { openSqlFileWithDialog, renameConsoleFile, saveConsole, saveConsoleAs } from "$lib/sqlFiles";
  import { flipDuration, moveItem, reorderable } from "$lib/reorder";
  import { nextSort } from "$lib/gridSort";
  import { dismissNotice, notice, notifyError, notifySuccess } from "$lib/stores/notifications";

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
    if (tab === "output") return true;
    if (tab === consoleId) return executionForConsole($queryConsoles, consoleId).result?.type === "resultSet";
    return ($pinnedResults[consoleId] ?? []).some((item) => resultKey(consoleId, item.id) === tab);
  }

  const selectedTab = $derived.by(() => {
    if (!activeConsole) return "output";
    const chosen = selectedTabByConsole[activeConsole.id];
    if (chosen && tabExists(activeConsole.id, chosen)) return chosen;
    return liveExecution.result?.type === "resultSet" ? activeConsole.id : "output";
  });

  function selectTab(consoleId: string, tab: string) {
    selectedTabByConsole = { ...selectedTabByConsole, [consoleId]: tab };
  }

  // Clave cuyo estado se muestra (con la Salida elegida, la normal).
  const viewKey = $derived(activeConsole ? (selectedTab === "output" ? activeConsole.id : selectedTab) : "");
  const execution = $derived(executionForConsole($queryConsoles, viewKey));
  const activeProfile = $derived($connectionProfiles.find((profile) => profile.id === profileId));
  // Tabla principal (primer FROM) de la consulta que produjo el resultado
  // vigente — no la del texto actual del editor, que puede haber cambiado
  // desde la ejecucion. Solo resuelve el caso simple (sin JOIN); con varias
  // tablas se toma la primera, igual que el resto de heuristicas de
  // sqlSchema.ts.
  // Primera tabla despues de FROM, tal como esta escrita (con su schema si
  // lo trae), sin comillas. extractFromContext es del autocompletado y
  // depende de la posicion del cursor: sobre el texto entero a veces no
  // resuelve una consulta simple.
  function firstFromTable(sql: string): { schema?: string; table: string } | undefined {
    const match = /\bfrom\s+((?:[`"]?[\w$]+[`"]?\s*\.\s*)?[`"]?[\w$]+[`"]?)/i.exec(sql);
    if (!match) return undefined;
    const parts = match[1].split(".").map((part) => part.trim().replace(/^[`"]|[`"]$/g, ""));
    return parts.length === 2 ? { schema: parts[0], table: parts[1] } : { table: parts[0] };
  }

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
    const order = resultTabOrder[consoleId];
    if (!order) return tabs;
    const rank = (key: string) => {
      const index = order.indexOf(key);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return tabs
      .map((tab, index) => ({ tab, index }))
      .sort((a, b) => rank(a.tab.key) - rank(b.tab.key) || a.index - b.index)
      .map(({ tab }) => tab);
  });

  // Cuando una pestaña cambia de clave (fijar: la normal pasa a ser una
  // fijada; desfijar sin otra normal: al reves) conserva su lugar: se
  // reemplaza una clave por la otra en el orden, en la misma posicion.
  // Nada se reacomoda solo; lo nuevo va al final.
  function keepTabPosition(consoleId: string, fromKey: string, toKey: string) {
    const current = resultTabs.map((tab) => tab.key);
    const order = (resultTabOrder[consoleId] ?? current).map((key) => (key === fromKey ? toKey : key));
    if (!order.includes(toKey)) order.push(toKey);
    resultTabOrder = { ...resultTabOrder, [consoleId]: order };
  }

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
  let pendingCloseId = $state<string | null>(null);
  // Titulo congelado al abrir: si la consola se cierra (Descartar) mientras
  // el modal se desvanece, el titulo no debe cambiar a mitad de animacion.
  let closeDialogTitle = $state("");

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
              action: () => void runFileAction(() => saveConsole(item)),
            },
            {
              label: $t("workspace.saveAs"),
              shortcut: shortcutKeys("save-query-console-as"),
              action: () => void runFileAction(() => saveConsoleAs(item)),
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
        action: () => void runFileAction(() => openSqlFileWithDialog(profileId)),
      },
    ];
  });

  // Las acciones de archivo (dialogos + disco) son asincronas y pueden
  // fallar por permisos, disco lleno, etc.: el error se muestra como aviso
  // en vez de perderse en la consola del navegador.
  async function runFileAction(action: () => Promise<boolean | void>): Promise<boolean> {
    try {
      return (await action()) !== false;
    } catch (error) {
      notifyError(error);
      return false;
    }
  }

  function currentConsole(id: string) {
    return $queryConsoles.consoles.find((item) => item.id === id);
  }

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
    void requestClose(id);
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
    if (!save || !id) return;
    // Confirmar sin cambios el nombre por defecto traducido no debe guardarlo
    // traducido: se perdería el "consola_N" del que depende la numeración.
    const original = currentConsole(id)?.title;
    if (original !== undefined && renameValue === consoleDisplayTitle(original, $t)) return;
    // En un archivo, cambiar el nombre renombra el archivo en disco.
    if (currentConsole(id)?.filePath) {
      void runFileAction(() => renameConsoleFile(id, renameValue));
    } else {
      renameQueryConsole(id, renameValue);
    }
  }

  async function requestClose(id: string) {
    tabMenu = null;
    if (!(await confirmDiscardPending(id))) return;
    const item = consoles.find((candidate) => candidate.id === id);
    // Solo se pregunta cuando cerrar perderia algo.
    if (item && !isQueryConsoleDirty(item)) {
      closeQueryConsole(profileId, id);
      forgetResultEdits(id);
      forgetLog(id);
      forgetConsoleResults(id);
      return;
    }
    closeDialogTitle = item ? consoleDisplayTitle(item.title, $t) : $t("workspace.consoleFallback");
    pendingCloseId = id;
  }

  // Las tres respuestas llegan cuando el aviso (ConfirmDialog) termino de
  // cerrarse.
  function cancelClose() {
    pendingCloseId = null;
  }

  function discardAndClose() {
    const id = pendingCloseId;
    pendingCloseId = null;
    if (!id) return;
    closeQueryConsole(profileId, id);
    forgetResultEdits(id);
    forgetLog(id);
    forgetConsoleResults(id);
  }

  // Guarda (con el dialogo de "Guardar como" si es una consola) y recien
  // despues cierra; si el usuario cancela el dialogo o falla el disco, la
  // pestaña queda abierta.
  async function saveAndClose() {
    const id = pendingCloseId;
    pendingCloseId = null;
    const item = id ? currentConsole(id) : undefined;
    if (!id || !item) return;
    if (await runFileAction(() => saveConsole(item))) {
      closeQueryConsole(profileId, id);
      forgetResultEdits(id);
      forgetLog(id);
      forgetConsoleResults(id);
    }
  }

  function handleConsoleShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || pendingCloseId !== null) return;
    if (event.target instanceof Element && event.target.closest("dialog")) return;

    const newConsoleKeys = shortcutKeys("new-query-console");
    if (newConsoleKeys && eventMatchesShortcut(event, newConsoleKeys)) {
      event.preventDefault();
      tabMenu = null;
      renamingId = null;
      createQueryConsole(profileId);
      return;
    }

    const renameKeys = shortcutKeys("rename-query-console");
    if (renameKeys && activeConsole && eventMatchesShortcut(event, renameKeys)) {
      event.preventDefault();
      void startRename(activeConsole.id, activeConsole.title);
      return;
    }

    const saveAsKeys = shortcutKeys("save-query-console-as");
    if (saveAsKeys && activeConsole && !activeConsole.table && eventMatchesShortcut(event, saveAsKeys)) {
      event.preventDefault();
      const item = activeConsole;
      void runFileAction(() => saveConsoleAs(item));
      return;
    }

    const saveKeys = shortcutKeys("save-query-console");
    if (saveKeys && activeConsole && !activeConsole.table && eventMatchesShortcut(event, saveKeys)) {
      event.preventDefault();
      const item = activeConsole;
      void runFileAction(() => saveConsole(item));
      return;
    }

    const nextPageKeys = shortcutKeys("next-result-page");
    if (nextPageKeys && eventMatchesShortcut(event, nextPageKeys)) {
      if (stepPage(1)) event.preventDefault();
      return;
    }

    const previousPageKeys = shortcutKeys("previous-result-page");
    if (previousPageKeys && eventMatchesShortcut(event, previousPageKeys)) {
      if (stepPage(-1)) event.preventDefault();
      return;
    }

    const openKeys = shortcutKeys("open-sql-file");
    if (openKeys && eventMatchesShortcut(event, openKeys)) {
      event.preventDefault();
      void runFileAction(() => openSqlFileWithDialog(profileId));
      return;
    }

    const closeKeys = shortcutKeys("close-query-console");
    if (closeKeys && activeConsole && eventMatchesShortcut(event, closeKeys)) {
      event.preventDefault();
      void requestClose(activeConsole.id);
    }
  }

  // --- Pestañas de tabla ----------------------------------------------------
  // Doble clic en una tabla del explorador: sus datos a pantalla completa
  // (sin editor), con filtros WHERE / ORDER BY. Por dentro es una consulta
  // "SELECT * FROM tabla ..." en la pestaña, asi que tiene TODO lo del
  // resultado: editar, paginar, ordenar, buscar, exportar, fijar.
  let tableFilterError = $state<Record<string, string | null>>({});
  const tableLoadAttempted = new Set<string>();

  function quoteIdentifier(name: string): string {
    if (/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name)) return name;
    return activeProfile?.driver === "postgres" ? `"${name.replace(/"/g, '""')}"` : `\`${name.replace(/`/g, "``")}\``;
  }

  function tableSql(item: QueryConsole): string {
    const table = item.table;
    if (!table) return "";
    const parts = [`SELECT * FROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`];
    if (table.where.trim()) parts.push(`WHERE ${table.where.trim()}`);
    if (table.orderBy.trim()) parts.push(`ORDER BY ${table.orderBy.trim()}`);
    return parts.join(" ");
  }

  // Un filtro con error no borra lo que se estaba viendo: el error queda al
  // lado de los filtros y en la Salida.
  async function runTableQuery(consoleId: string) {
    const item = consoles.find((candidate) => candidate.id === consoleId);
    if (!item?.table) return;
    if (!(await confirmDiscardPending(replaceableKeys(consoleId))) || !beginQueryExecution(consoleId)) return;
    setQuerySort(consoleId, []);
    const sql = tableSql(item);
    const startedAt = Date.now();
    const started = performance.now();
    const response = await executeQuery(sql, null, firstPage(consoleId));
    if (response.type !== "completed") {
      applyExecuteQueryResponse(consoleId, sql, response);
      return;
    }
    appendLog(consoleId, { kind: "query", schema: logSchema, text: sql, at: startedAt });
    appendLog(consoleId, {
      kind: response.result.type === "error" ? "error" : "info",
      text: describeOutcome(response.result, response.page?.offset ?? 0, performance.now() - started),
    });
    const hadRows = executionForConsole($queryConsoles, consoleId).result?.type === "resultSet";
    if (response.result.type === "error") {
      tableFilterError = { ...tableFilterError, [consoleId]: describeOutcome(response.result, 0, 0) };
      if (hadRows) {
        stopQueryExecution(consoleId);
        return;
      }
    } else {
      tableFilterError = { ...tableFilterError, [consoleId]: null };
    }
    applyExecuteQueryResponse(consoleId, sql, response);
    selectTab(consoleId, response.result.type === "resultSet" ? consoleId : "output");
    dropUnpinnedResults(consoleId);
  }

  function applyTableFilters(consoleId: string, where: string, orderBy: string) {
    setTableFilters(consoleId, where, orderBy);
    void runTableQuery(consoleId);
  }

  // Al abrir (o volver a) una pestaña de tabla sin datos todavia, se carga.
  $effect(() => {
    const item = activeConsole;
    if (!item?.table || tableLoadAttempted.has(item.id)) return;
    if (liveExecution.result !== null || liveExecution.isExecuting) return;
    tableLoadAttempted.add(item.id);
    void runTableQuery(item.id);
  });

  // --- Ctrl+F segun el mouse -----------------------------------------------
  // La busqueda sale segun la zona que tiene el MOUSE encima (sin hacer
  // clic): editor -> su barra de buscar/reemplazar; resultado -> la barra del
  // grid. En captura, antes de que CodeMirror vea la tecla (si el foco esta
  // en el editor pero el mouse sobre el grid, gana el grid). Con el mouse
  // sobre el sidebar no se toca: lo resuelve +layout.svelte. En cualquier
  // otro lado, cada zona sigue respondiendo por foco.
  let sqlEditor = $state<ReturnType<typeof SqlEditor>>();
  let resultPane = $state<ReturnType<typeof ResultPane>>();
  let editorPane = $state<HTMLElement>();
  let resultRegion = $state<HTMLElement>();

  $effect(() => {
    function onKeydown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== "f") return;
      if (document.querySelector("dialog[open]")) return;
      if (document.querySelector(".sidebar:hover")) return;
      if (editorPane?.matches(":hover") && sqlEditor) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sqlEditor.toggleSearch();
      } else if (resultRegion?.matches(":hover")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        resultPane?.toggleFind();
      }
    }
    window.addEventListener("keydown", onKeydown, true);
    return () => window.removeEventListener("keydown", onKeydown, true);
  });

  // --- Salida -----------------------------------------------------------
  const logSchema = $derived(activeProfile ? activeProfile.database || activeProfile.name : "");

  // Duracion para la Salida: "1.234 ms", con los separadores del idioma.
  function formatMs(elapsedMs: number): string {
    return `${$numberFormat.format(Math.round(elapsedMs))} ms`;
  }

  function describeOutcome(result: QueryExecutionResult, offset: number, elapsedMs: number): string {
    const ms = formatMs(elapsedMs);
    if (result.type === "resultSet") {
      const count = result.rows.length;
      if (count === 0) return $t("workspace.output.noRows", { ms });
      return $t(count === 1 ? "workspace.output.fetchedOne" : "workspace.output.fetchedOther", {
        count: $numberFormat.format(count),
        from: $numberFormat.format(offset + 1),
        ms,
      });
    }
    if (result.type === "command") {
      if (result.affectedRows === 0) return $t("workspace.output.completed", { ms });
      return $t(result.affectedRows === 1 ? "workspace.output.affectedOne" : "workspace.output.affectedOther", {
        count: $numberFormat.format(result.affectedRows),
        ms,
      });
    }
    return result.code ? `[${result.code}] ${result.message}` : result.message;
  }

  // Unico camino de toda ejecucion (Ctrl+Enter, confirmacion, pagina,
  // recarga): ejecuta, deja constancia en la Salida y aplica el resultado.
  // Si el backend pide confirmacion, no se ejecuto nada y no se registra.
  //
  // `key` es la pestaña de resultado que recibe el resultado (la normal de
  // la consola o una fijada); la Salida es siempre la de su consola. Con
  // filas, se muestra esa pestaña; con error o sin filas, la Salida.
  async function runQuery(
    key: string,
    sql: string,
    confirmed: DestructiveStatement | null,
    page: PageRequest,
    paging = false,
  ) {
    const consoleId = consoleOfKey(key);
    const startedAt = Date.now();
    const started = performance.now();
    const response = await executeQuery(sql, confirmed, page);
    if (response.type === "completed") {
      appendLog(consoleId, { kind: "query", schema: logSchema, text: sql.trim(), at: startedAt });
      appendLog(consoleId, {
        kind: response.result.type === "error" ? "error" : "info",
        text: describeOutcome(response.result, response.page?.offset ?? 0, performance.now() - started),
      });
    }
    applyExecuteQueryResponse(key, sql, response, paging);
    if (response.type === "completed") {
      selectTab(consoleId, response.result.type === "resultSet" ? key : "output");
    }
  }

  function applyExecuteQueryResponse(key: string, sql: string, response: ExecuteQueryResponse, paging = false) {
    if (response.type === "confirmationRequired") {
      requireQueryConfirmation(key, { sql, statement: response.statement });
      return;
    }
    // Una pestaña fijada que falla al recargar o paginar conserva lo que
    // mostraba: el error queda en la Salida.
    if (key !== consoleOfKey(key) && response.result.type !== "resultSet") {
      stopQueryExecution(key);
      return;
    }
    finishQueryExecution(key, sql, response.result, response.page ?? null, paging);
    prepareResultEditing(key, sql, response.result);
  }

  // --- Edicion del resultado -------------------------------------------
  const editState = $derived(activeConsole ? editStateFor($resultEdits, viewKey) : null);

  // Cada resultado nuevo arranca sin cambios pendientes; si es otra
  // consulta, se pregunta al backend si (y como) se puede editar. Es un
  // analisis local (AST + catalogo en memoria), no va a la base.
  function prepareResultEditing(consoleId: string, sql: string, result: QueryExecutionResult) {
    if (result.type !== "resultSet") {
      forgetResultEdits(consoleId);
      return;
    }
    if (resetResultEdits(consoleId, sql)) return;
    fetchEditInfo(
      sql,
      result.columns.map((column) => column.name),
    )
      .then((info) => setResultEditInfo(consoleId, sql, info, null))
      .catch((reason) => setResultEditInfo(consoleId, sql, null, String(reason)));
  }

  function pendingEditsCount(consoleId: string): number {
    return pendingCount(editStateFor($resultEdits, consoleId).edits);
  }

  // Cambiar de pagina, re-ejecutar o cerrar con cambios sin aplicar pide
  // confirmacion: los cambios son sobre las filas visibles y se perderian.
  let discardPrompt = $state<{ resolve: (discard: boolean) => void } | null>(null);

  // Acepta varias claves: una ejecucion nueva reemplaza la pestaña normal y
  // las desfijadas, y se pregunta UNA vez por todas.
  function confirmDiscardPending(keys: string | string[]): Promise<boolean> {
    const list = (Array.isArray(keys) ? keys : [keys]).filter((key) => pendingEditsCount(key) > 0);
    if (list.length === 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      discardPrompt = {
        resolve: (discard) => {
          discardPrompt = null;
          if (discard) for (const key of list) clearResultPendingEdits(key);
          resolve(discard);
        },
      };
    });
  }

  let preview = $state<{
    consoleId: string;
    target: EditTarget;
    changes: ResultChanges;
    statements: string[];
    dismiss: boolean;
  } | null>(null);
  let applyingChanges = $state(false);
  let applyError = $state<ChangeError | null>(null);

  function currentChanges(consoleId: string): { target: EditTarget; changes: ResultChanges } | null {
    const state = editStateFor($resultEdits, consoleId);
    const result = executionForConsole($queryConsoles, consoleId).result;
    if (!state.info || result?.type !== "resultSet") return null;
    return { target: state.info.target, changes: buildChanges(state.edits, state.info, result.rows) };
  }

  // El SQL se pide ANTES de abrir: el modal aparece ya completo, sin un
  // instante vacio ni contenido que salta al llegar.
  async function openChangesPreview(consoleId: string, error: ChangeError | null = null) {
    const current = currentChanges(consoleId);
    if (!current) return;
    try {
      const statements = await previewChanges(current.target, current.changes);
      applyError = error;
      preview = { consoleId, ...current, statements, dismiss: false };
    } catch (cause) {
      notifyError(cause);
    }
  }

  function asChangeError(error: unknown): ChangeError {
    if (error && typeof error === "object" && "message" in error) {
      const value = error as Partial<ChangeError>;
      return { statementIndex: value.statementIndex ?? null, message: String(value.message), code: value.code ?? null };
    }
    return { statementIndex: null, message: String(error), code: null };
  }

  // Aplica todo en una transaccion. Si falla no queda nada aplicado: los
  // cambios siguen pendientes y el error se muestra en la vista previa.
  // En produccion nada se aplica sin ver antes el SQL: el atajo o el boton
  // del grid abren la vista previa, y aplicar desde ella confirma.
  async function submitChanges(key: string, confirmed = false) {
    if ($isProduction && !confirmed) {
      void openChangesPreview(key);
      return;
    }
    const consoleId = consoleOfKey(key);
    const current = currentChanges(key);
    if (!current || applyingChanges) return;
    applyingChanges = true;
    // El error anterior sigue a la vista mientras se reintenta: si vuelve a
    // fallar, la vista previa lo "golpea" en vez de borrarlo y redibujarlo.
    // Las mismas sentencias que muestra la vista previa, para la Salida.
    const statements = await previewChanges(current.target, current.changes).catch(() => [] as string[]);
    const startedAt = Date.now();
    const started = performance.now();
    const logStatements = () => {
      for (const statement of statements) {
        appendLog(consoleId, { kind: "query", schema: logSchema, text: statement, at: startedAt });
      }
    };
    try {
      const affected = await applyChanges(current.target, current.changes);
      logStatements();
      appendLog(consoleId, {
        kind: "info",
        text: $t(affected === 1 ? "workspace.output.appliedOne" : "workspace.output.appliedOther", {
          count: $numberFormat.format(affected),
          ms: formatMs(performance.now() - started),
        }),
      });
      applyError = null;
      clearResultPendingEdits(key);
      // El modal (si estaba abierto) se cierra animado; lo quita su onclose.
      if (preview) preview = { ...preview, dismiss: true };
      // Recarga: trae ids generados, defaults y lo que haya cambiado un
      // trigger.
      void reloadResult(key);
    } catch (error) {
      applyingChanges = false;
      const changeError = asChangeError(error);
      logStatements();
      appendLog(consoleId, {
        kind: "error",
        text:
          changeError.statementIndex !== null
            ? $t("workspace.output.applyFailedAt", {
                index: changeError.statementIndex + 1,
                message: changeError.message,
              })
            : $t("workspace.output.applyFailed", { message: changeError.message }),
      });
      if (preview) applyError = changeError;
      else void openChangesPreview(key, changeError);
      return;
    }
    applyingChanges = false;
  }

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

  // Fijar: la pestaña normal pasa a ser una fijada CON TODO su estado
  // (pagina, total, cambios pendientes, historial): sigue funcionando igual,
  // solo que la proxima ejecucion ya no la reemplaza.
  function pinCurrentResult(consoleId: string) {
    if (executionForConsole($queryConsoles, consoleId).result?.type !== "resultSet") return;
    const id = addPinnedTab(consoleId);
    const key = resultKey(consoleId, id);
    keepTabPosition(consoleId, consoleId, key);
    moveExecutionState(consoleId, key);
    moveResultEdits(consoleId, key);
    selectTab(consoleId, key);
  }

  // Desfijar NO cierra ni reemplaza nada: la pestaña sigue abierta tal
  // cual y la proxima ejecucion es la que la reemplaza. Si no hay una
  // pestaña normal abierta, pasa directamente a serlo, en su mismo lugar.
  function unpinTab(key: string) {
    const consoleId = consoleOfKey(key);
    const id = pinnedIdOf(key);
    if (id === null) return;
    if (executionForConsole($queryConsoles, consoleId).result?.type === "resultSet") {
      setResultPinned(consoleId, id, false);
      return;
    }
    keepTabPosition(consoleId, key, consoleId);
    moveExecutionState(key, consoleId);
    moveResultEdits(key, consoleId);
    removePinnedTab(consoleId, id);
    selectTab(consoleId, consoleId);
  }

  function pinnedIdOf(key: string): number | null {
    const match = /#pin(\d+)$/.exec(key);
    return match ? Number(match[1]) : null;
  }

  function forgetResultTab(key: string) {
    forgetExecutionState(key);
    forgetResultEdits(key);
    const id = pinnedIdOf(key);
    if (id !== null) removePinnedTab(consoleOfKey(key), id);
  }

  // Una ejecucion nueva reemplaza la pestaña normal y las desfijadas.
  function replaceableKeys(consoleId: string): string[] {
    return [consoleId, ...unpinnedTabs($pinnedResults, consoleId).map((item) => resultKey(consoleId, item.id))];
  }

  function dropUnpinnedResults(consoleId: string) {
    for (const item of unpinnedTabs($pinnedResults, consoleId)) forgetResultTab(resultKey(consoleId, item.id));
  }

  // Al cerrar la consola, sus pestañas fijadas (y su estado) se van con ella.
  function forgetConsoleResults(consoleId: string) {
    for (const item of $pinnedResults[consoleId] ?? []) {
      const key = resultKey(consoleId, item.id);
      forgetExecutionState(key);
      forgetResultEdits(key);
    }
    forgetPinnedResults(consoleId);
  }

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

  // × de una pestaña de resultado: la quita (con cambios pendientes
  // pregunta antes). La normal queda vacia; una fijada desaparece.
  async function closeResultTab(key: string) {
    if (!(await confirmDiscardPending(key))) return;
    if (key === consoleOfKey(key)) {
      clearQueryResult(key);
      forgetResultEdits(key);
    } else {
      forgetResultTab(key);
    }
  }

  // Vuelve a ejecutar la consulta del resultado en la misma pagina, como una
  // ejecucion nueva (el total se vuelve a calcular). Con cambios pendientes
  // pregunta antes de descartarlos.
  async function reloadResult(key: string) {
    const current = executionForConsole($queryConsoles, key);
    const sql = current.resultSql;
    if (!sql || !(await confirmDiscardPending(key)) || !beginQueryExecution(key)) return;
    const page = current.page ?? firstPage(key);
    await runQuery(key, sql, null, { offset: page.offset, pageSize: page.pageSize, sort: current.sort });
  }

  // Una ejecucion nueva arranca en la primera pagina, con el tamaño que la
  // consola venia usando (o el predeterminado).
  function firstPage(key: string): PageRequest {
    const current = executionForConsole($queryConsoles, key).page;
    return { offset: 0, pageSize: current?.pageSize ?? $defaultPageSize };
  }

  // Otra pagina de la consulta que produjo el resultado vigente (resultSql,
  // no el texto actual del editor, que puede haber cambiado).
  // Paginar conserva el orden elegido en los encabezados: cada pagina es
  // consulta + orden + LIMIT/OFFSET (el backend ordena ANTES de paginar).
  async function navigatePage(key: string, offset: number, pageSize: number) {
    const current = executionForConsole($queryConsoles, key);
    const sql = current.resultSql;
    if (!sql || !(await confirmDiscardPending(key)) || !beginQueryExecution(key)) return;
    await runQuery(key, sql, null, { offset, pageSize, sort: current.sort }, true);
  }

  // Clic en un encabezado: nuevo orden, de vuelta a la primera pagina (mismo
  // tamaño). Es la misma consulta, asi que el total contado se conserva.
  async function sortResult(key: string, column: number, additive: boolean) {
    const current = executionForConsole($queryConsoles, key);
    const sql = current.resultSql;
    if (!sql || !current.page?.sortable) return;
    if (!(await confirmDiscardPending(key)) || !beginQueryExecution(key)) return;
    const sort = nextSort(current.sort, column, additive);
    setQuerySort(key, sort);
    await runQuery(key, sql, null, { offset: 0, pageSize: current.page.pageSize, sort }, true);
  }

  async function countTotalRows(key: string): Promise<number | null> {
    const consoleId = consoleOfKey(key);
    const sql = executionForConsole($queryConsoles, key).resultSql;
    if (!sql) return null;
    setQueryCounting(key, true);
    const started = performance.now();
    appendLog(consoleId, { kind: "query", schema: logSchema, text: `SELECT COUNT(*) FROM (${sql.trim()})` });
    try {
      const total = await countQueryRows(sql);
      setQueryTotalRows(key, sql, total);
      appendLog(consoleId, {
        kind: "info",
        text: $t(total === 1 ? "workspace.output.totalOne" : "workspace.output.totalOther", {
          count: $numberFormat.format(total),
          ms: formatMs(performance.now() - started),
        }),
      });
      return total;
    } catch (error) {
      setQueryCounting(key, false);
      appendLog(consoleId, { kind: "error", text: String(error) });
      notifyError(error);
      return null;
    }
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

  // Solicita una ejecucion nueva (Ctrl+Enter o el boton "Ejecutar"). No hace
  // nada si esa consola ya esta ejecutando o tiene un guard visible —
  // beginQueryExecution() ya contempla ambos casos, asi que repetir
  // Ctrl+Enter mientras el guard esta arriba no dispara una segunda
  // invocacion ni confirma nada por si solo.
  async function requestExecution(consoleId: string, sql: string) {
    if (!(await confirmDiscardPending(replaceableKeys(consoleId))) || !beginQueryExecution(consoleId)) return;
    // Consulta nueva: arranca sin el orden de los encabezados.
    setQuerySort(consoleId, []);
    await runQuery(consoleId, sql, null, firstPage(consoleId));
    dropUnpinnedResults(consoleId);
  }

  // Unica via de confirmacion: el click explicito en "Ejecutar de todos
  // modos" del guard. takeQueryConfirmation() retira el pendiente de forma
  // atomica antes del await, asi que un doble click no puede confirmar dos
  // veces.
  async function confirmPendingExecution(consoleId: string) {
    const pending = takeQueryConfirmation(consoleId);
    if (!pending || !beginQueryExecution(consoleId)) return;
    setQuerySort(consoleId, []);
    await runQuery(consoleId, pending.sql, pending.statement, firstPage(consoleId));
    dropUnpinnedResults(consoleId);
  }

  function cancelPendingExecution(consoleId: string) {
    cancelQueryConfirmation(consoleId);
  }

  function startResize(event: PointerEvent) {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    function onMove(moveEvent: PointerEvent) {
      if (!workspaceBody) return;
      const rect = workspaceBody.getBoundingClientRect();
      const fraction = (moveEvent.clientY - rect.top) / rect.height;
      editorFraction = Math.min(0.85, Math.max(0.15, fraction));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
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

<svelte:window onkeydown={handleConsoleShortcut} />

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
            title={item.table ? `${item.table.schema}.${item.table.name}` : (item.filePath ?? undefined)}>{consoleDisplayTitle(item.title, $t)}</span
          >
        {/if}
        <button
          type="button"
          class="close-tab"
          aria-label={$t(dirty ? "workspace.tabs.closeDirty" : "workspace.tabs.close", { title: consoleDisplayTitle(item.title, $t) })}
          title={dirty
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
      title={$t("workspace.tabs.newTitle", { shortcut: shortcutKeys("new-query-console") })}
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
        <button type="button" onclick={() => void runFileAction(() => openSqlFileWithDialog(profileId))}>
          <span>{$t("workspace.openFile")}</span>
          <kbd>{shortcutKeys("open-sql-file")}</kbd>
        </button>
      </div>
    </div>
  {:else}
  <section class="workspace-body" bind:this={workspaceBody}>
    {#if !activeConsole?.table}
    <div class="editor-pane" bind:this={editorPane} style={`flex-basis: ${editorFraction * 100}%`}>
      {#if activeConsole}
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
      {/if}
    </div>
    {#if liveExecution.pendingConfirmation && activeConsole}
      <ExecutionGuard
        statement={liveExecution.pendingConfirmation.statement}
        production={$isProduction}
        oncancel={() => cancelPendingExecution(activeConsole.id)}
        onconfirm={() => confirmPendingExecution(activeConsole.id)}
      />
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
    <div class="result-region" bind:this={resultRegion}>
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
        tabs={resultTabs}
        activeTab={selectedTab}
        onselecttab={(tab) => activeConsole && selectTab(activeConsole.id, tab)}
        onreordertabs={reorderResultTabs}
        onclosetab={(key) => void closeResultTab(key)}
        onexport={() => (exportFor = viewKey)}
        onpin={() => activeConsole && pinCurrentResult(activeConsole.id)}
        onunpin={() => unpinTab(viewKey)}
        onrepin={() => {
          const id = pinnedIdOf(viewKey);
          if (activeConsole && id !== null) setResultPinned(activeConsole.id, id, true);
        }}
        onpreview={() => void openChangesPreview(viewKey)}
        onsubmit={() => void submitChanges(viewKey)}
        onnotice={notifyError}
        filters={activeConsole?.table ? tableFiltersBar : undefined}
      />
      {#snippet tableFiltersBar()}
        {#if activeConsole?.table}
          {@const consoleId = activeConsole.id}
          <TableFilters
            where={activeConsole.table.where}
            orderBy={activeConsole.table.orderBy}
            error={tableFilterError[consoleId] ?? null}
            busy={liveExecution.isExecuting}
            onapply={(where, orderBy) => applyTableFilters(consoleId, where, orderBy)}
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

{#if discardPrompt}
  {@const prompt = discardPrompt}
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

{#if preview}
  {@const current = preview}
  <ChangesPreview
    statements={current.statements}
    changes={current.changes}
    applying={applyingChanges}
    error={applyError}
    dismiss={current.dismiss}
    production={$isProduction}
    onapply={() => void submitChanges(current.consoleId, true)}
    onclose={() => {
      preview = null;
      applyError = null;
    }}
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

{#if pendingCloseId}
  <ConfirmDialog
    tone="warning"
    title={$t("workspace.close.title", { title: closeDialogTitle })}
    message={$t("workspace.close.message")}
    confirmLabel={$t("common.save")}
    alternateLabel={$t("common.discard")}
    onconfirm={() => void saveAndClose()}
    onalternate={discardAndClose}
    oncancel={cancelClose}
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
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  /* Pestaña tomada al arrastrar (reorder.ts): por encima de las demas, con
     una sombra sutil. */
  .console-tab:global(.reorder-dragging) {
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

  /* Antes el hover repetia el fondo de reposo y no se notaba en ningun
     tema: ahora aclara/oscurece apenas hacia el color del texto. */
  .console-tab:hover,
  .new-console:hover {
    background: color-mix(in srgb, var(--surface-elevated) 92%, var(--text-primary));
    color: var(--text-primary);
  }

  .console-tab.active {
    border-color: color-mix(in srgb, var(--accent) 72%, var(--border));
    background: color-mix(in srgb, var(--accent) 18%, var(--surface-elevated));
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
    min-height: 0;
    flex-shrink: 0;
    overflow: hidden;
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
