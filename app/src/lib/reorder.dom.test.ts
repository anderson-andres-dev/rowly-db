// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reorderable } from "./reorder";

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.documentElement.className = "";
});

function pointer(type: string, target: EventTarget, x: number, y = 10) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
}

function tabs() {
  const row = document.createElement("div");
  row.getBoundingClientRect = () => new DOMRect(0, 0, 300, 36);
  const items = [0, 1, 2].map((index) => {
    const tab = document.createElement("div");
    tab.className = "result-tab closable";
    tab.getBoundingClientRect = () => new DOMRect(index * 100, 0, 98, 32);
    const select = document.createElement("button");
    select.className = "tab-select";
    const close = document.createElement("button");
    close.className = "tab-close";
    tab.append(select, close);
    row.append(tab);
    return { tab, select, close };
  });
  document.body.append(row);
  const onmove = vi.fn();
  const action = reorderable(row, { items: ".result-tab", onmove });
  return { row, items, onmove, action };
}

describe("reordenar pestañas", () => {
  it("arrastra una pestaña entre sus vecinas y confirma el nuevo orden al soltar", () => {
    const { items, onmove, action } = tabs();
    pointer("pointerdown", items[0].select, 10);
    pointer("pointermove", window, 250);
    expect(items[0].tab.classList.contains("reorder-dragging")).toBe(true);
    pointer("pointerup", window, 250);
    expect(onmove).toHaveBeenCalledExactlyOnceWith(0, 2);
    expect(document.documentElement.classList.contains("dragging")).toBe(false);
    action.destroy();
  });

  it("permite llevar la última pestaña hasta el primer lugar", () => {
    const { items, onmove, action } = tabs();
    pointer("pointerdown", items[2].select, 210);
    pointer("pointermove", window, 10);
    pointer("pointerup", window, 10);
    expect(onmove).toHaveBeenCalledExactlyOnceWith(2, 0);
    action.destroy();
  });

  it("desplaza la fila al arrastrar junto al borde y alcanza pestañas ocultas", () => {
    const { row, items, onmove, action } = tabs();
    Object.defineProperty(row, "clientWidth", { value: 150 });
    Object.defineProperty(row, "scrollWidth", { value: 330 });
    row.getBoundingClientRect = () => new DOMRect(0, 0, 150, 36);
    pointer("pointerdown", items[0].select, 10);
    pointer("pointermove", window, 145);
    vi.advanceTimersByTime(500);
    expect(row.scrollLeft).toBeGreaterThan(0);
    pointer("pointerup", window, 145);
    expect(onmove).toHaveBeenCalledExactlyOnceWith(0, 2);
    action.destroy();
  });

  it("no arrastra desde cerrar y cancela sin cambiar el orden", () => {
    const { items, onmove, action } = tabs();
    pointer("pointerdown", items[0].close, 10);
    pointer("pointermove", window, 250);
    pointer("pointerup", window, 250);
    expect(onmove).not.toHaveBeenCalled();

    pointer("pointerdown", items[0].select, 10);
    pointer("pointermove", window, 250);
    pointer("pointercancel", window, 250);
    expect(onmove).not.toHaveBeenCalled();
    expect(items[0].tab.style.transform).toBe("");
    action.destroy();
  });
});
