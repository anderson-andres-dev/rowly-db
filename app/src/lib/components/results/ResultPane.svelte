<script lang="ts">
  import EncodingPicker from "$lib/components/EncodingPicker.svelte";
  import type { TextEncoding } from "$lib/textEncoding";
  import { formatDecimal, type SelectionSummary } from "$lib/results/gridSelectionSummary";
  import { tooltip } from "$lib/tooltip";
  import { settleTransitions } from "$lib/settleTransitions";
  import { tabScroll } from "$lib/tabScroll";
  import {
    ArrowUpFromLine,
    Eye,
    Minus,
    Plus,
    RotateCw,
    SquareTerminal,
    Table,
    TableProperties,
    Undo2,
    X,
    Check,
    ChevronDown,
    FileOutput,
    Pin,
    PinOff,
    Search,
    Filter,
    Icon,
  } from "@lucide/svelte";
  import FindBar from "$lib/components/results/FindBar.svelte";
  import { flip } from "svelte/animate";
  import { flipDuration, reorderable } from "$lib/reorder";
  import { findInPage, type FindOptions, type FindResult } from "$lib/results/gridFind";

  import { COPY_FORMATS, type PasteBlock } from "$lib/results/gridClipboard";
  import { copySettings } from "$lib/stores/copyFormat";
  import type { EditStep } from "$lib/stores/resultEdits";
  import type { LogEntry } from "$lib/stores/executionLog";
  import OutputLog from "$lib/components/results/OutputLog.svelte";
  import type { ColumnCatalogInfo, QueryExecutionResult, ResultPage, SortKey } from "$lib/types";
  import DataGrid from "$lib/components/results/DataGrid.svelte";
  import ResultPager from "$lib/components/results/ResultPager.svelte";
  import ToolbarButton from "$lib/components/results/ToolbarButton.svelte";
  import {
    EMPTY_EDITS,
    addRow,
    deleteRows,
    pasteBlock,
    pendingCount,
    setCellValue,
    fillCells,
    type CellValue,
    type PendingEdits,
    type ResultEditInfo,
    type RowRange,
  } from "$lib/results/resultEditing";
  import { shortcuts } from "$lib/stores/shortcuts";
  import { registerCommands } from "$lib/workspace/commands";
  import { registerTabCommands } from "$lib/workspace/tabCommands";
  import { numberFormat, t } from "$lib/i18n";
  import { tick, untrack, type Snippet } from "svelte";
  import { editorPalette } from "$lib/theming/theme";
  import type { IconNode } from "@lucide/svelte";
  import ColumnFilterPopover from "$lib/components/results/ColumnFilterPopover.svelte";
  import {
    columnValueCounts,
    rowsHiddenByFilters,
    withColumnFilter,
    type ColumnFilters,
  } from "$lib/results/columnFilters";

  let {
    isExecuting,
    result,
    resultSql = null,
    resultAt = null,
    sourceLabel = null,
    columnCatalogInfo = null,
    page = null,
    totalRows = null,
    counting = false,
    nextPageShortcut = "",
    previousPageShortcut = "",
    onnavigate = () => {},
    sort = [],
    onsort = () => {},
    oncount = async () => null,
    editInfo = null,
    editBlockedReason = null,
    edits = EMPTY_EDITS,
    onedits = () => {},
    lastEditStep = null,
    onundo = () => {},
    onreload = () => {},
    onpreview = () => {},
    onsubmit = () => {},
    onnotice = () => {},
    fileEncoding = null,
    onencodingchange = () => {},
    outputLog = [],
    consoleRunning = false,
    oncancelquery,
    cancellingQuery = false,
    tabs = [],
    activeTab = "output",
    onselecttab = () => {},
    onreordertabs = () => {},
    onclosetab = () => {},
    onexport = () => {},
    onpin = () => {},
    onunpin = () => {},
    onrepin = () => {},
    filters,
    tableView = false,
    filterCount = 0,
    filterError = false,
    terminal,
    terminalActive = false,
    onterminal = () => {},
  }: {
    isExecuting: boolean;
    result: QueryExecutionResult | null;
    resultSql?: string | null;
    resultAt?: number | null;
    sourceLabel?: string | null;
    columnCatalogInfo?: Map<string, ColumnCatalogInfo> | null;
    page?: ResultPage | null;
    totalRows?: number | null;
    counting?: boolean;
    nextPageShortcut?: string;
    previousPageShortcut?: string;
    onnavigate?: (offset: number, pageSize: number) => void;
    // Orden de los encabezados de la pestaña y el clic (Shift = agregar).
    sort?: SortKey[];
    onsort?: (column: number, additive: boolean) => void;
    oncount?: () => Promise<number | null>;
    editInfo?: ResultEditInfo | null;
    editBlockedReason?: string | null;
    edits?: PendingEdits;
    onedits?: (edits: PendingEdits, at: RowRange | null) => void;
    // Ultimo paso deshacible (para saber a donde llevar el grid al deshacer).
    lastEditStep?: EditStep | null;
    onundo?: () => void;
    // Vuelve a ejecutar la consulta del resultado (misma pagina).
    onreload?: () => void;
    onpreview?: () => void;
    onsubmit?: () => void;
    onnotice?: (message: string) => void;
    // Una pestaña de texto (consola o archivo): su encoding, abajo a la
    // derecha de todo. Una de tabla no lo tiene (null).
    fileEncoding?: TextEncoding | null;
    onencodingchange?: (encoding: TextEncoding) => void;
    // Registro de la pestaña Salida.
    outputLog?: LogEntry[];
    // Hay una ejecucion nueva en curso en la consola (indicador de la Salida).
    consoleRunning?: boolean;
    // Interrumpe la ejecucion en curso; el boton sale junto a cada indicador
    // de "ejecutando" (y Esc hace lo mismo, comando cancel-query).
    oncancelquery?: () => void;
    cancellingQuery?: boolean;
    // Pestañas de resultado (fijadas y la normal). Cada una tiene su estado
    // completo en Workspace; este panel muestra la elegida con TODAS sus
    // funciones: fijar es solo para que la proxima ejecucion no la
    // reemplace.
    tabs?: { key: string; label: string; pinned: boolean }[];
    // "output" o la clave de la pestaña de resultado elegida.
    activeTab?: string;
    onselecttab?: (tab: string) => void;
    // Arrastrar una pestaña de resultado (Salida queda fija al principio).
    onreordertabs?: (from: number, to: number) => void;
    onclosetab?: (key: string) => void;
    // Abre "Exportar datos" para la consulta de la pestaña.
    onexport?: () => void;
    onpin?: () => void;
    onunpin?: () => void;
    onrepin?: () => void;
    // Barra extra entre la barra de herramientas y el grid (los filtros
    // de una pestaña de tabla: el constructor visual).
    filters?: Snippet;
    // Pestaña de tabla (abierta desde el explorador): una sola vista, sin la
    // fila de pestañas del resultado (la pestaña de afuera ya la nombra y los
    // errores del filtro salen junto al filtro) y con los filtros en
    // su propia fila bajo la barra de herramientas.
    tableView?: boolean;
    // Vista de tabla: condiciones aplicadas (burbuja del boton de filtro) y
    // si el ultimo filtro fallo (el boton se marca y la barra se abre).
    filterCount?: number;
    filterError?: boolean;
    // La terminal de la ventana (Workspace la carga la primera vez que se
    // abre): pestaña fija a la izquierda de Salida y, activa, ocupa el lugar
    // de la barra y el cuerpo del resultado, que quedan montados y ocultos.
    terminal?: Snippet;
    terminalActive?: boolean;
    onterminal?: () => void;
  } = $props();

  // El ">_" de Lucide (Terminal), distinto del SquareTerminal de la Salida.
  // Con el Icon base y sus datos: el componente del icono sumaba 303 B al JS
  // inicial.
  const TERMINAL_ICON: IconNode = [["path", { d: "M12 19h8" }], ["path", { d: "m4 17 6-6-6-6" }]];

  // --- Pestañas ----------------------------------------------------------
  // Que pestaña se ve lo decide Workspace (cada ejecucion elige: con filas,
  // su pestaña; con error o sin filas, la Salida).
  const activeResultTab = $derived(tabs.find((tab) => tab.key === activeTab) ?? null);
  const hasResultTab = $derived(tabs.length > 0);
  const showingResult = $derived(activeResultTab !== null && result?.type === "resultSet");
  // La pestaña marcada: ninguna del resultado con la Terminal activa.
  const showingOutput = $derived(!showingResult && !terminalActive);
  const selectedKey = $derived(terminalActive ? null : activeResultTab?.key);
  const hasActivity = $derived(consoleRunning || isExecuting || tabs.length > 0 || outputLog.length > 0);

  // --- Edicion ---------------------------------------------------------
  let grid = $state<ReturnType<typeof DataGrid>>();
  let gridSelection = $state<RowRange | null>(null);
  // Filas, celdas y suma de lo seleccionado, a la derecha de la barra.
  let selectionSummary = $state<SelectionSummary | null>(null);

  const rows = $derived(result?.type === "resultSet" ? result.rows : []);
  const pending = $derived(pendingCount(edits));
  const editable = $derived(editInfo !== null && !isExecuting);

  function shortcutKeys(id: string): string {
    return $shortcuts.find((shortcut) => shortcut.id === id)?.keys ?? "";
  }

  const cancelQueryKeys = $derived(shortcutKeys("cancel-query"));

  const lastCol = $derived(Math.max(0, (result?.type === "resultSet" ? result.columns.length : 1) - 1));

  function commitCell(row: number, col: number, value: CellValue) {
    onedits(setCellValue(edits, rows, row, col, value), { minRow: row, maxRow: row, minCol: col, maxCol: col });
  }

  // Lo escrito con varias celdas seleccionadas: en todas, un solo paso de
  // deshacer (que vuelve hasta el rango entero).
  function fillSelectedCells(ranges: RowRange[], value: CellValue, hidden: ReadonlySet<number> | null) {
    if (!editInfo || ranges.length === 0) return;
    const at = {
      minRow: Math.min(...ranges.map((range) => range.minRow)),
      maxRow: Math.max(...ranges.map((range) => range.maxRow)),
      minCol: Math.min(...ranges.map((range) => range.minCol)),
      maxCol: Math.max(...ranges.map((range) => range.maxCol)),
    };
    onedits(fillCells(edits, editInfo, rows, ranges, value, hidden), at);
  }

  function addNewRow() {
    if (!editInfo) {
      onnotice(editBlockedReason ?? $t("results.notEditable"));
      return;
    }
    const next = addRow(edits, editInfo);
    const newRow = rows.length + next.inserted.length - 1;
    onedits(next, { minRow: newRow, maxRow: newRow, minCol: 0, maxCol: lastCol });
    // tick: con un resultado vacio el grid recien se monta con la primera
    // fila nueva.
    const row = rows.length + next.inserted.length - 1;
    void tick().then(() => grid?.focusNewRow(row));
  }

  // Con una celda seleccionada se elimina su fila entera (y con un rango,
  // todas las filas que toca).
  function deleteSelectedRows() {
    if (!editInfo) {
      onnotice(editBlockedReason ?? $t("results.notEditable"));
      return;
    }
    const ranges = grid?.selectedRanges() ?? [];
    if (ranges.length === 0) {
      onnotice($t("results.selectRowsToDelete"));
      return;
    }
    // Varios rangos (Ctrl+clic en filas salteadas): se marcan todas sus
    // filas en un solo paso de deshacer.
    const fullRanges = ranges.map((range) => ({ ...range, minCol: 0, maxCol: lastCol }));
    // De abajo hacia arriba: quitar una fila nueva no corre los indices de
    // las que quedan por procesar.
    const ordered = [...fullRanges].sort((a, b) => b.minRow - a.minRow);
    const next = ordered.reduce((current, range) => deleteRows(current, rows.length, range), edits);
    const at = {
      minRow: Math.min(...fullRanges.map((range) => range.minRow)),
      maxRow: Math.max(...fullRanges.map((range) => range.maxRow)),
      minCol: 0,
      maxCol: lastCol,
    };
    // Las filas nuevas del rango se quitan del todo: salen con la misma
    // animacion que al deshacer (las existentes solo quedan marcadas).
    if (next.inserted.length < edits.inserted.length && grid) {
      const leaving = fullRanges.filter((range) => range.maxRow >= rows.length);
      void Promise.all(leaving.map((range) => grid!.fadeOutInsertedRows(range))).then(() => onedits(next, at));
    } else {
      onedits(next, at);
      void tick().then(() => {
        for (const range of fullRanges) grid?.pulseDeleted(range);
      });
    }
  }

  // ↶ deshace el ULTIMO cambio, paso a paso (6 -> 5 -> 4...), haya o no
  // seleccion: un solo comportamiento, predecible. El grid va hasta el
  // cambio, las filas nuevas que se quitan se desvanecen y lo restaurado
  // destella. (Revertir "lo de la seleccion" mezclado en el mismo boton
  // hacia que el siguiente deshacer deshiciera esa reversion: rebotaba.)
  let undoing = false;

  async function revertChanges() {
    const step = lastEditStep;
    if (undoing || !grid || !step) return;
    undoing = true;
    try {
      if (step.at) await grid.reveal(step.at);
      if (step.at && step.edits.inserted.length < edits.inserted.length) await grid.fadeOutInsertedRows(step.at);
      onundo();
      await tick();
      if (step.at) grid.flash(step.at);
    } finally {
      undoing = false;
    }
  }

  const canRevert = $derived(lastEditStep !== null);

  // Ctrl+V: el bloque del portapapeles se vuelve cambios pendientes (un solo
  // paso de deshacer). Las filas que falten se crean y aparecen con su
  // animacion; lo pegado queda seleccionado y destella.
  async function pasteFromClipboard(anchorRow: number, anchorCol: number, block: PasteBlock, fill: RowRange) {
    if (!editInfo || isExecuting) {
      onnotice(editBlockedReason ?? $t("results.notEditable"));
      return;
    }
    const result = pasteBlock(edits, editInfo, rows, anchorRow, anchorCol, block.rows, fill);
    if (!result) return;
    onedits(result.edits, result.range);
    await tick();
    if (!grid) return;
    grid.selectRange(result.range);
    if (result.firstNewRow !== null) {
      const created = { ...result.range, minRow: result.firstNewRow, minCol: 0, maxCol: lastCol };
      grid.highlight(created, "appear");
      await grid.reveal({ ...result.range, minRow: result.range.maxRow });
    }
    grid.highlight(result.range, "commit");
  }

  // --- Buscar en la pagina (Ctrl+F) --------------------------------------
  let findOpen = $state(false);
  let findQuery = $state("");
  let findOptions = $state<FindOptions>({ matchCase: false, regex: false, wholeWord: false });
  let findFilter = $state(false);
  let findCurrent = $state(-1);
  let findResult = $state<FindResult>({ matches: [], error: null, capped: false });
  let findBar = $state<ReturnType<typeof FindBar>>();

  // Para el comando find con el resultado como zona activa (Workspace).
  export function toggleFind() {

    if (showingResult) openFind();
  }

  // Ctrl+F en el grid es un toggle: abre la barra o, si ya esta, la cierra.
  function openFind() {
    if (findOpen) {
      closeFind();
      return;
    }
    findOpen = true;
  }

  function closeFind() {
    findOpen = false;
    findResult = { matches: [], error: null, capped: false };
    findCurrent = -1;
    void tick().then(() => grid?.focusCell());
  }

  // Recalcula al escribir (con una pausa corta: no en cada tecla) y cuando
  // cambian las filas o los cambios pendientes. La primera coincidencia
  // queda como actual y se trae a la vista.
  let findTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFindQuery = "";
  $effect(() => {
    const query = findQuery;
    const options = findOptions;
    const open = findOpen;
    const currentRows = rows;
    const currentEdits = edits;
    const columnCount = result?.type === "resultSet" ? result.columns.length : 0;
    if (findTimer) clearTimeout(findTimer);
    if (!open) return;
    findTimer = setTimeout(
      () => {
        const next = findInPage(currentRows, columnCount, currentEdits, query, options);
        const queryChanged = query !== lastFindQuery;
        lastFindQuery = query;
        findResult = next;
        if (next.matches.length === 0) {
          findCurrent = -1;
        } else if (queryChanged || findCurrent < 0 || findCurrent >= next.matches.length) {
          findCurrent = 0;
          grid?.revealMatch(next.matches[0]);
        }
      },
      query === "" ? 0 : 120,
    );
    return () => {
      if (findTimer) clearTimeout(findTimer);
    };
  });

  function stepFind(direction: 1 | -1) {
    const total = findResult.matches.length;
    if (total === 0) return;
    findCurrent = (findCurrent + direction + total) % total;
    grid?.revealMatch(findResult.matches[findCurrent]);
  }

  // "Filtrar filas": se ocultan las filas de la pagina sin coincidencias
  // (las nuevas siempre se ven).
  const findHiddenRows = $derived.by(() => {
    if (!findOpen || !findFilter || findQuery === "" || findResult.error) return null;
    const matched = new Set(findResult.matches.map((match) => match.row));
    const hidden = new Set<number>();
    for (let row = 0; row < rows.length; row++) if (!matched.has(row)) hidden.add(row);
    return hidden;
  });

  // --- Filtro local por columna (results/columnFilters.ts) ----------------------
  // Sobre las filas cargadas, sin volver a consultar; se suma a "Filtrar
  // filas". Otro resultado (otras columnas) empieza sin filtros; otra
  // pagina de la misma consulta los conserva.
  let columnFilters = $state<ColumnFilters>(new Map());
  let filterPopover = $state<{ column: number; position: { left: number; top: number } } | null>(null);
  const columnSignature = $derived(result?.type === "resultSet" ? result.columns.map((column) => column.name).join("\u0000") : "");

  $effect(() => {
    void columnSignature;
    untrack(() => {
      columnFilters = new Map();
      filterPopover = null;
    });
  });

  const filterHiddenRows = $derived(rowsHiddenByFilters(rows, columnFilters));
  const filteredColumns = $derived(new Set(columnFilters.keys()));

  const hiddenRows = $derived.by(() => {
    if (filterHiddenRows.size === 0) return findHiddenRows;
    if (!findHiddenRows) return filterHiddenRows;
    return new Set([...findHiddenRows, ...filterHiddenRows]);
  });

  // Los conteos solo mientras el filtro de una columna esta abierto.
  const filterValues = $derived(
    filterPopover ? columnValueCounts(rows, filterPopover.column, columnFilters, findHiddenRows) : [],
  );

  function openColumnFilter(column: number, position: { left: number; top: number }) {
    filterPopover = filterPopover?.column === column ? null : { column, position };
  }

  function closeColumnFilter() {
    filterPopover = null;
    void tick().then(() => gridScroll?.querySelector<HTMLElement>('[role="grid"]')?.focus({ preventScroll: true }));
  }

  // --- Formato de copia ---------------------------------------------------
  let formatMenuOpen = $state(false);
  let formatButton = $state<HTMLButtonElement>();
  let formatMenu = $state<HTMLDivElement>();
  let formatMenuPosition = $state({ right: 0, top: 0 });
  const formatLabel = $derived(COPY_FORMATS.find((item) => item.id === $copySettings.format)?.label ?? "TSV");

  // --- Barra de filtros (vista de tabla) --------------------------------
  // Como la barra de buscar: el boton la abre y la cierra, Esc la cierra y
  // devuelve el foco al grid. Si un filtro falla, se abre para mostrarlo.
  let filtersOpen = $state(false);

  function toggleFilters() {
    filtersOpen = !filtersOpen;
  }

  export function closeFilters() {
    filtersOpen = false;
    grid?.focusCell();
  }

  $effect(() => {
    if (filterError && tableView) filtersOpen = true;
  });

  function toggleFormatMenu() {
    if (formatMenuOpen) {
      formatMenuOpen = false;
      return;
    }
    const rect = formatButton?.getBoundingClientRect();
    if (rect) formatMenuPosition = { right: window.innerWidth - rect.right, top: rect.bottom + 4 };
    formatMenuOpen = true;
  }

  function onWindowPointerDown(event: PointerEvent) {
    if (!formatMenuOpen) return;
    const target = event.target as Node;
    if (formatMenu?.contains(target) || formatButton?.contains(target)) return;
    formatMenuOpen = false;
  }

  // Comandos del grid (lib/workspace/commands.ts): solo con el foco en el grid y no
  // mientras se edita una celda (su input tiene sus propias teclas), asi un
  // atajo no actua sobre las filas desde la barra de filtros o de busqueda.
  let gridScroll = $state<HTMLElement>();

  function inGrid(run: () => void) {
    return () => {
      const active = document.activeElement;
      if (!gridScroll || !active || !gridScroll.contains(active) || active.closest("input, textarea")) return false;
      run();
    };
  }

  $effect(() =>
    registerCommands("results", {
      "add-result-row": inGrid(addNewRow),
      "delete-result-rows": inGrid(deleteSelectedRows),
      "revert-result-changes": inGrid(() => {
        if (canRevert) void revertChanges();
      }),
      "submit-result-changes": inGrid(() => {
        if (pending > 0) onsubmit();
      }),
      // Ctrl+S en el grid con cambios pendientes: aplicarlos. Sin cambios,
      // sigue el guardar de siempre.
      "save-query-console": () => pending > 0 && inGrid(onsubmit)() !== false,
    }),
  );

  // Ctrl+Tab y Ctrl+1..9 en el panel: Salida, los resultados y Terminal, en
  // el orden de la fila. La terminal registra las suyas para sus sesiones.
  let tabStrip = $state<HTMLElement>();
  const showsResultTabs = $derived(!tableView && hasActivity);
  const stripKeys = $derived([
    ...(showsResultTabs ? ["output", ...tabs.map((tab) => tab.key)] : []),
    ...(!tableView || terminal ? ["terminal"] : []),
  ]);

  $effect(() =>
    registerTabCommands("results", {
      keys: () => stripKeys,
      current: () => (terminalActive ? "terminal" : showingOutput ? "output" : (selectedKey ?? null)),
      select: (key) => {
        if (key === "terminal") {
          if (!terminalActive) onterminal();
          return;
        }
        onselecttab(key);
        // El foco va a la pestaña elegida, como al hacer clic.
        void tick().then(() => tabStrip?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus());
      },
    }),
  );

</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={(event) => {
    if (formatMenuOpen && event.key === "Escape") formatMenuOpen = false;
  }}
/>

{#snippet cancelButton()}
  {#if oncancelquery}
    <button
      type="button"
      class="action-button secondary small"
      disabled={cancellingQuery}
      use:tooltip={$t("results.cancelQueryTitle", { keys: cancelQueryKeys })}
      onclick={() => oncancelquery?.()}
    >
      {cancellingQuery ? $t("results.cancellingQuery") : $t("results.cancelQuery")}
    </button>
  {/if}
{/snippet}

<div class="result-pane">
  <!-- La fila sale siempre (salvo en una tabla sin la terminal abierta): a la
       derecha, el boton de la terminal, que es de la ventana y no un
       resultado mas. -->
  {#if !tableView || terminal}
    <div
      class="result-tabs tab-strip"
      role="tablist"
      aria-label={$t("results.tabs")}
      bind:this={tabStrip}
      use:settleTransitions
    >
      {#if showsResultTabs}
      <button
        type="button"
        role="tab"
        class="result-tab"
        style:--tab-active="var(--surface-content)"
        class:active={showingOutput}
        aria-selected={showingOutput}
        onclick={() => onselecttab("output")}
      >
        <SquareTerminal size={12} aria-hidden="true" />
        <span>{$t("results.tab.output")}</span>
      </button>
      <!-- Salida y Terminal quedan fijas; los resultados se desplazan entre
           ellas, como las pestañas de las consolas. -->
      <div
        class="result-tabs-scroll"
        use:tabScroll={`${selectedKey}|${tabs.length}`}
        use:reorderable={{ items: ".result-tab.closable", onmove: (from, to) => onreordertabs(from, to) }}
      >
      {#each tabs as tab (tab.key)}
        <div class="result-tab closable" class:active={selectedKey === tab.key} animate:flip={{ duration: flipDuration(160) }}>
          <button
            type="button"
            role="tab"
            class="tab-select"
            aria-selected={selectedKey === tab.key}
            onclick={() => onselecttab(tab.key)}
          >
            {#if tab.pinned}
              <Pin size={12} aria-hidden="true" />
            {:else}
              <Table size={12} aria-hidden="true" />
            {/if}
            <span>{tab.label}</span>
          </button>
          <button type="button" class="tab-close" aria-label={$t("results.tab.close", { name: tab.label })} onclick={() => onclosetab(tab.key)}>
            <X size={11} aria-hidden="true" />
          </button>
        </div>
      {/each}
      </div>
      {/if}
      <!-- La terminal es de la ventana: su pestaña va aparte, a la derecha,
           y abierta se une a ella (el fondo de la terminal). -->
      <button
        type="button"
        role="tab"
        class="result-tab terminal-tab"
        class:active={terminalActive}
        aria-selected={terminalActive}
        style:--tab-active={$editorPalette.background}
        use:tooltip={{ label: $t("workspace.terminal.title"), shortcut: shortcutKeys("toggle-terminal") }}
        onclick={() => terminalActive || onterminal()}
      >
        <Icon iconNode={TERMINAL_ICON} size={12} aria-hidden="true" />
        <span>{$t("workspace.terminal.title")}</span>
      </button>
    </div>
  {/if}
  <div class="pane-view" class:hidden={terminalActive}>
  {#if hasActivity}
    {#if showingResult}
      <!-- Barra de herramientas del resultado: fila propia debajo de las
           pestañas. Una pestaña fijada es de solo lectura: solo copia y
           exporta. -->
      <div class="result-toolbar" role="toolbar" aria-label={$t("results.toolbar")} use:settleTransitions>
        <!-- Misma barra para una pestaña fijada: lo que edita queda
             deshabilitado (es solo lectura) y el alfiler pasa a "Desfijar". -->
        <div class="toolbar-group">
          <ToolbarButton
            icon={RotateCw}
            label={$t("results.rerun")}
            disabled={isExecuting}
            onclick={onreload}
          />
        </div>
        <div class="toolbar-group">
          <ToolbarButton
            icon={Plus}
            label={$t("results.addRow")}
            shortcut={shortcutKeys("add-result-row")}
            disabled={!editable}
            onclick={addNewRow}
          />
          <ToolbarButton
            icon={Minus}
            label={$t("results.deleteRows")}
            shortcut={shortcutKeys("delete-result-rows")}
            disabled={!editable || gridSelection === null}
            onclick={deleteSelectedRows}
          />
          <ToolbarButton
            icon={Undo2}
            label={$t("results.undo")}
            shortcut={shortcutKeys("revert-result-changes")}
            disabled={!canRevert || isExecuting}
            onclick={() => void revertChanges()}
          />
        </div>
        <div class="toolbar-group">
          <ToolbarButton
            icon={Eye}
            label={pending === 1 ? $t("results.pending.one") : $t("results.pending.other", { count: pending })}
            badge={pending}
            disabled={pending === 0 || isExecuting}
            onclick={onpreview}
          />
          <ToolbarButton
            icon={ArrowUpFromLine}
            label={$t("results.applyChanges")}
            shortcut={shortcutKeys("submit-result-changes")}
            tone="submit"
            disabled={pending === 0 || isExecuting}
            onclick={onsubmit}
          />
        </div>
        <div class="toolbar-group">
          {#if tableView}
            <!-- Una tabla no se fija: se vuelve a abrir desde el explorador. -->
          {:else if activeResultTab?.pinned}
            <ToolbarButton icon={PinOff} label={$t("results.unpin")} onclick={onunpin} />
          {:else if activeResultTab && activeResultTab.key.includes("#pin")}
            <!-- Desfijada pero todavia abierta: se puede volver a fijar. -->
            <ToolbarButton icon={Pin} label={$t("results.pin")} onclick={onrepin} />
          {:else}
            <ToolbarButton icon={Pin} label={$t("results.pin")} disabled={isExecuting} onclick={onpin} />
          {/if}
          {#if tableView && filters}
            <ToolbarButton
              icon={Filter}
              label={$t("results.filters.toggle")}
              badge={filterCount}
              tone={filterError ? "danger" : filterCount > 0 || filtersOpen ? "active" : "default"}
              onclick={toggleFilters}
            />
          {/if}
          <ToolbarButton
            icon={Search}
            label={$t("results.find.label")}
            shortcut="Ctrl+F"
            onclick={openFind}
          />
        </div>
        <!-- A la derecha, juntos: con que formato copia Ctrl+C varias celdas
             y exportar (misma familia: sacar datos del resultado). -->
        <div class="toolbar-group end">
        <button
          type="button"
          class="format-button"
          class:open={formatMenuOpen}
          aria-haspopup="menu"
          aria-expanded={formatMenuOpen}
          use:tooltip={$t("results.copyFormat.title")}
          bind:this={formatButton}
          onclick={toggleFormatMenu}
        >
          <span>{formatLabel}</span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>
          <ToolbarButton
            icon={FileOutput}
            label={$t("results.export.title")}
            disabled={isExecuting}
            onclick={onexport}
          />
        </div>
      </div>
      {#if filters && (!tableView || filtersOpen)}{@render filters()}{/if}
      {#if findOpen}
        <FindBar
          bind:this={findBar}
          bind:query={findQuery}
          bind:options={findOptions}
          bind:filterRows={findFilter}
          count={findResult.matches.length}
          current={findCurrent}
          capped={findResult.capped}
          error={findResult.error}
          onnext={() => stepFind(1)}
          onprevious={() => stepFind(-1)}
          onclose={closeFind}
        />
      {/if}
      {#if filterPopover && result?.type === "resultSet"}
        {@const column = filterPopover.column}
        <ColumnFilterPopover
          column={result.columns[column]?.name ?? ""}
          values={filterValues}
          excluded={columnFilters.get(column) ?? new Set()}
          matches={rows.length - (hiddenRows?.size ?? 0)}
          position={filterPopover.position}
          onchange={(excluded) => (columnFilters = withColumnFilter(columnFilters, column, excluded))}
          onclose={closeColumnFilter}
        />
      {/if}
      {#if formatMenuOpen}
        <div
          class="ui-menu format-menu"
          role="menu"
          aria-label={$t("results.copyFormat.menu")}
          bind:this={formatMenu}
          style={`right:${formatMenuPosition.right}px; top:${formatMenuPosition.top}px;`}
        >
          <div class="menu-heading">{$t("results.copyFormat.heading")}</div>
          {#each COPY_FORMATS as item (item.id)}
            <button
              type="button"
              role="menuitemradio"
              aria-checked={$copySettings.format === item.id}
              class="ui-menu-item menu-item"
              onclick={() => {
                copySettings.update((current) => ({ ...current, format: item.id }));
                formatMenuOpen = false;
              }}
            >
              <span class="ui-menu-check">{#if $copySettings.format === item.id}<Check size={13} aria-hidden="true" />{/if}</span>
              <span>{item.label}</span>
            </button>
          {/each}
          <div class="menu-gap" aria-hidden="true"></div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$copySettings.headers}
            class="ui-menu-item menu-item"
            onclick={() => copySettings.update((current) => ({ ...current, headers: !current.headers }))}
          >
            <span class="ui-menu-check">{#if $copySettings.headers}<Check size={13} aria-hidden="true" />{/if}</span>
            <span>{$t("results.includeHeaders")}</span>
            <span class="hint">TSV · CSV</span>
          </button>
        </div>
      {/if}
    {/if}
  {/if}
  {#if (isExecuting || consoleRunning) && !hasResultTab && outputLog.length === 0}
    <div class="centered running-state">
      <div class="spinner" role="status" aria-label={$t("results.executingQuery")}></div>
      {@render cancelButton()}
    </div>
  {:else if result === null && outputLog.length === 0}
    <div class="centered empty-state">
      <TableProperties size={28} strokeWidth={1.25} aria-hidden="true" />
      <span>{$t("results.noResults")}</span>
    </div>
  {:else if !showingResult || result?.type !== "resultSet"}
    {#if filters}{@render filters()}{/if}
    {#if tableView}
      <!-- Tabla cargando o con un filtro invalido (el error sale junto al
           filtro): sin registro de Salida. -->
      <div class="centered running-state">
        {#if isExecuting || consoleRunning}
          <div class="spinner" role="status" aria-label={$t("results.executingQuery")}></div>
          {@render cancelButton()}
        {/if}
      </div>
    {:else}
      <div class="output-region">
        <OutputLog entries={outputLog} running={consoleRunning} runningAction={cancelButton} />
      </div>
    {/if}
  {:else}
    <div class="grid-region">
      <div class="grid-scroll" bind:this={gridScroll}>

        <!-- Siempre montado (aunque no haya filas): asi un filtro sin
             resultados no desarma el grid y el siguiente no vuelve a medir
             ni a mover las columnas. -->
        {#if result.rows.length === 0 && edits.inserted.length === 0}
          <p class="empty-rows">{$t("results.noRows")}</p>
        {/if}
        {#if result}
          <DataGrid
            bind:this={grid}
            columns={result.columns}
            rows={result.rows}
            rowOffset={page?.offset ?? 0}
            {columnCatalogInfo}
            editInfo={isExecuting ? null : editInfo}
            {editBlockedReason}
            {edits}
            oncommitcell={commitCell}
            onfillcells={fillSelectedCells}
            oneditblocked={onnotice}
            onselectionchange={(range) => (gridSelection = range)}
            onselectionsummary={(summary) => (selectionSummary = summary)}
            copyFormat={$copySettings.format}
            copyHeaders={$copySettings.headers}
            copyTableName={editInfo ? `${editInfo.target.schema}.${editInfo.target.table}` : (sourceLabel ?? "")}
            onpasteblock={(row, col, block, fill) => void pasteFromClipboard(row, col, block, fill)}
            findMatches={findOpen ? findResult.matches : []}
            findCurrent={findOpen ? findCurrent : -1}
            {hiddenRows}
            {filteredColumns}
            onfilter={openColumnFilter}
            {sort}
            sortable={page?.sortable === true && !isExecuting}
            {onsort}
          />
        {/if}
        {#if isExecuting}
          <div class="busy-overlay running-state">
            <div class="spinner" role="status" aria-label={$t("results.loadingPage")}></div>
            {@render cancelButton()}
          </div>
        {/if}
      </div>
      <!-- Barra fija al pie: estadisticas a la izquierda y la paginacion
           centrada en el panel (grid de tres columnas: el centro no se
           corre aunque cambie el ancho del texto de los costados). -->
      <div class="status-bar">
        <!-- Segun el ancho de la barra (@container, abajo): las columnas y el
             tiempo se van cayendo; las filas quedan siempre. -->
        <span class="stats">
          {$t(result.rows.length === 1 ? "results.stats.rowsOne" : "results.stats.rowsOther", {
            count: $numberFormat.format(result.rows.length),
          })}<span class="wide-only">
            · {$t(result.columns.length === 1 ? "results.stats.columnsOne" : "results.stats.columnsOther", {
              count: result.columns.length,
            })}</span
          ><span class="not-narrow"> · {result.executionTimeMs} ms</span>
          {#if result.truncated && !page?.pageable}
            <span class="truncated" use:tooltip={$t("results.stats.truncatedTitle")}>
              · {$t("results.stats.truncated")}
            </span>
          {/if}
        </span>
        {#if page}
          <ResultPager
            {page}
            rowCount={result.rows.length}
            hasMore={result.truncated}
            {totalRows}
            {counting}
            busy={isExecuting}
            nextShortcut={nextPageShortcut}
            previousShortcut={previousPageShortcut}
            {onnavigate}
            {oncount}
          />
        {/if}
        <!-- A la derecha: con mas de una celda, cuantas filas y celdas y, si
             hay numeros en columnas numericas, su suma exacta; y el encoding
             de la pestaña al final. -->
        <div class="status-right">
          {#if selectionSummary && selectionSummary.cells > 1}
            {@const cells = $t("results.selection.cells", { count: $numberFormat.format(selectionSummary.cells) })}
            {@const sum = selectionSummary.sum === null ? null : formatDecimal(selectionSummary.sum, $numberFormat)}
            <!-- Tres versiones, de la completa a la minima: se ve la que cabe
                 (@container, abajo). La suma es lo ultimo que se va. -->
            <span class="selection-summary wide-only">
              {$t(selectionSummary.rows === 1 ? "results.stats.rowsOne" : "results.stats.rowsOther", {
                count: $numberFormat.format(selectionSummary.rows),
              })} · {cells}{#if sum !== null}
                · {$t("results.selection.sum", { value: sum })}{/if}
            </span>
            <span class="selection-summary medium-only">{cells}{#if sum !== null} · Σ {sum}{/if}</span>
            <span class="selection-summary narrow-only">{sum !== null ? `Σ ${sum}` : cells}</span>
          {/if}
          {#if fileEncoding}
            <EncodingPicker value={fileEncoding} onchange={onencodingchange} />
          {/if}
        </div>
      </div>
    </div>
  {/if}
  <!-- Sin un resultado con su barra, el encoding igual queda en la misma
       esquina. -->
  {#if fileEncoding && !(showingResult && result?.type === "resultSet")}
    <div class="status-bar minimal">
      <div class="status-right">
        <EncodingPicker value={fileEncoding} onchange={onencodingchange} />
      </div>
    </div>
  {/if}
  </div>
  {#if terminal}
    <div class="terminal-view" class:hidden={!terminalActive}>{@render terminal()}</div>
  {/if}
</div>

<style>
  .result-pane {
    display: flex;
    min-height: 0;
    height: 100%;
    flex-direction: column;
  }

  /* "Sin filas": sobre el grid vacio (que conserva su encabezado). */
  .empty-rows {
    position: absolute;
    top: 3.5rem;
    left: 0;
    right: 0;
    z-index: 4;
    margin: 0;
    color: color-mix(in srgb, var(--text-secondary) 80%, transparent);
    font-size: 0.8125rem;
    text-align: center;
    pointer-events: none;
    user-select: none;
  }


  .centered {
    display: flex;
    min-height: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    flex-direction: column;
    gap: var(--space-2);
    color: color-mix(in srgb, var(--text-secondary) 70%, transparent);
    font-size: 0.8125rem;
    user-select: none;
  }

  .empty-state :global(svg) {
    opacity: 0.6;
  }

  .spinner {
    width: 1.5rem;
    height: 1.5rem;
    box-sizing: border-box;
    border: 2px solid color-mix(in srgb, var(--text-secondary) 25%, transparent);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2s;
    }
  }

  /* Pestañas al estilo de las de consola (.console-tab): Salida (fija, sin
     cerrar) y el resultado (con ×). La activa lleva el acento; las otras
     son planas y se aclaran al pasar el mouse. */
  /* Pestañas y barra forman una sola cabecera: sin linea entre ellas, una
     sola al pie. Nada de cajas: el orden lo dan el espacio y el peso. */

  /* Con la barra debajo, la linea pasa al pie de la barra. */

  .result-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-4);
    min-height: 2.5rem;
    padding: 0 var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  /* 4px entre botones: el hover de uno no toca al de al lado y la burbuja
     de contador no queda encima del vecino. */
  .format-button {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 1.75rem;
    padding: 0 var(--space-2);
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

  /* Sin transicion hasta el primer pintado (lib/settleTransitions.ts). */
  .result-toolbar:not([data-settled]) .format-button,
  .result-tabs:not([data-settled]) .result-tab {
    transition: none;
  }

  .format-button:hover,
  .format-button.open {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .format-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  /* El menu compartido (.ui-menu); aca solo su posicion. */
  .format-menu {
    position: fixed;
    z-index: 1000;
    min-width: 12.5rem;
  }

  .menu-heading {
    padding: var(--space-1) var(--space-2) var(--space-1) calc(var(--space-2) * 2 + 1rem);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }




  .hint {
    margin-left: auto;
    padding-left: var(--space-3);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .menu-gap {
    height: var(--space-2);
  }

  /* Grupos por funcion (datos · editar · cambios · pestaña · copiar y
     exportar): botones juntos dentro del grupo y aire entre grupos. Sin
     fondos ni contornos: con cinco cajas seguidas la barra se sentia
     amontonada. */
  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-group.end {
    margin-left: auto;
  }



  .terminal-tab {
    margin-left: auto;
  }

  /* Scroll nativo sin barra; el desvanecido (tabScroll) indica que hay mas.
     Reserva a los lados el lugar de las curvas y del contorno que sigue por
     la linea base de la elegida (si no, contarian como desborde) y baja
     sobre esa linea para que la elegida la tape; los margenes negativos lo
     compensan. Las zonas reservadas no toman clics. */
  .result-tabs-scroll {
    --fade: 2rem;
    display: flex;
    min-width: 0;
    flex: 0 1 auto;
    align-self: stretch;
    align-items: flex-end;
    gap: 2px;
    margin: 0 calc(-1 * var(--tab-reach)) -1px calc(-1 * var(--tab-curve));
    padding: 0 var(--tab-reach) 0 var(--tab-curve);
    overflow-x: auto;
    overflow-y: hidden;
    pointer-events: none;
    scrollbar-width: none;
    scroll-padding-inline: calc(var(--tab-curve) + var(--fade)) calc(var(--tab-reach) + var(--fade));
  }

  .result-tabs-scroll::-webkit-scrollbar {
    display: none;
  }

  .result-tabs-scroll :global(.result-tab) {
    margin-bottom: 0;
    pointer-events: auto;
  }

  .result-tabs-scroll:global(.fade-end) {
    mask-image: linear-gradient(to right, #000 calc(100% - var(--tab-reach) - var(--fade)), transparent calc(100% - var(--tab-reach)));
  }

  .result-tabs-scroll:global(.fade-start) {
    mask-image: linear-gradient(to right, transparent var(--tab-curve), #000 calc(var(--tab-curve) + var(--fade)));
  }

  .result-tabs-scroll:global(.fade-start.fade-end) {
    mask-image: linear-gradient(
      to right,
      transparent var(--tab-curve),
      #000 calc(var(--tab-curve) + var(--fade)),
      #000 calc(100% - var(--tab-reach) - var(--fade)),
      transparent calc(100% - var(--tab-reach))
    );
  }

  /* Lo del resultado sin caja propia; con la terminal activa, oculto pero
     montado (el grid conserva su estado). */
  .pane-view {
    display: contents;
  }

  .terminal-view {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  }

  .pane-view.hidden,
  .terminal-view.hidden {
    display: none;
  }

  .output-region {
    min-height: 0;
    flex: 1;
  }

  .grid-region {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  }

  /* El cuerpo del resultado va sobre --surface-content: en los temas
     claros es blanco como el editor (en los oscuros, igual que surface). */
  .grid-region {
    background: var(--surface-content);
  }

  .grid-scroll {
    position: relative;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .running-state {
    flex-direction: column;
    gap: var(--space-3);
  }

  .busy-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--surface-content) 55%, transparent);
    animation: overlay-in 120ms ease;
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
  }

  .status-bar {
    display: grid;
    flex-shrink: 0;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-3);
    min-height: 2.5rem;
    padding: var(--space-1) var(--space-3);
    box-sizing: border-box;
    border-top: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  /* Siempre en la tercera columna, aunque no haya paginacion en el centro.
     Ocupa su columna y nada mas: lo que no cabe se recorta, nunca se monta
     sobre la paginacion. */
  .status-right {
    display: flex;
    grid-column: 3;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
    overflow: hidden;
  }

  .status-right :global(.encoding) {
    flex-shrink: 0;
  }

  /* Prioridades por el ancho de la barra: amplio, todo; medio, lo esencial;
     angosto, lo minimo. La paginacion y el encoding se ven siempre. */
  .status-bar {
    container-type: inline-size;
  }

  .medium-only,
  .narrow-only {
    display: none;
  }

  @container (max-width: 52rem) {
    .wide-only {
      display: none;
    }

    .medium-only {
      display: inline;
    }
  }

  @container (max-width: 38rem) {
    .medium-only,
    .not-narrow {
      display: none;
    }

    .narrow-only {
      display: inline;
    }
  }

  .status-bar.minimal {
    min-height: 1.75rem;
  }

  .selection-summary {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .stats {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .truncated {
    color: var(--danger);
  }
</style>
