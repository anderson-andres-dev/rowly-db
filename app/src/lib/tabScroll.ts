// Una franja de pestañas que se desplaza por debajo de lo que queda fijo a
// sus lados (como la barra de las consolas): scroll nativo sin barra, un
// desvanecido (clases fade-start / fade-end) en el borde que tiene mas, la
// rueda vertical la mueve en horizontal y la pestaña elegida (.active) se
// pone a la vista (al elegirla, al cambiar la cantidad y al cambiar el
// ancho; tras la entrada, 150 ms, para medir el ancho final).
export function tabScroll(node: HTMLElement, _changed: unknown) {
  function update() {
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
      node.querySelector(".active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      update();
    }, 160);
  }

  // Al cambiar de ancho, la elegida vuelve a quedar a la vista.
  const observer = new ResizeObserver(reveal);
  observer.observe(node);
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
      node.removeEventListener("scroll", update);
      node.removeEventListener("wheel", onWheel);
    },
  };
}
