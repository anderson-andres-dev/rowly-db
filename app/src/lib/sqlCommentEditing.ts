import { syntaxTree } from "@codemirror/language";
import { Prec, type EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

// Cierre automatico de /* */, como en otros editores
// (docs/specs/v0.3-comentarios.md, Parte 2):
// - "/*" escribe "/*│*/";
// - Enter entre "/*" y "*/" abre el bloque en tres lineas, con " * ";
// - Enter en una linea " * " de un bloque sigue con " * ";
// - el "*/" que puso el editor se salta al escribirlo;
// - Backspace tras "/*" en un "/*│*/" vacio borra el par.
// Nunca dentro de un texto, un identificador entre comillas u otro comentario:
// lo dice el arbol de sintaxis, que ya sigue las reglas del motor.

const ENCLOSING = new Set(["String", "QuotedIdentifier", "LineComment", "BlockComment"]);

// Si un nodo que empezo antes de `pos` sigue abierto en `pos`.
function reaches(node: SyntaxNode, pos: number, state: EditorState): boolean {
  if (node.to > pos) return true;
  if (node.to < pos) return false;
  // Termina justo en `pos`: lo cubre si no se cerro.
  const text = state.sliceDoc(node.from, node.to);
  if (node.name === "LineComment") return true;
  if (node.name === "BlockComment") return !(text.length >= 4 && text.endsWith("*/"));
  return text.length < 2 || text[text.length - 1] !== text[0];
}

function enclosing(state: EditorState, pos: number): SyntaxNode | null {
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1); node; node = node.parent) {
    if (ENCLOSING.has(node.name) && node.from < pos && reaches(node, pos, state)) return node;
  }
  return null;
}

// El comentario de bloque que cierra justo en `close` (su "*/" empieza ahi).
function blockClosingAt(state: EditorState, close: number): boolean {
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(close, 1); node; node = node.parent) {
    if (node.name === "BlockComment") return node.to === close + 2 && state.sliceDoc(close, close + 2) === "*/";
  }
  return false;
}

// Como en otros editores: se cierra solo si lo que sigue no es texto pegado.
const CLOSES_BEFORE = /^(?:$|[\s;),])/;

const typing = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== "*" && text !== "/") return false;
  const { state } = view;
  if (from !== to || state.selection.ranges.length > 1) return false;
  // Saltar el "*/" del cierre en vez de duplicarlo; con un "/" justo antes se
  // esta escribiendo "/*", no cerrando.
  const opening = state.sliceDoc(from - 1, from) === "/";
  if (text === "*" && !opening && state.sliceDoc(from, from + 2) === "*/" && blockClosingAt(state, from)) {
    view.dispatch({ selection: { anchor: from + 1 }, userEvent: "input.type" });
    return true;
  }
  if (text === "/" && state.sliceDoc(from - 1, from + 1) === "*/" && blockClosingAt(state, from - 1)) {
    view.dispatch({ selection: { anchor: from + 1 }, userEvent: "input.type" });
    return true;
  }
  if (text !== "*" || !opening) return false;
  if (!CLOSES_BEFORE.test(state.sliceDoc(from, from + 1)) || enclosing(state, from - 1)) return false;
  view.dispatch({
    changes: { from, insert: "**/" },
    selection: { anchor: from + 1 },
    userEvent: "input.type",
  });
  return true;
});

function enter(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty || state.selection.ranges.length > 1) return false;
  const pos = range.head;
  const line = state.doc.lineAt(pos);
  const indent = /^[ \t]*/.exec(line.text)![0];
  // "/*│*/": tres lineas.
  if (state.sliceDoc(pos - 2, pos) === "/*" && state.sliceDoc(pos, pos + 2) === "*/" && !enclosing(state, pos - 2)) {
    const insert = `\n${indent} * \n${indent} */`;
    view.dispatch({
      changes: { from: pos, to: pos + 2, insert },
      selection: { anchor: pos + indent.length + 4 },
      userEvent: "input",
      scrollIntoView: true,
    });
    return true;
  }
  // Una linea " * " dentro de un bloque: la siguiente tambien.
  const comment = enclosing(state, pos);
  const star = /^([ \t]*)\*(?!\/)/.exec(line.text);
  if (comment?.name === "BlockComment" && star && pos - line.from >= star[0].length) {
    const insert = `\n${star[1]}* `;
    view.dispatch({
      changes: { from: pos, insert },
      selection: { anchor: pos + insert.length },
      userEvent: "input",
      scrollIntoView: true,
    });
    return true;
  }
  return false;
}

function backspace(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty || state.selection.ranges.length > 1) return false;
  const pos = range.head;
  if (state.sliceDoc(pos - 2, pos + 2) !== "/**/") return false;
  view.dispatch({ changes: { from: pos - 2, to: pos + 2 }, userEvent: "delete.backward" });
  return true;
}

export const commentEditing = [
  typing,
  Prec.high(keymap.of([
    { key: "Enter", run: enter },
    { key: "Backspace", run: backspace },
  ])),
];
