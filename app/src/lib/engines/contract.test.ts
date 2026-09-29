import { describe, expect, it } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { ENGINES, standardSql, type SqlProfile } from "$lib/engines";
import type { ConnectionDriver } from "$lib/connections";
import type { ExecutionError } from "$lib/sqlDiagnostics";
import { splitStatements } from "$lib/sqlStatements";
import { normalizePastedSql } from "$lib/sqlPaste";
import { sqlTokens } from "$lib/sqlContext";
import { aliasFor } from "$lib/sqlRelations";
import { buildCompletionSource, buildSqlSchema, dialectFor } from "$lib/sqlSchema";
import type { CatalogTable, SchemaObjects } from "$lib/types";
import { buildRoutineIndex, callHints } from "$lib/sqlCallHints";

// El contrato que cumple cada perfil de motor (docs/specs/v0.2-perfiles-de-motor.md,
// §5). Un motor nuevo se suma a ENGINES y a FIXTURES (el tipo lo exige) y
// tiene que pasar todo esto sin tocar nada mas.

interface Fixture {
  // Un error real del servidor por una tabla que no existe, con lo que se
  // espera marcar.
  missingTable: { sql: string; error: ExecutionError & { code: string }; marks: string };
}

const FIXTURES: Record<ConnectionDriver, Fixture> = {
  mysql: {
    missingTable: {
      sql: "SELECT * FROM usarios",
      error: { message: "Table 'ventas.usarios' doesn't exist", code: "1146" },
      marks: "usarios",
    },
  },
  mariadb: {
    missingTable: {
      sql: "SELECT * FROM usarios",
      error: { message: "Table 'ventas.usarios' doesn't exist", code: "1146" },
      marks: "usarios",
    },
  },
  postgres: {
    missingTable: {
      sql: "SELECT * FROM usarios",
      error: { message: 'relation "usarios" does not exist', code: "42P01", position: 15 },
      marks: "usarios",
    },
  },
};

const PROFILES: [string, SqlProfile][] = [...Object.entries(ENGINES), ["standard", standardSql]];

const USERS: CatalogTable = {
  schema: "app",
  name: "users",
  columns: [
    { name: "id", dataType: "integer", nullable: false, isPrimaryKey: true },
    { name: "name", dataType: "text", nullable: false, isPrimaryKey: false },
  ],
  foreignKeys: [],
};
const ORDERS: CatalogTable = {
  schema: "app",
  name: "order_items",
  columns: [
    { name: "id", dataType: "integer", nullable: false, isPrimaryKey: true },
    { name: "user_id", dataType: "integer", nullable: false, isPrimaryKey: false },
  ],
  foreignKeys: [{ column: "user_id", referencedTable: "users", referencedColumn: "id" }],
};

describe.each(PROFILES)("perfil %s", (_name, engine) => {
  const split = (text: string) =>
    splitStatements(text, engine.lexical).map((range) => text.slice(range.from, range.to));
  const tricky = "a;b 'c' \"d\" `e` [f] \\ g";

  it("al pegar, lo invisible del codigo se normaliza y lo de sus comillas y comentarios queda", () => {
    const nbsp = String.fromCharCode(0xa0);
    const zwsp = String.fromCharCode(0x200b);
    const paste = (text: string) => normalizePastedSql(text, engine.lexical);
    expect(paste(`SELECT${nbsp}id,${zwsp} name${nbsp}FROM t`)).toBe("SELECT id, name FROM t");
    expect(paste(`SELECT${nbsp}'a${nbsp}b'`)).toBe(`SELECT 'a${nbsp}b'`);
    expect(paste(`SELECT 'it''s${nbsp}x'${nbsp}AS a`)).toBe(`SELECT 'it''s${nbsp}x' AS a`);
    expect(paste(`SELECT 1 -- a${nbsp}b\n/* c${nbsp}d */${nbsp}FROM t`)).toBe(`SELECT 1 -- a${nbsp}b\n/* c${nbsp}d */ FROM t`);
    for (const quote of engine.lexical.identifierQuotes) {
      const close = quote === "[" ? "]" : quote;
      expect(paste(`SELECT ${quote}a${nbsp}b${close}${nbsp}FROM t`)).toBe(`SELECT ${quote}a${nbsp}b${close} FROM t`);
    }
  });

  it("un ; dentro de sus comillas o comentarios no corta", () => {
    for (const quote of engine.lexical.identifierQuotes) {
      const close = quote === "[" ? "]" : quote;
      expect(split(`SELECT ${quote}a;b${close}; SELECT 2;`)).toEqual([`SELECT ${quote}a;b${close};`, "SELECT 2;"]);
    }
    expect(split("SELECT 'a;''b'; SELECT 2;")).toEqual(["SELECT 'a;''b';", "SELECT 2;"]);
    expect(split("SELECT 1; -- a;b\nSELECT 2; /* c;d */ SELECT 3;")).toEqual(["SELECT 1;", "SELECT 2;", "SELECT 3;"]);
    expect(split("SELECT 1 # a;b\n;").length).toBe(engine.lexical.hashComments ? 1 : 2);
    if (engine.lexical.dollarQuotes) expect(split("SELECT $$ a;b $$; SELECT 2;").length).toBe(2);
  });

  it("la barra invertida en '...' escapa solo donde el motor lo dice", () => {
    // Con escape, 'a\';b' es un solo texto; sin el, el texto termina en la
    // barra y el ; de despues corta.
    const [first] = split("SELECT 'a\\';b'; SELECT 2;");
    expect(first).toBe(engine.lexical.backslashEscapes ? "SELECT 'a\\';b';" : "SELECT 'a\\';");
  });

  it("E'...' escapa con la barra invertida solo donde el motor lo usa", () => {
    const [first] = split("SELECT E'it\\'s; ok'; SELECT 2;");
    const escapes = engine.lexical.escapeStringPrefix || engine.lexical.backslashEscapes;
    // Sin escape, el texto termina en la barra y la sentencia sigue hasta el ;.
    expect(first).toBe(escapes ? "SELECT E'it\\'s; ok';" : "SELECT E'it\\'s;");
    // Una palabra que termina en e no abre un E'...'.
    expect(split("SELECT name'x;y'; SELECT 2;").length).toBe(2);
  });

  it("pone comillas a un nombre solo cuando el motor las necesita", () => {
    expect(engine.identifier("users")).toBe("users");
    expect(engine.identifier("order")).toBe(engine.quoteIdentifier("order"));
    expect(engine.identifier("fecha alta")).toBe(engine.quoteIdentifier("fecha alta"));
    // Un nombre comun que no es reservado va tal cual.
    expect(engine.identifier("type")).toBe("type");
    // Con mayusculas: donde el motor pasa a minusculas lo que no va entre
    // comillas, las necesita.
    const folds = engine.identifier("Users") !== "Users";
    expect(engine.identifier("Users")).toBe(folds ? engine.quoteIdentifier("Users") : "Users");
  });

  it("lo que escribe identifier() nombra esa tabla y, si distingue mayusculas, ninguna otra", () => {
    const names = ["users", "Users", "USERS", "fecha alta", "order", "type"];
    const caseSensitive = !engine.nameMatches("A", true, "a");
    for (const name of names) {
      const written = engine.identifier(name);
      const tokens = sqlTokens(`SELECT * FROM ${written}`, engine.lexical);
      const token = tokens[tokens.length - 1];
      const quoted = token.kind === "quoted";
      const read = quoted ? token.text : token.raw;
      expect(engine.nameMatches(read, quoted, name)).toBe(true);
      if (caseSensitive) {
        for (const other of names.filter((candidate) => candidate !== name)) {
          expect(engine.nameMatches(read, quoted, other)).toBe(false);
        }
      }
    }
  });

  it("sus literales de texto se vuelven a leer como un solo texto", () => {
    const literal = engine.quoteString(tricky);
    expect(split(`SELECT ${literal}; SELECT 2;`)).toEqual([`SELECT ${literal};`, "SELECT 2;"]);
  });

  it("sus identificadores entre comillas se vuelven a leer igual", () => {
    const name = 'raro"nombre`con]comillas';
    const quoted = engine.quoteIdentifier(name);
    const tokens = sqlTokens(`SELECT ${quoted} FROM t`, engine.lexical);
    const token = tokens.find((candidate) => candidate.kind === "quoted")!;
    const close = quoted[quoted.length - 1];
    expect(token.raw).toBe(quoted);
    expect(token.text.split(close + close).join(close)).toBe(name);
  });

  it("ningun alias automatico es una palabra reservada", () => {
    const reserved = new Set([...engine.reservedWords, ...(engine.editorDialect.spec.keywords ?? "").split(" ")]);
    for (const table of ["tec_onts", "order_numbers", "as_items", "in_nodes", "on_hold", "users"]) {
      const alias = aliasFor(table, new Set(), reserved);
      if (alias) expect(reserved.has(alias)).toBe(false);
    }
  });

  it("hints de parametros: la llamada escrita como el motor encuentra su rutina", () => {
    const parameter = (name: string) => ({ name, mode: "in" as const, dataType: "int", hasDefault: false });
    const routines = buildRoutineIndex(
      [
        {
          schema: "app",
          routines: [
            { name: "addNapNume", kind: "procedure", arguments: "", parameters: [parameter("abonado"), parameter("napNume")] },
            { name: "total_de", kind: "function", arguments: "", parameters: [parameter("p_cliente")] },
          ],
        } as unknown as SchemaObjects,
      ],
      "app",
    );
    const labels = (sql: string) => callHints(sql, engine, routines).map((hint) => hint.label);
    expect(labels(`CALL ${engine.identifier("addNapNume")}(ds, d)`)).toEqual(["abonado", "napNume"]);
    expect(labels(`SELECT ${engine.identifier("total_de")}(42) FROM t`)).toEqual(["p_cliente"]);
    // El argumento que ya se llama como el parametro no lleva hint.
    expect(labels(`SELECT ${engine.identifier("total_de")}(p_cliente) FROM t`)).toEqual([]);
  });

  it("autocompletado de punta a punta: JOIN por FK con alias y ON", async () => {
    const { schema, defaultSchema, fkIndex, tableIndex } = buildSqlSchema([USERS, ORDERS]);
    const dialect = dialectFor(engine);
    const source = buildCompletionSource({ dialect, engine, schema, defaultSchema, fkIndex, tableIndex });
    const complete = async (withCursor: string) => {
      const pos = withCursor.indexOf("|");
      const doc = withCursor.replace("|", "");
      const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [dialect.language] });
      const result = await source(new CompletionContext(state, pos, true));
      return (result?.options ?? []).map((option) => option.label);
    };
    expect(await complete("SELECT * FROM users jo|")).toContain("JOIN order_items oi ON users.id = oi.user_id");
    expect(await complete("SELECT * FROM users u JOIN order_items oi ON |")).toContain("u.id = oi.user_id");
  });
});

describe.each(Object.entries(ENGINES) as [ConnectionDriver, (typeof ENGINES)[ConnectionDriver]][])(
  "motor %s",
  (name, engine) => {
    it("ubica un error real del servidor y reconoce su codigo", () => {
      const { sql, error, marks } = FIXTURES[name].missingTable;
      const range = engine.locateError(sql, error);
      expect(range && sql.slice(range.from, range.to)).toBe(marks);
      expect(engine.errorHelp[error.code]).toBe("tableMissing");
    });

    it("un nombre con mayusculas se escribe como el motor lo lee", () => {
      // Postgres pasa a minusculas lo que no va entre comillas; MySQL no.
      expect(engine.identifier("Users")).toBe(name === "postgres" ? '"Users"' : "Users");
    });

    it("arma la URL de conexion con su esquema y el parametro de TLS", () => {
      expect(engine.connectionUrl.scheme).toMatch(/^[a-z]+$/);
      expect(engine.connectionUrl.tlsParameter("required")).toMatch(/^[a-z-]+=\S+$/);
    });
  },
);
