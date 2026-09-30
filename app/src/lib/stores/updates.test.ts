import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { errorCode, newerRelease, releases, updatePrefs, visibleReleases, type ReleaseInfo } from "./updates";

function release(version: string, relation: ReleaseInfo["relation"], prerelease = false): ReleaseInfo {
  return {
    tag: `v${version}`,
    version,
    name: `v${version}`,
    notes: "",
    publishedAt: null,
    prerelease,
    url: "",
    relation,
    installable: true,
  };
}

describe("updates", () => {
  it("oculta las preliminares salvo que se pidan o sea la instalada", () => {
    releases.set([
      release("0.3.0-rc.1", "newer", true),
      release("0.2.0", "current"),
      release("0.2.0-beta.1", "older", true),
      release("0.1.0", "older"),
    ]);
    updatePrefs.set({ autoCheck: true, includePrereleases: false, skippedTag: null });
    expect(get(visibleReleases).map((item) => item.version)).toEqual(["0.2.0", "0.1.0"]);
    expect(get(newerRelease)).toBeNull();

    updatePrefs.set({ autoCheck: true, includePrereleases: true, skippedTag: null });
    expect(get(visibleReleases)).toHaveLength(4);
    expect(get(newerRelease)?.version).toBe("0.3.0-rc.1");
  });

  it("la instalada se muestra aunque sea preliminar", () => {
    releases.set([release("0.3.0-rc.1", "current", true), release("0.2.0", "older")]);
    updatePrefs.set({ autoCheck: true, includePrereleases: false, skippedTag: null });
    expect(get(visibleReleases).map((item) => item.version)).toEqual(["0.3.0-rc.1", "0.2.0"]);
  });

  it("lee el código de error del backend y usa network si no hay", () => {
    expect(errorCode({ code: "cancelled", detail: "x" })).toBe("cancelled");
    expect(errorCode("boom")).toBe("network");
  });
});
