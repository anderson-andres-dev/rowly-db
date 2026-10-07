// Grupos de pestañas en mosaico, como los grupos de VS Code: las hojas del
// arbol (workspace/mosaic.ts) son grupos, cada uno con su fila de pestañas y
// una elegida. Lo usan las consolas del editor y el resultado de una
// consola. Sin DOM ni stores: Workspace.svelte guarda el estado.
//
// Cada pestaña vive en un solo grupo. Las nuevas entran en el enfocado; un
// grupo sin pestañas se va y su hermano ocupa el lugar. Algunas pestañas no
// entran en el mosaico (`pinned`: la Salida del resultado): van siempre al
// grupo de una esquina.

import { leaf, leaves, rects, remove, siblingOf, type Mosaic } from "./mosaic";

export interface TabGroups {
  tree: Mosaic;
  // Pestaña -> su grupo.
  member: Record<string, string>;
  // Grupo -> su pestaña elegida.
  selected: Record<string, string>;
  focus: string;
}

export type Corner = "left" | "right";

export function emptyGroups(first: string): TabGroups {
  return { tree: leaf(first), member: {}, selected: {}, focus: first };
}

export function copyGroups(groups: TabGroups): TabGroups {
  return { tree: groups.tree, member: { ...groups.member }, selected: { ...groups.selected }, focus: groups.focus };
}

// Las pestañas de un grupo, en el orden de `keys`.
export function groupTabs(groups: TabGroups, group: string, keys: readonly string[]): string[] {
  return keys.filter((key) => groups.member[key] === group);
}

// El grupo de arriba a la izquierda o a la derecha.
export function cornerGroup(tree: Mosaic, corner: Corner): string {
  let best: [string, number] | null = null;
  for (const [id, box] of rects(tree)) {
    if (box.y > 1e-6) continue;
    const edge = corner === "left" ? -box.x : box.x + box.width;
    if (!best || edge > best[1]) best = [id, edge];
  }
  return best?.[0] ?? leaves(tree)[0];
}

// Coherente con las pestañas que hay: cada una en un grupo (las nuevas en el
// enfocado, las de `pinned` en su esquina), sin grupos vacios y con una
// elegida valida en cada uno.
export function normalizeGroups(groups: TabGroups, keys: readonly string[], pinned: Record<string, Corner> = {}): TabGroups {
  const next = copyGroups(groups);
  const present = new Set(keys);
  if (!leaves(next.tree).includes(next.focus)) next.focus = leaves(next.tree)[0];
  for (const key of Object.keys(next.member)) if (!present.has(key)) delete next.member[key];
  for (const key of keys) next.member[key] ??= next.focus;
  const pin = () => {
    for (const [key, corner] of Object.entries(pinned)) if (present.has(key)) next.member[key] = cornerGroup(next.tree, corner);
  };
  pin();
  for (const group of leaves(next.tree)) {
    const tabs = groupTabs(next, group, keys);
    if (tabs.length > 0) continue;
    // Solo, el ultimo grupo queda aunque no tenga pestañas.
    if (leaves(next.tree).length === 1) break;
    const sibling = siblingOf(next.tree, group);
    next.tree = remove(next.tree, group) ?? leaf(group);
    delete next.selected[group];
    if (next.focus === group && sibling) next.focus = sibling;
    // Quitar un grupo puede cambiar cual es el de la esquina.
    pin();
  }
  for (const group of leaves(next.tree)) {
    const tabs = groupTabs(next, group, keys);
    if (tabs.length === 0) delete next.selected[group];
    else if (!tabs.includes(next.selected[group])) next.selected[group] = tabs.at(-1)!;
  }
  for (const group of Object.keys(next.selected)) if (!leaves(next.tree).includes(group)) delete next.selected[group];
  return next;
}

// Elegir una pestaña: su grupo pasa a ser el enfocado y ella su elegida.
export function choose(groups: TabGroups, key: string): TabGroups {
  const group = groups.member[key];
  if (!group) return groups;
  if (groups.focus === group && groups.selected[group] === key) return groups;
  const next = copyGroups(groups);
  next.focus = group;
  next.selected[group] = key;
  return next;
}

// Mover una pestaña a otro grupo (entra elegida y enfocada). En el de origen
// queda elegida otra; si se queda vacio, normalizeGroups lo saca.
export function moveTab(groups: TabGroups, key: string, to: string, keys: readonly string[]): TabGroups {
  const next = copyGroups(groups);
  const from = next.member[key];
  next.member[key] = to;
  next.selected[to] = key;
  next.focus = to;
  if (from && from !== to && next.selected[from] === key) {
    const rest = groupTabs(next, from, keys);
    if (rest.length > 0) next.selected[from] = rest.at(-1)!;
    else delete next.selected[from];
  }
  return next;
}

// Juntar un grupo con su hermano: sus pestañas pasan al hermano y la que se
// veia sigue elegida. null si es el unico.
export function mergeGroup(groups: TabGroups, group: string): TabGroups | null {
  const sibling = siblingOf(groups.tree, group);
  if (!sibling) return null;
  const next = copyGroups(groups);
  for (const [key, owner] of Object.entries(next.member)) if (owner === group) next.member[key] = sibling;
  if (next.selected[group]) next.selected[sibling] = next.selected[group];
  delete next.selected[group];
  next.tree = remove(next.tree, group) ?? leaf(sibling);
  next.focus = sibling;
  return next;
}

// Una pestaña que cambia de clave (fijar o desfijar un resultado) sigue en
// su grupo y, si era la elegida, lo sigue siendo.
export function renameTab(groups: TabGroups, from: string, to: string): TabGroups {
  if (!groups.member[from]) return groups;
  const next = copyGroups(groups);
  next.member[to] = next.member[from];
  delete next.member[from];
  for (const [group, key] of Object.entries(next.selected)) if (key === from) next.selected[group] = to;
  return next;
}

// Lo guardado: un arbol valido y mapas de texto; lo demas lo arregla
// normalizeGroups con las pestañas que haya.
export function parseGroups(value: unknown, parseTree: (raw: unknown) => Mosaic | null): TabGroups | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const tree = parseTree(raw.tree);
  if (!tree) return null;
  const strings = (input: unknown): Record<string, string> => {
    const out: Record<string, string> = {};
    if (input && typeof input === "object") {
      for (const [key, item] of Object.entries(input)) if (typeof item === "string") out[key] = item;
    }
    return out;
  };
  const focus = typeof raw.focus === "string" && leaves(tree).includes(raw.focus) ? raw.focus : leaves(tree)[0];
  return { tree, member: strings(raw.member), selected: strings(raw.selected), focus };
}
