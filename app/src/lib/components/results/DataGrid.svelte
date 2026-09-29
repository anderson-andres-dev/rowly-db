<script lang="ts">
  import { activeEngine } from "$lib/stores/connection";
  import { hideTooltipFor, scheduleTooltipFor, tooltip } from "$lib/tooltip";
  import { typeProblem } from "$lib/cellTypes";
  import { settleTransitions } from "$lib/settleTransitions";
  import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Key } from "@lucide/svelte";
  import { tick, untrack } from "svelte";
  import type { ColumnCatalogInfo, QueryColumn, QueryRow, SortKey } from "$lib/types";
  import { t } from "$lib/i18n";
  import { detectJsonColumns, escapeHtml, highlightJson } from "$lib/jsonHighlight";
  import type { FindMatch } from "$lib/gridFind";
  import { CHUNK_ROWS, GROUP_COLS, chunkWindow, groupWindow, type ChunkWindow } from "$lib/gridWindow";
  import { onePerFrame } from "$lib/onePerFrame";
  import {
    parseClipboard,
    readClipboardText,
    rememberCopy,
    serializeSelection,
    writeClipboardText,
    type CopyFormat,
    type PasteBlock,
  } from "$lib/gridClipboard";
  import {
    EMPTY_EDITS,
    originalValue,
    type CellValue,
    type PendingEdits,
    type ResultEditInfo,
    type RowRange,
  } from "$lib/resultEditing";

  let {
    columns,
    rows,
    rowOffset = 0,
    columnCatalogInfo = null,
    editInfo = null,
    editBlockedReason = null,
    edits = EMPTY_EDITS,
    oncommitcell = () => {},
    onfillcells = () => {},
    oneditblocked = () => {},
    onselectionchange = () => {},
    copyFormat = "tsv",
    copyHeaders = false,
    copyTableName = "",
    onpasteblock = () => {},
    findMatches = [],
    findCurrent = -1,
    hiddenRows = null,
    sort = [],
    sortable = false,
    onsort = () => {},
  }: {
    columns: QueryColumn[];
    rows: QueryRow[];
    // Posicion de la primera fila dentro del resultado completo (pagina):
    // la columna # muestra la numeracion global (501, 502... en la pagina 2).
    rowOffset?: number;
    columnCatalogInfo?: Map<string, ColumnCatalogInfo> | null;
    // Edicion del resultado (ver resultEditing.ts). Sin editInfo el grid es
    // de solo lectura y editBlockedReason explica por que.
    editInfo?: ResultEditInfo | null;
    editBlockedReason?: string | null;
    edits?: PendingEdits;
    oncommitcell?: (row: number, col: number, value: CellValue) => void;
    // Editar con varias celdas seleccionadas: el valor va a todas.
    onfillcells?: (ranges: RowRange[], value: CellValue) => void;
    oneditblocked?: (reason: string) => void;
    onselectionchange?: (range: RowRange | null) => void;
    // Ctrl+C: formato para varias celdas (una sola se copia como su valor).
    copyFormat?: CopyFormat;
    copyHeaders?: boolean;
    // "schema.tabla" para copiar como SQL INSERT.
    copyTableName?: string;
    // Ctrl+V: bloque interpretado del portapapeles, a pegar desde la celda
    // de arriba a la izquierda de la seleccion; `fill` es la seleccion
    // entera (un solo valor la rellena toda).
    onpasteblock?: (anchorRow: number, anchorCol: number, block: PasteBlock, fill: RowRange) => void;
    // Busqueda (Ctrl+F): celdas que coinciden, la actual (indice en
    // findMatches) y, con "Filtrar filas", las filas de la pagina a ocultar.
    findMatches?: FindMatch[];
    findCurrent?: number;
    hiddenRows?: ReadonlySet<number> | null;
    // Orden desde los encabezados (se aplica en la base, ver gridSort.ts):
    // criterios actuales, si la consulta lo admite, y el clic (Shift =
    // agregar criterio).
    sort?: SortKey[];
    sortable?: boolean;
    onsort?: (column: number, additive: boolean) => void;
  } = $props();

  // --- Posicion visible de cada fila ------------------------------------
  // Con "Filtrar filas" algunas filas se ocultan: todo lo que se posiciona
  // por fila (seleccion, editor, efectos, scroll) usa esta posicion visible
  // en vez de fila x alto, asi nada se desalinea. Sin filtro es fila x alto.
  const hiddenBefore = $derived.by(() => {
    if (!hiddenRows || hiddenRows.size === 0) return null;
    const prefix = new Int32Array(rows.length + 1);
    for (let row = 0; row < rows.length; row++) prefix[row + 1] = prefix[row] + (hiddenRows.has(row) ? 1 : 0);
    return prefix;
  });

  function visualRow(row: number): number {
    if (!hiddenBefore) return row;
    return row - hiddenBefore[Math.min(Math.max(row, 0), rows.length)];
  }

  // Alto visible de las filas minRow..maxRow (las ocultas no cuentan).
  function spanHeight(minRow: number, maxRow: number): number {
    return Math.max(0, visualRow(maxRow + 1) - visualRow(minRow)) * rowHeight;
  }

  // Filas de la pagina + filas nuevas pendientes (van al final).
  const totalRows = $derived(rows.length + edits.inserted.length);

  function catalogInfoFor(columnName: string): ColumnCatalogInfo | undefined {
    return columnCatalogInfo?.get(columnName.toLowerCase());
  }

  // id unico por instancia: el componente puede montarse mas de una vez
  // (varias consolas ejecutando en paralelo en el futuro), y aria-controls
  // necesita un id que no se repita en el documento.
  const viewportId = `grid-viewport-${crypto.randomUUID()}`;

  // --- Estructura del grid (por que no es una sola <table> sticky) -----
  // Todo vive dentro de UN solo contenedor con scroll nativo, pero con solo
  // TRES elementos sticky en total, sin importar filas ni columnas:
  //   - .grid-header: la fila de encabezados completa (sticky top)
  //   - .row-gutter: la columna de numeros de fila completa (sticky left)
  //   - .grid-corner: la esquina (sticky top + left)
  // La version anterior hacia sticky CADA <th> del header y CADA numero de
  // fila del cuerpo: en WebKitGTK (el motor de Tauri en Linux) cada uno es
  // una capa que se reposiciona en cada frame de scroll. Tres elementos
  // sticky en vez de cientos, y sin translateZ/will-change: nada de eso hace
  // falta con esta estructura.
  //
  // Las filas se virtualizan por tramos (ver "Cuerpo virtualizado" abajo):
  // en el DOM solo esta lo visible mas un margen amplio. Una version
  // anterior montaba/desmontaba filas en el borde de la vista y se veia como
  // "filas cargando lento" (el scroll llega a pintarse antes que el
  // re-render); por eso lo visible se monta en el mismo evento de scroll y
  // solo se desmonta muy lejos de la vista.
  //
  // El costo dominante medido, de todos modos, era otro: overflow:hidden en
  // cada td (ver la nota en la hoja de estilos).

  // --- Selección tipo hoja de cálculo ---------------------------------
  // Un solo modelo (rango rectangular) cubre los tres casos: celda suelta
  // (start === end), arrastrar (end se mueve con el puntero) y columna
  // completa (start/end de fila = 0/ultima fila). Todavia es solo visual
  // — la idea es usarla despues para copiar al portapapeles — pero ya
  // queda armada para eso, no como un hack aparte.
  interface CellRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }

  let selection = $state<CellRange | null>(null);
  let isDragSelecting = $state(false);

  function normalized(sel: CellRange) {
    return {
      minRow: Math.min(sel.startRow, sel.endRow),
      maxRow: Math.max(sel.startRow, sel.endRow),
      minCol: Math.min(sel.startCol, sel.endCol),
      maxCol: Math.max(sel.startCol, sel.endCol),
    };
  }

  // Seleccion multiple (Ctrl+clic): `selection` es el rango activo (el
  // ultimo clicado, el que se extiende con Shift o arrastrando) y
  // `extraSelections` los que se fueron agregando antes. Un clic normal
  // vuelve a un solo rango.
  let extraSelections = $state<CellRange[]>([]);

  function sameRange(a: CellRange, b: CellRange): boolean {
    const x = normalized(a);
    const y = normalized(b);
    return x.minRow === y.minRow && x.maxRow === y.maxRow && x.minCol === y.minCol && x.maxCol === y.maxCol;
  }

  // Ctrl+clic: agrega el rango; si ya estaba seleccionado (solo), lo quita.
  function toggleInSelection(range: CellRange) {
    const all = selection ? [...extraSelections, selection] : [...extraSelections];
    const existing = all.findIndex((candidate) => sameRange(candidate, range));
    if (existing >= 0) {
      all.splice(existing, 1);
      selection = all.at(-1) ?? null;
      extraSelections = all.slice(0, -1);
      return;
    }
    extraSelections = all;
    selection = range;
  }

  function setSelection(range: CellRange, event?: MouseEvent) {
    if (event && (event.ctrlKey || event.metaKey)) {
      toggleInSelection(range);
      return;
    }
    extraSelections = [];
    selection = range;
  }

  function selectCell(row: number, col: number, extend = false) {
    if (extend && selection) {
      selection = { ...selection, endRow: row, endCol: col };
    } else {
      extraSelections = [];
      selection = { startRow: row, startCol: col, endRow: row, endCol: col };
    }
  }

  const isFullColumn = (range: CellRange) => {
    const { minRow, maxRow } = normalized(range);
    return minRow === 0 && maxRow >= totalRows - 1;
  };
  const isFullRow = (range: CellRange) => {
    const { minCol, maxCol } = normalized(range);
    return minCol === 0 && maxCol >= columns.length - 1;
  };

  function selectColumn(col: number, event?: MouseEvent) {
    focusGrid();
    const lastRow = Math.max(0, totalRows - 1);
    // Shift: de la columna activa hasta esta.
    if (event?.shiftKey && selection && isFullColumn(selection)) {
      selection = { ...selection, startRow: 0, endRow: lastRow, endCol: col };
      return;
    }
    setSelection({ startRow: 0, startCol: col, endRow: lastRow, endCol: col }, event);
  }

  // Toggle: si ya esta todo seleccionado, un segundo clic lo limpia.
  function toggleSelectAll() {
    focusGrid();
    if (totalRows === 0 || columns.length === 0) return;
    const lastRow = totalRows - 1;
    const lastCol = columns.length - 1;
    if (selection && extraSelections.length === 0) {
      const { minRow, maxRow, minCol, maxCol } = normalized(selection);
      if (minRow === 0 && minCol === 0 && maxRow === lastRow && maxCol === lastCol) {
        selection = null;
        return;
      }
    }
    extraSelections = [];
    selection = { startRow: 0, startCol: 0, endRow: lastRow, endCol: lastCol };
  }

  function selectRow(row: number, event?: MouseEvent) {
    focusGrid();
    const lastCol = Math.max(0, columns.length - 1);
    // Shift: de la fila activa hasta esta.
    if (event?.shiftKey && selection && isFullRow(selection)) {
      selection = { ...selection, startCol: 0, endCol: lastCol, endRow: row };
      return;
    }
    setSelection({ startRow: row, startCol: 0, endRow: row, endCol: lastCol }, event);
  }

  // Todos los rangos seleccionados, normalizados (el activo al final).
  const allSelections = $derived(selection ? [...extraSelections, selection] : extraSelections);

  $effect(() => {
    const range = selection ? normalized(selection) : null;
    untrack(() => onselectionchange(range));
  });

  // Quitar filas nuevas achica el total: una seleccion que apuntaba mas alla
  // de la ultima fila se recorta (o se limpia si ya no toca ninguna).
  $effect(() => {
    const last = totalRows - 1;
    untrack(() => {
      extraSelections = extraSelections.filter((range) => Math.min(range.startRow, range.endRow) <= last);
      if (!selection) return;
      if (last < 0 || Math.min(selection.startRow, selection.endRow) > last) {
        selection = null;
      } else if (selection.startRow > last || selection.endRow > last) {
        selection = {
          ...selection,
          startRow: Math.min(selection.startRow, last),
          endRow: Math.min(selection.endRow, last),
        };
      }
    });
  });

  // --- API para la barra de edicion (ResultPane, via bind:this) ---------
  export function selectedRange(): RowRange | null {
    return selection ? normalized(selection) : null;
  }

  export function selectedRanges(): RowRange[] {
    return allSelections.map(normalized);
  }

  // --- Deshacer con contexto ----------------------------------------------
  // Deshacer lleva el grid hasta el cambio, desvanece las filas nuevas que
  // se quitan y hace un destello sobre lo restaurado: se VE que se deshizo.
  // Todo con un par de overlays y clases, sin re-render.
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Desplaza (suave) solo si el rango no esta a la vista.
  export async function reveal(range: RowRange) {
    const el = viewportEl;
    if (!el) return;
    const bodyTop = headerHeight;
    const rowTop = bodyTop + visualRow(range.minRow) * rowHeight;
    const rowBottom = rowTop + spanHeight(range.minRow, range.maxRow);
    const visibleTop = el.scrollTop + bodyTop;
    const visibleBottom = el.scrollTop + el.clientHeight;
    let top = el.scrollTop;
    if (rowTop < visibleTop || rowBottom > visibleBottom) {
      top = Math.max(0, rowTop - bodyTop - (el.clientHeight - bodyTop) / 3);
    }
    let left = el.scrollLeft;
    const colLeft = rowNumberWidth + (columnLefts[range.minCol] ?? 0);
    const colRight = rowNumberWidth + (columnLefts[range.maxCol] ?? 0) + (columnWidths[range.maxCol] ?? 0);
    if (colLeft < el.scrollLeft + rowNumberWidth || colRight > el.scrollLeft + el.clientWidth) {
      left = Math.max(0, colLeft - rowNumberWidth - 24);
    }
    if (Math.abs(top - el.scrollTop) < 1 && Math.abs(left - el.scrollLeft) < 1) return;
    const smooth = !prefersReducedMotion();
    el.scrollTo({ top, left, behavior: smooth ? "smooth" : "auto" });
    if (smooth) await wait(Math.min(420, 160 + Math.abs(top - el.scrollTop) / 12));
  }

  // Filas nuevas que estan por quitarse. Animar la fila (<tr>) y su numero
  // (columna #, sticky: otra capa) por separado nunca queda sincronizado en
  // WebKitGTK: cada capa se pinta a su ritmo y se ve la data irse antes que
  // el numero. En vez de eso, UNA "cortina" del color del fondo cubre la
  // fila entera (numero incluido) y se funde encima; al terminar, la fila se
  // quita en el mismo cuadro en que la cortina desaparece. Un solo elemento
  // animado => sincronizado por construccion.
  //
  // Si al quitarlas el contenido se achica tanto que el scroll tendria que
  // saltar (estando abajo del todo), el grid se desliza durante la
  // animacion en vez de saltar al final.
  const LEAVE_MS = 160;

  // Una por rango que sale (Ctrl+clic puede quitar varios salteados).
  let curtains = $state<{ top: number; left: number; width: number; height: number }[]>([]);
  let curtainTimer: ReturnType<typeof setTimeout> | null = null;

  export async function fadeOutInsertedRows(range: RowRange) {
    const first = Math.max(range.minRow, rows.length);
    const last = Math.min(range.maxRow, totalRows - 1);
    const el = viewportEl;
    if (first > last || !el || prefersReducedMotion()) return;
    const height = (last - first + 1) * rowHeight;
    curtains = [
      ...curtains,
      {
        top: headerHeight + visualRow(first) * rowHeight,
        // La cortina va en coordenadas del contenido: cubre lo visible en
        // horizontal (desde la columna #, que es sticky, hasta el borde).
        left: el.scrollLeft,
        width: el.clientWidth,
        height,
      },
    ];
    const maxScrollAfter = el.scrollHeight - height - el.clientHeight;
    if (el.scrollTop > maxScrollAfter) el.scrollTo({ top: Math.max(0, maxScrollAfter), behavior: "smooth" });
    await wait(LEAVE_MS);
    // Por si el llamador no llega a quitar la fila (no deberia pasar): la
    // cortina no puede quedar tapando datos.
    if (curtainTimer) clearTimeout(curtainTimer);
    curtainTimer = setTimeout(() => (curtains = []), 300);
  }

  // --- Capa de efectos ----------------------------------------------------
  // Toda animacion de feedback del grid es UN overlay posicionado, nunca una
  // transicion sobre las celdas: no toca el DOM de la tabla y, cuando afecta
  // a filas enteras, un solo elemento cubre tambien su numero (columna #,
  // que es otra capa) — asi fila y numero siempre se animan juntos. Van en
  // coordenadas del contenido (.grid-canvas), asi acompañan al scroll.
  //   appear: la fila nueva aparece (un velo del color del fondo que se va)
  //   flash:  destello de acento (deshacer, restaurar)
  //   commit: destello corto sobre la celda recien editada
  //   delete: pulso rojo sobre la fila marcada para eliminar
  //   copy:   contorno breve sobre lo copiado
  type EffectKind = "appear" | "flash" | "commit" | "delete" | "copy";
  interface GridEffect {
    id: number;
    kind: EffectKind;
    top: number;
    left: number;
    width: number;
    height: number;
  }

  let effects = $state<GridEffect[]>([]);
  let nextEffectId = 0;

  function addEffect(range: RowRange, kind: EffectKind) {
    const el = viewportEl;
    if (!el || !widthsLocked || prefersReducedMotion()) return;
    const maxRow = Math.min(range.maxRow, Math.max(0, totalRows - 1));
    if (range.minRow > maxRow) return;
    const wholeRow = range.minCol <= 0 && range.maxCol >= columns.length - 1;
    const top = headerHeight + visualRow(range.minRow) * rowHeight;
    const height = spanHeight(range.minRow, maxRow);
    if (height <= 0) return;
    let left: number;
    let width: number;
    if (wholeRow) {
      // Todo lo visible en horizontal, desde la columna # (sticky).
      left = el.scrollLeft;
      width = el.clientWidth;
    } else {
      left = rowNumberWidth + (columnLefts[range.minCol] ?? 0);
      width = (columnLefts[range.maxCol] ?? 0) + (columnWidths[range.maxCol] ?? 0) - (columnLefts[range.minCol] ?? 0);
    }
    effects = [...effects, { id: ++nextEffectId, kind, top, left, width, height }];
  }

  function removeEffect(id: number) {
    effects = effects.filter((effect) => effect.id !== id);
  }

  export function flash(range: RowRange) {
    addEffect(range, "flash");
  }

  export function highlight(range: RowRange, kind: "appear" | "commit" | "flash") {
    addEffect(range, kind);
  }

  export function selectRange(range: RowRange) {
    extraSelections = [];
    selection = { startRow: range.minRow, startCol: range.minCol, endRow: range.maxRow, endCol: range.maxCol };
  }

  // --- Copiar y pegar (Ctrl+C / Ctrl+V) -----------------------------------
  // La seleccion del grid ES lo que se copia: una celda, un rango, filas o
  // columnas enteras. El foco tiene que estar en el grid para que lleguen
  // las teclas (ver focusGrid).
  let gridEl = $state<HTMLDivElement>();

  function focusGrid(target?: Element | null) {
    const cell = target instanceof Element ? target.closest("td") : null;
    (cell ?? gridEl)?.focus({ preventScroll: true });
  }

  // Con varios rangos (Ctrl+clic) se copia la union de sus filas por la
  // union de sus columnas, en orden: filas 5 y 150 enteras => esas dos
  // filas; columnas A y D => esas dos columnas de todas las filas.
  async function copySelection() {
    const ranges = allSelections.map(normalized);
    if (ranges.length === 0) return;
    const rowSet = new Set<number>();
    const colSet = new Set<number>();
    for (const range of ranges) {
      for (let row = range.minRow; row <= Math.min(range.maxRow, totalRows - 1); row++) rowSet.add(row);
      for (let col = range.minCol; col <= range.maxCol; col++) colSet.add(col);
    }
    // Con "Filtrar filas", lo oculto no se copia.
    const rowList = [...rowSet].filter((row) => !hiddenRows?.has(row)).sort((a, b) => a - b);
    const colList = [...colSet].sort((a, b) => a - b);
    const copyColumns = colList.map((col) => ({ name: columns[col].name, type: columns[col].type }));
    const values: CellValue[][] = rowList.map((row) => colList.map((col) => valueAt(row, col)));
    if (values.length === 0 || copyColumns.length === 0) return;
    const text = serializeSelection(copyColumns, values, {
      format: copyFormat,
      headers: copyHeaders,
      tableName: copyTableName || $t("grid.defaultTableName"),
      quoteString: $activeEngine?.quoteString,
    });
    rememberCopy(text, values);
    if (await writeClipboardText(text)) for (const range of ranges) addEffect(range, "copy");
  }

  // Se pega desde la primera celda (arriba a la izquierda) de toda la
  // seleccion; con un solo rango, un valor unico rellena ese rango.
  async function pasteIntoSelection() {
    const ranges = allSelections.map(normalized);
    if (ranges.length === 0) return;
    const range =
      ranges.length === 1
        ? ranges[0]
        : {
            minRow: Math.min(...ranges.map((item) => item.minRow)),
            maxRow: Math.min(...ranges.map((item) => item.minRow)),
            minCol: Math.min(...ranges.map((item) => item.minCol)),
            maxCol: Math.min(...ranges.map((item) => item.minCol)),
          };
    const block = parseClipboard(
      await readClipboardText(),
      columns.map((column) => column.name),
    );
    if (!block) return;
    onpasteblock(range.minRow, block.alignedByName ? 0 : range.minCol, block, range);
  }

  function onGridKeydown(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.altKey || event.shiftKey || editing) return;
    const key = event.key.toLowerCase();
    if (key === "c") {

      event.preventDefault();
      void copySelection();
    } else if (key === "v") {
      event.preventDefault();
      void pasteIntoSelection();
    }
  }

  export function pulseDeleted(range: RowRange) {
    addEffect({ ...range, minCol: 0, maxCol: columns.length - 1 }, "delete");
  }

  // Tras "+": selecciona la fila nueva, la trae a la vista y abre la
  // edicion de su primera celda editable.
  // La fila aparece fundiendose (numero incluido) y, si esta fuera de la
  // vista, el grid se desliza suave hasta ella.
  export async function focusNewRow(row: number) {
    await tick();
    const col = editInfo?.columns.findIndex((column) => column && !column.generated) ?? -1;
    selectCell(row, Math.max(0, col));
    addEffect({ minRow: row, maxRow: row, minCol: 0, maxCol: columns.length - 1 }, "appear");
    const el = viewportEl;
    if (el) {
      const top = headerHeight + visualRow(row) * rowHeight;
      const visibleBottom = el.scrollTop + el.clientHeight;
      if (top + rowHeight > visibleBottom || top < el.scrollTop + headerHeight) {
        el.scrollTo({ top: Math.max(0, top - el.clientHeight / 2), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }
    if (col >= 0) startEditing(row, col);
  }

  // --- Tooltip de columna (nombre, tipo, comentario) ------------------
  // Propio de la app, no el title nativo del navegador (que ademas
  // aparece con delay y se ve distinto por SO). position:fixed para
  // escapar del overflow/scroll de .grid-viewport sin importar donde
  // este montado en el arbol.
  let hoveredColumn = $state<{ index: number; x: number; y: number } | null>(null);

  function showColumnTooltip(event: Event, columnIndex: number) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    hoveredColumn = { index: columnIndex, x: rect.left, y: rect.bottom };
  }

  function hideColumnTooltip() {
    hoveredColumn = null;
  }

  // --- Ancho de columnas -------------------------------------------------
  // Header y cuerpo son dos <table> distintas (el header tiene que poder ser
  // un unico bloque sticky), asi que comparten el mismo arreglo de anchos
  // via colgroup, siempre en table-layout:fixed.
  //
  // El ancho natural de cada columna se calcula midiendo el TEXTO con un
  // canvas, no dejando que la tabla lo resuelva con table-layout:auto: esa
  // pasada extra de layout sobre todas las celdas (500 x 43 = 21.500) era lo
  // mas caro de mostrar un resultado (~700ms medidos en WebKitGTK), y
  // mientras corria la pantalla seguia mostrando "Ejecutando...". La app usa
  // fuentes del sistema (sin webfonts que carguen tarde), asi que el canvas
  // mide con la misma fuente con la que despues se dibuja.
  //
  // Ni siquiera se mide cada texto: measureText cuesta ~10us en WebKitGTK
  // (21.500 llamadas = ~200ms). Se estima cada texto sumando el ancho de sus
  // caracteres (cacheado: hay pocos distintos) y solo los 3 candidatos mas
  // anchos de cada columna se miden de verdad (kerning incluido). El
  // resultado es el mayor de ambos, asi que nunca se queda corto.
  const MIN_COLUMN_WIDTH = 40;
  // padding horizontal (--space-2 a cada lado) + border-right de la celda,
  // mas 2px de aire para que un redondeo distinto entre canvas y layout no
  // deje el texto rozando el borde.
  const CELL_CHROME_WIDTH = 8 * 2 + 1 + 2;
  // Icono de tipo (12px) + gap (--space-1) del header.
  const HEADER_ICON_WIDTH = 12 + 4;
  // Boton de orden del encabezado (icono + numero de prioridad + margen).
  const HEADER_SORT_WIDTH = 26;

  let textMeasureContext: CanvasRenderingContext2D | null = null;

  function gridFonts() {
    const rootStyle = getComputedStyle(document.documentElement);
    const size = `${(parseFloat(rootStyle.fontSize) || 16) * 0.8125}px`; // font-size de .grid-canvas
    const family = getComputedStyle(document.body).fontFamily;
    const headingWeight = rootStyle.getPropertyValue("--font-weight-heading").trim() || "600";
    return {
      body: `${size} ${family}`,
      nullValue: `italic ${size} ${family}`,
      header: `${headingWeight} ${size} ${family}`,
    };
  }

  // white-space:nowrap colapsa saltos de linea/tabs/espacios repetidos en
  // un solo espacio al dibujar; medirlos sin colapsar sobreestima el ancho.
  function displayedText(value: string): string {
    return /\s\s|[\t\n\r]/.test(value) ? value.replace(/\s+/g, " ") : value;
  }

  const naturalWidths = $derived.by(() => {
    textMeasureContext ??= document.createElement("canvas").getContext("2d");
    const context = textMeasureContext;
    if (!context) {
      return { header: columns.map(() => MIN_COLUMN_WIDTH), body: columns.map(() => 0) };
    }
    const fonts = gridFonts();

    context.font = fonts.body;
    const charWidths = new Map<string, number>();
    const charWidth = (character: string) => {
      let width = charWidths.get(character);
      if (width === undefined) {
        width = context.measureText(character).width;
        charWidths.set(character, width);
      }
      return width;
    };

    const CANDIDATES = 3;
    const widest = columns.map(() => [] as { estimate: number; text: string }[]);
    const hasNull = columns.map(() => false);
    for (const row of rows) {
      for (let index = 0; index < columns.length; index++) {
        const value = row[index];
        if (value === null || value === undefined) {
          hasNull[index] = true;
          continue;
        }
        if (value === "") continue;
        const text = displayedText(value);
        let estimate = 0;
        for (const character of text) estimate += charWidth(character);
        const candidates = widest[index];
        if (candidates.length < CANDIDATES) {
          candidates.push({ estimate, text });
        } else {
          let smallest = 0;
          for (let i = 1; i < candidates.length; i++) {
            if (candidates[i].estimate < candidates[smallest].estimate) smallest = i;
          }
          if (estimate > candidates[smallest].estimate) candidates[smallest] = { estimate, text };
        }
      }
    }
    const textWidths = widest.map((candidates) =>
      candidates.reduce(
        (max, candidate) => Math.max(max, candidate.estimate, context.measureText(candidate.text).width),
        0,
      ),
    );

    context.font = fonts.nullValue;
    const nullWidth = context.measureText("NULL").width;
    const body = textWidths.map((width, index) =>
      Math.ceil(Math.max(width, hasNull[index] ? nullWidth : 0) + CELL_CHROME_WIDTH),
    );

    context.font = fonts.header;
    const header = columns.map((column) =>
      Math.ceil(
        context.measureText(column.name).width +
          HEADER_ICON_WIDTH +
          (sortable ? HEADER_SORT_WIDTH : 0) +
          CELL_CHROME_WIDTH,
      ),
    );

    return { header, body };
  });

  // Anchos ESTABLES mientras las columnas sean las mismas. Ordenar,
  // filtrar, paginar o recargar traen otras filas de la misma consulta: si
  // cada vez se volvieran a medir, todas las columnas cambiarian de ancho y
  // la grilla "saltaria". Con la misma firma de columnas (nombre + tipo) se
  // conservan los anchos que habia —incluidos los ajustados a mano—; un
  // valor mas largo se recorta con elipsis (clippedColumnsSelector). Solo
  // columnas distintas (otra consulta) vuelven a medir.
  const columnSignature = $derived(columns.map((column) => `${column.name}\u0000${column.type}`).join("\u0001"));
  const naturalColumnWidths = $derived(
    naturalWidths.header.map((headerWidth, index) => Math.max(headerWidth, naturalWidths.body[index], MIN_COLUMN_WIDTH)),
  );
  let keptWidths = $state.raw<{ signature: string; widths: number[] } | null>(null);

  const columnWidths = $derived(
    keptWidths?.signature === columnSignature && keptWidths.widths.length === columns.length
      ? keptWidths.widths
      : naturalColumnWidths,
  );
  const widthsLocked = $derived(columnWidths.length > 0 && columnWidths.length === columns.length);
  const tableWidth = $derived(columnWidths.reduce((total, width) => total + width, 0));

  // Ancho de la columna # en funcion de cuantos digitos tiene el numero de
  // fila mas grande. En `ch` con tabular-nums, cada digito mide 1ch: no
  // hace falta medir nada en el DOM. 2 * --space-2 de padding + 4px de aire.
  const gutterWidth = $derived(`calc(${String(Math.max(rowOffset + rows.length, 1)).length}ch + 2 * var(--space-2) + 4px)`);

  // Mientras una columna mida al menos el ancho de su contenido, ninguna
  // celda desborda y no hace falta recortarlas. Solo las que el usuario
  // achico reciben overflow:hidden + ellipsis, via una regla por columna
  // (ver clipStyle) — ver la nota de rendimiento en la hoja de estilos.
  const clippedColumnsSelector = $derived(
    columnWidths
      .map((width, index) =>
        // Cada mosaico tiene solo las columnas de su grupo (ver mountTile).
        width < (naturalWidths.body[index] ?? 0)
          ? `#${viewportId} .grid-body-table table.g${Math.floor(index / GROUP_COLS)} td:nth-child(${(index % GROUP_COLS) + 1})`
          : null,
      )
      .filter((selector) => selector !== null)
      .join(","),
  );

  function beginColumnResize(event: PointerEvent, columnIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    if (!widthsLocked) return;

    const startX = event.clientX;
    const startWidth = columnWidths[columnIndex];
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    // A lo sumo un ancho nuevo por cuadro (ver onePerFrame).
    const live = onePerFrame((width: number) => {
      const next = [...columnWidths];
      next[columnIndex] = width;
      keptWidths = { signature: columnSignature, widths: next };
    });

    function onMove(moveEvent: PointerEvent) {
      live.set(Math.round(Math.max(MIN_COLUMN_WIDTH, startWidth + (moveEvent.clientX - startX))));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      live.flush();
      // El ancho total cambia el rango del scrollbar horizontal.
      void tick().then(updateThumbs);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // --- Overlay de seleccion ---------------------------------------------
  // La seleccion se dibuja con UN solo overlay posicionado por encima de
  // la tabla del cuerpo, no tocando el class/style de cada celda: con 500+
  // filas x varias decenas de columnas, reescribir el DOM de miles de <td>
  // en cada evento de arrastre (pointerenter tira muchos por segundo) se
  // sentia pesado. Las posiciones salen directo de columnWidths (sumas
  // acumuladas), sin medir el DOM.
  let rowHeight = $state(28);

  const columnLefts = $derived.by(() => {
    const lefts: number[] = [];
    let left = 0;
    for (const width of columnWidths) {
      lefts.push(left);
      left += width;
    }
    return lefts;
  });

  // Un overlay por rango seleccionado (normalmente uno; varios con
  // Ctrl+clic). Siguen siendo pocos elementos, sin tocar las celdas.
  const selectionRects = $derived.by(() => {
    if (!widthsLocked) return [];
    return allSelections.flatMap((range, index) => {
      const { minRow, maxRow, minCol, maxCol } = normalized(range);
      const left = columnLefts[minCol];
      const right = columnLefts[maxCol] + columnWidths[maxCol];
      if (left === undefined || Number.isNaN(right)) return [];
      const height = spanHeight(minRow, maxRow);
      if (height <= 0) return [];
      return [{ key: index, top: visualRow(minRow) * rowHeight, height, left, width: right - left }];
    });
  });

  function onCellPointerDown(event: PointerEvent, row: number, col: number) {
    if (event.button !== 0) return;
    // Sin setPointerCapture a proposito: si el puntero queda "capturado"
    // por esta celda, pointerenter deja de dispararse en las demas celdas
    // y no hay forma de detectar sobre cual esta el mouse al arrastrar.
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      toggleInSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    } else {
      selectCell(row, col, event.shiftKey);
    }
    isDragSelecting = true;
    // preventDefault tambien evita que la celda tome el foco: se lo da a
    // mano (sin scroll) para que Ctrl+C/V y los atajos lleguen al grid.
    focusGrid(event.target as Element);
  }

  function onCellPointerEnter(row: number, col: number) {
    if (!isDragSelecting || !selection) return;
    selection = { ...selection, endRow: row, endCol: col };
  }

  function onCellKeydown(event: KeyboardEvent, row: number, col: number) {
    if ((event.key === "Enter" && !event.ctrlKey && !event.altKey && !event.metaKey) || event.key === "F2") {
      event.preventDefault();
      // Con varias celdas seleccionadas se conserva la seleccion: lo que se
      // escriba va a todas (ver startEditing).
      if (!fillRangesFor(row, col)) selectCell(row, col);
      requestEdit(row, col);
      return;
    }
    // Escribir sobre una celda empieza a editarla con esa tecla, como en una
    // planilla (y en todas las seleccionadas). El espacio sigue siendo
    // seleccionar.
    if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) {
      event.preventDefault();
      requestEdit(row, col, event.key);
      return;
    }
    if (event.key !== " ") return;
    event.preventDefault();
    selectCell(row, col, event.shiftKey);
  }

  function onBodyDoubleClick(event: MouseEvent) {
    const cell = cellFromEvent(event);
    if (cell) requestEdit(cell.row, cell.col);
  }

  // --- Edicion en la celda ------------------------------------------------
  // Un solo <input> posicionado encima de la celda (como el overlay de
  // seleccion), no un input dentro de cada <td>: el cuerpo sigue siendo HTML
  // estatico y editar no re-renderiza nada.
  let editing = $state<{ row: number; col: number } | null>(null);
  let editValue = $state("");
  let editInput = $state<HTMLInputElement>();

  function valueAt(row: number, col: number): CellValue {
    if (row >= rows.length) return edits.inserted[row - rows.length]?.[col] ?? { kind: "null" };
    return edits.updates.get(row)?.get(col) ?? originalValue(rows[row][col]);
  }

  function editableColumn(row: number, col: number): string | null {
    if (!editInfo) return editBlockedReason ?? $t("grid.blocked.result");
    const column = editInfo.columns[col];
    if (!column) return $t("grid.blocked.computedColumn", { column: columns[col]?.name ?? "" });
    if (column.generated) return $t("grid.blocked.generatedColumn", { column: column.name });
    if (row < rows.length && edits.deleted.has(row)) return $t("grid.blocked.deletedRow");
    return null;
  }

  function requestEdit(row: number, col: number, typed?: string) {
    const blocked = editableColumn(row, col);
    if (blocked) {
      oneditblocked(blocked);
      return;
    }
    void startEditing(row, col, typed);
  }

  // Si al editar (row, col) el valor va a varias celdas: la seleccion tiene
  // mas de una celda y la contiene. null: solo esa celda.
  function fillRangesFor(row: number, col: number): RowRange[] | null {
    const ranges = allSelections.map(normalized);
    const cells = ranges.reduce(
      (total, range) =>
        total + (Math.min(range.maxRow, totalRows - 1) - range.minRow + 1) * (range.maxCol - range.minCol + 1),
      0,
    );
    if (cells <= 1) return null;
    const inside = ranges.some(
      (range) => row >= range.minRow && row <= range.maxRow && col >= range.minCol && col <= range.maxCol,
    );
    return inside ? ranges : null;
  }

  // Celdas a las que va lo que se escribe (null: solo la que se edita).
  let fillTargets = $state<RowRange[] | null>(null);
  const fillCount = $derived(
    fillTargets
      ? fillTargets.reduce(
          (total, range) =>
            total + (Math.min(range.maxRow, totalRows - 1) - range.minRow + 1) * (range.maxCol - range.minCol + 1),
          0,
        )
      : 0,
  );

  // `typed`: la tecla con la que se empezo a escribir; reemplaza el valor,
  // con el cursor al final. Sin ella (Enter, F2, doble clic), el valor
  // actual seleccionado.
  async function startEditing(row: number, col: number, typed?: string) {
    const value = valueAt(row, col);
    fillTargets = fillRangesFor(row, col);
    editing = { row, col };
    editValue = typed ?? (value.kind === "text" ? value.value : "");
    await tick();
    editInput?.focus({ preventScroll: true });
    if (typed === undefined) editInput?.select();
    else editInput?.setSelectionRange(editValue.length, editValue.length);
  }

  function finishEditing(commit: boolean, next: -1 | 0 | 1 = 0, refocus = true) {
    const current = editing;
    if (!current) return;
    editing = null;
    const targets = fillTargets;
    fillTargets = null;
    if (commit && targets) {
      onfillcells(targets, { kind: "text", value: editValue });
      for (const range of targets) addEffect(range, "commit");
      if (refocus) void tick().then(() => cellElement(current.row, current.col)?.focus({ preventScroll: true }));
      return;
    }
    if (commit) {
      const previous = valueAt(current.row, current.col);
      const unchanged = previous.kind === "text" ? previous.value === editValue : editValue === "";
      if (!unchanged) {
        oncommitcell(current.row, current.col, { kind: "text", value: editValue });
        addEffect({ minRow: current.row, maxRow: current.row, minCol: current.col, maxCol: current.col }, "commit");
      }
    }
    if (next !== 0 && editInfo) {
      // Tab / Shift+Tab: siguiente celda editable de la misma fila.
      for (let col = current.col + next; col >= 0 && col < columns.length; col += next) {
        if (!editableColumn(current.row, col)) {
          selectCell(current.row, col);
          void startEditing(current.row, col);
          return;
        }
      }
    }
    if (refocus) void tick().then(() => cellElement(current.row, current.col)?.focus({ preventScroll: true }));
  }

  function setEditingNull() {
    const current = editing;
    if (!current) return;
    editing = null;
    const targets = fillTargets;
    fillTargets = null;
    if (targets) {
      onfillcells(targets, { kind: "null" });
      for (const range of targets) addEffect(range, "commit");
    } else if (valueAt(current.row, current.col).kind !== "null") {
      oncommitcell(current.row, current.col, { kind: "null" });
      addEffect({ minRow: current.row, maxRow: current.row, minCol: current.col, maxCol: current.col }, "commit");
    }
    void tick().then(() => cellElement(current.row, current.col)?.focus({ preventScroll: true }));
  }

  function onEditorKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      finishEditing(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finishEditing(false);
    } else if (event.key === "Tab") {
      event.preventDefault();
      finishEditing(true, event.shiftKey ? -1 : 1);
    }
  }

  const editorRect = $derived.by(() => {
    if (!editing || !widthsLocked) return null;
    const left = columnLefts[editing.col];
    const width = columnWidths[editing.col];
    if (left === undefined || width === undefined) return null;
    return { top: visualRow(editing.row) * rowHeight, left, width, height: rowHeight };
  });

  // Un resultado nuevo (otra pagina, re-ejecucion) cierra la edicion.
  $effect(() => {
    rows;
    untrack(() => {
      editing = null;
      fillTargets = null;
    });
  });

  // Un solo listener por tipo de evento en el <tbody> en vez de tres por
  // celda: la fila/columna salen de la posicion de la celda en la tabla.
  function cellFromEvent(event: Event): { row: number; col: number } | null {
    const target = event.target;
    const cell = target instanceof Element ? target.closest("td") : null;
    const row = cell?.parentElement;
    const section = row?.parentElement;
    if (!cell || !(row instanceof HTMLTableRowElement) || !(section instanceof HTMLTableSectionElement)) {
      return null;
    }
    // Cada mosaico es su propia tabla (ver mountTile): el indice real es el
    // de su primera fila/columna + la posicion adentro.
    return {
      row: Number(section.dataset.firstRow ?? 0) + row.sectionRowIndex,
      col: Number(section.dataset.firstCol ?? 0) + cell.cellIndex,
    };
  }

  // selectstart es lo que dispara WebKit al empezar a seleccionar texto
  // (arrastre, doble o triple clic); cancelarlo corta la seleccion nativa sin
  // impedir el foco de las celdas. Si quedo texto seleccionado de antes
  // dentro del grid, se limpia al empezar una seleccion de celdas.
  function preventNativeSelection(event: Event) {
    // El editor de celda si necesita seleccionar su propio texto.
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
  }

  function clearNativeSelectionInGrid() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !viewportEl) return;
    if (viewportEl.contains(selection.anchorNode) || viewportEl.contains(selection.focusNode)) {
      selection.removeAllRanges();
    }
  }

  function onBodyPointerDown(event: PointerEvent) {
    // preventDefault en pointerdown tambien evita que el input pierda el
    // foco: la edicion en curso se confirma a mano antes de seleccionar.
    if (editing) finishEditing(true, 0, false);
    clearNativeSelectionInGrid();
    const cell = cellFromEvent(event);
    if (cell) onCellPointerDown(event, cell.row, cell.col);
  }

  // pointerover (burbujea) en vez de pointerenter (no burbujea, no se puede
  // delegar): las celdas solo tienen texto adentro, asi que cada pointerover
  // corresponde a entrar a una celda nueva.
  function onBodyPointerOver(event: PointerEvent) {
    const cell = cellFromEvent(event);
    if (cell) onCellPointerEnter(cell.row, cell.col);
    const td = event.target instanceof Element ? event.target.closest("td") : null;
    if (td?.dataset.problem) {
      problemTooltipCell = td;
      scheduleTooltipFor(td, td.dataset.problem);
    }
  }

  // El motivo de una celda en rojo (paintCell): el tooltip de la app, pedido
  // a mano porque las celdas son HTML armado, no componentes.
  let problemTooltipCell: HTMLTableCellElement | null = null;

  function onBodyPointerOut(event: PointerEvent) {
    const td = event.target instanceof Element ? event.target.closest("td") : null;
    if (td && td === problemTooltipCell && !td.contains(event.relatedTarget as Node | null)) {
      hideTooltipFor(td);
      problemTooltipCell = null;
    }
  }

  function onBodyKeydown(event: KeyboardEvent) {
    const cell = cellFromEvent(event);
    if (cell) onCellKeydown(event, cell.row, cell.col);
  }

  // El cuerpo se arma como strings HTML en vez de un {#each} de Svelte:
  // son celdas de solo lectura, sin reactividad propia, y crear 21.500 <td>
  // uno por uno (cada uno con su {#if} para NULL/vacio y sus listeners)
  // costaba varios cientos de ms. El parser HTML del navegador arma el mismo
  // DOM de una sola vez, mucho mas rapido. Todo valor pasa por escapeHtml:
  // son datos de la base, nunca markup.
  // Columnas que se muestran con resaltado JSON: por tipo (JSON en MySQL,
  // json/jsonb en Postgres) o, en columnas de texto, por una muestra de sus
  // primeras celdas (ver detectJsonColumns). Se decide una vez por
  // resultado; el resto de las columnas no paga nada.
  const jsonColumns = $derived(detectJsonColumns(columns, rows));

  // Clase + contenido de una celda. La usan el render inicial (rowsHtml) y
  // los parches de edicion (applyEditsToDom), asi una celda editada y luego
  // revertida vuelve exactamente a como estaba.
  function cellParts(value: string | null, columnIndex: number): { className: string; html: string } {
    if (value === null) return { className: "null-value", html: "NULL" };
    if (value === "") return { className: "", html: "" };
    if (jsonColumns[columnIndex]) return { className: "json-value", html: highlightJson(value) };
    return { className: "", html: escapeHtml(value) };
  }

  // Las celdas con cadena vacia llevan un aria-label (no tienen texto que
  // leer). Se escapa una vez por tanda, no por celda; al cambiar el idioma se
  // actualizan las ya insertadas sin regenerar el cuerpo (ver el efecto de
  // abajo).
  function emptyCellHtml(): string {
    return `<td tabindex="0" aria-label="${escapeHtml($t("grid.emptyString"))}"></td>`;
  }

  function rowsHtml(from: number, to: number, fromCol: number, toCol: number): string {
    const emptyCell = emptyCellHtml();
    const parts: string[] = [];
    for (let rowIndex = from; rowIndex < to; rowIndex++) {
      parts.push(rowIndex % 2 === 1 ? '<tr class="zebra-odd">' : "<tr>");
      const row = rows[rowIndex];
      const lastCol = Math.min(toCol, row.length);
      for (let columnIndex = fromCol; columnIndex < lastCol; columnIndex++) {
        const value = row[columnIndex];
        if (value === "") {
          parts.push(emptyCell);
          continue;
        }
        const { className, html } = cellParts(value, columnIndex);
        parts.push(className ? `<td tabindex="0" class="${className}">${html}</td>` : `<td tabindex="0">${html}</td>`);
      }
      parts.push("</tr>");
    }
    return parts.join("");
  }

  $effect(() => {
    const label = $t("grid.emptyString");
    untrack(() => {
      if (!bodyEl) return;
      for (const td of bodyEl.querySelectorAll<HTMLTableCellElement>("td[aria-label]")) {
        td.setAttribute("aria-label", label);
      }
    });
  });

  // --- Cambios pendientes sobre el DOM -------------------------------------
  // Las celdas editadas y las filas eliminadas se marcan tocando SOLO esos
  // <td>/<tr> (unos pocos), nunca regenerando el cuerpo. Se lleva registro de
  // lo parchado para restaurarlo cuando el cambio se revierte.
  let patchedCells = new Map<string, { row: number; col: number }>();
  let patchedRows = new Set<number>();

  // null si su mosaico no esta montado: se parcha al montarlo (patchTile).
  function cellElement(row: number, col: number): HTMLTableCellElement | null {
    if (row >= rows.length) {
      const tbody = insertedEl?.querySelector("tbody");
      return tbody?.rows[row - rows.length]?.cells[col] ?? null;
    }
    const table = mountedTiles.get(Math.floor(row / CHUNK_ROWS))?.get(Math.floor(col / GROUP_COLS));
    return table?.tBodies[0]?.rows[row % CHUNK_ROWS]?.cells[col % GROUP_COLS] ?? null;
  }

  // La fila tiene un <tr> por cada mosaico montado de su tramo: las marcas
  // de fila (eliminada, oculta) van en todos.
  function rowElements(row: number): HTMLTableRowElement[] {
    if (row >= rows.length) {
      const tr = insertedEl?.querySelector("tbody")?.rows[row - rows.length];
      return tr ? [tr] : [];
    }
    const tiles = mountedTiles.get(Math.floor(row / CHUNK_ROWS));
    if (!tiles) return [];
    const list: HTMLTableRowElement[] = [];
    for (const table of tiles.values()) {
      const tr = table.tBodies[0]?.rows[row % CHUNK_ROWS];
      if (tr) list.push(tr);
    }
    return list;
  }

  // Por que un valor editado no encaja en su columna (cellTypes.ts), ya en
  // el idioma de la app; null si encaja o si la columna no se conoce.
  function problemFor(col: number, value: CellValue): string | null {
    const column = editInfo?.columns[col];
    const problem = column ? typeProblem(column, value) : null;
    return problem ? $t(`grid.${problem.key}`, problem.params) : null;
  }

  // En una fila nueva, el NULL inicial de una columna obligatoria no se
  // marca mientras se completa (se avisa al aplicar).
  function insertedProblem(value: CellValue, col: number): string | null {
    return value.kind === "text" ? problemFor(col, value) : null;
  }

  function paintCell(td: HTMLTableCellElement, value: CellValue, col: number, modified: boolean) {
    const parts = value.kind === "null" ? cellParts(null, col) : cellParts(value.kind === "text" ? value.value : "", col);
    // Un cambio que no encaja en su columna queda en rojo, con el motivo al
    // pasar el mouse: no hace falta esperar el error del servidor.
    const problem = modified ? problemFor(col, value) : null;
    td.className = [parts.className, modified ? "cell-modified" : "", problem ? "cell-invalid" : ""]
      .filter(Boolean)
      .join(" ");
    if (problem) td.dataset.problem = problem;
    else delete td.dataset.problem;
    td.innerHTML = parts.html;
    // La etiqueta de cadena vacía sigue al valor: una celda vacía editada con
    // texto no debe seguir anunciándose como vacía, ni al revés.
    if (value.kind === "text" && value.value === "") td.setAttribute("aria-label", $t("grid.emptyString"));
    else td.removeAttribute("aria-label");
  }

  function applyEditsToDom() {
    // La fila que tapaba la cortina ya no esta (este efecto corre despues de
    // actualizar el DOM, antes de pintar): se retira en el mismo cuadro.
    if (curtains.length > 0) {
      curtains = [];
      if (curtainTimer) clearTimeout(curtainTimer);
      curtainTimer = null;
    }
    const wanted = new Map<string, { row: number; col: number; value: CellValue }>();
    for (const [row, cols] of edits.updates) {
      for (const [col, value] of cols) wanted.set(`${row}:${col}`, { row, col, value });
    }
    for (const [key, cell] of patchedCells) {
      if (wanted.has(key)) continue;
      const td = cellElement(cell.row, cell.col);
      if (td) paintCell(td, originalValue(rows[cell.row]?.[cell.col] ?? null), cell.col, false);
      patchedCells.delete(key);
    }
    for (const [key, cell] of wanted) {
      const td = cellElement(cell.row, cell.col);
      if (!td) continue; // su tanda todavia no se inserto: se parcha al llegar
      paintCell(td, cell.value, cell.col, true);
      patchedCells.set(key, cell);
    }
    for (const row of patchedRows) {
      if (edits.deleted.has(row)) continue;
      for (const tr of rowElements(row)) tr.classList.remove("row-deleted");
      patchedRows.delete(row);
    }
    for (const row of edits.deleted) {
      const trs = rowElements(row);
      if (trs.length === 0) continue;
      for (const tr of trs) tr.classList.add("row-deleted");
      patchedRows.add(row);
    }
    if (findMatches.length > 0 || hiddenRows) applyFindToDom();
  }

  $effect(() => {
    edits;
    untrack(applyEditsToDom);
  });

  // --- Resaltado de busqueda y filas filtradas --------------------------
  // Igual que los cambios pendientes: se marcan SOLO esas <td>/<tr>, con
  // registro para desmarcar. applyEditsToDom reescribe el class de las
  // celdas editadas, por eso esto se vuelve a aplicar al final de aquel.
  let findPatched = new Set<HTMLTableCellElement>();
  let hiddenPatched = new Set<HTMLTableRowElement>();

  function applyFindToDom() {
    const wanted = new Set<HTMLTableCellElement>();
    const current = findMatches[findCurrent];
    for (const match of findMatches) {
      const td = cellElement(match.row, match.col);
      if (!td) continue;
      wanted.add(td);
      td.classList.add("find-match");
      td.classList.toggle("find-current", match === current);
    }
    for (const td of findPatched) {
      if (!wanted.has(td)) td.classList.remove("find-match", "find-current");
    }
    findPatched = wanted;

    const hidden = new Set<HTMLTableRowElement>();
    if (hiddenRows) {
      for (const row of hiddenRows) {
        for (const tr of rowElements(row)) {
          tr.classList.add("find-hidden");
          hidden.add(tr);
        }
      }
    }
    for (const tr of hiddenPatched) if (!hidden.has(tr)) tr.classList.remove("find-hidden");
    hiddenPatched = hidden;
  }

  $effect(() => {
    findMatches;
    findCurrent;
    untrack(applyFindToDom);
  });

  // Filtrar cambia el alto del contenido: los thumbs se recalculan.
  $effect(() => {
    hiddenRows;
    untrack(() => {
      applyFindToDom();
      void tick().then(updateThumbs);
    });
  });

  // Devuelve el foco al grid (p.ej. al cerrar la busqueda), en la celda
  // seleccionada si la hay.
  export function focusCell() {
    const range = selection ? normalized(selection) : null;
    const td = range ? cellElement(range.minRow, range.minCol) : null;
    (td ?? gridEl)?.focus({ preventScroll: true });
  }

  // La coincidencia actual: se selecciona y se trae a la vista.
  export function revealMatch(match: FindMatch) {
    selectCell(match.row, match.col);
    void reveal({ minRow: match.row, maxRow: match.row, minCol: match.col, maxCol: match.col });
  }

  // Filas nuevas: pocas, asi que van con markup de Svelte comun.
  let insertedEl = $state<HTMLDivElement>();

  function insertedLabel(value: CellValue, col: number): string {
    // Columna calculada por la consulta (no sale de la tabla): nada que
    // mostrar hasta que la fila exista.
    if (editInfo && !editInfo.columns[col]) return "";
    if (value.kind === "text") return value.value;
    if (value.kind === "null") return "NULL";
    return editInfo?.columns[col]?.generated ? "<generated>" : "<default>";
  }

  // --- Cuerpo virtualizado por tramos -------------------------------------
  // (docs/specs/v0.2-rendimiento.md, 21a.) Con la pagina entera en el DOM
  // (500 x 43 = 21.500 celdas, hasta 10.000 filas) cualquier cambio de
  // tamaño del area principal — mover el sidebar, el splitter — volvia a
  // maquetar todas las celdas en cada frame.
  //
  // El cuerpo se divide en mosaicos: tramos de CHUNK_ROWS filas por grupos
  // de GROUP_COLS columnas (gridWindow.ts; con pocas columnas, un solo
  // grupo). Cada mosaico es una <table> propia, en absoluto en su posicion,
  // dentro de un contenedor con el tamaño total (el scroll no cambia de
  // largo). Una tabla por mosaico porque agregar filas a UNA tabla obliga a
  // re-maquetarla entera; todas toman los anchos de las variables CSS
  // (--col-N), y placeTile las recoloca si una columna cambia de ancho.
  //
  // Para que nunca se vea un tramo en blanco:
  //   - lo que toca la vista se monta en el mismo evento de scroll, antes
  //     de pintar;
  //   - el margen (dos pantallas en vertical, una en horizontal) se completa
  //     en los frames siguientes, un mosaico por frame;
  //   - solo se desmonta lo que queda lejos (cuatro pantallas en vertical,
  //     tres en horizontal): el scroll normal nunca monta ni desmonta en el
  //     borde de la vista;
  //   - el mosaico con el foco o en edicion no se desmonta (Ctrl+C/V siguen
  //     llegando al grid).
  let bodyEl = $state<HTMLDivElement>();

  const columnWidthVars = $derived(
    [`--table-width:${tableWidth}px`, ...columnWidths.map((width, index) => `--col-${index}:${width}px`)].join(";"),
  );

  function batchHtml(from: number, to: number, fromCol: number, toCol: number, className: string): string {
    let cols = "";
    for (let index = fromCol; index < toCol; index++) cols += `<col style="width:var(--col-${index})">`;
    return (
      `<table class="${className}"><colgroup>${cols}</colgroup>` +
      `<tbody data-first-row="${from}" data-first-col="${fromCol}">${rowsHtml(from, to, fromCol, toCol)}</tbody></table>`
    );
  }

  // Tramo -> grupo de columnas -> su <table> (un "mosaico"). mountedChunks:
  // los tramos con algun mosaico montado, en orden, para la columna # (que
  // los dibuja Svelte).
  let mountedTiles = new Map<number, Map<number, HTMLTableElement>>();
  let mountedChunks = $state.raw<number[]>([]);
  let viewportHeight = 0;
  let viewportWidth = 0;
  let fillFrame: number | null = null;

  const bodyHeight = $derived(visualRow(rows.length) * rowHeight);

  function chunkTop(chunk: number): number {
    return visualRow(chunk * CHUNK_ROWS) * rowHeight;
  }

  function chunkRowIndexes(chunk: number): number[] {
    const from = chunk * CHUNK_ROWS;
    const to = Math.min(rows.length, from + CHUNK_ROWS);
    return Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
  }

  function groupColumns(group: number): { from: number; to: number } {
    const from = group * GROUP_COLS;
    return { from, to: Math.min(columns.length, from + GROUP_COLS) };
  }

  // Posicion y ancho del mosaico: su tramo en vertical, su grupo en
  // horizontal (los anchos de columna pueden cambiar con el mouse).
  function placeTile(table: HTMLTableElement, chunk: number, group: number) {
    const { from, to } = groupColumns(group);
    const left = columnLefts[from] ?? 0;
    const right = (columnLefts[to - 1] ?? 0) + (columnWidths[to - 1] ?? 0);
    table.style.top = `${chunkTop(chunk)}px`;
    table.style.left = `${left}px`;
    table.style.width = `${Math.max(0, right - left)}px`;
  }

  function isMounted(chunk: number, group: number): boolean {
    return mountedTiles.get(chunk)?.has(group) ?? false;
  }

  function mountTile(chunk: number, group: number) {
    const container = bodyEl;
    if (!container || isMounted(chunk, group)) return;
    const from = chunk * CHUNK_ROWS;
    const to = Math.min(rows.length, from + CHUNK_ROWS);
    const cols = groupColumns(group);
    if (from >= to || cols.from >= cols.to) return;
    const template = document.createElement("template");
    template.innerHTML = batchHtml(from, to, cols.from, cols.to, `body-batch body-chunk g${group}`);
    const table = template.content.firstElementChild as HTMLTableElement;
    placeTile(table, chunk, group);
    // En orden en el DOM (tramo, luego grupo): Tab recorre de arriba hacia
    // abajo.
    const order = (c: number, g: number) => c * 65536 + g;
    let next: HTMLTableElement | null = null;
    let nextOrder = Infinity;
    for (const [otherChunk, tiles] of mountedTiles) {
      for (const [otherGroup, element] of tiles) {
        const value = order(otherChunk, otherGroup);
        if (value > order(chunk, group) && value < nextOrder) {
          nextOrder = value;
          next = element;
        }
      }
    }
    container.insertBefore(table, next);
    let tiles = mountedTiles.get(chunk);
    if (!tiles) mountedTiles.set(chunk, (tiles = new Map()));
    tiles.set(group, table);
    patchTile(chunk, group);
  }

  function unmountTile(chunk: number, group: number) {
    const tiles = mountedTiles.get(chunk);
    const table = tiles?.get(group);
    if (!tiles || !table) return;
    table.remove();
    tiles.delete(group);
    if (tiles.size === 0) mountedTiles.delete(chunk);
    // Lo parchado en celdas/filas que ya no estan: al volver a montar el
    // mosaico se parcha de nuevo desde los cambios pendientes.
    for (const td of findPatched) if (table.contains(td)) findPatched.delete(td);
    for (const tr of hiddenPatched) if (table.contains(tr)) hiddenPatched.delete(tr);
  }

  // Cambios pendientes, busqueda y filas ocultas sobre un mosaico recien
  // montado (el resto ya los tiene).
  function patchTile(chunk: number, group: number) {
    const table = mountedTiles.get(chunk)?.get(group);
    const body = table?.tBodies[0];
    if (!body) return;
    const from = chunk * CHUNK_ROWS;
    const to = Math.min(rows.length, from + CHUNK_ROWS);
    const cols = groupColumns(group);
    for (let row = from; row < to; row++) {
      const tr = body.rows[row - from];
      if (!tr) continue;
      const updates = edits.updates.get(row);
      if (updates) {
        for (const [col, value] of updates) {
          if (col < cols.from || col >= cols.to) continue;
          const td = tr.cells[col - cols.from];
          if (!td) continue;
          paintCell(td, value, col, true);
          patchedCells.set(`${row}:${col}`, { row, col });
        }
      }
      if (edits.deleted.has(row)) {
        tr.classList.add("row-deleted");
        patchedRows.add(row);
      }
      if (hiddenRows?.has(row)) {
        tr.classList.add("find-hidden");
        hiddenPatched.add(tr);
      }
    }
    if (findMatches.length === 0) return;
    const current = findMatches[findCurrent];
    for (const match of findMatches) {
      if (match.row < from || match.row >= to || match.col < cols.from || match.col >= cols.to) continue;
      const td = body.rows[match.row - from]?.cells[match.col - cols.from];
      if (!td) continue;
      td.classList.add("find-match");
      td.classList.toggle("find-current", match === current);
      findPatched.add(td);
    }
  }

  // Mosaicos que no se desmontan: el de la celda con el foco y el de la
  // celda en edicion.
  function pinnedTiles(): Set<number> {
    const pinned = new Set<number>();
    const key = (row: number, col: number) => Math.floor(row / CHUNK_ROWS) * 65536 + Math.floor(col / GROUP_COLS);
    const active = document.activeElement;
    const tbody = active instanceof Element && bodyEl?.contains(active) ? active.closest("tbody") : null;
    if (tbody) pinned.add(key(Number(tbody.dataset.firstRow ?? 0), Number(tbody.dataset.firstCol ?? 0)));
    if (editing && editing.row < rows.length) pinned.add(key(editing.row, editing.col));
    return pinned;
  }

  function currentWindow(): { rows: ChunkWindow; groups: ChunkWindow } | null {
    const el = viewportEl;
    if (!el) return null;
    const height = Math.max(0, (viewportHeight || el.clientHeight) - headerHeight);
    const screen = Math.max(height, rowHeight * CHUNK_ROWS);
    const rowRange = chunkWindow({
      top: el.scrollTop,
      height,
      rowHeight,
      rowCount: rows.length,
      hiddenBefore,
      margin: screen * 2,
      keep: screen * 4,
    });
    // En horizontal: lo visible a la derecha de la columna # (sticky).
    const width = Math.max(0, (viewportWidth || el.clientWidth) - rowNumberWidth);
    const groupRange = groupWindow({
      left: el.scrollLeft,
      width,
      lefts: columnLefts,
      widths: columnWidths,
      margin: width,
      keep: width * 3,
    });
    return rowRange && groupRange ? { rows: rowRange, groups: groupRange } : null;
  }

  function publishMounted() {
    const list = [...mountedTiles.keys()].sort((a, b) => a - b);
    if (list.length !== mountedChunks.length || list.some((chunk, index) => chunk !== mountedChunks[index])) {
      mountedChunks = list;
    }
  }

  // Monta lo visible ya y agenda el margen. Se llama en cada evento de
  // scroll: si nada cambia (lo normal), no toca el DOM.
  function syncChunks() {
    if (!bodyEl) return;
    const range = currentWindow();
    const pinned = pinnedTiles();
    for (const [chunk, tiles] of [...mountedTiles]) {
      for (const group of [...tiles.keys()]) {
        const far =
          !range ||
          chunk < range.rows.kept.from ||
          chunk > range.rows.kept.to ||
          group < range.groups.kept.from ||
          group > range.groups.kept.to;
        if (far && !pinned.has(chunk * 65536 + group)) unmountTile(chunk, group);
      }
    }
    if (range) {
      for (let chunk = range.rows.visible.from; chunk <= range.rows.visible.to; chunk++) {
        for (let group = range.groups.visible.from; group <= range.groups.visible.to; group++) mountTile(chunk, group);
      }
    }
    publishMounted();
    scheduleFill();
  }

  // El margen, un mosaico por frame, empezando por el mas cercano a la vista.
  function scheduleFill() {
    if (fillFrame !== null) return;
    const range = currentWindow();
    if (!range || nextMissing(range) === null) return;
    fillFrame = requestAnimationFrame(() => {
      fillFrame = null;
      const current = currentWindow();
      const tile = current ? nextMissing(current) : null;
      if (tile === null) return;
      mountTile(tile.chunk, tile.group);
      publishMounted();
      scheduleFill();
    });
  }

  // Primero todo el ancho visible de los tramos mas cercanos, luego el
  // margen horizontal.
  function nextMissing(range: { rows: ChunkWindow; groups: ChunkWindow }): { chunk: number; group: number } | null {
    const missingIn = (chunk: number, groups: { from: number; to: number }) => {
      for (let group = groups.from; group <= groups.to; group++) if (!isMounted(chunk, group)) return group;
      return null;
    };
    for (const groups of [range.groups.visible, range.groups.wanted]) {
      const { visible, wanted } = range.rows;
      for (let distance = 0; ; distance++) {
        const below = visible.to + distance;
        const above = visible.from - distance;
        if (below > wanted.to && above < wanted.from) break;
        if (below <= wanted.to) {
          const group = missingIn(below, groups);
          if (group !== null) return { chunk: below, group };
        }
        if (above >= wanted.from) {
          const group = missingIn(above, groups);
          if (group !== null) return { chunk: above, group };
        }
      }
    }
    return null;
  }

  function cancelFill() {
    if (fillFrame !== null) {
      cancelAnimationFrame(fillFrame);
      fillFrame = null;
    }
  }

  // Resultado nuevo: el DOM anterior se tira entero.
  function resetChunks() {
    cancelFill();
    if (bodyEl) bodyEl.textContent = "";
    mountedTiles = new Map();
    // DOM nuevo: nada de lo parchado sigue ahi.
    patchedCells = new Map();
    patchedRows = new Set();
    findPatched = new Set();
    hiddenPatched = new Set();
    syncChunks();
  }

  // Otro alto de fila, filas ocultas distintas u otros anchos de columna
  // mueven cada mosaico.
  function repositionChunks() {
    for (const [chunk, tiles] of mountedTiles) {
      for (const [group, table] of tiles) placeTile(table, chunk, group);
    }
  }


  $effect(() => {
    function onGlobalPointerUp() {
      isDragSelecting = false;
    }
    window.addEventListener("pointerup", onGlobalPointerUp);
    return () => window.removeEventListener("pointerup", onGlobalPointerUp);
  });

  // --- Scrollbars a medida -------------------------------------------
  // El scroll real (rueda, trackpad, flechas) sigue siendo el nativo del
  // div con overflow:auto; solo se oculta su indicador visual y se dibujan
  // estos dos "thumbs" encima, acotados para que el vertical empiece
  // DESPUES del header y el horizontal DESPUES de la columna # — un
  // scrollbar nativo no puede excluir esas zonas de su carril, porque este
  // siempre refleja el alto/ancho TOTAL del contenido scrolleable (header
  // y columna de numeros incluidos), sean sticky o no.
  let viewportEl = $state<HTMLDivElement>();
  let cornerEl = $state<HTMLDivElement>();

  let headerHeight = $state(0);
  let rowNumberWidth = $state(0);
  let vThumb = $state({ visible: false, top: 0, height: 0 });
  let hThumb = $state({ visible: false, left: 0, width: 0 });

  const MIN_THUMB = 24;
  // Alto/ancho reservado en la esquina para que el thumb vertical y el
  // horizontal nunca se toquen entre si (como el "corner" de un scrollbar
  // nativo) — sin esto, cuando ambos hacen falta, uno termina justo donde
  // empieza el otro y se ven chocar.
  const SCROLLBAR_GUTTER = 12;

  // Solo se llama al cambiar el resultado o el tamaño del panel, nunca
  // durante el scroll.
  function measureFixedRegions() {
    headerHeight = cornerEl?.getBoundingClientRect().height ?? 0;
    rowNumberWidth = cornerEl?.getBoundingClientRect().width ?? 0;
    viewportHeight = viewportEl?.clientHeight ?? 0;
    viewportWidth = viewportEl?.clientWidth ?? 0;
    // Una fila oculta (Filtrar filas) mide 0: no sirve para medir.
    const firstBodyRow = bodyEl?.querySelector("tr:not(.find-hidden)");
    const height = firstBodyRow?.getBoundingClientRect().height ?? 0;
    if (height > 0) rowHeight = height;
  }

  function getTracks(el: HTMLDivElement) {
    const needsV = el.scrollHeight > el.clientHeight;
    const needsH = el.scrollWidth > el.clientWidth;
    return {
      needsV,
      needsH,
      trackHeight: el.clientHeight - headerHeight - (needsH ? SCROLLBAR_GUTTER : 0),
      trackWidth: el.clientWidth - rowNumberWidth - (needsV ? SCROLLBAR_GUTTER : 0),
    };
  }

  function updateThumbs() {
    const el = viewportEl;
    if (!el) return;
    const { needsV, needsH, trackHeight, trackWidth } = getTracks(el);

    let nextVThumb: typeof vThumb;
    if (needsV && trackHeight > 0) {
      const thumbHeight = Math.max(MIN_THUMB, (el.clientHeight / el.scrollHeight) * trackHeight);
      const maxScroll = el.scrollHeight - el.clientHeight;
      const progress = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
      nextVThumb = { visible: true, height: thumbHeight, top: headerHeight + (trackHeight - thumbHeight) * progress };
    } else {
      nextVThumb = { visible: false, top: 0, height: 0 };
    }
    if (
      nextVThumb.visible !== vThumb.visible ||
      nextVThumb.top !== vThumb.top ||
      nextVThumb.height !== vThumb.height
    ) {
      vThumb = nextVThumb;
    }

    let nextHThumb: typeof hThumb;
    if (needsH && trackWidth > 0) {
      const thumbWidth = Math.max(MIN_THUMB, (el.clientWidth / el.scrollWidth) * trackWidth);
      const maxScroll = el.scrollWidth - el.clientWidth;
      const progress = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
      nextHThumb = { visible: true, width: thumbWidth, left: rowNumberWidth + (trackWidth - thumbWidth) * progress };
    } else {
      nextHThumb = { visible: false, left: 0, width: 0 };
    }
    if (
      nextHThumb.visible !== hThumb.visible ||
      nextHThumb.left !== hThumb.left ||
      nextHThumb.width !== hThumb.width
    ) {
      hThumb = nextHThumb;
    }
  }

  let thumbAnimationFrame: number | null = null;

  function scheduleThumbUpdate() {
    if (thumbAnimationFrame !== null) return;
    thumbAnimationFrame = requestAnimationFrame(() => {
      thumbAnimationFrame = null;
      updateThumbs();
    });
  }

  function onViewportScroll() {
    // Los eventos nativos de scroll pueden llegar varias veces dentro del
    // mismo frame. Agruparlos evita repetir lecturas de layout y escrituras
    // reactivas que no podrian llegar a pintarse entre un evento y el otro.
    // Al scrollear se actualizan los dos thumbs y, solo si la vista llega a
    // un tramo sin montar, el cuerpo (en este mismo evento, antes de pintar).
    syncChunks();
    scheduleThumbUpdate();
    if (problemTooltipCell) {
      hideTooltipFor(problemTooltipCell);
      problemTooltipCell = null;
    }
  }

  let resultLayoutGeneration = 0;

  // Filas/columnas del ultimo render: volver arriba y limpiar la seleccion
  // solo tiene sentido con un resultado NUEVO. Si el efecto corre por
  // cualquier otra razon, no se toca el scroll ni la seleccion del usuario.
  let renderedRows: QueryRow[] | null = null;
  let renderedColumns: QueryColumn[] | null = null;

  $effect(() => {
    columns;
    rows;
    const isNewResult = untrack(() => rows !== renderedRows || columns !== renderedColumns);
    const hadRows = renderedRows !== null;
    renderedRows = rows;
    renderedColumns = columns;
    if (!isNewResult && bodyEl?.firstChild) return;
    // Mismas columnas que antes (ordenar, filtrar, paginar): se fijan los
    // anchos y el cuerpo nuevo entra con un fundido corto, sin saltos.
    // Columnas nuevas: se congelan sus anchos naturales para lo que siga.
    const sameColumns = untrack(() => keptWidths?.signature === columnSignature);
    untrack(() => {
      if (!sameColumns) keptWidths = { signature: columnSignature, widths: naturalColumnWidths };
    });
    if (hadRows && sameColumns && bodyEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const body = bodyEl;
      body.classList.remove("refreshing");
      void body.offsetWidth;
      body.classList.add("refreshing");
    }
    const generation = ++resultLayoutGeneration;
    // Nueva consulta ejecutada: una seleccion de la tabla anterior (p.ej.
    // una columna entera, con endRow = ultima fila de ESE resultado) ya no
    // tiene sentido con las filas/columnas nuevas. Sin este reset quedaba
    // un rectangulo "fantasma" del tamaño de la seleccion vieja flotando
    // debajo de un resultado nuevo con menos filas.
    selection = null;
    extraSelections = [];
    isDragSelecting = false;
    // Pagina nueva: se arranca desde la primera fila; el scroll horizontal
    // se conserva (suelen ser las mismas columnas).
    // untrack: leer viewportEl no debe volver a disparar este efecto (que
    // re-renderiza el cuerpo) cuando el bind:this se resuelve.
    untrack(() => {
      if (viewportEl) viewportEl.scrollTop = 0;
    });

    // Los anchos ya vienen calculados (naturalWidths); solo falta medir
    // header/filas/scrollbars una vez que el DOM nuevo esta puesto.
    // untrack: el render solo debe depender de columns/rows (y de que
    // bodyEl exista). Adentro se leen los cambios pendientes para pintarlos
    // (applyEditsToDom); sin untrack, cada edicion o fila nueva volvia a
    // generar el cuerpo entero — parpadeo en blanco y seleccion perdida.
    if (bodyEl) untrack(resetChunks);
    void tick().then(() => {
      if (generation !== resultLayoutGeneration) return;
      measureFixedRegions();
      // Ya con el alto de fila y de la vista medidos (el efecto de abajo
      // recoloca si cambio el alto).
      syncChunks();
      updateThumbs();
    });
  });

  $effect(() => {
    rowHeight;
    hiddenBefore;
    columnLefts;
    untrack(() => {
      repositionChunks();
      syncChunks();
    });
  });

  // Agregar o quitar filas nuevas cambia el alto del contenido sin cambiar
  // el del viewport (el ResizeObserver no se entera): se recalculan los
  // thumbs a mano.
  $effect(() => {
    edits.inserted.length;
    untrack(() => void tick().then(updateThumbs));
  });

  // El splitter editor/resultado y el tamaño de ventana cambian el alto y
  // ancho disponibles sin que columns/rows cambien; ResizeObserver los
  // captura para que los thumbs no queden con una medida vieja.
  $effect(() => {
    if (!viewportEl) return;
    const observer = new ResizeObserver(() => {
      measureFixedRegions();
      // Una vista mas alta puede necesitar mas tramos.
      syncChunks();
      scheduleThumbUpdate();
    });
    observer.observe(viewportEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    return () => {
      resultLayoutGeneration += 1;
      cancelFill();
      if (thumbAnimationFrame !== null) {
        cancelAnimationFrame(thumbAnimationFrame);
        thumbAnimationFrame = null;
      }
    };
  });

  function dragVertical(event: PointerEvent) {
    const el = viewportEl;
    if (!el) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startY = event.clientY;
    const startScrollTop = el.scrollTop;
    const { trackHeight } = getTracks(el);
    const range = trackHeight - vThumb.height;
    const maxScroll = el.scrollHeight - el.clientHeight;

    function onMove(moveEvent: PointerEvent) {
      const deltaScroll = range > 0 ? ((moveEvent.clientY - startY) / range) * maxScroll : 0;
      el!.scrollTop = Math.min(maxScroll, Math.max(0, startScrollTop + deltaScroll));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function dragHorizontal(event: PointerEvent) {
    const el = viewportEl;
    if (!el) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startScrollLeft = el.scrollLeft;
    const { trackWidth } = getTracks(el);
    const range = trackWidth - hThumb.width;
    const maxScroll = el.scrollWidth - el.clientWidth;

    function onMove(moveEvent: PointerEvent) {
      const deltaScroll = range > 0 ? ((moveEvent.clientX - startX) / range) * maxScroll : 0;
      el!.scrollLeft = Math.min(maxScroll, Math.max(0, startScrollLeft + deltaScroll));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
</script>

{#if clippedColumnsSelector}
  {@html `<style>${clippedColumnsSelector}{overflow:hidden;text-overflow:ellipsis}</style>`}
{/if}

<!-- La seleccion del grid es la de celdas (overlay); la seleccion de texto
     nativa se bloquea en su origen (selectstart) para que nunca aparezcan
     las dos a la vez. Un solo listener para todo el grid. -->
<div
  class="data-grid"
  role="grid"
  aria-label={$t("grid.label")}
  tabindex="-1"
  bind:this={gridEl}
  use:settleTransitions
  onselectstart={preventNativeSelection}
  onkeydown={onGridKeydown}
>
  <div
    class="grid-viewport"
    id={viewportId}
    bind:this={viewportEl}
    onscroll={onViewportScroll}
    style={`right:${vThumb.visible ? SCROLLBAR_GUTTER : 0}px; bottom:${hThumb.visible ? SCROLLBAR_GUTTER : 0}px;`}
  >
    <div class="grid-canvas" style:--gutter-width={gutterWidth}>
      {#each effects as effect (effect.id)}
        <div
          class={`grid-effect ${effect.kind}`}
          aria-hidden="true"
          style={`top:${effect.top}px; left:${effect.left}px; width:${effect.width}px; height:${effect.height}px;`}
          onanimationend={() => removeEffect(effect.id)}
        ></div>
      {/each}
      {#each curtains as curtain, index (index)}
        <div
          class="row-curtain"
          aria-hidden="true"
          style={`top:${curtain.top}px; left:${curtain.left}px; width:${curtain.width}px; height:${curtain.height}px;`}
        ></div>
      {/each}
      <!-- Esquina: hermana (no hija) del header para no anidar un sticky
           dentro de otro; el margin-bottom negativo la superpone al hueco
           que .grid-header-spacer deja libre a la izquierda del header. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="grid-corner"
        bind:this={cornerEl}
        role="button"
        tabindex="-1"
        aria-label={$t("grid.selectAll")}
        onclick={toggleSelectAll}
      ></div>

      <div class="grid-header">
        <div class="grid-header-spacer" aria-hidden="true"></div>
        <table
          class:widths-locked={widthsLocked}
          style:width={widthsLocked ? `${tableWidth}px` : undefined}
        >
          {#if widthsLocked}
            <colgroup>
              {#each columnWidths as width, index (index)}
                <col style:width={`${width}px`} />
              {/each}
            </colgroup>
          {/if}
          <thead>
            <tr>
              {#each columns as column, columnIndex (columnIndex)}
                {@const info = catalogInfoFor(column.name)}
                <th
                  scope="col"
                  class="column-header"
                  onclick={(event) => selectColumn(columnIndex, event)}
                  onmouseenter={(event) => showColumnTooltip(event, columnIndex)}
                  onmouseleave={hideColumnTooltip}
                  onfocusin={(event) => showColumnTooltip(event, columnIndex)}
                  onfocusout={hideColumnTooltip}
                >
                  <span class="column-header-content">
                    {#if info?.isPrimaryKey}
                      <Key size={12} class="column-type-icon pk" aria-hidden="true" />
                    {:else if info?.isForeignKey}
                      <Key size={12} class="column-type-icon fk" aria-hidden="true" />
                    {:else}
                      <Columns3 size={12} class="column-type-icon" aria-hidden="true" />
                    {/if}
                    <span class="column-header-label">{column.name}</span>
                    {#if sortable}
                      {@const sortIndex = sort.findIndex((key) => key.column === columnIndex)}
                      {@const active = sortIndex >= 0 ? sort[sortIndex] : null}
                      <button
                        type="button"
                        class="sort-button"
                        class:active={active !== null}
                        aria-label={active
                          ? $t(active.descending ? "grid.sort.descendingLabel" : "grid.sort.ascendingLabel")
                          : $t("grid.sort.by", { column: column.name })}
                        use:tooltip={active
                          ? $t(active.descending ? "grid.sort.descendingTitle" : "grid.sort.ascendingTitle")
                          : $t("grid.sort.title")}
                        onclick={(event) => {
                          event.stopPropagation();
                          onsort(columnIndex, event.shiftKey);
                        }}
                      >
                        {#if active?.descending}
                          <ArrowDown size={12} aria-hidden="true" />
                        {:else if active}
                          <ArrowUp size={12} aria-hidden="true" />
                        {:else}
                          <ChevronsUpDown size={12} aria-hidden="true" />
                        {/if}
                        {#if active && sort.length > 1}
                          <span class="sort-priority">{sortIndex + 1}</span>
                        {/if}
                      </button>
                    {/if}
                  </span>
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                  <div
                    class="col-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    tabindex="-1"
                    onpointerdown={(event) => beginColumnResize(event, columnIndex)}
                    onclick={(event) => event.stopPropagation()}
                  ></div>
                </th>
              {/each}
            </tr>
          </thead>
        </table>
      </div>

      <div class="grid-body">
        <div class="row-gutter">
          <!-- Los mismos tramos que el cuerpo, en las mismas posiciones. -->
          <div class="gutter-rows" style:height={`${bodyHeight}px`}>
            {#each mountedChunks as chunk (chunk)}
              <div class="gutter-chunk" style:top={`${chunkTop(chunk)}px`}>
                {#each chunkRowIndexes(chunk) as rowIndex (rowIndex)}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="row-number"
                    class:deleted={edits.deleted.has(rowIndex)}
                    class:find-hidden={hiddenRows?.has(rowIndex)}
                    onclick={(event) => selectRow(rowIndex, event)}
                  >
                    {rowOffset + rowIndex + 1}
                  </div>
                {/each}
              </div>
            {/each}
          </div>
          {#each edits.inserted as _, index (index)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="row-number inserted" onclick={(event) => selectRow(rows.length + index, event)}>
              {rowOffset + rows.length + index + 1}
            </div>
          {/each}
        </div>

        <div class="grid-body-table" style={columnWidthVars}>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="grid-body-rows chunked"
            style:height={`${bodyHeight}px`}
            bind:this={bodyEl}
            onpointerdown={onBodyPointerDown}
            onpointerover={onBodyPointerOver}
            onpointerout={onBodyPointerOut}
            onkeydown={onBodyKeydown}
            ondblclick={onBodyDoubleClick}
          ></div>
          {#if edits.inserted.length > 0}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="grid-body-rows"
              bind:this={insertedEl}
              onpointerdown={onBodyPointerDown}
              onpointerover={onBodyPointerOver}
              onkeydown={onBodyKeydown}
              ondblclick={onBodyDoubleClick}
            >
              <table class="body-batch">
                <colgroup>
                  {#each columns as _, index (index)}
                    <col style={`width:var(--col-${index})`} />
                  {/each}
                </colgroup>
                <tbody data-first-row={rows.length}>
                  {#each edits.inserted as values, index (index)}
                    <tr class="row-inserted">
                      {#each values as value, col (col)}
                        {@const problem = insertedProblem(value, col)}
                        <td
                          tabindex="0"
                          class:placeholder-value={value.kind !== "text"}
                          class:cell-invalid={problem !== null}
                          use:tooltip={problem}>{insertedLabel(value, col)}</td
                        >
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
          {#if editorRect}
            <div
              class="cell-editor"
              style={`top:${editorRect.top}px; left:${editorRect.left}px; width:${Math.max(editorRect.width, 120)}px; height:${editorRect.height}px;`}
            >
              <input
                aria-label={$t("grid.edit.label")}
                spellcheck="false"
                bind:this={editInput}
                bind:value={editValue}
                onkeydown={onEditorKeydown}
                onblur={() => finishEditing(true)}
              />
              {#if fillTargets}
                <span class="fill-count" use:tooltip={$t("grid.edit.fillCount", { count: fillCount })}
                  >×{fillCount}</span
                >
              {/if}
              <button
                type="button"
                class="null-chip"
                use:tooltip={$t("grid.edit.setNull")}
                onpointerdown={(event) => event.preventDefault()}
                onclick={setEditingNull}>NULL</button
              >
            </div>
          {/if}
          {#each selectionRects as rect (rect.key)}
            <div
              class="selection-overlay"
              style={`top:${rect.top}px; left:${rect.left}px; width:${rect.width}px; height:${rect.height}px;`}
            ></div>
          {/each}
        </div>
      </div>

      <!--
        Espacio para marcar "esto es todo" al llegar al final, como en
        DataGrip: un padding-bottom en .grid-viewport se veia bien en el CSS
        pero el navegador lo recorta del scrollHeight cuando el contenido
        desborda (bug conocido de "padding al final de un contenedor con
        scroll"). Un bloque real dentro del contenido si cuenta.
      -->
      <div class="end-spacer" aria-hidden="true"></div>
    </div>
  </div>
  {#if vThumb.visible}
    <div
      class="scrollbar-thumb vertical"
      role="scrollbar"
      aria-orientation="vertical"
      tabindex="-1"
      aria-controls={viewportId}
      aria-valuenow={Math.round((vThumb.top - headerHeight) || 0)}
      style={`top:${vThumb.top}px; height:${vThumb.height}px;`}
      onpointerdown={dragVertical}
    ></div>
  {/if}
  {#if hThumb.visible}
    <div
      class="scrollbar-thumb horizontal"
      role="scrollbar"
      aria-orientation="horizontal"
      tabindex="-1"
      aria-controls={viewportId}
      aria-valuenow={Math.round((hThumb.left - rowNumberWidth) || 0)}
      style={`left:${hThumb.left}px; width:${hThumb.width}px;`}
      onpointerdown={dragHorizontal}
    ></div>
  {/if}
</div>

{#if hoveredColumn}
  {@const column = columns[hoveredColumn.index]}
  {@const info = catalogInfoFor(column.name)}
  <div class="column-tooltip" style={`left:${hoveredColumn.x}px; top:${hoveredColumn.y}px;`} role="tooltip">
    <div class="column-tooltip-title">{column.name}: {column.type}</div>
    {#if info?.comment}
      <div class="column-tooltip-comment">{info.comment}</div>
    {/if}
  </div>
{/if}

<style>
  .data-grid {
    outline: none;
    --row-height: 1.75rem;
    position: relative;
    height: 100%;
    overflow: hidden;
    /* Con prefijo: WebKitGTK no siempre respeta user-select sin el. Puesto
       en el contenedor cubre header, columna # y celdas (incluidos los
       <span> del resaltado JSON). */
    -webkit-user-select: none;
    user-select: none;
  }

  /* Sin contain / will-change / translateZ a proposito (ni aca ni en los
     sticky): son pistas que cambian como WebKit arma las capas del scroll,
     y en esta estructura no hacen falta — son solo tres elementos sticky. */
  .grid-viewport {
    position: absolute;
    top: 0;
    left: 0;
    /* right/bottom vienen del style inline: cuando el thumb de ese eje
       hace falta, le ceden su ancho/alto para que la tabla nunca dibuje
       datos debajo del carril del scrollbar — cada uno con su propio
       camino, ninguno se superpone al otro. */
    overflow: auto;
    /* El indicador nativo se oculta (Firefox y WebKit); el scroll en si
       sigue siendo el real del navegador, con teclado/rueda/trackpad
       funcionando igual — solo se reemplaza el dibujo del scrollbar por
       los thumbs de abajo. */
    scrollbar-width: none;
  }

  .grid-viewport::-webkit-scrollbar {
    display: none;
  }

  /* Sin min-width:100% a proposito: con pocas columnas angostas, el
     contenido queda del ancho de sus columnas y el resto del panel en
     blanco — asi es como lo hacen DataGrip y compania. */
  .grid-canvas {
    position: relative;
    width: max-content;
    font-size: 0.8125rem;
  }

  /* Cortina de salida de filas nuevas (ver fadeOutInsertedRows): z-index 2
     para quedar sobre la columna # (1); el encabezado tambien es 2 pero va
     despues en el DOM, asi que la sigue tapando si la fila pasa por debajo
     al scrollear, y la esquina es 3. Se funde al color del fondo del grid. */
  .row-curtain {
    position: absolute;
    z-index: 2;
    pointer-events: none;
    background: var(--surface-content);
    animation: curtain-in 160ms ease-out forwards;
  }

  @keyframes curtain-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .grid-corner {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 3;
    width: var(--gutter-width);
    height: var(--row-height);
    margin-bottom: calc(-1 * var(--row-height));
    box-sizing: border-box;
    background: var(--surface-elevated);
    box-shadow:
      inset -1px 0 0 var(--border),
      inset 0 -1px 0 var(--border);
    cursor: pointer;
  }

  .grid-corner:hover {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-elevated));
  }

  .grid-header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    background: var(--surface-elevated);
  }

  .grid-header-spacer {
    flex: none;
    width: var(--gutter-width);
  }

  .grid-body {
    display: flex;
  }

  .row-gutter {
    position: sticky;
    left: 0;
    z-index: 1;
    flex: none;
    width: var(--gutter-width);
    background: var(--surface);
  }

  .gutter-rows {
    position: relative;
  }

  .gutter-chunk {
    position: absolute;
    left: 0;
    right: 0;
  }

  .row-number {
    box-sizing: border-box;
    height: var(--row-height);
    line-height: calc(var(--row-height) - 1px);
    border-bottom: 1px solid var(--border);
    box-shadow: inset -1px 0 0 var(--border);
    color: color-mix(in srgb, var(--text-secondary) 55%, transparent);
    text-align: center;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
  }

  .row-number:hover {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  .grid-body-table {
    position: relative;
    flex: none;
  }

  /* Un solo rectangulo por encima de la tabla en vez de clases/estilos
     por celda — ver el comentario de selectionRect en el script. z-index
     0 para quedar por debajo del header/columna # (sticky, z-index 1-3)
     cuando el scroll los deja tapando parte del rango; pointer-events
     none para que clicks/arrastres seguidos pasen a las celdas de abajo. */
  .selection-overlay {
    position: absolute;
    z-index: 0;
    pointer-events: none;
    box-sizing: border-box;
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border: 1px solid var(--accent);
  }

  .scrollbar-thumb {
    position: absolute;
    z-index: 4;
    background: var(--scrollbar-thumb);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
  }

  .scrollbar-thumb.vertical {
    right: 2px;
    width: 8px;
  }

  .scrollbar-thumb.horizontal {
    bottom: 2px;
    height: 8px;
  }

  table {
    border-collapse: separate;
    border-spacing: 0;
    width: max-content;
  }

  /* Los anchos vienen de colgroup y el style inline fija su suma: sin un
     ancho de tabla explicito, `fixed` puede seguir usando el algoritmo
     automatico. */
  table.widths-locked,
  .grid-body-table :global(table.body-batch) {
    table-layout: fixed;
  }

  /* Datos nuevos de la misma consulta (orden, filtro, pagina): fundido
     corto en vez de un cambio de golpe. */
  .grid-body-rows:global(.refreshing) {
    animation: body-refresh 170ms ease-out;
  }

  @keyframes body-refresh {
    from {
      opacity: 0.35;
    }
  }

  .grid-body-table :global(table.body-batch) {
    border-collapse: separate;
    border-spacing: 0;
    width: var(--table-width);
  }

  /* Cuerpo por mosaicos (ver mountTile): el contenedor tiene el alto y el
     ancho de todo (los mosaicos van en absoluto y no le dan tamaño). */
  .grid-body-rows.chunked {
    position: relative;
    width: var(--table-width);
  }

  .grid-body-table :global(table.body-chunk) {
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Las celdas del cuerpo se insertan como HTML (ver rowsHtml en el script) y no
     llevan la clase de alcance de Svelte: sus reglas van con :global, pero
     acotadas a .grid-body-table de este componente. */
  th,
  .grid-body-table :global(td) {
    box-sizing: border-box;
    padding: 0 var(--space-2);
    height: var(--row-height);
    border-right: 1px solid var(--grid-line);
    white-space: nowrap;
    text-align: left;
    /* Evita que arrastrar para seleccionar celdas dispare ademas la
       seleccion de texto nativa del navegador. */
    user-select: none;
  }

  /* overflow:hidden (o clip) SOLO donde hace falta. En WebKit cada elemento
     con overflow recortado recibe su propio RenderLayer: puesto en todos
     los td eran ~15.000 capas, y eso era lo que hacia el scroll pesado
     (medido en WebKitGTK 2.52: ~45ms por frame con la regla en cada td,
     17ms — 60fps — sin ella). Los th del header son pocos y siempre la
     necesitan; un td solo la necesita si su columna se achico por debajo
     del ancho de su contenido, y esa regla por columna la arma el script
     (ver clippedColumnsSelector). */
  th {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* El <th> ya no es sticky (lo es .grid-header entero), asi que puede
     tener su propio position:relative para .col-resize-handle. */
  /* display:flex directo en el <th> rompe la tabla (deja de comportarse
     como celda) — el flex va en un <span> interno. */
  .column-header {
    position: relative;
    cursor: pointer;
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font-weight: var(--font-weight-heading);
    box-shadow: inset 0 -1px 0 var(--border);
  }

  .column-header-content {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .column-header-label {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .column-header:hover {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-elevated));
  }

  /* Orden: tenue hasta pasar por el encabezado; activo, en acento. A la
     derecha de la celda, fuera del nombre. */
  .sort-button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 1px;
    margin-left: auto;
    padding: 2px 3px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    opacity: 0;
    cursor: pointer;
    transition:
      opacity var(--duration-fast) ease,
      background-color var(--duration-fast) ease,
      color var(--duration-fast) ease;
  }

  /* Sin transicion hasta el primer pintado (lib/settleTransitions.ts): si
     no, los botones de orden se ven un instante antes de ocultarse. */
  .data-grid:not([data-settled]) .sort-button {
    transition: none;
  }

  .column-header:hover .sort-button,
  .sort-button:focus-visible {
    opacity: 0.7;
  }

  .sort-button:hover {
    background: color-mix(in srgb, var(--text-primary) 10%, transparent);
    color: var(--text-primary);
    opacity: 1;
  }

  .sort-button.active {
    color: var(--accent);
    opacity: 1;
  }

  .sort-priority {
    font-size: 0.625rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .sort-button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .column-header :global(.column-type-icon) {
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  /* Mismo icono (Key) para PK y FK a proposito - la diferencia es solo el
     color, no la forma. Dorado para PK (la convencion mas reconocible del
     metaforo "llave"); el accent de la app para FK, para que se lea como
     "tambien es una clave, pero de otro tipo" sin confundirse con la PK. */
  .column-header :global(.column-type-icon.pk) {
    color: var(--key-primary);
  }

  .column-header :global(.column-type-icon.fk) {
    color: var(--accent);
  }

  .col-resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    z-index: 1;
    cursor: col-resize;
    touch-action: none;
  }

  .col-resize-handle:hover,
  .col-resize-handle:active {
    background: color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .grid-body-table :global(td) {
    border-bottom: 1px solid var(--grid-line);
    color: var(--text-primary);
    cursor: default;
    outline: none;
  }

  /* Pintar una sola superficie por fila evita repetir el fondo en cada td.
     Las celdas de datos son transparentes y dejan ver este fondo. */
  .grid-body-table :global(tr.zebra-odd) {
    background: color-mix(in srgb, var(--text-primary) 4%, transparent);
  }

  .grid-body-table :global(td:focus-visible) {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .end-spacer {
    height: 4rem;
  }

  /* Resaltado de celdas JSON (ver jsonHighlight.ts): los colores salen del
     tema del editor (--syntax-*, puestos por theme.ts); la puntuacion toma
     el color secundario de la celda. */
  .grid-body-table :global(td.json-value) {
    color: var(--text-secondary);
  }

  .grid-body-table :global(.j-key) {
    color: var(--syntax-key, var(--text-primary));
  }

  .grid-body-table :global(.j-str) {
    color: var(--syntax-string, var(--text-primary));
  }

  .grid-body-table :global(.j-num) {
    color: var(--syntax-number, var(--text-primary));
  }

  .grid-body-table :global(.j-lit) {
    color: var(--syntax-constant, var(--text-primary));
  }

  /* --- Busqueda (Ctrl+F) ------------------------------------------------
     Coincidencias con un tono calido suave y la actual mas intensa, con
     contorno: se distinguen de la seleccion (acento) y de los cambios. */
  .grid-body-table :global(td.find-match) {
    background: color-mix(in srgb, var(--warning) 26%, transparent);
  }

  .grid-body-table :global(td.find-current) {
    background: color-mix(in srgb, var(--warning) 55%, transparent);
    box-shadow: inset 0 0 0 1px var(--warning);
    color: var(--text-primary);
  }

  .grid-body-table :global(tr.find-hidden),
  .row-number.find-hidden {
    display: none;
  }

  /* --- Cambios pendientes --------------------------------------------- */
  /* Una celda editada (o de una fila nueva) puede traer un valor mas largo
     que el ancho de su columna: se recorta con elipsis en vez de invadir la
     celda vecina. Son pocas celdas, asi que el costo de overflow no pesa
     (ver la nota de rendimiento sobre overflow en los td). */
  .grid-body-table :global(td.cell-modified),
  .grid-body-table :global(tr.row-inserted td) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .grid-body-table :global(td.cell-modified) {
    background: color-mix(in srgb, var(--accent) 24%, transparent);
  }

  /* Un cambio que no encaja en su columna (ver paintCell): rojo, como una
     fila a eliminar, con un borde para leerse aunque la fila sea nueva. */
  .grid-body-table :global(td.cell-invalid) {
    background: color-mix(in srgb, var(--danger-solid) 24%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--danger-solid) 70%, transparent);
  }

  .grid-body-table :global(tr.row-inserted) {
    background: color-mix(in srgb, var(--success) 20%, transparent);
  }

  .grid-body-table :global(td.placeholder-value) {
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Fila marcada para eliminar: rojo tenue de fondo (el mismo rojo de los
     botones destructivos, --delete-red) y el texto atenuado y tachado en
     rojo; el acento a la izquierda la marca de un vistazo al scrollear. */
  .data-grid {
    --delete-red: var(--danger-solid);
  }

  .grid-body-table :global(tr.row-deleted) {
    background: color-mix(in srgb, var(--delete-red) 17%, transparent);
  }

  .grid-body-table :global(tr.row-deleted td) {
    color: color-mix(in srgb, var(--text-primary) 55%, transparent);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--delete-red) 75%, transparent);
    text-decoration-thickness: 1px;
  }

  .grid-body-table :global(tr.row-deleted td.cell-modified) {
    background: transparent;
  }

  .row-number.deleted {
    background: color-mix(in srgb, var(--delete-red) 22%, var(--surface));
    box-shadow:
      inset 2px 0 0 var(--delete-red),
      inset -1px 0 0 var(--border);
    color: var(--delete-red);
  }

  /* Capa de efectos (ver addEffect): sobre el cuerpo y la columna # (z 2,
     como la cortina), bajo el encabezado y la esquina. Nunca interceptan el
     mouse. Cada uno se retira solo al terminar su animacion. */
  .grid-effect {
    position: absolute;
    z-index: 2;
    pointer-events: none;
  }

  .grid-effect.appear {
    background: var(--surface-content);
    animation: effect-appear 220ms ease-out forwards;
  }

  @keyframes effect-appear {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .grid-effect.flash {
    animation: effect-flash 650ms ease-out forwards;
  }

  @keyframes effect-flash {
    from {
      background: color-mix(in srgb, var(--accent) 34%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 75%, transparent);
    }
    to {
      background: transparent;
      box-shadow: inset 0 0 0 1px transparent;
    }
  }

  .grid-effect.commit {
    animation: effect-commit 480ms ease-out forwards;
  }

  @keyframes effect-commit {
    from {
      background: color-mix(in srgb, var(--accent) 40%, transparent);
    }
    to {
      background: transparent;
    }
  }

  .grid-effect.delete {
    animation: effect-delete 420ms ease-out forwards;
  }

  .grid-effect.copy {
    animation: effect-copy 520ms ease-out forwards;
  }

  @keyframes effect-copy {
    from {
      box-shadow: inset 0 0 0 2px var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    to {
      box-shadow: inset 0 0 0 2px transparent;
      background: transparent;
    }
  }

  @keyframes effect-delete {
    from {
      background: color-mix(in srgb, var(--delete-red) 34%, transparent);
    }
    to {
      background: transparent;
    }
  }

  /* El editor entra con un fundido y una escala apenas perceptibles. */
  .cell-editor {
    animation: editor-in 110ms ease-out;
  }

  @keyframes editor-in {
    from {
      opacity: 0;
      transform: scale(0.985);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cell-editor {
      animation: none;
    }
  }

  .row-number.inserted {
    background: color-mix(in srgb, var(--success) 20%, var(--surface));
    color: var(--text-primary);
  }

  /* Editor en la celda: mismo alto que la fila, borde de acento, y un chip
     "NULL" a la derecha para vaciar la celda sin salir del teclado. */
  .cell-editor {
    position: absolute;
    z-index: 1;
    display: flex;
    box-sizing: border-box;
    align-items: center;
    border: 2px solid var(--accent);
    border-radius: 2px;
    background: var(--surface-content);
    box-shadow: var(--shadow-elevated);
  }

  .cell-editor input {
    min-width: 0;
    height: 100%;
    flex: 1;
    padding: 0 calc(var(--space-2) - 2px);
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    -webkit-user-select: text;
    user-select: text;
  }

  /* Cuantas celdas reciben lo que se escribe (varias seleccionadas). */
  .fill-count {
    flex-shrink: 0;
    margin-right: 4px;
    color: var(--text-secondary);
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
  }

  .null-chip {
    flex-shrink: 0;
    margin-right: 3px;
    padding: 0 5px;
    border: 0;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text-secondary) 18%, transparent);
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.6875rem;
    line-height: 1.4;
    cursor: pointer;
  }

  .null-chip:hover {
    background: color-mix(in srgb, var(--text-secondary) 30%, transparent);
    color: var(--text-primary);
  }

  .grid-body-table :global(td.null-value) {
    color: var(--text-secondary);
    font-style: italic;
  }

  /* position:fixed (no absolute dentro de .data-grid) a proposito: asi
     escapa del overflow/scroll de .grid-viewport sin importar que tan
     adentro del arbol este montado el componente. */
  .column-tooltip {
    position: fixed;
    z-index: 1000;
    max-width: 20rem;
    margin-top: 2px;
    padding: var(--space-2) var(--space-3);
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 0.75rem;
    box-shadow: var(--shadow-elevated);
    pointer-events: none;
    white-space: normal;
  }

  .column-tooltip-title {
    font-weight: var(--font-weight-heading);
  }

  .column-tooltip-comment {
    margin-top: var(--space-1);
    color: var(--text-secondary);
  }
</style>
