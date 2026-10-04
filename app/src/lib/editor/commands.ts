// Lo que hace el editor con su texto cuando se lo piden (menu, atajos):
// portapapeles, seleccionar todo, formatear y preparar una ejecucion. Las
// decisiones son funciones del estado de CodeMirror; los comandos solo las
// aplican a la vista.

import { selectAll } from "@codemirror/commands";
import { EditorSelection, type EditorState, type StateEffect } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { SqlProfile } from "$lib/engines";
import type { MessageKey, MessageParams } from "$lib/i18n";
import { clearDiagnosticsIn } from "$lib/sqlDiagnostics";
import { setExecutionMarker } from "$lib/sqlExecutionMarker";
import { formatSqlText } from "$lib/sqlFormatter";
import { normalizePastedSql } from "$lib/sqlPaste";
import { sqlLexical, statementNear } from "$lib/sqlStatementIndex";
import { splitStatements, type SqlLexical } from "$lib/sqlStatements";

export interface TextRange {
  from: number;
  to: number;
  // Lo eligio el usuario (seleccion) o es la sentencia bajo el cursor.
  selected: boolean;
}

// La seleccion, o la sentencia bajo el cursor (sqlStatementIndex.ts): nunca
// el documento entero; sin sentencias, nada.
export function currentSqlRange(state: EditorState): TextRange | null {
  const selection = state.selection.main;
  if (!selection.empty) return { from: selection.from, to: selection.to, selected: true };
  const range = statementNear(state, selection.head);
  return range ? { ...range, selected: false } : null;
}

// Donde queda el cursor tras formatear: despues del mismo numero de
// caracteres que no son espacios.
export function mappedCursorOffset(source: string, offset: number, formatted: string): number {
  const significantBeforeCursor = [...source.slice(0, offset)].filter((char) => !/\s/.test(char)).length;
  if (significantBeforeCursor === 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (!/\s/.test(formatted[index])) seen += 1;
    if (seen === significantBeforeCursor) return index + 1;
  }
  return formatted.length;
}

export interface ExecutionRequest {
  // El texto que se manda a ejecutar, sin espacios en los bordes.
  sql: string;
  // La marca de ejecucion (con una parte por sentencia si es un script) y
  // los errores anteriores de ese texto, que se quitan.
  effects: StateEffect<unknown>[];
}

// Lo que se ejecuta de [from, to): null si no hay ninguna sentencia.
export function executionRequest(state: EditorState, range: { from: number; to: number }, lexical: SqlLexical): ExecutionRequest | null {
  const raw = state.sliceDoc(range.from, range.to);
  const sql = raw.trim();
  if (!sql) return null;
  const statements = splitStatements(raw, lexical);
  if (statements.length === 0) return null;
  const from = range.from + (raw.length - raw.trimStart().length);
  // Varias sentencias: Workspace las corre como script y va marcando cada
  // una (markStatement), con su icono y su tiempo.
  const parts =
    statements.length > 1
      ? statements.map((part) => ({ from: range.from + part.from, to: range.from + part.to, status: "pending" as const }))
      : undefined;
  return {
    sql,
    effects: [
      setExecutionMarker.of({ from, to: from + sql.length, status: "pending", parts }),
      // Volver a ejecutar la sentencia quita sus errores anteriores.
      clearDiagnosticsIn.of({ from, to: from + sql.length }),
    ],
  };
}

export interface FormatSettings {
  formatterLineWidth: number;
  formatterAlignColumns: Parameters<typeof formatSqlText>[3];
  indentStyle: Parameters<typeof formatSqlText>[4];
  indentSize: Parameters<typeof formatSqlText>[5];
}

export interface EditorCommandsOptions {
  view(): EditorView | undefined;
  engine(): SqlProfile;
  formatSettings(): FormatSettings;
  text(key: MessageKey, params?: MessageParams): string;
  notifyError(message: string): void;
  writeClipboard(text: string): Promise<boolean>;
  readClipboard(): Promise<string>;
}

export interface EditorCommands {
  copy(): Promise<void>;
  cut(): Promise<void>;
  paste(): Promise<void>;
  selectEverything(): void;
  // Formatea la seleccion o la sentencia bajo el cursor; false si no hay.
  format(): boolean;
  // Marca lo que se va a ejecutar y lo devuelve; null si no hay nada.
  execute(range: { from: number; to: number }): string | null;
}

export function createEditorCommands(options: EditorCommandsOptions): EditorCommands {
  const writeClipboard = async (text: string) => {
    const copied = await options.writeClipboard(text);
    options.view()?.focus();
    return copied;
  };

  return {
    async copy() {
      const view = options.view();
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      await writeClipboard(view.state.sliceDoc(selection.from, selection.to));
    },

    async cut() {
      const view = options.view();
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      const copied = await writeClipboard(view.state.sliceDoc(selection.from, selection.to));
      if (copied) view.dispatch({ changes: { from: selection.from, to: selection.to } });
      view.focus();
    },

    async paste() {
      const view = options.view();
      if (!view) return;
      try {
        // Mismo filtro que Ctrl+V (clipboardInputFilter), que este camino no
        // pasa.
        const text = normalizePastedSql(await options.readClipboard(), view.state.facet(sqlLexical));
        view.dispatch({ ...view.state.replaceSelection(text), userEvent: "input.paste", scrollIntoView: true });
        view.focus();
      } catch {
        // El permiso del portapapeles puede estar bloqueado por el sistema.
      }
    },

    selectEverything() {
      const view = options.view();
      if (!view) return;
      selectAll(view);
      view.focus();
    },

    format() {
      const view = options.view();
      if (!view) return false;
      const range = currentSqlRange(view.state);
      if (!range) return false;
      const originalDoc = view.state.doc;
      const source = view.state.sliceDoc(range.from, range.to);
      const originalCursor = view.state.selection.main.head;
      const settings = options.formatSettings();
      void formatSqlText(
        source,
        options.engine(),
        settings.formatterLineWidth,
        settings.formatterAlignColumns,
        settings.indentStyle,
        settings.indentSize,
      ).then((result) => {
        const current = options.view();
        // La primera ejecucion carga el formateador bajo demanda. Si el
        // usuario escribio durante esos milisegundos, no se reemplaza una
        // version vieja.
        if (!current || current.state.doc !== originalDoc) return;
        // Lo que el parser no entiende queda igual y se dice por que. Con
        // varias consultas, las demas si se formatean.
        const firstLine = current.state.doc.lineAt(range.from).number;
        const failure = result.failures[0];
        if (failure) {
          const line = firstLine + failure.line - 1;
          const params = { token: failure.token ?? "", line, count: result.failures.length, formatted: result.formatted };
          options.notifyError(
            result.formatted === 0
              ? options.text(failure.token ? "editor.format.failedAt" : "editor.format.failed", params)
              : options.text(result.failures.length === 1 ? "editor.format.partialOne" : "editor.format.partialOther", params),
          );
          if (result.formatted === 0) return;
        }
        const formatted = result.text;
        if (formatted === source) {
          current.focus();
          return;
        }
        const cursorOffset = mappedCursorOffset(source, originalCursor - range.from, formatted);
        current.dispatch({
          changes: { from: range.from, to: range.to, insert: formatted },
          selection: range.selected
            ? EditorSelection.range(range.from, range.from + formatted.length)
            : EditorSelection.cursor(range.from + cursorOffset),
          userEvent: "input.format",
        });
        current.focus();
      });
      return true;
    },

    execute(range) {
      const view = options.view();
      if (!view) return null;
      const request = executionRequest(view.state, range, options.engine().lexical);
      if (!request) return null;
      view.dispatch({ effects: request.effects });
      return request.sql;
    },
  };
}
