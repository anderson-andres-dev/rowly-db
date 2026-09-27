import { backendText, invoke } from "$lib/backend";
import type { DestructiveStatement, ExecuteQueryResponse, SortKey } from "$lib/types";

export interface PageRequest {
  offset: number;
  pageSize: number;
  // Orden de los encabezados (se aplica en la base, antes de paginar).
  sort?: SortKey[];
}

// Unico punto de invocacion del comando "execute_query": si el transporte de
// Tauri falla (no un error SQL, que ya llega dentro de ExecuteQueryResponse),
// lo normaliza a un resultado de tipo "error" para que el llamador no tenga
// que distinguir dos formas distintas de fallo.
//
// Con `executionId`, la consulta se puede interrumpir con cancelQuery()
// mientras corre.
export async function executeQuery(
  sql: string,
  confirmedStatement: DestructiveStatement | null,
  page: PageRequest | null = null,
  executionId: string | null = null,
): Promise<ExecuteQueryResponse> {
  try {
    const response = await invoke<ExecuteQueryResponse>("execute_query", {
      sql,
      confirmedStatement,
      page,
      executionId,
    });
    // El error de la base llega como texto; el de la app (sin conexion,
    // nada que ejecutar...), como mensaje a traducir.
    if (response.type === "completed" && response.result.type === "error") {
      return { ...response, result: { ...response.result, message: backendText(response.result.message) } };
    }
    return response;
  } catch (e) {
    return {
      type: "completed",
      result: { type: "error", message: String(e) },
    };
  }
}

// Pide al servidor que interrumpa la consulta; termina con su propio error
// (o, si ya habia terminado, no pasa nada).
export async function cancelQuery(executionId: string): Promise<void> {
  try {
    await invoke("cancel_query", { executionId });
  } catch {
    // Si no se pudo cancelar, la consulta sigue y termina sola.
  }
}

// Antes de un script: por cada sentencia, si pide confirmacion (las mismas
// reglas que execute_query) o si no se puede analizar.
export interface StatementCheck {
  confirmation?: DestructiveStatement;
  error?: string;
}

export async function classifyStatements(statements: string[]): Promise<StatementCheck[]> {
  try {
    return await invoke<StatementCheck[]>("classify_statements", { statements });
  } catch (e) {
    return statements.map(() => ({ error: String(e) }));
  }
}

// Total de filas de la consulta (SELECT COUNT(*) FROM (...)). Lanza un
// Error con el mensaje del servidor si falla.
export async function countQueryRows(sql: string): Promise<number> {
  return await invoke<number>("count_query_rows", { sql });
}
