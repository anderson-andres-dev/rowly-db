import {
  Facet,
  RangeSet,
  RangeValue,
  StateEffect,
  StateField,
  type ChangeSet,
  type EditorState,
  type Extension,
  type Text,
} from "@codemirror/state";
import { ViewPlugin, type EditorView, type ViewUpdate } from "@codemirror/view";
import {
  SCAN_OVERLAP,
  STANDARD_LEXICAL,
  chooseStatement,
  initialScanState,
  scanChunk,
  type ScanState,
  type ScannedStatement,
  type SqlLexical,
} from "$lib/sqlStatements";

// Las sentencias del documento, al dia en cada tecla sin recorrerlo entero
// (diseño en docs/specs/v0.2-documentos-grandes.md, 15a).
//
// Se guardan en un RangeSet: mapearlo a traves de un cambio comparte los
// trozos que no se tocan, y buscar la sentencia de una posicion es
// logaritmico. Justo despues de un ";" el escaner esta fuera de comillas y
// comentarios (un "punto seguro"): al editar se vuelve a escanear desde el
// ultimo antes del cambio y se para en cuanto, pasado el cambio, se cae en
// un punto seguro que ya existia. Lo que no alcanza el presupuesto de una
// tecla (p. ej. abrir una comilla arriba de todo) se termina en segundo
// plano, por trozos.

class StatementMark extends RangeValue {
  constructor(readonly terminated: boolean) {
    super();
  }

  eq(other: RangeValue): boolean {
    return other instanceof StatementMark && other.terminated === this.terminated;
  }
}

const TERMINATED = new StatementMark(true);
const OPEN = new StatementMark(false);

interface Resume {
  pos: number;
  state: ScanState;
}

interface IndexValue {
  // Exacto hasta cleanTo; nada despues.
  set: RangeSet<StatementMark>;
  // Punto seguro hasta donde esta indexado (doc.length: todo).
  cleanTo: number;
  // Escaneo de fondo a medias, mas alla de cleanTo (dentro de una sentencia
  // o de un comentario largo). null: se sigue desde cleanTo.
  resume: Resume | null;
  // Donde pudieron cambiar las sentencias con el ultimo cambio del texto
  // (lo que se volvio a escanear, o hasta el final si no resincronizo):
  // lo que el analisis tiene que volver a mirar. null sin cambios.
  changed: { from: number; to: number } | null;
  // Las reglas del motor con que se escaneo (sqlLexical).
  lexical: SqlLexical;
}

// Como se escribe el SQL del motor de la conexion (su perfil en
// lib/engines). Sin valor, el SQL estandar. Al cambiar (otra conexion), el
// indice se vuelve a armar.
export const sqlLexical = Facet.define<SqlLexical, SqlLexical>({
  combine: (values) => values[0] ?? STANDARD_LEXICAL,
});

// Trozo que se lee de una vez; lo que puede escanear una tecla y cada paso
// de fondo antes de ceder.
const CHUNK = 64 * 1024;
const TYPING_BUDGET = 256 * 1024;
const BACKGROUND_BUDGET = 1024 * 1024;

const indexMore = StateEffect.define<null>();

function marks(statements: readonly ScannedStatement[]) {
  return statements.map((item) => (item.terminated ? TERMINATED : OPEN).range(item.from, item.to));
}

function hasTerminatedEnd(set: RangeSet<StatementMark>, pos: number): boolean {
  let found = false;
  set.between(pos, pos, (_from, to, value) => {
    if (to === pos && value.terminated) {
      found = true;
      return false;
    }
  });
  return found;
}

interface ScanResult {
  added: ScannedStatement[];
  cleanTo: number;
  resume: Resume | null;
  // Punto seguro donde coincidio con el indice anterior; lo de despues se
  // conserva.
  resyncAt: number | null;
}

// Escanea `doc` desde `from` agregando sentencias. Para al llegar al fin, al
// agotar `budget`, al pasar `until` (ya se sabe lo que hay hasta ahi) o, con
// `old`, en el primer punto seguro despues de `mustPass` que ya estaba en el
// indice anterior.
function scanForward(
  doc: Text,
  from: Resume,
  cleanTo: number,
  options: {
    lexical: SqlLexical;
    budget: number;
    until?: number;
    old?: RangeSet<StatementMark>;
    mustPass?: number;
  },
): ScanResult {
  const state: ScanState = { ...from.state };
  const added: ScannedStatement[] = [];
  const start = from.pos;
  let pos = from.pos;
  for (;;) {
    const end = Math.min(doc.length, pos + CHUNK + SCAN_OVERLAP);
    const final = end === doc.length;
    // Dos caracteres de contexto hacia atras: la "E" de un E'...' puede
    // quedar al final del trozo anterior.
    const back = Math.min(2, pos);
    const text = doc.sliceString(pos - back, end);
    const found: ScannedStatement[] = [];
    const stop =
      scanChunk(text, pos - back, final ? text.length : CHUNK + back, final, state, found, options.lexical, back) - back;
    for (const item of found) {
      added.push(item);
      if (!item.terminated) continue;
      cleanTo = item.to;
      if (options.old && item.to > (options.mustPass ?? 0) && hasTerminatedEnd(options.old, item.to)) {
        return { added, cleanTo, resume: null, resyncAt: item.to };
      }
      if (options.until !== undefined && item.to > options.until) {
        return { added, cleanTo, resume: null, resyncAt: null };
      }
    }
    if (final) return { added, cleanTo: doc.length, resume: null, resyncAt: null };
    pos += stop;
    if (pos - start >= options.budget) {
      const fresh = state.mode === 0 && state.codeStart < 0;
      return {
        added,
        cleanTo,
        resume: fresh && pos === cleanTo ? null : { pos, state },
        resyncAt: null,
      };
    }
  }
}

// El ultimo punto seguro antes de `pos` (0 si no hay).
function safePointBefore(set: RangeSet<StatementMark>, pos: number): number {
  for (let window = 4096; ; window *= 4) {
    const low = Math.max(0, pos - window);
    let best = -1;
    set.between(low, pos, (_from, to, value) => {
      if (value.terminated && to < pos && to > best) best = to;
    });
    if (best >= 0) return best;
    if (low === 0) return 0;
  }
}

function build(doc: Text, lexical: SqlLexical): IndexValue {
  const result = scanForward(doc, { pos: 0, state: initialScanState() }, 0, {
    lexical,
    budget: TYPING_BUDGET,
  });
  return {
    set: RangeSet.of(marks(result.added)),
    cleanTo: result.cleanTo,
    resume: result.resume,
    changed: null,
    lexical,
  };
}

function mapResume(resume: Resume, changes: ChangeSet): Resume {
  const { codeStart, lastNonSpace } = resume.state;
  return {
    pos: changes.mapPos(resume.pos, 1),
    state: {
      ...resume.state,
      codeStart: codeStart < 0 ? codeStart : changes.mapPos(codeStart, 1),
      lastNonSpace: lastNonSpace < 0 ? lastNonSpace : changes.mapPos(lastNonSpace, 1),
    },
  };
}

function applyChanges(value: IndexValue, changes: ChangeSet, doc: Text): IndexValue {
  let fromA = Infinity;
  let toA = -1;
  let fromB = Infinity;
  let toB = -1;
  changes.iterChangedRanges((changeFromA, changeToA, changeFromB, changeToB) => {
    fromA = Math.min(fromA, changeFromA);
    toA = Math.max(toA, changeToA);
    fromB = Math.min(fromB, changeFromB);
    toB = Math.max(toB, changeToB);
  });

  // Todo despues de lo indexado: el indice no cambia; el escaneo de fondo
  // a medias sigue valiendo si el cambio quedo despues de el.
  if (fromA >= value.cleanTo && value.cleanTo < changes.length) {
    const resume = value.resume && fromA >= value.resume.pos ? value.resume : null;
    return { ...value, resume, changed: { from: fromB, to: doc.length } };
  }

  const set = value.set.map(changes);
  const start = safePointBefore(set, fromB);
  const result = scanForward(doc, { pos: start, state: initialScanState() }, start, {
    lexical: value.lexical,
    budget: TYPING_BUDGET,
    old: set,
    mustPass: toB,
  });

  if (result.resyncAt !== null) {
    const resyncAt = result.resyncAt;
    const kept = value.resume && toA <= value.cleanTo ? mapResume(value.resume, changes) : null;
    return {
      set: set.update({
        filterFrom: start,
        filterTo: resyncAt,
        filter: (from) => from < start || from >= resyncAt,
        add: marks(result.added),
      }),
      cleanTo: changes.mapPos(value.cleanTo, 1),
      resume: kept,
      changed: { from: start, to: resyncAt },
      lexical: value.lexical,
    };
  }
  return {
    set: set.update({
      filterFrom: start,
      filterTo: doc.length,
      filter: (from) => from < start,
      add: marks(result.added),
    }),
    cleanTo: result.cleanTo,
    resume: result.resume,
    changed: { from: start, to: doc.length },
    lexical: value.lexical,
  };
}

function advance(value: IndexValue, doc: Text): IndexValue {
  if (value.cleanTo >= doc.length) return value;
  const from = value.resume ?? {
    pos: value.cleanTo,
    state: initialScanState(),
  };
  const result = scanForward(doc, from, value.cleanTo, {
    lexical: value.lexical,
    budget: BACKGROUND_BUDGET,
  });
  return {
    set: value.set.update({ add: marks(result.added) }),
    cleanTo: result.cleanTo,
    resume: result.resume,
    changed: null,
    lexical: value.lexical,
  };
}

export const statementIndexField = StateField.define<IndexValue>({
  create: (state) => build(state.doc, state.facet(sqlLexical)),
  update(value, transaction) {
    // Otro motor: sus comillas y comentarios cambian todo; se vuelve a armar
    // (lo que no alcanza, de fondo, como al abrir).
    const lexical = transaction.state.facet(sqlLexical);
    if (lexical !== value.lexical)
      return { ...build(transaction.state.doc, lexical), changed: { from: 0, to: transaction.state.doc.length } };
    let next = value.changed ? { ...value, changed: null } : value;
    if (transaction.docChanged) next = applyChanges(next, transaction.changes, transaction.state.doc);
    if (transaction.effects.some((effect) => effect.is(indexMore))) next = advance(next, transaction.state.doc);
    return next;
  },
});

// Un paso del trabajo de fondo (lo despacha backgroundIndexer; en las
// pruebas, a mano).
export function statementIndexStep(): StateEffect<null> {
  return indexMore.of(null);
}

// Donde pudieron cambiar las sentencias en la ultima transaccion.
export function statementsChangedIn(state: EditorState): { from: number; to: number } | null {
  return state.field(statementIndexField, false)?.changed ?? null;
}

export function statementIndexComplete(state: EditorState): boolean {
  return state.field(statementIndexField).cleanTo >= state.doc.length;
}

// Termina el indice en segundo plano, un trozo por vuelta, cediendo entre
// trozos.
const backgroundIndexer = ViewPlugin.fromClass(
  class {
    timer: ReturnType<typeof setTimeout> | null = null;

    constructor(readonly view: EditorView) {
      this.schedule();
    }

    update(_update: ViewUpdate) {
      this.schedule();
    }

    schedule() {
      if (this.timer !== null || statementIndexComplete(this.view.state)) return;
      this.timer = setTimeout(() => {
        this.timer = null;
        if (!statementIndexComplete(this.view.state)) this.view.dispatch({ effects: indexMore.of(null) });
      }, 0);
    }

    destroy() {
      if (this.timer !== null) clearTimeout(this.timer);
    }
  },
);

export const statementIndex: Extension = [statementIndexField, backgroundIndexer];

// Las sentencias que tocan [from, to], en orden. Si el indice todavia no
// llega hasta ahi, lo que falta se escanea en el momento (sin guardarlo).
export function statementsIn(state: EditorState, from: number, to: number): ScannedStatement[] {
  const value = state.field(statementIndexField);
  const list: ScannedStatement[] = [];
  value.set.between(from, to, (start, end, mark) => {
    list.push({ from: start, to: end, terminated: mark.terminated });
  });
  if (to >= value.cleanTo && value.cleanTo < state.doc.length) {
    const resume = value.resume ?? {
      pos: value.cleanTo,
      state: initialScanState(),
    };
    const result = scanForward(state.doc, resume, value.cleanTo, {
      lexical: value.lexical,
      budget: Infinity,
      until: to,
    });
    for (const item of result.added) if (item.to >= from && item.from <= to) list.push(item);
  }
  return list;
}

// La sentencia que contiene `pos` (incluido justo despues de su ";").
export function statementContaining(state: EditorState, pos: number): ScannedStatement | null {
  return statementsIn(state, pos, pos).find((item) => item.from <= pos && pos <= item.to) ?? null;
}

// La sentencia a ejecutar con el cursor en `pos` (reglas de chooseStatement
// en sqlStatements.ts): se buscan vecinas en una ventana que crece hasta
// tener una a cada lado o llegar a los bordes.
export function statementNear(state: EditorState, pos: number): ScannedStatement | null {
  const lineAt = (at: number) => state.doc.lineAt(at).number;
  for (let window = 2048; ; window *= 4) {
    const low = Math.max(0, pos - window);
    const high = Math.min(state.doc.length, pos + window);
    const list = statementsIn(state, low, high);
    const inside = list.find((item) => item.from <= pos && pos <= item.to);
    if (inside) return inside;
    const hasBefore = low === 0 || list.some((item) => item.to < pos);
    const hasAfter = high === state.doc.length || list.some((item) => item.from > pos);
    if (hasBefore && hasAfter) return chooseStatement(list, pos, lineAt);
  }
}

// El texto de la sentencia que se esta escribiendo en `pos`, para el
// autocompletado: la que lo contiene o, entre sentencias (justo despues de
// un ";" incluido), el hueco hasta la siguiente. `offset` es `pos` relativo a
// `text`. Sin el indice en el estado (p. ej. en pruebas), el documento
// entero.
export function statementTextAt(state: EditorState, pos: number): { text: string; offset: number } {
  if (!state.field(statementIndexField, false)) return { text: state.doc.toString(), offset: pos };
  const near = statementsIn(state, pos, pos);
  const inside = near.find((item) => item.from <= pos && (pos < item.to || (pos === item.to && !item.terminated)));
  let from: number;
  let to: number;
  if (inside) {
    from = inside.from;
    to = inside.to;
  } else {
    from = near.findLast((item) => item.to <= pos)?.to ?? previousEnd(state, pos);
    to = near.find((item) => item.from > pos)?.from ?? nextStart(state, pos);
  }
  return { text: state.sliceDoc(from, to), offset: pos - from };
}

function previousEnd(state: EditorState, pos: number): number {
  for (let window = 4096; ; window *= 4) {
    const low = Math.max(0, pos - window);
    const before = statementsIn(state, low, pos).findLast((item) => item.to <= pos);
    if (before) return before.to;
    if (low === 0) return 0;
  }
}

function nextStart(state: EditorState, pos: number): number {
  for (let window = 4096; ; window *= 4) {
    const high = Math.min(state.doc.length, pos + window);
    const after = statementsIn(state, pos, high).find((item) => item.from > pos);
    if (after) return after.from;
    if (high === state.doc.length) return high;
  }
}

// Hasta `count` sentencias desde `pos` (incluida la que lo contiene), en
// orden, sin recorrer mas que eso.
export function statementsFrom(state: EditorState, pos: number, count: number): ScannedStatement[] {
  const value = state.field(statementIndexField);
  const list: ScannedStatement[] = [];
  for (const cursor = value.set.iter(pos); cursor.value && list.length < count; cursor.next()) {
    list.push({ from: cursor.from, to: cursor.to, terminated: cursor.value.terminated });
  }
  if (list.length < count && value.cleanTo < state.doc.length) {
    const resume = value.resume ?? { pos: value.cleanTo, state: initialScanState() };
    const start = Math.max(pos, value.cleanTo);
    // Lo que falta, escaneado en el momento hasta juntar las que faltan.
    let until = start + 64 * 1024;
    for (;;) {
      const result = scanForward(state.doc, resume, value.cleanTo, { lexical: value.lexical, budget: Infinity, until });
      const more = result.added.filter((item) => item.to >= pos);
      if (more.length >= count - list.length || until >= state.doc.length) {
        list.push(...more.slice(0, count - list.length));
        return list;
      }
      until *= 4;
    }
  }
  return list;
}
