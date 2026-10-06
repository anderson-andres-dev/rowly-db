// Teclado de los arboles del sidebar (explorador y archivos), como en un
// explorador de archivos: ↑/↓ recorren las filas visibles, → abre la
// carpeta o baja a su primer hijo, ← la cierra o sube al padre, e Inicio/Fin
// van a la primera y a la ultima. Enter es el de cada fila (un boton).
//
// Las filas son `.row` dentro de `li[role="treeitem"]`; una carpeta lleva
// aria-expanded en su li y se abre o cierra con un clic en su fila.

const ROW = '[role="treeitem"] > .row, [role="treeitem"] > .row-wrap > .row';

// Las carpetas cerradas no pintan a sus hijos: lo que hay en el arbol es lo
// que se ve.
function rows(tree: HTMLElement): HTMLElement[] {
  return [...tree.querySelectorAll<HTMLElement>(ROW)];
}

function itemOf(row: HTMLElement): HTMLElement | null {
  return row.closest<HTMLElement>('[role="treeitem"]');
}

function focusRow(row: HTMLElement | undefined) {
  if (!row) return;
  // Las hojas (columnas, indices...) no son botones: se enfocan sin entrar
  // al orden del Tab.
  if (!row.hasAttribute("tabindex") && row.tagName !== "BUTTON") row.tabIndex = -1;
  row.focus();
  row.scrollIntoView({ block: "nearest" });
}

export function treeKeys(tree: HTMLElement) {
  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing) return;
    const row = (event.target as Element).closest<HTMLElement>(".row");
    if (!row || !tree.contains(row)) return;
    const all = rows(tree);
    const index = all.indexOf(row);
    if (index < 0) return;
    const item = itemOf(row);
    const expanded = item?.getAttribute("aria-expanded");

    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = all[index + 1];
    else if (event.key === "ArrowUp") next = all[index - 1];
    else if (event.key === "Home") next = all[0];
    else if (event.key === "End") next = all[all.length - 1];
    else if (event.key === "ArrowRight") {
      if (expanded === "false") {
        row.click();
        event.preventDefault();
        return;
      }
      if (expanded === "true") next = all[index + 1];
    } else if (event.key === "ArrowLeft") {
      if (expanded === "true") {
        row.click();
        event.preventDefault();
        return;
      }
      const parent = item?.parentElement?.closest<HTMLElement>('[role="treeitem"]');
      next = parent ? all.find((candidate) => itemOf(candidate) === parent) : undefined;
    } else return;

    event.preventDefault();
    focusRow(next);
  }

  tree.addEventListener("keydown", onKeydown);
  return {
    destroy() {
      tree.removeEventListener("keydown", onKeydown);
    },
  };
}
