// Cierre animado para TODOS los <dialog> de la app.
//
// La transicion de salida de tokens.css (opacity/transform + display y
// overlay con allow-discrete) no corre en WebKitGTK, el motor de Tauri en
// Linux: sin soporte de `overlay`, el dialogo sale de la capa superior en
// el acto y se corta en seco. En vez de depender de eso, close() se
// reemplaza una sola vez: marca el dialogo con .is-closing (la animacion de
// salida esta en tokens.css), espera a que termine y recien ahi cierra de
// verdad. El evento "close" sale al final, asi que quien reacciona a el
// (desmontar el componente, limpiar estado) lo hace con la animacion ya
// terminada.
//
// Esc tambien pasa por aca: el "cancel" nativo cerraria de golpe, asi que se
// cancela y se llama a close(). Los componentes que escuchan oncancel siguen
// recibiendolo igual.
//
// Clic en el fondo: los modales que se cierran asi (target === el dialogo)
// solo reciben ese clic si de verdad fue en el fondo (ver isBackdropClick).
// Sin esto, un segundo clic mientras el modal todavia aparece (en una PC
// lenta puede tardar bastante) o soltar el mouse afuera despues de
// seleccionar texto adentro lo cerraban.

const CLOSE_DURATION_MS = 150;
// Lo que tarda en aparecer un modal y un poco mas: un clic en el fondo antes
// de eso es el mismo clic que lo abrio repetido, no una decision de cerrar.
export const OPEN_GRACE_MS = 300;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function outside(box: Box, x: number, y: number): boolean {
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

// Si un clic sobre un dialogo abierto cuenta como clic en su fondo: con el
// mouse (no el teclado, detail 0), apretado y soltado fuera del recuadro, y
// con el modal abierto hace al menos OPEN_GRACE_MS.
export function isBackdropClick(click: {
  box: Box;
  down: { x: number; y: number } | null;
  up: { x: number; y: number };
  detail: number;
  openFor: number;
}): boolean {
  if (click.detail === 0 || !click.down) return false;
  if (click.openFor < OPEN_GRACE_MS) return false;
  return outside(click.box, click.down.x, click.down.y) && outside(click.box, click.up.x, click.up.y);
}

let installed = false;

export function installDialogMotion(): void {
  if (installed || typeof HTMLDialogElement === "undefined") return;
  installed = true;

  const nativeClose = HTMLDialogElement.prototype.close;
  const nativeShowModal = HTMLDialogElement.prototype.showModal;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const openedAt = new WeakMap<HTMLDialogElement, number>();

  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    openedAt.set(this, performance.now());
    nativeShowModal.call(this);
  };

  // Donde se apreto el mouse, si fue sobre un dialogo abierto.
  let pressed: { dialog: HTMLDialogElement; x: number; y: number } | null = null;
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      pressed = target instanceof HTMLDialogElement && target.open ? { dialog: target, x: event.clientX, y: event.clientY } : null;
    },
    true,
  );
  // En captura, antes que el onclick del componente: si no fue un clic en el
  // fondo, no le llega.
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLDialogElement) || !target.open) return;
      const down = pressed?.dialog === target ? pressed : null;
      pressed = null;
      const backdrop = isBackdropClick({
        box: target.getBoundingClientRect(),
        down,
        up: { x: event.clientX, y: event.clientY },
        detail: event.detail,
        openFor: performance.now() - (openedAt.get(target) ?? 0),
      });
      if (!backdrop) event.stopPropagation();
    },
    true,
  );

  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (!this.open || this.classList.contains("is-closing")) return;
    if (reducedMotion.matches || !this.isConnected) {
      nativeClose.call(this, returnValue);
      return;
    }
    this.classList.add("is-closing");
    window.setTimeout(() => {
      this.classList.remove("is-closing");
      if (this.open) nativeClose.call(this, returnValue);
    }, CLOSE_DURATION_MS);
  };

  document.addEventListener(
    "cancel",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLDialogElement)) return;
      event.preventDefault();
      // Despues de que el componente procese su propio oncancel (que suele
      // llamar a close() el mismo; el segundo llamado no hace nada).
      queueMicrotask(() => target.close());
    },
    true,
  );
}
