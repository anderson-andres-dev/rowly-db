import { describe, expect, it } from "vitest";
import { ENGINES } from "./engines";
import { buildRoutineIndex, callHints, findCalls } from "./sqlCallHints";
import type { ExplorerRoutine, RoutineParameter, SchemaObjects } from "./types";

const param = (name: string | null, mode: RoutineParameter["mode"] = "in", hasDefault = false): RoutineParameter => ({
  name,
  mode,
  dataType: "int",
  hasDefault,
});

const routine = (name: string, kind: ExplorerRoutine["kind"], parameters: RoutineParameter[]): ExplorerRoutine => ({
  name,
  kind,
  arguments: "",
  parameters,
});

function schema(name: string, routines: ExplorerRoutine[]): SchemaObjects {
  return { schema: name, tables: [], views: [], materializedViews: [], routines, sequences: [], events: [] } as unknown as SchemaObjects;
}

const catalog = [
  schema("core", [
    routine("addNapNume", "procedure", [param("abonado"), param("napNume")]),
    routine("purge", "procedure", [param("p_before"), param("p_count", "out")]),
    routine("calc", "function", [param("p_id"), param("p_total", "inOut"), param("p_note", "in", true)]),
    routine("tags", "function", [param("p_first"), param("p_rest", "variadic")]),
    routine("over", "function", [param("a")]),
    routine("over", "function", [param("x"), param("y")]),
    routine("anon", "function", [param(null), param("b")]),
  ]),
  schema("otro", [routine("fuera", "function", [param("q")])]),
];

function hints(sql: string, driver: "mysql" | "postgres" = "postgres") {
  const index = buildRoutineIndex(catalog, "core");
  // El hint y el argumento que lo sigue (hasta la coma o el parentesis).
  return callHints(sql, ENGINES[driver], index).map((hint) => `${hint.label}@${/^[^,)]*[,)]?/.exec(sql.slice(hint.at))![0]}`);
}

describe("findCalls", () => {
  it("argumentos por comas al mismo nivel; comillas y parentesis no cortan", () => {
    const sql = "SELECT core.f(1, 'a,b', g(2, 3), x)";
    const [call] = findCalls(sql, ENGINES.postgres).filter((item) => item.name.text === "f");
    expect(call.schema?.text).toBe("core");
    expect(call.args.map((arg) => sql.slice(arg.from, arg.from + 3))).toEqual(["1, ", "'a,", "g(2", "x)"]);
    expect(call.args[3].bare?.text).toBe("x");
  });

  it("CALL, sin cerrar mientras se escribe, y la definicion no es una llamada", () => {
    expect(findCalls("CALL p(1, 2", ENGINES.mysql)[0]).toMatchObject({ viaCall: true, args: [{}, {}] });
    expect(findCalls("CREATE FUNCTION f(a int) RETURNS int", ENGINES.postgres)).toEqual([]);
  });
});

describe("callHints", () => {
  it("la llamada de la captura: un hint por argumento", () => {
    expect(hints("call core.addNapNume(ds, d)", "mysql")).toEqual(["abonado@ds,", "napNume@d)"]);
    expect(hints("CALL addNapNume(ds, d)", "mysql")).toEqual(["abonado@ds,", "napNume@d)"]);
  });

  it("MySQL: en un CALL tambien los OUT; Postgres igual en un procedimiento", () => {
    expect(hints("CALL purge(10, @total)", "mysql")).toEqual(["p_before@10,", "p_count@@total)"]);
    expect(hints("CALL purge(10, NULL)")).toEqual(["p_before@10,", "p_count@NULL)"]);
  });

  it("una funcion en una expresion; un argumento con el nombre del parametro no lleva hint", () => {
    expect(hints("SELECT calc(1, p_total)")).toEqual(["p_id@1,"]);
    expect(hints("SELECT calc(1, 2, 'x')")).toEqual(["p_id@1,", "p_total@2,", "p_note@'x')"]);
  });

  it("notacion nombrada, VARIADIC y parametros sin nombre", () => {
    expect(hints("SELECT calc(p_id => 1, 2)")).toEqual(["p_total@2)"]);
    expect(hints("SELECT tags(1, 2, 3)")).toEqual(["p_first@1,", "p_rest@2,"]);
    expect(hints("SELECT anon(1, 2)")).toEqual(["b@2)"]);
  });

  it("sobrecargas: la que acepta esa cantidad; si varias no dicen lo mismo, nada", () => {
    expect(hints("SELECT over(1, 2)")).toEqual(["x@1,", "y@2)"]);
    // Con un argumento encajan las dos (y todavia se puede estar escribiendo).
    expect(hints("SELECT over(1)")).toEqual([]);
  });

  it("solo rutinas del catalogo: de otro schema sin calificar, o de otro tipo, no", () => {
    expect(hints("SELECT fuera(1)")).toEqual([]);
    expect(hints("SELECT otro.fuera(1)")).toEqual(["q@1)"]);
    // Un procedimiento no se llama como funcion.
    expect(hints("SELECT addNapNume(1, 2)", "mysql")).toEqual([]);
    expect(hints("SELECT count(1)")).toEqual([]);
  });

  it("Postgres resuelve el nombre como el motor: sin comillas en minusculas", () => {
    // addNapNume se creo con mayusculas (entre comillas): sin comillas no es ella.
    expect(hints("CALL addNapNume(1, 2)")).toEqual([]);
    expect(hints('CALL "addNapNume"(1, 2)')).toEqual(["abonado@1,", "napNume@2)"]);
  });
});
