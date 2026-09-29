import { describe, expect, it } from "vitest";
import { findParameters } from "./sqlParameters";
import { parameterColumns, typeOfColumn } from "./sqlParameterTypes";
import type { SqlLexical } from "./sqlStatements";
import type { CatalogTable } from "./types";

const MYSQL: SqlLexical = {
  identifierQuotes: ["`"],
  backslashEscapes: true,
  hashComments: true,
  dollarQuotes: false,
  escapeStringPrefix: false,
};

const column = (name: string, dataType: string) => ({ name, dataType, nullable: true, isPrimaryKey: false });

const CATALOG: CatalogTable[] = [
  {
    schema: "core",
    name: "tec_abonados",
    columns: [
      column("abon_codi", "int"),
      column("abon_esta", "int"),
      column("abon_sect", "int"),
      column("abon_fcre", "datetime"),
      column("abon_dire", "varchar(200)"),
      column("abon_desc", "decimal(10,4)"),
    ],
    foreignKeys: [],
  },
  { schema: "core", name: "com_clientes", columns: [column("clie_codi", "int"), column("clie_fnac", "date")], foreignKeys: [] },
];

function types(sql: string) {
  const found = parameterColumns(sql, findParameters(sql, MYSQL), MYSQL, CATALOG);
  return Object.fromEntries([...found].map(([name, info]) => [name, info.type]));
}

describe("parameterColumns", () => {
  it("toma el tipo de la columna con que se compara cada parametro", () => {
    const sql = `SELECT * FROM tec_abonados
      WHERE abon_esta = :estado
        AND (:sector IS NULL OR abon_sect = :sector)
        AND abon_fcre BETWEEN :desde AND :hasta
        AND (:direccion IS NULL OR abon_dire LIKE :direccion)`;
    expect(types(sql)).toEqual({ estado: "integer", sector: "integer", desde: "datetime", hasta: "datetime", direccion: "text" });
  });

  it("resuelve alias, columna a la derecha e IN", () => {
    const sql = `SELECT * FROM tec_abonados ta JOIN com_clientes c ON c.clie_codi = ta.abon_codi
      WHERE :nacido < c.clie_fnac AND ta.abon_desc IN (1, :descuento)`;
    expect(types(sql)).toEqual({ nacido: "date", descuento: "decimal" });
  });

  it("sin columna al lado, o desconocida, no hay tipo", () => {
    expect(types("SELECT :libre, x FROM t WHERE nada = :otro")).toEqual({});
  });
});

describe("typeOfColumn", () => {
  it("reconoce los tipos de MySQL y Postgres", () => {
    expect(typeOfColumn("timestamp without time zone")).toBe("datetime");
    expect(typeOfColumn("character varying(20)")).toBe("text");
    expect(typeOfColumn("bigint")).toBe("integer");
    expect(typeOfColumn("numeric(12,2)")).toBe("decimal");
    expect(typeOfColumn("boolean")).toBe("boolean");
    expect(typeOfColumn("interval")).toBeNull();
    expect(typeOfColumn("point")).toBeNull();
  });
});
