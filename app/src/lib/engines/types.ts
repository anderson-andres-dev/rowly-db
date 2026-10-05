import type { SQLDialect } from "@codemirror/lang-sql";
import type { ErrorLocator } from "$lib/editor/diagnostics";
import type { ErrorHelp } from "$lib/editor/errorHelp";
import type { ExplorerRoutine, RoutineParameter } from "$lib/types";

// Todo lo que cambia de un motor a otro, en un solo lugar
// (SQL_ENGINE.es.md). El resto de la app le pregunta al
// perfil; nunca compara el nombre del motor ni cae en silencio a otro.

// Como se escribe el SQL del motor (comillas, comentarios, escapes): vive en
// sqlStatements.ts, el modulo mas bajo, porque lo usan el escaner y el lexer.
export type { SqlLexical } from "$lib/sqlStatements";
import type { SqlLexical } from "$lib/sqlStatements";

// Los dialectos de sql-formatter que usa la app.
export type FormatterDialect = "sql" | "mysql" | "mariadb" | "postgresql";

// Modos de TLS del formulario de conexion (ver ConnectionForm.svelte).
export type TlsModeName = "auto" | "required" | "verifyCa" | "verifyIdentity" | "disabled";

// Lo que necesita el editor para entender el SQL: el de cada motor, o el SQL
// estandar sin conexion (engines/standard.ts).
export interface SqlProfile {
  lexical: SqlLexical;
  // El nombre entre comillas, con la comilla de adentro duplicada.
  quoteIdentifier(name: string): string;
  // El nombre como hay que escribirlo: tal cual si el motor lo lee igual,
  // entre comillas si no (en Postgres, un nombre con mayusculas; en
  // cualquiera, caracteres raros o una palabra reservada).
  identifier(name: string): string;
  // Si un nombre escrito en el SQL (`quoted`: entre comillas) nombra lo que
  // en el catalogo se llama `catalogName`: en Postgres, sin comillas se lee
  // en minusculas (`Users` es `users`, no `"Users"`); en MySQL da igual.
  nameMatches(written: string, quoted: boolean, catalogName: string): boolean;
  // Un texto como literal '...': la comilla duplicada y, donde la barra
  // invertida escapa (MySQL), tambien ella.
  quoteString(value: string): string;
  // Resaltado y keywords del editor (CodeMirror). Sin configurar: dialectFor
  // (editor/completionSource.ts) le agrega lo de la app.
  editorDialect: SQLDialect;
  formatterDialect: FormatterDialect;
  // Lo que puede abrir una sentencia (autocompletado al inicio).
  statementStarters: readonly string[];
  // Funciones del motor que sugiere el autocompletado, ademas de las comunes
  // a todos (editor/catalogCompletions.ts).
  builtinFunctions: readonly string[];
  // Palabras que no pueden ser un alias sin comillas (editor/relations.ts; se
  // suman a las keywords del dialecto del editor).
  reservedWords: ReadonlySet<string>;
  // La ayuda de la app por codigo de error del servidor.
  errorHelp: Readonly<Record<string, ErrorHelp>>;
  // Donde cayo un error de ejecucion, segun los mensajes del motor.
  locateError: ErrorLocator;
  // Que parametros de una rutina van como argumentos en la llamada (hints de
  // parametros, editor/callHints.ts): en MySQL todos; en Postgres, los de
  // entrada de una funcion y, en un CALL, tambien los OUT.
  passedInCall(mode: RoutineParameter["mode"], kind: ExplorerRoutine["kind"]): boolean;
}

// Un motor al que la app se conecta: su SQL mas lo de la conexion.
export interface EngineProfile extends SqlProfile {
  // La URL de conexion que se muestra en el formulario.
  connectionUrl: { scheme: string; tlsParameter(mode: TlsModeName): string };
}
