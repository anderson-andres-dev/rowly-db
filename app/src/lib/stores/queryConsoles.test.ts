import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

// El store real gatea localStorage detras de `browser` (ver
// $app/environment); en el resto de la suite (entorno "node", sin DOM) ese
// stub vale `false` para que los otros modulos tomen su rama sin storage.
// Aqui se necesita lo contrario para poder verificar que executionByConsole
// nunca se serializa, asi que este archivo pisa el mock solo para si mismo.
vi.mock("$app/environment", () => ({ browser: true }));

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

// El store es un singleton a nivel de modulo (creado al importar), asi que
// cada test necesita su propia instancia aislada: resetear el registro de
// modulos y re-importar con un localStorage en memoria nuevo.
async function freshQueryConsoles() {
  vi.resetModules();
  vi.stubGlobal("localStorage", createMemoryStorage());
  return await import("./queryConsoles");
}

describe("queryConsoles: estado de ejecucion por consola", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("requireQueryConfirmation crea el pending de la consola correcta y no toca otras", async () => {
    const mod = await freshQueryConsoles();
    const idA = mod.createQueryConsole("profile-a");
    const idB = mod.createQueryConsole("profile-a");

    mod.requireQueryConfirmation(idA, { sql: "DELETE FROM users", statement: "deleteWithoutWhere" });

    const state = get(mod.queryConsoles);
    expect(mod.executionForConsole(state, idA).pendingConfirmation).toEqual({
      sql: "DELETE FROM users",
      statement: "deleteWithoutWhere",
    });
    expect(mod.executionForConsole(state, idB).pendingConfirmation).toBeNull();
  });

  it("cancelQueryConfirmation elimina el pending sin crear un resultado de error", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.requireQueryConfirmation(id, { sql: "TRUNCATE users", statement: "truncate" });

    mod.cancelQueryConfirmation(id);

    const execution = mod.executionForConsole(get(mod.queryConsoles), id);
    expect(execution.pendingConfirmation).toBeNull();
    expect(execution.result).toBeNull();
  });

  it("takeQueryConfirmation devuelve el pending una sola vez y despues null", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    const pending = { sql: "DROP TABLE users", statement: "dropTable" as const };
    mod.requireQueryConfirmation(id, pending);

    expect(mod.takeQueryConfirmation(id)).toEqual(pending);
    expect(mod.takeQueryConfirmation(id)).toBeNull();
    expect(mod.executionForConsole(get(mod.queryConsoles), id).pendingConfirmation).toBeNull();
  });

  it("editar el SQL de la consola limpia su pending pero conserva el resultado anterior", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.finishQueryExecution(id, "UPDATE users SET active = false", { type: "command", affectedRows: 1, executionTimeMs: 5 });
    mod.requireQueryConfirmation(id, { sql: "UPDATE users SET active = false", statement: "updateWithoutWhere" });

    mod.updateQueryConsoleSql(id, "UPDATE users SET active = false WHERE id = 1");

    const execution = mod.executionForConsole(get(mod.queryConsoles), id);
    expect(execution.pendingConfirmation).toBeNull();
    expect(execution.result).toEqual({ type: "command", affectedRows: 1, executionTimeMs: 5 });
  });

  it("cerrar una consola elimina su entrada de executionByConsole", async () => {
    const mod = await freshQueryConsoles();
    const idA = mod.createQueryConsole("profile-a");
    mod.createQueryConsole("profile-a");
    mod.requireQueryConfirmation(idA, { sql: "DELETE FROM users", statement: "deleteWithoutWhere" });

    mod.closeQueryConsole("profile-a", idA);

    expect(get(mod.queryConsoles).executionByConsole[idA]).toBeUndefined();
  });

  it("cerrar la ultima consola deja la conexion sin pestañas", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.closeQueryConsole("profile-a", id);

    const state = get(mod.queryConsoles);
    expect(state.consoles.filter((item) => item.profileId === "profile-a")).toEqual([]);
    expect(state.activeByProfile["profile-a"]).toBeUndefined();
  });

  it("una consola nueva toma el numero libre mas bajo", async () => {
    const mod = await freshQueryConsoles();
    mod.createQueryConsole("profile-a");
    const second = mod.createQueryConsole("profile-a");
    mod.createQueryConsole("profile-a");
    mod.closeQueryConsole("profile-a", second);
    const reused = mod.createQueryConsole("profile-a");

    const titles = get(mod.queryConsoles).consoles.map((item) => [item.id === reused, item.title]);
    expect(titles).toContainEqual([true, "consola_2"]);
  });

  it("executionByConsole nunca se escribe en localStorage", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.requireQueryConfirmation(id, { sql: "DELETE FROM users", statement: "deleteWithoutWhere" });
    mod.finishQueryExecution(id, "DELETE FROM users", { type: "error", message: "boom" });

    mod.flushConsolePersistence();
    const raw = localStorage.getItem("khipu:query-consoles:v1");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw as string);
    expect(persisted).not.toHaveProperty("executionByConsole");
    expect(Object.keys(persisted).sort()).toEqual(["activeByProfile", "consoles", "nextOrdinal"]);
  });

  it("ejecutar consultas no vuelve a guardar las consolas (solo cambia lo transitorio)", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.flushConsolePersistence();
    const setItem = vi.spyOn(localStorage, "setItem");
    for (let run = 0; run < 20; run++) {
      mod.beginQueryExecution(id);
      mod.finishQueryExecution(id, "SELECT 1", { type: "error", message: "boom" });
    }
    mod.flushConsolePersistence();
    expect(setItem.mock.calls.filter(([key]) => key === "khipu:query-consoles:v1")).toHaveLength(0);
    // Un cambio de verdad si se guarda, una sola vez aunque sean varios seguidos.
    mod.updateQueryConsoleSql(id, "SELECT 2");
    mod.updateQueryConsoleSql(id, "SELECT 3");
    mod.flushConsolePersistence();
    expect(setItem.mock.calls.filter(([key]) => key === "khipu:query-consoles:v1")).toHaveLength(1);
    setItem.mockRestore();
  });

  it("beginQueryExecution no inicia una segunda ejecucion mientras la consola ya esta ocupada", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");

    expect(mod.beginQueryExecution(id)).toBe(true);
    expect(mod.beginQueryExecution(id)).toBe(false);

    mod.finishQueryExecution(id, "TRUNCATE users", { type: "command", affectedRows: 0, executionTimeMs: 1 });
    expect(mod.beginQueryExecution(id)).toBe(true);

    mod.requireQueryConfirmation(id, { sql: "TRUNCATE users", statement: "truncate" });
    expect(mod.beginQueryExecution(id)).toBe(false);
  });

  it("finishQueryExecution reemplaza el resultado y limpia isExecuting/pendingConfirmation", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.beginQueryExecution(id);

    mod.finishQueryExecution(id, "SELECT 1", { type: "command", affectedRows: 2, executionTimeMs: 9 });

    const execution = mod.executionForConsole(get(mod.queryConsoles), id);
    expect(execution.isExecuting).toBe(false);
    expect(execution.pendingConfirmation).toBeNull();
    expect(execution.result).toEqual({ type: "command", affectedRows: 2, executionTimeMs: 9 });
  });
});

describe("queryConsoles: archivos .sql", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("una consola con texto queda sin guardar hasta guardarla como archivo", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    const item = () => get(mod.queryConsoles).consoles.find((candidate) => candidate.id === id)!;
    expect(mod.isQueryConsoleDirty(item())).toBe(false);
    mod.updateQueryConsoleSql(id, "SELECT 1");
    expect(mod.isQueryConsoleDirty(item())).toBe(true);

    mod.markQueryConsoleSaved(id, "/home/u/ventas.sql", "SELECT 1");
    expect(item().title).toBe("ventas.sql");
    expect(mod.isQueryConsoleDirty(item())).toBe(false);

    mod.updateQueryConsoleSql(id, "SELECT 2");
    expect(mod.isQueryConsoleDirty(item())).toBe(true);
  });

  it("abrir el mismo archivo dos veces reusa la pestaña", async () => {
    const mod = await freshQueryConsoles();
    const first = mod.openSqlFileConsole("profile-a", "/home/u/a.sql", "SELECT 1");
    mod.createQueryConsole("profile-a");
    const again = mod.openSqlFileConsole("profile-a", "/home/u/a.sql", "SELECT 1");

    const state = get(mod.queryConsoles);
    expect(again).toBe(first);
    expect(state.activeByProfile["profile-a"]).toBe(first);
    expect(state.consoles.filter((item) => item.filePath === "/home/u/a.sql")).toHaveLength(1);
  });
});

describe("queryConsoles: paginacion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  const resultSet = (rows: number, truncated: boolean) => ({
    type: "resultSet" as const,
    columns: [{ name: "id", type: "INT" }],
    rows: Array.from({ length: rows }, (_, index) => [String(index)]),
    rowCount: rows,
    executionTimeMs: 1,
    truncated,
  });

  it("la ultima pagina deja el total conocido", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    mod.finishQueryExecution(id, "SELECT * FROM t", resultSet(3, false), { offset: 500, pageSize: 500, pageable: true }, true);
    expect(mod.executionForConsole(get(mod.queryConsoles), id).totalRows).toBe(503);
  });

  it("cambiar de pagina conserva el total contado; una ejecucion nueva lo olvida", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("profile-a");
    const page = { offset: 0, pageSize: 500, pageable: true };
    mod.finishQueryExecution(id, "SELECT * FROM t", resultSet(500, true), page);
    mod.setQueryTotalRows(id, "SELECT * FROM t", 8148);

    mod.finishQueryExecution(id, "SELECT * FROM t", resultSet(500, true), { ...page, offset: 500 }, true);
    expect(mod.executionForConsole(get(mod.queryConsoles), id).totalRows).toBe(8148);

    mod.finishQueryExecution(id, "SELECT * FROM t", resultSet(500, true), page);
    expect(mod.executionForConsole(get(mod.queryConsoles), id).totalRows).toBeNull();
  });
});

describe("queryConsoles: reordenar", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("mueve solo las consolas de esa conexion y persiste el orden", async () => {
    const mod = await freshQueryConsoles();
    const a = mod.createQueryConsole("p1");
    const other = mod.createQueryConsole("p2");
    const b = mod.createQueryConsole("p1");
    const c = mod.createQueryConsole("p1");
    mod.reorderQueryConsoles("p1", 2, 0);

    const ids = get(mod.queryConsoles).consoles.map((item) => item.id);
    expect(ids).toEqual([c, other, a, b]);
    mod.flushConsolePersistence();
    const persisted = JSON.parse(localStorage.getItem("khipu:query-consoles:v1") ?? "{}");
    expect(persisted.consoles.map((item: { id: string }) => item.id)).toEqual([c, other, a, b]);
  });
});

describe("queryConsoles: pestañas de tabla", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("abrir la misma tabla reutiliza su pestaña; los filtros se guardan", async () => {
    const mod = await freshQueryConsoles();
    const first = mod.openTableConsole("p1", "core", "api_core_smoke_test");
    mod.createQueryConsole("p1");
    const again = mod.openTableConsole("p1", "core", "api_core_smoke_test");
    expect(again).toBe(first);
    expect(get(mod.queryConsoles).activeByProfile.p1).toBe(first);

    mod.setTableFilters(first, { where: "estado = 'activo'", conditions: [] });
    const item = get(mod.queryConsoles).consoles.find((candidate) => candidate.id === first)!;
    expect(item.title).toBe("api_core_smoke_test");
    expect(item.table).toEqual({ schema: "core", name: "api_core_smoke_test", where: "estado = 'activo'", conditions: [] });
    // Nunca queda "sin guardar": no tiene texto propio.
    expect(mod.isQueryConsoleDirty(item)).toBe(false);

    mod.flushConsolePersistence();
    const persisted = JSON.parse(localStorage.getItem("khipu:query-consoles:v1") ?? "{}");
    expect(persisted.consoles.find((candidate: { id: string }) => candidate.id === first).table.where).toBe(
      "estado = 'activo'",
    );
  });

  it("al recargar la app se restaura la pestaña de tabla con sus filtros", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.openTableConsole("p1", "core", "t");
    mod.setTableFilters(id, { where: "a = 1", conditions: [] });
    mod.flushConsolePersistence();
    const stored = localStorage.getItem("khipu:query-consoles:v1");

    vi.resetModules();
    const storage = new Map([["khipu:query-consoles:v1", stored ?? ""]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    const reloaded = await import("./queryConsoles");
    const item = get(reloaded.queryConsoles).consoles.find((candidate) => candidate.id === id)!;
    // Un WHERE que no salio del constructor no se restaura.
    expect(item.table?.where).toBe("");
  });

  it("una pestaña guardada antes del constructor abre en el constructor, sin el filtro viejo", async () => {
    const legacy = (where: string) =>
      JSON.stringify({
        consoles: [{ id: "t1", profileId: "p1", title: "t", sql: "", filePath: null, savedSql: "", table: { schema: "s", name: "t", where, orderBy: "" } }],
        activeByProfile: { p1: "t1" },
      });
    for (const where of ["id > 1", ""]) {
      vi.resetModules();
      const storage = new Map([["khipu:query-consoles:v1", legacy(where)]]);
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      });
      const reloaded = await import("./queryConsoles");
      const item = get(reloaded.queryConsoles).consoles.find((candidate) => candidate.id === "t1");
      expect(item?.table?.where).toBe("");
    }
  });
});

describe("queryConsoles: eliminar un perfil", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("forgetProfileConsoles quita las consolas y la ejecucion del perfil sin tocar otros", async () => {
    const mod = await freshQueryConsoles();
    const gone = mod.createQueryConsole("profile-a");
    const kept = mod.createQueryConsole("profile-b");
    mod.requireQueryConfirmation(gone, { sql: "TRUNCATE users", statement: "truncate" });
    mod.requireQueryConfirmation(kept, { sql: "TRUNCATE users", statement: "truncate" });

    mod.forgetProfileConsoles("profile-a");

    const state = get(mod.queryConsoles);
    expect(state.consoles.map((item) => item.id)).toEqual([kept]);
    expect(state.activeByProfile).toEqual({ "profile-b": kept });
    expect(Object.keys(state.executionByConsole)).toEqual([kept]);
  });
});

describe("queryConsoles: textos grandes fuera de localStorage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("$lib/backend");
    vi.useRealTimers();
  });

  it("un texto grande va a disco con retraso y en localStorage queda solo la marca", async () => {
    vi.useFakeTimers();
    const invoke = vi.fn(async () => null);
    vi.doMock("$lib/backend", () => ({ invoke }));
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("p1");
    const big = "SELECT 1;\n".repeat(mod.LARGE_TEXT / 5);
    mod.updateQueryConsoleSql(id, big);

    mod.flushConsolePersistence();
    const persisted = JSON.parse(localStorage.getItem("khipu:query-consoles:v1") ?? "{}");
    const item = persisted.consoles.find((candidate: { id: string }) => candidate.id === id);
    expect(item.sql).toBeUndefined();
    expect(item.sqlOnDisk).toBe(true);
    mod.flushConsolePersistence();
    expect(localStorage.getItem("khipu:query-consoles:v1")!.length).toBeLessThan(1000);

    expect(invoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(invoke).toHaveBeenCalledWith("write_console_text", { key: id, contents: big });
  });

  it("al arrancar, la consola espera su texto del disco antes de mostrarse", async () => {
    const big = "SELECT 2;\n".repeat(40_000);
    let release: (text: string) => void = () => {};
    const invoke = vi.fn((command: string) =>
      command === "read_console_text" ? new Promise<string>((resolve) => (release = resolve)) : Promise.resolve(null),
    );
    vi.doMock("$lib/backend", () => ({ invoke }));
    vi.resetModules();
    const storage = new Map([
      [
        "khipu:query-consoles:v1",
        JSON.stringify({
          consoles: [{ id: "c1", profileId: "p1", title: "consola_1", sqlOnDisk: true, savedSame: true, filePath: null, table: null }],
          activeByProfile: { p1: "c1" },
          nextOrdinal: 2,
        }),
      ],
    ]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    const mod = await import("./queryConsoles");
    const pending = get(mod.queryConsoles).consoles[0];
    expect(pending.textPending).toBe(true);
    // Mientras tanto se vuelve a guardar igual: la marca no se pierde.
    mod.renameQueryConsole("c1", "grande");
    mod.flushConsolePersistence();
    expect(JSON.parse(storage.get("khipu:query-consoles:v1")!).consoles[0].sqlOnDisk).toBe(true);

    release(big);
    await vi.waitFor(() => expect(get(mod.queryConsoles).consoles[0].textPending).toBeUndefined());
    const loaded = get(mod.queryConsoles).consoles[0];
    expect(loaded.sql).toBe(big);
    expect(loaded.savedSql).toBe(big);
    expect(invoke).toHaveBeenCalledWith("read_console_text", { key: "c1" });
  });

  it("flushConsoleTexts pide el texto a los editores abiertos", async () => {
    const mod = await freshQueryConsoles();
    const id = mod.createQueryConsole("p1");
    const unregister = mod.registerConsoleTextFlush(() => mod.updateQueryConsoleSql(id, "SELECT 3"));
    expect(mod.currentQueryConsole(id)?.sql).toBe("SELECT 3");
    unregister();
  });
});
