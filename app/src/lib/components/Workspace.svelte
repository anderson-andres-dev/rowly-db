<script lang="ts">
  import { onePerFrame } from "$lib/onePerFrame";
  import { get } from "svelte/store";
  import { focusZoneAction, setZoneNavigator } from "$lib/focusZones";
  import { registerCommand, registerCommands } from "$lib/workspace/commands";
  import { registerTabCommands } from "$lib/workspace/tabCommands";
  import { tooltip } from "$lib/tooltip";
  import { tick, untrack } from "svelte";
  import { flip } from "svelte/animate";
  import { fade, fly } from "svelte/transition";
  import { CircleCheck, FileCode, Plus, SquareTerminal, Table, TriangleAlert, X } from "@lucide/svelte";
  import SqlEditor from "$lib/SqlEditor.svelte";
  import ContextMenu from "$lib/components/ContextMenu.svelte";
  import TilePicker from "$lib/components/TilePicker.svelte";
  import MosaicArea from "$lib/components/MosaicArea.svelte";
  import ExecutionGuard from "$lib/components/ExecutionGuard.svelte";
  import ResultPane from "$lib/components/results/ResultPane.svelte";
  import TableDefinitionModal from "$lib/components/TableDefinitionModal.svelte";
  import type { CatalogTableRef } from "$lib/sqlDefinitionLink";
  import type { ContextMenuItem } from "$lib/contextMenu";
  import { activeEngine, catalogTables, connection, isProduction, refreshCatalog } from "$lib/stores/connection";
  import { connectionProfiles } from "$lib/stores/connectionProfiles";
  import { shortcuts } from "$lib/stores/shortcuts";

  import { extractFromContext } from "$lib/editor/completionSource";
  import { queryHistory } from "$lib/stores/queryHistory";
  import { STANDARD_LEXICAL, type SqlLexical } from "$lib/sqlStatements";
  import { findParameters, parameterNames, substituteParameters } from "$lib/workspace/parameters";
  import { parameterColumns, type ParameterColumn } from "$lib/editor/parameterTypes";
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
  } from "$lib/results/resultEditing";
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
  import { consoleMosaics, setConsoleMosaic } from "$lib/stores/consoleMosaic";
  import { leaf, leaves, neighbor, place, rects, remove, reveal, siblingOf, WHOLE, type Mosaic, type Side } from "$lib/workspace/mosaic";
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
  // editor/completionSource.ts.
  // firstFromTable complementa a extractFromContext, que es del
  // autocompletado y depende de la posicion del cursor: sobre el texto
  // entero a veces no resuelve una consulta simple.
  function resultTableOf(sql: string | null): string | undefined {
    if (!sql) return undefined;
    return extractFromContext(sql, sql.length)?.table ?? firstFromTable(sql)?.table;
  }
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
    // Y en los grupos del resultado, el mismo grupo.
    const layout = resultLayouts[consoleId];
    if (layout?.member[fromKey]) {
      const next = copyLayout(layout);
      next.member[toKey] = next.member[fromKey];
      delete next.member[fromKey];
      for (const [group, key] of Object.entries(next.selected)) if (key === fromKey) next.selected[group] = toKey;
      setLayout(consoleId, next);
    }
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
  // Busca en TODAS las tablas, no solo en la principal (resultTableOf): con
  // un JOIN (USING/ON), columnas como "clie_codi" vienen de la tabla unida,
  // no de la primera del FROM, y resultTableOf solo resuelve esa primera. Si
  // el mismo nombre de columna existe en mas de una tabla, gana la
  // principal cuando aplica (es la señal mas confiable de a que
  // tabla pertenece), y si no, la primera tabla del catalogo que la tenga.
  //
  // Por pestaña (cada mosaico del resultado tiene la suya): la base con
  // todas las tablas se arma una vez por catalogo, y la de cada tabla
  // principal se guarda, asi el grid recibe siempre el mismo Map.
  function toColumnInfo(column: CatalogColumn, table: CatalogTable): ColumnCatalogInfo {
    const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column.toLowerCase()));
    return {
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: fkColumns.has(column.name.toLowerCase()),
      comment: column.comment,
    };
  }

  const catalogColumnInfo = $derived.by(() => {
    const tables = $catalogTables;
    if (tables.length === 0) return null;
    const base = new Map<string, ColumnCatalogInfo>();
    for (const table of tables) {
      for (const column of table.columns) {
        const key = column.name.toLowerCase();
        if (!base.has(key)) base.set(key, toColumnInfo(column, table));
      }
    }
    return { tables, base, byTable: new Map<CatalogTable, Map<string, ColumnCatalogInfo>>() };
  });

  function columnInfoFor(key: string): Map<string, ColumnCatalogInfo> | null {
    const catalog = catalogColumnInfo;
    if (!catalog) return null;
    const name = resultTableOf(executionForConsole($queryConsoles, key).resultSql)?.toLowerCase();
    const mainTable = name ? catalog.tables.find((table) => table.name.toLowerCase() === name) : undefined;
    if (!mainTable) return catalog.base;
    let map = catalog.byTable.get(mainTable);
    if (!map) {
      map = new Map(catalog.base);
      for (const column of mainTable.columns) map.set(column.name.toLowerCase(), toColumnInfo(column, mainTable));
      catalog.byTable.set(mainTable, map);
    }
    return map;
  }

  const resultColumnCatalogInfo = $derived(columnInfoFor(viewKey));
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
    forgetResults: forgetConsole,
    notifyError,
  });

  // Al cerrar una consola, tambien lo que esta vista guarda por su id. Un
  // $state indexado por id crea una fuente por cada clave que se lee, aunque
  // no exista, y la conserva mientras viva el objeto: reasignarlo sin la
  // clave suelta esas fuentes (#74).
  function forgetConsole(consoleId: string) {
    forgetConsoleResults(consoleId);
    selectedTabByConsole = withoutKey(selectedTabByConsole, consoleId);
    resultTabOrder = withoutKey(resultTabOrder, consoleId);
    tableFilterError = withoutKey(tableFilterError, consoleId);
    resultLayouts = withoutKey(resultLayouts, consoleId);
    tableLoadAttempted.delete(consoleId);
  }

  function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
    const { [key]: _forgotten, ...rest } = record;
    return rest;
  }
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

  // --- Terminal ------------------------------------------------------------
  // Una por ventana, como pestaña fija del panel inferior (ResultPane), con
  // sus sesiones dentro. No es de ninguna consola: activa, sigue a la vista
  // al cambiar de consola o sin ninguna abierta. Desactivarla vuelve a la
  // pestaña que la consola tenia elegida, que no se toca.
  let terminalActive = $state(false);
  // Terminal.svelte (y con el, xterm) se carga la primera vez que se abre:
  // quien no la usa no los descarga ni crea un shell.
  let TerminalDock = $state<typeof import("$lib/components/Terminal.svelte").default | null>(null);
  // Donde estaba el foco al abrirla: ahi vuelve con el atajo (Ctrl+T).
  let terminalReturnFocus: HTMLElement | null = null;

  // Ctrl+T: abierta pero con el foco en otro lado, lleva a ella; con el foco
  // dentro, la oculta.
  function toggleTerminal() {
    if (terminalActive && !document.activeElement?.closest("[data-terminal]")) {
      resultRegion?.querySelector<HTMLElement>("[data-terminal]:not(.hidden) textarea")?.focus({ preventScroll: true });
      return;
    }
    if (terminalActive) {
      terminalActive = false;
      if (terminalReturnFocus?.isConnected) terminalReturnFocus.focus({ preventScroll: true });
      return;
    }
    terminalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    terminalActive = true;
    if (!TerminalDock) void import("$lib/components/Terminal.svelte").then((module) => (TerminalDock = module.default));
  }


  $effect(() => registerCommands("global", { "toggle-terminal": toggleTerminal }));

  // Una pestaña de tabla es solo su resultado, sin fila de Salida ni de
  // resultados: con la terminal encima no se veian sus datos ni habia como
  // volver a ellos. Al abrirla o pasar a ella, la terminal se oculta (sigue
  // viva; Ctrl+T la trae). Entre consolas normales, sigue a la vista.
  let lastTableTab: string | null = null;
  $effect(() => {
    const tableTab = activeConsole?.table ? activeConsole.id : null;
    if (tableTab && tableTab !== lastTableTab) terminalActive = false;
    lastTableTab = tableTab;
  });

  // Ctrl+Tab y Ctrl+1..9 fuera del panel inferior y de la terminal: las
  // consolas (workspace/tabCommands.ts).
  $effect(() =>
    registerTabCommands("global", {
      keys: () => consoles.map((item) => item.id),
      current: () => activeId,
      select: (id) => activateQueryConsole(profileId, id),
      applies: () => $pendingClose === null,
    }),
  );

  // Comandos de las pestañas (lib/workspace/commands.ts); la tecla la pone
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
  // Un editor por mosaico; el de la consola activa es el enfocado.
  let editors = $state<Record<string, ReturnType<typeof SqlEditor> | undefined>>({});
  const sqlEditor = $derived(activeConsole ? editors[activeConsole.id] : undefined);

  // Primer foco de una zona a la que se llega con el teclado (focusZones.ts).
  function focusIn(zone: HTMLElement, selector: string): boolean {
    const target = zone.querySelector<HTMLElement>(selector);
    target?.focus({ preventScroll: true });
    return !!target;
  }
  // Sin grid, la seccion de abajo se enfoca entera: ningun boton (la pestaña
  // Terminal tiene su atajo) queda con el anillo de foco.
  function focusSelf(zone: HTMLElement): boolean {
    zone.focus({ preventScroll: true });
    return true;
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
      ((resultLayout && resultGroups[resultLayout.focus]) || resultPane)?.toggleFind();
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

  // --- Historial (Ctrl+H) ---------------------------------------------------
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
    terminalActive = false;
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
    markStatement: (consoleId, index, outcome) => editors[consoleId]?.markStatement(index, outcome),
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

  // Alt+→ / Alt+←.
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

  // Parametros con nombre (:nombre, workspace/parameters.ts): se piden antes de
  // ejecutar, cada uno con el tipo de la columna con que se compara
  // (editor/parameterTypes.ts, del catalogo ya cargado), y se reemplazan en el
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

  // --- Consolas en mosaico (workspace/mosaic.ts) ---------------------------
  // Las consolas SQL se ponen una junto a otra como en i3: cada hoja del
  // arbol es una consola y la activa es la del mosaico enfocado. Una consola
  // vive en un solo mosaico; elegir en la fila de pestañas una que no se ve
  // la pone en el enfocado. El resultado de abajo es uno solo y sigue a la
  // consola activa, como siempre. Una pestaña de tabla ocupa todo el cuerpo
  // (sin editor): mientras esta activa el mosaico no se ve, pero se conserva.
  const mosaic = $derived($consoleMosaics[profileId] ?? null);
  const tileIds = $derived(leaves(mosaic));
  const tiled = $derived(tileIds.length > 1);
  // El ultimo mosaico enfocado de cada conexion: ahi va la consola que se
  // elige y no se ve.
  const focusedTile: Record<string, string> = {};

  $effect(() => {
    const ids = new Set(consoles.filter((item) => !item.table).map((item) => item.id));
    const active = activeConsole;
    const profile = profileId;
    untrack(() => {
      let tree: Mosaic | null = get(consoleMosaics)[profile] ?? null;
      // Una consola cerrada deja su lugar a su hermana, que queda enfocada
      // (como cerrar una ventana en i3), no a la pestaña vecina.
      let refocus: string | null = null;
      for (const id of leaves(tree)) {
        if (ids.has(id)) continue;
        if (id === focusedTile[profile]) refocus = siblingOf(tree, id);
        tree = remove(tree, id);
      }
      if (refocus && active?.id !== refocus && !active?.table) {
        setConsoleMosaic(profile, tree);
        focusedTile[profile] = refocus;
        activateQueryConsole(profile, refocus);
        return;
      }
      if (active && !active.table) {
        tree = reveal(tree, active.id, focusedTile[profile] ?? null);
        focusedTile[profile] = active.id;
      }
      setConsoleMosaic(profile, tree);
      if (active && !active.table) void followFocus(active.id);
    });
  });

  // Elegir en la fila (o con Ctrl+Tab) una consola que ya se ve en otro
  // mosaico la activa, pero el foco del teclado seguia en el editor anterior:
  // se escribia y ejecutaba en uno mientras abajo se veia el resultado del
  // otro. Si el foco esta en otro mosaico, pasa al de la activa.
  async function followFocus(id: string) {
    await tick();
    // Solo los mosaicos del editor: los del resultado usan las claves de sus
    // pestañas, y la normal es el id de la consola.
    const holder = document.activeElement?.closest<HTMLElement>('[data-focus-zone="editor"] [data-tile-id]');
    if (holder && holder.dataset.tileId !== id) editors[id]?.focus();
  }

  // Cambiar el mosaico y enfocar una consola en el mismo paso: el efecto de
  // arriba ya la encuentra en su lugar y no la vuelve a ubicar.
  async function arrange(tree: Mosaic | null, focus: string) {
    setConsoleMosaic(profileId, tree);
    focusedTile[profileId] = focus;
    activateQueryConsole(profileId, focus);
    await tick();
    editors[focus]?.focus();
  }

  function untile(id: string): boolean {
    const sibling = siblingOf(mosaic, id);
    if (!sibling) return false;
    void arrange(remove(mosaic, id), sibling);
    return true;
  }

  // Ctrl+Alt+M: elegir cual va junto a la enfocada (TilePicker).
  let pickerOpen = $state(false);
  const pickerItems = $derived(
    consoles
      .filter((item) => !item.table && !tileIds.includes(item.id))
      .map((item) => ({ id: item.id, title: consoleDisplayTitle(item.title, $t), icon: item.filePath ? ("file" as const) : ("console" as const) })),
  );

  function pickTile(id: string | null, side: "right" | "bottom", whole: boolean) {
    pickerOpen = false;
    const target = whole ? WHOLE : activeConsole && !activeConsole.table ? activeConsole.id : null;
    const chosen = id ?? createQueryConsole(profileId);
    void arrange(target ? place(mosaic, target, chosen, side) : reveal(mosaic, chosen, null), chosen);
  }

  function closePicker(refocus: boolean) {
    pickerOpen = false;
    if (refocus) sqlEditor?.focus();
  }

  $effect(() => {
    const whenIdle = (run: () => boolean | void) => () => $pendingClose === null && run() !== false;
    return registerCommands("global", {
      "tile-console": whenIdle(() => {
        if (!activeConsole || activeConsole.table) return false;
        historyOpen = false;
        pickerOpen = true;
      }),
      "untile-console": whenIdle(() => !!activeConsole && !activeConsole.table && untile(activeConsole.id)),
    });
  });

  // Ctrl+Shift+Alt+flechas recorren los mosaicos antes de salir del editor
  // (focusZones.ts): en el borde, el foco pasa a la zona vecina.
  $effect(() =>
    setZoneNavigator("editor", (direction) => {
      if (!tiled || !activeConsole || activeConsole.table) return null;
      const side: Side = direction === "up" ? "top" : direction === "down" ? "bottom" : direction;
      const next = neighbor(mosaic, activeConsole.id, side);
      if (!next) return null;
      focusedTile[profileId] = next;
      activateQueryConsole(profileId, next);
      editors[next]?.focus();
      return editorMosaic?.tileElement(next) ?? null;
    }),
  );

  function focusTile(id: string) {
    if (id !== activeId) activateQueryConsole(profileId, id);
  }

  // Arrastrar una consola al mosaico desde su pestaña (al sacarla de la
  // fila, reorder.ts); el resto lo hace MosaicArea.
  let editorMosaic = $state<ReturnType<typeof MosaicArea>>();

  function beginTileDrag(id: string, start: PointerEvent, source: HTMLElement, grab: { x: number; y: number }): boolean {
    const item = consoles.find((candidate) => candidate.id === id);
    if (!item || item.table || !activeConsole || activeConsole.table || !editorMosaic) return false;
    return editorMosaic.beginDrag(id, start, { source, grab });
  }

  function consoleLabel(id: string): string {
    const item = consoles.find((candidate) => candidate.id === id);
    return item ? consoleDisplayTitle(item.title, $t) : "";
  }

  // --- Resultado en mosaico: grupos de pestañas ------------------------------
  // Como los grupos de VS Code: el resultado de la consola activa se parte en
  // grupos (las hojas del mosaico, MosaicArea), cada uno con su propia fila
  // de carpetas y la pestaña elegida debajo. Cada pestaña (la Salida y cada
  // resultado) vive en un solo grupo; la elegida de la consola es la del
  // grupo enfocado, y ejecutar agrega el resultado nuevo a ese grupo. Con un
  // solo grupo se ve como siempre. Los atajos son los del editor
  // (Ctrl+Alt+M, Ctrl+Alt+W, Ctrl+Shift+Alt+flechas) y el foco decide el
  // area. Vive en memoria, por consola, como sus pestañas; una pestaña de
  // tabla no tiene grupos.
  interface ResultLayout {
    tree: Mosaic;
    // Grupo -> su pestaña elegida.
    selected: Record<string, string>;
    // Pestaña -> su grupo.
    member: Record<string, string>;
    focus: string;
  }

  const FIRST_GROUP = "g0";
  // Alto de la fila de carpetas de un grupo (2rem + 6px, tabs.css): soltar
  // una pestaña ahi la acopla a ese grupo.
  const GROUP_STRIP_PX = 38;
  let groupCount = 0;
  let resultLayouts = $state<Record<string, ResultLayout>>({});
  let resultMosaicArea = $state<ReturnType<typeof MosaicArea>>();
  // Un panel por grupo; el del enfocado recibe buscar.
  let resultGroups = $state<Record<string, ReturnType<typeof ResultPane> | undefined>>({});
  const resultLayout = $derived(activeConsole && !activeConsole.table ? (resultLayouts[activeConsole.id] ?? null) : null);
  const resultGrouped = $derived(leaves(resultLayout?.tree ?? null).length > 1);
  // La terminal es de la ventana: su pestaña va en la fila del grupo de
  // arriba a la derecha y se abre sobre ese grupo.
  const terminalGroup = $derived.by(() => {
    if (!resultLayout) return FIRST_GROUP;
    let best: [string, number] = [FIRST_GROUP, -1];
    for (const [id, box] of rects(resultLayout.tree)) {
      if (box.y < 1e-6 && box.x + box.width > best[1]) best = [id, box.x + box.width];
    }
    return best[0];
  });
  const terminalBox = $derived(resultLayout ? (rects(resultLayout.tree).get(terminalGroup) ?? null) : null);

  function groupTabs(layout: ResultLayout, group: string, keys: string[]): string[] {
    return keys.filter((key) => layout.member[key] === group);
  }

  function setLayout(consoleId: string, layout: ResultLayout) {
    resultLayouts = { ...resultLayouts, [consoleId]: layout };
  }

  // Al aparecer o irse pestañas, y al elegir una: cada pestaña en un grupo
  // (las nuevas, en el enfocado), un grupo vacio se va y deja su lugar a su
  // hermano, y la elegida de la consola es la del grupo enfocado.
  $effect(() => {
    const item = activeConsole;
    if (!item || item.table) return;
    const keys = [OUTPUT_TAB, ...resultTabs.map((tab) => tab.key)];
    const chosen = selectedTab;
    untrack(() => {
      const previous = resultLayouts[item.id];
      const layout: ResultLayout = previous
        ? { tree: previous.tree, selected: { ...previous.selected }, member: { ...previous.member }, focus: previous.focus }
        : { tree: leaf(FIRST_GROUP), selected: { [FIRST_GROUP]: chosen }, member: {}, focus: FIRST_GROUP };
      const present = new Set(keys);
      for (const key of Object.keys(layout.member)) if (!present.has(key)) delete layout.member[key];
      for (const key of keys) layout.member[key] ??= layout.focus;
      // La elegida que se fue: otra de su mismo grupo, no la que elija el
      // respaldo de la consola (podia saltar a otro grupo).
      const lostFocus = previous && !present.has(previous.selected[previous.focus] ?? "");
      for (const group of leaves(layout.tree)) {
        const tabs = groupTabs(layout, group, keys);
        if (tabs.length === 0) {
          const sibling = siblingOf(layout.tree, group);
          layout.tree = remove(layout.tree, group) ?? leaf(FIRST_GROUP);
          delete layout.selected[group];
          if (layout.focus === group && sibling) layout.focus = sibling;
          continue;
        }
        if (!tabs.includes(layout.selected[group])) layout.selected[group] = tabs.at(-1)!;
      }
      if (lostFocus) {
        setLayout(item.id, layout);
        const next = layout.selected[layout.focus];
        if (next && next !== chosen) selectTab(item.id, next);
        return;
      }
      // Elegir una pestaña (clic, Ctrl+Tab, ejecutar) enfoca su grupo.
      const group = layout.member[chosen];
      if (group) {
        layout.focus = group;
        layout.selected[group] = chosen;
      }
      setLayout(item.id, layout);
    });
  });

  function resultLabel(key: string): string {
    if (key === OUTPUT_TAB) return $t("results.tab.output");
    return resultTabs.find((tab) => tab.key === key)?.label ?? $t("workspace.result");
  }

  // Lo que se enfoca al llegar a un grupo: su grid o, sin el (la Salida), el
  // grupo mismo.
  function focusGroupContent(group: string): HTMLElement | null {
    const element = resultMosaicArea?.tileElement(group) ?? null;
    const target = element?.querySelector<HTMLElement>('[role="grid"]') ?? element;
    target?.focus({ preventScroll: true });
    return element;
  }

  async function arrangeResults(layout: ResultLayout, focus: string) {
    const item = activeConsole;
    if (!item) return;
    layout.focus = focus;
    setLayout(item.id, layout);
    if (focus === terminalGroup) terminalActive = false;
    selectTab(item.id, layout.selected[focus]);
    await tick();
    focusGroupContent(focus);
  }

  function copyLayout(layout: ResultLayout): ResultLayout {
    return { tree: layout.tree, selected: { ...layout.selected }, member: { ...layout.member }, focus: layout.focus };
  }

  // Ctrl+Alt+W en el resultado: el grupo enfocado se junta con su hermano,
  // con sus pestañas, y la que se veia sigue elegida.
  function mergeGroup(group: string): boolean {
    if (!resultLayout || !activeConsole) return false;
    const sibling = siblingOf(resultLayout.tree, group);
    if (!sibling) return false;
    const layout = copyLayout(resultLayout);
    for (const [key, owner] of Object.entries(layout.member)) if (owner === group) layout.member[key] = sibling;
    layout.selected[sibling] = layout.selected[group] ?? layout.selected[sibling];
    delete layout.selected[group];
    layout.tree = remove(layout.tree, group) ?? leaf(sibling);
    void arrangeResults(layout, sibling);
    return true;
  }

  // Sacar una pestaña de la fila de su grupo: al borde de un grupo, un grupo
  // nuevo de ese lado; en el centro, entra en ese grupo.
  function beginResultDrag(key: string, start: PointerEvent, source: HTMLElement, grab: { x: number; y: number }): boolean {
    if (!activeConsole || activeConsole.table || !resultMosaicArea || !resultLayout) return false;
    const from = resultLayout.member[key];
    const alone = groupTabs(resultLayout, from, [OUTPUT_TAB, ...resultTabs.map((tab) => tab.key)]).length === 1;
    pendingDrag = { key, from, alone };
    return resultMosaicArea.beginDrag(`g${++groupCount}`, start, { source, grab, vacate: alone ? from : undefined, origin: from, merge: true });
  }

  let pendingDrag: { key: string; from: string; alone: boolean } | null = null;

  function moveTab(layout: ResultLayout, key: string, to: string) {
    const from = layout.member[key];
    layout.member[key] = to;
    layout.selected[to] = key;
    if (from && from !== to && layout.selected[from] === key) {
      const rest = groupTabs(layout, from, [OUTPUT_TAB, ...resultTabs.map((tab) => tab.key)]);
      if (rest.length > 0) layout.selected[from] = rest.at(-1)!;
      else delete layout.selected[from];
    }
  }

  function dropTabInNewGroup(tree: Mosaic, group: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (!drag || !resultLayout) return;
    const layout = copyLayout(resultLayout);
    layout.tree = tree;
    moveTab(layout, drag.key, group);
    void arrangeResults(layout, group);
  }

  function dropTabInGroup(target: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (!drag || !resultLayout || target === drag.from) return;
    const layout = copyLayout(resultLayout);
    if (drag.alone) layout.tree = remove(layout.tree, drag.from) ?? leaf(target);
    moveTab(layout, drag.key, target);
    void arrangeResults(layout, target);
  }

  // Reordenar en la fila de un grupo: los indices son de sus pestañas de
  // resultado; el orden de la consola se reacomoda solo en esos lugares.
  function reorderGroupTabs(group: string, from: number, to: number) {
    if (!activeConsole || !resultLayout) return;
    const layout = resultLayout;
    const all = resultTabs.map((tab) => tab.key);
    const mine = all.filter((key) => layout.member[key] === group);
    const moved = moveItem(mine, from, to);
    let index = 0;
    resultTabOrder = { ...resultTabOrder, [activeConsole.id]: all.map((key) => (layout.member[key] === group ? moved[index++] : key)) };
  }

  function focusGroup(group: string) {
    if (!activeConsole || !resultLayout) return;
    const key = resultLayout.selected[group];
    if (key && key !== selectedTab) selectTab(activeConsole.id, key);
  }

  // Ctrl+Alt+M con el foco en el resultado: una pestaña que no se ve pasa a
  // un grupo nuevo junto al enfocado (TilePicker, sin "nueva": las crea
  // ejecutar).
  let resultPickerOpen = $state(false);
  const resultPickerItems = $derived.by(() => {
    if (!resultLayout) return [];
    const shown = new Set(Object.values(resultLayout.selected));
    return [
      { id: OUTPUT_TAB, title: $t("results.tab.output"), icon: "output" as const },
      ...resultTabs.map((tab) => ({ id: tab.key, title: tab.label, icon: tab.pinned ? ("pinned" as const) : ("result" as const) })),
    ].filter((item) => !shown.has(item.id));
  });

  function pickResultTile(key: string | null, side: "right" | "bottom", whole: boolean) {
    resultPickerOpen = false;
    if (key === null || !resultLayout) return;
    const layout = copyLayout(resultLayout);
    const group = `g${++groupCount}`;
    layout.tree = place(layout.tree, whole ? WHOLE : layout.focus, group, side);
    moveTab(layout, key, group);
    void arrangeResults(layout, group);
  }

  function closeResultPicker(refocus: boolean) {
    resultPickerOpen = false;
    if (refocus && resultLayout) focusGroupContent(resultLayout.focus);
  }

  $effect(() => {
    const whenIdle = (run: () => boolean | void) => () => $pendingClose === null && run() !== false;
    return registerCommands("results", {
      "tile-console": whenIdle(() => {
        if (!activeConsole || activeConsole.table || resultPickerItems.length === 0) return false;
        resultPickerOpen = true;
      }),
      "untile-console": whenIdle(() => !!resultLayout && mergeGroup(resultLayout.focus)),
    });
  });

  $effect(() =>
    setZoneNavigator("results", (direction) => {
      if (!resultGrouped || !activeConsole || !resultLayout) return null;
      const side: Side = direction === "up" ? "top" : direction === "down" ? "bottom" : direction;
      const next = neighbor(resultLayout.tree, resultLayout.focus, side);
      if (!next) return null;
      if (next !== terminalGroup) terminalActive = false;
      focusGroup(next);
      return focusGroupContent(next);
    }),
  );

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
    use:reorderable={{
      items: ".console-tab",
      onmove: (from, to) => reorderQueryConsoles(profileId, from, to),
      detach: (tab, event, grab) => !!tab.dataset.consoleId && beginTileDrag(tab.dataset.consoleId, event, tab, grab),
    }}
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
        class:tiled={tiled && item.id !== activeId && tileIds.includes(item.id)}
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
  {#if !activeConsole && !terminalActive}
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
  {/if}
  <!-- Sin consola, el panel inferior existe solo si ya se abrio la terminal
       (para no perder sus sesiones), y se ve solo con ella activa. -->
  {#if activeConsole || TerminalDock}
  <section class="workspace-body" class:idle={!activeConsole && !terminalActive} bind:this={workspaceBody}>
    {#if activeConsole && !activeConsole.table}
    <div
      class="editor-pane"
      bind:this={editorPane}
      use:focusZoneAction={{
        zone: "editor",
        focusDefault: (zone) => focusIn(zone, `[data-tile-id="${CSS.escape(activeConsole?.id ?? "")}"] .cm-content`) || focusIn(zone, ".cm-content"),
      }}
      style={`flex-basis: ${editorFraction * 100}%`}
    >
      <MosaicArea
        bind:this={editorMosaic}
        tree={mosaic}
        focused={activeId ?? null}
        minSize={{ row: 180, column: 90 }}
        untileLabel={$t("mosaic.tile.untile")}
        untileTooltip={$t("mosaic.tile.untileWithKeys", { keys: shortcutKeys("untile-console") })}
        label={consoleLabel}
        onresize={(tree) => setConsoleMosaic(profileId, tree)}
        onarrange={(tree, focus) => void arrange(tree, focus)}
        onfocus={focusTile}
        onuntile={untile}
      >
        {#snippet chip(id)}
          {@const item = consoles.find((candidate) => candidate.id === id)}
          {#if item}
            {#if item.filePath}
              <FileCode size={12} aria-hidden="true" />
            {:else}
              <SquareTerminal size={12} aria-hidden="true" />
            {/if}
            <span class="mosaic-title">{consoleDisplayTitle(item.title, $t)}</span>
            {#if isQueryConsoleDirty(item)}
              <span class="mosaic-dirty" aria-hidden="true"></span>
            {/if}
          {/if}
        {/snippet}
        {#snippet tile(id)}
          {@const item = consoles.find((candidate) => candidate.id === id)}
          <!-- Una consola grande cuyo texto todavia se lee del disco (al
               arrancar) no monta el editor hasta tenerlo. -->
          {#if item && !item.textPending}
            {@const tileExecution = executionForConsole($queryConsoles, id)}
            <div class="editor-host">
              <SqlEditor
                bind:this={editors[id]}
                value={item.sql}
                onchange={(sql) => updateQueryConsoleSql(id, sql)}
                onexecute={(sql) => {
                  // Ejecutar desde el editor (o el historial) muestra el
                  // resultado; una ejecucion que termina sola no saca de la
                  // terminal.
                  terminalActive = false;
                  void requestExecution(id, sql);
                }}
                executing={tileExecution.isExecuting}
                result={tileExecution.result}
                onopentabledefinition={(ref) => (tableDefinitionRequest = ref)}
              />
            </div>

            {#if historyOpen && id === activeId}
              <QueryHistory
                entries={historyEntries}
                oninsert={insertFromHistory}
                onexecute={executeFromHistory}
                onclose={closeHistory}
              />
            {/if}
          {/if}
        {/snippet}
        {#if pickerOpen}
          <TilePicker
            items={pickerItems}
            label={$t("mosaic.picker.label")}
            placeholder={$t("mosaic.picker.search")}
            newLabel={$t("mosaic.picker.new")}
            onpick={pickTile}
            onclose={closePicker}
          />
        {/if}
      </MosaicArea>
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
      tabindex="-1"
      use:focusZoneAction={{
        zone: "results",
        focusDefault: (zone) =>
          focusIn(zone, `[data-tile-id="${CSS.escape(selectedTab)}"] [role="grid"]`) || focusIn(zone, '[role="grid"]') || focusSelf(zone),
      }}
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
        onselecttab={(tab) => {
          terminalActive = false;
          if (activeConsole) selectTab(activeConsole.id, tab);
        }}
        onreordertabs={reorderResultTabs}
        onclosetab={(key) => void closeResultTab(key)}
        onexport={() => (exportFor = viewKey)}
        onpin={() => activeConsole && pinCurrentResult(activeConsole.id)}
        fileEncoding={activeConsole ? fileEncoding(activeConsole) : null}
        onencodingchange={activeConsole && !activeConsole.table
          ? (encoding) => setQueryConsoleEncoding(activeConsole.id, encoding)
          : null}
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
        terminal={TerminalDock ? terminalDock : undefined}
        {terminalActive}
        onterminal={toggleTerminal}
        tiles={activeConsole && !activeConsole.table ? resultTiles : undefined}
        terminalBox={activeConsole && !activeConsole.table ? terminalBox : null}
      />
      {#snippet resultTiles()}
        {#if resultLayout}
          {@const layout = resultLayout}
          <MosaicArea
            bind:this={resultMosaicArea}
            tree={layout.tree}
            focused={layout.focus}
            minSize={{ row: 380, column: 150 }}
            label={(group) => resultLabel(layout.selected[group] ?? OUTPUT_TAB)}
            onresize={(tree) => activeConsole && setLayout(activeConsole.id, { ...layout, tree })}
            onarrange={dropTabInNewGroup}
            onmerge={(target) => dropTabInGroup(target)}
            onfocus={focusGroup}
            stripHeight={GROUP_STRIP_PX}
          >
            {#snippet tile(group)}
              <div class="result-host">{@render resultGroup(group)}</div>
            {/snippet}
            {#if resultPickerOpen}
              <TilePicker
                items={resultPickerItems}
                label={$t("mosaic.picker.resultLabel")}
                placeholder={$t("mosaic.picker.resultSearch")}
                onpick={pickResultTile}
                onclose={closeResultPicker}
              />
            {/if}
          </MosaicArea>
        {/if}
      {/snippet}
      {#snippet resultGroup(group: string)}
        {#if activeConsole && resultLayout}
          {@const item = activeConsole}
          {@const layout = resultLayout}
          {@const consoleId = item.id}
          {@const tab = layout.selected[group] ?? OUTPUT_TAB}
          {@const key = tab === OUTPUT_TAB ? consoleId : tab}
          {@const view = executionForConsole($queryConsoles, key)}
          {@const edit = editStateFor($resultEdits, key)}
          {@const hostsTerminal = group === terminalGroup}
          <ResultPane
            bind:this={resultGroups[group]}
            isExecuting={view.isExecuting}
            result={view.result}
            resultSql={view.resultSql}
            resultAt={view.resultAt}
            sourceLabel={labelForKey(key)}
            columnCatalogInfo={columnInfoFor(key)}
            page={view.page}
            totalRows={view.totalRows}
            counting={view.counting}
            nextPageShortcut={shortcutKeys("next-result-page")}
            previousPageShortcut={shortcutKeys("previous-result-page")}
            onnavigate={(offset, pageSize) => void navigatePage(key, offset, pageSize)}
            sort={view.sort}
            onsort={(column, additive) => void sortResult(key, column, additive)}
            oncount={() => countTotalRows(key)}
            editInfo={edit.info ?? null}
            editBlockedReason={edit.blockedReason ?? null}
            edits={edit.edits ?? EMPTY_EDITS}
            onedits={(edits, at) => commitResultEdits(key, edits, at)}
            lastEditStep={edit.history.at(-1) ?? null}
            onundo={() => undoResultEdit(key)}
            onreload={() => void reloadResult(key)}
            outputLog={$executionLog[consoleId] ?? []}
            consoleRunning={liveExecution.isExecuting}
            oncancelquery={() => cancelExecution(consoleId)}
            cancellingQuery={$cancelling[consoleId] === true}
            tabs={resultTabs.filter((candidate) => layout.member[candidate.key] === group)}
            showOutputTab={layout.member[OUTPUT_TAB] === group}
            activeTab={tab}
            onselecttab={(next) => {
              if (hostsTerminal) terminalActive = false;
              selectTab(consoleId, next);
            }}
            onreordertabs={(from, to) => reorderGroupTabs(group, from, to)}
            onclosetab={(closing) => void closeResultTab(closing)}
            ondetach={beginResultDrag}
            onexport={() => (exportFor = key)}
            onpin={() => pinCurrentResult(consoleId)}
            fileEncoding={group === layout.focus ? fileEncoding(item) : null}
            onencodingchange={(encoding) => setQueryConsoleEncoding(consoleId, encoding)}
            onunpin={() => unpinTab(key)}
            onrepin={() => {
              const id = pinnedIdOf(key);
              if (id !== null) setResultPinned(consoleId, id, true);
            }}
            onpreview={() => void openChangesPreview(key)}
            onsubmit={() => void submitChanges(key)}
            onnotice={notifyError}
            terminalTab={hostsTerminal}
            terminalActive={hostsTerminal && terminalActive}
            onterminal={toggleTerminal}
            tabCommands={group === layout.focus}
            dimmed={resultGrouped && group !== layout.focus}
          />
        {/if}
      {/snippet}
      {#snippet terminalDock()}
        {#if TerminalDock}
          <TerminalDock visible={terminalActive} {profileId} onerror={notifyError} />
        {/if}
      {/snippet}
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

  /* Visible en otro mosaico, sin el foco: texto pleno, sin relleno. */
  .console-tab.tiled {
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

  /* El panel de una pestaña dentro de su mosaico, debajo de la barra. */
  .result-host {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  }




  /* Una franja de 6px para agarrar comodo con el mouse, pero solo pinta una
     linea de 1px centrada adentro (no un bloque con borde arriba y abajo:
     dos lineas a 4px de distancia se leen como una "linea doblada", no
     como una barra). El resto de la franja es hit-area invisible. */
  .workspace-body.idle {
    display: none;
  }

  /* Encima de sus vecinos, sin ocupar alto: la linea queda justo en el
     borde y no deja franjas a los lados (con la franja de pestañas debajo se
     veia doble). */
  .splitter {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    height: 6px;
    margin: -3px 0;
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

  /* Enfocada entera (sin grid), la marca es el destello de la zona. */
  .result-region:focus {
    outline: none;
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
