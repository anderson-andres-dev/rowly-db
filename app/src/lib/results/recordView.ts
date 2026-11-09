import type { QueryColumn, QueryRow } from "$lib/types";
import { typeProblem, type TypeProblem } from "./cellTypes";
import { isJsonColumnType } from "./jsonHighlight";
import {
  cellBlock,
  currentValue,
  originalValue,
  sameValue,
  type CellBlock,
  type CellValue,
  type PendingEdits,
  type ResultEditInfo,
} from "./resultEditing";

// Vista de registro (#133): una fila del resultado como formulario vertical.
// Aqui solo esta lo que se calcula (que se muestra de cada columna y como se
// navega); el estado de las ediciones es el del resultado, el mismo que usa
// la rejilla (resultEditing.ts), y el panel no guarda copia.

// Mas de esto no se pinta junto: un TEXT o un BLOB enorme no debe armar un
// nodo gigante. Al editar si se trabaja con el texto completo.
export const DISPLAY_LIMIT = 20_000;

export type FieldKind = "null" | "default" | "text" | "json" | "binary";

export interface RecordField {
  col: number;
  name: string;
  type: string;
  nullable: boolean | null;
  defaultValue: string | null;
  primaryKey: boolean;
  value: CellValue;
  modified: boolean;
  kind: FieldKind;
  // Lo que se ve: el texto, el JSON con sangria o el hex. Vacio en NULL y DEFAULT.
  display: string;
  // Lo que arranca el editor al entrar a editar (el valor completo).
  editText: string;
  // Solo en binarios.
  bytes: number | null;
  truncated: boolean;
  problem: TypeProblem | null;
  // Por que no se puede editar; null si se puede.
  blocked: CellBlock | null;
}

// Cuantas filas hay: las del resultado mas las nuevas pendientes.
export function totalRows(rows: readonly QueryRow[], edits: PendingEdits): number {
  return rows.length + edits.inserted.length;
}

// La fila a mostrar: la de la seleccion, acotada; sin seleccion, la primera.
export function clampRow(row: number | null, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(Math.max(row ?? 0, 0), total - 1);
}

// La fila siguiente (o anterior) que se ve: las ocultas por "Filtrar filas" se saltan,
// como hace la rejilla al copiar. Sin otra, se queda donde esta.
export function stepRow(row: number, step: 1 | -1, total: number, hidden: ReadonlySet<number> | null): number {
  for (let next = row + step; next >= 0 && next < total; next += step) {
    if (!hidden?.has(next)) return next;
  }
  return row;
}

const HEX = /^(?:0x|\\x)([0-9a-f]*)$/i;
const BINARY_TYPE = /blob|binary|bytea/i;

// El driver entrega el binario que no es UTF-8 como hex con prefijo
// (`0x…` en MySQL, `\x…` en PostgreSQL).
export function binaryBytes(type: string, text: string): number | null {
  if (!BINARY_TYPE.test(type)) return null;
  const match = HEX.exec(text);
  return match ? Math.floor(match[1].length / 2) : null;
}

// Sangra un JSON sin tocar ni un solo caracter de sus valores: un numero se
// ve igual que llego (un BIGINT dentro del JSON no pasa por Number). Solo
// se decide donde van los saltos de linea y los espacios fuera de las
// cadenas. Un texto que no es JSON valido se devuelve tal cual.
export function indentJson(text: string): string {
  const trimmed = text.trim();
  if (!/^[[{]/.test(trimmed)) return text;
  try {
    JSON.parse(trimmed);
  } catch {
    return text;
  }
  let out = "";
  let depth = 0;
  let inString = false;
  const pad = () => "\n" + "  ".repeat(depth);
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      out += ch;
      if (ch === "\\") out += trimmed[++i] ?? "";
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "{" || ch === "[") {
      const close = ch === "{" ? "}" : "]";
      let j = i + 1;
      while (/\s/.test(trimmed[j] ?? "")) j++;
      if (trimmed[j] === close) {
        out += ch + close;
        i = j;
      } else {
        depth++;
        out += ch + pad();
      }
    } else if (ch === "}" || ch === "]") {
      depth--;
      out += pad() + ch;
    } else if (ch === ",") {
      out += "," + pad();
    } else if (ch === ":") {
      out += ": ";
    } else if (!/\s/.test(ch)) {
      out += ch;
    }
  }
  return out;
}

function describe(
  value: CellValue,
  type: string,
  jsonColumn: boolean,
): { kind: FieldKind; display: string; editText: string; bytes: number | null; truncated: boolean } {
  if (value.kind === "null") return { kind: "null", display: "", editText: "", bytes: null, truncated: false };
  if (value.kind === "default") return { kind: "default", display: "", editText: "", bytes: null, truncated: false };
  const text = value.value;
  const bytes = binaryBytes(type, text);
  if (bytes !== null) {
    return {
      kind: "binary",
      display: text.length > DISPLAY_LIMIT ? text.slice(0, DISPLAY_LIMIT) : text,
      editText: text,
      bytes,
      truncated: text.length > DISPLAY_LIMIT,
    };
  }
  const asJson = jsonColumn || /^\s*[[{]/.test(text);
  const shown = asJson ? indentJson(text) : text;
  const kind: FieldKind = asJson && shown !== text ? "json" : jsonColumn ? "json" : "text";
  return {
    kind,
    display: shown.length > DISPLAY_LIMIT ? shown.slice(0, DISPLAY_LIMIT) : shown,
    editText: shown,
    bytes: null,
    truncated: shown.length > DISPLAY_LIMIT,
  };
}

export function recordFields(
  columns: readonly QueryColumn[],
  rows: readonly QueryRow[],
  edits: PendingEdits,
  info: ResultEditInfo | null,
  row: number,
): RecordField[] {
  const isNew = row >= rows.length;
  return columns.map((column, col) => {
    const editable = info?.columns[col] ?? null;
    const value = currentValue(edits, rows, row, col);
    const modified = !isNew && !sameValue(value, originalValue(rows[row][col]));
    const type = editable?.dataType || column.type;
    const shown = describe(value, type, isJsonColumnType(type));
    return {
      col,
      name: column.name,
      type,
      nullable: editable ? editable.nullable : (column.nullable ?? null),
      defaultValue: editable?.defaultValue ?? null,
      primaryKey: editable?.isPrimaryKey ?? false,
      value,
      modified: modified || isNew,
      ...shown,
      // Como en la rejilla: un cambio que no encaja se marca; el NULL inicial
      // de una columna obligatoria en una fila nueva se avisa al aplicar.
      problem: editable && (modified || (isNew && value.kind === "text")) ? typeProblem(editable, value) : null,
      blocked: cellBlock(info, edits, rows.length, row, col, column.name),
    };
  });
}

// Lo que se escribio en un campo frente a lo que ya mostraba: si no cambio
// nada no hay que tocar los pendientes (y un NULL sigue NULL si se deja vacio).
export function draftChanged(field: RecordField, draft: string): boolean {
  if (field.value.kind === "null" || field.value.kind === "default") return draft !== "";
  return draft !== field.editText;
}
