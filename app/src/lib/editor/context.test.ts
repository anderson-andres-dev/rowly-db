import { ENGINES } from "../engines";
import { describe, expect, it } from "vitest";
import { classifyContext } from "./context";

// El marcador "|" indica la posicion del cursor en el texto del test; se
// quita antes de llamar al clasificador.
function classify(withCursor: string) {
  const pos = withCursor.indexOf("|");
  if (pos === -1) throw new Error("test input must contain a | cursor marker");
  const doc = withCursor.slice(0, pos) + withCursor.slice(pos + 1);
  return classifyContext(doc, pos, ENGINES.mysql.lexical);
}

describe("classifyContext - los tres casos reportados", () => {
  it("select * fro| sugiere FROM, no tablas", () => {
    const ctx = classify("select * fro|");
    expect(ctx.position).toBe("select-tail");
    expect(ctx.clause).toBe("select");
    expect(ctx.confidence).toBe("confident");
  });

  it("se| al inicio de sentencia es statement-start", () => {
    const ctx = classify("se|");
    expect(ctx.position).toBe("statement-start");
  });

  it("FROM tec_abonados wh| es relation-tail, no expression", () => {
    const ctx = classify("SELECT * FROM tec_abonados wh|");
    expect(ctx.position).toBe("relation-tail");
    expect(ctx.clause).toBe("from");
  });
});

describe("classifyContext - relation target vs tail", () => {
  it("FROM us| (sin espacio) es relation-target", () => {
    const ctx = classify("SELECT * FROM us|");
    expect(ctx.position).toBe("relation-target");
    expect(ctx.clause).toBe("from");
  });

  it("FROM users | (tabla ya completa) es relation-tail", () => {
    const ctx = classify("SELECT * FROM users |");
    expect(ctx.position).toBe("relation-tail");
  });

  it("el nombre de tabla escrito no se confunde con un alias", () => {
    // catalog membership nunca deberia importar aca: no hay catalogo en
    // este modulo, pero el punto es que "users" nunca se marca como alias.
    const ctx = classify("SELECT * FROM users|");
    expect(ctx.position).toBe("relation-target");
  });
});

describe("classifyContext - alias explicito e implicito", () => {
  it("FROM users AS | espera el alias", () => {
    const ctx = classify("SELECT * FROM users AS |");
    expect(ctx.position).toBe("alias");
  });

  it("FROM users AS u| esta escribiendo el alias", () => {
    const ctx = classify("SELECT * FROM users AS u|");
    expect(ctx.position).toBe("alias");
  });

  it("FROM users u | (alias implicito completo) vuelve a relation-tail", () => {
    const ctx = classify("SELECT * FROM users u |");
    expect(ctx.position).toBe("relation-tail");
  });

  it("captura primaryRelation con alias implicito", () => {
    const ctx = classify("SELECT * FROM users u WHERE |");
    expect(ctx.primaryRelation).toEqual({ table: "users", alias: "u" });
  });

  it("captura primaryRelation con alias explicito", () => {
    const ctx = classify("SELECT * FROM users AS u WHERE |");
    expect(ctx.primaryRelation).toEqual({ table: "users", alias: "u" });
  });

  it("captura primaryRelation con tabla calificada por schema (schema.tabla)", () => {
    const ctx = classify("SELECT * FROM core.tec_abonados ta WHERE |");
    // La tabla real es "tec_abonados", no el schema "core" - antes de este
    // fix quedaba pisado con el schema por ser la primera palabra vista.
    expect(ctx.primaryRelation).toEqual({ table: "tec_abonados", alias: "ta" });
  });

  it("FROM a, schema.b (2da relacion calificada) no pisa la primaryRelation de la 1ra", () => {
    const ctx = classify("SELECT * FROM users u, core.orders o WHERE |");
    expect(ctx.primaryRelation).toEqual({ table: "users", alias: "u" });
  });
});

describe("classifyContext - GROUP/ORDER BY y modificadores de JOIN", () => {
  it("GROUP b| espera BY", () => {
    const ctx = classify("SELECT * FROM t GROUP b|");
    expect(ctx.position).toBe("keyword-continuation");
    expect(ctx.pendingKeyword).toBe("by");
  });

  it("ORDER b| espera BY", () => {
    const ctx = classify("SELECT * FROM t ORDER b|");
    expect(ctx.position).toBe("keyword-continuation");
    expect(ctx.pendingKeyword).toBe("by");
  });

  it("GROUP BY | pasa a expression de clausula group-by", () => {
    const ctx = classify("SELECT * FROM t GROUP BY |");
    expect(ctx.position).toBe("expression");
    expect(ctx.clause).toBe("group-by");
  });

  it("LEFT | espera JOIN u otro modificador", () => {
    const ctx = classify("SELECT * FROM t LEFT |");
    expect(ctx.position).toBe("keyword-continuation");
    expect(ctx.pendingKeyword).toBe("join");
  });

  it("LEFT JOIN | vuelve a pedir una tabla", () => {
    const ctx = classify("SELECT * FROM t LEFT JOIN |");
    expect(ctx.position).toBe("relation-target");
    expect(ctx.clause).toBe("join");
  });
});

describe("classifyContext - acceso calificado y comillas", () => {
  it("u.na| se marca qualified", () => {
    const ctx = classify("SELECT u.na| FROM users u");
    expect(ctx.qualified).toBe(true);
    expect(ctx.activeWord.text).toBe("na");
  });

  it("public.us| (schema calificado) se marca qualified", () => {
    const ctx = classify("SELECT * FROM public.us|");
    expect(ctx.qualified).toBe(true);
  });

  it("una palabra sin punto antes no es qualified", () => {
    const ctx = classify("SELECT * FROM us|");
    expect(ctx.qualified).toBe(false);
  });

  it("dentro de un identificador entre backticks sin cerrar es unknown/quoted-identifier", () => {
    const ctx = classify("SELECT * FROM `us|");
    expect(ctx.lexical).toBe("quoted-identifier");
    expect(ctx.position).toBe("unknown");
  });
});

describe("classifyContext - comentarios, strings y punto y coma", () => {
  it("una keyword dentro de un comentario de linea no cuenta", () => {
    const ctx = classify("SELECT * -- FROM x\nFROM t wh|");
    expect(ctx.position).toBe("relation-tail");
    expect(ctx.clause).toBe("from");
  });

  it("un ; dentro de un string no separa sentencias", () => {
    const ctx = classify("SELECT 'a;b' FROM t wh|");
    expect(ctx.position).toBe("relation-tail");
  });

  it("cursor dentro de un string sin cerrar es unknown/string", () => {
    const ctx = classify("SELECT * FROM t WHERE name = 'abc|");
    expect(ctx.lexical).toBe("string");
    expect(ctx.position).toBe("unknown");
  });

  it("un ; real reinicia a statement-start", () => {
    const ctx = classify("SELECT 1; se|");
    expect(ctx.position).toBe("statement-start");
  });
});

describe("classifyContext - CASE/WHEN y subqueries anidadas", () => {
  it("WHEN dentro de un CASE no resetea la clausula WHERE", () => {
    const ctx = classify("SELECT * FROM t WHERE CASE WHEN a THEN 1 ELSE 2 END = |");
    expect(ctx.clause).toBe("where");
    expect(ctx.position).toBe("expression");
  });

  it("un FROM dentro de parentesis (subquery) no se filtra al frame externo", () => {
    const ctx = classify("SELECT * FROM t1 WHERE id IN (SELECT id FROM t2 WHERE x = 1) AND |");
    expect(ctx.clause).toBe("where");
  });

  it("EXTRACT(x FROM y) no cambia la clausula de la sentencia externa", () => {
    const ctx = classify("SELECT EXTRACT(YEAR FROM created_at) FROM orders wh|");
    expect(ctx.clause).toBe("from");
    expect(ctx.position).toBe("relation-tail");
  });
});

describe("classifyContext - degradacion ante sintaxis no reconocida", () => {
  it("DDL no reconocido cae a unknown en vez de adivinar", () => {
    const ctx = classify("CREATE TABLE foo (id INT, name |");
    expect(ctx.position).toBe("unknown");
  });

  it("mas alla del limite de escaneo devuelve unknown sin intentar leer", () => {
    const huge = "x".repeat(140 * 1024) + " SELECT * FROM t wh|";
    const ctx = classify(huge);
    expect(ctx.position).toBe("unknown");
    expect(ctx.confidence).toBe("unknown");
  });

  it("un documento vacio es statement-start", () => {
    const ctx = classify("|");
    expect(ctx.position).toBe("statement-start");
  });
});
