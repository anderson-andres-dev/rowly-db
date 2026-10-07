// Una franja de pestañas que se desplaza por debajo de lo que queda fijo a
// sus lados (como la barra de las consolas): scroll nativo sin barra, un
// desvanecido (clases fade-start / fade-end) en el borde que tiene mas, la
// rueda vertical la mueve en horizontal y la pestaña elegida (.active) se
// pone a la vista (al elegirla, al cambiar la cantidad y al cambiar el
// ancho; tras la entrada, 150 ms, para medir el ancho final).
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

  let timer = 0;
  function reveal() {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Solo la fila: scrollIntoView desplazaba tambien a los de arriba,
      // aunque recorten (un mosaico angosto quedaba corrido y dejaba una
      // franja vacia).
      const tab = node.querySelector<HTMLElement>(".active");
      if (tab) {
        const box = node.getBoundingClientRect();
        const rect = tab.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(node).scrollPaddingInlineStart) || 0;
        const padEnd = parseFloat(getComputedStyle(node).scrollPaddingInlineEnd) || 0;
        if (rect.left < box.left + pad) node.scrollBy({ left: rect.left - box.left - pad, behavior: "smooth" });
        else if (rect.right > box.right - padEnd) node.scrollBy({ left: rect.right - box.right + padEnd, behavior: "smooth" });
      }
      update();
    }, 160);
  }

  // Al cambiar de ancho, la elegida vuelve a quedar a la vista.
  const observer = new ResizeObserver(reveal);
  observer.observe(node);
  // Al quitar o agregar pestañas, se reacomoda al instante.
  const children = new MutationObserver(update);
  children.observe(node, { childList: true });
  node.addEventListener("scroll", update, { passive: true });
  // No pasivo a proposito: preventDefault evita que la rueda desplace la
  // pagina.
  node.addEventListener("wheel", onWheel, { passive: false });
  reveal();

  return {
    update: reveal,
    destroy() {
      clearTimeout(timer);
      observer.disconnect();
      children.disconnect();
      node.removeEventListener("scroll", update);
      node.removeEventListener("wheel", onWheel);
    },
  };
}
