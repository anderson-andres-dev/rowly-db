import { describe, expect, it } from "vitest";
import { CompletionContext, type Completion } from "@codemirror/autocomplete";
import { history, redo, undo } from "@codemirror/commands";
import { MySQL } from "@codemirror/lang-sql";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { ENGINES } from "../engines";
import { buildCompletionSource, buildSqlSchema, extractDefaultTable } from "./completionSource";
import { statementIndexField, statementTextAt } from "./statementIndex";
import type { TableAliasMode } from "../stores/editorSettings";
import type { CatalogTable } from "../types";

// Como escribe la gente de verdad: fuera de orden, borrando, pegando, en
// minusculas, deshaciendo. Cada prueba parte de un documento con "|" donde
// esta el cursor y, si hace falta, acepta una sugerencia sobre un editor
// minimo con historial.

const table = (name: string, columns: string[], foreignKeys: CatalogTable["foreignKeys"] = []): CatalogTable => ({
  schema: "public",
  name,
  columns: columns.map((column, index) => ({ name: column, dataType: "integer", nullable: false, isPrimaryKey: index === 0 })),
  foreignKeys,
});

const CATALOG = [
  table("users", ["id", "name", "email"]),
  table("orders", ["id", "user_id", "total"], [{ column: "user_id", referencedTable: "users", referencedColumn: "id" }]),
];

function split(withCursor: string): { doc: string; pos: number } {
  const pos = withCursor.indexOf("|");
  if (pos === -1) throw new Error("falta el cursor |");
  return { doc: withCursor.slice(0, pos) + withCursor.slice(pos + 1), pos };
}

async function suggest(withCursor: string, tableAliases: TableAliasMode = "always", explicit = false) {
  const { doc, pos } = split(withCursor);
  // Con el indice de sentencias, como en el editor: la sugerencia solo ve la
  // sentencia del cursor.
  const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [MySQL.language, statementIndexField] });
  const { schema, defaultSchema, fkIndex, tableIndex } = buildSqlSchema(CATALOG);
  // La tabla por defecto sale de la sentencia del cursor, como en SqlEditor.
  const current = statementTextAt(state, pos);
  const source = buildCompletionSource({
    dialect: MySQL,
    engine: ENGINES.mysql,
    schema,
    defaultSchema,
    defaultTable: extractDefaultTable(current.text, current.offset),
    fkIndex,
    tableIndex,
    tableAliases,
  });
  return source(new CompletionContext(state, pos, explicit));
}

async function labels(withCursor: string, tableAliases: TableAliasMode = "always", explicit = false) {
  return ((await suggest(withCursor, tableAliases, explicit))?.options ?? []).map((option) => option.label);
}

// Un editor minimo: el estado con historial y dispatch, como lo usan apply,
// undo y redo.
function editor(doc: string) {
  let state = EditorState.create({ doc, extensions: [MySQL.language, history()] });
  return {
    get state() {
      return state;
    },
    dispatch(spec: TransactionSpec) {
      state = state.update(spec).state;
    },
    text() {
      return state.doc.toString();
    },
  };
}

// Acepta la sugerencia `label` y devuelve el editor, para seguir editando.
async function accept(withCursor: string, label: string, tableAliases: TableAliasMode = "always") {
  const { doc, pos } = split(withCursor);
  const result = await suggest(withCursor, tableAliases, true);
  const option = result?.options.find((candidate) => candidate.label === label);
  if (!option) throw new Error(`sin la sugerencia ${label}: ${result?.options.map((o) => o.label).join(", ")}`);
  const view = editor(doc);
  if (typeof option.apply === "function") {
    (option.apply as (view: unknown, completion: Completion, from: number, to: number) => void)(view, option, result!.from, pos);
  } else {
    const insert = option.apply ?? option.label;
    view.dispatch({ changes: { from: result!.from, to: pos, insert }, selection: { anchor: result!.from + insert.length } });
  }
  return view;
}

describe("alias de tabla", () => {
  it("siempre: la tabla elegida en el FROM llega con su alias", async () => {
    expect((await accept("SELECT * FROM us|", "users")).text()).toBe("SELECT * FROM users u");
  });

  it("nunca: la tabla llega sola y el JOIN completo usa los nombres", async () => {
    expect((await accept("SELECT * FROM us|", "users", "never")).text()).toBe("SELECT * FROM users");
    expect(await labels("SELECT * FROM users jo|", "never")).toContain("JOIN orders ON users.id = orders.user_id");
  });

  it("con varias tablas: la primera va sin alias y la segunda con alias", async () => {
    expect((await accept("SELECT * FROM us|", "users", "multiple")).text()).toBe("SELECT * FROM users");
    expect((await accept("SELECT * FROM users JOIN or|", "orders", "multiple")).text()).toBe("SELECT * FROM users JOIN orders o");
    expect(await labels("SELECT * FROM users jo|", "multiple")).toContain("JOIN orders o ON users.id = o.user_id");
  });

  it("nunca toca una tabla escrita a mano", async () => {
    const view = await accept("SELECT * FROM users WHERE na|", "name");
    expect(view.text()).toBe("SELECT * FROM users WHERE name");
  });

  it("un alias que el usuario borro no vuelve", async () => {
    const view = await accept("SELECT * FROM us|", "users");
    expect(view.text()).toBe("SELECT * FROM users u");
    // Borra " u" y sigue escribiendo el SELECT.
    const withoutAlias = "SELECT na| FROM users";
    expect((await accept(withoutAlias, "name")).text()).toBe("SELECT name FROM users");
  });

  it("las columnas usan el alias que quedo escrito, no el sugerido", async () => {
    const view = await accept("SELECT * FROM users x JOIN orders o ON o.user_id = x.id WHERE i|", "x.id");
    expect(view.text()).toBe("SELECT * FROM users x JOIN orders o ON o.user_id = x.id WHERE x.id");
  });

  it("si despues de la tabla ya hay un alias escrito, no se repite", async () => {
    expect((await accept("SELECT * FROM us| x WHERE x.id = 1", "users")).text()).toBe("SELECT * FROM users x WHERE x.id = 1");
  });
});

describe("deshacer y rehacer tras aceptar una sugerencia", () => {
  it("deshacer quita la tabla con su alias de una vez y rehacer la devuelve", async () => {
    const view = await accept("SELECT * FROM us|", "users");
    expect(view.text()).toBe("SELECT * FROM users u");
    undo(view);
    expect(view.text()).toBe("SELECT * FROM us");
    redo(view);
    expect(view.text()).toBe("SELECT * FROM users u");
  });

  it("lo mismo con un JOIN completo", async () => {
    const view = await accept("SELECT * FROM users u jo|", "JOIN orders o ON u.id = o.user_id");
    expect(view.text()).toBe("SELECT * FROM users u JOIN orders o ON u.id = o.user_id");
    undo(view);
    expect(view.text()).toBe("SELECT * FROM users u jo");
  });
});

describe("formas reales de escribir", () => {
  it("columnas antes del FROM: se completan cuando el FROM ya esta escrito despues", async () => {
    expect(await labels("SELECT na| FROM users")).toContain("name");
    expect(await labels("SELECT id, us| FROM orders")).toContain("user_id");
  });

  it("borrar una linea y volver a escribirla", async () => {
    expect(await labels("SELECT * FRO|")).toContain("FROM");
    expect(await labels("SELECT * FROM users;\nSELECT * FRO|")).toContain("FROM");
  });

  it("cambiar la tabla del FROM en medio de una consulta ya escrita", async () => {
    const found = await labels("SELECT us| FROM orders WHERE id = 1");
    expect(found).toContain("user_id");
    expect(found).not.toContain("email");
  });

  it("pegar una consulta completa y editarla por dentro", async () => {
    const pasted = "SELECT o.id,\n       o.to|\nFROM orders o\nWHERE o.id = 1\nORDER BY o.id;";
    expect(await labels(pasted)).toContain("total");
  });

  it("varias consultas en el mismo archivo, separadas por ; o por lineas en blanco", async () => {
    expect(await labels("SELECT * FROM users;\nSELECT us| FROM orders")).toContain("user_id");
    expect(await labels("SELECT * FROM users\n\nSELECT us| FROM orders")).toContain("user_id");
    expect(await labels("SELECT em| FROM users;\nSELECT * FROM orders")).toContain("email");
  });

  it("con varias tablas: una consulta anterior en el archivo no cuenta como otra tabla", async () => {
    expect((await accept("SELECT * FROM orders;\n\nSELECT * FROM us|", "users", "multiple")).text()).toBe(
      "SELECT * FROM orders;\n\nSELECT * FROM users",
    );
    expect((await accept("SELECT * FROM orders\n\nSELECT * FROM us|", "users", "multiple")).text()).toBe(
      "SELECT * FROM orders\n\nSELECT * FROM users",
    );
  });

  it("JOIN y ON escritos antes de terminar el SELECT", async () => {
    const found = await labels("SELECT | FROM users u JOIN orders o ON o.user_id = u.id", "always", true);
    expect(found).toContain("u.id");
    expect(found).toContain("o.id");
    expect(found).toContain("total");
  });

  it("palabras clave en minusculas o mezcladas", async () => {
    expect((await accept("select * from us|", "users")).text()).toBe("select * from users u");
    expect(await labels("Select * From users jo|")).toContain("JOIN orders o ON users.id = o.user_id");
  });

  it("consultas incompletas o con errores mientras se escribe", async () => {
    expect(await labels("SELECT * FROM users WHERE (na|")).toContain("name");
    expect(await labels("SELECT ,, FROM us|")).toContain("users");
    expect(await labels("SELECT * FROM users WHERE id = AND na|")).toContain("name");
  });
});
