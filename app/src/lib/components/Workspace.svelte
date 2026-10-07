<script lang="ts">
  import { onePerFrame } from "$lib/onePerFrame";
  import { get } from "svelte/store";
  import { focusZoneAction, setZoneNavigator } from "$lib/focusZones";
  import { registerCommand, registerCommands } from "$lib/workspace/commands";
  import { registerTabCommands } from "$lib/workspace/tabCommands";
  import { tooltip } from "$lib/tooltip";
  import { tabScroll } from "$lib/tabScroll";
  import { editorPalette } from "$lib/theming/theme";
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
  import { editorGroups, setEditorGroups } from "$lib/stores/consoleMosaic";
  import { leaves, neighbor, place, WHOLE, type Mosaic, type Side } from "$lib/workspace/mosaic";
  import {
    choose,
    cornerGroup,
    emptyGroups,
    groupTabs,
    mergeGroup,
    moveTab,
    normalizeGroups,
    renameTab,
    type TabGroups,
  } from "$lib/workspace/tabGroups";
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
  // La consola elegida del grupo enfocado del editor: puede ser una tabla.
  const activeConsole = $derived(consoles.find((item) => item.id === activeId));
  // La consola SQL cuyo resultado se ve abajo: la activa si es SQL; con una
  // tabla enfocada (sus datos se ven en su grupo del editor), la ultima SQL
  // que tuvo el foco.
  // Solo las de la conexion actual cuentan (consoles ya esta filtrada).
  let lastSqlConsole = $state<string | null>(null);
  $effect(() => {
    const item = activeConsole;
    if (item && !item.table) lastSqlConsole = item.id;
  });
  const resultConsole = $derived(
    activeConsole && !activeConsole.table
      ? activeConsole
      : (consoles.find((item) => item.id === lastSqlConsole && !item.table) ?? consoles.find((item) => !item.table)),
  );
  // --- Pestañas de resultado ------------------------------------------
  // Cada pestaña tiene su propio estado (resultado, pagina, total, cambios,
  // historial) guardado bajo su clave: la consola para la pestaña normal,
  // "<consola>#pin<n>" para cada fijada. `liveExecution` es la normal (la
  // que usa el editor); `execution` es la de la pestaña que se esta viendo.
  const pinnedTabs = $derived(resultConsole ? ($pinnedResults[resultConsole.id] ?? []) : []);
  const liveExecution = $derived(
    resultConsole ? executionForConsole($queryConsoles, resultConsole.id) : executionForConsole($queryConsoles, ""),
  );
  // "output" o la clave de la pestaña elegida, por consola.
  let selectedTabByConsole = $state<Record<string, string>>({});

  function tabExists(consoleId: string, tab: string): boolean {
    if (tab === OUTPUT_TAB) return true;
    if (tab === consoleId) return executionForConsole($queryConsoles, consoleId).result?.type === "resultSet";
    return ($pinnedResults[consoleId] ?? []).some((item) => resultKey(consoleId, item.id) === tab);
  }

  const selectedTab = $derived.by(() => {
    if (!resultConsole) return OUTPUT_TAB;
    const consoleId = resultConsole.id;
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
  const viewKey = $derived(resultConsole ? (selectedTab === OUTPUT_TAB ? resultConsole.id : selectedTab) : "");
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


  // Orden de las pestañas de resultado (arrastrables), por consola: claves
  // en el orden en que el usuario las dejo. Las nuevas se agregan al final
  // y la normal conserva su lugar entre ejecuciones (su clave es la misma).
  let resultTabOrder = $state<Record<string, string[]>>({});

  // Fijadas primero (en el orden en que se fijaron) y la normal al final,
  // salvo que el usuario las haya reordenado.
  const resultTabs = $derived.by(() => {
    if (!resultConsole) return [];
    const consoleId = resultConsole.id;
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
    if (layout) resultLayouts = { ...resultLayouts, [consoleId]: renameTab(layout, fromKey, toKey) };
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

  let tableDefinitionRequest = $state<CatalogTableRef | null>(null);
  // "schema@host", igual que labelForKey usa "database || name" como
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
    if (lastSqlConsole === consoleId) lastSqlConsole = null;
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
  // Una por ventana, en el mismo lugar que los datos pero como otro espacio:
  // Ctrl+T alterna entre los dos (sin pestaña: no carga la fila del
  // resultado). Abierta, tapa todo el panel con su propia fila de sesiones;
  // los datos quedan debajo tal como estaban. No es de ninguna consola:
  // sigue a la vista al cambiar de consola o sin ninguna abierta.
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
    if (terminalActive) closeTerminal();
    else openTerminal();
  }

  // El icono de la fila: siempre la abre (abierta, la fila queda tapada).
  function openTerminal() {
    if (terminalActive) return;
    terminalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    terminalActive = true;
    if (!TerminalDock) void import("$lib/components/Terminal.svelte").then((module) => (TerminalDock = module.default));
  }

  // La flecha de la terminal: siempre vuelve a los datos, este donde este el
  // foco (Ctrl+T, con el foco fuera, primero lleva a ella).
  function closeTerminal() {
    if (!terminalActive) return;
    terminalActive = false;
    if (terminalReturnFocus?.isConnected) terminalReturnFocus.focus({ preventScroll: true });
  }


  $effect(() => registerCommands("global", { "toggle-terminal": toggleTerminal }));

  // Ctrl+Tab y Ctrl+1..9 fuera del panel inferior y de la terminal: las
  // consolas del grupo enfocado (workspace/tabCommands.ts).
  $effect(() =>
    registerTabCommands("global", {
      // Las del grupo enfocado, como en la fila del resultado.
      keys: () => (editorLayout ? groupTabs(editorLayout, editorLayout.focus, consoleIds) : consoleIds),
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

  // Al abrir (o volver a) una pestaña de tabla sin datos todavia, se carga:
  // la elegida de cada grupo del editor (se ven todas a la vez).
  $effect(() => {
    const shown = new Set(Object.values(editorLayout?.selected ?? {}));
    if (activeId) shown.add(activeId);
    for (const item of consoles) {
      if (!item.table || !shown.has(item.id) || tableLoadAttempted.has(item.id)) continue;
      const state = executionForConsole($queryConsoles, item.id);
      if (state.result !== null || state.isExecuting) continue;
      tableLoadAttempted.add(item.id);
      void runTableQuery(item.id);
    }
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
      // Una tabla enfocada en su grupo: buscar en su grid.
      if (activeConsole?.table) {
        const body = tableBodies[activeConsole.id];
        if (!body) return false;
        body.toggleFind();
        return;
      }
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
  const filterResult = executions.filter;

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
  // Con una tabla enfocada, sus datos; si no, la pestaña elegida del
  // resultado.
  function stepPage(direction: 1 | -1): boolean {
    const key = activeConsole?.table ? activeConsole.id : resultConsole ? viewKey : null;
    if (key === null) return false;
    const target = executionForConsole($queryConsoles, key);
    if (target.isExecuting) return false;
    const { page, result } = target;
    if (!page?.pageable || result?.type !== "resultSet") return false;
    if (direction === 1 && !result.truncated) return false;
    if (direction === -1 && page.offset === 0) return false;
    const offset = Math.max(0, page.offset + direction * page.pageSize);
    void navigatePage(key, offset, page.pageSize);
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

  // --- Grupos de consolas en el editor (workspace/tabGroups.ts) -------------
  // Como los grupos de VS Code y con el mismo sistema que el resultado: el
  // editor se parte en grupos (MosaicArea), cada uno con su fila de
  // carpetas (las consolas, archivos y tablas que tiene) y debajo la elegida.
  // La consola activa es la elegida del grupo enfocado. Una consola vive en
  // un solo grupo; las nuevas entran en el enfocado. Una pestaña de tabla
  // muestra sus datos en su grupo; abajo sigue el resultado de la ultima
  // consola SQL enfocada (resultConsole). Los grupos se guardan por conexion
  // (stores/consoleMosaic.ts).
  const FIRST_EDITOR_GROUP = "e0";
  let editorGroupCount = 0;
  const editorLayout = $derived($editorGroups[profileId] ?? null);
  const editorGrouped = $derived(leaves(editorLayout?.tree ?? null).length > 1);
  const consoleIds = $derived(consoles.map((item) => item.id));
  let editorMosaic = $state<ReturnType<typeof MosaicArea>>();
  // El panel de cada tabla abierta en un grupo (buscar, cerrar filtros).
  let tableBodies = $state<Record<string, ReturnType<typeof ResultPane> | undefined>>({});

  function consoleLabel(id: string): string {
    const item = consoles.find((candidate) => candidate.id === id);
    return item ? consoleDisplayTitle(item.title, $t) : "";
  }

  function freshEditorGroup(): string {
    const used = new Set(leaves(editorLayout?.tree ?? null));
    let id: string;
    do id = `e${++editorGroupCount}`;
    while (used.has(id));
    return id;
  }

  $effect(() => {
    const ids = consoleIds;
    const chosen = activeId ?? null;
    const profile = profileId;
    untrack(() => {
      const previous = get(editorGroups)[profile] ?? null;
      let groups = normalizeGroups(previous ?? emptyGroups(FIRST_EDITOR_GROUP), ids);
      // La elegida del grupo enfocado se cerro: la reemplaza otra de su
      // grupo (o la de su hermano), no la pestaña vecina que eligio cerrar.
      const lost = previous && previous.selected[previous.focus] && !ids.includes(previous.selected[previous.focus]);
      const replacement = groups.selected[groups.focus];
      if (lost && replacement && replacement !== chosen) {
        setEditorGroups(profile, groups);
        activateQueryConsole(profile, replacement);
        return;
      }
      if (chosen) groups = choose(groups, chosen);
      setEditorGroups(profile, groups);
      if (chosen) void followFocus(chosen);
    });
  });

  // Elegir en otra parte (Ctrl+Tab, el explorador, un archivo) una consola
  // de otro grupo la activa, pero el foco del teclado seguia en el editor
  // anterior: se escribia en uno con el resultado del otro abajo. Si el foco
  // esta en el editor de otro grupo, pasa al de la activa.
  async function followFocus(id: string) {
    await tick();
    const holder = document.activeElement?.closest<HTMLElement>('[data-focus-zone="editor"] [data-tile-id]');
    const group = get(editorGroups)[profileId]?.member[id];
    if (holder && group && holder.dataset.tileId !== group) editors[id]?.focus();
  }

  // Cambiar los grupos y activar una consola en el mismo paso: el efecto de
  // arriba ya la encuentra en su lugar.
  async function arrangeEditor(groups: TabGroups, focus: string | null) {
    setEditorGroups(profileId, normalizeGroups(groups, consoleIds));
    if (focus) activateQueryConsole(profileId, focus);
    await tick();
    if (focus) editors[focus]?.focus();
  }

  function focusEditorGroup(group: string) {
    const id = editorLayout?.selected[group];
    if (id && id !== activeId) activateQueryConsole(profileId, id);
  }

  // Sacar una pestaña de consola de la fila de su grupo: al borde de un
  // grupo, uno nuevo de ese lado; en su fila o en su centro, entra en el.
  let pendingEditorDrag: { id: string; from: string } | null = null;

  function beginConsoleDrag(id: string, start: PointerEvent, source: HTMLElement, grab: { x: number; y: number }): boolean {
    if (!editorMosaic || !editorLayout) return false;
    const from = editorLayout.member[id];
    const alone = groupTabs(editorLayout, from, consoleIds).length === 1;
    pendingEditorDrag = { id, from };
    return editorMosaic.beginDrag(freshEditorGroup(), start, {
      source,
      grab,
      vacate: alone ? from : undefined,
      origin: from,
      merge: true,
      landing: () => editorPane?.querySelector<HTMLElement>(`.console-tab[data-console-id="${CSS.escape(id)}"]`) ?? null,
    });
  }

  function dropConsoleInNewGroup(tree: Mosaic, group: string) {
    const drag = pendingEditorDrag;
    pendingEditorDrag = null;
    if (!drag || !editorLayout) return;
    void arrangeEditor(moveTab({ ...editorLayout, tree }, drag.id, group, consoleIds), drag.id);
  }

  function dropConsoleInGroup(target: string) {
    const drag = pendingEditorDrag;
    pendingEditorDrag = null;
    if (!drag || !editorLayout || target === drag.from) return;
    void arrangeEditor(moveTab(editorLayout, drag.id, target, consoleIds), drag.id);
  }

  // Reordenar en la fila de un grupo: los indices son de sus pestañas; el
  // orden de la conexion se reacomoda solo en esos lugares.
  function reorderGroupConsoles(group: string, from: number, to: number) {
    if (!editorLayout) return;
    const layout = editorLayout;
    const mine = consoleIds.filter((id) => layout.member[id] === group);
    const fromIndex = consoleIds.indexOf(mine[from]);
    const toIndex = consoleIds.indexOf(mine[to]);
    if (fromIndex >= 0 && toIndex >= 0) reorderQueryConsoles(profileId, fromIndex, toIndex);
  }

  // + de la fila de un grupo: una consola nueva en ese grupo.
  function newConsoleIn(group: string) {
    if (editorLayout && editorLayout.focus !== group) setEditorGroups(profileId, { ...editorLayout, focus: group });
    createQueryConsole(profileId);
  }

  // Ctrl+Alt+M con el foco en el editor: una consola que no se ve pasa a un
  // grupo nuevo junto al enfocado (o una nueva).
  let pickerOpen = $state(false);
  const pickerItems = $derived.by(() => {
    const shown = new Set(Object.values(editorLayout?.selected ?? {}));
    return consoles
      .filter((item) => !shown.has(item.id))
      .map((item) => ({
        id: item.id,
        title: consoleDisplayTitle(item.title, $t),
        icon: item.table ? ("result" as const) : item.filePath ? ("file" as const) : ("console" as const),
      }));
  });

  function pickTile(id: string | null, side: "right" | "bottom", whole: boolean) {
    pickerOpen = false;
    if (!editorLayout) return;
    const group = freshEditorGroup();
    const tree = place(editorLayout.tree, whole ? WHOLE : editorLayout.focus, group, side);
    if (editorMosaic && !editorMosaic.fits(tree)) {
      notifyError($t("mosaic.noRoom"));
      return;
    }
    const chosen = id ?? createQueryConsole(profileId);
    const ids = consoleIds.includes(chosen) ? consoleIds : [...consoleIds, chosen];
    setEditorGroups(profileId, normalizeGroups(moveTab({ ...editorLayout, tree }, chosen, group, ids), ids));
    activateQueryConsole(profileId, chosen);
    void tick().then(() => editors[chosen]?.focus());
  }

  function closePicker(refocus: boolean) {
    pickerOpen = false;
    if (refocus) sqlEditor?.focus();
  }

  $effect(() => {
    const whenIdle = (run: () => boolean | void) => () => $pendingClose === null && run() !== false;
    return registerCommands("global", {
      "tile-console": whenIdle(() => {
        if (!editorLayout) return false;
        historyOpen = false;
        pickerOpen = true;
      }),
      "untile-console": whenIdle(() => {
        if (!editorLayout) return false;
        const merged = mergeGroup(editorLayout, editorLayout.focus);
        if (!merged) return false;
        void arrangeEditor(merged, merged.selected[merged.focus] ?? null);
      }),
    });
  });

  // Ctrl+Shift+Alt+flechas recorren los grupos antes de salir del editor
  // (focusZones.ts): en el borde, el foco pasa a la zona vecina.
  $effect(() =>
    setZoneNavigator("editor", (direction) => {
      if (!editorGrouped || !editorLayout) return null;
      const side: Side = direction === "up" ? "top" : direction === "down" ? "bottom" : direction;
      const next = neighbor(editorLayout.tree, editorLayout.focus, side);
      const id = next ? editorLayout.selected[next] : null;
      if (!next || !id) return null;
      activateQueryConsole(profileId, id);
      const element = editorMosaic?.tileElement(next) ?? null;
      if (editors[id]) editors[id]?.focus();
      else element?.querySelector<HTMLElement>('[role="grid"]')?.focus({ preventScroll: true });
      return element;
    }),
  );

  // --- Resultado en grupos (workspace/tabGroups.ts) -------------------------
  // El mismo sistema que el editor: el resultado de resultConsole se parte en
  // grupos, cada uno con su fila de carpetas y la pestaña elegida debajo. La
  // elegida de la consola es la del grupo enfocado y ejecutar agrega el
  // resultado nuevo a ese grupo. La Salida no entra en el mosaico: es
  // siempre la primera del grupo de arriba a la izquierda. Vive en memoria,
  // por consola, como sus pestañas.
  const FIRST_GROUP = "g0";
  // Alto de la fila de carpetas de un grupo (2rem + 6px, tabs.css): soltar
  // una pestaña ahi la acopla a ese grupo.
  const GROUP_STRIP_PX = 38;
  const RESULT_PINNED = { [OUTPUT_TAB]: "left" } as const;
  let resultGroupCount = 0;
  let resultLayouts = $state<Record<string, TabGroups>>({});
  let resultMosaicArea = $state<ReturnType<typeof MosaicArea>>();
  // Un panel por grupo; el del enfocado recibe buscar.
  let resultGroups = $state<Record<string, ReturnType<typeof ResultPane> | undefined>>({});
  const resultKeys = $derived([OUTPUT_TAB, ...resultTabs.map((tab) => tab.key)]);
  const resultLayout = $derived(resultConsole ? (resultLayouts[resultConsole.id] ?? null) : null);
  const resultGrouped = $derived(leaves(resultLayout?.tree ?? null).length > 1);

  function setLayout(consoleId: string, groups: TabGroups) {
    resultLayouts = { ...resultLayouts, [consoleId]: normalizeGroups(groups, resultKeys, RESULT_PINNED) };
  }

  function freshResultGroup(): string {
    const used = new Set(leaves(resultLayout?.tree ?? null));
    let id: string;
    do id = `g${++resultGroupCount}`;
    while (used.has(id));
    return id;
  }

  // Al aparecer o irse pestañas, y al elegir una.
  $effect(() => {
    const item = resultConsole;
    if (!item) return;
    const keys = resultKeys;
    const chosen = selectedTab;
    untrack(() => {
      const previous = resultLayouts[item.id] ?? null;
      let groups = normalizeGroups(previous ?? emptyGroups(FIRST_GROUP), keys, RESULT_PINNED);
      // La elegida que se fue: otra de su mismo grupo, no la que elija el
      // respaldo de la consola (podia saltar a otro grupo).
      const lost = previous && previous.selected[previous.focus] && !keys.includes(previous.selected[previous.focus]);
      const replacement = groups.selected[groups.focus];
      if (lost && replacement && replacement !== chosen) {
        resultLayouts = { ...resultLayouts, [item.id]: groups };
        selectTab(item.id, replacement);
        return;
      }
      groups = choose(groups, chosen);
      resultLayouts = { ...resultLayouts, [item.id]: groups };
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

  async function arrangeResults(groups: TabGroups) {
    const item = resultConsole;
    if (!item) return;
    setLayout(item.id, groups);
    const layout = resultLayouts[item.id];
    selectTab(item.id, layout.selected[layout.focus]);
    await tick();
    focusGroupContent(layout.focus);
  }

  // Sacar una pestaña de la fila de su grupo: al borde de un grupo, uno
  // nuevo de ese lado; en su fila o en su centro, entra en el.
  let pendingDrag: { key: string; from: string } | null = null;

  function beginResultDrag(key: string, start: PointerEvent, source: HTMLElement, grab: { x: number; y: number }): boolean {
    if (!resultConsole || !resultMosaicArea || !resultLayout) return false;
    const from = resultLayout.member[key];
    const alone = groupTabs(resultLayout, from, resultKeys).length === 1;
    pendingDrag = { key, from };
    return resultMosaicArea.beginDrag(freshResultGroup(), start, {
      source,
      grab,
      vacate: alone ? from : undefined,
      origin: from,
      merge: true,
      landing: () => resultRegion?.querySelector<HTMLElement>(`.result-tab[data-result-key="${CSS.escape(key)}"]`) ?? null,
    });
  }

  function dropTabInNewGroup(tree: Mosaic, group: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (!drag || !resultLayout) return;
    void arrangeResults(moveTab({ ...resultLayout, tree }, drag.key, group, resultKeys));
  }

  function dropTabInGroup(target: string) {
    const drag = pendingDrag;
    pendingDrag = null;
    if (!drag || !resultLayout || target === drag.from) return;
    void arrangeResults(moveTab(resultLayout, drag.key, target, resultKeys));
  }

  // Reordenar en la fila de un grupo: los indices son de sus pestañas de
  // resultado; el orden de la consola se reacomoda solo en esos lugares.
  function reorderGroupTabs(group: string, from: number, to: number) {
    if (!resultConsole || !resultLayout) return;
    const layout = resultLayout;
    const all = resultTabs.map((tab) => tab.key);
    const mine = all.filter((key) => layout.member[key] === group);
    const moved = moveItem(mine, from, to);
    let index = 0;
    resultTabOrder = { ...resultTabOrder, [resultConsole.id]: all.map((key) => (layout.member[key] === group ? moved[index++] : key)) };
  }

  function focusGroup(group: string) {
    if (!resultConsole || !resultLayout) return;
    const key = resultLayout.selected[group];
    if (key && key !== selectedTab) selectTab(resultConsole.id, key);
  }

  // Ctrl+Alt+M con el foco en el resultado: una pestaña que no se ve pasa a
  // un grupo nuevo junto al enfocado (sin la Salida, que no entra en el
  // mosaico, ni "nueva": las crea ejecutar).
  let resultPickerOpen = $state(false);
  const resultPickerItems = $derived.by(() => {
    if (!resultLayout) return [];
    const shown = new Set(Object.values(resultLayout.selected));
    return resultTabs
      .filter((tab) => !shown.has(tab.key))
      .map((tab) => ({ id: tab.key, title: tab.label, icon: tab.pinned ? ("pinned" as const) : ("result" as const) }));
  });

  function pickResultTile(key: string | null, side: "right" | "bottom", whole: boolean) {
    resultPickerOpen = false;
    if (key === null || !resultLayout) return;
    const group = freshResultGroup();
    const tree = place(resultLayout.tree, whole ? WHOLE : resultLayout.focus, group, side);
    if (resultMosaicArea && !resultMosaicArea.fits(tree)) {
      notifyError($t("mosaic.noRoom"));
      return;
    }
    void arrangeResults(moveTab({ ...resultLayout, tree }, key, group, resultKeys));
  }

  function closeResultPicker(refocus: boolean) {
    resultPickerOpen = false;
    if (refocus && resultLayout) focusGroupContent(resultLayout.focus);
  }

  $effect(() => {
    const whenIdle = (run: () => boolean | void) => () => $pendingClose === null && run() !== false;
    return registerCommands("results", {
      "tile-console": whenIdle(() => {
        if (!resultConsole || resultPickerItems.length === 0) return false;
        resultPickerOpen = true;
      }),
      "untile-console": whenIdle(() => {
        if (!resultLayout) return false;
        const merged = mergeGroup(resultLayout, resultLayout.focus);
        if (!merged) return false;
        void arrangeResults(merged);
      }),
    });
  });

  $effect(() =>
    setZoneNavigator("results", (direction) => {
      if (!resultGrouped || !resultLayout) return null;
      const side: Side = direction === "up" ? "top" : direction === "down" ? "bottom" : direction;
      const next = neighbor(resultLayout.tree, resultLayout.focus, side);
      if (!next) return null;
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
    {#if activeConsole}
    <div
      class="editor-pane"
      bind:this={editorPane}
      use:focusZoneAction={{
        zone: "editor",
        focusDefault: (zone) => {
          const group = CSS.escape(editorLayout?.focus ?? "");
          return focusIn(zone, `[data-tile-id="${group}"] .cm-content`) || focusIn(zone, `[data-tile-id="${group}"] [role="grid"]`) || focusIn(zone, ".cm-content");
        },
      }}
      style={`flex-basis: ${editorFraction * 100}%`}
    >
      <MosaicArea
        bind:this={editorMosaic}
        tree={editorLayout?.tree ?? null}
        focused={editorLayout?.focus ?? null}
        minSize={{ row: 220, column: 110 }}
        label={(group) => consoleLabel(editorLayout?.selected[group] ?? "")}
        onresize={(tree) => editorLayout && setEditorGroups(profileId, { ...editorLayout, tree })}
        onarrange={dropConsoleInNewGroup}
        onmerge={(target) => dropConsoleInGroup(target)}
        onfocus={focusEditorGroup}
        stripHeight={GROUP_STRIP_PX}
      >
        {#snippet tile(group)}
          <div class="editor-group">
            {@render consoleStrip(group)}
            {@render consoleBody(group)}
          </div>
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
      {#snippet consoleStrip(group: string)}
        {@const layout = editorLayout}
        {@const mine = layout ? consoles.filter((item) => layout.member[item.id] === group) : consoles}
        {@const chosen = layout?.selected[group] ?? activeId}
        <!-- La fila de un grupo: carpetas como las del resultado (tabs.css),
             con lo propio de una consola: cambios sin guardar, renombrar, su
             menu y guardar o descartar al cerrar. -->
        <div
          class="result-tabs tab-strip console-strip"
          class:dimmed={editorGrouped && group !== layout?.focus}
          role="tablist"
          aria-label={$t("workspace.tabs.aria")}
        >
          <div
            class="result-tabs-scroll"
            use:tabScroll={`${chosen}|${mine.length}`}
            use:reorderable={{
              items: ".result-tab.closable",
              onmove: (from, to) => reorderGroupConsoles(group, from, to),
              detach: (tab, event, grab) => !!tab.dataset.consoleId && beginConsoleDrag(tab.dataset.consoleId, event, tab, grab),
            }}
          >
            {#each mine as item (item.id)}
              {@const dirty = isQueryConsoleDirty(item)}
              {@const title = consoleDisplayTitle(item.title, $t)}
              <div
                class="result-tab closable console-tab"
                class:active={item.id === chosen}
                class:dirty
                data-console-id={item.id}
                role="presentation"
                style:--tab-active={item.table ? "var(--surface-content)" : $editorPalette.background}
                oncontextmenu={(event) => openTabMenu(event, item.id)}
                animate:flip={{ duration: flipDuration(150) }}
                in:fly={{ x: -8, duration: 150 }}
                out:fade={{ duration: 120 }}
              >
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
                  <button
                    type="button"
                    role="tab"
                    class="tab-select"
                    aria-selected={item.id === chosen}
                    onclick={() => activateQueryConsole(profileId, item.id)}
                  >
                    {#if item.table}
                      <Table size={12} aria-hidden="true" />
                    {:else if item.filePath}
                      <FileCode size={12} aria-hidden="true" />
                    {:else}
                      <SquareTerminal size={12} aria-hidden="true" />
                    {/if}
                    <span
                      class="console-tab-title"
                      use:tooltip={item.table ? `${item.table.schema}.${item.table.name}` : (item.filePath ?? title)}>{title}</span
                    >
                  </button>
                {/if}
                <button
                  type="button"
                  class="tab-close"
                  aria-label={$t(dirty ? "workspace.tabs.closeDirty" : "workspace.tabs.close", { title })}
                  use:tooltip={dirty
                    ? $t(item.filePath ? "workspace.tabs.unsavedFile" : "workspace.tabs.unsavedConsole", {
                        shortcut: shortcutKeys("save-query-console"),
                      })
                    : undefined}
                  onclick={(event) => closeConsole(event, item.id)}
                >
                  <span class="dirty-dot" aria-hidden="true"></span>
                  <X size={11} class="close-icon" aria-hidden="true" />
                </button>
              </div>
            {/each}
          </div>
          <button
            type="button"
            class="new-console"
            use:tooltip={$t("workspace.tabs.newTitle", { shortcut: shortcutKeys("new-query-console") })}
            aria-label={$t("workspace.tabs.newAria")}
            onclick={() => newConsoleIn(group)}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      {/snippet}
      {#snippet consoleBody(group: string)}
        {@const id = editorLayout?.selected[group] ?? activeId}
        {@const item = consoles.find((candidate) => candidate.id === id)}
        {#if item?.table}
          <!-- Una tabla: sus datos en su grupo, con su constructor de
               filtros. Sus atajos del grid responden con el foco en el
               editor (commandZone). -->
          {@const view = executionForConsole($queryConsoles, item.id)}
          {@const edit = editStateFor($resultEdits, item.id)}
          {@const table = item.table}
          <div class="table-host">
            <ResultPane
              bind:this={tableBodies[item.id]}
              isExecuting={view.isExecuting}
              result={view.result}
              resultSql={view.resultSql}
              resultAt={view.resultAt}
              sourceLabel={labelForKey(item.id)}
              columnCatalogInfo={columnInfoFor(item.id)}
              page={view.page}
              totalRows={view.totalRows}
              counting={view.counting}
              nextPageShortcut={shortcutKeys("next-result-page")}
              previousPageShortcut={shortcutKeys("previous-result-page")}
              onnavigate={(offset, pageSize) => void navigatePage(item.id, offset, pageSize)}
              sort={view.sort}
              onsort={(column, additive) => void sortResult(item.id, column, additive)}
              oncount={() => countTotalRows(item.id)}
              editInfo={edit.info ?? null}
              editBlockedReason={edit.blockedReason ?? null}
              edits={edit.edits ?? EMPTY_EDITS}
              onedits={(edits, at) => commitResultEdits(item.id, edits, at)}
              lastEditStep={edit.history.at(-1) ?? null}
              onundo={() => undoResultEdit(item.id)}
              onreload={() => void reloadResult(item.id)}
              outputLog={$executionLog[item.id] ?? []}
              consoleRunning={view.isExecuting}
              oncancelquery={() => cancelExecution(item.id)}
              cancellingQuery={$cancelling[item.id] === true}
              tabs={[{ key: item.id, label: labelForKey(item.id) ?? consoleDisplayTitle(item.title, $t), pinned: false }]}
              activeTab={item.id}
              onexport={() => (exportFor = item.id)}
              onpreview={() => void openChangesPreview(item.id)}
              onsubmit={() => void submitChanges(item.id)}
              onnotice={notifyError}
              fileEncoding={fileEncoding(item)}
              onencodingchange={null}
              tableView
              filters={tableFiltersBar}
              filterCount={table.where ? table.conditions.filter((condition) => condition.column).length : 0}
              filterError={!!tableFilterError[item.id]}
              tabCommands={false}
              commandZone="editor"
              columnFilters={view.columnFilters}
              onfilterchange={(filters) => void filterResult(item.id, filters)}
              loadColumnValues={(column) => executions.columnValues(item.id, column)}
            />
            {#snippet tableFiltersBar()}
              {#if $activeEngine}
                <TableFilters
                  filters={table}
                  columns={filterColumns(table, $catalogTables, view.result)}
                  engine={$activeEngine}
                  error={tableFilterError[item.id] ?? null}
                  busy={view.isExecuting}
                  onapply={(filters) => applyTableFilters(item.id, filters)}
                  onclose={() => tableBodies[item.id]?.closeFilters()}
                />
              {/if}
            {/snippet}
          </div>
        {:else if item && !item.textPending}
          <!-- Una consola grande cuyo texto todavia se lee del disco (al
               arrancar) no monta el editor hasta tenerlo. -->
          <div class="editor-host">
            <!-- Un bloque con clave por consola: al pasar a otra del grupo, el
                 editor que se va guarda su texto (al desmontarse) en SU
                 consola. Con `item` directo, el callback ya apuntaba a la
                 nueva y el texto terminaba en ella. -->
            {#each [item] as editing (editing.id)}
              {@const tileExecution = executionForConsole($queryConsoles, editing.id)}
              <SqlEditor
                bind:this={editors[editing.id]}
                value={editing.sql}
                onchange={(sql) => updateQueryConsoleSql(editing.id, sql)}
                onexecute={(sql) => {
                  // Ejecutar desde el editor (o el historial) muestra el
                  // resultado; una ejecucion que termina sola no saca de la
                  // terminal.
                  terminalActive = false;
                  void requestExecution(editing.id, sql);
                }}
                executing={tileExecution.isExecuting}
                result={tileExecution.result}
                onopentabledefinition={(ref) => (tableDefinitionRequest = ref)}
              />
            {/each}
          </div>

          {#if historyOpen && item.id === activeId}
            <QueryHistory
              entries={historyEntries}
              oninsert={insertFromHistory}
              onexecute={executeFromHistory}
              onclose={closeHistory}
            />
          {/if}
        {/if}
      {/snippet}
    </div>
    {#if liveExecution.pendingConfirmation && resultConsole}
      <!-- Cada confirmacion nueva abre su propio modal. -->
      {#key liveExecution.pendingConfirmation}
        <ExecutionGuard
          count={liveExecution.pendingConfirmation.script?.statements.length ?? 1}
          production={$isProduction}
          oncancel={() => cancelPendingExecution(resultConsole.id)}
          onconfirm={() => confirmPendingExecution(resultConsole.id)}
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
      <!-- El panel de la ventana: sin fila ni cuerpo propios, dibuja los
           grupos del resultado (resultTiles) y la terminal, que no se
           vuelve a montar. Sin consola SQL, solo su fila (Salida y Terminal). -->
      <ResultPane
        bind:this={resultPane}
        isExecuting={false}
        result={null}
        outputLog={resultConsole ? ($executionLog[resultConsole.id] ?? []) : []}
        consoleRunning={liveExecution.isExecuting}
        terminal={TerminalDock ? terminalDock : undefined}
        {terminalActive}
        tiles={resultConsole ? resultTiles : undefined}
        onterminal={resultConsole ? undefined : openTerminal}
      />
      {#snippet resultTiles()}
        {#if resultLayout}
          {@const layout = resultLayout}
          <MosaicArea
            bind:this={resultMosaicArea}
            tree={layout.tree}
            focused={layout.focus}
            minSize={{ row: 320, column: 150 }}
            label={(group) => resultLabel(layout.selected[group] ?? OUTPUT_TAB)}
            onresize={(tree) => resultConsole && setLayout(resultConsole.id, { ...layout, tree })}
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
        {#if resultConsole && resultLayout}
          {@const item = resultConsole}
          {@const layout = resultLayout}
          {@const consoleId = item.id}
          {@const tab = layout.selected[group] ?? OUTPUT_TAB}
          {@const key = tab === OUTPUT_TAB ? consoleId : tab}
          {@const view = executionForConsole($queryConsoles, key)}
          {@const edit = editStateFor($resultEdits, key)}
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
              selectTab(consoleId, next);
            }}
            onreordertabs={(from, to) => reorderGroupTabs(group, from, to)}
            onclosetab={(closing) => void closeResultTab(closing)}
            columnFilters={view.columnFilters}
            onfilterchange={(filters) => void filterResult(key, filters)}
            loadColumnValues={(column) => executions.columnValues(key, column)}
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
                tabCommands={group === layout.focus}
            onterminal={group === cornerGroup(layout.tree, "right") ? openTerminal : undefined}
            dimmed={resultGrouped && group !== layout.focus}
          />
        {/if}
      {/snippet}
      {#snippet terminalDock()}
        {#if TerminalDock}
          <TerminalDock
            visible={terminalActive}
            {profileId}
            onerror={notifyError}
            onback={closeTerminal}
            backKeys={shortcutKeys("toggle-terminal")}
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

  /* La fila de cada grupo del editor: las carpetas de tabs.css, con lo
     propio de una consola. El + queda fijo a la derecha de sus pestañas. */
  .console-strip {
    flex-shrink: 0;
  }

  .new-console {
    display: inline-flex;
    flex-shrink: 0;
    align-self: center;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    margin-left: var(--space-1);
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  .new-console:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  .new-console:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .console-tab-title {
    white-space: nowrap;
  }

  /* La bolita de "sin guardar" y la X ocupan el mismo lugar del boton de
     cierre, asi la pestaña no cambia de ancho al alternar. Con cambios
     pendientes se ve la bolita; al pasar el mouse por la pestaña (o enfocar
     el boton) se cambia por la X, como en los editores de codigo. */
  .console-tab .tab-close {
    position: relative;
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

  .console-tab .tab-close :global(.close-icon) {
    transition: opacity 120ms ease;
  }

  .console-tab.dirty .dirty-dot {
    opacity: 1;
    transform: scale(1);
  }

  .console-tab.dirty .tab-close :global(.close-icon) {
    opacity: 0;
  }

  .console-tab.dirty:hover .dirty-dot,
  .console-tab.dirty .tab-close:focus-visible .dirty-dot {
    opacity: 0;
    transform: scale(0.4);
  }

  .console-tab.dirty:hover .tab-close :global(.close-icon),
  .console-tab.dirty .tab-close:focus-visible :global(.close-icon) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .dirty-dot,
    .console-tab .tab-close :global(.close-icon) {
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

  /* Un grupo: su fila y debajo la consola (o la tabla) elegida. */
  .editor-group {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  }

  .table-host {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    animation: content-in 150ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  /* Elegir otra consola del grupo (con el mouse o con Ctrl+Tab) monta su
     editor: entra con un fundido corto, como el resultado (motion.ts). */
  .editor-host > :global(.editor-frame) {
    animation: content-in 150ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  @keyframes content-in {
    from {
      opacity: 0.35;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .table-host,
    .editor-host > :global(.editor-frame) {
      animation: none;
    }
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
