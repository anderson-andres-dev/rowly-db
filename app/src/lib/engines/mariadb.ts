import { MariaSQL } from "@codemirror/lang-sql";
import { mysql } from "./mysql";
import type { EngineProfile } from "./types";

// MariaDB habla el protocolo y el SQL de MySQL (mismo driver en Rust), con
// su propio dialecto en el editor y en el formateador, y ejecuta tambien
// /*M! ... */. Las pistas /*+ ... */ las lee desde la 12.0; hasta que la
// linea viaje con la conexion se marcan siempre (solo es visual).
export const mariadb: EngineProfile = {
  ...mysql,
  lexical: { ...mysql.lexical, executableComments: ["/*!", "/*M!"] },
  editorDialect: MariaSQL,
  formatterDialect: "mariadb",
};
