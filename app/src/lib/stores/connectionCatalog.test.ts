import { beforeEach, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { CatalogTable, DatabaseExplorer } from "$lib/types";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("$lib/backend", () => ({ invoke, backendText: (value: unknown) => String(value) }));

import { catalogTables, connection, databaseExplorer, explorerLoading, refreshCatalog, reset } from "./connection";

function explorer(schema: string): DatabaseExplorer {
  return {
    serverVersion: "8.0", tls: { encrypted: false, detail: null, fellBack: false },
    defaultSchema: schema, availableSchemas: [schema],
    schemas: [{ schema, tables: [], routines: [], sequences: [], events: [], warnings: [] }],
  };
}

const oldExplorer = explorer("old");
const newExplorer = explorer("new");
const oldTables = [{ schema: "old", name: "t" }] as CatalogTable[];
const newTables = [{ schema: "new", name: "t" }] as CatalogTable[];

beforeEach(() => {
  invoke.mockReset();
  reset();
  connection.set({ connected: true, connecting: false, tableCount: 1, profileId: "old", error: null });
  databaseExplorer.set(oldExplorer);
  catalogTables.set(oldTables);
});

it("conserva ambas vistas del catalogo si falla list_tables", async () => {
  invoke.mockResolvedValueOnce(newExplorer).mockRejectedValueOnce(new Error("fallo"));
  await expect(refreshCatalog()).rejects.toThrow("fallo");
  expect(get(databaseExplorer)).toBe(oldExplorer);
  expect(get(catalogTables)).toBe(oldTables);
  expect(get(explorerLoading)).toBe(false);
});

it("descarta los resultados si cambia la conexion durante el refresh", async () => {
  let finish!: (tables: CatalogTable[]) => void;
  invoke.mockResolvedValueOnce(newExplorer).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const pending = refreshCatalog();
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
  connection.set({ connected: true, connecting: false, tableCount: 1, profileId: "other", error: null });
  databaseExplorer.set(oldExplorer);
  catalogTables.set(oldTables);
  finish(newTables);
  await pending;
  expect(get(databaseExplorer)).toBe(oldExplorer);
  expect(get(catalogTables)).toBe(oldTables);
  expect(get(explorerLoading)).toBe(false);
});

it("publica juntos el explorador y las tablas si ambos pedidos terminan", async () => {
  invoke.mockResolvedValueOnce(newExplorer).mockResolvedValueOnce(newTables);
  await refreshCatalog();
  expect(get(databaseExplorer)?.defaultSchema).toBe("new");
  expect(get(catalogTables)).toBe(newTables);
  expect(get(explorerLoading)).toBe(false);
});

it("going back to the connection list releases the backend's connection", async () => {
  invoke.mockReset();
  reset();
  await Promise.resolve();
  expect(invoke).toHaveBeenCalledWith("disconnect");
  expect(get(connection).connected).toBe(false);
});
