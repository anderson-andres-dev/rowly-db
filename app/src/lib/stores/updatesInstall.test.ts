import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

// Instalar llama al backend (install_release) y escucha el progreso.
const invoke = vi.fn(async (_command: string, _args?: unknown) => undefined);
vi.mock("@tauri-apps/api/core", () => ({ invoke: (command: string, args?: unknown) => invoke(command, args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));

const { installRelease, installState } = await import("./updates");

const release = {
  tag: "v0.2.4",
  version: "0.2.4",
  name: "v0.2.4",
  notes: "",
  publishedAt: null,
  prerelease: false,
  url: "",
  relation: "newer" as const,
  installable: true,
  hasHighlight: false,
};

describe("instalar una version", () => {
  beforeEach(() => {
    invoke.mockClear();
    installState.set({ phase: "idle" });
  });

  it("termina en done y queda esperando el reinicio", async () => {
    await installRelease(release);
    expect(get(installState)).toEqual({ phase: "done", tag: "v0.2.4", version: "0.2.4" });
    expect(invoke).toHaveBeenCalledWith("install_release", { tag: "v0.2.4" });
  });

  it("ya instalada y esperando el reinicio, no se vuelve a instalar", async () => {
    await installRelease(release);
    invoke.mockClear();
    await installRelease(release);
    expect(invoke).not.toHaveBeenCalled();
    expect(get(installState).phase).toBe("done");
  });

  it("si falla, queda el error de esa version para reintentar", async () => {
    invoke.mockRejectedValueOnce({ code: "cancelled" });
    await installRelease(release);
    expect(get(installState)).toEqual({ phase: "error", tag: "v0.2.4", version: "0.2.4", code: "cancelled" });
  });
});
