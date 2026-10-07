import { tick } from "svelte";
import { beginDragging, type Point } from "$lib/dragGhost";

// Reordenar pestañas arrastrando con el mouse (accion de Svelte:
// `use:reorderable`).
//
// Con eventos de puntero y transforms, no con el drag & drop nativo de HTML:
// en WebKitGTK ese es poco confiable y no deja controlar la animacion.
//
//   - Mientras se arrastra: la pestaña tomada sigue al puntero y las demas
//     se corren (transicion) para hacerle lugar. Todas van en su propia capa
//     (will-change) para que moverse no repinte la fila.
//   - Al soltar: UNA sola animacion de acomodo (FLIP): se mide donde se ve
//     cada pestaña en ese instante, el padre reordena sus datos, y cada una
//     se anima una vez desde donde estaba hasta su lugar final. Mientras
//     tanto se apaga el animate:flip de Svelte (ver flipDuration): con los
//     dos a la vez la animacion se veia repetida.
//
// Un clic comun sigue siendo un clic: el arrastre recien empieza al mover
// mas de DRAG_THRESHOLD px, y en ese caso se anula el click que sigue.

export interface ReorderParams {
  // Selector de los elementos reordenables, hijos del contenedor.
  items: string;
  onmove: (from: number, to: number) => void;
  // Sacar la pestaña de la fila, como en el navegador: al alejarse el
  // puntero en vertical, el reordenar se suelta (todo vuelve a su lugar) y el
  // arrastre sigue a cargo de quien la recibe (MosaicArea), con los mismos
  // eventos de puntero (y anula el click al soltar: swallowNextClick).
  // `grab`: donde se la tomo, relativo a su esquina, para que la copia que
  // sigue al puntero (dragGhost.ts) no salte. Devuelve false si esa pestaña
  // no se puede sacar.
  detach?: (item: HTMLElement, event: PointerEvent, grab: Point) => boolean;
}

const DRAG_THRESHOLD = 4;
const DETACH_THRESHOLD = 24;
const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
const SHIFT_MS = 170;
const SETTLE_MS = 200;

let settling = 0;

// Duracion para animate:flip de las listas reordenables: 0 mientras un
// soltar hace su propio acomodo. Svelte evalua los parametros al animar.
export function flipDuration(duration: number): number {
  return settling > 0 ? 0 : duration;
}

// El click que sigue a soltar un arrastre no debe activar la pestaña ni
// cerrarla. Caduca enseguida: si no llega ningun click (se solto fuera), no
// puede quedar esperando y tragarse el siguiente click real del usuario.
export function swallowNextClick(): void {
  const swallow = (clickEvent: MouseEvent) => clickEvent.stopPropagation();
  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 80);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function reorderable(node: HTMLElement, initial: ReorderParams) {
  let params = initial;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.target as Element | null;
    // Los campos de texto (renombrar) no arrastran.
    if (target?.closest("input, textarea")) return;
    const found = target?.closest<HTMLElement>(params.items);
    if (!found || !node.contains(found)) return;
    const item: HTMLElement = found;

    const items = [...node.querySelectorAll<HTMLElement>(params.items)];
    const from = items.indexOf(item);
    // Una sola no tiene con que reordenarse, pero puede sacarse de la fila
    // (la unica pestaña de un grupo del resultado).
    if (from < 0 || (items.length < 2 && !params.detach)) return;

    const startX = event.clientX;
    const startY = event.clientY;
    // La fila entera (la franja de pestañas, no solo las que hay).
    const row = (node.parentElement ?? node).getBoundingClientRect();
    const rects = items.map((element) => element.getBoundingClientRect());
    const gap = rects.length > 1 ? Math.max(0, rects[1].left - rects[0].right) : 0;
    const shift = rects[from].width + gap;
    let dragging = false;
    let to = from;

    function targetIndex(dx: number): number {
      const center = rects[from].left + rects[from].width / 2 + dx;
      let index = from;
      for (let i = 0; i < rects.length; i++) {
        const middle = rects[i].left + rects[i].width / 2;
        if (i < from && center < middle) return i;
        if (i > from && center > middle) index = i;
      }
      return index;
    }

    let stopDragging = () => {};

    function startDrag() {
      dragging = true;
      stopDragging = beginDragging();
      item.setPointerCapture(event.pointerId);
      item.classList.add("reorder-dragging");
      for (const element of items) {
        element.style.willChange = "transform";
        if (element !== item) element.style.transition = `transform ${SHIFT_MS}ms ${EASE}`;
      }
    }

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const grab = { x: startX - rects[from].left, y: startY - rects[from].top };
      // Se despega al alejarse en vertical o al salir por los lados de su
      // fila (hacia la fila de otro grupo), como en el navegador.
      const away =
        Math.abs(moveEvent.clientY - startY) > DETACH_THRESHOLD ||
        moveEvent.clientX < row.left - DETACH_THRESHOLD ||
        moveEvent.clientX > row.right + DETACH_THRESHOLD;
      if (params.detach && away && params.detach(item, moveEvent, grab)) {
        detach();
        return;
      }
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        startDrag();
      }
      // Acotado al primer y ultimo lugar: no sale de la fila.
      const minDx = rects[0].left - rects[from].left;
      const maxDx = rects[rects.length - 1].right - rects[from].right;
      const clamped = Math.min(maxDx, Math.max(minDx, dx));
      item.style.transform = `translateX(${clamped}px)`;
      const next = targetIndex(clamped);
      if (next === to) return;
      to = next;
      items.forEach((element, index) => {
        if (element === item) return;
        let offset = 0;
        if (from < to && index > from && index <= to) offset = -shift;
        if (from > to && index < from && index >= to) offset = shift;
        element.style.transform = offset ? `translateX(${offset}px)` : "";
      });
    }

    function cleanup() {
      stopDragging();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    function resetStyles() {
      for (const element of items) {
        element.style.transition = "";
        element.style.transform = "";
        element.style.willChange = "";
      }
    }

    async function settle() {
      // F(irst): donde se ve cada pestaña ahora (con su transform).
      const first = new Map(items.map((element) => [element, element.getBoundingClientRect().left]));
      settling++;
      resetStyles();
      params.onmove(from, to);
      await tick();
      // L(ast) + I(nvert): cada una vuelve a verse donde estaba...
      const moving: HTMLElement[] = [];
      for (const element of items) {
        if (!element.isConnected) continue;
        const dx = (first.get(element) ?? 0) - element.getBoundingClientRect().left;
        if (Math.abs(dx) < 0.5) continue;
        element.style.transform = `translateX(${dx}px)`;
        element.style.willChange = "transform";
        moving.push(element);
      }
      // ...P(lay): y se anima UNA vez a su lugar.
      void node.offsetWidth;
      for (const element of moving) {
        element.style.transition = `transform ${SETTLE_MS}ms ${EASE}`;
        element.style.transform = "";
      }
      setTimeout(() => {
        for (const element of moving) {
          element.style.transition = "";
          element.style.willChange = "";
        }
        settling--;
      }, SETTLE_MS + 20);
    }

    function detach() {
      cleanup();
      if (dragging && item.hasPointerCapture(event.pointerId)) item.releasePointerCapture(event.pointerId);
      item.classList.remove("reorder-dragging");
      resetStyles();
    }

    function onUp() {
      cleanup();
      if (!dragging) return;
      swallowNextClick();
      item.classList.remove("reorder-dragging");

      if (to === from || prefersReducedMotion()) {
        // Sin cambio de lugar: todo vuelve con la misma transicion suave.
        for (const element of items) element.style.transition = `transform ${SHIFT_MS}ms ${EASE}`;
        for (const element of items) element.style.transform = "";
        if (to !== from) params.onmove(from, to);
        setTimeout(resetStyles, SHIFT_MS + 20);
        return;
      }
      void settle();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  node.addEventListener("pointerdown", onPointerDown);
  return {
    update(next: ReorderParams) {
      params = next;
    },
    destroy() {
      node.removeEventListener("pointerdown", onPointerDown);
    },
  };
}

// Mueve un elemento de `from` a `to` (indices del arreglo), sin mutar.
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
