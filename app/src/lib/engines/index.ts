import type { ConnectionDriver } from "$lib/connections";
import type { ConnectionEngineContext } from "$lib/types";
import { ansiString } from "./common";
import { mariadb } from "./mariadb";
import { mysql } from "./mysql";
import { postgres } from "./postgres";
import type { EngineProfile } from "./types";

export type { EngineProfile, FormatterDialect, SqlLexical, SqlProfile, TlsModeName } from "./types";
export { standardSql } from "./standard";

// Un perfil por motor. El tipo obliga a que cada ConnectionDriver tenga el
// suyo: agregar un motor sin su perfil no compila (guia en
// SQL_ENGINE.es.md).
export const ENGINES: Readonly<Record<ConnectionDriver, EngineProfile>> = { mysql, mariadb, postgres };

export function engineFor(driver: ConnectionDriver): EngineProfile {
  return ENGINES[driver];
}

// Con NO_BACKSLASH_ESCAPES en la sesion, la barra invertida es un caracter
// mas: para partir sentencias y para escribir literales. Un perfil por motor,
// armado una vez, para que su identidad siga sirviendo de clave (las caches
// del analisis, la reconfiguracion del editor).
const WITHOUT_BACKSLASH_ESCAPES = new Map<ConnectionDriver, EngineProfile>();

// El perfil de la conexion: el motor y el modo que dice el backend
// (ConnectionEngineContext), no los del perfil guardado.
export function engineForContext(context: ConnectionEngineContext): EngineProfile {
  const profile = ENGINES[context.engineId];
  if (!context.sessionMode.noBackslashEscapes || !profile.lexical.backslashEscapes) return profile;
  let adjusted = WITHOUT_BACKSLASH_ESCAPES.get(context.engineId);
  if (!adjusted) {
    adjusted = { ...profile, lexical: { ...profile.lexical, backslashEscapes: false }, quoteString: ansiString };
    WITHOUT_BACKSLASH_ESCAPES.set(context.engineId, adjusted);
  }
  return adjusted;
}
