import type { SearchQuery } from "@codemirror/search";
import type { EditorView } from "@codemirror/view";

export const MAX_COUNTED = 1000;
const COUNT_CHUNK = 1024 * 1024;
const COUNT_OVERLAP = 64 * 1024;

// Lo que muestran las barras: la de buscar el texto de estado, la de
// reemplazar si sus botones tienen sobre que actuar.
export type MatchStatus =
  | { kind: "empty" }
  | { kind: "invalid" }
  // current: indice de la coincidencia seleccionada, -1 si ninguna.
  | { kind: "counted"; count: number; current: number };

// Se cuenta por trozos de COUNT_CHUNK, cediendo entre ellos: con un
// documento de 30 MB y pocas coincidencias, contar de una vez congela la
// escritura. Un conteo nuevo
// deja sin efecto al anterior.
export function createMatchCounter(view: EditorView, onStatus: (status: MatchStatus) => void) {
  let run = 0;

  function count(query: SearchQuery) {
    const thisRun = ++run;
    if (!query.search) return onStatus({ kind: "empty" });
    if (!query.valid) return onStatus({ kind: "invalid" });

    const state = view.state;
    const selection = state.selection.main;
    const length = state.doc.length;
    let total = 0;
    let current = -1;
    let windowFrom = 0;
    // Una coincidencia que cruza el corte se cuenta en el trozo donde
    // empieza; el siguiente se salta lo que ya cubrio.
    let lastEnd = 0;

    const step = () => {
      if (thisRun !== run) return;
      const deadline = performance.now() + 8;
      while (windowFrom < length && total < MAX_COUNTED) {
        const windowTo = Math.min(length, windowFrom + COUNT_CHUNK);
        const cursor = query.getCursor(state, windowFrom, Math.min(length, windowTo + COUNT_OVERLAP));
        for (let found = cursor.next(); !found.done; found = cursor.next()) {
          const match = found.value;
          if (match.from >= windowTo && windowTo < length) break;
          if (match.from < lastEnd) continue;
          if (match.from === selection.from && match.to === selection.to) current = total;
          total++;
          lastEnd = Math.max(match.to, match.from + 1);
          if (total >= MAX_COUNTED) break;
        }
        windowFrom = windowTo;
        if (performance.now() > deadline && windowFrom < length && total < MAX_COUNTED) {
          setTimeout(step, 0);
          return;
        }
      }
      onStatus({ kind: "counted", count: total, current });
    };
    step();
  }

  return {
    count,
    cancel() {
      run++;
    },
  };
}
