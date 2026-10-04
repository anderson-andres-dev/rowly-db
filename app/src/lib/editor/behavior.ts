import { syntaxTree } from "@codemirror/language";
import type { EditorState, Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { statementContaining } from "$lib/editor/statementIndex";

export interface UppercaseKeywordEdit {
  from: number;
  to: number;
  insert: string;
  cursor: number;
}

// Se ejecuta justo cuando el usuario escribe el separador que termina una
// palabra. El parser SQL decide si lo anterior es realmente Keyword, por lo
// que identificadores, comentarios y strings quedan intactos.
export function uppercaseKeywordEdit(
  state: EditorState,
  from: number,
  to: number,
  text: string,
): UppercaseKeywordEdit | null {
  if (from !== to || text.length !== 1 || /[A-Za-z0-9_$]/.test(text) || from === 0) return null;

  // Una palabra no cruza lineas: basta con la linea (y no mas de 256
  // caracteres), nunca desde el inicio del documento.
  const lineFrom = state.doc.lineAt(from).from;
  const before = state.sliceDoc(Math.max(lineFrom, from - 256), from);
  const match = before.match(/[A-Za-z_][A-Za-z0-9_$]*$/);
  if (!match) return null;

  const word = match[0];
  const wordFrom = from - word.length;
  const node = syntaxTree(state).resolveInner(from - 1, -1);
  if (node.name !== "Keyword" || node.from !== wordFrom || node.to !== from) return null;

  const upper = word.toUpperCase();
  if (upper === word) return null;
  return { from: wordFrom, to: from, insert: upper + text, cursor: from + text.length };
}

export const autoUppercaseSqlKeywords: Extension = EditorView.inputHandler.of(
  (view, from, to, text) => {
    const edit = uppercaseKeywordEdit(view.state, from, to, text);
    if (!edit) return false;

    view.dispatch({
      changes: { from: edit.from, to: edit.to, insert: edit.insert },
      selection: { anchor: edit.cursor },
      userEvent: "input.type",
    });
    return true;
  },
);

// Por encima de esto, el ancho del recuadro se mide solo con las lineas
// visibles: medir un INSERT de 100 000 lineas en cada tecla pesa.
const MEASURE_ALL_LINES = 2000;

function lineColumns(text: string): number {
  let columns = 0;
  for (const char of text) {
    columns = char === "\t" ? columns + (4 - (columns % 4)) : columns + 1;
  }
  return columns;
}

// El recuadro de la sentencia bajo el cursor (la que ejecuta Ctrl+Enter
// cuando el cursor esta dentro). Solo se decoran las lineas visibles.
function statementDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const statement = statementContaining(state, state.selection.main.head);
  if (!statement) return Decoration.none;

  const firstLine = state.doc.lineAt(statement.from).number;
  const lastLine = state.doc.lineAt(Math.max(statement.from, statement.to - 1)).number;
  const visible = view.visibleRanges
    .map((range) => ({
      from: Math.max(firstLine, state.doc.lineAt(range.from).number),
      to: Math.min(lastLine, state.doc.lineAt(range.to).number),
    }))
    .filter((range) => range.from <= range.to);
  if (visible.length === 0) return Decoration.none;

  const measured = lastLine - firstLine < MEASURE_ALL_LINES ? [{ from: firstLine, to: lastLine }] : visible;
  let statementColumns = 1;
  for (const range of measured) {
    for (let lineNumber = range.from; lineNumber <= range.to; lineNumber += 1) {
      const line = state.doc.line(lineNumber);
      const text = state.sliceDoc(line.from, Math.min(line.to, statement.to)).trimEnd();
      statementColumns = Math.max(statementColumns, lineColumns(text));
    }
  }

  const decorations = [];
  const style = `--cm-active-statement-width: ${statementColumns}ch`;
  // Si el borde real de la sentencia esta scrolleado fuera de la vista, el
  // recuadro queda "abierto" de ese lado (sin cm-activeStatementStart ni
  // -End en ninguna linea visible). Se cierra en la linea visible mas
  // cercana a ese borde, para que el recuadro siempre se vea completo.
  const topVisible = visible[0].from;
  const bottomVisible = visible[visible.length - 1].to;
  for (const range of visible) {
    for (let lineNumber = range.from; lineNumber <= range.to; lineNumber += 1) {
      const classes = ["cm-activeStatement"];
      if (lineNumber === firstLine || lineNumber === topVisible) classes.push("cm-activeStatementStart");
      if (lineNumber === lastLine || lineNumber === bottomVisible) classes.push("cm-activeStatementEnd");
      decorations.push(
        Decoration.line({
          class: classes.join(" "),
          attributes: { style },
        }).range(state.doc.line(lineNumber).from),
      );
    }
  }
  return Decoration.set(decorations, true);
}

// Contar caracteres no ve lo que no es texto (los hints de parametros, por
// ejemplo): el ancho real de las lineas visibles del recuadro se mide en el
// DOM y queda en el contenido como minimo del ancho.
const MEASURED_WIDTH = "--cm-active-statement-measured";

function measureStatementLines(view: EditorView): number {
  let width = 0;
  const range = document.createRange();
  for (const line of view.contentDOM.querySelectorAll<HTMLElement>(".cm-activeStatement")) {
    range.selectNodeContents(line);
    const contentLeft = line.getBoundingClientRect().left + parseFloat(getComputedStyle(line).paddingLeft);
    width = Math.max(width, range.getBoundingClientRect().right - contentLeft);
  }
  return Math.ceil(width);
}

export const activeStatementHighlight: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    measuredWidth = -1;

    constructor(readonly view: EditorView) {
      this.decorations = statementDecorations(view);
      this.requestMeasure();
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = statementDecorations(update.view);
      }
      this.requestMeasure();
    }

    requestMeasure() {
      this.view.requestMeasure({
        key: this,
        read: (view) => measureStatementLines(view),
        write: (width, view) => {
          if (width === this.measuredWidth) return;
          this.measuredWidth = width;
          view.contentDOM.style.setProperty(MEASURED_WIDTH, `${width}px`);
        },
      });
    }

    destroy() {
      this.view.contentDOM.style.removeProperty(MEASURED_WIDTH);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
