import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

// La busqueda del arranque (list_releases) devuelve lo que el test elija.
let listed: unknown[] = [];
vi.mock("$app/environment", () => ({ browser: false }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (command: string) => {
    if (command === "update_context") {
      return { currentVersion: "0.2.3", installKind: "deb", canInstall: true, releasesPage: "" };
    }
    if (command === "list_releases") return listed;
    return undefined;
  },
}));

const { checkOnStartup, dismissUpdatePrompt, updatePrefs, updatePrompt } = await import("./updates");

function release(version: string, relation: "current" | "newer" | "older") {
  return {
    tag: `v${version}`,
    version,
    name: `v${version}`,
    notes: "",
    publishedAt: null,
    prerelease: false,
    url: "",
    relation,
    installable: true,
  };
}

describe("aviso de version nueva al abrir", () => {
  beforeEach(() => {
    updatePrefs.set({ autoCheck: true, includePrereleases: false, skippedTag: null });
    updatePrompt.set(null);
  });

  it("pregunta por la version nueva que encontro la busqueda", async () => {
    listed = [release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)?.tag).toBe("v0.2.4");
  });

  it("al dia, no pregunta", async () => {
    listed = [release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)).toBeNull();
  });

  it("no volver a preguntar omite esa version; una mas nueva vuelve a preguntar", async () => {
    listed = [release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    dismissUpdatePrompt(true);
    expect(get(updatePrefs).skippedTag).toBe("v0.2.4");
    expect(get(updatePrompt)).toBeNull();

    await checkOnStartup();
    expect(get(updatePrompt)).toBeNull();

    listed = [release("0.2.5", "newer"), release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)?.tag).toBe("v0.2.5");
  });

  it("ahora no solo cierra: la version no queda omitida", async () => {
    listed = [release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    dismissUpdatePrompt(false);
    expect(get(updatePrompt)).toBeNull();
    expect(get(updatePrefs).skippedTag).toBeNull();
  });

  it("con la busqueda al iniciar apagada, no pregunta", async () => {
    updatePrefs.set({ autoCheck: false, includePrereleases: false, skippedTag: null });
    listed = [release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)).toBeNull();
  });
});
