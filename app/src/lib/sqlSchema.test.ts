import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { CompletionContext, type Completion } from "@codemirror/autocomplete";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { MySQL } from "@codemirror/lang-sql";
import { buildCompletionSource, buildSqlSchema, dialectFor, extractDefaultTable } from "./sqlSchema";
import type { CatalogTable } from "./types";

const USERS: CatalogTable = {
  schema: "public",
  name: "users",
  columns: [
    { name: "id", dataType: "integer", nullable: false, isPrimaryKey: true },
    { name: "name", dataType: "text", nullable: false, isPrimaryKey: false },
  ],
  foreignKeys: [],
};

const ORDERS: CatalogTable = {
  schema: "public",
  name: "orders",
  columns: [
    { name: "id", dataType: "integer", nullable: false, isPrimaryKey: true },
    { name: "user_id", dataType: "integer", nullable: false, isPrimaryKey: false },
  ],
  foreignKeys: [{ column: "user_id", referencedTable: "users", referencedColumn: "id" }],
};

const CATALOG = [USERS, ORDERS];

// El marcador "|" indica el cursor; source() no necesita un EditorView real,
// un EditorState alcanza para levantar un CompletionContext.
async function complete(withCursor: string, explicit = false) {
  const pos = withCursor.indexOf("|");
  if (pos === -1) throw new Error("test input must contain a | cursor marker");
  const doc = withCursor.slice(0, pos) + withCursor.slice(pos + 1);
  // schemaCompletionSource lee el arbol de sintaxis (syntaxTree) para saber
  // si el cursor esta sobre un Identifier/Keyword; sin el lenguaje SQL
  // adjunto al estado, ese arbol esta vacio y la libreria devuelve null
  // siempre. MySQL.language es el mismo que usa sql({dialect}) en el editor
  // real (ver SqlEditor.svelte).
  const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [MySQL.language] });
  const context = new CompletionContext(state, pos, explicit);

  const { schema, defaultSchema, fkIndex, tableIndex } = buildSqlSchema(CATALOG);
  // SqlEditor.svelte calcula esto en su updateListener a partir del texto
  // vivo; se replica aca para probar buildCompletionSource tal como lo usa
  // la app de verdad, no una version mas permisiva.
  const defaultTable = extractDefaultTable(doc, pos);
  const source = buildCompletionSource({
    dialect: MySQL,
    engine: ENGINES.mysql,
    schema,
    defaultSchema,
    defaultTable,
    fkIndex,
    tableIndex,
  });
  return source(context);
}

function labels(result: Awaited<ReturnType<typeof complete>>): string[] {
  return (result?.options ?? []).map((option) => option.label);
}

describe("buildCompletionSource - los tres casos reportados, de punta a punta", () => {
  it("select * fro| no ofrece tablas sueltas", async () => {
    const result = await complete("select * fro|");
    expect(labels(result)).not.toContain("users");
    expect(labels(result)).not.toContain("orders");
    expect(labels(result).map((l) => l.toLowerCase())).toContain("from");
  });

  it("se| (inicio de sentencia) no ofrece tablas sueltas", async () => {
    const result = await complete("se|");
    expect(labels(result)).not.toContain("users");
    expect(labels(result)).toContain("SELECT");
    expect(result?.options.find((option) => option.label === "SELECT")?.detail).toBe("Consultar filas");
  });

  it("FROM users wh| excluye WHEN/WHILE y prioriza WHERE", async () => {
    const result = await complete("SELECT * FROM users wh|");
    const opts = result?.options ?? [];
    const byLabel = new Map(opts.map((o) => [o.label.toLowerCase(), o]));
    expect(byLabel.has("when")).toBe(false);
    expect(byLabel.has("while")).toBe(false);
    expect(byLabel.has("whenever")).toBe(false);
    expect(byLabel.has("where")).toBe(true);
  });
});

describe("buildCompletionSource - no romper lo que ya funcionaba", () => {
  it("FROM us| sigue ofreciendo tablas (relation-target)", async () => {
    const result = await complete("SELECT * FROM us|");
    expect(labels(result)).toContain("users");
  });

  it("alias.columna sigue resolviendo via la libreria sin filtrar", async () => {
    const result = await complete("SELECT * FROM users u WHERE u.na|");
    expect(labels(result)).toContain("name");
  });

  it("FROM users JOIN o| sugiere la tabla relacionada por FK con el ON resuelto", async () => {
    // Con la palabra vacia (recien tipeado "JOIN " sin nada mas) la fuente de
    // JOIN no dispara salvo invocacion explicita, igual que antes de este
    // cambio - se prueba con un caracter tipeado, que es el uso real.
    const result = await complete("SELECT * FROM users JOIN o|");
    expect(labels(result)).toContain("orders o ON users.id = o.user_id");
  });

  it("WHERE ofrece columnas reales, no las suprime la expresion", async () => {
    const result = await complete("SELECT * FROM users WHERE na|");
    expect(labels(result)).toContain("name");
  });
});

describe("buildCompletionSource - columnas sin calificar antes del FROM y con JOIN", () => {
  it("SELECT na| FROM users sugiere columnas de la tabla aunque el FROM este despues del cursor", async () => {
    const result = await complete("SELECT na| FROM users");
    expect(labels(result)).toContain("name");
  });

  it("SELECT co| FROM users JOIN orders sugiere columnas de ambas tablas sin calificar", async () => {
    // Palabra no vacia ("co"): igual que en el test de JOIN de arriba, la
    // palabra vacia solo dispara con invocacion explicita.
    const result = await complete("SELECT co| FROM users JOIN orders ON users.id = orders.user_id");
    expect(labels(result)).toContain("name");
    expect(labels(result)).toContain("user_id");
    // "id" esta en las dos: calificado, para que la consulta no quede ambigua.
    expect(labels(result)).toContain("users.id");
    expect(labels(result)).toContain("orders.id");
    expect(labels(result)).not.toContain("id");
  });
});

describe("buildCompletionSource - JOIN, alias y ON al estilo DataGrip", () => {
  it("escribiendo jo… tras el FROM: la keyword primero y los JOIN completos con alias", async () => {
    const result = await complete("SELECT * FROM users jo|");
    const found = labels(result);
    expect(found).toContain("JOIN");
    expect(found).toContain("JOIN orders o ON users.id = o.user_id");
    const join = result!.options.find((option) => option.label === "JOIN")!;
    const full = result!.options.find((option) => option.label.startsWith("JOIN orders"))!;
    expect(join.boost!).toBeGreaterThan(full.boost!);
  });

  it("con LEFT delante solo agrega lo que falta, y usa el alias de la tabla presente", async () => {
    const result = await complete("SELECT * FROM orders ord LEFT jo|");
    expect(labels(result)).toContain("JOIN users u ON u.id = ord.user_id");
  });

  it("relaciona con cualquier tabla presente, no solo la del FROM", async () => {
    const result = await complete("SELECT * FROM orders o JOIN users u ON u.id = o.user_id JOIN o|");
    // orders ya esta: no se repite. Nada mas se relaciona en este catalogo.
    expect(labels(result).filter((label) => label.includes(" ON "))).toEqual([]);
  });

  it("tras un ON ya escrito, jo… empieza el siguiente JOIN; en medio de la condicion, no", async () => {
    const catalog = "SELECT * FROM orders o JOIN users u ON u.id = o.user_id";
    // Nada mas se relaciona en este catalogo: solo la keyword JOIN.
    const afterOn = await complete(`${catalog} jo|`);
    expect(afterOn!.options.find((option) => option.label === "JOIN")!.boost).toBe(40);
    expect(labels(await complete("SELECT * FROM users u JOIN users p ON p.id = u.id jo|"))).toContain(
      "JOIN orders o ON p.id = o.user_id",
    );
    expect(labels(await complete("SELECT * FROM users u JOIN users p ON p.id = jo|")).some((label) => label.startsWith("JOIN "))).toBe(
      false,
    );
  });

  it("el alias no choca con los de la sentencia", async () => {
    const result = await complete("SELECT * FROM users o jo|");
    expect(labels(result)).toContain("JOIN orders o1 ON o.id = o1.user_id");
  });

  it("despues de ON: la condicion por FK primero", async () => {
    const result = await complete("SELECT * FROM users u JOIN orders o ON |", true);
    const on = result!.options.filter((option) => option.detail === "ON").map((option) => option.label);
    expect(on[0]).toBe("u.id = o.user_id");
    // Mismo nombre en las dos tablas, como pista.
    expect(on).toContain("u.id = o.id");
  });
});

describe("buildCompletionSource - alias al elegir una tabla", () => {
  // Aplica la opcion sobre un EditorView minimo (solo state y dispatch).
  async function accept(withCursor: string, label: string) {
    const pos = withCursor.indexOf("|");
    const doc = withCursor.slice(0, pos) + withCursor.slice(pos + 1);
    const result = await complete(withCursor);
    const option = result!.options.find((candidate) => candidate.label === label)!;
    let state = EditorState.create({ doc, extensions: [MySQL.language] });
    const view = {
      get state() {
        return state;
      },
      dispatch(spec: TransactionSpec) {
        state = state.update(spec).state;
      },
    };
    (option.apply as (view: unknown, completion: Completion, from: number, to: number) => void)(view, option, result!.from, pos);
    return state.doc.toString();
  }

  it("en el FROM agrega el alias", async () => {
    expect(await accept("SELECT * FROM us|", "users")).toBe("SELECT * FROM users u");
  });

  it("si ya tiene alias escrito, no lo repite", async () => {
    expect(await accept("SELECT * FROM us| x WHERE x.id = 1", "users")).toBe("SELECT * FROM users x WHERE x.id = 1");
  });

  it("fuera de una consulta (DELETE, UPDATE) no agrega alias", async () => {
    expect(await accept("DELETE FROM us|", "users")).toBe("DELETE FROM users");
  });
});

describe("buildCompletionSource - Postgres con users y \"Users\" en la misma base", () => {
  const table = (name: string, columns: string[], foreignKeys: CatalogTable["foreignKeys"] = []): CatalogTable => ({
    schema: "public",
    name,
    columns: columns.map((column, index) => ({ name: column, dataType: "integer", nullable: false, isPrimaryKey: index === 0 })),
    foreignKeys,
  });
  const catalog = [
    table("users", ["id"]),
    table("Users", ["Id"]),
    table("orders", ["id", "user_id"], [{ column: "user_id", referencedTable: "users", referencedColumn: "id" }]),
    table("profiles", ["id", "user_id"], [{ column: "user_id", referencedTable: "Users", referencedColumn: "Id" }]),
  ];

  async function pg(withCursor: string) {
    const pos = withCursor.indexOf("|");
    const doc = withCursor.replace("|", "");
    const engine = ENGINES.postgres;
    const { schema, defaultSchema, fkIndex, tableIndex } = buildSqlSchema(catalog, { defaultSchema: "public", engine });
    const dialect = dialectFor(engine);
    const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [dialect.language] });
    const source = buildCompletionSource({ dialect, engine, schema, defaultSchema, fkIndex, tableIndex });
    return labels(await source(new CompletionContext(state, pos, true)));
  }

  it("sin comillas es users; entre comillas, \"Users\": cada una con sus FK", async () => {
    const plain = await pg("SELECT * FROM users u jo|");
    expect(plain).toContain("JOIN orders o ON u.id = o.user_id");
    expect(plain.some((label) => label.includes("profiles"))).toBe(false);

    // Users sin comillas tambien es users.
    expect(await pg("SELECT * FROM Users u jo|")).toContain("JOIN orders o ON u.id = o.user_id");

    const quoted = await pg('SELECT * FROM "Users" u jo|');
    expect(quoted).toContain('JOIN profiles p ON u."Id" = p.user_id');
    expect(quoted.some((label) => label.includes("orders"))).toBe(false);
  });

  it("las dos aparecen en el FROM, cada una escrita como se lee", async () => {
    const found = await pg("SELECT * FROM us|");
    expect(found.filter((label) => label === "users" || label === "Users")).toEqual(["users", "Users"]);
  });

  it("las columnas son las de la tabla que se nombro", async () => {
    const found = await pg('SELECT * FROM "Users" a JOIN users b ON |');
    // Sin FK entre ellas ni columnas con el mismo nombre: nada que proponer.
    expect(found.filter((label) => label.includes(" = "))).toEqual([]);
  });
});
