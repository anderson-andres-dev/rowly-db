import { get } from "svelte/store";
import { t } from "$lib/i18n";
import { shortcutKeyParts } from "$lib/stores/shortcuts";

// Tooltip propio de la app: el unico que se usa. El `title` nativo sale con
// el estilo del sistema (distinto en cada motor) y tarda; este se ve igual
// en todos lados, con el atajo aparte en tono secundario.
//
//   <button use:tooltip={$t("x")}>                     solo texto
//   <button use:tooltip={{ label, shortcut: "Ctrl+F" }}> texto + atajo
//
// Un texto que termina en "(Ctrl+X)" muestra ese atajo como atajo. Sin
// texto (null / undefined / "") no hay tooltip. Sale abajo del elemento, o
// arriba si abajo no entra (placement: "above" lo prefiere arriba). Un solo
// elemento compartido; va en la capa superior (popover) para quedar encima
// de los modales.

export type TooltipParams =
  | string
  | null
  | undefined
  | { label: string | null | undefined; shortcut?: string; placement?: "below" | "above" };

const SHOW_DELAY_MS = 350;
const GAP_PX = 6;
const EDGE_PX = 8;

let element: HTMLDivElement | null = null;
let labelSpan: HTMLSpanElement;
let shortcutSpan: HTMLSpanElement;
let timer: ReturnType<typeof setTimeout> | null = null;
let owner: HTMLElement | null = null;

const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

function ensureElement(): HTMLDivElement {
  if (element) return element;
  element = document.createElement("div");
  element.className = "app-tooltip";
  element.setAttribute("role", "tooltip");
  if (supportsPopover) element.setAttribute("popover", "manual");
  labelSpan = document.createElement("span");
  shortcutSpan = document.createElement("span");
  shortcutSpan.className = "app-tooltip-shortcut";
  element.append(labelSpan, shortcutSpan);
  document.body.append(element);
  return element;
}

interface Resolved {
  label: string;
  shortcut: string;
  placement: "below" | "above";
}

// Atajo al final del texto: "(Shift+Enter)", "(Alt+N)", "(Ctrl+Z)".
const TRAILING_SHORTCUT = /^(.*\S)\s+\(((?:[A-Za-z0-9]+\+)+[A-Za-z0-9]+|F\d{1,2})\)$/;

function resolve(params: TooltipParams): Resolved | null {
  if (!params) return null;
  const raw = typeof params === "string" ? { label: params } : params;
  if (!raw.label) return null;
  let label = raw.label;
  let shortcut = typeof params === "string" ? "" : (params.shortcut ?? "");
  if (!shortcut) {
    const match = label.match(TRAILING_SHORTCUT);
    if (match) [, label, shortcut] = match;
  }
  return {
    label,
    shortcut: prettyShortcut(shortcut),
    placement: typeof params === "string" ? "below" : (params.placement ?? "below"),
  };
}

function prettyShortcut(keys: string): string {
  if (!keys) return "";
  return shortcutKeyParts(keys)
    .map((key) => (key === "Insert" ? get(t)("results.key.insert") : key))
    .join("+");
}

function place(anchor: HTMLElement, tip: HTMLDivElement, placement: "below" | "above") {
  const rect = anchor.getBoundingClientRect();
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  const fitsBelow = rect.bottom + GAP_PX + height <= window.innerHeight - EDGE_PX;
  const fitsAbove = rect.top - GAP_PX - height >= EDGE_PX;
  const above = placement === "above" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
  const top = above ? rect.top - GAP_PX - height : rect.bottom + GAP_PX;
  const center = rect.left + rect.width / 2;
  const left = Math.min(Math.max(center - width / 2, EDGE_PX), window.innerWidth - EDGE_PX - width);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function show(anchor: HTMLElement, resolved: Resolved) {
  const tip = ensureElement();
  owner = anchor;
  labelSpan.textContent = resolved.label;
  shortcutSpan.textContent = resolved.shortcut;
  shortcutSpan.hidden = resolved.shortcut === "";
  if (supportsPopover) {
    // Volver a abrirlo lo pone al final de la capa superior: encima de un
    // modal abierto despues.
    if (tip.matches(":popover-open")) tip.hidePopover();
    tip.showPopover();
  }
  tip.classList.add("visible");
  place(anchor, tip, resolved.placement);
}

function hide(anchor?: HTMLElement) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (anchor && owner !== anchor) return;
  owner = null;
  if (!element) return;
  element.classList.remove("visible");
  if (supportsPopover && element.matches(":popover-open")) element.hidePopover();
}

// El mismo tooltip, pedido a mano: para lo que no pasa por Svelte (las
// celdas del grid se arman como HTML, ver DataGrid.svelte). Sale con la
// misma demora; `hideTooltipFor` lo quita si es de ese elemento.
export function scheduleTooltipFor(anchor: HTMLElement, params: TooltipParams) {
  const resolved = resolve(params);
  if (!resolved) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (anchor.isConnected) show(anchor, resolved);
  }, SHOW_DELAY_MS);
}

export function hideTooltipFor(anchor: HTMLElement) {
  hide(anchor);
}

export function tooltip(node: HTMLElement, params: TooltipParams) {
  let resolved = resolve(params);
  let ownAriaLabel = false;

  // Un boton de solo icono se quedaba sin nombre accesible al quitar el
  // title: el tooltip se lo da si no tiene uno propio.
  function syncAriaLabel() {
    const needsName = !node.hasAttribute("aria-label") || ownAriaLabel;
    const hasText = (node.textContent ?? "").trim() !== "";
    if (resolved && needsName && !hasText && node.tagName === "BUTTON") {
      node.setAttribute("aria-label", resolved.label);
      ownAriaLabel = true;
    } else if (ownAriaLabel && !resolved) {
      node.removeAttribute("aria-label");
      ownAriaLabel = false;
    }
  }

  function schedule() {
    if (!resolved) return;
    const current = resolved;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => show(node, current), SHOW_DELAY_MS);
  }

  function onFocus() {
    if (node.matches(":focus-visible")) schedule();
  }

  function onLeave() {
    hide(node);
  }

  syncAriaLabel();
  node.addEventListener("pointerenter", schedule);
  node.addEventListener("pointerleave", onLeave);
  node.addEventListener("focus", onFocus);
  node.addEventListener("blur", onLeave);
  node.addEventListener("pointerdown", onLeave);
  node.addEventListener("keydown", onLeave);
  window.addEventListener("scroll", onLeave, true);

  return {
    update(next: TooltipParams) {
      resolved = resolve(next);
      syncAriaLabel();
      if (owner === node) {
        if (resolved) show(node, resolved);
        else hide(node);
      }
    },
    destroy() {
      hide(node);
      node.removeEventListener("pointerenter", schedule);
      node.removeEventListener("pointerleave", onLeave);
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("blur", onLeave);
      node.removeEventListener("pointerdown", onLeave);
      node.removeEventListener("keydown", onLeave);
      window.removeEventListener("scroll", onLeave, true);
    },
  };
}
