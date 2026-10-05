import { describe, expect, it } from "vitest";
import { backendText } from "$lib/backend";
import backend from "$lib/i18n/messages/backend";

describe("backendText", () => {
  it("traduce los mensajes de la app y deja tal cual los de la base", () => {
    expect(backendText({ key: "edit.noPrimaryKey", params: { table: "pedidos" } })).toBe(
      "La tabla pedidos no tiene clave primaria: no hay forma segura de identificar cada fila.",
    );
    expect(backendText("Unknown column 'x' in 'field list'")).toBe("Unknown column 'x' in 'field list'");
    expect(backendText({ key: "algo.nuevo" })).toBe("algo.nuevo");
  });

  it("un fallo de red al buscar paquetes llega traducido, sin el texto de reqwest (#64)", () => {
    // Lo que manda support.rs con el puerto cerrado (test de Rust
    // a_closed_port_says_the_server_does_not_respond_not_what_reqwest_says).
    const text = backendText({ key: "support.network.unreachable" });
    expect(text).toBe("No se pudo consultar los paquetes: el servidor no responde.");
    expect(text).not.toContain("error sending request for url");
    expect(backendText({ key: "support.network.status", params: { status: "404" } })).toBe(
      "No se pudo consultar los paquetes: el servidor respondió con el error 404.",
    );
  });
});

// Toda clave que emite el backend (Message::key en Rust) tiene que tener su
// texto; si no, la interfaz mostraria la clave.
const rustFiles = import.meta.glob(["../../../crates/**/src/**/*.rs", "../../src-tauri/src/**/*.rs"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("mensajes del backend", () => {
  it("cada clave que emite Rust tiene texto", () => {
    // Sin los modulos de test, que usan claves de ejemplo.
    const sources = Object.values(rustFiles).map((source) => source.split("#[cfg(test)]")[0]);
    expect(sources.length).toBeGreaterThan(10);
    const keys = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(/(?:Diagnostic)?Message::key\("([^"]+)"\)/g)) keys.add(match[1]);
      // soft(..., "categoria", warnings) -> introspect.<categoria>
      for (const match of source.matchAll(/soft\([\s\S]*?"(\w+)",\s*warnings,?\s*\)/g)) keys.add(`introspect.${match[1]}`);
      // NotEditable::as_key -> notEditable.<motivo>
      for (const match of source.matchAll(/NotEditable::\w+ => "(\w+)"/g)) keys.add(`notEditable.${match[1]}`);
      // support::Network::key -> support.network.<motivo>
      for (const match of source.matchAll(/Network::\w+(?:\(_\))? => "(support\.network\.\w+)"/g)) keys.add(match[1]);
    }
    expect(keys.size).toBeGreaterThan(40);
    const known = new Set(Object.keys(backend.es));
    expect([...keys].filter((key) => !known.has(key))).toEqual([]);
  });
});

// Un solo camino por comando del backend: cada invoke("…") tiene un dueño.
// Ejecutar SQL, cargar el catalogo o guardar una consola por otra ruta se
// saltaria lo que ese dueño hace antes (el guard, la generacion de la
// conexion, el volcado con retraso). Un comando nuevo se agrega aqui con su
// dueño.
const OWNERS: Record<string, string> = {
  analyze_sql: "lib/editor/analysisSession.ts",
  apply_result_changes: "lib/results/resultEditing.ts",
  cancel_query: "lib/queryExecution.ts",
  check_support_updates: "lib/stores/supportPackages.ts",
  classify_statements: "lib/queryExecution.ts",
  connect: "lib/stores/connection.ts",
  count_query_rows: "lib/queryExecution.ts",
  create_sql_file: "lib/sqlFiles.ts",
  database_explorer: "lib/stores/connection.ts",
  delete_connection_password: "lib/credentials.ts",
  disconnect: "lib/stores/connection.ts",
  execute_query: "lib/queryExecution.ts",
  export_query_to_file: "lib/components/results/ExportDialog.svelte",
  install_release: "lib/stores/updates.ts",
  install_support_package: "lib/stores/supportPackages.ts",
  list_releases: "lib/stores/updates.ts",
  list_sql_dir: "lib/sqlFiles.ts",
  list_tables: "lib/stores/connection.ts",
  load_connection_password: "lib/credentials.ts",
  preview_result_changes: "lib/results/resultEditing.ts",
  prune_console_texts: "lib/stores/queryConsoles.ts",
  read_console_text: "lib/stores/queryConsoles.ts",
  read_sql_file: "lib/sqlFiles.ts",
  remove_support_package: "lib/stores/supportPackages.ts",
  rename_sql_file: "lib/sqlFiles.ts",
  restart_app: "lib/stores/updates.ts",
  result_edit_info: "lib/results/resultEditing.ts",
  save_connection_password: "lib/credentials.ts",
  set_support_line_enabled: "lib/stores/supportPackages.ts",
  set_visible_schemas: "lib/stores/connection.ts",
  support_lines: "lib/stores/supportPackages.ts",
  table_definition: "lib/tableDefinition.ts",
  test_connection: "lib/stores/connection.ts",
  trash_sql_file: "lib/sqlFiles.ts",
  update_context: "lib/stores/updates.ts",
  write_console_text: "lib/stores/queryConsoles.ts",
  write_sql_file: "lib/sqlFiles.ts",
};

const sources = import.meta.glob(["../**/*.ts", "../**/*.svelte", "!../**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("superficie IPC", () => {
  it("each backend command is invoked from a single owner module", () => {
    const found: Record<string, Set<string>> = {};
    for (const [path, source] of Object.entries(sources)) {
      if (path.includes("/routes/dev-preview/")) continue;
      for (const match of source.matchAll(/invoke(?:<[^(]*>)?\(\s*"([a-z_]+)"/g)) {
        // Rutas desde src/: el glob las da relativas a src/lib.
        (found[match[1]] ??= new Set()).add(path.startsWith("./") ? `lib/${path.slice(2)}` : path.replace(/^\.\.\//, ""));
      }
    }
    expect(Object.fromEntries(Object.entries(found).map(([command, files]) => [command, [...files]]))).toEqual(
      Object.fromEntries(Object.entries(OWNERS).map(([command, owner]) => [command, [owner]])),
    );
  });
});
