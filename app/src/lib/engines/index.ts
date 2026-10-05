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

// El perfil de la conexion: el motor y el modo que dice el backend
// (ConnectionEngineContext), no los del perfil guardado, y las reservadas de
// las lineas de esa conexion: un paquete de soporte puede traer una que la
// app no conoce (G6). Un perfil por combinacion, armado una vez, para que su
// identidad siga sirviendo de clave (las caches del analisis, la
// reconfiguracion del editor).
const ADJUSTED = new Map<string, EngineProfile>();

export function engineForContext(context: ConnectionEngineContext): EngineProfile {
  const base = ENGINES[context.engineId];
  const plainBackslash = context.sessionMode.noBackslashEscapes && base.lexical.backslashEscapes;
  // Solo las que el perfil todavia no cita.
  const extra = (context.reservedWords ?? []).filter((word) => base.identifier(word) !== base.quoteIdentifier(word)).sort();
  if (!plainBackslash && extra.length === 0) return base;
  const key = `${context.engineId}|${plainBackslash}|${extra.join(",")}`;
  let adjusted = ADJUSTED.get(key);
  if (!adjusted) {
    adjusted = { ...base };
    if (plainBackslash) {
      adjusted.lexical = { ...base.lexical, backslashEscapes: false };
      adjusted.quoteString = ansiString;
    }
    if (extra.length > 0) {
      const reserved = new Set(extra);
      adjusted.identifier = (name) => (reserved.has(name.toLowerCase()) ? base.quoteIdentifier(name) : base.identifier(name));
      adjusted.reservedWords = new Set([...base.reservedWords, ...extra]);
    }
    ADJUSTED.set(key, adjusted);
  }
  return adjusted;
}
