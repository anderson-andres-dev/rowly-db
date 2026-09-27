<script lang="ts">
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
  } from "@lucide/svelte";
  import FindBar from "$lib/components/results/FindBar.svelte";
  import { flip } from "svelte/animate";
  import { flipDuration, reorderable } from "$lib/reorder";
  import { findInPage, type FindOptions, type FindResult } from "$lib/gridFind";

  import { COPY_FORMATS, type PasteBlock } from "$lib/gridClipboard";
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
    type CellValue,
    type PendingEdits,
    type ResultEditInfo,
    type RowRange,
  } from "$lib/resultEditing";
  import { eventMatchesShortcut, shortcuts } from "$lib/stores/shortcuts";
  import { numberFormat, t } from "$lib/i18n";
  import { tick, type Snippet } from "svelte";

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
    outputLog = [],
    consoleRunning = false,
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
    // Registro de la pestaña Salida.
    outputLog?: LogEntry[];
    // Hay una ejecucion nueva en curso en la consola (indicador de la Salida).
    consoleRunning?: boolean;
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
    // WHERE / ORDER BY de una pestaña de tabla).
    filters?: Snippet;
  } = $props();

  // --- Pestañas ----------------------------------------------------------
  // Que pestaña se ve lo decide Workspace (cada ejecucion elige: con filas,
  // su pestaña; con error o sin filas, la Salida).
  const activeResultTab = $derived(tabs.find((tab) => tab.key === activeTab) ?? null);
  const hasResultTab = $derived(tabs.length > 0);
  const showingResult = $derived(activeResultTab !== null && result?.type === "resultSet");
  const showingOutput = $derived(!showingResult);

  // --- Edicion ---------------------------------------------------------
  let grid = $state<ReturnType<typeof DataGrid>>();
  let gridSelection = $state<RowRange | null>(null);

  const rows = $derived(result?.type === "resultSet" ? result.rows : []);
  const pending = $derived(pendingCount(edits));
  const editable = $derived(editInfo !== null && !isExecuting);

  function shortcutKeys(id: string): string {
    return $shortcuts.find((shortcut) => shortcut.id === id)?.keys ?? "";
  }

  const lastCol = $derived(Math.max(0, (result?.type === "resultSet" ? result.columns.length : 1) - 1));

  function commitCell(row: number, col: number, value: CellValue) {
    onedits(setCellValue(edits, rows, row, col, value), { minRow: row, maxRow: row, minCol: col, maxCol: col });
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

  // Para el Workspace (Ctrl+F con el mouse sobre el resultado).
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
  const hiddenRows = $derived.by(() => {
    if (!findOpen || !findFilter || findQuery === "" || findResult.error) return null;
    const matched = new Set(findResult.matches.map((match) => match.row));
    const hidden = new Set<number>();
    for (let row = 0; row < rows.length; row++) if (!matched.has(row)) hidden.add(row);
    return hidden;
  });

  // --- Formato de copia ---------------------------------------------------
  let formatMenuOpen = $state(false);
  let formatButton = $state<HTMLButtonElement>();
  let formatMenu = $state<HTMLDivElement>();
  let formatMenuPosition = $state({ right: 0, top: 0 });
  const formatLabel = $derived(COPY_FORMATS.find((item) => item.id === $copySettings.format)?.label ?? "TSV");

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

  function onGridKeydown(event: KeyboardEvent) {
    const matches = (id: string) => {
      const keys = shortcutKeys(id);
      return keys !== "" && eventMatchesShortcut(event, keys);
    };
    let handled = true;
    if (matches("add-result-row")) addNewRow();
    else if (matches("delete-result-rows")) deleteSelectedRows();
    else if (matches("revert-result-changes")) {
      if (canRevert) void revertChanges();
    } else if (matches("submit-result-changes")) {
      if (pending > 0) onsubmit();
    } else handled = false;
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={(event) => {
    if (formatMenuOpen && event.key === "Escape") formatMenuOpen = false;
  }}
/>

<div class="result-pane">
  {#if consoleRunning || isExecuting || tabs.length > 0 || outputLog.length > 0}
    <div
      class="result-tabs"
      role="tablist"
      aria-label={$t("results.tabs")}
      use:reorderable={{ items: ".result-tab.closable", onmove: (from, to) => onreordertabs(from, to) }}
    >
      <button
        type="button"
        role="tab"
        class="result-tab"
        class:active={showingOutput}
        aria-selected={showingOutput}
        onclick={() => onselecttab("output")}
      >
        <SquareTerminal size={12} aria-hidden="true" />
        <span>{$t("results.tab.output")}</span>
      </button>
      {#each tabs as tab (tab.key)}
        <div class="result-tab closable" class:active={activeResultTab?.key === tab.key} animate:flip={{ duration: flipDuration(160) }}>
          <button
            type="button"
            role="tab"
            class="tab-select"
            aria-selected={activeResultTab?.key === tab.key}
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
    {#if showingResult}
      <!-- Barra de herramientas del resultado: fila propia debajo de las
           pestañas. Una pestaña fijada es de solo lectura: solo copia y
           exporta. -->
      <div class="result-toolbar" role="toolbar" aria-label={$t("results.toolbar")}>
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
          {#if activeResultTab?.pinned}
            <ToolbarButton icon={PinOff} label={$t("results.unpin")} onclick={onunpin} />
          {:else if activeResultTab && activeResultTab.key.includes("#pin")}
            <!-- Desfijada pero todavia abierta: se puede volver a fijar. -->
            <ToolbarButton icon={Pin} label={$t("results.pin")} onclick={onrepin} />
          {:else}
            <ToolbarButton icon={Pin} label={$t("results.pin")} disabled={isExecuting} onclick={onpin} />
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
          title={$t("results.copyFormat.title")}
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
      {#if filters}{@render filters()}{/if}
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
      {#if formatMenuOpen}
        <div
          class="format-menu"
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
              class="menu-item"
              onclick={() => {
                copySettings.update((current) => ({ ...current, format: item.id }));
                formatMenuOpen = false;
              }}
            >
              <span class="check">{#if $copySettings.format === item.id}<Check size={13} aria-hidden="true" />{/if}</span>
              <span>{item.label}</span>
            </button>
          {/each}
          <div class="menu-gap" aria-hidden="true"></div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={$copySettings.headers}
            class="menu-item"
            onclick={() => copySettings.update((current) => ({ ...current, headers: !current.headers }))}
          >
            <span class="check">{#if $copySettings.headers}<Check size={13} aria-hidden="true" />{/if}</span>
            <span>{$t("results.includeHeaders")}</span>
            <span class="hint">TSV · CSV</span>
          </button>
        </div>
      {/if}
    {/if}
  {/if}
  {#if (isExecuting || consoleRunning) && !hasResultTab && outputLog.length === 0}
    <div class="centered">
      <div class="spinner" role="status" aria-label={$t("results.executingQuery")}></div>
    </div>
  {:else if result === null && outputLog.length === 0}
    <div class="centered empty-state">
      <TableProperties size={28} strokeWidth={1.25} aria-hidden="true" />
      <span>{$t("results.noResults")}</span>
    </div>
  {:else if !showingResult || result?.type !== "resultSet"}
    {#if filters}{@render filters()}{/if}
    <div class="output-region">
      <OutputLog entries={outputLog} running={consoleRunning} />
    </div>
  {:else}
    <div class="grid-region">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="grid-scroll" onkeydown={onGridKeydown}>
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
            oneditblocked={onnotice}
            onselectionchange={(range) => (gridSelection = range)}
            copyFormat={$copySettings.format}
            copyHeaders={$copySettings.headers}
            copyTableName={editInfo ? `${editInfo.target.schema}.${editInfo.target.table}` : (sourceLabel ?? "")}
            onpasteblock={(row, col, block, fill) => void pasteFromClipboard(row, col, block, fill)}
            findMatches={findOpen ? findResult.matches : []}
            findCurrent={findOpen ? findCurrent : -1}
            {hiddenRows}
            onfind={openFind}
            {sort}
            sortable={page?.sortable === true && !isExecuting}
            {onsort}
          />
        {/if}
        {#if isExecuting}
          <div class="busy-overlay">
            <div class="spinner" role="status" aria-label={$t("results.loadingPage")}></div>
          </div>
        {/if}
      </div>
      <!-- Barra fija al pie: estadisticas a la izquierda y la paginacion
           centrada en el panel (grid de tres columnas: el centro no se
           corre aunque cambie el ancho del texto de los costados). -->
      <div class="status-bar">
        <span class="stats">
          {$t(result.rows.length === 1 ? "results.stats.rowsOne" : "results.stats.rowsOther", {
            count: $numberFormat.format(result.rows.length),
          })} ·
          {$t(result.columns.length === 1 ? "results.stats.columnsOne" : "results.stats.columnsOther", {
            count: result.columns.length,
          })} · {result.executionTimeMs} ms
          {#if result.truncated && !page?.pageable}
            <span class="truncated" title={$t("results.stats.truncatedTitle")}>
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
      </div>
    </div>
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
  .result-tabs {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
    min-height: 2.25rem;
    padding: var(--space-1) var(--space-2);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  /* Con la barra debajo, la linea pasa al pie de la barra. */
  .result-tabs:has(+ .result-toolbar) {
    padding-bottom: 0;
    border-bottom: 0;
  }

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

  .format-button:hover,
  .format-button.open {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .format-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  /* Mismo menu que el selector de tamaño de pagina (ResultPager). */
  .format-menu {
    position: fixed;
    z-index: 1000;
    display: flex;
    min-width: 12.5rem;
    flex-direction: column;
    padding: var(--space-1);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    font-size: 0.8125rem;
    animation: menu-in 120ms ease-out;
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
  }

  .menu-heading {
    padding: var(--space-1) var(--space-2) var(--space-1) calc(var(--space-2) + 1.25rem);
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 1.75rem;
    padding: 0 var(--space-3) 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .menu-item:hover,
  .menu-item:focus-visible {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    outline: none;
  }

  .check {
    display: inline-flex;
    width: 1rem;
    flex-shrink: 0;
    justify-content: center;
    color: var(--accent);
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

  /* Pestañas livianas: en reposo solo texto e icono; la activa se asienta
     con un relleno tenue y su icono en acento. Sin bordes. */
  .result-tab {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2);
    min-height: 1.75rem;
    padding: 0 var(--space-3);
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

  .result-tab:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  .result-tab.active {
    background: color-mix(in srgb, var(--text-primary) 9%, transparent);
    color: var(--text-primary);
  }

  .result-tab :global(svg) {
    flex-shrink: 0;
    color: var(--text-secondary);
    opacity: 0.8;
  }

  .result-tab.active :global(svg) {
    color: var(--accent);
    opacity: 1;
  }

  .result-tab .tab-close :global(svg) {
    color: inherit;
    opacity: 1;
  }

  .result-tab.closable:global(.reorder-dragging) {
    position: relative;
    z-index: 2;
    box-shadow: var(--shadow-elevated);
    cursor: grabbing;
  }

  .result-tab.closable {
    gap: var(--space-1);
    padding: 0 var(--space-1) 0 var(--space-3);
    cursor: default;
  }

  .tab-select {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .tab-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .tab-close:hover {
    background: color-mix(in srgb, var(--text-primary) 12%, transparent);
    color: var(--text-primary);
  }

  .result-tab:focus-visible,
  .tab-select:focus-visible,
  .tab-close:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
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
