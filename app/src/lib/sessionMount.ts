// Traslada el DOM de una sesion sin desmontar su componente ni recrear
// xterm/PTY. El arbol de componentes permanece plano aunque cambie el grupo.
export function sessionMount(node: HTMLElement, target: HTMLElement | undefined) {
  function move(next: HTMLElement | undefined) {
    if (next && node.parentElement !== next) next.appendChild(node);
  }
  move(target);
  return { update: move, destroy: () => node.remove() };
}
