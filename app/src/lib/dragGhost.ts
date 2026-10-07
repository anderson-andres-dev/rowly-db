// Arrastrar como las pestañas del navegador: lo tomado se despega de su
// lugar y una copia sigue al puntero desde el punto donde se la agarro. Al
// soltar sobre un destino se asienta (se desvanece donde quedo); al cancelar
// vuelve a su lugar. Mientras dura, la ventana no selecciona texto
// (styles/native.css, :root.dragging).

export interface Point {
  x: number;
  y: number;
}

export interface Ghost {
  move(at: Point): void;
  // Se solto sobre un destino: vuela hasta donde quedo (`landing`, buscado
  // despues de que el destino se reacomoda) y ahi se va; sin el, se
  // desvanece donde esta.
  settle(landing?: () => HTMLElement | null): void;
  // Esc, o se solto donde no hace nada: vuelve a su lugar.
  cancel(): void;
}

const SETTLE_MS = 120;
const LAND_MS = 170;
const RETURN_MS = 180;
const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Que no quede texto seleccionado ni se seleccione mientras se arrastra (se
// usa tambien al reordenar en una fila). Cuenta: al sacar una pestaña de su
// fila, el arrastre de la copia empieza antes de que termine el de la fila.
let draggingCount = 0;

export function beginDragging(): () => void {
  window.getSelection()?.removeAllRanges();
  draggingCount++;
  document.documentElement.classList.add("dragging");
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    draggingCount--;
    if (draggingCount === 0) document.documentElement.classList.remove("dragging");
  };
}

// `grab`: donde se tomo, relativo a la esquina de `source`.
export function liftGhost(source: HTMLElement, grab: Point, at: Point): Ghost {
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  // La copia no es una pestaña mas: sin estado de elegida, ids ni roles.
  ghost.classList.remove("active", "reorder-dragging", "drag-source");
  ghost.removeAttribute("id");
  for (const element of ghost.querySelectorAll("[id]")) element.removeAttribute("id");
  ghost.removeAttribute("role");
  ghost.setAttribute("aria-hidden", "true");
  ghost.classList.add("drag-ghost");
  // La copia representa la pestaña, no un segundo control para cerrarla.
  ghost.querySelector(".tab-close")?.remove();
  ghost.querySelector(".tab-outline")?.remove();
  for (const button of ghost.querySelectorAll("button")) button.tabIndex = -1;
  Object.assign(ghost.style, {
    position: "fixed",
    left: "0",
    top: "0",
    right: "auto",
    bottom: "auto",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    transition: "",
  });
  const place = (point: Point) => {
    ghost.style.transform = `translate(${point.x - grab.x}px, ${point.y - grab.y}px)`;
  };
  place(at);
  document.body.append(ghost);
  source.classList.add("drag-source");
  const stopDragging = beginDragging();

  let done = false;
  // Al soltar, la ventana queda libre enseguida (seleccionar, hacer clic);
  // la copia termina su animacion y se va.
  function finish(after: number) {
    done = true;
    stopDragging();
    setTimeout(() => {
      ghost.remove();
      source.classList.remove("drag-source");
    }, after);
  }

  return {
    move(point) {
      if (!done) place(point);
    },
    settle(landing) {
      if (done) return;
      if (prefersReducedMotion()) return finish(0);
      // Lo que dura el vuelo: cuando aterriza se quita.
      finish(LAND_MS + 40);
      // Dos cuadros: el destino ya se dibujo en su lugar nuevo.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const target = landing?.();
          const box = target?.getBoundingClientRect();
          if (target && box && box.width > 0) {
            target.style.opacity = "0";
            ghost.style.transition = `transform ${LAND_MS}ms ${EASE}, width ${LAND_MS}ms ${EASE}`;
            ghost.style.transform = `translate(${box.left}px, ${box.top}px)`;
            ghost.style.width = `${box.width}px`;
            setTimeout(() => (target.style.opacity = ""), LAND_MS);
          } else {
            ghost.style.transition = `opacity ${SETTLE_MS}ms ease`;
            ghost.style.opacity = "0";
          }
        }),
      );
    },
    cancel() {
      if (done) return;
      if (prefersReducedMotion() || !source.isConnected) return finish(0);
      const home = source.getBoundingClientRect();
      ghost.style.transition = `transform ${RETURN_MS}ms ${EASE}`;
      ghost.style.transform = `translate(${home.left}px, ${home.top}px)`;
      finish(RETURN_MS);
    },
  };
}
