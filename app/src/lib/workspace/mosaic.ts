// Mosaico tipo i3/bspwm: un arbol binario cuyas hojas son ids (consolas
// ahora, pestañas del resultado despues) y cuyos nodos internos parten su
// rectangulo en dos, a lo ancho ("row") o a lo alto ("column"), con la
// fraccion que se lleva el primero.
//
// Sin DOM ni stores: Workspace.svelte lo dibuja con posiciones absolutas
// (rects), asi reacomodar el arbol no vuelve a montar lo que hay dentro de
// cada hoja (el editor conserva cursor y deshacer).
//
// Un id aparece a lo sumo una vez: poner uno que ya esta lo mueve.

export type Mosaic =
  | { kind: "leaf"; id: string }
  | { kind: "split"; axis: "row" | "column"; ratio: number; first: Mosaic; second: Mosaic };

export type Side = "left" | "right" | "top" | "bottom";
export type Direction = Side;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Un divisor: el nodo que parte (por su camino desde la raiz), su eje y el
// rectangulo del nodo, para dibujarlo y para llevar el puntero a fraccion.
export interface Divider {
  path: string;
  axis: "row" | "column";
  ratio: number;
  area: Rect;
}

export const MIN_RATIO = 0.1;

// Destino "toda el area": no es ninguna hoja, asi que place parte la raiz.
// Con dos apiladas, la tercera va al lado de las dos, a toda la altura.
export const WHOLE = "\u0000whole";
const UNIT: Rect = { x: 0, y: 0, width: 1, height: 1 };

export function leaf(id: string): Mosaic {
  return { kind: "leaf", id };
}

export function leaves(node: Mosaic | null): string[] {
  if (!node) return [];
  return node.kind === "leaf" ? [node.id] : [...leaves(node.first), ...leaves(node.second)];
}

export function contains(node: Mosaic | null, id: string): boolean {
  return leaves(node).includes(id);
}

// Saca un id. Su hermano ocupa el lugar del nodo que los partia; sin hojas,
// null.
export function remove(node: Mosaic | null, id: string): Mosaic | null {
  if (!node) return null;
  if (node.kind === "leaf") return node.id === id ? null : node;
  const first = remove(node.first, id);
  const second = remove(node.second, id);
  if (!first) return second;
  if (!second) return first;
  if (first === node.first && second === node.second) return node;
  return { ...node, first, second };
}

// La hoja que queda mas cerca de `id` si se lo saca: la primera del hermano.
// Asi, cerrar un mosaico enfoca el que se agranda para ocupar su lugar.
export function siblingOf(node: Mosaic | null, id: string): string | null {
  if (!node || node.kind === "leaf") return null;
  if (node.first.kind === "leaf" && node.first.id === id) return leaves(node.second)[0] ?? null;
  if (node.second.kind === "leaf" && node.second.id === id) return leaves(node.first).at(-1) ?? null;
  return siblingOf(node.first, id) ?? siblingOf(node.second, id);
}

// Pone `id` al lado `side` de la hoja `target`, partiendola a la mitad. Si
// `id` ya estaba en el mosaico, se mueve (nunca queda dos veces). Si
// `target` no esta, se parte la raiz; sin mosaico, queda solo `id`.
export function place(node: Mosaic | null, target: string, id: string, side: Side): Mosaic {
  if (target === id) return node ?? leaf(id);
  const without = remove(node, id);
  if (!without) return leaf(id);
  const axis = side === "left" || side === "right" ? "row" : "column";
  const before = side === "left" || side === "top";
  const split = (existing: Mosaic): Mosaic => ({
    kind: "split",
    axis,
    ratio: 0.5,
    first: before ? leaf(id) : existing,
    second: before ? existing : leaf(id),
  });
  if (!contains(without, target)) return split(without);
  const visit = (current: Mosaic): Mosaic => {
    if (current.kind === "leaf") return current.id === target ? split(current) : current;
    return { ...current, first: visit(current.first), second: visit(current.second) };
  };
  return visit(without);
}

// La hoja `target` pasa a mostrar `id`. Si `id` ya estaba en otra hoja, las
// dos se intercambian: arrastrar una consola visible al centro de otra las
// cambia de lugar.
export function replace(node: Mosaic | null, target: string, id: string): Mosaic {
  if (!node) return leaf(id);
  if (target === id) return node;
  const swap = contains(node, id);
  const visit = (current: Mosaic): Mosaic => {
    if (current.kind === "split") return { ...current, first: visit(current.first), second: visit(current.second) };
    if (current.id === target) return leaf(id);
    if (swap && current.id === id) return leaf(target);
    return current;
  };
  return visit(node);
}

// Que `id` se vea: si ya esta, nada; si no, toma la hoja `focused` (la que
// tenia el foco), como elegir una pestaña en un contenedor de i3. Sin
// mosaico, queda sola.
export function reveal(node: Mosaic | null, id: string, focused: string | null): Mosaic {
  if (!node) return leaf(id);
  if (contains(node, id)) return node;
  const target = focused !== null && contains(node, focused) ? focused : leaves(node)[0];
  return replace(node, target, id);
}

// Un id que cambia de nombre (una pestaña del resultado al fijarla o
// desfijarla) sigue en su lugar. Si el nombre nuevo ya estaba en otra hoja,
// el viejo solo se va: nunca queda dos veces.
export function rename(node: Mosaic | null, from: string, to: string): Mosaic | null {
  if (!contains(node, from) || from === to) return node;
  if (contains(node, to)) return remove(node, from);
  const visit = (current: Mosaic): Mosaic =>
    current.kind === "leaf"
      ? current.id === from ? leaf(to) : current
      : { ...current, first: visit(current.first), second: visit(current.second) };
  return node && visit(node);
}

// Sin los ids que ya no existen (una consola cerrada en otra parte).
export function prune(node: Mosaic | null, keep: (id: string) => boolean): Mosaic | null {
  let current = node;
  for (const id of leaves(node)) if (!keep(id)) current = remove(current, id);
  return current;
}

function at(node: Mosaic, path: string): Mosaic | null {
  let current: Mosaic = node;
  for (const step of path) {
    if (current.kind !== "split") return null;
    current = step === "0" ? current.first : current.second;
  }
  return current;
}

export function setRatio(node: Mosaic, path: string, ratio: number): Mosaic {
  const target = at(node, path);
  if (!target || target.kind !== "split") return node;
  const clamped = Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, ratio));
  const visit = (current: Mosaic, rest: string): Mosaic => {
    if (current.kind !== "split") return current;
    if (rest === "") return { ...current, ratio: clamped };
    return rest[0] === "0"
      ? { ...current, first: visit(current.first, rest.slice(1)) }
      : { ...current, second: visit(current.second, rest.slice(1)) };
  };
  return visit(node, path);
}

function halves(area: Rect, axis: "row" | "column", ratio: number): [Rect, Rect] {
  if (axis === "row") {
    const width = area.width * ratio;
    return [
      { ...area, width },
      { ...area, x: area.x + width, width: area.width - width },
    ];
  }
  const height = area.height * ratio;
  return [
    { ...area, height },
    { ...area, y: area.y + height, height: area.height - height },
  ];
}

// Rectangulo de cada hoja, en fracciones del area (0..1).
export function rects(node: Mosaic | null, area: Rect = UNIT): Map<string, Rect> {
  const out = new Map<string, Rect>();
  const visit = (current: Mosaic, box: Rect) => {
    if (current.kind === "leaf") {
      out.set(current.id, box);
      return;
    }
    const [a, b] = halves(box, current.axis, current.ratio);
    visit(current.first, a);
    visit(current.second, b);
  };
  if (node) visit(node, area);
  return out;
}

export function dividers(node: Mosaic | null, area: Rect = UNIT): Divider[] {
  const out: Divider[] = [];
  const visit = (current: Mosaic, box: Rect, path: string) => {
    if (current.kind === "leaf") return;
    out.push({ path, axis: current.axis, ratio: current.ratio, area: box });
    const [a, b] = halves(box, current.axis, current.ratio);
    visit(current.first, a, `${path}0`);
    visit(current.second, b, `${path}1`);
  };
  if (node) visit(node, area, "");
  return out;
}

// La hoja vecina en una direccion, por geometria (como i3): la que esta del
// otro lado del borde y se solapa con esta; entre varias, la que mas se
// solapa y, a igualdad, la mas cercana al centro. null en el borde.
export function neighbor(node: Mosaic | null, id: string, direction: Direction): string | null {
  const boxes = rects(node);
  const from = boxes.get(id);
  if (!from) return null;
  const EPSILON = 1e-6;
  let best: { id: string; overlap: number; distance: number } | null = null;
  for (const [other, box] of boxes) {
    if (other === id) continue;
    const horizontal = direction === "left" || direction === "right";
    const touches =
      direction === "left" ? Math.abs(box.x + box.width - from.x) < EPSILON
      : direction === "right" ? Math.abs(from.x + from.width - box.x) < EPSILON
      : direction === "top" ? Math.abs(box.y + box.height - from.y) < EPSILON
      : Math.abs(from.y + from.height - box.y) < EPSILON;
    if (!touches) continue;
    const overlap = horizontal
      ? Math.min(from.y + from.height, box.y + box.height) - Math.max(from.y, box.y)
      : Math.min(from.x + from.width, box.x + box.width) - Math.max(from.x, box.x);
    if (overlap <= EPSILON) continue;
    const distance = horizontal
      ? Math.abs(box.y + box.height / 2 - (from.y + from.height / 2))
      : Math.abs(box.x + box.width / 2 - (from.x + from.width / 2));
    if (!best || overlap > best.overlap + EPSILON || (Math.abs(overlap - best.overlap) <= EPSILON && distance < best.distance)) {
      best = { id: other, overlap, distance };
    }
  }
  return best?.id ?? null;
}

// Donde cae algo que se suelta sobre una hoja, por la posicion relativa del
// puntero (0..1), como en VS Code: cada tercio de un borde es ese lado y el
// medio es la hoja misma. En una hoja ancha mandan izquierda y derecha (arriba
// y abajo solo en el tercio del medio); en una alta, al reves. Medido en
// fracciones sin esa prioridad, en un mosaico ancho y bajo el borde de abajo
// quedaba a pocos pixeles y ganaba casi siempre: no habia como ponerla al lado.
export function dropSide(x: number, y: number, wide: boolean): Side | "center" {
  const THIRD = 1 / 3;
  const across: Side | null = x < THIRD ? "left" : x > 1 - THIRD ? "right" : null;
  const down: Side | null = y < THIRD ? "top" : y > 1 - THIRD ? "bottom" : null;
  return (wide ? (across ?? down) : (down ?? across)) ?? "center";
}

// Lo guardado: solo arboles bien formados, con ratios en rango y sin ids
// repetidos. Cualquier otra cosa, null.
export function parseMosaic(value: unknown): Mosaic | null {
  const seen = new Set<string>();
  const visit = (raw: unknown): Mosaic | null => {
    if (!raw || typeof raw !== "object") return null;
    const node = raw as Record<string, unknown>;
    if (node.kind === "leaf") {
      if (typeof node.id !== "string" || seen.has(node.id)) return null;
      seen.add(node.id);
      return leaf(node.id);
    }
    if (node.kind !== "split" || (node.axis !== "row" && node.axis !== "column")) return null;
    if (typeof node.ratio !== "number" || !(node.ratio >= MIN_RATIO && node.ratio <= 1 - MIN_RATIO)) return null;
    const first = visit(node.first);
    const second = first && visit(node.second);
    if (!first || !second) return null;
    return { kind: "split", axis: node.axis, ratio: node.ratio, first, second };
  };
  return visit(value);
}
