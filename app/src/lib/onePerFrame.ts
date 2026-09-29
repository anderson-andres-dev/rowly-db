// Aplica a lo sumo una vez por cuadro el ultimo valor recibido. Para los
// arrastres (borde del sidebar, splitter): WebKitGTK no siempre agrupa los
// pointermove por cuadro, y cada uno que cambia un tamaño es un layout
// entero del area principal; sin esto, varios por cuadro que nadie llega a
// ver pintados.
export function onePerFrame<T>(apply: (value: T) => void) {
  let frame: number | null = null;
  let pending: { value: T } | null = null;

  function run() {
    frame = null;
    const next = pending;
    pending = null;
    if (next) apply(next.value);
  }

  return {
    set(value: T) {
      pending = { value };
      frame ??= requestAnimationFrame(run);
    },
    // Al soltar: lo pendiente se aplica ya, no un cuadro despues.
    flush() {
      if (frame !== null) cancelAnimationFrame(frame);
      run();
    },
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      pending = null;
    },
  };
}
