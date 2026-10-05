import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

// La busqueda del arranque (list_releases) devuelve lo que el test elija.
let listed: unknown[] = [];
let listCalls = 0;
// La novedad que devuelve release_highlight (una promesa: puede no llegar).
let highlightAnswer: () => Promise<unknown> = async () => null;
vi.mock("$app/environment", () => ({ browser: false }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (command: string) => {
    if (command === "update_context") {
      return { currentVersion: "0.2.3", installKind: "deb", canInstall: true, releasesPage: "" };
    }
    if (command === "list_releases") {
      listCalls += 1;
      return listed;
    }
    if (command === "release_highlight") return highlightAnswer();
    return undefined;
  },
}));

const { checkOnStartup, dismissUpdatePrompt, localizedText, releaseHighlights, updatePrefs, updatePrompt } = await import("./updates");

function release(version: string, relation: "current" | "newer" | "older", hasHighlight = false) {
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
    hasHighlight,
  };
}

describe("aviso de version nueva al abrir", () => {
  let day = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 1 + day++ * 2)));
    listCalls = 0;
    updatePrefs.set({ autoCheck: true, includePrereleases: false, skippedTag: null });
    updatePrompt.set(null);
    releaseHighlights.set({});
    highlightAnswer = async () => null;
  });
  afterEach(() => vi.useRealTimers());

  it("pregunta por la version nueva que encontro la busqueda", async () => {
    listed = [release("0.2.4", "newer"), release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)?.tag).toBe("v0.2.4");
    await checkOnStartup();
    expect(listCalls).toBe(1);
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
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
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

  it("con novedad, el aviso abre con ella ya cargada", async () => {
    const highlight = { badge: null, title: { en: "Review", es: "Revisa" }, items: [], image: null, imageAlt: null };
    highlightAnswer = async () => highlight;
    listed = [release("0.2.4", "newer", true), release("0.2.3", "current")];
    await checkOnStartup();
    expect(get(updatePrompt)?.tag).toBe("v0.2.4");
    expect(get(releaseHighlights)["v0.2.4"]).toEqual(highlight);
  });

  it("si la novedad no llega, el aviso abre igual, clasico", async () => {
    highlightAnswer = () => new Promise(() => {});
    listed = [release("0.2.4", "newer", true), release("0.2.3", "current")];
    const checking = checkOnStartup();
    await vi.advanceTimersByTimeAsync(6000);
    await checking;
    expect(get(updatePrompt)?.tag).toBe("v0.2.4");
    expect(get(releaseHighlights)["v0.2.4"]).toBeUndefined();
  });

  it("el texto sale en el idioma de la interfaz o en ingles", () => {
    expect(localizedText({ en: "New", es: "Nuevo" }, "es")).toBe("Nuevo");
    expect(localizedText({ en: "New", es: "Nuevo" }, "pt-BR")).toBe("New");
  });
});
