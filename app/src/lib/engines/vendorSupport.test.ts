import { describe, expect, it } from "vitest";
import { vendorSupport } from "./vendorSupport";

const today = new Date("2026-10-02T12:00:00Z");

describe("soporte del fabricante de la version del servidor", () => {
  it("aplica la regla de SQL_ENGINE.md §5.2 con las fechas reales", () => {
    expect(vendorSupport("MySQL 8.4.11", today)?.status).toBe("supported");
    // LTS: 8.0 termino el 2026-04-30 y sigue en gracia un año.
    expect(vendorSupport("MySQL 8.0.46", today)).toEqual({ status: "grace", release: "8.0", eol: "2026-04-30" });
    expect(vendorSupport("MySQL 5.7.44", today)?.status).toBe("unsupported");
    // De ciclo corto: sin gracia.
    expect(vendorSupport("MySQL 8.3.0", today)?.status).toBe("unsupported");
    expect(vendorSupport("MariaDB 10.6.28", today)?.status).toBe("grace");
    expect(vendorSupport("MariaDB 11.7.2", today)?.status).toBe("unsupported");
    expect(vendorSupport("MariaDB 11.8.9", today)?.status).toBe("supported");
    expect(vendorSupport("PostgreSQL 13.23", today)?.status).toBe("grace");
    expect(vendorSupport("PostgreSQL 12.22", today)?.status).toBe("unsupported");
    expect(vendorSupport("PostgreSQL 18.6", today)?.status).toBe("supported");
  });

  it("la gracia de una LTS termina a los 12 meses", () => {
    expect(vendorSupport("PostgreSQL 13.23", new Date("2026-11-14T00:00:00Z"))?.status).toBe("unsupported");
  });

  it("lo mas nuevo que las fechas conocidas no se marca, y lo que no se conoce tampoco", () => {
    expect(vendorSupport("PostgreSQL 99.1", today)?.status).toBe("newer");
    expect(vendorSupport("MySQL 99.0.1", today)?.status).toBe("newer");
    expect(vendorSupport("SQLite 3.46.0", today)).toBeNull();
    expect(vendorSupport("PostgreSQL", today)).toBeNull();
  });
});
