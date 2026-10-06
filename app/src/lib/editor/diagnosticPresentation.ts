// Como se presentan los diagnosticos del editor: el error del servidor puesto
// en su sentencia, la ventana de detalle (por teclado o con el mouse quieto
// sobre un subrayado), el contador de abajo a la derecha y el salto al
// siguiente. Los diagnosticos mismos viven en editor/diagnostics.ts.

import { writable, type Readable } from "svelte/store";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { SqlProfile } from "$lib/engines";
import type { MessageKey, MessageParams } from "$lib/i18n";
import {
  applyQuickFix,
  diagnosticAt,
  diagnosticUnder,
  diagnosticsField,
  jumpToDiagnostic,
  stopTyping,
  visibleDiagnosticCount,
  type QuickFix,
  type SqlDiagnostic,
} from "$lib/editor/diagnostics";
import { groupByFixes } from "$lib/editor/errorHelp";
import type { QueryExecutionResult } from "$lib/types";

type Text = (key: MessageKey, params?: MessageParams) => string;

// Un error de la base, ubicado en la sentencia que lo produjo, que empieza en
// `from`. Donde cayo y que ayuda corresponde: segun los mensajes y codigos del
// motor (lib/engines). Sin pista de donde, la sentencia entera.
export function serverDiagnostics(
  statement: string,
  from: number,
  result: QueryExecutionResult,
  engine: SqlProfile,
  text: Text,
): SqlDiagnostic[] {
  if (result.type !== "error") return [];
  const located = engine.locateError(statement, result);
  const range = located ?? { from: 0, to: statement.length };
  const help = result.code ? engine.errorHelp[result.code] : undefined;
  // Columna fuera del GROUP BY: sumarla o agregarla (solo si se sabe cual).
  const fixes =
    located && help === "groupBy"
      ? groupByFixes(statement, range).map((fix) => ({
          label: text(fix.kind === "aggregate" ? "editor.diagnostics.fix.aggregate" : "editor.diagnostics.fix.groupBy", {
            column: fix.column,
          }),
          from: from + fix.from,
          to: from + fix.to,
          insert: fix.insert,
        }))
      : [];
  return [
    {
      from: from + range.from,
      to: from + range.to,
      message: result.message,
      code: result.code,
      source: "server",
      fixes,
      help,
      unresolved: help === "tableMissing" || help === "columnMissing",
    },
  ];
}

// Mirar un error a proposito (detalle, correccion): se ven todos, tambien los
// de lo que se estaba escribiendo.
export function stopTypingIn(view: EditorView): void {
  view.dispatch({ effects: stopTyping.of(null) });
}

// Alt+N sin errores: un aviso breve en vez de no hacer nada.
export function jump(view: EditorView, direction: 1 | -1, noErrors: () => void): boolean {
  if (!jumpToDiagnostic(view, direction)) noErrors();
  return true;
}

export interface DiagnosticPopupState {
  diagnostic: SqlDiagnostic;
  anchor: { left: number; top: number; bottom: number };
  // Abierta por teclado: tiene el foco y no se cierra al mover el mouse.
  focused: boolean;
}

export interface DiagnosticPopup {
  state: Readable<DiagnosticPopupState | null>;
  // La extension del mouse: abrir tras 400 ms quieto sobre un subrayado.
  hover: Extension;
  close(refocusEditor: boolean): void;
  applyFix(fix: QuickFix): void;
  // El detalle del diagnostico bajo el cursor; false si no hay.
  showDetails(view: EditorView): boolean;
  // La primera correccion del diagnostico bajo el cursor; false si no hay.
  applyFirstFix(view: EditorView): boolean;
  cancelHoverClose(): void;
  scheduleHoverClose(): void;
  destroy(): void;
}

export function createDiagnosticPopup(view: () => EditorView | undefined): DiagnosticPopup {
  const state = writable<DiagnosticPopupState | null>(null);
  let current: DiagnosticPopupState | null = null;
  state.subscribe((value) => (current = value));
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function open(diagnostic: SqlDiagnostic, focused: boolean) {
    const coords = view()?.coordsAtPos(diagnostic.from);
    if (!coords) return;
    state.set({ diagnostic, anchor: { left: coords.left, top: coords.top, bottom: coords.bottom }, focused });
  }

  function close(refocusEditor: boolean) {
    state.set(null);
    if (refocusEditor) view()?.focus();
  }

  function applyFix(fix: QuickFix) {
    const editor = view();
    if (!editor) return;
    close(false);
    applyQuickFix(editor, fix);
  }

  function cancelHoverClose() {
    if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
    hoverCloseTimer = null;
  }

  // Abierta con el mouse: se cierra al salir (con un margen para llegar a la
  // ventana).
  function scheduleHoverClose() {
    cancelHoverClose();
    if (current && !current.focused) hoverCloseTimer = setTimeout(() => close(false), 250);
  }

  function clearHoverTimer() {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
  }

  // Mouse quieto 400 ms sobre un subrayado: su detalle, sin quitarle el foco
  // al editor.
  const hover = EditorView.domEventHandlers({
    mousemove(event, editor) {
      const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY });
      const under = pos === null ? null : diagnosticUnder(editor.state, pos);
      clearHoverTimer();
      if (!under) {
        scheduleHoverClose();
        return false;
      }
      cancelHoverClose();
      if (current?.diagnostic === under) return false;
      hoverTimer = setTimeout(() => {
        if (!current?.focused) open(under, false);
      }, 400);
      return false;
    },
    mouseleave() {
      clearHoverTimer();
      scheduleHoverClose();
      return false;
    },
    keydown() {
      // Cualquier tecla en el editor cierra la que abrio el mouse.
      if (current && !current.focused) close(false);
      return false;
    },
  });

  return {
    state: { subscribe: state.subscribe },
    hover,
    close,
    applyFix,
    cancelHoverClose,
    scheduleHoverClose,

    showDetails(editor) {
      stopTypingIn(editor);
      const diagnostic = diagnosticAt(editor.state, editor.state.selection.main.head);
      if (!diagnostic) return false;
      open(diagnostic, true);
      return true;
    },

    applyFirstFix(editor) {
      stopTypingIn(editor);
      const fix = diagnosticAt(editor.state, editor.state.selection.main.head)?.fixes?.[0];
      if (!fix) return false;
      applyFix(fix);
      return true;
    },

    destroy() {
      clearHoverTimer();
      cancelHoverClose();
    },
  };
}

// El contador de errores: se cuenta una vez por cuadro, y solo si cambiaron
// los errores, el cursor (lo que se oculta mientras se escribe depende de el)
// o la geometria (para medir las barras de scroll).
export function diagnosticCounter(onCount: (count: number, view: EditorView) => void): {
  extension: Extension;
  destroy(): void;
} {
  let frame = 0;
  const extension = EditorView.updateListener.of((update) => {
    const changed =
      update.startState.field(diagnosticsField) !== update.state.field(diagnosticsField) || update.selectionSet;
    if (!changed && !update.geometryChanged) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => onCount(visibleDiagnosticCount(update.view.state), update.view));
  });
  return { extension, destroy: () => cancelAnimationFrame(frame) };
}
