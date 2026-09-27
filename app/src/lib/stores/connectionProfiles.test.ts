import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import {
  connectionProfiles,
  parseProfile,
  removeConnectionProfile,
} from "$lib/stores/connectionProfiles";

const saved = {
  id: "p1",
  name: "core",
  driver: "mysql",
  host: "10.100.200.183",
  port: 3306,
  database: "core",
  username: "anderson",
  passwordPolicy: "forever",
};

describe("parseProfile", () => {
  it("abre perfiles guardados antes del modo SSL en Automatico", () => {
    expect(parseProfile(saved)).toMatchObject({ tlsMode: "auto", caCertificatePath: undefined });
  });

  it("conserva el modo SSL y la CA guardados", () => {
    expect(parseProfile({ ...saved, tlsMode: "verifyIdentity", caCertificatePath: "/etc/ssl/rds-ca.pem" })).toMatchObject({
      tlsMode: "verifyIdentity",
      caCertificatePath: "/etc/ssl/rds-ca.pem",
    });
  });

  it("cae a Automatico ante un modo desconocido y descarta una CA vacia", () => {
    expect(parseProfile({ ...saved, tlsMode: "prefer", caCertificatePath: "  " })).toMatchObject({
      tlsMode: "auto",
      caCertificatePath: undefined,
    });
  });

  it("guarda grupo y color validos, y descarta los invalidos", () => {
    expect(parseProfile({ ...saved, group: "  Producción ", color: "#F44336" })).toMatchObject({
      group: "Producción",
      color: "#f44336",
    });
    expect(parseProfile({ ...saved, group: "", color: "red" })).toMatchObject({
      group: undefined,
      color: undefined,
    });
  });

  it("conserva un entorno valido; sin entorno o con uno desconocido queda sin especificar", () => {
    expect(parseProfile({ ...saved, environment: "production" })?.environment).toBe("production");
    expect(parseProfile(saved)?.environment).toBeUndefined();
    expect(parseProfile({ ...saved, environment: "staging" })?.environment).toBeUndefined();
    expect(parseProfile({ ...saved, environment: "testing" })?.environment).toBe("development");
  });
});

describe("removeConnectionProfile", () => {
  it("quita solo el perfil indicado", () => {
    const other = { ...parseProfile(saved)!, id: "p2", name: "reportes" };
    connectionProfiles.set([parseProfile(saved)!, other]);

    removeConnectionProfile("p1");

    expect(get(connectionProfiles)).toEqual([other]);
  });
});
