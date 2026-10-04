import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { executablePrefix } from "$lib/sqlComments";
import { sqlLexical } from "$lib/editor/statementIndex";
import type { SqlLexical } from "$lib/sqlStatements";

// Jerarquia tipografica dentro de los comentarios, siempre en su gris:
// marcadores tenues; TODO, FIXME…,
// etiquetas @ y **texto** en negrita; *texto* y _texto_ en cursiva; las
// comillas de `texto`, tenues; en /*+ … */, el nombre de cada pista en
// negrita. Solo lo visible, y nunca el codigo de /*! o /*M!.

const marker = Decoration.mark({ class: "cm-comment-marker" });
const strong = Decoration.mark({ class: "cm-comment-strong" });
const emphasis = Decoration.mark({ class: "cm-comment-emphasis" });

interface Mark {
  from: number;
  to: number;
  decoration: Decoration;
}

const TASK = /(?<![\w@])(?:TODO|FIXME|NOTE|HACK|XXX)(?=[:\s]|$)/g;
const TAG = /(?<![\w@])@[A-Za-z][\w-]*/g;
const STRONG = /\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g;
const STAR_EMPHASIS = /(?<![*\w])\*(?=[^\s*])([^*\n]+?)(?<=\S)\*(?![*\w])/g;
const UNDERSCORE_EMPHASIS = /(?<!\w)_(?=[^\s_])([^_\n]+?)(?<=\S)_(?!\w)/g;
const CODE = /`[^`\n]+`/g;
const HINT = /\b[A-Za-z_]+(?=\s*\()/g;
// " * " al principio de una linea de un bloque.
const CONTINUATION = /^[ \t]*\*(?!\/)/gm;

// Las marcas de un comentario cuyo texto empieza en `from`.
function commentMarks(text: string, from: number, kind: "line" | "block", hints: boolean): Mark[] {
  const marks: Mark[] = [];
  const add = (start: number, end: number, decoration: Decoration) =>
    marks.push({ from: from + start, to: from + end, decoration });
  const open = kind === "line" ? (text.startsWith("#") ? 1 : 2) : hints ? 3 : 2;
  add(0, open, marker);
  const close = kind === "block" && text.endsWith("*/") && text.length >= open + 2 ? text.length - 2 : text.length;
  if (close < text.length) add(close, text.length, marker);
  const body = text.slice(0, close);
  const each = (pattern: RegExp, fn: (match: RegExpExecArray) => void) => {
    pattern.lastIndex = open;
    for (let match = pattern.exec(body); match; match = pattern.exec(body)) {
      if (match.index >= open) fn(match);
    }
  };
  if (kind === "block") each(CONTINUATION, (m) => add(m.index + m[0].length - 1, m.index + m[0].length, marker));
  if (hints) {
    each(HINT, (m) => add(m.index, m.index + m[0].length, strong));
    return marks;
  }
  each(TASK, (m) => add(m.index, m.index + m[0].length, strong));
  each(TAG, (m) => add(m.index, m.index + m[0].length, strong));
  each(STRONG, (m) => {
    add(m.index, m.index + 2, marker);
    add(m.index + 2, m.index + m[0].length - 2, strong);
    add(m.index + m[0].length - 2, m.index + m[0].length, marker);
  });
  for (const pattern of [STAR_EMPHASIS, UNDERSCORE_EMPHASIS]) {
    each(pattern, (m) => {
      add(m.index, m.index + 1, marker);
      add(m.index + 1, m.index + m[0].length - 1, emphasis);
      add(m.index + m[0].length - 1, m.index + m[0].length, marker);
    });
  }
  each(CODE, (m) => {
    add(m.index, m.index + 1, marker);
    add(m.index + m[0].length - 1, m.index + m[0].length, marker);
  });
  return marks;
}

// Lo que es comentario de un nodo BlockComment: en un motor que no anida,
// hasta el primer */ (lo de despues es codigo, editor/commentHighlight.ts).
function blockText(text: string, lexical: SqlLexical): string {
  if (lexical.nestedComments) return text;
  const close = text.indexOf("*/", 2);
  return close === -1 ? text : text.slice(0, close + 2);
}

export function commentDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const lexical = state.facet(sqlLexical);
  const marks: Mark[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== "LineComment" && node.name !== "BlockComment") return;
        const text = state.sliceDoc(node.from, node.to);
        if (node.name === "LineComment") {
          marks.push(...commentMarks(text, node.from, "line", false));
          return false;
        }
        // Lo que el motor ejecuta no es un comentario.
        if (executablePrefix(text, 0, lexical)) return false;
        const hints = lexical.optimizerHints && text.startsWith("/*+");
        marks.push(...commentMarks(blockText(text, lexical), node.from, "block", hints));
        return false;
      },
    });
  }
  marks.sort((a, b) => a.from - b.from || a.to - b.to);
  const builder = new RangeSetBuilder<Decoration>();
  for (const mark of marks) if (mark.from < mark.to) builder.add(mark.from, mark.to, mark.decoration);
  return builder.finish();
}

const commentStylePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = commentDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = commentDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const commentStyleTheme = EditorView.baseTheme({
  ".cm-comment-marker": { opacity: "0.55" },
  ".cm-comment-strong": { fontWeight: "600" },
  ".cm-comment-emphasis": { fontStyle: "italic" },
});

export const commentStyle = [commentStylePlugin, commentStyleTheme];
