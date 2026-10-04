// Pestañas de resultado de una consola: identidad, orden y seleccion.
// Funciones puras: el estado vive en Workspace (orden y pestaña elegida, por
// consola) y en stores/pinnedResults (las fijadas); aqui solo se decide.
//
// Claves: la pestaña normal usa el id de la consola; cada fijada,
// "<consola>#pin<n>" (resultKey de stores/pinnedResults). "output" es la
// Salida, que siempre existe.

export const OUTPUT_TAB = "output";

export interface ResultTab {
  key: string;
  label: string;
  pinned: boolean;
}

// La pestaña que se ve: la elegida si sigue existiendo; si no, la normal
// cuando hay un resultado y, sin el, la Salida.
export function visibleTab(
  consoleId: string,
  chosen: string | undefined,
  exists: (tab: string) => boolean,
  liveHasResult: boolean,
): string {
  if (chosen && exists(chosen)) return chosen;
  return liveHasResult ? consoleId : OUTPUT_TAB;
}

// Fijadas primero (en el orden en que se fijaron) y la normal al final,
// salvo que el usuario las haya reordenado: entonces manda su orden, y lo
// que no aparece en el va al final conservando su posicion relativa.
export function orderTabs<T extends { key: string }>(tabs: T[], order: string[] | undefined): T[] {
  if (!order) return tabs;
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => rank(a.tab.key) - rank(b.tab.key) || a.index - b.index)
    .map(({ tab }) => tab);
}

// Cuando una pestaña cambia de clave (fijar: la normal pasa a ser una
// fijada; desfijar sin otra normal: al reves) conserva su lugar: se
// reemplaza una clave por la otra en la misma posicion. Nada se reacomoda
// solo; lo nuevo va al final.
export function replaceTabKey(order: string[] | undefined, current: string[], fromKey: string, toKey: string): string[] {
  const next = (order ?? current).map((key) => (key === fromKey ? toKey : key));
  if (!next.includes(toKey)) next.push(toKey);
  return next;
}

// Primera tabla despues de FROM, tal como esta escrita (con su schema si lo
// trae), sin comillas. Solo resuelve el caso simple: con varias tablas se
// toma la primera.
export function firstFromTable(sql: string): { schema?: string; table: string } | undefined {
  const match = /\bfrom\s+((?:[`"]?[\w$]+[`"]?\s*\.\s*)?[`"]?[\w$]+[`"]?)/i.exec(sql);
  if (!match) return undefined;
  const parts = match[1].split(".").map((part) => part.trim().replace(/^[`"]|[`"]$/g, ""));
  return parts.length === 2 ? { schema: parts[0], table: parts[1] } : { table: parts[0] };
}
