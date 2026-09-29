import { getSearchQuery, setSearchQuery, type SearchQuery } from "@codemirror/search";
import type { EditorView } from "@codemirror/view";
import type { ReplaceOptions } from "./replace";
import { filteredQuery, specOf, type QuerySpec } from "./state";

// Lo que comparten las barras de buscar y reemplazar mientras el panel esta
// abierto: la consulta vigente (siempre con el filtro de exclusiones y
// alcance) y las opciones de reemplazo. Dura lo que el panel, no lo que la
// barra de reemplazar: al alternar de modo no se pierde Aa.
export interface SearchSession {
  readonly view: EditorView;
  readonly query: SearchQuery;
  readonly replaceOptions: ReplaceOptions;
  // Cambia la consulta y la publica al editor. `force` publica aunque sea
  // igual: CodeMirror vuelve a filtrar (alcance o exclusiones cambiaron).
  commit(patch: Partial<QuerySpec>, force?: boolean): void;
  // Una consulta que llego de afuera (CodeMirror al abrir con seleccion):
  // se toma con el filtro propio, sin publicarla.
  adopt(external: SearchQuery): void;
}

export function createSession(view: EditorView): SearchSession {
  let query = filteredQuery(specOf(getSearchQuery(view.state)));
  const replaceOptions: ReplaceOptions = { preserveCase: false };

  return {
    view,
    get query() {
      return query;
    },
    replaceOptions,
    commit(patch, force = false) {
      const next = filteredQuery({ ...specOf(query), ...patch });
      if (!force && next.eq(query)) return;
      query = next;
      view.dispatch({ effects: setSearchQuery.of(query) });
    },
    adopt(external) {
      query = filteredQuery(specOf(external));
    },
  };
}
