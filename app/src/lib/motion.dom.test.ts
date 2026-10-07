// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { tabEnter, tabExit } from "./motion";

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });

function tab() {
  const row = document.createElement("div");
  row.style.columnGap = "6px";
  const node = document.createElement("div");
  node.style.cssText = "padding: 0 4px 0 12px; border: 1px solid transparent";
  node.getBoundingClientRect = () => new DOMRect(0, 0, 120, 32);
  row.append(node);
  document.body.append(row);
  return node;
}

it("cierra progresivamente el hueco completo, incluidos borde y separacion", () => {
  const node = tab();
  const exit = tabExit(node);
  const sample = document.createElement("div");
  const occupied = (t: number) => {
    sample.style.cssText = exit.css(t);
    return parseFloat(sample.style.width) + parseFloat(sample.style.marginRight) + 6;
  };
  expect(occupied(1)).toBe(126);
  expect(occupied(0.5)).toBeLessThan(occupied(1));
  expect(occupied(0.5)).toBeGreaterThan(occupied(0));
  expect(occupied(0)).toBe(0);
  expect(node.hasAttribute("data-tab-closing")).toBe(true);
  expect(sample.style.pointerEvents).toBe("none");
});

it("omite entrada y salida cuando se pide reducir movimiento", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const node = tab();
  expect(tabEnter(node).duration).toBe(0);
  expect(tabExit(node).duration).toBe(0);
});
