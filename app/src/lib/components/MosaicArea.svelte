<script lang="ts">
  import type { Snippet } from "svelte";
  import { X } from "@lucide/svelte";
  import { onePerFrame } from "$lib/onePerFrame";
  import { swallowNextClick } from "$lib/reorder";
  import { tooltip } from "$lib/tooltip";
  import {
    dividers,
    dropSide,
    leaves,
    place,
    rects,
    replace,
    setRatio,
    type Divider,
    type Mosaic,
    type Rect,
    type Side,
    WHOLE,
  } from "$lib/workspace/mosaic";

  // Un area en mosaico tipo i3 (workspace/mosaic.ts): las consolas del editor
  // y las pestañas del resultado. Cada hoja va con posicion absoluta en una
  // lista plana con clave por id, asi reacomodar el arbol no vuelve a montar
  // lo que hay dentro (el editor conserva cursor y deshacer; el grid, su
  // scroll). Con una sola hoja no hay barra ni bordes: se ve como siempre.
  //
  // Lo que va en cada hoja y su barra lo pone quien la usa (snippets); aca
  // esta la mecanica comun: divisores, arrastrar y soltar con su vista
  // previa, y quitar del mosaico.
  let {
    tree,
    focused,
    minSize,
    untileLabel,
    untileTooltip,
    label,
    onresize,
    onarrange,
    onfocus,
    onuntile,
    header,
    tile,
    children,
  }: {
    tree: Mosaic | null;
    // La hoja enfocada: su barra lleva el acento.
    focused: string | null;
    // Minimo en pixeles de cada hoja, a lo ancho (row) y a lo alto (column).
    minSize: { row: number; column: number };
    untileLabel: string;
    untileTooltip: string;
    // Nombre de una hoja (aria y lo que se arrastra).
    label: (id: string) => string;
    // Un divisor movido: el arbol con su nueva fraccion.
    onresize: (tree: Mosaic) => void;
    // Soltar lo arrastrado: el arbol nuevo y la hoja que queda enfocada.
    onarrange: (tree: Mosaic, focus: string) => void;
    onfocus: (id: string) => void;
    onuntile: (id: string) => void;
    // Icono y titulo de la barra de una hoja.
    header: Snippet<[string]>;
    tile: Snippet<[string]>;
    // Lo que flota encima del area (un selector).
    children?: Snippet;
  } = $props();

  let area = $state<HTMLElement>();

  const ids = $derived(leaves(tree));
  const tiled = $derived(ids.length > 1);
  const boxes = $derived(rects(tree));
  const splits = $derived(tiled ? dividers(tree) : []);

  // Pegado al borde exterior del area, se parte el area entera.
  const OUTER_EDGE_PX = 24;

  export function tileElement(id: string): HTMLElement | null {
    return area?.querySelector<HTMLElement>(`[data-tile-id="${CSS.escape(id)}"]`) ?? null;
  }

  // --- Divisores ---------------------------------------------------------
  function clampRatio(divider: Divider, ratio: number): number {
    const box = area?.getBoundingClientRect();
    if (!box) return ratio;
    const size = divider.axis === "row" ? divider.area.width * box.width : divider.area.height * box.height;
    const min = Math.min(0.5, minSize[divider.axis] / Math.max(1, size));
    return Math.min(1 - min, Math.max(min, ratio));
  }

  function startResize(event: PointerEvent, divider: Divider) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const box = area?.getBoundingClientRect();
    const live = onePerFrame((ratio: number) => {
      if (tree) onresize(setRatio(tree, divider.path, ratio));
    });

    function onMove(moveEvent: PointerEvent) {
      if (!box) return;
      const { area: part, axis } = divider;
      const ratio =
        axis === "row"
          ? ((moveEvent.clientX - box.left) / box.width - part.x) / part.width
          : ((moveEvent.clientY - box.top) / box.height - part.y) / part.height;
      live.set(clampRatio(divider, ratio));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      live.flush();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onDividerKeydown(event: KeyboardEvent, divider: Divider) {
    const back = divider.axis === "row" ? "ArrowLeft" : "ArrowUp";
    const forward = divider.axis === "row" ? "ArrowRight" : "ArrowDown";
    if (event.key !== back && event.key !== forward || !tree) return;
    event.preventDefault();
    onresize(setRatio(tree, divider.path, clampRatio(divider, divider.ratio + (event.key === forward ? 0.02 : -0.02))));
  }

  // --- Arrastrar y soltar ---------------------------------------------------
  // Desde una pestaña (al sacarla de su fila, reorder.ts: quien la usa llama
  // a beginDrag) o desde la barra de una hoja. Cada tercio junto a un borde
  // es ese lado y el medio toma su lugar (si ya estaba en otra, se
  // intercambian), como en los demas editores.
  let drag = $state<{ id: string; title: string; x: number; y: number; target: string | null; side: Side | "center" | null } | null>(null);

  function dropTarget(x: number, y: number): { target: string | null; side: Side | "center" | null } {
    const box = area?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return { target: null, side: null };
    if (tiled) {
      const edges: [Side, number][] = [
        ["left", x - box.left],
        ["right", box.right - x],
        ["top", y - box.top],
        ["bottom", box.bottom - y],
      ];
      const [side, distance] = edges.reduce((a, b) => (b[1] < a[1] ? b : a));
      if (distance < OUTER_EDGE_PX) return { target: WHOLE, side };
    }
    const fx = (x - box.left) / box.width;
    const fy = (y - box.top) / box.height;
    for (const [id, rect] of boxes) {
      if (fx < rect.x || fx > rect.x + rect.width || fy < rect.y || fy > rect.y + rect.height) continue;
      const wide = rect.width * box.width >= rect.height * box.height;
      return { target: id, side: dropSide((fx - rect.x) / rect.width, (fy - rect.y) / rect.height, wide) };
    }
    return { target: null, side: null };
  }

  // Como queda el arbol si se suelta ahi; null si no cambia nada.
  function dropResult(current: { id: string; target: string | null; side: Side | "center" | null }): Mosaic | null {
    if (!current.target || !current.side || current.target === current.id) return null;
    return current.side === "center"
      ? replace(tree, current.target, current.id)
      : place(tree, current.target, current.id, current.side);
  }

  // Lo que se resalta al arrastrar es donde quedaria de verdad: el
  // rectangulo de lo arrastrado en el arbol resultante. Mover una que ya se
  // ve libera su lugar (con dos apiladas, la de abajo a la derecha de la de
  // arriba ocupa toda la altura), y marcar solo la mitad del destino mentia.
  const preview = $derived.by((): Rect | null => {
    const next = drag ? dropResult(drag) : null;
    return next && drag ? (rects(next).get(drag.id) ?? null) : null;
  });

  export function beginDrag(id: string, start: PointerEvent): boolean {
    drag = { id, title: label(id), x: start.clientX, y: start.clientY, ...dropTarget(start.clientX, start.clientY) };

    function onMove(moveEvent: PointerEvent) {
      if (!drag) return;
      drag = { ...drag, x: moveEvent.clientX, y: moveEvent.clientY, ...dropTarget(moveEvent.clientX, moveEvent.clientY) };
    }

    function finish(apply: boolean) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      const current = drag;
      drag = null;
      swallowNextClick();
      const next = current && apply ? dropResult(current) : null;
      if (current && next) onarrange(next, current.id);
    }

    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    // Esc suelta sin cambiar nada.
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    return true;
  }

  // La barra de una hoja: un clic la enfoca; arrastrar mas de unos px la
  // mueve.
  function onHeaderPointerDown(event: PointerEvent, id: string) {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    event.preventDefault();
    onfocus(id);
    const startX = event.clientX;
    const startY = event.clientY;
    function onMove(moveEvent: PointerEvent) {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
      stop();
      beginDrag(id, moveEvent);
    }
    function stop() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  }

  const percent = (value: number) => `${value * 100}%`;
  const boxStyle = (rect: Rect) =>
    `left: ${percent(rect.x)}; top: ${percent(rect.y)}; width: ${percent(rect.width)}; height: ${percent(rect.height)}`;
</script>

<div class="mosaic" class:tiled bind:this={area}>
  {#each ids as id (id)}
    {@const box = boxes.get(id)}
    {#if box}
      <!-- Enfocar cualquier parte de la hoja la vuelve la enfocada; la hoja
           misma se enfoca si no tiene otra cosa (la Salida). -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="tile"
        class:focused={tiled && id === focused}
        class:edge-left={box.x > 0}
        class:edge-top={box.y > 0}
        data-tile-id={id}
        data-zone-piece={tiled ? "" : undefined}
        role={tiled ? "group" : undefined}
        tabindex={tiled ? -1 : undefined}
        aria-label={tiled ? label(id) : undefined}
        style={boxStyle(box)}
        onfocusin={() => onfocus(id)}
        onpointerdown={() => onfocus(id)}
      >
        {#if tiled}
          <div class="tile-header" onpointerdown={(event) => onHeaderPointerDown(event, id)}>
            {@render header(id)}
            <button
              type="button"
              class="tile-untile"
              aria-label={untileLabel}
              use:tooltip={untileTooltip}
              onclick={() => onuntile(id)}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        {/if}
        {@render tile(id)}
      </div>
    {/if}
  {/each}

  {#each splits as divider (divider.path)}
    {@const vertical = divider.axis === "row"}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="tile-divider"
      class:vertical
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(divider.ratio * 100)}
      aria-valuemin={10}
      aria-valuemax={90}
      tabindex="0"
      style={vertical
        ? `left: ${percent(divider.area.x + divider.area.width * divider.ratio)}; top: ${percent(divider.area.y)}; height: ${percent(divider.area.height)}`
        : `top: ${percent(divider.area.y + divider.area.height * divider.ratio)}; left: ${percent(divider.area.x)}; width: ${percent(divider.area.width)}`}
      onpointerdown={(event) => startResize(event, divider)}
      onkeydown={(event) => onDividerKeydown(event, divider)}
    ></div>
  {/each}

  {#if preview}
    <div class="tile-drop" style={boxStyle(preview)} aria-hidden="true"></div>
  {/if}

  {@render children?.()}
</div>

{#if drag}
  <div class="tile-ghost" style={`left: ${drag.x}px; top: ${drag.y}px`} aria-hidden="true">
    <span>{drag.title}</span>
  </div>
{/if}

<style>
  .mosaic {
    position: relative;
    min-width: 0;
    min-height: 0;
    flex: 1;
  }

  .tile {
    position: absolute;
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
  }

  .tile.edge-left {
    border-left: 1px solid var(--border);
  }

  .tile.edge-top {
    border-top: 1px solid var(--border);
  }

  /* Barra compacta de cada hoja: de donde se la arrastra y donde se ve cual
     tiene el foco. El icono y el titulo los pone quien usa el area. */
  .tile-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2);
    height: 1.375rem;
    padding: 0 var(--space-1) 0 var(--space-2);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    font-size: 0.6875rem;
    cursor: grab;
    user-select: none;
  }

  .tile.focused .tile-header {
    box-shadow: inset 0 2px 0 var(--accent);
    color: var(--text-primary);
  }

  .tile-header :global(svg) {
    flex-shrink: 0;
    opacity: 0.8;
  }

  .tile.focused .tile-header :global(svg) {
    color: var(--accent);
    opacity: 1;
  }

  .tile-header :global(.mosaic-title) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tile-header :global(.mosaic-dirty) {
    width: 0.375rem;
    height: 0.375rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--accent);
  }

  .tile-untile {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    margin-left: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  .tile-header:hover .tile-untile,
  .tile-untile:focus-visible {
    opacity: 1;
  }

  .tile-untile:hover {
    background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  }

  .tile-untile:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  /* Divisor entre hojas: franja de 6px para agarrar, sin pintar (la linea
     es el borde de la hoja); al pasar el mouse, el acento. */
  .tile-divider {
    position: absolute;
    z-index: 3;
    height: 6px;
    transform: translateY(-3px);
    cursor: row-resize;
    touch-action: none;
  }

  .tile-divider.vertical {
    width: 6px;
    height: auto;
    transform: translateX(-3px);
    cursor: col-resize;
  }

  .tile-divider:hover,
  .tile-divider:focus-visible {
    outline: none;
    background: linear-gradient(var(--accent), var(--accent)) center / 100% 1px no-repeat;
  }

  .tile-divider.vertical:hover,
  .tile-divider.vertical:focus-visible {
    background: linear-gradient(var(--accent), var(--accent)) center / 1px 100% no-repeat;
  }

  /* Donde caeria lo arrastrado al soltarlo. */
  .tile-drop {
    position: absolute;
    z-index: 4;
    box-sizing: border-box;
    border: 1px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    pointer-events: none;
    transition:
      left 90ms ease,
      top 90ms ease,
      width 90ms ease,
      height 90ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .tile-drop {
      transition: none;
    }
  }

  .tile-ghost {
    position: fixed;
    z-index: 100;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-elevated);
    color: var(--text-primary);
    font-size: 0.75rem;
    pointer-events: none;
    transform: translate(10px, 8px);
  }
</style>
