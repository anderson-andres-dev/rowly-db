// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

const backend = vi.hoisted(() => ({
  calls: 0,
  version: "0.2.4",
  failure: null as { code: string; retryAt?: number } | null,
}));

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (command: string) => {
    if (command === "update_context") {
      return { currentVersion: backend.version, installKind: "deb", canInstall: true, releasesPage: "" };
    }
    if (command === "list_releases") {
      backend.calls += 1;
      if (backend.failure) throw backend.failure;
      return [{
        tag: "v0.2.4", version: "0.2.4", name: "v0.2.4", notes: "", publishedAt: null,
        prerelease: false, url: "", relation: "current", installable: true,
      }];
    }
    return undefined;
  },
}));

describe("cache de actualizaciones", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
    localStorage.clear();
    backend.calls = 0;
    backend.version = "0.2.4";
    backend.failure = null;
    vi.resetModules();
  });
  afterEach(() => vi.useRealTimers());

  it("reutiliza la lista tras reiniciar y no consulta de nuevo antes de 24 horas", async () => {
    const first = await import("./updates");
    await first.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(1);

    vi.resetModules();
    const restarted = await import("./updates");
    await restarted.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(1);
    expect(get(restarted.releases)?.[0].tag).toBe("v0.2.4");

    vi.setSystemTime(new Date("2026-10-03T12:00:01Z"));
    await restarted.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(2);
  });

  it("respeta el tiempo de espera de GitHub incluso tras reiniciar", async () => {
    backend.failure = { code: "rateLimited", retryAt: Date.now() + 60 * 60 * 1000 };
    const first = await import("./updates");
    await first.checkForUpdates();
    expect(backend.calls).toBe(1);
    expect(get(first.retryAt)).toBe(backend.failure.retryAt);

    vi.resetModules();
    const restarted = await import("./updates");
    await restarted.checkForUpdates();
    expect(backend.calls).toBe(1);

    vi.setSystemTime(new Date("2026-10-02T13:00:01Z"));
    backend.failure = null;
    await restarted.checkForUpdates();
    expect(backend.calls).toBe(2);
    expect(get(restarted.retryAt)).toBeNull();
    expect(get(restarted.releasesError)).toBeNull();
  });

  it("no repite un fallo de red en cada visita y reintenta despues de una hora", async () => {
    backend.failure = { code: "network" };
    const updates = await import("./updates");
    await updates.checkForUpdates({ automatic: true });
    await updates.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(1);

    vi.setSystemTime(new Date("2026-10-02T13:00:01Z"));
    backend.failure = null;
    await updates.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(2);
  });

  it("invalida la lista guardada al cambiar la version instalada", async () => {
    const first = await import("./updates");
    await first.checkForUpdates({ automatic: true });
    backend.version = "0.2.5";

    vi.resetModules();
    const restarted = await import("./updates");
    await restarted.checkForUpdates({ automatic: true });
    expect(backend.calls).toBe(2);
  });
});
