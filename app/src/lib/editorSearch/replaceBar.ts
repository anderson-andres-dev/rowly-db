import { findNext } from "@codemirror/search";
import { translate } from "$lib/i18n";
import type { MatchStatus } from "./counter";
import { autosize, element, label, textField, toggleButton } from "./dom";
import { replaceCurrent, replaceEverything } from "./replace";
import type { SearchSession } from "./session";
import { addExclusion, currentMatch } from "./state";

export interface ReplaceBar {
  readonly dom: HTMLElement;
  focus(): void;
  applyTexts(): void;
  syncQuery(): void;
  showStatus(status: MatchStatus): void;
}

// Fila de reemplazar: campo con Aa (preservar mayusculas), Reemplazar (la
// actual y pasa a la siguiente), Reemplazar todo (Ctrl+Intro) y Excluir (la
// actual queda tachada y fuera del reemplazo). Solo existe en modo
// reemplazar.
export function createReplaceBar(session: SearchSession): ReplaceBar {
  const { view, replaceOptions } = session;
  const dom = element("div", "kh-search-row kh-search-replace");

  const replace = textField("replace");
  const caseKeep = toggleButton("Aa");
  caseKeep.classList.add("kh-search-preserve-case");
  replace.field.append(caseKeep);
  const replaceOne = element("button", "kh-search-text-button kh-search-replace-one", { type: "button" });
  const replaceAll = element("button", "kh-search-text-button kh-search-replace-all", { type: "button" });
  const exclude = element("button", "kh-search-text-button kh-search-exclude", { type: "button" });
  // El espaciador alinea el campo con el de buscar (debajo del chevron).
  dom.append(element("span", "kh-search-spacer"), replace.field, replaceOne, replaceAll, exclude);

  function excludeCurrent() {
    const match = currentMatch(view.state, session.query);
    if (!match) return;
    view.dispatch({ effects: addExclusion.of(match) });
    // Misma busqueda, consulta nueva: CodeMirror vuelve a filtrar y lo
    // excluido deja de contarse y resaltarse.
    session.commit({}, true);
    findNext(view);
  }

  replace.area.addEventListener("input", () => {
    autosize(replace.area);
    session.commit({ replace: replace.area.value });
  });
  replace.area.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.key !== "Enter") return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) replaceEverything(view, replaceOptions);
    else replaceCurrent(view, replaceOptions);
  });
  caseKeep.addEventListener("click", () => {
    replaceOptions.preserveCase = !replaceOptions.preserveCase;
    caseKeep.setAttribute("aria-pressed", String(replaceOptions.preserveCase));
  });
  replaceOne.addEventListener("click", () => replaceCurrent(view, replaceOptions));
  replaceAll.addEventListener("click", () => replaceEverything(view, replaceOptions));
  exclude.addEventListener("click", excludeCurrent);

  function syncQuery() {
    if (replace.area.value !== session.query.replace) {
      replace.area.value = session.query.replace;
      autosize(replace.area);
    }
    caseKeep.setAttribute("aria-pressed", String(replaceOptions.preserveCase));
  }

  syncQuery();
  autosize(replace.area);

  return {
    dom,
    focus() {
      replace.area.focus();
      replace.area.select();
    },
    applyTexts() {
      replace.area.placeholder = translate("editor.search.replaceWith");
      replace.area.setAttribute("aria-label", translate("editor.search.replaceWith"));
      label(replace.newline, translate("editor.search.insertNewlineTitle"), translate("editor.search.insertNewline"));
      label(caseKeep, translate("editor.search.preserveCase"));
      label(replaceOne, translate("editor.search.replaceTitle"));
      replaceOne.textContent = translate("editor.search.replace");
      label(replaceAll, translate("editor.search.replaceAllTitle"));
      replaceAll.textContent = translate("editor.search.replaceAll");
      label(exclude, translate("editor.search.excludeTitle"));
      exclude.textContent = translate("editor.search.exclude");
    },
    syncQuery,
    showStatus(result) {
      const found = result.kind === "counted" && result.count > 0;
      replaceOne.disabled = replaceAll.disabled = !found;
      exclude.disabled = !found || (result.kind === "counted" && result.current < 0);
    },
  };
}
