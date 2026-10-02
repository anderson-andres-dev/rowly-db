import { describe, expect, it } from "vitest";
import { ENGINES } from "./engines";
import { blockCommentEnd, commentAt, executablePrefix, opensLineComment } from "./sqlComments";
import { splitStatements } from "./sqlStatements";

// Cada fila de la tabla de docs/specs/v0.3-comentarios.md, por motor. Lo que
// dice cada servidor esta comprobado contra tools/test-dbs.
const mysql = ENGINES.mysql.lexical;
const mariadb = ENGINES.mariadb.lexical;
const postgres = ENGINES.postgres.lexical;

describe("comentarios segun el motor", () => {
  it("-- necesita un espacio detras en MySQL y MariaDB, no en Postgres", () => {
    for (const lexical of [mysql, mariadb]) {
      expect(opensLineComment("--x", 0, lexical)).toBe(false);
      expect(opensLineComment("-- x", 0, lexical)).toBe(true);
      expect(opensLineComment("--\tx", 0, lexical)).toBe(true);
      expect(opensLineComment("--", 0, lexical)).toBe(true);
    }
    expect(opensLineComment("--x", 0, postgres)).toBe(true);
  });

  it("# es un comentario solo en MySQL y MariaDB", () => {
    expect(opensLineComment("# x", 0, mysql)).toBe(true);
    expect(opensLineComment("# x", 0, mariadb)).toBe(true);
    expect(opensLineComment("# x", 0, postgres)).toBe(false);
  });

  it("/* */ anida solo en Postgres", () => {
    const text = "/* a /* b */ ; DROP TABLE x; */";
    expect(blockCommentEnd(text, 0, mysql)).toEqual({ end: text.indexOf("*/") + 2, closed: true });
    expect(blockCommentEnd(text, 0, mariadb).end).toBe(text.indexOf("*/") + 2);
    expect(blockCommentEnd(text, 0, postgres)).toEqual({ end: text.length, closed: true });
    expect(blockCommentEnd("/* a /* b */", 0, postgres)).toEqual({ end: 12, closed: false });
  });

  it("y el divisor corta donde corta el servidor", () => {
    const text = "SELECT 1 /* a /* b */ ; DROP TABLE x; */";
    // MySQL y MariaDB ejecutan el DROP: el comentario acaba en el primer */.
    expect(splitStatements(text, mysql).length).toBe(3);
    expect(splitStatements(text, mariadb).length).toBe(3);
    expect(splitStatements(text, postgres).length).toBe(1);
  });

  it("/*! lo ejecutan MySQL y MariaDB; /*M! solo MariaDB", () => {
    expect(executablePrefix("/*!50001 X */", 0, mysql)).toBe("/*!");
    expect(executablePrefix("/*!50001 X */", 0, mariadb)).toBe("/*!");
    expect(executablePrefix("/*M!100100 X */", 0, mariadb)).toBe("/*M!");
    expect(executablePrefix("/*M!100100 X */", 0, mysql)).toBeNull();
    expect(executablePrefix("/*!50001 X */", 0, postgres)).toBeNull();
    expect(commentAt("/*M!1 X */", 0, mariadb)?.kind).toBe("executable");
    expect(commentAt("/*M!1 X */", 0, mysql)?.kind).toBe("block");
  });

  it("una sentencia dentro de /*M! cuenta en MariaDB y es un comentario en MySQL", () => {
    const text = "/*M!100100 SELECT 1 */;\nSELECT 2;";
    expect(splitStatements(text, mariadb).map(({ from }) => from)).toEqual([0, 24]);
    expect(splitStatements(text, mysql).map(({ from }) => from)).toEqual([24]);
    // Como /*! en los dos.
    expect(splitStatements("/*!50001 SELECT 1 */;\nSELECT 2;", mysql).map(({ from }) => from)).toEqual([0, 22]);
  });

  it("un comentario sin cerrar llega al final del texto", () => {
    expect(commentAt("/* abierto", 0, mysql)).toEqual({ kind: "block", end: 10, closed: false });
    expect(commentAt("-- sin salto", 0, mysql)).toEqual({ kind: "line", end: 12, closed: false });
    expect(commentAt("-- con salto\nx", 0, mysql)).toEqual({ kind: "line", end: 12, closed: true });
  });
});
