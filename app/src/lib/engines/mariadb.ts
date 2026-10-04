import { MariaSQL } from "@codemirror/lang-sql";
import mariadbLines from "../../../../support/mariadb.json";
import { identifierWith, lineReservedWords, quoteWith } from "./common";
import { mysql, MYSQL_PLAIN, MYSQL_QUOTING } from "./mysql";
import type { EngineProfile } from "./types";

// MariaDB habla el protocolo y el SQL de MySQL (mismo driver en Rust), con
// su propio dialecto en el editor y en el formateador, y ejecuta tambien
// /*M! ... */. Las pistas /*+ ... */ las lee desde la 12.0; hasta que la
// linea viaje con la conexion se marcan siempre (solo es visual).
export const mariadb: EngineProfile = {
  ...mysql,
  lexical: { ...mysql.lexical, executableComments: ["/*!", "/*M!"] },
  // Lo reservado en MySQL y en sus lineas, mas lo de las lineas de MariaDB:
  // una comilla de mas no rompe nada; una de menos, si.
  identifier: identifierWith(
    MYSQL_PLAIN,
    new Set([...MYSQL_QUOTING, ...lineReservedWords(mariadbLines)]),
    (name) => quoteWith("`", "`", name),
  ),
  reservedWords: new Set([...mysql.reservedWords, ...lineReservedWords(mariadbLines)]),
  editorDialect: MariaSQL,
  formatterDialect: "mariadb",
};
