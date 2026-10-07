// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tabScroll } from "./tabScroll";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("oculta el fragmento de la pestaña anterior al mostrar la activa en un mosaico estrecho", () => {
  const row = document.createElement("div");
  const previous = document.createElement("div");
  const active = document.createElement("div");
  active.className = "active";
  row.append(previous, active);
  document.body.append(row);
  row.style.scrollPaddingInlineStart = "6px";
  row.style.scrollPaddingInlineEnd = "0px";
  Object.defineProperty(row, "clientWidth", { value: 120 });
  Object.defineProperty(row, "scrollWidth", { value: 180 });
  row.scrollLeft = 65;
  row.getBoundingClientRect = () => new DOMRect(0, 0, 120, 32);
  previous.getBoundingClientRect = () => new DOMRect(-65 - (row.scrollLeft - 65), 0, 80, 32);
  active.getBoundingClientRect = () => new DOMRect(21 - (row.scrollLeft - 65), 0, 80, 32);

  const action = tabScroll(row, 0);
  vi.advanceTimersByTime(20);

  expect(row.scrollLeft).toBe(80);
  expect(previous.getBoundingClientRect().right).toBe(0);
  expect(active.getBoundingClientRect().left).toBe(6);
  action.destroy();
});
