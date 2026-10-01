import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { DEFAULT_INDENT_SIZE, type IndentSize, type IndentStyle } from "$lib/sqlIndentationConfig";

const STORAGE_KEY = "khipu:editor-settings:v1";
export const DEFAULT_FORMATTER_LINE_WIDTH = 60;
export const MIN_FORMATTER_LINE_WIDTH = 20;
export const MAX_FORMATTER_LINE_WIDTH = 240;

// Alias al elegir una tabla en el autocompletado: siempre, solo cuando la
// consulta ya tiene otra tabla, o nunca.
export type TableAliasMode = "always" | "multiple" | "never";
const TABLE_ALIAS_MODES: readonly TableAliasMode[] = ["always", "multiple", "never"];

export interface EditorSettings {
  formatterLineWidth: number;
  autoUppercaseKeywords: boolean;
  // Formatear alineando en columnas: alias, ON de los JOIN y operadores de
  // las condiciones (sqlFormatLayout.ts).
  formatterAlignColumns: boolean;
  tabNavigatesCompletion: boolean;
  indentStyle: IndentStyle;
  indentSize: IndentSize;
  tableAliases: TableAliasMode;
}

function normalizeLineWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_FORMATTER_LINE_WIDTH;
  return Math.min(MAX_FORMATTER_LINE_WIDTH, Math.max(MIN_FORMATTER_LINE_WIDTH, Math.round(value)));
}

function normalizeTableAliases(value: unknown): TableAliasMode {
  return TABLE_ALIAS_MODES.includes(value as TableAliasMode) ? (value as TableAliasMode) : "always";
}

function normalizeIndentStyle(value: unknown): IndentStyle {
  return value === "tabs" ? "tabs" : "spaces";
}

function normalizeIndentSize(value: unknown): IndentSize {
  return value === 4 || value === 8 ? value : DEFAULT_INDENT_SIZE;
}

function defaultEditorSettings(): EditorSettings {
  return {
    formatterLineWidth: DEFAULT_FORMATTER_LINE_WIDTH,
    autoUppercaseKeywords: true,
    formatterAlignColumns: true,
    tabNavigatesCompletion: true,
    indentStyle: "spaces",
    indentSize: DEFAULT_INDENT_SIZE,
    tableAliases: "always",
  };
}

function loadEditorSettings(): EditorSettings {
  if (!browser) return defaultEditorSettings();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultEditorSettings();
    const parsed = JSON.parse(stored) as Partial<EditorSettings>;
    return {
      formatterLineWidth: normalizeLineWidth(parsed.formatterLineWidth),
      autoUppercaseKeywords: parsed.autoUppercaseKeywords !== false,
      formatterAlignColumns: parsed.formatterAlignColumns !== false,
      tabNavigatesCompletion: parsed.tabNavigatesCompletion !== false,
      indentStyle: normalizeIndentStyle(parsed.indentStyle),
      indentSize: normalizeIndentSize(parsed.indentSize),
      tableAliases: normalizeTableAliases(parsed.tableAliases),
    };
  } catch {
    return defaultEditorSettings();
  }
}

export const editorSettings = writable<EditorSettings>(loadEditorSettings());

if (browser) {
  editorSettings.subscribe((settings) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formatterLineWidth: normalizeLineWidth(settings.formatterLineWidth),
          autoUppercaseKeywords: settings.autoUppercaseKeywords,
          formatterAlignColumns: settings.formatterAlignColumns,
          tabNavigatesCompletion: settings.tabNavigatesCompletion,
          indentStyle: normalizeIndentStyle(settings.indentStyle),
          indentSize: normalizeIndentSize(settings.indentSize),
          tableAliases: settings.tableAliases,
        }),
      );
    } catch {
      // El editor sigue funcionando con el valor en memoria si no hay almacenamiento.
    }
  });
}

export function setFormatterLineWidth(value: number): void {
  editorSettings.update((settings) => ({
    ...settings,
    formatterLineWidth: normalizeLineWidth(value),
  }));
}

export function setAutoUppercaseKeywords(enabled: boolean): void {
  editorSettings.update((settings) => ({ ...settings, autoUppercaseKeywords: enabled }));
}

export function setFormatterAlignColumns(enabled: boolean): void {
  editorSettings.update((settings) => ({ ...settings, formatterAlignColumns: enabled }));
}

export function setTabNavigatesCompletion(enabled: boolean): void {
  editorSettings.update((settings) => ({ ...settings, tabNavigatesCompletion: enabled }));
}

export function setIndentStyle(style: IndentStyle): void {
  editorSettings.update((settings) => ({ ...settings, indentStyle: normalizeIndentStyle(style) }));
}

export function setIndentSize(size: IndentSize): void {
  editorSettings.update((settings) => ({ ...settings, indentSize: normalizeIndentSize(size) }));
}

export function setTableAliases(mode: TableAliasMode): void {
  editorSettings.update((settings) => ({ ...settings, tableAliases: normalizeTableAliases(mode) }));
}
