import { MariaSQL } from "@codemirror/lang-sql";
import { mysql } from "./mysql";
import type { EngineProfile } from "./types";

// MariaDB habla el protocolo y el SQL de MySQL (mismo driver en Rust), con
// su propio dialecto en el editor y en el formateador.
export const mariadb: EngineProfile = {
  ...mysql,
  editorDialect: MariaSQL,
  formatterDialect: "mariadb",
};
