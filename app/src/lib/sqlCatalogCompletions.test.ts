import { describe, expect, it } from "vitest";
import { CompletionContext, nextSnippetField, type Completion } from "@codemirror/autocomplete";
import { EditorState, Transaction, type TransactionSpec } from "@codemirror/state";
import { ENGINES } from "./engines";
import { buildCatalogCompletions, catalogPosition } from "./sqlCatalogCompletions";
import { buildCompletionSource, buildSqlSchema, dialectFor, extractDefaultTable } from "./sqlSchema";
import type { CatalogTable, SchemaObjects } from "./types";

const schemas: SchemaObjects[] = [
  {
    schema: "core",
    tables: [
      { schema: "core", name: "com_anular_facturas_nc", kind: "table", columns: [{ name: "id", dataType: "int", nullable: false, isPrimaryKey: true }], foreignKeys: [], keys: [], indexes: [], triggers: [], checks: [] },
      { schema: "core", name: "com_anular_vista", kind: "view", columns: [{ name: "factura", dataType: "varchar(4)", nullable: false, isPrimaryKey: false }], foreignKeys: [], keys: [], indexes: [], triggers: [], checks: [] },
      { schema: "core", name: "com_anular_resumen", kind: "materializedView", columns: [{ name: "total", dataType: "numeric", nullable: false, isPrimaryKey: false }], foreignKeys: [], keys: [], indexes: [], triggers: [], checks: [] },
      { schema: "core", name: "my-table", kind: "table", columns: [], foreignKeys: [], keys: [], indexes: [], triggers: [], checks: [] },
      { schema: "core", name: "My View", kind: "view", columns: [], foreignKeys: [], keys: [], indexes: [], triggers: [], checks: [] },
    ],
    routines: [
      { name: "com_anularFactura", kind: "procedure", arguments: "codiFactNume varchar(4)", parameters: [{ name: "codiFactNume", mode: "in", dataType: "varchar(4)", hasDefault: false }] },
      { name: "com_anularTotal", kind: "function", arguments: "codiFactNume varchar(4)", returnType: "numeric", parameters: [{ name: "codiFactNume", mode: "in", dataType: "varchar(4)", hasDefault: false }] },
      { name: "select", kind: "procedure", arguments: "" },
      { name: "total_hoy", kind: "function", arguments: "", returnType: "numeric" },
      { name: "my-proc", kind: "procedure", arguments: "" },
      { name: "My Function", kind: "function", arguments: "", returnType: "int" },
      { name: "cobrar_recibo", kind: "procedure", arguments: "recibo int, valor decimal(8,2)", parameters: [{ name: "recibo", mode: "in", dataType: "int", hasDefault: false }, { name: "valor", mode: "in", dataType: "decimal(8,2)", hasDefault: false }] },
      { name: "sin_lista", kind: "procedure", arguments: "x int" },
    ],
    sequences: [{ name: "facturas_seq", dataType: "bigint" }], events: [], warnings: [],
  },
  { schema: "other", tables: [], routines: [{ name: "com_anularOtro", kind: "procedure", arguments: "" }], sequences: [], events: [], warnings: [] },
];

async function complete(input: string, driver: "mysql" | "mariadb" | "postgres", explicit = true) {
  const pos = input.indexOf("|");
  const doc = input.replace("|", "");
  const engine = ENGINES[driver];
  const dialect = dialectFor(engine);
  const state = EditorState.create({ doc, selection: { anchor: pos }, extensions: [dialect.language] });
  const context = new CompletionContext(state, pos, explicit);
  const tables: CatalogTable[] = schemas.flatMap((objects) => objects.tables.map((relation) => ({
    schema: objects.schema, name: relation.name,
    columns: relation.columns.map((column) => ({ ...column, comment: column.comment ?? undefined })),
    foreignKeys: relation.foreignKeys,
  })));
  const { schema, defaultSchema, fkIndex, tableIndex } = buildSqlSchema(tables, { defaultSchema: "core", engine, explorerSchemas: schemas, availableSchemas: ["core", "other", "unloaded"] });
  return buildCompletionSource({ dialect, engine, schema, defaultSchema, fkIndex, tableIndex, defaultTable: extractDefaultTable(doc, pos), catalogCompletions: buildCatalogCompletions(schemas, engine, defaultSchema) })(context);
}

// Lo justo de una EditorView para aplicar una opcion: el documento y dispatch.
function fakeView(doc: string, dispatch: (value: never) => void) {
  return { state: EditorState.create({ doc }), dispatch } as never;
}

// Una que aplica lo que recibe (una transaccion o su especificacion).
function liveView(doc: string) {
  const view = {
    state: EditorState.create({ doc }),
    // Todo lo que inserta el autocompletado cuenta como escritura: mientras
    // tanto no se muestra lo que aun no esta terminado (sqlDiagnostics.ts).
    dispatch(value: Transaction | TransactionSpec) {
      const transaction = value instanceof Transaction ? value : view.state.update(value);
      if (transaction.docChanged) expect(transaction.isUserEvent("input.complete")).toBe(true);
      view.state = transaction.state;
    },
  };
  return view;
}

function options(result: Awaited<ReturnType<typeof complete>>): readonly Completion[] {
  return result?.options ?? [];
}

for (const driver of ["mysql", "mariadb", "postgres"] as const) {
  describe(`catalogo SQL: ${driver}`, () => {
    it("DDL: ofrece las palabras clave IF/EXISTS y no mezcla rutinas ni funciones integradas", async () => {
      const keywords = (result: Awaited<ReturnType<typeof complete>>) => options(result).filter((o) => o.type === "keyword").map((o) => o.label.toUpperCase());
      for (const input of ["CREATE TABLE I|", "DROP TABLE I|", "DROP FUNCTION I|", "DROP PROCEDURE I|"]) {
        expect(keywords(await complete(input, driver)), input).toContain("IF");
      }
      const dropFunction = options(await complete("DROP FUNCTION I|", driver));
      expect(dropFunction.filter((o) => o.type === "function" && o.label.toUpperCase() === "IF"), "IF() integrada").toEqual([]);
      for (const input of ["DROP TABLE IF EXISTS |", "DROP TABLE IF EXISTS com_|", "DROP VIEW IF EXISTS |"]) {
        const found = options(await complete(input, driver));
        expect(found.map((o) => o.type), input).not.toContain("procedure");
        expect(found.map((o) => o.type), input).not.toContain("function");
        expect(found.some((o) => ["table", "view", "materializedView"].includes(o.type ?? "")), input).toBe(true);
      }
    });

    it("reemplaza el nombre completo con guiones, espacios y mayusculas", async () => {
      const quote = driver === "postgres" ? '"' : "`";
      for (const [input, label, expected] of [
        ["CALL my-|", "my-proc", `CALL ${quote}my-proc${quote}()`],
        ["CALL core.my-|", "my-proc", `CALL core.${quote}my-proc${quote}()`],
        ["DROP PROCEDURE my-|", "my-proc", `DROP PROCEDURE ${quote}my-proc${quote}`],
        ["SELECT * FROM my-|", "my-table", `SELECT * FROM ${quote}my-table${quote}`],
        ["SELECT * FROM core.my-|", "my-table", `SELECT * FROM core.${quote}my-table${quote}`],
        ["SELECT * FROM My V|", "My View", `SELECT * FROM ${quote}My View${quote}`],
        ["SELECT * FROM core.My V|", "My View", `SELECT * FROM core.${quote}My View${quote}`],
        ["SELECT My F|", "My Function", `SELECT ${quote}My Function${quote}()`],
        ["SELECT core.My F|", "My Function", `SELECT core.${quote}My Function${quote}()`],
      ]) {
        const result = await complete(input, driver);
        const option = options(result).find((item) => item.label === label);
        expect(option, input).toBeDefined();
        let change: { changes: { from: number; to: number; insert: string } } | undefined;
        if (typeof option?.apply === "function") option.apply(fakeView(input.replace("|", ""), (value: typeof change) => { change = value; }), option, result!.from, input.indexOf("|"));
        const original = input.replace("|", "");
        expect(original.slice(0, change!.changes.from) + change!.changes.insert + original.slice(change!.changes.to), input).toBe(expected);
      }
    });

    it("conserva el contexto despues de comentarios y saltos", () => {
      const engine = ENGINES[driver];
      for (const sql of ["CALL /*hi*/ pro", "CALL --hi\n pro", "CALL #hi\n pro"]) {
        if (sql.includes("#") && driver === "postgres") continue;
        expect(catalogPosition(sql, sql.length - 3, engine, "unknown").position, sql).toBe("call");
      }
      for (const [sql, position] of [["SELECT * FROM /*hi*/ my", "relation"], ["SELECT * FROM t JOIN --hi\n my", "relation"], ["DROP PROCEDURE /*hi*/ pro", "procedure"], ["GRANT EXECUTE ON /*hi*/ pro", "routine"]] as const) {
        expect(catalogPosition(sql, sql.length - (sql.endsWith("pro") ? 3 : 2), engine, "unknown").position, sql).toBe(position);
      }
    });
    it("CALL solo ofrece procedures del schema indicado y muestra la firma", async () => {
      const unqualified = options(await complete("CALL com_anular|", driver));
      expect(unqualified.some((o) => o.label === "com_anularFactura" && o.type === "procedure")).toBe(true);
      expect(unqualified.every((o) => o.type === "procedure" || o.type === "schema")).toBe(true);
      expect(unqualified.some((o) => o.label === "other.com_anularOtro" && o.type === "procedure")).toBe(true);
      const result = await complete("CALL core.com_anular|", driver);
      const found = options(result);
      expect(found.some((o) => o.label === "com_anularFactura" && o.type === "procedure" && o.detail?.includes("varchar(4)"))).toBe(true);
      expect(found.some((o) => o.label === "com_anular_facturas_nc" || o.label === "com_anularTotal" || o.label === "com_anularOtro")).toBe(false);
      expect(found.every((o) => o.type === "procedure")).toBe(true);
    });

    it("CALL deja los parentesis listos, con los argumentos como campos", async () => {
      // El documento tras aplicar la opcion, con la seleccion entre [ ].
      const apply = async (input: string, label: string, tabs = 0) => {
        const result = await complete(input, driver);
        const option = options(result).find((item) => item.label === label);
        expect(option, `${input} ${label}`).toBeDefined();
        const view = liveView(input.replace("|", ""));
        if (typeof option?.apply === "function") option.apply(view as never, option, result!.from, input.indexOf("|"));
        for (let i = 0; i < tabs; i++) expect(nextSnippetField(view as never), `Tab ${i + 1}`).toBe(true);
        const { from, to } = view.state.selection.main;
        const text = view.state.doc.toString();
        return from === to ? text.slice(0, from) + "|" + text.slice(from) : `${text.slice(0, from)}[${text.slice(from, to)}]${text.slice(to)}`;
      };
      const quoted = (name: string) => (driver === "postgres" ? `"${name}"` : name);
      expect(await apply("CALL com_anular|", "com_anularFactura")).toBe(`CALL ${quoted("com_anularFactura")}([codiFactNume])`);
      expect(await apply("CALL cobrar|", "cobrar_recibo")).toBe("CALL cobrar_recibo([recibo], valor)");
      expect(await apply("CALL cobrar|", "cobrar_recibo", 1)).toBe("CALL cobrar_recibo(recibo, [valor])");
      expect(await apply("CALL cobrar|", "cobrar_recibo", 2)).toBe("CALL cobrar_recibo(recibo, valor)|");
      expect(await apply("CALL other.com_anular|", "com_anularOtro")).toBe(`CALL other.${quoted("com_anularOtro")}()|`);
      expect(await apply("CALL com_anular|(1)", "com_anularFactura")).toBe(`CALL ${quoted("com_anularFactura")}|(1)`);
      // Sin la lista de parametros del catalogo, solo el cursor dentro.
      expect(await apply("CALL sin_lista|", "sin_lista")).toBe("CALL sin_lista(|)");
      expect(await apply("DROP PROCEDURE com_anular|", "com_anularFactura")).toBe(`DROP PROCEDURE ${quoted("com_anularFactura")}|`);
      expect(await apply("DROP FUNCTION com_anular|", "com_anularTotal")).toBe(`DROP FUNCTION ${quoted("com_anularTotal")}|`);
      expect(await apply("GRANT EXECUTE ON com_anular|", "com_anularFactura")).toBe(`GRANT EXECUTE ON ${quoted("com_anularFactura")}|`);
      // En una expresion, los nombres serian columnas: solo los parentesis.
      expect(await apply("SELECT com_anular|", "com_anularTotal")).toBe(`SELECT ${quoted("com_anularTotal")}(|)`);
    });

    it("donde va una rutina tambien ofrece el schema para calificarla", async () => {
      for (const input of ["CALL cor|", "CALL oth|", "DROP PROCEDURE cor|", "DROP FUNCTION oth|"]) {
        const wanted = input.endsWith("cor|") ? "core" : "other";
        const found = options(await complete(input, driver)).filter((o) => o.label === wanted && o.type === "schema");
        expect(found, input).toHaveLength(1);
      }
      expect(options(await complete("CALL core.com|", driver)).some((o) => o.type === "schema")).toBe(false);
      const option = options(await complete("CALL cor|", driver)).find((o) => o.label === "core" && o.type === "schema");
      let change: { changes: { from: number; to: number; insert: string } } | undefined;
      if (typeof option?.apply === "function") option.apply(fakeView("CALL cor", (value: typeof change) => { change = value; }), option, 5, 8);
      expect(change?.changes.insert).toBe("core.");
      // Al teclear el punto (no explicito).
      const afterDot = options(await complete("CALL core.|", driver, false));
      expect(afterDot.some((o) => o.label === "com_anularFactura" && o.type === "procedure"), "CALL core.").toBe(true);
      expect(afterDot.some((o) => o.label === "com_anularOtro" || o.type === "table"), "CALL core.").toBe(false);
    });

    it("FROM, JOIN, INTO, UPDATE y TABLE ofrecen relaciones y vistas", async () => {
      for (const sql of ["SELECT * FROM com_anular|", "SELECT * FROM x JOIN com_anular|", "INSERT INTO com_anular|", "UPDATE com_anular|", "TABLE com_anular|"]) {
        const found = options(await complete(sql, driver));
        expect(found.some((o) => o.label === "com_anular_facturas_nc" && o.type === "table"), sql).toBe(true);
        expect(found.some((o) => o.label === "com_anular_vista" && o.type === "view"), sql).toBe(true);
        expect(found.some((o) => o.type === "procedure"), sql).toBe(false);
      }
    });

    it("expresiones, SET, VALUES y argumentos ofrecen funciones sin tablas", async () => {
      for (const sql of ["SELECT com_anular| FROM com_anular_vista", "SELECT * FROM com_anular_vista WHERE com_anular|", "SELECT * FROM com_anular_vista v ON com_anular|", "UPDATE com_anular_facturas_nc SET id = com_anular|", "INSERT INTO com_anular_facturas_nc VALUES (com_anular|", "SELECT COALESCE(com_anular|"]) {
        const found = options(await complete(sql, driver));
        expect(found.some((o) => o.label === "com_anularTotal" && o.type === "function"), sql).toBe(true);
        expect(found.some((o) => o.label === "com_anular_facturas_nc"), sql).toBe(false);
      }
    });

    it("DROP, ALTER, CREATE OR REPLACE y GRANT EXECUTE ofrecen rutinas", async () => {
      for (const sql of ["DROP PROCEDURE com_anular|", "ALTER PROCEDURE com_anular|", "CREATE OR REPLACE PROCEDURE com_anular|"]) {
        const found = options(await complete(sql, driver));
        expect(found.some((o) => o.label === "com_anularFactura" && o.type === "procedure"), sql).toBe(true);
        expect(found.some((o) => o.label === "com_anularTotal"), sql).toBe(false);
      }
      for (const sql of ["DROP FUNCTION com_anular|", "ALTER FUNCTION com_anular|", "CREATE OR REPLACE FUNCTION com_anular|"]) {
        expect(options(await complete(sql, driver)).some((o) => o.label === "com_anularTotal" && o.type === "function"), sql).toBe(true);
      }
      expect(options(await complete("GRANT EXECUTE ON com_anular|", driver)).map((o) => o.label)).toContain("com_anularFactura");
    });

    it("schema. resuelve objetos propios y alias. resuelve columnas de vistas", async () => {
      expect(options(await complete("SELECT * FROM cor|", driver)).some((o) => o.label === "core" && o.type === "schema")).toBe(true);
      expect(options(await complete("USE cor|", driver)).some((o) => o.label === "core" && o.type === "schema")).toBe(true);
      expect(options(await complete("USE oth|", driver)).some((o) => o.label === "other" && o.type === "schema")).toBe(true);
      expect(options(await complete("USE unlo|", driver)).some((o) => o.label === "unloaded" && o.type === "schema")).toBe(true);
      const qualified = options(await complete("SELECT * FROM core.com_anular|", driver));
      expect(qualified.some((o) => o.label === "com_anular_vista" && o.type === "view")).toBe(true);
      expect(qualified.some((o) => o.label === "com_anularOtro")).toBe(false);
      const columns = options(await complete("SELECT v.fact| FROM core.com_anular_vista v", driver));
      expect(columns.some((o) => o.label === "factura" && o.detail === "varchar(4)"), driver).toBe(true);
      const collision = options(await complete("SELECT core.fact| FROM core.com_anular_vista core", driver));
      expect(collision.some((o) => o.label === "factura"), driver).toBe(true);
    });

    it("incluye funciones integradas del motor y respeta la insercion", async () => {
      const builtin = driver === "postgres" ? "GENERATE_SERIES" : "DATE_FORMAT";
      const found = options(await complete(`SELECT ${builtin.slice(0, 4)}|`, driver));
      expect(found.some((o) => o.label === builtin && o.type === "function")).toBe(true);
      expect(found.some((o) => o.label === (driver === "postgres" ? "DATE_FORMAT" : "GENERATE_SERIES"))).toBe(false);
      const functionOption = options(await complete("SELECT com_anular|", driver)).find((o) => o.label === "com_anularTotal");
      let transaction: { changes: { insert: string }; selection: { anchor: number } } | undefined;
      if (typeof functionOption?.apply === "function") functionOption.apply(fakeView("", (value: typeof transaction) => { transaction = value; }), functionOption, 0, 0);
      const written = driver === "postgres" ? '"com_anularTotal"' : "com_anularTotal";
      expect(transaction?.changes.insert).toBe(`${written}()`);
      expect(transaction?.selection.anchor).toBe(`${written}(`.length);
      const noArgs = options(await complete("SELECT total_hoy|", driver)).find((o) => o.label === "total_hoy");
      if (typeof noArgs?.apply === "function") noArgs.apply(fakeView("", (value: typeof transaction) => { transaction = value; }), noArgs, 0, 0);
      expect(transaction?.changes.insert).toBe("total_hoy()");
      expect(transaction?.selection.anchor).toBe("total_hoy()".length);
      const reserved = options(await complete("CALL sel|", driver)).find((o) => o.label === "select");
      if (typeof reserved?.apply === "function") reserved.apply(fakeView("", (value: typeof transaction) => { transaction = value; }), reserved, 0, 0);
      expect(transaction?.changes.insert).toBe(driver === "postgres" ? '"select"()' : "`select`()");
    });
  });
}

it("Postgres ofrece secuencias y vistas materializadas que llegan del explorador", async () => {
  const found = options(await complete("core.|", "postgres"));
  expect(found.some((o) => o.label === "facturas_seq" && o.type === "sequence")).toBe(true);
  expect(found.some((o) => o.label === "com_anular_resumen" && o.type === "materializedView")).toBe(true);
});

it("reutiliza las opciones preparadas entre pulsaciones", () => {
  const catalog = buildCatalogCompletions(schemas, ENGINES.mysql, "core");
  const first = catalog.complete("call", 5)?.options[0];
  expect(catalog.complete("call", 6)?.options[0]).toBe(first);
});
