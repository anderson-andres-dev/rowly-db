// Analisis mientras se escribe (analyze_sql). Tras la pausa, el backend revisa
// sintaxis y nombres contra el catalogo, sin tocar la base: solo lo que cambio,
// con los resultados guardados por sentencia y el resto del documento en
// segundo plano (sqlAnalysis.ts). Aqui no hay DOM: la vista solo da su
// EditorView para pintar.

import type { ChangeSet } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { backendText, invoke, type BackendMessage } from "$lib/backend";
import type { SqlProfile } from "$lib/engines";
import type { MessageKey, MessageParams } from "$lib/i18n";
import { AnalysisRunner, type Region } from "$lib/sqlAnalysis";
import { createdTables } from "$lib/sqlCreatedTables";
import { lineColumnToOffset, type QuickFix, type SqlDiagnostic } from "$lib/sqlDiagnostics";

export interface AnalysisPosition {
  line: number;
  column: number;
}

export interface AnalysisDiagnostic {
  start: AnalysisPosition;
  end: AnalysisPosition;
  message: BackendMessage;
  suggestions?: { start: AnalysisPosition; end: AnalysisPosition; replacement: string }[];
}

// Nombres que no existen: se pintan en rojo en vez de subrayarse.
export const UNRESOLVED_KEYS: ReadonlySet<string> = new Set([
  "diagnostic.unknownTable",
  "diagnostic.unknownColumn",
  "diagnostic.unknownColumnAny",
  "diagnostic.unknownQualifier",
]);

// Lo que falta cerrar mientras se escribe: no es un error todavia.
// crates/server-tests/tests/real_server.rs replica esta lista (SQL_ENGINE §9).
export const UNFINISHED_KEYS: ReadonlySet<string> = new Set([
  "diagnostic.incomplete",
  "diagnostic.unclosedParen",
  "diagnostic.unclosedCase",
  "diagnostic.unterminatedString",
  "diagnostic.unterminatedIdentifier",
  "diagnostic.unterminatedDollarQuote",
  "diagnostic.unterminatedComment",
]);

// Lo mismo, pero solo si es lo ultimo de la sentencia (`SELECT a,` o
// `WHERE a =` a medio escribir).
export const UNFINISHED_AT_END_KEYS: ReadonlySet<string> = new Set([
  "diagnostic.trailingComma",
  "diagnostic.extraComma",
  "diagnostic.missingValue",
]);

// Los mensajes genericos de sqlparser ("Expected X, found Y" y los que no
// traducimos): con la sentencia a medias suele retroceder y senalar un token
// anterior al que falta (sqlDiagnostics.ts, whileTyping).
export const VAGUE_KEYS: ReadonlySet<string> = new Set([
  "",
  "diagnostic.unexpected",
  "diagnostic.expected",
  "diagnostic.expectedStatement",
  "diagnostic.expectedExpression",
  "diagnostic.expectedIdentifier",
  "diagnostic.expectedClose",
]);

type Text = (key: MessageKey, params?: MessageParams) => string;

const samePosition = (a: AnalysisPosition, b: AnalysisPosition) => a.line === b.line && a.column === b.column;

// Lo que dijo el backend de una sentencia que empieza en `start`.
export function analysisDiagnostics(
  start: number,
  statement: string,
  found: AnalysisDiagnostic[],
  text: Text,
): SqlDiagnostic[] {
  const at = (position: AnalysisPosition) => start + lineColumnToOffset(statement, position.line, position.column);
  return found.map((item) => {
    const from = at(item.start);
    const to = Math.max(from + 1, at(item.end));
    const message = backendText(item.message);
    const suggestions = item.suggestions ?? [];
    const key = typeof item.message === "object" ? item.message.key : "";
    // Un nombre que no existe: "¿Quisiste decir…?" con el mas parecido.
    const hint =
      UNRESOLVED_KEYS.has(key) && suggestions[0]?.replacement
        ? ` ${text("editor.diagnostics.didYouMean", { name: suggestions[0].replacement })}`
        : "";
    const fixes: QuickFix[] = suggestions.map((suggestion) => ({
      label: !suggestion.replacement
        ? text("editor.diagnostics.fix.delete")
        : samePosition(suggestion.start, suggestion.end)
          ? text("editor.diagnostics.fix.insert", { text: suggestion.replacement })
          : text("editor.diagnostics.fix.replace", { text: suggestion.replacement }),
      from: at(suggestion.start),
      to: at(suggestion.end),
      insert: suggestion.replacement,
    }));
    // Lo que solo dice que falta terminar: no se muestra mientras se escribe
    // en esa sentencia (sqlDiagnostics.ts, typing).
    const incomplete =
      UNFINISHED_KEYS.has(key) || (UNFINISHED_AT_END_KEYS.has(key) && statement.slice(to - start).trim() === "");
    return {
      from,
      to,
      message: message + hint,
      source: "analysis",
      fixes,
      unresolved: UNRESOLVED_KEYS.has(key),
      incomplete,
      vague: VAGUE_KEYS.has(key),
    };
  });
}

// Los resultados del analisis por texto de sentencia, para el catalogo y el
// motor vigentes. Viven fuera del editor: cada pestaña monta su propio editor,
// y con la cache adentro volver a una pestaña reanalizaba el documento entero
// en el backend. Por conexion tambien (dos conexiones del mismo motor con el
// catalogo todavia vacio no comparten resultados) y por las tablas que crea el
// documento: con otras, lo que se dijo de una sentencia cambia.
let shared: {
  profileId: string | null;
  tables: unknown;
  engine: SqlProfile;
  created: string;
  cache: Map<string, unknown>;
} | null = null;

export function analysisCacheFor<Raw>(
  profileId: string | null,
  tables: unknown,
  engine: SqlProfile,
  created: string,
): Map<string, Raw> {
  if (
    !shared ||
    shared.profileId !== profileId ||
    shared.tables !== tables ||
    shared.engine !== engine ||
    shared.created !== created
  ) {
    shared = { profileId, tables, engine, created, cache: new Map() };
  }
  return shared.cache as Map<string, Raw>;
}

export interface AnalysisSessionOptions {
  view: () => EditorView | undefined;
  text: Text;
  // analyze_sql; reemplazable en las pruebas.
  analyze?: (statements: string[], created: string[]) => Promise<AnalysisDiagnostic[][]>;
}

export interface AnalysisSession {
  // Otra conexion, otro catalogo u otro motor: los nombres se vuelven a
  // revisar. Con los mismos no hace nada.
  setContext(profileId: string | null, tables: unknown, engine: SqlProfile): void;
  // Un cambio del documento: se reanaliza lo que cambio tras la pausa.
  noteChanges(changes: ChangeSet, statementsChanged: Region | null): void;
  schedule(): void;
  // Otro idioma: los mensajes se rehacen desde la cache, sin llamar al backend.
  retranslate(): void;
  destroy(): void;
}

export function createAnalysisSession(options: AnalysisSessionOptions): AnalysisSession {
  const analyze =
    options.analyze ??
    ((statements, created) => invoke<AnalysisDiagnostic[][]>("analyze_sql", { statements, created }));
  // Las tablas que crea el documento (sqlCreatedTables.ts), para que el
  // analisis no las de por inexistentes. Se vuelven a buscar en cada ronda.
  let createdNames: string[] = [];
  let createdKey = "";
  let context: { profileId: string | null; tables: unknown; engine: SqlProfile } | null = null;

  const runner: AnalysisRunner<AnalysisDiagnostic[]> = new AnalysisRunner<AnalysisDiagnostic[]>({
    view: options.view,
    analyze: (statements) => analyze(statements, createdNames),
    toDiagnostics: (start, statement, found) => analysisDiagnostics(start, statement, found, options.text),
    prepare: () => {
      const view = options.view();
      if (!view) return;
      const names = createdTables(view.state.doc);
      const key = names.join(",");
      if (key === createdKey) return;
      createdNames = names;
      createdKey = key;
      if (context) runner.useCache(analysisCacheFor(context.profileId, context.tables, context.engine, createdKey));
      runner.markAllDirty();
    },
  });
  runner.markAllDirty();

  return {
    setContext(profileId, tables, engine) {
      if (context && context.profileId === profileId && context.tables === tables && context.engine === engine) return;
      context = { profileId, tables, engine };
      runner.useCache(analysisCacheFor(profileId, tables, engine, createdKey));
      runner.markAllDirty();
      runner.schedule();
    },
    noteChanges: (changes, statementsChanged) => runner.noteChanges(changes, statementsChanged),
    schedule: () => runner.schedule(),
    retranslate() {
      runner.markAllDirty();
      runner.schedule();
    },
    destroy: () => runner.destroy(),
  };
}
