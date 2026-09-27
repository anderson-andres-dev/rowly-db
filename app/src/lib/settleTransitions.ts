// Transiciones solo despues del primer pintado. En el WebView, un elemento
// recien montado a veces arranca desde el color heredado (el del texto, casi
// blanco en los temas oscuros) y la transicion de `color`/`opacity` hace
// visible el paso a su color real: el destello blanco de los iconos al
// mostrar el primer resultado (docs/specs/v0.2-autocompletado.md, §6).
//
// El CSS del componente anula sus transiciones mientras falte el atributo:
//   .boton:not([data-settled]) { transition: none; }
export function settleTransitions(node: HTMLElement) {
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => node.setAttribute("data-settled", ""));
  });
  return {
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
}
