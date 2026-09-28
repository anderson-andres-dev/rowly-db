import { invoke } from "$lib/backend";

// Consulta en vivo al motor (SHOW CREATE TABLE en MySQL, reconstruccion via
// pg_catalog en Postgres — ver table_definition en los drivers). A
// proposito no reusa el catalogo ya cargado en el frontend: asi un permiso
// faltante (p.ej. SHOW VIEW en MySQL) llega como un error real, no como un
// exito silencioso con datos incompletos.
export async function fetchTableDefinition(
  schema: string,
  table: string,
): Promise<{ ok: true; ddl: string } | { ok: false; message: string }> {
  try {
    const ddl = await invoke<string>("table_definition", { schema, table });
    return { ok: true, ddl };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
