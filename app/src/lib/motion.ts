// Animaciones sutiles al cambiar lo que se ve en un mismo lugar (otra
// pestaña elegida, con el mouse o con Ctrl+Tab: el mismo camino). Con
// "reducir movimiento" no se anima.

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Solo la pestaña nueva: un desplazamiento de 3px sin animar su consola.
// La salida cierra tambien el espacio; el contenido vecino ya esta elegido.
export function tabEnter(_node: Element) {
  return {
    duration: prefersReducedMotion() ? 0 : 140,
    css: (t: number) => `opacity: ${0.65 + 0.35 * t}; transform: translateX(${-3 * (1 - t)}px)`,
  };
}

export function tabExit(node: Element) {
  const width = node.getBoundingClientRect().width;
  const style = getComputedStyle(node);
  const parent = node.parentElement;
  const gap = parent ? parseFloat(getComputedStyle(parent).columnGap) || 0 : 0;
  const left = parseFloat(style.paddingLeft) || 0;
  const right = parseFloat(style.paddingRight) || 0;
  const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
  // La fila deja de buscar esta pestaña como activa durante su salida.
  node.setAttribute("data-tab-closing", "");
  return {
    duration: prefersReducedMotion() ? 0 : 140,
    easing: (t: number) => 1 - (1 - t) ** 3,
    // El hueco y sus margenes se cierran junto con la pestaña: antes solo
    // desaparecia el dibujo y las vecinas saltaban al retirar el nodo.
    css: (t: number) => `opacity: ${t}; min-width: 0; width: ${Math.max(border, width * t)}px; max-width: ${Math.max(border, width * t)}px; flex: 0 0 auto; padding-left: ${left * t}px; padding-right: ${right * t}px; margin-right: ${-(gap + border) * (1 - t)}px; overflow: hidden; pointer-events: none`,
  };
}

// Lo nuevo entra con un fundido corto desde casi visible: se nota el cambio
// sin que parpadee.
export function softSwap(elements: Iterable<Element>): void {
  if (prefersReducedMotion()) return;
  for (const element of elements) {
    element.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 150, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" });
  }
}
