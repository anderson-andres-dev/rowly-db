import { findNext, getSearchQuery, type SearchQuery } from "@codemirror/search";
import type { EditorView } from "@codemirror/view";
import { currentMatch, matchesIn } from "./state";

export interface ReplaceOptions {
  preserveCase: boolean;
}

// Aa: el reemplazo copia el formato de lo encontrado (TODO MAYUSCULAS,
// Primera mayuscula o todo minusculas); otro formato, tal cual.
export function preserveCase(replacement: string, matched: string): string {
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

// Reemplaza la actual y deja seleccionada la siguiente (el editor muestra
// cada paso). Sin una actual, primero va a la siguiente.
export function replaceCurrent(view: EditorView, options: ReplaceOptions): boolean {
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

// Todas las coincidencias (salvo las excluidas) en UNA transaccion: un solo
// Ctrl+Z la deshace.
export function replaceEverything(view: EditorView, options: ReplaceOptions): number {
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
