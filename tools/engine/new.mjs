#!/usr/bin/env node
// Empieza un motor nuevo (SQL_ENGINE §12.1): crea lo que se puede crear y
// deja marcado como pendiente lo que hay que decidir, para que el compilador
// y los tests digan, uno por uno, los pasos que faltan.
//
//   node tools/engine/new.mjs <id> --like <mysql|mariadb|postgres>
//
// <id>: el identificador estable del motor (minusculas, sin espacios), el
// mismo en Rust, el backend y el frontend. --like: el motor cuyo SQL se parece
// mas; solo sirve de punto de partida, nada se hereda en silencio.
//
// Crea:
//   crates/engine/src/dialects/<id>.rs   la definicion, con los valores de --like y un bloque PENDIENTE
//   crates/engine/src/lib.rs             la variante en Dialect, ALL y definition()
//   tests/engines/contract.json          su entrada, con "pending": true
//   tests/sql/<id>/setup.sql             el corpus del motor, vacio
//
// Mientras quede algo pendiente fallan, con lo que falta:
//   cargo build      cada match exhaustivo sin el motor (backend, harness)
//   cargo test       el bloque PENDIENTE y la entrada pending del contrato
//   npm run check    ConnectionDriver y ENGINES del frontend
//   coverage.mjs     cada fila de SQL_ENGINE §6 sin respuesta para el motor

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const args = process.argv.slice(2);
const id = args[0];
const like = args[args.indexOf("--like") + 1];
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!id || !/^[a-z][a-z0-9]*$/.test(id)) fail("uso: new.mjs <id> --like <motor>  (id en minusculas, sin espacios)");
const contractPath = join(ROOT, "tests/engines/contract.json");
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const base = contract.engines.find((engine) => engine.id === like);
if (!base) fail(`--like: uno de ${contract.engines.map((engine) => engine.id).join(", ")}`);
if (contract.engines.some((engine) => engine.id === id)) fail(`el motor ${id} ya existe`);

const variant = id[0].toUpperCase() + id.slice(1);
const dialects = join(ROOT, "crates/engine/src/dialects");
const file = join(dialects, `${id}.rs`);
if (existsSync(file)) fail(`${file} ya existe`);

// 1. La definicion: arranca con los valores de --like, cada uno por decidir.
writeFileSync(
  file,
  `//! ${variant}.

use super::EngineDefinition;

// PENDIENTE (tools/engine/new.mjs): cada valor sale hoy de ${like}. Escribir
// cada campo de EngineDefinition con la respuesta de ${id}, probada contra su
// servidor (SQL_ENGINE §12.1, paso 2), y quitar este bloque y el
// \`..super::${like}::DEFINITION\` de abajo. Un valor heredado sin probar es
// un motor que cae en silencio en las reglas de otro.
pub const DEFINITION: EngineDefinition = EngineDefinition {
    id: "${id}",
    ..super::${like}::DEFINITION
};
`,
);

// 2. El modulo y el registro.
const modPath = join(dialects, "mod.rs");
const mod = readFileSync(modPath, "utf8");
if (!mod.includes("pub mod postgres;\n")) fail("dialects/mod.rs: no encuentro «pub mod postgres;»");
writeFileSync(modPath, mod.replace("pub mod postgres;\n", `pub mod postgres;\npub mod ${id};\n`));

const libPath = join(ROOT, "crates/engine/src/lib.rs");
let lib = readFileSync(libPath, "utf8");
const count = contract.engines.length;
const replaceOnce = (from, to) => {
  if (!lib.includes(from)) fail(`crates/engine/src/lib.rs: no encuentro «${from}»; agregar el motor a mano`);
  lib = lib.replace(from, to);
};
replaceOnce("    Postgres,\n}", `    Postgres,\n    ${variant},\n}`);
replaceOnce(
  `pub const ALL: [Dialect; ${count}] = [`,
  `pub const ALL: [Dialect; ${count + 1}] = [`,
);
replaceOnce("Dialect::MariaDb, Dialect::Postgres];", `Dialect::MariaDb, Dialect::Postgres, Dialect::${variant}];`);
replaceOnce(
  "            Dialect::Postgres => &dialects::postgres::DEFINITION,\n",
  `            Dialect::Postgres => &dialects::postgres::DEFINITION,\n            Dialect::${variant} => &dialects::${id}::DEFINITION,\n`,
);
writeFileSync(libPath, lib);

// 3. El contrato compartido: la entrada queda pendiente.
contract.engines.push({ ...base, id, pending: true });
// Una linea por motor, como el resto del archivo.
const line = (engine) =>
  JSON.stringify(engine, null, 1)
    .replace(/\n\s*/g, " ")
    .replace(/\[ /g, "[")
    .replace(/ \]/g, "]");
writeFileSync(
  contractPath,
  `{\n  "format": ${contract.format},\n  "about": ${JSON.stringify(contract.about)},\n  "engines": [\n${contract.engines
    .map((engine) => `    ${line(engine)}`)
    .join(",\n")}\n  ]\n}\n`,
);

// 4. El corpus del motor.
const corpus = join(ROOT, "tests/sql", id);
mkdirSync(corpus, { recursive: true });
writeFileSync(
  join(corpus, "setup.sql"),
  `-- Se ejecuta en cada servidor de ${id} antes de sus fixtures (tests/sql/README.md).\n`,
);

console.log(`Motor ${id} empezado (a partir de ${like}). Lo que falta, en orden:

  1. cargo build: cada match exhaustivo sin ${variant} (DatabaseKind y el
     driver en app/src-tauri/src/drivers.rs, Engine en crates/server-tests).
     Un driver nuevo es un crate en crates/drivers/<protocolo> (DbConnector).
  2. crates/engine/src/dialects/${id}.rs: cada valor de EngineDefinition,
     probado; quitar el bloque PENDIENTE.
  3. Frontend: "${id}" en ConnectionDriver (app/src/lib/connections.ts), su
     perfil en app/src/lib/engines/${id}.ts, ENGINES y FIXTURES del contrato
     (npm run check los pide).
  4. tests/engines/contract.json: sus valores reales; quitar "pending".
  5. tools/test-dbs/lines.json (lineas, probes y verified, por digest),
     docker-compose y up.sh; app/src/lib/engines/vendorSupport.json.
  6. tests/sql/coverage.json: una respuesta para ${id} en cada fila
     (node tools/inventory/coverage.mjs dice cuales faltan).
  7. SQL_ENGINE (EN + ES): §5.3, §6.5 y lo que cambie en §9; CONTRIBUTING.
`);
