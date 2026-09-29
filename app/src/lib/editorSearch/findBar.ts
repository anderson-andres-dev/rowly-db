import { findNext, findPrevious } from "@codemirror/search";
import { get } from "svelte/store";
import { numberFormat, translate } from "$lib/i18n";
import { MAX_COUNTED, type MatchStatus } from "./counter";
import { autosize, element, icon, label, textField, toggleButton } from "./dom";
import type { SearchSession } from "./session";
import type { SearchMode } from "./state";

export interface FindBar {
  readonly dom: HTMLElement;
  focus(): void;
  applyTexts(): void;
  syncQuery(): void;
  setMode(mode: SearchMode): void;
  setScoped(scoped: boolean): void;
  showStatus(status: MatchStatus): void;
}

export interface FindBarActions {
  toggleMode(): void;
  close(): void;
  clearScope(): void;
}

// Fila de buscar: chevron (pasa a reemplazar), campo con Cc/W/.*, alcance
// "en la seleccion", estado "12/48", anterior/siguiente y cerrar.
export function createFindBar(session: SearchSession, actions: FindBarActions): FindBar {
  const { view } = session;
  const dom = element("div", "kh-search-row kh-search-find");

  const expand = element("button", "kh-search-icon-button kh-search-expand", {
    type: "button",
    "aria-expanded": "false",
  });
  expand.innerHTML = icon("chevron");

  const find = textField("find");
  const caseButton = toggleButton("Cc");
  const wordButton = toggleButton("W");
  const regexButton = toggleButton(".*", true);
  find.field.append(caseButton, wordButton, regexButton);

  const scope = element("button", "kh-search-scope", { type: "button", hidden: "" });
  const status = element("span", "kh-search-status", { "aria-live": "polite" });
  const previous = element("button", "kh-search-icon-button", { type: "button" });
  previous.innerHTML = icon("up");
  const next = element("button", "kh-search-icon-button", { type: "button" });
  next.innerHTML = icon("down");
  const close = element("button", "kh-search-icon-button kh-search-close", { type: "button" });
  close.innerHTML = icon("close");

  dom.append(expand, find.field, scope, status, previous, next, close);

  find.area.addEventListener("input", () => {
    autosize(find.area);
    session.commit({ search: find.area.value });
  });
  find.area.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.key !== "Enter") return;
    event.preventDefault();
    if (event.shiftKey) findPrevious(view);
    else findNext(view);
  });
  caseButton.addEventListener("click", () => session.commit({ caseSensitive: !session.query.caseSensitive }));
  wordButton.addEventListener("click", () => session.commit({ wholeWord: !session.query.wholeWord }));
  regexButton.addEventListener("click", () => session.commit({ regexp: !session.query.regexp }));
  expand.addEventListener("click", actions.toggleMode);
  scope.addEventListener("click", () => {
    actions.clearScope();
    find.area.focus();
  });
  previous.addEventListener("click", () => findPrevious(view));
  next.addEventListener("click", () => findNext(view));
  close.addEventListener("click", actions.close);

  function syncQuery() {
    const { query } = session;
    if (find.area.value !== query.search) {
      find.area.value = query.search;
      autosize(find.area);
    }
    caseButton.setAttribute("aria-pressed", String(query.caseSensitive));
    wordButton.setAttribute("aria-pressed", String(query.wholeWord));
    regexButton.setAttribute("aria-pressed", String(query.regexp));
  }

  syncQuery();
  autosize(find.area);

  return {
    dom,
    focus() {
      find.area.focus();
      find.area.select();
    },
    applyTexts() {
      label(expand, translate("editor.search.replace"), translate("editor.search.showReplace"));
      find.area.placeholder = translate("editor.search.find");
      find.area.setAttribute("aria-label", translate("editor.search.findLabel"));
      label(find.newline, translate("editor.search.insertNewlineTitle"), translate("editor.search.insertNewline"));
      label(caseButton, translate("editor.search.caseSensitive"));
      label(wordButton, translate("editor.search.wholeWord"));
      label(regexButton, translate("editor.search.regexp"));
      label(previous, translate("editor.search.previous"), translate("editor.search.previousLabel"));
      label(next, translate("editor.search.next"), translate("editor.search.nextLabel"));
      label(close, translate("editor.search.close"), translate("editor.search.closeLabel"));
      scope.title = translate("editor.search.inSelectionTitle");
      scope.textContent = translate("editor.search.inSelection");
    },
    syncQuery,
    setMode(mode) {
      expand.setAttribute("aria-expanded", String(mode === "replace"));
    },
    setScoped(scoped) {
      scope.hidden = !scoped;
    },
    showStatus(result) {
      status.classList.toggle("error", result.kind === "invalid");
      const found = result.kind === "counted" && result.count > 0;
      previous.disabled = next.disabled = !found;
      if (result.kind === "empty") {
        status.textContent = "";
      } else if (result.kind === "invalid") {
        status.textContent = translate("editor.search.invalid");
      } else {
        const format = get(numberFormat);
        const total = `${format.format(result.count)}${result.count >= MAX_COUNTED ? "+" : ""}`;
        if (result.count === 0) status.textContent = translate("editor.search.noResults");
        else if (result.current >= 0) status.textContent = `${format.format(result.current + 1)}/${total}`;
        else
          status.textContent = translate(result.count === 1 ? "editor.search.resultsOne" : "editor.search.resultsOther", {
            count: total,
          });
      }
    },
  };
}
