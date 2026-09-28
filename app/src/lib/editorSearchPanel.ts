import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  search,
  searchPanelOpen,
  setSearchQuery,
} from "@codemirror/search";
import { Prec, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type Panel,
  type ViewUpdate,
} from "@codemirror/view";
import { get } from "svelte/store";
import { locale, numberFormat, translate } from "$lib/i18n";

// Buscar y reemplazar del editor SQL, en lugar del panel por defecto de
// CodeMirror, al estilo DataGrip:
//
//   - Ctrl+F: buscar (toggle). Ctrl+R: buscar y reemplazar (toggle).
//   - Campos de varias lineas (crecen solos): se pueden buscar y reemplazar
//     saltos de linea. El boton ⏎ o Ctrl+Shift+Intro insertan uno.
//   - En el editor: todas las coincidencias resaltadas, la actual mas
//     intensa, y un marcador ⏎ al final de cada linea cuyo salto forma
//     parte de una coincidencia (se ve que se reemplaza tambien el salto).
//   - Reemplazar (la actual y pasa a la siguiente), Reemplazar todo (en UNA
//     transaccion: un solo Ctrl+Z la deshace), Excluir (la actual queda
//     tachada y fuera del reemplazo), Aa preservar mayusculas, y grupos $1
//     con expresion regular.
//
// Es DOM plano (lo crea CodeMirror, fuera de Svelte); sus estilos estan en
// styles/editorSearch.css. Los textos se vuelven a poner al cambiar el idioma
// (applyTexts, suscrito a `locale` mientras el panel esta montado).

const MAX_COUNTED = 1000;
const COUNT_CHUNK = 1024 * 1024;
const COUNT_OVERLAP = 64 * 1024;
const MAX_FIELD_LINES = 6;

// --- Coincidencias excluidas -----------------------------------------------
// Rangos que el usuario saco del reemplazo. Se mapean con cada cambio del
// documento (siguen marcando el mismo texto) y se vacian al cambiar la
// busqueda.

const addExclusion = StateEffect.define<{ from: number; to: number }>();
const clearExclusions = StateEffect.define<null>();

const exclusionField = StateField.define<{ from: number; to: number }[]>({
  create: () => [],
  update(value, transaction) {
    let next = value;
    if (transaction.docChanged) {
      next = next
        .map((range) => ({
          from: transaction.changes.mapPos(range.from, 1),
          to: transaction.changes.mapPos(range.to, -1),
        }))
        .filter((range) => range.to > range.from);
    }
    for (const effect of transaction.effects) {
      if (effect.is(addExclusion)) next = [...next, effect.value];
      if (effect.is(clearExclusions)) next = [];
      // Otra busqueda: las exclusiones eran de la anterior.
      if (effect.is(setSearchQuery) && effect.value.search !== getSearchQuery(transaction.startState).search) next = [];
    }
    return next;
  },
});

function isExcluded(state: EditorState, from: number, to: number): boolean {
  return state.field(exclusionField, false)?.some((range) => range.from === from && range.to === to) ?? false;
}

// Tachado sobre lo excluido.
const exclusionMarks = EditorView.decorations.compute([exclusionField], (state) => {
  const ranges = state.field(exclusionField);
  return Decoration.set(
    ranges.map((range) => Decoration.mark({ class: "kh-search-excluded" }).range(range.from, range.to)),
    true,
  );
});

// --- Marcador de salto de linea ----------------------------------------------

class NewlineMarker extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "kh-search-newline";
    span.textContent = "⏎";
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  eq() {
    return true;
  }
  ignoreEvent() {
    return true;
  }
}

const newlineMarker = Decoration.widget({ widget: new NewlineMarker(), side: 1 });

// Solo lo visible: recorrer el documento entero en cada tecla no escala.
function newlineDecorations(view: EditorView): DecorationSet {
  if (!searchPanelOpen(view.state)) return Decoration.none;
  const query = getSearchQuery(view.state);
  if (!query.search || !query.valid || !/\n|\\n|\\s/.test(query.search)) return Decoration.none;
  const marks: { pos: number }[] = [];
  for (const { from, to } of view.visibleRanges) {
    const cursor = query.getCursor(view.state, Math.max(0, from - 500), Math.min(view.state.doc.length, to + 500));
    for (let step = cursor.next(); !step.done && marks.length < 2000; step = cursor.next()) {
      const text = view.state.sliceDoc(step.value.from, step.value.to);
      for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) {
        marks.push({ pos: step.value.from + index });
      }
    }
  }
  return Decoration.set(
    marks.map((mark) => newlineMarker.range(mark.pos)),
    true,
  );
}

const newlineMarkers = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = newlineDecorations(view);
    }
    update(update: ViewUpdate) {
      const queryChanged = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(setSearchQuery)),
      );
      if (update.docChanged || update.viewportChanged || queryChanged || update.selectionSet) {
        this.decorations = newlineDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// --- Reemplazo -------------------------------------------------------------

// Aa: el reemplazo copia el formato de lo encontrado (TODO MAYUSCULAS,
// Primera mayuscula o todo minusculas); otro formato, tal cual.
function preserveCase(replacement: string, matched: string): string {
  const letters = matched.replace(/[^\p{L}]/gu, "");
  if (!letters) return replacement;
  if (letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return replacement.toUpperCase();
  if (letters === letters.toLowerCase()) return replacement.toLowerCase();
  const first = letters[0];
  if (first === first.toUpperCase() && letters.slice(1) === letters.slice(1).toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  return replacement;
}

interface ReplaceOptions {
  preserveCase: boolean;
}

function replacementFor(query: SearchQuery, matched: string, options: ReplaceOptions): string {
  let replacement = query.replace;
  if (query.regexp) {
    // Grupos $1, $2... del patron, aplicados a lo encontrado.
    try {
      const pattern = new RegExp(query.search, query.caseSensitive ? "u" : "iu");
      replacement = matched.replace(pattern, query.replace);
    } catch {
      replacement = query.replace;
    }
  }
  return options.preserveCase ? preserveCase(replacement, matched) : replacement;
}

function matchesIn(state: EditorState, query: SearchQuery): { from: number; to: number }[] {
  const result: { from: number; to: number }[] = [];
  const cursor = query.getCursor(state);
  for (let step = cursor.next(); !step.done; step = cursor.next()) result.push(step.value);
  return result;
}

// La coincidencia sobre la que esta la seleccion (la "actual"), si hay.
function currentMatch(state: EditorState, query: SearchQuery): { from: number; to: number } | null {
  const selection = state.selection.main;
  if (selection.empty) return null;
  const cursor = query.getCursor(state, selection.from, selection.to);
  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    if (step.value.from === selection.from && step.value.to === selection.to) return step.value;
  }
  return null;
}

// Reemplaza la actual y deja seleccionada la siguiente (el editor muestra
// cada paso). Sin una actual, primero va a la siguiente.
function replaceCurrent(view: EditorView, options: ReplaceOptions): boolean {
  const query = getSearchQuery(view.state);
  if (!query.search || !query.valid) return false;
  const match = currentMatch(view.state, query);
  if (!match) return findNext(view);
  const matched = view.state.sliceDoc(match.from, match.to);
  const insert = replacementFor(query, matched, options);
  view.dispatch({
    changes: { from: match.from, to: match.to, insert },
    selection: { anchor: match.from + insert.length },
    userEvent: "input.replace",
  });
  findNext(view);
  return true;
}

// Todas las coincidencias (salvo las excluidas) en UNA transaccion.
function replaceEverything(view: EditorView, options: ReplaceOptions): number {
  const query = getSearchQuery(view.state);
  if (!query.search || !query.valid) return 0;
  const matches = matchesIn(view.state, query);
  if (matches.length === 0) return 0;
  const changes = matches.map((match) => ({
    from: match.from,
    to: match.to,
    insert: replacementFor(query, view.state.sliceDoc(match.from, match.to), options),
  }));
  view.dispatch({ changes, userEvent: "input.replace.all", scrollIntoView: true });
  return changes.length;
}

// --- Panel -----------------------------------------------------------------

const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  newline: '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
  replace: '<path d="M14 4a2 2 0 0 1 2-2"/><path d="M16 10a2 2 0 0 1-2-2"/><path d="M20 2a2 2 0 0 1 2 2"/><path d="M22 8a2 2 0 0 1-2 2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5a3 3 0 0 1 3-3h1"/><rect x="2" y="14" width="8" height="8" rx="2"/>',
};

function icon(name: keyof typeof ICONS, size = 14): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function createSearchPanel(view: EditorView): Panel {
  let query = getSearchQuery(view.state);
  const replaceOptions: ReplaceOptions = { preserveCase: false };

  const dom = element("div", "kh-search-panel", { role: "search" });

  // --- Fila de busqueda
  const findRow = element("div", "kh-search-row");
  const expand = element("button", "kh-search-icon-button kh-search-expand", {
    type: "button",
    "aria-expanded": "false",
  });
  expand.innerHTML = icon("chevron");

  function textField(main: boolean) {
    const field = element("div", "kh-search-field");
    const lens = element("span", "kh-search-lens");
    lens.innerHTML = icon(main ? "search" : "replace");
    const area = element("textarea", "kh-search-input", {
      rows: "1",
      spellcheck: "false",
      autocomplete: "off",
      ...(main ? { "main-field": "true" } : {}),
    });
    const newline = element("button", "kh-search-toggle kh-search-newline-button", { type: "button" });
    newline.innerHTML = icon("newline", 13);
    field.append(lens, area, newline);
    return { field, area, newline };
  }

  const find = textField(true);
  find.area.value = query.search;

  const toggle = (label: string, mono = false) => {
    const button = element("button", `kh-search-toggle${mono ? " mono" : ""}`, {
      type: "button",
      "aria-pressed": "false",
    });
    button.textContent = label;
    return button;
  };
  const caseButton = toggle("Cc");
  const wordButton = toggle("W");
  const regexButton = toggle(".*", true);
  find.field.append(caseButton, wordButton, regexButton);

  const status = element("span", "kh-search-status", { "aria-live": "polite" });
  const previous = element("button", "kh-search-icon-button", { type: "button" });
  previous.innerHTML = icon("up");
  const next = element("button", "kh-search-icon-button", { type: "button" });
  next.innerHTML = icon("down");
  const close = element("button", "kh-search-icon-button kh-search-close", { type: "button" });
  close.innerHTML = icon("close");
  findRow.append(expand, find.field, status, previous, next, close);

  // --- Fila de reemplazar
  const replaceRow = element("div", "kh-search-row kh-search-replace");
  replaceRow.hidden = true;
  const replace = textField(false);
  replace.area.value = query.replace;
  const caseKeep = toggle("Aa");
  replace.field.append(caseKeep);
  const replaceOne = element("button", "kh-search-text-button", { type: "button" });
  const replaceEvery = element("button", "kh-search-text-button", { type: "button" });
  const exclude = element("button", "kh-search-text-button", { type: "button" });
  replaceRow.append(element("span", "kh-search-spacer"), replace.field, replaceOne, replaceEvery, exclude);

  dom.append(findRow, replaceRow);

  function label(node: HTMLElement, title: string, ariaLabel?: string) {
    node.title = title;
    if (ariaLabel) node.setAttribute("aria-label", ariaLabel);
  }

  function applyTexts() {
    label(expand, translate("editor.search.replace"), translate("editor.search.showReplace"));
    find.area.placeholder = translate("editor.search.find");
    find.area.setAttribute("aria-label", translate("editor.search.findLabel"));
    replace.area.placeholder = translate("editor.search.replaceWith");
    replace.area.setAttribute("aria-label", translate("editor.search.replaceWith"));
    for (const field of [find, replace]) {
      label(field.newline, translate("editor.search.insertNewlineTitle"), translate("editor.search.insertNewline"));
    }
    label(caseButton, translate("editor.search.caseSensitive"));
    label(wordButton, translate("editor.search.wholeWord"));
    label(regexButton, translate("editor.search.regexp"));
    label(caseKeep, translate("editor.search.preserveCase"));
    label(previous, translate("editor.search.previous"), translate("editor.search.previousLabel"));
    label(next, translate("editor.search.next"), translate("editor.search.nextLabel"));
    label(close, translate("editor.search.close"), translate("editor.search.closeLabel"));
    label(replaceOne, translate("editor.search.replaceTitle"));
    replaceOne.textContent = translate("editor.search.replace");
    label(replaceEvery, translate("editor.search.replaceAllTitle"));
    replaceEvery.textContent = translate("editor.search.replaceAll");
    label(exclude, translate("editor.search.excludeTitle"));
    exclude.textContent = translate("editor.search.exclude");
  }

  // --- Estado

  function autosize(area: HTMLTextAreaElement) {
    const lines = Math.min(MAX_FIELD_LINES, Math.max(1, area.value.split("\n").length));
    area.rows = lines;
    area.classList.toggle("multiline", lines > 1);
  }

  function syncToggles() {
    caseButton.setAttribute("aria-pressed", String(query.caseSensitive));
    wordButton.setAttribute("aria-pressed", String(query.wholeWord));
    regexButton.setAttribute("aria-pressed", String(query.regexp));
    caseKeep.setAttribute("aria-pressed", String(replaceOptions.preserveCase));
  }

  function buildQuery(patch: Partial<{ search: string; caseSensitive: boolean; regexp: boolean; wholeWord: boolean; replace: string }>) {
    return new SearchQuery({
      search: patch.search ?? query.search,
      caseSensitive: patch.caseSensitive ?? query.caseSensitive,
      regexp: patch.regexp ?? query.regexp,
      wholeWord: patch.wholeWord ?? query.wholeWord,
      replace: patch.replace ?? query.replace,
      // Lo que se escribe es lo que se busca: un salto de linea real en el
      // campo es un salto de linea (sin interpretar "\n" escrito a mano,
      // salvo con expresion regular).
      literal: true,
      test: (_match, state, from, to) => !isExcluded(state, from, to),
    });
  }

  function commit(patch: Parameters<typeof buildQuery>[0], force = false) {
    const nextQuery = buildQuery(patch);
    if (!force && nextQuery.eq(query)) return;
    query = nextQuery;
    view.dispatch({ effects: setSearchQuery.of(query) });
  }

  // "12/48" si la seleccion esta sobre una coincidencia, si no "48
  // resultados". Se cuenta hasta MAX_COUNTED.
  function refreshStatus() {
    const has = !!query.search && query.valid;
    for (const button of [replaceOne, replaceEvery, exclude, previous, next]) button.disabled = !has;
    if (!query.search) {
      status.textContent = "";
      status.classList.remove("error");
      return;
    }
    if (!query.valid) {
      status.textContent = translate("editor.search.invalid");
      status.classList.add("error");
      return;
    }
    status.classList.remove("error");
    countMatches();
  }

  // Se cuenta por trozos de COUNT_CHUNK, cediendo entre ellos: con un
  // documento de 30 MB y pocas coincidencias, contar de una vez congela la
  // escritura (docs/specs/v0.2-documentos-grandes.md, 15e). Un conteo nuevo
  // deja sin efecto al anterior.
  let countRun = 0;

  function countMatches() {
    const run = ++countRun;
    const state = view.state;
    const selection = state.selection.main;
    const length = state.doc.length;
    let count = 0;
    let current = -1;
    let windowFrom = 0;
    // Una coincidencia que cruza el corte se cuenta en el trozo donde
    // empieza; el siguiente se salta lo que ya cubrio.
    let lastEnd = 0;

    const step = () => {
      if (run !== countRun) return;
      const deadline = performance.now() + 8;
      while (windowFrom < length && count < MAX_COUNTED) {
        const windowTo = Math.min(length, windowFrom + COUNT_CHUNK);
        const cursor = query.getCursor(state, windowFrom, Math.min(length, windowTo + COUNT_OVERLAP));
        for (let found = cursor.next(); !found.done; found = cursor.next()) {
          const match = found.value;
          if (match.from >= windowTo && windowTo < length) break;
          if (match.from < lastEnd) continue;
          if (match.from === selection.from && match.to === selection.to) current = count;
          count++;
          lastEnd = Math.max(match.to, match.from + 1);
          if (count >= MAX_COUNTED) break;
        }
        windowFrom = windowTo;
        if (performance.now() > deadline && windowFrom < length && count < MAX_COUNTED) {
          setTimeout(step, 0);
          return;
        }
      }
      showCount(count, current);
    };
    step();
  }

  function showCount(count: number, current: number) {
    const format = get(numberFormat);
    const total = `${format.format(count)}${count >= MAX_COUNTED ? "+" : ""}`;
    for (const button of [replaceOne, replaceEvery, exclude, previous, next]) button.disabled = count === 0;
    exclude.disabled = current < 0;
    if (count === 0) status.textContent = translate("editor.search.noResults");
    else if (current >= 0) status.textContent = `${format.format(current + 1)}/${total}`;
    else status.textContent = translate(count === 1 ? "editor.search.resultsOne" : "editor.search.resultsOther", { count: total });
  }

  function setExpanded(expanded: boolean) {
    replaceRow.hidden = !expanded;
    expand.setAttribute("aria-expanded", String(expanded));
    dom.classList.toggle("expanded", expanded);
  }

  function closePanel() {
    closeSearchPanel(view);
    view.focus();
  }

  function insertNewline(area: HTMLTextAreaElement) {
    const start = area.selectionStart;
    const end = area.selectionEnd;
    area.value = `${area.value.slice(0, start)}\n${area.value.slice(end)}`;
    area.selectionStart = area.selectionEnd = start + 1;
    area.dispatchEvent(new Event("input"));
    area.focus();
  }

  function excludeCurrent() {
    const match = currentMatch(view.state, query);
    if (!match) return;
    view.dispatch({ effects: addExclusion.of(match) });
    // Misma busqueda, consulta nueva: CodeMirror vuelve a filtrar (test) y
    // lo excluido deja de contarse y resaltarse como coincidencia.
    commit({}, true);
    findNext(view);
  }

  find.area.addEventListener("input", () => {
    autosize(find.area);
    commit({ search: find.area.value });
  });
  replace.area.addEventListener("input", () => {
    autosize(replace.area);
    commit({ replace: replace.area.value });
  });
  find.newline.addEventListener("click", () => insertNewline(find.area));
  replace.newline.addEventListener("click", () => insertNewline(replace.area));
  caseButton.addEventListener("click", () => commit({ caseSensitive: !query.caseSensitive }));
  wordButton.addEventListener("click", () => commit({ wholeWord: !query.wholeWord }));
  regexButton.addEventListener("click", () => commit({ regexp: !query.regexp }));
  caseKeep.addEventListener("click", () => {
    replaceOptions.preserveCase = !replaceOptions.preserveCase;
    syncToggles();
  });
  previous.addEventListener("click", () => findPrevious(view));
  next.addEventListener("click", () => findNext(view));
  close.addEventListener("click", closePanel);
  replaceOne.addEventListener("click", () => replaceCurrent(view, replaceOptions));
  replaceEvery.addEventListener("click", () => replaceEverything(view, replaceOptions));
  exclude.addEventListener("click", excludeCurrent);
  expand.addEventListener("click", () => {
    const expanded = Boolean(replaceRow.hidden);
    setExpanded(expanded);
    (expanded ? replace.area : find.area).focus();
  });

  dom.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const inReplace = event.target === replace.area;
    const inFind = event.target === find.area;
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    } else if (mod && !event.shiftKey && key === "f") {
      // Toggle: con la barra abierta, Ctrl+F la cierra (reemplazar se
      // despliega con el chevron).
      event.preventDefault();
      closePanel();
    } else if (event.key === "Enter" && mod && event.shiftKey && (inFind || inReplace)) {
      event.preventDefault();
      insertNewline(event.target as HTMLTextAreaElement);
    } else if (event.key === "Enter" && inFind) {
      event.preventDefault();
      if (event.shiftKey) findPrevious(view);
      else findNext(view);
    } else if (event.key === "Enter" && inReplace) {
      event.preventDefault();
      if (mod) replaceEverything(view, replaceOptions);
      else replaceCurrent(view, replaceOptions);
    }
  });

  syncToggles();
  autosize(find.area);
  autosize(replace.area);
  setExpanded(false);
  applyTexts();

  let unsubscribeLocale: (() => void) | undefined;

  return {
    dom,
    top: true,
    mount() {
      // subscribe llama enseguida: pone los textos del idioma vigente.
      unsubscribeLocale = locale.subscribe(() => {
        applyTexts();
        refreshStatus();
      });
      find.area.focus();
      find.area.select();
    },
    destroy() {
      unsubscribeLocale?.();
    },
    update(update: ViewUpdate) {
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (!effect.is(setSearchQuery) || effect.value === query) continue;
          // Cambio de consulta desde afuera (Ctrl+F con texto seleccionado):
          // se refleja en los campos y se mantiene el filtro de excluidos.
          const external = effect.value;
          query = buildQuery({
            search: external.search,
            caseSensitive: external.caseSensitive,
            regexp: external.regexp,
            wholeWord: external.wholeWord,
            replace: external.replace,
          });
          find.area.value = query.search;
          replace.area.value = query.replace;
          autosize(find.area);
          autosize(replace.area);
          queueMicrotask(() => view.dispatch({ effects: setSearchQuery.of(query) }));
        }
      }
      syncToggles();
      // Solo lo que cambia el conteo: no los efectos de fondo del editor
      // (indice de sentencias, analisis).
      if (
        update.docChanged ||
        update.selectionSet ||
        update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(setSearchQuery) || effect.is(addExclusion) || effect.is(clearExclusions)),
        )
      ) {
        refreshStatus();
      }
    },
  };
}

// --- Atajo -----------------------------------------------------------------
// Ctrl+F es un toggle: abre la barra (reemplazar se despliega con el
// chevron) o la cierra si ya esta abierta.

export function toggleSearchPanel(view: EditorView): boolean {
  if (searchPanelOpen(view.state)) {
    closeSearchPanel(view);
    view.focus();
    return true;
  }
  return openSearchPanel(view);
}

export function editorSearch(): Extension {
  return [
    search({ top: true, createPanel: createSearchPanel }),
    exclusionField,
    exclusionMarks,
    newlineMarkers,
    Prec.highest(
      keymap.of([
        { key: "Mod-f", run: toggleSearchPanel, preventDefault: true },
      ]),
    ),
  ];
}

// Para tests.
export const __test = { preserveCase };
