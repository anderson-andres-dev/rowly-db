import type { ChangeSet } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { setAnalysisIn, type SqlDiagnostic } from "$lib/sqlDiagnostics";
import { statementsFrom } from "$lib/sqlStatementIndex";
import type { ScannedStatement } from "$lib/sqlStatements";

// Analisis mientras se escribe, a escala (docs/specs/v0.2-documentos-grandes.md,
// 15d). En vez de mandar las sentencias alrededor del cursor en cada pausa:
//
// - Se lleva la cuenta de las regiones "sucias" (lo editado, y donde el
//   indice de sentencias dice que cambiaron sus limites); lo demas conserva
//   sus diagnosticos, que el RangeSet de sqlDiagnostics.ts mapea solo.
// - Los resultados se guardan por texto de la sentencia: volver a mirar una
//   sentencia que no cambio no llama al backend.
// - Se procesa por lotes, primero lo que se ve, despues el resto del
//   documento en segundo plano, cediendo entre lotes. Mientras se escribe se
//   para, y retoma tras la pausa.
// - Cada lote reemplaza lo que el analisis habia dicho en su tramo
//   (setAnalysisIn), nunca el documento entero.

export interface AnalysisRunnerOptions<Raw> {
  view: () => EditorView | undefined;
  // El backend: un resultado por sentencia.
  analyze: (statements: string[]) => Promise<Raw[]>;
  // Lo que devuelve el backend para una sentencia, a diagnosticos del
  // editor (`from`: donde empieza la sentencia).
  toDiagnostics: (from: number, statement: string, raw: Raw) => SqlDiagnostic[];
  delayMs?: number;
}

interface Region {
  from: number;
  to: number;
}

// Sentencias por llamada al backend.
const BATCH = 200;
// Resultados guardados: al pasarse, se olvidan los mas viejos.
const CACHE_LIMIT = 100_000;

export class AnalysisRunner<Raw> {
  private dirty: Region[] = [];
  private cache = new Map<string, Raw>();
  // Sube al vaciar la cache: una respuesta de antes ya no vale.
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private lastEdit = 0;
  private destroyed = false;
  private readonly delay: number;

  constructor(private readonly options: AnalysisRunnerOptions<Raw>) {
    this.delay = options.delayMs ?? 500;
  }

  // Todo el documento por revisar (al abrir, o con otro catalogo o idioma).
  markAllDirty(): void {
    this.dirty = [{ from: 0, to: Number.MAX_SAFE_INTEGER }];
  }

  // Otro catalogo o dialecto: los resultados guardados ya no valen.
  clearCache(): void {
    this.cache.clear();
    this.generation += 1;
  }

  // Un cambio del texto: lo sucio se mapea y se agrega lo tocado (y donde
  // cambiaron los limites de las sentencias, si el indice lo dice).
  noteChanges(changes: ChangeSet, statementsChanged: Region | null): void {
    this.lastEdit = performance.now();
    const next: Region[] = this.dirty.map((region) => ({
      from: changes.mapPos(Math.min(region.from, changes.length), -1),
      to: changes.mapPos(Math.min(region.to, changes.length), 1),
    }));
    changes.iterChangedRanges((_fromA, _toA, fromB, toB) => next.push({ from: fromB, to: toB }));
    if (statementsChanged) next.push(statementsChanged);
    this.dirty = merge(next);
  }

  // Tras la pausa, revisar lo sucio.
  schedule(): void {
    if (this.destroyed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, this.delay);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer) clearTimeout(this.timer);
  }

  // Lo que falta por revisar (para las pruebas).
  pending(): readonly Region[] {
    return this.dirty;
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (!this.destroyed && this.dirty.length > 0) {
        // Se esta escribiendo: se retoma tras la pausa.
        if (performance.now() - this.lastEdit < this.delay) {
          this.schedule();
          return;
        }
        const view = this.options.view();
        if (!view) return;
        const { state } = view;
        const batch = this.nextBatch(view);
        const texts = batch.statements.map((item) => state.sliceDoc(item.from, item.to));

        const missing = [...new Set(texts.filter((text) => !this.cache.has(text)))];
        if (missing.length > 0) {
          const generation = this.generation;
          let found: Raw[];
          try {
            found = await this.options.analyze(missing);
          } catch {
            // Sin conexion o el backend fallo: se reintenta tras la proxima
            // pausa.
            return;
          }
          if (generation !== this.generation || !Array.isArray(found)) continue;
          missing.forEach((text, index) => this.remember(text, found[index]));
        }

        // Si se edito mientras tanto, el lote se vuelve a armar (lo pedido ya
        // quedo guardado).
        const current = this.options.view();
        if (!current || current.state.doc !== state.doc) continue;

        const list = batch.statements.flatMap((item, index) => {
          const raw = this.cache.get(texts[index]);
          return raw === undefined ? [] : this.options.toDiagnostics(item.from, texts[index], raw);
        });
        current.dispatch({ effects: setAnalysisIn.of({ ranges: [batch.replace], list }) });
        this.dirty = subtract(this.dirty, batch.covered, state.doc.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      this.running = false;
    }
  }

  private remember(text: string, raw: Raw | undefined): void {
    if (raw === undefined) return;
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(text, raw);
  }

  // El proximo lote: lo sucio que se ve primero; si no, desde lo visible
  // hacia abajo y despues desde el principio.
  private nextBatch(view: EditorView): { statements: ScannedStatement[]; covered: Region; replace: Region } {
    const { from: viewFrom, to: viewTo } = view.viewport;
    const length = view.state.doc.length;
    const found =
      this.dirty.find((item) => item.to >= viewFrom && item.from <= viewTo) ??
      this.dirty.find((item) => item.to >= viewFrom) ??
      this.dirty[0];
    const region = { from: Math.min(found.from, length), to: Math.min(found.to, length) };
    // Una region que empieza arriba de lo visible se empieza por lo visible.
    const start = region.from < viewFrom && viewFrom < region.to ? viewFrom : region.from;
    const statements = statementsFrom(view.state, start, BATCH).filter((item) => item.from <= region.to);
    const last = statements[statements.length - 1];
    const covered = {
      from: start,
      to: statements.length < BATCH || !last ? region.to : Math.max(start, Math.min(region.to, last.to)),
    };
    // Lo que se reemplaza: lo cubierto mas las sentencias enteras que lo
    // tocan (sin dejar diagnosticos viejos donde ya no hay sentencias).
    const replace = {
      from: Math.min(covered.from, statements[0]?.from ?? covered.from),
      to: Math.max(covered.to, last?.to ?? covered.to),
    };
    return { statements, covered, replace };
  }
}

function merge(regions: Region[]): Region[] {
  const sorted = regions.filter((item) => item.to >= item.from).sort((a, b) => a.from - b.from);
  const merged: Region[] = [];
  for (const region of sorted) {
    const last = merged[merged.length - 1];
    if (last && region.from <= last.to) last.to = Math.max(last.to, region.to);
    else merged.push({ ...region });
  }
  return merged;
}

// Quita `removed` de las regiones; lo que pasa del fin del documento
// (`length`) cuenta como cubierto si `removed` llega al fin.
function subtract(regions: Region[], removed: Region, length: number): Region[] {
  if (removed.to >= length) removed = { from: removed.from, to: Number.MAX_SAFE_INTEGER };
  return regions.flatMap((region) => {
    if (removed.to < region.from || removed.from > region.to) return [region];
    const parts: Region[] = [];
    if (region.from < removed.from) parts.push({ from: region.from, to: removed.from });
    if (removed.to < region.to) parts.push({ from: removed.to, to: region.to });
    return parts;
  });
}
