// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { treeKeys } from "./treeKeys";

// Un arbol como el del explorador: una conexion abierta con una tabla
// abierta (con una columna, hoja) y otra cerrada. Abrir o cerrar es un clic
// en la fila, que aqui solo cambia aria-expanded.
function mountTree() {
  document.body.innerHTML = `
    <ul role="tree">
      <li role="treeitem" aria-expanded="true"><div class="row-wrap"><button class="row" id="conn">core</button></div>
        <ul role="group">
          <li role="treeitem" aria-expanded="true"><div class="row-wrap"><button class="row" id="clientes">clientes</button></div>
            <ul role="group">
              <li role="treeitem"><div class="row-wrap"><div class="row leaf" id="id">id</div></div></li>
            </ul>
          </li>
          <li role="treeitem" aria-expanded="false"><div class="row-wrap"><button class="row" id="facturas">facturas</button></div></li>
        </ul>
      </li>
    </ul>`;
  const tree = document.querySelector<HTMLElement>('[role="tree"]')!;
  for (const button of tree.querySelectorAll<HTMLElement>("button.row")) {
    button.addEventListener("click", () => {
      const item = button.closest('[role="treeitem"]')!;
      item.setAttribute("aria-expanded", item.getAttribute("aria-expanded") === "true" ? "false" : "true");
    });
  }
  const action = treeKeys(tree);
  return { tree, action };
}

function press(key: string): boolean {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event.defaultPrevented;
}

const focused = () => document.activeElement?.id;
const expandedOf = (id: string) => document.getElementById(id)!.closest('[role="treeitem"]')!.getAttribute("aria-expanded");

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

describe("teclado del arbol", () => {
  it("↑/↓ recorren las filas visibles, hojas incluidas; Inicio y Fin van a los extremos", () => {
    const { action } = mountTree();
    cleanup = action.destroy;
    document.getElementById("conn")!.focus();
    press("ArrowDown");
    expect(focused()).toBe("clientes");
    press("ArrowDown");
    expect(focused()).toBe("id");
    press("ArrowDown");
    expect(focused()).toBe("facturas");
    press("ArrowUp");
    expect(focused()).toBe("id");
    press("Home");
    expect(focused()).toBe("conn");
    press("End");
    expect(focused()).toBe("facturas");
  });

  it("→ abre la carpeta cerrada y, abierta, baja a su primer hijo", () => {
    const { action } = mountTree();
    cleanup = action.destroy;
    document.getElementById("facturas")!.focus();
    expect(press("ArrowRight")).toBe(true);
    expect(expandedOf("facturas")).toBe("true");
    document.getElementById("clientes")!.focus();
    press("ArrowRight");
    expect(focused()).toBe("id");
  });

  it("← cierra la carpeta abierta y, desde un hijo, sube al padre", () => {
    const { action } = mountTree();
    cleanup = action.destroy;
    document.getElementById("id")!.focus();
    press("ArrowLeft");
    expect(focused()).toBe("clientes");
    press("ArrowLeft");
    expect(expandedOf("clientes")).toBe("false");
    expect(focused()).toBe("clientes");
  });

  it("un clic en una fila la enfoca, tambien una hoja: las flechas siguen desde ahi", () => {
    const { action } = mountTree();
    cleanup = action.destroy;
    document.getElementById("id")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(focused()).toBe("id");
    press("ArrowDown");
    expect(focused()).toBe("facturas");
  });

  it("con modificadores no toca la tecla: Ctrl+Shift+Alt+flechas son para cambiar de zona", () => {
    const { action } = mountTree();
    cleanup = action.destroy;
    document.getElementById("conn")!.focus();
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(focused()).toBe("conn");
  });
});
