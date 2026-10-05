import { ansiString } from "$lib/engines/common";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { writeClipboard } from "$lib/clipboard";
import type { CellValue } from "$lib/results/resultEditing";

// Copiar y pegar del grid de resultados.
//
// Copiar serializa la seleccion en el formato elegido (TSV, CSV, JSON,
// Markdown, SQL INSERT). Pegar interpreta lo que haya en el portapapeles:
//   - si es EXACTAMENTE lo ultimo que copio el propio grid, se usan los
//     valores reales que se guardaron al copiar (NULL de verdad, sin
//     depender del formato): copiar como JSON y pegar en otra fila del grid
//     pega valores, no el JSON;
//   - si viene de afuera: JSON (arreglo de objetos, mapeado por nombre de
//     columna) o, si no, TSV (lo que copian Excel/Sheets/LibreOffice).

export type CopyFormat = "tsv" | "csv" | "json" | "markdown" | "sql";

export const COPY_FORMATS: { id: CopyFormat; label: string }[] = [
  { id: "tsv", label: "TSV" },
  { id: "csv", label: "CSV" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
  { id: "sql", label: "SQL INSERT" },
];

export interface CopyColumn {
  name: string;
  type: string;
}

export interface CopyOptions {
  format: CopyFormat;
  headers: boolean;
  // Tabla para SQL INSERT ("schema.tabla").
  tableName: string;
  // Los textos del INSERT como literales del motor de la conexion (en
  // MySQL la barra invertida tambien se escapa). Sin conexion, SQL estandar.
  quoteString?: (value: string) => string;
}

const NUMERIC_TYPE = /int|decimal|numeric|float|double|real|serial|money/i;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const JSON_TYPE = /^jsonb?$/i;

function text(value: CellValue): string {
  return value.kind === "text" ? value.value : "";
}

// TSV/CSV: NULL como celda vacia es lo que esperan las planillas; el grid no
// pierde nada porque al pegar internamente usa los valores guardados.
function tsvField(value: CellValue): string {
  return value.kind === "null" ? "" : text(value).replace(/[\t\r\n]+/g, " ");
}

function csvField(value: CellValue): string {
  if (value.kind === "null") return "";
  const raw = text(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function markdownField(value: CellValue): string {
  if (value.kind === "null") return "NULL";
  return text(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function jsonValue(value: CellValue, column: CopyColumn): unknown {
  if (value.kind === "null") return null;
  const raw = text(value);
  if (NUMERIC_TYPE.test(column.type) && PLAIN_NUMBER.test(raw)) return Number(raw);
  if (JSON_TYPE.test(column.type)) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function sqlLiteral(value: CellValue, column: CopyColumn, quoteString: (value: string) => string): string {
  if (value.kind === "null") return "NULL";
  if (value.kind === "default") return "DEFAULT";
  const raw = value.value;
  if (NUMERIC_TYPE.test(column.type) && PLAIN_NUMBER.test(raw)) return raw;
  return quoteString(raw);
}

export function serializeSelection(columns: CopyColumn[], rows: CellValue[][], options: CopyOptions): string {
  // Una sola celda: su valor tal cual, sin formato (lo mas util a diario).
  if (rows.length === 1 && columns.length === 1 && options.format !== "sql") {
    const value = rows[0][0];
    return value.kind === "null" ? "NULL" : text(value);
  }
  switch (options.format) {
    case "tsv": {
      const lines = rows.map((row) => row.map(tsvField).join("\t"));
      if (options.headers) lines.unshift(columns.map((column) => column.name).join("\t"));
      return lines.join("\n");
    }
    case "csv": {
      const lines = rows.map((row) => row.map(csvField).join(","));
      if (options.headers) lines.unshift(columns.map((column) => csvField({ kind: "text", value: column.name })).join(","));
      return lines.join("\n");
    }
    case "json": {
      const objects = rows.map((row) =>
        Object.fromEntries(columns.map((column, index) => [column.name, jsonValue(row[index], column)])),
      );
      return JSON.stringify(objects, null, 2);
    }
    case "markdown": {
      const header = `| ${columns.map((column) => markdownField({ kind: "text", value: column.name })).join(" | ")} |`;
      const rule = `| ${columns.map(() => "---").join(" | ")} |`;
      const body = rows.map((row) => `| ${row.map(markdownField).join(" | ")} |`);
      return [header, rule, ...body].join("\n");
    }
    case "sql": {
      const names = columns.map((column) => column.name).join(", ");
      const quoteString = options.quoteString ?? ansiString;
      return rows
        .map(
          (row) =>
            `INSERT INTO ${options.tableName} (${names}) VALUES (${row.map((value, index) => sqlLiteral(value, columns[index], quoteString)).join(", ")});`,
        )
        .join("\n");
    }
  }
}

// --- Pegar ------------------------------------------------------------------

// Lo ultimo que copio el grid: el texto escrito al portapapeles y los
// valores reales detras de el.
let lastCopy: { text: string; rows: CellValue[][] } | null = null;

export function rememberCopy(text: string, rows: CellValue[][]): void {
  lastCopy = { text, rows };
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

// NULL literal en datos externos: lo que escriben el propio grid y DataGrip.
function externalValue(raw: string): CellValue {
  return raw === "NULL" || raw === "<null>" ? { kind: "null" } : { kind: "text", value: raw };
}

function parseTsv(value: string): CellValue[][] {
  const lines = normalizeNewlines(value).split("\n");
  // Las planillas terminan lo copiado con un salto de linea: no es una fila.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t").map(externalValue));
}

// JSON externo: un objeto o un arreglo de objetos; cada clave se ubica en la
// columna del mismo nombre (sin distinguir mayusculas), a partir de la
// columna donde se pega.
function parseJsonObjects(value: string, columnNames: string[]): CellValue[][] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const objects = Array.isArray(parsed) ? parsed : [parsed];
  if (objects.length === 0 || !objects.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return null;
  }
  const lowered = columnNames.map((name) => name.toLowerCase());
  const known = objects.some((item) => Object.keys(item as object).some((key) => lowered.includes(key.toLowerCase())));
  if (!known) return null;
  return (objects as Record<string, unknown>[]).map((item) => {
    const byName = new Map(Object.entries(item).map(([key, entry]) => [key.toLowerCase(), entry]));
    return lowered.map((name): CellValue | undefined => {
      if (!byName.has(name)) return undefined;
      const entry = byName.get(name);
      if (entry === null) return { kind: "null" };
      return { kind: "text", value: typeof entry === "object" ? JSON.stringify(entry) : String(entry) };
    }) as CellValue[];
  });
}

export interface PasteBlock {
  rows: (CellValue | undefined)[][];
  // Las columnas del bloque ya estan alineadas por nombre (JSON): se pega
  // desde la primera columna, no desde la seleccionada.
  alignedByName: boolean;
}

export function parseClipboard(value: string, columnNames: string[]): PasteBlock | null {
  if (value === "") return null;
  if (lastCopy && value === lastCopy.text) return { rows: lastCopy.rows, alignedByName: false };
  const json = parseJsonObjects(value, columnNames);
  if (json) return { rows: json, alignedByName: true };
  return { rows: parseTsv(value), alignedByName: false };
}

// --- Portapapeles del sistema -----------------------------------------------
// Via el plugin de Tauri (nativo): en WebKitGTK los eventos copy/paste no se
// disparan de forma confiable sin texto seleccionado y leer el portapapeles
// desde la web puede estar bloqueado. Si el plugin falla, se intenta la API
// del navegador.

export async function writeClipboardText(value: string): Promise<boolean> {
  try {
    await writeText(value);
    return true;
  } catch {
    return await writeClipboard(value);
  }
}

export async function readClipboardText(): Promise<string> {
  try {
    return (await readText()) ?? "";
  } catch {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  }
}
