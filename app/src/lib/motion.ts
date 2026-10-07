// Animaciones sutiles al cambiar lo que se ve en un mismo lugar (otra
// pestaña elegida, con el mouse o con Ctrl+Tab: el mismo camino). Con
// "reducir movimiento" no se anima.

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Lo nuevo entra con un fundido corto desde casi visible: se nota el cambio
// sin que parpadee.
export function softSwap(elements: Iterable<Element>): void {
  if (prefersReducedMotion()) return;
  for (const element of elements) {
    element.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 150, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" });
  }
}
