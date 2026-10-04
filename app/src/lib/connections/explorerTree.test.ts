import { describe, expect, it } from "vitest";
import { buildExplorerTree, expandableKeys, type ExplorerNode } from "$lib/connections/explorerTree";
import type { ConnectionEngineContext, DatabaseExplorer, ExplorerTable, SchemaObjects } from "$lib/types";

function table(name: string, overrides: Partial<ExplorerTable> = {}): ExplorerTable {
  return {
    schema: "core",
    name,
    kind: "table",
    columns: [],
    foreignKeys: [],
    keys: [],
    indexes: [],
    triggers: [],
    checks: [],
    ...overrides,
  };
}

function schema(name: string, overrides: Partial<SchemaObjects> = {}): SchemaObjects {
  return { schema: name, tables: [], routines: [], sequences: [], events: [], warnings: [], ...overrides };
}

const CONTEXT: ConnectionEngineContext = {
  generation: 1,
  engineId: "mysql",
  server: { engine: "mysql", version: [8, 4, 0], label: "MySQL 8.4.0" },
  sessionMode: { noBackslashEscapes: false },
  line: "8.4",
  schemaEpoch: 0,
  support: null,
  verification: "unverified",
};

function explorer(...schemas: SchemaObjects[]): DatabaseExplorer {
  return {
    context: CONTEXT,
    tls: { encrypted: true, detail: "TLSv1.3", fellBack: false },
    defaultSchema: schemas[0]?.schema ?? "core",
    availableSchemas: schemas.map((objects) => objects.schema),
    schemas,
  };
}

function child(node: ExplorerNode | undefined, label: string): ExplorerNode | undefined {
  return node?.children?.find((candidate) => candidate.label === label);
}

const core = schema("core", {
  tables: [
    table("orders", {
      columns: [
        { name: "id", dataType: "int", nullable: false, isPrimaryKey: true },
        { name: "customer_id", dataType: "int", nullable: true, isPrimaryKey: false, comment: "Cliente" },
      ],
      keys: [{ name: "PRIMARY", columns: ["id"], primary: true }],
      foreignKeys: [
        { name: "fk_customer", column: "customer_id", referencedTable: "customers", referencedColumn: "id" },
        { name: "fk_customer", column: "region", referencedTable: "customers", referencedColumn: "region" },
      ],
      triggers: [{ name: "audit", timing: "AFTER", events: ["INSERT", "UPDATE"] }],
    }),
    table("customers"),
    table("big_orders", { kind: "view" }),
  ],
  routines: [
    { name: "twice", kind: "function", arguments: "p int", returnType: "int" },
    { name: "twice", kind: "function", arguments: "p bigint", returnType: "bigint" },
    { name: "purge", kind: "procedure", arguments: "" },
  ],
  events: [{ name: "nightly", status: "DISABLED", schedule: "EVERY 1 DAY" }],
});

describe("buildExplorerTree", () => {
  it("agrupa por tipo de objeto con contadores y oculta carpetas vacias", () => {
    const [root] = buildExplorerTree(explorer(core), "");

    expect(root.children?.map((folder) => [folder.label, folder.count])).toEqual([
      ["tables", 2],
      ["views", 1],
      ["routines", 3],
      ["events", 1],
    ]);
  });

  it("abre por defecto el schema por defecto y su carpeta tables", () => {
    const [root, other] = buildExplorerTree(explorer(core, schema("archive", { tables: [table("old")] })), "");

    expect(root.defaultOpen).toBe(true);
    expect(child(root, "tables")?.defaultOpen).toBe(true);
    expect(child(root, "views")?.defaultOpen).toBeFalsy();
    expect(other.defaultOpen).toBe(false);
    expect(child(other, "tables")?.defaultOpen).toBe(false);
  });

  it("arma el interior de una tabla con solo las carpetas que tienen algo", () => {
    const [root] = buildExplorerTree(explorer(core), "");
    const orders = child(child(root, "tables"), "orders");

    expect(orders?.children?.map((folder) => folder.label)).toEqual(["columns", "keys", "foreign keys", "triggers"]);
    expect(child(child(orders, "columns"), "id")).toMatchObject({ icon: "columnPrimaryKey", detail: "int not null" });
    expect(child(child(orders, "columns"), "customer_id")).toMatchObject({ detail: "int", title: "Cliente" });
    expect(child(child(orders, "triggers"), "audit")?.detail).toBe("AFTER INSERT OR UPDATE");
  });

  it("reagrupa las foreign keys de varias columnas en un solo nodo", () => {
    const [root] = buildExplorerTree(explorer(core), "");
    const foreignKeys = child(child(child(root, "tables"), "orders"), "foreign keys");

    expect(foreignKeys?.count).toBe(1);
    expect(foreignKeys?.children?.[0].detail).toBe("(customer_id, region) → customers(id, region)");
  });

  it("distingue rutinas sobrecargadas por su firma", () => {
    const [root] = buildExplorerTree(explorer(core), "");
    const routines = child(root, "routines")?.children ?? [];

    expect(new Set(routines.map((routine) => routine.key)).size).toBe(3);
    expect(routines.find((routine) => routine.icon === "procedure")?.detail).toBe("()");
    expect(routines[0].detail).toBe("(p int): int");
  });

  it("marca los eventos deshabilitados", () => {
    const [root] = buildExplorerTree(explorer(core), "");

    expect(child(child(root, "events"), "nightly")?.detail).toBe("EVERY 1 DAY · disabled");
  });

  it("filtra en todos los tipos de objeto y oculta lo que no coincide", () => {
    const [root, ...rest] = buildExplorerTree(explorer(core, schema("archive", { tables: [table("old")] })), "ORDER");

    expect(rest).toEqual([]);
    expect(root.children?.map((folder) => [folder.label, folder.count])).toEqual([
      ["tables", 1],
      ["views", 1],
    ]);
    expect(root.openOnFilter).toBe(true);
    expect(child(root, "tables")?.openOnFilter).toBe(true);
  });

  it("muestra un schema vacio sin filtro, con sus avisos", () => {
    const [, broken] = buildExplorerTree(
      explorer(core, schema("locked", { warnings: ["No se pudo cargar el schema: denied"] })),
      "",
    );

    expect(broken.children).toEqual([]);
    expect(broken.warnings).toEqual(["No se pudo cargar el schema: denied"]);
  });
});

describe("expandableKeys", () => {
  it("corta el recorrido en la profundidad pedida", () => {
    const tree = buildExplorerTree(explorer(core), "");

    const shallow = expandableKeys(tree, 1);
    expect(shallow).toContain("schema:core");
    expect(shallow).toContain("schema:core/tables");
    expect(shallow).not.toContain("schema:core/tables/orders");
    expect(expandableKeys(tree)).toContain("schema:core/tables/orders/columns");
  });
});

describe("buildExplorerTree: tablas fijadas", () => {
  it("van primero en su carpeta, en el orden en que se fijaron, y quedan marcadas en su lugar", () => {
    const tree = buildExplorerTree(
      explorer(core),
      "",
      [
        { schema: "core", name: "customers" },
        { schema: "core", name: "orders" },
      ],
      "Fijadas",
    );
    expect(tree[0].label).toBe("Fijadas");
    expect(tree[0].icon).toBe("pinned");
    expect(tree[0].children?.map((node) => node.label)).toEqual(["customers", "orders"]);
    expect(tree[0].children?.every((node) => node.pinned)).toBe(true);
    const tables = child(tree[1], "tables");
    expect(child(tables, "orders")?.pinned).toBe(true);
    expect(child(tables, "big_orders")).toBeUndefined();
    expect(child(child(tree[1], "views"), "big_orders")?.pinned).toBe(false);
  });

  it("sin fijadas no hay carpeta, y las que no estan cargadas no aparecen", () => {
    expect(buildExplorerTree(explorer(core), "", [])[0].label).toBe("core");
    expect(buildExplorerTree(explorer(core), "", [{ schema: "otro", name: "x" }])[0].label).toBe("core");
  });

  it("el filtro tambien aplica a las fijadas", () => {
    const tree = buildExplorerTree(explorer(core), "cust", [{ schema: "core", name: "orders" }], "Fijadas");
    expect(tree[0].label).toBe("core");
  });
});
