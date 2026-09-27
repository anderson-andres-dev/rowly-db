import type { ConnectionDriver } from "$lib/connections";
import { mariadb } from "./mariadb";
import { mysql } from "./mysql";
import { postgres } from "./postgres";
import type { EngineProfile } from "./types";

export type { EngineProfile, FormatterDialect, SqlLexical, SqlProfile, TlsModeName } from "./types";
export { standardSql } from "./standard";

// Un perfil por motor. El tipo obliga a que cada ConnectionDriver tenga el
// suyo: agregar un motor sin su perfil no compila (guia en
// docs/specs/v0.2-perfiles-de-motor.md, §6).
export const ENGINES: Readonly<Record<ConnectionDriver, EngineProfile>> = { mysql, mariadb, postgres };

export function engineFor(driver: ConnectionDriver): EngineProfile {
  return ENGINES[driver];
}
