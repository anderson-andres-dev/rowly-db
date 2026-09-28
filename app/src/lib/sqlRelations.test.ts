import { ENGINES } from "./engines";
import { describe, expect, it } from "vitest";
import { aliasFor, statementRelations, takenNames } from "./sqlRelations";

const none = new Set<string>();
// Las reservadas las da el motor (su perfil mas las keywords del dialecto).
const reserved = ENGINES.mysql.reservedWords;

describe("aliasFor", () => {
  it("usa las iniciales de cada parte, como DataGrip", () => {
    expect(aliasFor("tec_acs", none, reserved)).toBe("ta");
    expect(aliasFor("tec_abonados_cambios", none, reserved)).toBe("tac");
    expect(aliasFor("com_abonados_por_finalizar", none, reserved)).toBe("capf");
    expect(aliasFor("com_abonados_cambios_schedule", none, reserved)).toBe("cacs");
    expect(aliasFor("usuarios", none, reserved)).toBe("u");
    expect(aliasFor("OrderItems", none, reserved)).toBe("oi");
    expect(aliasFor("tec_abonados2", none, reserved)).toBe("ta");
  });

  it("una palabra reservada se acorta a la primera letra", () => {
    expect(aliasFor("tec_onts", none, reserved)).toBe("t");
    expect(aliasFor("order_numbers", none, reserved)).toBe("o");
    expect(aliasFor("in_nodes", none, reserved)).toBe("i");
  });

  it("no repite un alias ni el nombre de una tabla de la sentencia", () => {
    expect(aliasFor("com_ciudades", new Set(["cc"]), reserved)).toBe("cc1");
    expect(aliasFor("com_clientes", new Set(["cc", "cc1"]), reserved)).toBe("cc2");
    expect(aliasFor("users", new Set(["u"]), reserved)).toBe("u1");
  });
});

describe("statementRelations", () => {
  const tables = (text: string) =>
    statementRelations(text, ENGINES.mysql.lexical).relations.map(({ schema, table, alias }) => ({ schema, table, alias }));

  it("lee el FROM, los JOIN, el schema y los alias", () => {
    expect(
      tables("SELECT * FROM core.tec_abonados a LEFT JOIN tec_onts AS t ON t.x = a.x JOIN `com_ciudades` cc ON 1 = 1 WHERE"),
    ).toEqual([
      { schema: "core", table: "tec_abonados", alias: "a" },
      { schema: undefined, table: "tec_onts", alias: "t" },
      { schema: undefined, table: "com_ciudades", alias: "cc" },
    ]);
  });

  it("varias tablas separadas por comas; una palabra clave no es un alias", () => {
    expect(tables("SELECT * FROM a, b x WHERE a.id = x.id ORDER BY 1")).toEqual([
      { schema: undefined, table: "a", alias: undefined },
      { schema: undefined, table: "b", alias: "x" },
    ]);
    expect(tables("SELECT * FROM a jo")).toEqual([{ schema: undefined, table: "a", alias: "jo" }]);
    expect(tables("SELECT * FROM a WHERE")).toEqual([{ schema: undefined, table: "a", alias: undefined }]);
  });

  it("una subconsulta aporta solo su alias", () => {
    const { relations, aliases } = statementRelations("SELECT * FROM (SELECT id FROM b) sub JOIN c ON c.id = sub.id", ENGINES.mysql.lexical);
    // Las tablas de adentro no se ven desde la sentencia de afuera.
    expect(relations.map((relation) => relation.table)).toEqual(["c"]);
    expect(aliases).toEqual(["sub"]);
    expect([...takenNames(relations, aliases)].sort()).toEqual(["c", "sub"]);
  });
});
