<script lang="ts">
  import type { Snippet } from "svelte";
  import { onePerFrame } from "$lib/onePerFrame";
  import { swallowNextClick } from "$lib/reorder";
  import { liftGhost, type Ghost, type Point } from "$lib/dragGhost";
  import {
    dividers,
    dropSide,
    leaves,
    place,
    rects,
    remove,
    replace,
    setRatio,
    type Divider,
    type Mosaic,
    type Rect,
    type Side,
    WHOLE,
  } from "$lib/workspace/mosaic";

  // Un area en mosaico tipo i3 (workspace/mosaic.ts): los grupos de
  // pestañas del editor y del resultado (workspace/tabGroups.ts). Cada hoja
  // va con posicion absoluta en una lista plana con clave por id, asi
  // reacomodar el arbol no vuelve a montar lo que hay dentro (el editor
  // conserva cursor y deshacer; el grid, su scroll). Con una sola hoja se ve
  // como siempre.
  //
  // Lo que va en cada hoja lo pone quien la usa (snippet `tile`); aca esta la
  // mecanica comun: divisores, y arrastrar y soltar con la vista previa del
  // lugar real. Sin barras por hoja (sumaban lineas horizontales): cada
  // grupo se nombra con su fila de carpetas.
  let {
    tree,
    focused,
    minSize,
    label,
    onresize,
    onarrange,
    onfocus,
    onmerge,
    stripHeight = 0,
    tile,
    children,
  }: {
    tree: Mosaic | null;
    // La hoja enfocada: su barra lleva el acento.
    focused: string | null;
    // Minimo en pixeles de cada hoja, a lo ancho (row) y a lo alto (column).
    minSize: { row: number; column: number };
    // Nombre de una hoja (para lectores de pantalla).
    label: (id: string) => string;
    // Un divisor movido: el arbol con su nueva fraccion.
    onresize: (tree: Mosaic) => void;
    // Soltar lo arrastrado: el arbol nuevo y la hoja que queda enfocada.
    onarrange: (tree: Mosaic, focus: string) => void;
    onfocus: (id: string) => void;
    // Soltar en el centro de una hoja algo que entra en ella (una pestaña en
    // un grupo del resultado; beginDrag con `merge`).
    onmerge?: (target: string, id: string) => void;
    // Alto de la fila de pestañas de cada hoja (los grupos del resultado):
    // soltar ahi la acopla a esa hoja, como una pestaña del navegador que se
    // suelta en la fila de otra ventana.
    stripHeight?: number;
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
  // a beginDrag). Lo tomado se despega y
  // sigue al puntero (dragGhost.ts, como en el navegador). Cada tercio junto
  // a un borde es ese lado y el medio toma su lugar (si ya estaba en otra, se
  // intercambian), como en los demas editores.
  // `source`/`grab`: el elemento tomado y donde se lo tomo. `vacate`: la hoja
  // que se queda sin nada si lo arrastrado sale de ella (un grupo con una
  // sola pestaña), y que no cuenta para el resultado. `merge`: el centro de
  // una hoja no la reemplaza, recibe lo arrastrado. `origin`: la hoja de
  // donde sale; entrar de nuevo en ella no hace nada.
  interface DragOptions {
    source?: HTMLElement;
    grab?: Point;
    vacate?: string;
    origin?: string;
    merge?: boolean;
  }

  let drag = $state<{
    id: string;
    x: number;
    y: number;
    target: string | null;
    side: Side | "center" | null;
    vacate: string | null;
    origin: string | null;
    merge: boolean;
  } | null>(null);
  let ghost: Ghost | null = null;

  function dropTarget(x: number, y: number, merge = false): { target: string | null; side: Side | "center" | null } {
    const box = area?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return { target: null, side: null };
    // Sobre la fila de pestañas de una hoja: entra en ella, antes que el
    // borde exterior (la fila de arriba toca el borde del area).
    if (merge && stripHeight > 0) {
      for (const [id, rect] of boxes) {
        const left = box.left + rect.x * box.width;
        const top = box.top + rect.y * box.height;
        if (x >= left && x <= left + rect.width * box.width && y >= top && y - top < stripHeight) return { target: id, side: "center" };
      }
    }
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

  // Como queda el arbol si se suelta ahi; null si no cambia nada. Con
  // `merge`, el centro no cambia el arbol (lo resuelve onmerge): el arbol de
  // siempre, sin la hoja que se vacia.
  function dropResult(current: NonNullable<typeof drag>): Mosaic | null {
    if (!current.target || !current.side || current.target === current.id) return null;
    if (current.vacate === current.target) return null;
    if (current.merge && current.side === "center" && current.target === current.origin) return null;
    const base = current.vacate ? remove(tree, current.vacate) : tree;
    if (current.side === "center") return current.merge ? base : replace(base, current.target, current.id);
    return place(base, current.target, current.id, current.side);
  }

  // Lo que se resalta al arrastrar es donde quedaria de verdad: el
  // rectangulo de lo arrastrado en el arbol resultante. Mover una que ya se
  // ve libera su lugar (con dos apiladas, la de abajo a la derecha de la de
  // arriba ocupa toda la altura), y marcar solo la mitad del destino mentia.
  const preview = $derived.by((): Rect | null => {
    const next = drag ? dropResult(drag) : null;
    if (!next || !drag) return null;
    // Entrar en una hoja: la hoja entera.
    if (drag.merge && drag.side === "center" && drag.target) return rects(next).get(drag.target) ?? null;
    return rects(next).get(drag.id) ?? null;
  });

  export function beginDrag(id: string, start: PointerEvent, options: DragOptions = {}): boolean {
    const merge = options.merge ?? false;
    drag = {
      id,
      x: start.clientX,
      y: start.clientY,
      vacate: options.vacate ?? null,
      origin: options.origin ?? null,
      merge,
      ...dropTarget(start.clientX, start.clientY, merge),
    };
    const at = { x: start.clientX, y: start.clientY };
    ghost = options.source ? liftGhost(options.source, options.grab ?? { x: 12, y: 12 }, at) : null;

    function onMove(moveEvent: PointerEvent) {
      if (!drag) return;
      ghost?.move({ x: moveEvent.clientX, y: moveEvent.clientY });
      drag = { ...drag, x: moveEvent.clientX, y: moveEvent.clientY, ...dropTarget(moveEvent.clientX, moveEvent.clientY, merge) };
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
      // Se asienta donde cae; sin destino, vuelve a su lugar.
      if (next) ghost?.settle();
      else ghost?.cancel();
      ghost = null;
      if (!current || !next) return;
      if (current.merge && current.side === "center" && current.target) onmerge?.(current.target, current.id);
      else onarrange(next, current.id);
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
        role={tiled ? "group" : undefined}
        tabindex={tiled ? -1 : undefined}
        aria-label={tiled ? label(id) : undefined}
        style={boxStyle(box)}
        onfocusin={() => onfocus(id)}
        onpointerdown={() => onfocus(id)}
      >
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

  /* Divisor entre hojas: franja de 6px para agarrar, sin pintar (la linea
     es el borde de la hoja). Al pasar el mouse o arrastrar, la linea se
     marca en gris, no en acento; el acento de foco solo con el teclado. */
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

  .tile-divider {
    --divider-line: color-mix(in srgb, var(--text-secondary) 55%, transparent);
    outline: none;
  }

  .tile-divider:focus-visible {
    --divider-line: var(--focus-ring);
  }

  .tile-divider:hover,
  .tile-divider:active,
  .tile-divider:focus-visible {
    background: linear-gradient(var(--divider-line), var(--divider-line)) center / 100% 1px no-repeat;
  }

  .tile-divider.vertical:hover,
  .tile-divider.vertical:active,
  .tile-divider.vertical:focus-visible {
    background: linear-gradient(var(--divider-line), var(--divider-line)) center / 1px 100% no-repeat;
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

</style>
