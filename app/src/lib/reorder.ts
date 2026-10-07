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
//     se anima una vez desde donde estaba hasta su lugar final. No se usa
//     animate:flip de Svelte en las listas: tambien se disparaba al cambiar
//     el ancho del mosaico y hacia que las pestañas siguieran tarde al divisor.
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
const SCROLL_EDGE = 32;
const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
const SHIFT_MS = 120;
const SETTLE_MS = 140;

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
    // Renombrar y cerrar tienen sus propios gestos; no arrastran la pestaña.
    if (target?.closest("input, textarea, .tab-close")) return;
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
    const pointerId = event.pointerId;
    const startScroll = node.scrollLeft;
    // La fila entera (la franja de pestañas, no solo las que hay).
    const row = (node.parentElement ?? node).getBoundingClientRect();
    const rects = items.map((element) => element.getBoundingClientRect());
    const gap = rects.length > 1 ? Math.max(0, rects[1].left - rects[0].right) : 0;
    const shift = rects[from].width + gap;
    let dragging = false;
    let to = from;
    let latest = { x: startX, y: startY };
    let scrollFrame = 0;

    function targetIndex(dx: number): number {
      const center = rects[from].left + rects[from].width / 2 + dx;
      let index = from;
      for (let i = 0; i < rects.length; i++) {
        const middle = rects[i].left + rects[i].width / 2;
        if (i < from && center <= middle) return i;
        if (i > from && center >= middle) index = i;
      }
      return index;
    }

    let stopDragging = () => {};

    function startDrag() {
      dragging = true;
      stopDragging = beginDragging();
      item.classList.add("reorder-dragging");
      for (const element of items) {
        element.style.willChange = "transform";
        if (element !== item) element.style.transition = `transform ${SHIFT_MS}ms ${EASE}`;
      }
      requestScroll();
    }

    function paint() {
      // El scroll mueve el DOM bajo el puntero: sumarlo al transform mantiene
      // la pestaña agarrada en el mismo punto mientras se revelan las vecinas.
      const dx = latest.x - startX + node.scrollLeft - startScroll;
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

    function autoScroll() {
      scrollFrame = 0;
      if (!dragging || node.scrollWidth <= node.clientWidth) return;
      const box = node.getBoundingClientRect();
      if (latest.y >= box.top && latest.y <= box.bottom) {
        const left = Math.max(0, SCROLL_EDGE - (latest.x - box.left));
        const right = Math.max(0, SCROLL_EDGE - (box.right - latest.x));
        const speed = Math.round((right - left) * 0.4);
        if (speed) {
          const before = node.scrollLeft;
          node.scrollLeft += speed;
          if (node.scrollLeft !== before) {
            paint();
            requestScroll();
          }
        }
      }
    }

    function requestScroll() {
      if (!scrollFrame && node.scrollWidth > node.clientWidth) {
        scrollFrame = requestAnimationFrame(autoScroll);
      }
    }

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId) return;
      latest = { x: moveEvent.clientX, y: moveEvent.clientY };
      // Se despega al alejarse en vertical o al salir por los lados de su
      // fila (hacia la fila de otro grupo), como en el navegador.
      const away =
        Math.abs(moveEvent.clientY - startY) > DETACH_THRESHOLD ||
        moveEvent.clientX < row.left - DETACH_THRESHOLD ||
        moveEvent.clientX > row.right + DETACH_THRESHOLD;
      const grab = { x: startX - rects[from].left, y: startY - rects[from].top };
      if (params.detach && away && params.detach(item, moveEvent, grab)) {
        detach();
        return;
      }
      if (!dragging) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD) return;
        startDrag();
      }
      moveEvent.preventDefault();
      paint();
      requestScroll();
    }

    function cleanup() {
      cancelAnimationFrame(scrollFrame);
      stopDragging();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
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
      }, SETTLE_MS + 20);
    }

    function detach() {
      cleanup();
      item.classList.remove("reorder-dragging");
      resetStyles();
    }

    function onCancel(cancelEvent: PointerEvent) {
      if (cancelEvent.pointerId !== pointerId) return;
      detach();
    }

    function onUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== pointerId) return;
      cleanup();
      if (!dragging) return;
      swallowNextClick();
      item.classList.remove("reorder-dragging");

      if (to === from || prefersReducedMotion()) {
        const duration = prefersReducedMotion() ? 0 : SHIFT_MS;
        for (const element of items) element.style.transition = duration ? `transform ${duration}ms ${EASE}` : "";
        for (const element of items) element.style.transform = "";
        if (to !== from) params.onmove(from, to);
        if (duration) setTimeout(resetStyles, duration + 20);
        else resetStyles();
        return;
      }
      void settle();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
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
