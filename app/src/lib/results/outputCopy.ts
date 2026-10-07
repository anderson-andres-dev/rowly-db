// Copiar la Salida: las ultimas N lineas del registro (o todas), con su marca
// de tiempo, tal como se ven. Sin DOM ni stores: OutputLog.svelte copia y
// recuerda la cantidad elegida (localStorage).

import type { LogEntry } from "$lib/stores/executionLog";

export type CopyAmount = number | "all";

export const COPY_CHOICES: readonly CopyAmount[] = [20, 50, 100, "all"];
export const DEFAULT_COPY_AMOUNT: CopyAmount = 50;
export const MAX_CUSTOM_LINES = 100_000;

const STORAGE_KEY = "khipu:output-copy-lines:v1";

export function formatTimestamp(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  );
}

// Cada linea del registro como se ve: la primera de una entrada con su marca
// de tiempo (y el prompt de una sentencia); las siguientes de una entrada
// larga, alineadas debajo del texto.
export function outputLines(entries: readonly LogEntry[]): string[] {
  const lines: string[] = [];
  for (const entry of entries) {
    const stamp = `[${formatTimestamp(entry.at)}] `;
    const text = entry.kind === "query" && entry.schema ? `${entry.schema}>${entry.text}` : entry.text;
    const parts = text.split("\n");
    lines.push(stamp + parts[0]);
    for (const part of parts.slice(1)) lines.push(" ".repeat(stamp.length) + part);
  }
  return lines;
}

export function lastLines(entries: readonly LogEntry[], amount: CopyAmount): string {
  const lines = outputLines(entries);
  return (amount === "all" ? lines : lines.slice(-amount)).join("\n");
}

// Una cantidad propia valida: un entero de 1 al tope.
export function parseCustomAmount(value: string): number | null {
  const amount = Number(value.trim());
  return Number.isInteger(amount) && amount >= 1 && amount <= MAX_CUSTOM_LINES ? amount : null;
}

export function loadCopyAmount(): CopyAmount {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "all") return "all";
    const amount = raw === null ? null : parseCustomAmount(raw);
    return amount ?? DEFAULT_COPY_AMOUNT;
  } catch {
    return DEFAULT_COPY_AMOUNT;
  }
}

export function saveCopyAmount(amount: CopyAmount): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(amount));
  } catch {
    // Sin almacenamiento, la eleccion vale solo durante la sesion.
  }
}
