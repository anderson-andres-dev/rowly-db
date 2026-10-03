import { describe, expect, it } from "vitest";
import { explainConnectionFailure, toConnectionFailure } from "$lib/connections/connectionErrors";

const target = { host: "db.local", port: 5432, database: "ventas" };

describe("toConnectionFailure", () => {
  it("toma el objeto que devuelve src-tauri", () => {
    expect(toConnectionFailure({ kind: "refused", detail: "Connection refused" })).toEqual({
      kind: "refused",
      detail: "Connection refused",
    });
  });

  it("un texto suelto o una causa desconocida quedan como other", () => {
    expect(toConnectionFailure("boom")).toEqual({ kind: "other", detail: "boom" });
    expect(toConnectionFailure({ kind: "nuevo", detail: "x" })).toEqual({ kind: "other", detail: "x" });
  });
});

describe("explainConnectionFailure", () => {
  it("explica la causa con los datos de la conexion y guarda el detalle", () => {
    expect(explainConnectionFailure({ kind: "refused", detail: "Connection refused (os error 111)" }, target)).toEqual({
      title: "El puerto 5432 no acepta conexiones",
      hint: "Revisa el puerto y que la base de datos esté en marcha en db.local.",
      detail: "Connection refused (os error 111)",
    });
  });

  it("sin causa reconocida no inventa un titulo", () => {
    expect(explainConnectionFailure({ kind: "other", detail: "raro" }, target)).toEqual({
      title: null,
      hint: null,
      detail: "raro",
    });
  });
});
