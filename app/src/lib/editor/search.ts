import {
  SearchQuery,
  closeSearchPanel,
  getSearchQuery,
  openSearchPanel,
  search,
  searchPanelOpen,
  setSearchQuery,
} from "@codemirror/search";
import { Prec, type Extension } from "@codemirror/state";
import { keymap, type EditorView, type Panel, type ViewUpdate } from "@codemirror/view";
import { locale } from "$lib/i18n";
import { createMatchCounter, type MatchStatus } from "../editorSearch/counter";
import { exclusionMarks, newlineMarkers } from "../editorSearch/decorations";
import { element } from "../editorSearch/dom";
import { createFindBar } from "../editorSearch/findBar";
import { preserveCase } from "../editorSearch/replace";
import { createReplaceBar, type ReplaceBar } from "../editorSearch/replaceBar";
import { createSession } from "../editorSearch/session";
import {
  addExclusion,
  clearExclusions,
  exclusionField,
  inScope,
  scopeForReplace,
  scopeFromSelection,
  searchMode,
  searchModeField,
  searchScopeField,
  setSearchMode,
  setSearchScope,
  type SearchMode,
} from "../editorSearch/state";

// Buscar y reemplazar del editor SQL, en lugar del panel por defecto de
// CodeMirror, al estilo DataGrip. Son dos barras separadas (editorSearch/):
// la de buscar siempre, la de reemplazar solo en modo reemplazar (se crea al
// entrar y se destruye al salir). El modo y el alcance viven en el estado
// del editor; este panel solo arma las barras segun ese estado.
//
//   - Ctrl+F: modo buscar. Con el panel en reemplazar, vuelve a buscar; ya
//     en buscar, lo cierra.
//   - Ctrl+R: modo reemplazar, abierto o no.
//   - Buscar es siempre en todo el documento. En reemplazar, el alcance
//     sigue a la seleccion: varias lineas seleccionadas limitan la busqueda
//     a ellas (pastilla "en la seleccion"; un clic la quita); una linea o
//     ninguna, todo el documento.
//
// Es DOM plano (lo crea CodeMirror, fuera de Svelte); estilos en
// styles/editorSearch.css. Los textos se vuelven a poner al cambiar el
// idioma (suscrito a `locale` mientras el panel esta montado).

function createSearchPanel(view: EditorView): Panel {
  const session = createSession(view);
  const dom = element("div", "kh-search-panel", { role: "search" });
  let replaceBar: ReplaceBar | null = null;
  let lastStatus: MatchStatus = { kind: "empty" };

  const findBar = createFindBar(session, {
    toggleMode: () => {
      if (searchMode(view.state) === "replace") view.dispatch({ effects: setSearchMode.of("find") });
      else openReplacePanel(view);
    },
    close: () => closeAndFocusEditor(view),
    clearScope: () => view.dispatch({ effects: setSearchScope.of(null) }),
  });
  dom.append(findBar.dom);

  const counter = createMatchCounter(view, (status) => {
    lastStatus = status;
    findBar.showStatus(status);
    replaceBar?.showStatus(status);
  });

  function renderMode(mode: SearchMode) {
    if (mode === "replace" && !replaceBar) {
      replaceBar = createReplaceBar(session);
      replaceBar.applyTexts();
      replaceBar.showStatus(lastStatus);
      dom.append(replaceBar.dom);
    } else if (mode === "find" && replaceBar) {
      replaceBar.dom.remove();
      replaceBar = null;
    }
    dom.dataset.mode = mode;
    findBar.setMode(mode);
  }

  // El foco sigue al modo: en reemplazar, al campo de reemplazo.
  function focusMode() {
    (replaceBar ?? findBar).focus();
  }

  // Los mismos comandos que el despachador de atajos de la app: si el foco
  // esta en el panel y la tecla llega hasta aca, el resultado es identico.
  dom.addEventListener("keydown", (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocusEditor(view);
    } else if (mod && !event.shiftKey && !event.altKey && key === "f") {
      event.preventDefault();
      toggleSearchPanel(view);
    } else if (mod && !event.shiftKey && !event.altKey && key === "r") {
      event.preventDefault();
      openReplacePanel(view);
    }
  });

  renderMode(searchMode(view.state));
  findBar.setScoped(Boolean(view.state.field(searchScopeField, false)));

  let unsubscribeLocale: (() => void) | undefined;

  return {
    dom,
    top: true,
    mount() {
      // subscribe llama enseguida: pone los textos del idioma vigente.
      unsubscribeLocale = locale.subscribe(() => {
        findBar.applyTexts();
        replaceBar?.applyTexts();
        counter.count(session.query);
      });
      focusMode();
    },
    destroy() {
      unsubscribeLocale?.();
      counter.cancel();
    },
    update(update: ViewUpdate) {
      let modeChanged = false;
      let queryChanged = false;
      // Cambia por la pastilla, por la seleccion del usuario o porque se
      // borro el texto que cubria: se compara el estado, no el origen.
      const scopeBefore = update.startState.field(searchScopeField, false);
      const scopeAfter = update.state.field(searchScopeField, false);
      const scopeChanged = scopeBefore?.from !== scopeAfter?.from || scopeBefore?.to !== scopeAfter?.to;
      for (const transaction of update.transactions) {
        for (const effect of transaction.effects) {
          if (effect.is(setSearchMode)) modeChanged = true;
          else if (effect.is(addExclusion) || effect.is(clearExclusions)) queryChanged = true;
          else if (effect.is(setSearchQuery)) {
            queryChanged = true;
            // De afuera (CodeMirror al abrir con seleccion): se toma con el
            // filtro propio y se publica esa.
            if (effect.value !== session.query) {
              session.adopt(effect.value);
              // No se puede despachar dentro de update. Se publica la vigente
              // al momento (lo escrito despues no se pisa con esta).
              queueMicrotask(() => {
                if (getSearchQuery(view.state) !== session.query) view.dispatch({ effects: setSearchQuery.of(session.query) });
              });
            }
          }
        }
      }
      if (queryChanged) {
        findBar.syncQuery();
        replaceBar?.syncQuery();
      }
      if (modeChanged) {
        renderMode(searchMode(update.state));
        focusMode();
      }
      if (scopeChanged) {
        findBar.setScoped(Boolean(scopeAfter));
        // El resaltado de CodeMirror solo se recalcula con una consulta nueva.
        queueMicrotask(() => session.commit({}, true));
      }
      // Solo lo que cambia el conteo: no los efectos de fondo del editor
      // (indice de sentencias, analisis).
      if (update.docChanged || update.selectionSet || queryChanged || scopeChanged) counter.count(session.query);
    },
  };
}

// Cerrar es terminar la busqueda: no queda texto buscado, ni resaltados, ni
// exclusiones, ni alcance para la proxima vez.
function closeAndFocusEditor(view: EditorView) {
  closeSearchPanel(view);
  view.dispatch({ effects: [setSearchQuery.of(new SearchQuery({ search: "" })), clearExclusions.of(null), setSearchScope.of(null)] });
  view.focus();
}

// openSearchPanel precarga la seleccion como texto a buscar; con alcance,
// esa seleccion es el alcance, no el texto: se deja la busqueda anterior.
function dropSelectionPrefill(view: EditorView, previous: SearchQuery) {
  const scope = view.state.field(searchScopeField, false);
  if (!scope) return;
  const selected = view.state.sliceDoc(scope.from, scope.to);
  const prefilled = (text: string) => text === selected || text === selected.replace(/\n/g, "\\n");
  const opened = getSearchQuery(view.state);
  if (!prefilled(opened.search)) return;
  view.dispatch({
    effects: setSearchQuery.of(
      new SearchQuery({
        search: prefilled(previous.search) ? "" : previous.search,
        caseSensitive: previous.caseSensitive,
        regexp: previous.regexp,
        wholeWord: previous.wholeWord,
        replace: previous.replace,
      }),
    ),
  });
}

function openInMode(view: EditorView, mode: SearchMode): boolean {
  const previous = getSearchQuery(view.state);
  const scope = mode === "replace" ? [setSearchScope.of(scopeFromSelection(view.state))] : [];
  view.dispatch({ effects: [setSearchMode.of(mode), ...scope] });
  openSearchPanel(view);
  dropSelectionPrefill(view, previous);
  return true;
}

// Ctrl+F.
export function toggleSearchPanel(view: EditorView): boolean {
  if (!searchPanelOpen(view.state)) return openInMode(view, "find");
  if (searchMode(view.state) === "replace") {
    view.dispatch({ effects: setSearchMode.of("find") });
  } else {
    closeAndFocusEditor(view);
  }
  return true;
}

// Ctrl+R.
export function openReplacePanel(view: EditorView): boolean {
  if (!searchPanelOpen(view.state)) return openInMode(view, "replace");
  if (searchMode(view.state) !== "replace") {
    view.dispatch({ effects: [setSearchMode.of("replace"), setSearchScope.of(scopeForReplace(view.state))] });
  } else {
    // Ya en reemplazar: el mismo modo, solo devuelve el foco a su campo.
    view.dispatch({ effects: setSearchMode.of("replace") });
  }
  return true;
}

export function editorSearch(): Extension {
  return [
    search({ top: true, createPanel: createSearchPanel }),
    searchModeField,
    searchScopeField,
    exclusionField,
    exclusionMarks,
    newlineMarkers,
    Prec.highest(
      keymap.of([
        { key: "Mod-f", run: toggleSearchPanel, preventDefault: true },
        { key: "Mod-r", run: openReplacePanel, preventDefault: true },
      ]),
    ),
  ];
}

// Para tests.
export const __test = {
  preserveCase,
  scopeFromSelection,
  inScope,
  setSearchScope,
  searchScopeField,
  setSearchMode,
  searchModeField,
};
