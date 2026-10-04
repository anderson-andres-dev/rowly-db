import { describe, expect, it } from "vitest";
import mysqlFixture from "../../../tests/sql/mysql/common/mixed.json";
import mariadbFixture from "../../../tests/sql/mariadb/common/mixed.json";
import postgresFixture from "../../../tests/sql/postgres/common/mixed.json";
import errorFixture from "../../../tests/sql/common/mixed-errors.json";
import { ENGINES } from "./engines";
import { SCAN_OVERLAP, initialScanState, scanChunk, splitStatements, statementAt } from "./sqlStatements";

describe("corpus compartido de consolas mezcladas", () => {
  for (const [name, fixture, lexical] of [
    ["MySQL", mysqlFixture, ENGINES.mysql.lexical],
    ["MariaDB", mysqlFixture, ENGINES.mariadb.lexical],
    ["MariaDB propio", mariadbFixture, ENGINES.mariadb.lexical],
    ["Postgres", postgresFixture, ENGINES.postgres.lexical],
  ] as const) {
    it(`${name}: divide exactamente cada sentencia y excluye directivas`, () => {
      const ranges = splitStatements(fixture.sql, lexical);
      const actual = ranges.map(({ from, to }) => fixture.sql.slice(from, to));
      expect(actual).toEqual(fixture.statements);
      expect(ranges.length).toBe(fixture.statements.length);
      for (const range of ranges) {
        const middle = Math.floor((range.from + range.to) / 2);
        expect(statementAt(fixture.sql, middle, lexical)).toEqual(range);
      }
    });

    it(`${name}: conserva los limites al escanear por trozos`, () => {
      const text = fixture.sql;
      const expected = splitStatements(text, lexical);
      const cuts = [1, 5, text.indexOf("DELIMITER") + 3, text.indexOf("CREATE FUNCTION") + 8, Math.floor(text.length / 2)]
        .filter((cut) => cut > 0 && cut < text.length);
      for (const cut of cuts) {
        const state = initialScanState();
        const out: { from: number; to: number; terminated: boolean }[] = [];
        let pos = 0;
        for (let limit = cut; ; limit = text.length) {
          const chunk = text.slice(pos, Math.min(text.length, limit + SCAN_OVERLAP));
          const final = pos + chunk.length === text.length;
          const stop = scanChunk(chunk, pos, final ? chunk.length : limit - pos, final, state, out, lexical);
          if (final) break;
          pos += stop;
        }
        expect(out.map(({ from, to }) => ({ from, to }))).toEqual(expected);
      }
    });
  }

  it("los errores ordinarios siguen siendo sentencias completas", () => {
    for (const { sql, dialects } of errorFixture) {
      const profiles = dialects
        ? [ENGINES.mysql.lexical, ENGINES.mariadb.lexical]
        : [ENGINES.mysql.lexical, ENGINES.mariadb.lexical, ENGINES.postgres.lexical];
      for (const lexical of profiles) {
        const ranges = splitStatements(sql, lexical);
        if (sql.includes(";\nCREATE PROCEDURE")) {
          expect(ranges).toHaveLength(2);
          expect(sql.slice(ranges[1].from, ranges[1].to)).toContain("WHER");
        } else {
          expect(ranges).toEqual([{ from: 0, to: sql.length }]);
        }
      }
    }
  });
});
