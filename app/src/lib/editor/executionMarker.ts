import { RangeSet, RangeValue, StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  WidgetType,
  gutter,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { translate, type MessageKey } from "$lib/i18n";
import type { QueryExecutionResult } from "$lib/types";

// Estado de la ultima sentencia ejecutada desde el editor, al estilo
// DataGrip: un icono en el margen de su primera linea (ejecutando / ok /
// error) y el tiempo en ms al final de la linea donde termina. El rango se
// mapea con cada edicion, asi que el marcador sigue a la sentencia si se
// escribe antes o dentro de ella. El tiempo nunca queda pegado al cursor:
// va al final de la linea y se oculta mientras esa linea se edita.
//
// "pending" es el tramo en que el guard de sentencias destructivas espera
// confirmacion: se conserva el rango (si se confirma, el resultado vuelve a
// esta misma sentencia) pero no se pinta nada, porque todavia no corre.
export type ExecutionMarkerStatus = "pending" | "running" | "success" | "error";

export interface ExecutionPart {
  from: number;
  to: number;
  status: ExecutionMarkerStatus;
  executionTimeMs?: number;
  message?: string;
}

// Un script lleva ademas una marca por sentencia (`parts`): cada una con su
// icono y su tiempo, y se pintan esas en vez de la del rango entero. Las que
// no llegaron a correr quedan en "pending" (sin marca).
export interface ExecutionMarkerInput extends ExecutionPart {
  parts?: ExecutionPart[];
}

// Las partes van en un RangeSet: con 250 000 sentencias, mapearlas en cada
// tecla o marcar una no
// recorre ni copia las demas.
class PartValue extends RangeValue {
  startSide = 1;
  endSide = -1;

  constructor(
    readonly index: number,
    readonly status: ExecutionMarkerStatus,
    readonly executionTimeMs?: number,
    readonly message?: string,
  ) {
    super();
  }

  eq(other: RangeValue): boolean {
    return other === this;
  }
}

export interface ExecutionMarker extends ExecutionPart {
  parts: RangeSet<PartValue> | null;
  // Donde quedo la ultima parte marcada: el script las marca en orden.
  hint: number;
}

type PartStatus = Omit<ExecutionPart, "from" | "to">;

// Marcador nuevo (reemplaza al anterior).
export const setExecutionMarker = StateEffect.define<ExecutionMarkerInput | null>();
// Estado del rango entero, conservando las partes.
export const updateExecutionMarker = StateEffect.define<PartStatus>();
// Estado de la sentencia `index` del script.
export const setPartStatus = StateEffect.define<{ index: number; part: PartStatus }>();

function partValue(index: number, part: PartStatus): PartValue {
  return new PartValue(index, part.status, part.executionTimeMs, part.message);
}

function findPart(parts: RangeSet<PartValue>, index: number, hint: number): { from: number; to: number; value: PartValue } | null {
  for (const start of [hint, 0]) {
    for (const cursor = parts.iter(start); cursor.value; cursor.next()) {
      if (cursor.value.index === index) return { from: cursor.from, to: cursor.to, value: cursor.value };
      if (cursor.value.index > index) break;
    }
  }
  return null;
}

export const executionMarkerField = StateField.define<ExecutionMarker | null>({
  create: () => null,
  update(marker, transaction) {
    if (marker && transaction.docChanged) {
      const from = transaction.changes.mapPos(marker.from, 1);
      const to = transaction.changes.mapPos(marker.to, -1);
      // La sentencia se borro por completo: no queda a que atar el marcador.
      marker =
        to <= from
          ? null
          : {
              ...marker,
              from,
              to,
              parts: marker.parts?.map(transaction.changes) ?? null,
              hint: transaction.changes.mapPos(marker.hint, 1),
            };
    }
    for (const effect of transaction.effects) {
      if (effect.is(setExecutionMarker)) {
        const input = effect.value;
        marker = input
          ? {
              from: input.from,
              to: input.to,
              status: input.status,
              executionTimeMs: input.executionTimeMs,
              message: input.message,
              parts: input.parts
                ? RangeSet.of(
                    input.parts
                      .map((part, index) => partValue(index, part).range(part.from, part.to))
                      .filter((range) => range.from < range.to),
                  )
                : null,
              hint: input.from,
            }
          : null;
      } else if (effect.is(updateExecutionMarker) && marker) {
        marker = { ...marker, ...effect.value };
      } else if (effect.is(setPartStatus) && marker?.parts) {
        const { index, part } = effect.value;
        const found = findPart(marker.parts, index, marker.hint);
        if (!found) continue;
        marker = {
          ...marker,
          hint: found.from,
          parts: marker.parts.update({
            filterFrom: found.from,
            filterTo: found.to,
            filter: (_from, _to, value) => value !== found.value,
            add: [partValue(index, part).range(found.from, found.to)],
          }),
        };
      }
    }
    return marker;
  },
});

// La parte `index` del script en curso, con su posicion de ahora.
export function executionPart(state: EditorState, index: number): ExecutionPart | null {
  const marker = state.field(executionMarkerField);
  if (!marker?.parts) return null;
  const found = findPart(marker.parts, index, marker.hint);
  if (!found) return null;
  const { status, executionTimeMs, message } = found.value;
  return { from: found.from, to: found.to, status, executionTimeMs, message };
}

export function markerFromResult(from: number, to: number, result: QueryExecutionResult): ExecutionPart {
  if (result.type === "error") return { from, to, status: "error", message: result.message };
  return { from, to, status: "success", executionTimeMs: result.executionTimeMs };
}

// Lo que se pinta en [from, to]: las sentencias del script o, si no es un
// script, el rango.
function visibleParts(marker: ExecutionMarker | null, length: number, from: number, to: number): ExecutionPart[] {
  if (!marker) return [];
  const parts: ExecutionPart[] = [];
  if (marker.parts) {
    marker.parts.between(from, to, (partFrom, partTo, value) => {
      const { status, executionTimeMs, message } = value;
      parts.push({ from: partFrom, to: partTo, status, executionTimeMs, message });
    });
  } else if (marker.to >= from && marker.from <= to) {
    parts.push(marker);
  }
  return parts.filter((part) => part.status !== "pending" && part.to <= length);
}

export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

// El texto se traduce al armar el marcador y forma parte de eq(): con
// cualquier actualizacion de la vista despues de cambiar el idioma, el
// gutter ve un marcador distinto y lo vuelve a pintar.
class StatusGutterMarker extends GutterMarker {
  readonly label: string;

  constructor(
    readonly status: ExecutionMarkerStatus,
    readonly message: string | undefined,
  ) {
    super();
    this.label = translate(STATUS_LABEL[status]);
  }

  eq(other: StatusGutterMarker) {
    return other.status === this.status && other.message === this.message && other.label === this.label;
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = `cm-executionStatus cm-executionStatus-${this.status}`;
    element.setAttribute("aria-label", this.label);
    element.title = this.message ?? this.label;
    return element;
  }
}

const STATUS_LABEL: Record<ExecutionMarkerStatus, MessageKey> = {
  pending: "editor.marker.pending",
  running: "editor.marker.running",
  success: "editor.marker.success",
  error: "editor.marker.error",
};

class ExecutionTimeWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  eq(other: ExecutionTimeWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = "cm-executionTime";
    element.textContent = this.text;
    return element;
  }

  ignoreEvent() {
    return false;
  }
}

// Las lineas con un cursor, si el editor tiene el foco: ahi no se pinta el
// tiempo, que taparia lo que se escribe.
function editedLines(state: EditorState, focused: boolean): Set<number> {
  const lines = new Set<number>();
  if (!focused) return lines;
  for (const range of state.selection.ranges) lines.add(state.doc.lineAt(range.head).number);
  return lines;
}

// Donde va el tiempo de cada parte: al final de la linea en que termina,
// salvo que esa linea se este editando.
export function executionTimePositions(
  state: EditorState,
  parts: readonly ExecutionPart[],
  focused: boolean,
): { pos: number; text: string }[] {
  const edited = editedLines(state, focused);
  const positions: { pos: number; text: string }[] = [];
  for (const part of parts) {
    if (part.executionTimeMs === undefined) continue;
    const line = state.doc.lineAt(part.to);
    if (edited.has(line.number)) continue;
    positions.push({ pos: line.to, text: formatExecutionTime(part.executionTimeMs) });
  }
  return positions;
}

// Solo lo visible (ver visibleParts).
function executionTimeDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const marker = state.field(executionMarkerField);
  const widgets = view.visibleRanges.flatMap(({ from, to }) =>
    executionTimePositions(
      state,
      visibleParts(marker, state.doc.length, from, to).filter((part) => part.to >= from && part.to <= to),
      view.hasFocus,
    ).map(({ pos, text }) => Decoration.widget({ widget: new ExecutionTimeWidget(text), side: 1 }).range(pos)),
  );
  return Decoration.set(widgets, true);
}

const executionTimes = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = executionTimeDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged ||
        update.startState.field(executionMarkerField) !== update.state.field(executionMarkerField)
      ) {
        this.decorations = executionTimeDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export const executionMarker: Extension = [
  executionMarkerField,
  executionTimes,
  gutter({
    class: "cm-executionGutter",
    markers(view) {
      const { from, to } = view.viewport;
      const parts = visibleParts(view.state.field(executionMarkerField), view.state.doc.length, from, to);
      return RangeSet.of(
        parts
          .filter((part) => part.from >= from)
          .map((part) => new StatusGutterMarker(part.status, part.message).range(view.state.doc.lineAt(part.from).from)),
        true,
      );
    },
    initialSpacer: () => new StatusGutterMarker("success", undefined),
  }),
];
