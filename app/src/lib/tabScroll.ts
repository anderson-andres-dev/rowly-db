// Una franja de pestañas que se desplaza por debajo de lo que queda fijo a
// sus lados (como la barra de las consolas): scroll nativo sin barra, un
// desvanecido (clases fade-start / fade-end) en el borde que tiene mas, la
// rueda vertical la mueve en horizontal y la pestaña elegida (.active) se
// pone a la vista (al elegirla, al cambiar la cantidad y al cambiar el
// ancho. La posicion se corrige en el siguiente fotograma, sin esperar una
// animacion que pueda quedar por detras del puntero al redimensionar.
export function tabScroll(node: HTMLElement, _changed: unknown) {
  function update() {
    // Sin desborde (p. ej. tras cerrar pestañas), vuelve al principio aunque
    // un desplazamiento quedara a medias.
    if (node.scrollWidth <= node.clientWidth) node.scrollLeft = 0;
    node.classList.toggle("fade-start", node.scrollLeft > 1);
    node.classList.toggle("fade-end", node.scrollLeft + node.clientWidth < node.scrollWidth - 1);
  }

  function onWheel(event: WheelEvent) {
    if (node.scrollWidth <= node.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    node.scrollLeft += event.deltaY;
  }

  let frame = 0;
  function reveal() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      // Solo la fila: scrollIntoView desplazaba tambien a los de arriba,
      // aunque recorten (un mosaico angosto quedaba corrido y dejaba una
      // franja vacia).
      const tab = node.querySelector<HTMLElement>(".active:not([data-tab-closing])");
      if (tab) {
        const box = node.getBoundingClientRect();
        const rect = tab.getBoundingClientRect();
        const style = getComputedStyle(node);
        // En un grupo muy angosto, el margen visual no puede ocupar mas que
        // una pequena parte de la fila: la pestaña elegida tiene prioridad.
        const maxPad = node.clientWidth / 4;
        const pad = Math.min(parseFloat(style.scrollPaddingInlineStart) || 0, maxPad);
        const padEnd = Math.min(parseFloat(style.scrollPaddingInlineEnd) || 0, maxPad);
        const previous = tab.previousElementSibling?.getBoundingClientRect();
        const previousSliver = previous && previous.left < box.left && previous.right > box.left && previous.right - box.left < Math.min(32, rect.width / 2);
        if (rect.left < box.left + pad || (previousSliver && rect.left > box.left + pad)) {
          node.scrollLeft += rect.left - box.left - pad;
        }
        else if (rect.right > box.right - padEnd) node.scrollLeft += rect.right - box.right + padEnd;
      }
      update();
    });
  }

  // Al cambiar de ancho, la elegida vuelve a quedar a la vista.
  const observer = new ResizeObserver(reveal);
  observer.observe(node);
  // Al quitar o agregar pestañas, se reacomoda al instante.
  const children = new MutationObserver(reveal);
  children.observe(node, { childList: true });
  node.addEventListener("scroll", update, { passive: true });
  // No pasivo a proposito: preventDefault evita que la rueda desplace la
  // pagina.
  node.addEventListener("wheel", onWheel, { passive: false });
  reveal();

  return {
    update: reveal,
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      children.disconnect();
      node.removeEventListener("scroll", update);
      node.removeEventListener("wheel", onWheel);
    },
  };
}
