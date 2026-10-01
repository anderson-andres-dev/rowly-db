import { describe, expect, it } from "vitest";
import { SCAN_OVERLAP, initialScanState, scanChunk, splitStatements, statementAt } from "./sqlStatements";
import { ENGINES } from "./engines";

const mysql = ENGINES.mysql.lexical;
const postgres = ENGINES.postgres.lexical;

const doc = [
  "SELECT * FROM portal_payment_incidents;", // linea 0
  "",
  "",
  "SELECT * FROM tec_abonados;", // linea 3
  "",
  "SELECT * FROM com_facturas_ventas;", // linea 5
  "",
  "SELECT * FROM api_core_smoke_test;", // linea 7
  "",
  "",
].join("\n");

function textAt(text: string, offset: number): string | null {
  const range = statementAt(text, offset, mysql);
  return range ? text.slice(range.from, range.to) : null;
}

function lineStart(text: string, line: number): number {
  return text.split("\n").slice(0, line).join("\n").length + (line > 0 ? 1 : 0);
}

describe("statementAt", () => {
  it("con el cursor al inicio de la linea elige la sentencia de esa linea, nunca todo el documento", () => {
    expect(textAt(doc, lineStart(doc, 7))).toBe("SELECT * FROM api_core_smoke_test;");
    expect(textAt(doc, lineStart(doc, 0))).toBe("SELECT * FROM portal_payment_incidents;");
    expect(textAt(doc, lineStart(doc, 3))).toBe("SELECT * FROM tec_abonados;");
  });

  it("dentro de la sentencia y justo despues de su punto y coma", () => {
    const line5 = lineStart(doc, 5);
    expect(textAt(doc, line5 + 10)).toBe("SELECT * FROM com_facturas_ventas;");
    expect(textAt(doc, line5 + "SELECT * FROM com_facturas_ventas;".length)).toBe(
      "SELECT * FROM com_facturas_ventas;",
    );
  });

  it("en una linea vacia elige la mas cercana; a igual distancia, la anterior", () => {
    expect(textAt(doc, lineStart(doc, 1))).toBe("SELECT * FROM portal_payment_incidents;");
    expect(textAt(doc, lineStart(doc, 2))).toBe("SELECT * FROM tec_abonados;");
    expect(textAt(doc, lineStart(doc, 4))).toBe("SELECT * FROM tec_abonados;");
    expect(textAt(doc, lineStart(doc, 9))).toBe("SELECT * FROM api_core_smoke_test;");
  });

  it("sin sentencias no devuelve nada", () => {
    expect(statementAt("   \n  -- solo un comentario\n", 3, mysql)).toBeNull();
  });

  it("una sentencia sin punto y coma final", () => {
    expect(textAt("SELECT 1;\nSELECT 2\n", 12)).toBe("SELECT 2");
  });
});

describe("splitStatements", () => {
  const parts = (text: string, lexical = mysql) => splitStatements(text, lexical).map((range) => text.slice(range.from, range.to));

  it("MySQL: no corta en ; dentro de comillas, backticks ni comentarios (tambien #)", () => {
    const text = ["SELECT 'a;b', \"c;d\", `e;f`; -- nota; aqui", "/* bloque; */ SELECT 2; # otra; nota", "SELECT 3;"].join("\n");
    expect(parts(text)).toEqual(["SELECT 'a;b', \"c;d\", `e;f`;", "SELECT 2;", "SELECT 3;"]);
  });

  it("MySQL: respeta las comillas escapadas, con '' y con barra invertida", () => {
    expect(parts("SELECT 'it''s; ok';\nSELECT 'a\\';b';")).toEqual(["SELECT 'it''s; ok';", "SELECT 'a\\';b';"]);
  });

  it("MySQL: -- sin espacio es resta y negacion, no comentario", () => {
    expect(parts("SELECT 1--2; SELECT 3;")).toEqual(["SELECT 1--2;", "SELECT 3;"]);
  });

  it("Postgres: bloques $$ y la barra invertida es un caracter mas", () => {
    const text = "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;\nSELECT 'C:\\';SELECT 2;";
    expect(parts(text, postgres)).toEqual([
      "CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;",
      "SELECT 'C:\\';",
      "SELECT 2;",
    ]);
  });

  it("Postgres: etiquetas dolar con digitos preservan el cuerpo", () => {
    expect(parts("DO $body1$ BEGIN PERFORM 1; END $body1$; SELECT 2;", postgres)).toEqual([
      "DO $body1$ BEGIN PERFORM 1; END $body1$;",
      "SELECT 2;",
    ]);
  });

  it("Postgres: comentarios de bloque anidados no cortan en punto y coma", () => {
    const text = `SELECT 1 /* externo; ${"x".repeat(100)} /* interno; */ sigue; */; SELECT 2;`;
    expect(parts(text, postgres)).toEqual([
      text.slice(0, text.indexOf("; SELECT 2") + 1),
      "SELECT 2;",
    ]);
    const state = initialScanState();
    const out: { from: number; to: number; terminated: boolean }[] = [];
    const cut = text.indexOf("externo") + 10;
    const first = text.slice(0, cut + SCAN_OVERLAP);
    const stop = scanChunk(first, 0, cut, false, state, out, postgres);
    scanChunk(text.slice(stop), stop, text.length - stop, true, state, out, postgres);
    expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(parts(text, postgres));
  });

  it("Postgres: # no es un comentario (es un operador)", () => {
    expect(parts("SELECT 1 # 2; SELECT 3;", postgres)).toEqual(["SELECT 1 # 2;", "SELECT 3;"]);
    expect(parts("--nota;\nSELECT 2;", postgres)).toEqual(["SELECT 2;"]);
  });

  it("MySQL: rutina compuesta y DELIMITER son una sentencia SQL limpia", () => {
    const text = "SELECT 1;\nDELIMITER $$\nCREATE PROCEDURE p() BEGIN DECLARE x INT DEFAULT 0; IF x = 0 THEN SET x = 1; END IF; SELECT CASE WHEN x = 1 THEN 2 ELSE 3 END; END$$\nDELIMITER ;\nSELECT 2;";
    expect(parts(text)).toEqual([
      "SELECT 1;",
      "CREATE PROCEDURE p() BEGIN DECLARE x INT DEFAULT 0; IF x = 0 THEN SET x = 1; END IF; SELECT CASE WHEN x = 1 THEN 2 ELSE 3 END; END",
      "SELECT 2;",
    ]);
    expect(textAt(text, text.indexOf("DECLARE"))).toContain("END IF;");
  });

  it("MySQL: bloques anidados sin directiva y cuerpos simples", () => {
    const text = "CREATE PROCEDURE p() BEGIN lbl: BEGIN SELECT 1; END lbl; REPEAT SET @x = 1; UNTIL @x = 1 END REPEAT; END; CREATE FUNCTION f() RETURNS INT RETURN 1; CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.x = 1;";
    expect(parts(text)).toEqual([
      "CREATE PROCEDURE p() BEGIN lbl: BEGIN SELECT 1; END lbl; REPEAT SET @x = 1; UNTIL @x = 1 END REPEAT; END;",
      "CREATE FUNCTION f() RETURNS INT RETURN 1;",
      "CREATE TRIGGER tr BEFORE INSERT ON t FOR EACH ROW SET NEW.x = 1;",
    ]);
  });

  it("MySQL: comentarios de version pueden contener CREATE y DEFINER", () => {
    const text = "/*!50003 CREATE*/ /*!50003 DEFINER=`u`@`%`*/ PROCEDURE p() BEGIN SELECT 'x;y'; END; SELECT 2;";
    expect(parts(text)).toEqual([
      "/*!50003 CREATE*/ /*!50003 DEFINER=`u`@`%`*/ PROCEDURE p() BEGIN SELECT 'x;y'; END;",
      "SELECT 2;",
    ]);
  });

  it("MySQL: un evento compuesto termina en END; sin DELIMITER", () => {
    expect(parts("CREATE EVENT e ON SCHEDULE EVERY 1 DAY DO BEGIN SET @x = 1; END; SELECT 2;")).toEqual([
      "CREATE EVENT e ON SCHEDULE EVERY 1 DAY DO BEGIN SET @x = 1; END;",
      "SELECT 2;",
    ]);
  });

  it("MySQL: una directiva larga partida entre trozos no llega al servidor", () => {
    const delimiter = "_".repeat(90);
    const text = `DELIMITER ${delimiter}\nCREATE FUNCTION f() RETURNS INT RETURN 1${delimiter}\nDELIMITER ;\nSELECT 2;`;
    expect(parts(text)).toEqual(["CREATE FUNCTION f() RETURNS INT RETURN 1", "SELECT 2;"]);
    const state = initialScanState();
    const out: { from: number; to: number; terminated: boolean }[] = [];
    let pos = 0;
    for (const limit of [12, text.length]) {
      const chunk = text.slice(pos, Math.min(text.length, limit + SCAN_OVERLAP));
      const final = pos + chunk.length === text.length;
      pos += scanChunk(chunk, pos, final ? chunk.length : limit - pos, final, state, out, mysql);
    }
    expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(["CREATE FUNCTION f() RETURNS INT RETURN 1", "SELECT 2;"]);
  });

  it("Postgres: un cuerpo $$ abierto no absorbe las consultas siguientes, solo si nunca cierra", () => {
    const broken = "CREATE FUNCTION f() RETURNS int AS $$ BEGIN\nSELECT 1;\n\nSELECT 99;\n\nSELECT 100;";
    expect(parts(broken, postgres)).toEqual(["CREATE FUNCTION f() RETURNS int AS $$ BEGIN\nSELECT 1;", "SELECT 99;", "SELECT 100;"]);
    const closed = "CREATE FUNCTION f() RETURNS int AS $$ BEGIN\nSELECT 1;\n\nSELECT 99;\nEND; $$ LANGUAGE plpgsql;\nSELECT 2;";
    expect(parts(closed, postgres)).toEqual(["CREATE FUNCTION f() RETURNS int AS $$ BEGIN\nSELECT 1;\n\nSELECT 99;\nEND; $$ LANGUAGE plpgsql;", "SELECT 2;"]);
    const noBlank = "DO $$ BEGIN\nSELECT 1;\nSELECT 2;";
    expect(parts(noBlank, postgres)).toEqual([noBlank]);
    for (const text of [broken, closed, noBlank]) {
      const expected = parts(text, postgres);
      for (let cut = 1; cut < text.length; cut++) {
        const state = initialScanState();
        const out: { from: number; to: number; terminated: boolean }[] = [];
        const chunk = text.slice(0, Math.min(text.length, cut + SCAN_OVERLAP));
        const stop = scanChunk(chunk, 0, cut, false, state, out, postgres);
        scanChunk(text.slice(stop), stop, text.length - stop, true, state, out, postgres);
        expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(expected);
      }
    }
  });

  it("recupera una rutina abierta solo al llegar al final sin END", () => {
    const broken = "CREATE PROCEDURE p() BEGIN\nSELECT 1;\n\nSELECT 99;\n\nSELECT 100;";
    expect(parts(broken)).toEqual(["CREATE PROCEDURE p() BEGIN\nSELECT 1;", "SELECT 99;", "SELECT 100;"]);
    const valid = "CREATE PROCEDURE p() BEGIN\nSELECT 1;\n\nSELECT 99;\n\nSELECT 100;\nEND;";
    expect(parts(valid)).toEqual([valid]);
    const delimited = "DELIMITER $$\nCREATE PROCEDURE p() BEGIN\nSELECT 1;\n\nSELECT 99;$$\nDELIMITER ;\nSELECT 2;";
    expect(parts(delimited)).toEqual(["CREATE PROCEDURE p() BEGIN\nSELECT 1;", "SELECT 99;", "SELECT 2;"]);
    for (const text of [broken, valid]) {
      const expected = parts(text);
      for (let cut = 1; cut < text.length; cut++) {
        const state = initialScanState();
        const out: { from: number; to: number; terminated: boolean }[] = [];
        const chunk = text.slice(0, Math.min(text.length, cut + SCAN_OVERLAP));
        const stop = scanChunk(chunk, 0, cut, false, state, out, mysql);
        scanChunk(text.slice(stop), stop, text.length - stop, true, state, out, mysql);
        expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(expected);
      }
    }
  });

  it("los delimitadores de cualquier longitud conservan limites en todos los cortes", () => {
    for (const length of [1, 2, 3, 90]) {
      const delimiter = "_".repeat(length);
      const text = `DELIMITER ${delimiter}\nSELECT 1${delimiter}\nDELIMITER ;\nSELECT 2;`;
      const expected = ["SELECT 1", "SELECT 2;"];
      expect(parts(text)).toEqual(expected);
      for (let cut = 1; cut < text.length; cut++) {
        const state = initialScanState();
        const out: { from: number; to: number; terminated: boolean }[] = [];
        const chunk = text.slice(0, Math.min(text.length, cut + SCAN_OVERLAP));
        const stop = scanChunk(chunk, 0, cut, false, state, out, mysql);
        scanChunk(text.slice(stop), stop, text.length - stop, true, state, out, mysql);
        expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(expected);
      }
    }
  });

  it("Postgres: BEGIN ATOMIC y CREATE RULE conservan el cuerpo", () => {
    const text = "CREATE FUNCTION f() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1; SELECT 2; END; CREATE RULE r AS ON INSERT TO t DO (INSERT INTO t2 VALUES (1); INSERT INTO t2 VALUES (2)); DO $b$ BEGIN PERFORM 1; END $b$;";
    expect(parts(text, postgres)).toEqual([
      "CREATE FUNCTION f() RETURNS int LANGUAGE sql BEGIN ATOMIC SELECT 1; SELECT 2; END;",
      "CREATE RULE r AS ON INSERT TO t DO (INSERT INTO t2 VALUES (1); INSERT INTO t2 VALUES (2));",
      "DO $b$ BEGIN PERFORM 1; END $b$;",
    ]);
  });

  it("Postgres: AS con comillas simples puede contener punto y coma", () => {
    const text = "CREATE FUNCTION f() RETURNS integer AS 'SELECT 1; SELECT 2' LANGUAGE sql\n\nSELECT 3;";
    expect(parts(text, postgres)).toEqual([
      "CREATE FUNCTION f() RETURNS integer AS 'SELECT 1; SELECT 2' LANGUAGE sql",
      "SELECT 3;",
    ]);
  });

  it("Postgres: un valor por defecto entre comillas no termina la cabecera", () => {
    const text = "CREATE FUNCTION f(x text DEFAULT 'a;b') RETURNS int LANGUAGE sql\n\nAS $$ SELECT 1; $$; SELECT 2;";
    expect(parts(text, postgres)).toEqual([
      "CREATE FUNCTION f(x text DEFAULT 'a;b') RETURNS int LANGUAGE sql\n\nAS $$ SELECT 1; $$;",
      "SELECT 2;",
    ]);
  });
});

describe("splitStatements - linea en blanco", () => {
  const texts = (text: string) => splitStatements(text, mysql).map(({ from, to }) => text.slice(from, to));

  it("separa dos consultas sin ;", () => {
    expect(texts("SELECT * FROM users\n\nSELECT * FROM orders")).toEqual(["SELECT * FROM users", "SELECT * FROM orders"]);
  });

  it("con espacios en la linea vacia y con \\r\\n", () => {
    expect(texts("SELECT 1\n   \t\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
    expect(texts("SELECT 1\r\n\r\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("un solo salto de linea no separa", () => {
    expect(texts("SELECT *\nFROM users")).toEqual(["SELECT *\nFROM users"]);
  });

  it("dentro de parentesis no separa", () => {
    const text = "SELECT * FROM (\n  SELECT id FROM users\n\n) u";
    expect(texts(text)).toEqual([text]);
  });

  it("tras una coma o un operador no separa", () => {
    const cte = "WITH a AS (SELECT 1),\n\nb AS (SELECT 2)\nSELECT * FROM a, b";
    expect(texts(cte)).toEqual([cte]);
    expect(texts("SELECT 1 +\n\n2")).toEqual(["SELECT 1 +\n\n2"]);
  });

  it("dentro de comillas o de un comentario de bloque no separa", () => {
    const quoted = "SELECT 'a\n\nb'";
    expect(texts(quoted)).toEqual([quoted]);
    const comment = "SELECT 1 /* nota\n\nlarga */ + 2";
    expect(texts(comment)).toEqual([comment]);
  });

  it("el ; sigue separando como siempre", () => {
    expect(texts("SELECT 1; SELECT 2;\n\nSELECT 3")).toEqual(["SELECT 1;", "SELECT 2;", "SELECT 3"]);
  });

  it("un comentario entre sentencias no forma una sentencia", () => {
    expect(texts("SELECT 1\n\n-- siguiente\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("una linea que no puede empezar una consulta sigue la de arriba", () => {
    // El reporte: consultas largas con lineas en blanco en medio se
    // ejecutaban hasta la primera.
    const same = [
      "SELECT *\n\nFROM users",
      "SELECT a, b\nFROM t\n\nWHERE x = 1;",
      "SELECT *\nFROM facturas f\n\nJOIN clientes c ON c.id = f.cliente_id\nWHERE f.total > 0;",
      "SELECT\n  a,\n  b\n\nFROM t;",
      "SELECT * FROM t WHERE x = 1\n\nORDER BY a DESC\n\nLIMIT 10;",
      "SELECT 1\n\nUNION ALL\n\nSELECT 2;",
      "SELECT * FROM t\nWHERE a = 1\n\n  and b = 2",
      "SELECT * FROM t\n\nleft join u on u.id = t.id",
      "SELECT a\nFROM t\n\nGROUP BY a\n\nHAVING count(*) > 1",
      "SELECT count(*\n\n)",
    ];
    for (const text of same) expect(texts(text)).toEqual([text]);
  });

  it("tras el ) de un WITH viene la consulta", () => {
    const cte = "WITH x AS (\n  SELECT 1\n)\n\nSELECT * FROM x;";
    expect(texts(cte)).toEqual([cte]);
    // Sin WITH, un ")" al final no une nada.
    expect(texts("SELECT (1)\n\nSELECT 2")).toEqual(["SELECT (1)", "SELECT 2"]);
  });

  it("lo que si puede empezar una consulta sigue separando", () => {
    expect(texts("SELECT 1\n\nSELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
    expect(texts("SELECT 1\n\nSET @a = 1")).toEqual(["SELECT 1", "SET @a = 1"]);
    expect(texts("UPDATE t SET a = 1\n\nDELETE FROM t")).toEqual(["UPDATE t SET a = 1", "DELETE FROM t"]);
    // Una palabra que solo empieza como FROM no es FROM.
    expect(texts("SELECT 1\n\nfromage()")).toEqual(["SELECT 1", "fromage()"]);
  });

  it("igual si el texto llega por trozos", () => {
    // El escaner por trozos (sqlStatementIndex) tiene que decidir lo mismo
    // aunque la linea en blanco o la palabra que la sigue queden partidas
    // entre dos trozos. Cada trozo trae SCAN_OVERLAP de margen, como alli.
    const columns = Array.from({ length: 20 }, (_, index) => `columna_${index}`).join(", ");
    const head = `SELECT ${columns} FROM t`;
    const text = `${head}\n\nWHERE a = 1\n\nUNION ALL\n\nSELECT 2\n\nSELECT 3`;
    const expected = [`${head}\n\nWHERE a = 1\n\nUNION ALL\n\nSELECT 2`, "SELECT 3"];
    expect(texts(text)).toEqual(expected);
    for (let cut = 1; cut < text.length; cut++) {
      const state = initialScanState();
      const out: { from: number; to: number; terminated: boolean }[] = [];
      let pos = 0;
      for (let limit = cut; ; limit = text.length) {
        const chunk = text.slice(pos, Math.min(text.length, pos + (limit - pos) + SCAN_OVERLAP));
        const final = pos + chunk.length === text.length;
        const stop = scanChunk(chunk, pos, final ? chunk.length : limit - pos, final, state, out, mysql);
        if (final) break;
        pos += stop;
      }
      expect(out.map(({ from, to }) => text.slice(from, to))).toEqual(expected);
    }
  });

});
