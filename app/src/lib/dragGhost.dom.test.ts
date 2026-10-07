// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginDragging, liftGhost } from "./dragGhost";

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((query: string) => ({ matches: false, media: query })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.documentElement.className = "";
});

function tab(): HTMLElement {
  const element = document.createElement("div");
  element.className = "result-tab closable console-tab active";
  element.id = "t1";
  element.setAttribute("role", "tab");
  element.innerHTML = '<svg class="tab-outline"></svg><button class="tab-select"><span id="inner">consola_1</span></button><button class="tab-close">×</button>';
  document.body.append(element);
  return element;
}

const ghosts = () => document.querySelectorAll(".drag-ghost");
const dragging = () => document.documentElement.classList.contains("dragging");

describe("arrastrar como una pestaña del navegador", () => {
  it("la copia sigue al puntero desde donde se la tomo, sin ids ni estado de elegida", () => {
    const source = tab();
    const ghost = liftGhost(source, { x: 10, y: 5 }, { x: 100, y: 50 });
    const copy = ghosts()[0] as HTMLElement;
    expect(copy.style.transform).toBe("translate(90px, 45px)");
    expect(copy.classList.contains("active")).toBe(false);
    expect(copy.id).toBe("");
    expect(copy.querySelector("[id]")).toBeNull();
    expect(copy.getAttribute("aria-hidden")).toBe("true");
    expect(copy.classList.contains("result-tab")).toBe(true);
    expect(copy.querySelector(".tab-close")).toBeNull();
    expect(copy.querySelector(".tab-outline")).toBeNull();
    expect(source.classList.contains("drag-source")).toBe(true);
    ghost.move({ x: 130, y: 70 });
    expect(copy.style.transform).toBe("translate(120px, 65px)");
    ghost.settle();
  });

  it("mientras dura no se selecciona texto; al soltar o cancelar la copia se va", () => {
    const source = tab();
    const ghost = liftGhost(source, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(dragging()).toBe(true);
    ghost.cancel();
    expect(dragging()).toBe(false);
    vi.advanceTimersByTime(300);
    expect(ghosts().length).toBe(0);
    expect(source.classList.contains("drag-source")).toBe(false);
  });

  it("el bloqueo de seleccion se cuenta: sacar una pestaña de la fila no lo suelta antes de tiempo", () => {
    const row = beginDragging();
    const ghost = liftGhost(tab(), { x: 0, y: 0 }, { x: 0, y: 0 });
    row();
    row();
    expect(dragging()).toBe(true);
    ghost.settle();
    expect(dragging()).toBe(false);
  });
});
