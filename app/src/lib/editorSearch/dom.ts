// Piezas de DOM plano comunes a las barras de buscar y reemplazar (las crea
// CodeMirror fuera de Svelte; estilos en styles/editorSearch.css).

const MAX_FIELD_LINES = 6;

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  newline: '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
  replace: '<path d="M14 4a2 2 0 0 1 2-2"/><path d="M16 10a2 2 0 0 1-2-2"/><path d="M20 2a2 2 0 0 1 2 2"/><path d="M22 8a2 2 0 0 1-2 2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5a3 3 0 0 1 3-3h1"/><rect x="2" y="14" width="8" height="8" rx="2"/>',
};

export function icon(name: keyof typeof ICONS, size = 14): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

export function label(node: HTMLElement, title: string, ariaLabel?: string) {
  node.title = title;
  if (ariaLabel) node.setAttribute("aria-label", ariaLabel);
}

export function toggleButton(text: string, mono = false): HTMLButtonElement {
  const button = element("button", `kh-search-toggle${mono ? " mono" : ""}`, {
    type: "button",
    "aria-pressed": "false",
  });
  button.textContent = text;
  return button;
}

// Campo de varias lineas (crece solo): se pueden buscar y reemplazar saltos
// de linea. El boton ⏎ o Ctrl+Shift+Intro insertan uno.
export function textField(kind: "find" | "replace") {
  const field = element("div", "kh-search-field");
  const lens = element("span", "kh-search-lens");
  lens.innerHTML = icon(kind === "find" ? "search" : "replace");
  const area = element("textarea", "kh-search-input", {
    rows: "1",
    spellcheck: "false",
    autocomplete: "off",
    // CodeMirror enfoca el campo marcado como principal del panel.
    ...(kind === "find" ? { "main-field": "true" } : {}),
  });
  const newline = element("button", "kh-search-toggle kh-search-newline-button", { type: "button" });
  newline.innerHTML = icon("newline", 13);
  newline.addEventListener("click", () => insertNewline(area));
  area.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && event.shiftKey) {
      event.preventDefault();
      insertNewline(area);
    }
  });
  field.append(lens, area, newline);
  return { field, area, newline };
}

export function autosize(area: HTMLTextAreaElement) {
  const lines = Math.min(MAX_FIELD_LINES, Math.max(1, area.value.split("\n").length));
  area.rows = lines;
  area.classList.toggle("multiline", lines > 1);
}

function insertNewline(area: HTMLTextAreaElement) {
  const start = area.selectionStart;
  const end = area.selectionEnd;
  area.value = `${area.value.slice(0, start)}\n${area.value.slice(end)}`;
  area.selectionStart = area.selectionEnd = start + 1;
  area.dispatchEvent(new Event("input"));
  area.focus();
}
