import data from "./vendorSupport.json";

// El soporte del fabricante de la version del servidor conectado, con la
// regla de SQL_ENGINE.md §5.2: gracia de 12 meses tras el fin de soporte,
// solo en las LTS. Las fechas salen de tools/support/vendor-support.py.
// Pasan a los paquetes de cada linea (SQL_ENGINE.es.md).

interface Release {
  release: string;
  lts: boolean;
  eol: string;
}

export type SupportStatus = "supported" | "grace" | "unsupported" | "newer";

export interface VendorSupport {
  status: SupportStatus;
  // La version del fabricante ("8.4", "18") y su fin de soporte.
  release?: string;
  eol?: string;
}

const RELEASES: Record<string, readonly Release[]> = data;
const ENGINES: readonly [string, string][] = [["MariaDB", "mariadb"], ["MySQL", "mysql"], ["PostgreSQL", "postgres"]];

function numbers(text: string): number[] {
  return text.split(".").map((part) => Number.parseInt(part, 10));
}

function compare(a: number[], b: number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

// `serverVersion` como lo muestra el driver: "MySQL 8.4.11", "MariaDB 11.8.9",
// "PostgreSQL 18.6". Sin datos para esa version, null: no se adivina.
export function vendorSupport(serverVersion: string, today = new Date()): VendorSupport | null {
  const engine = ENGINES.find(([name]) => serverVersion.startsWith(`${name} `))?.[1];
  const version = serverVersion.match(/\d+(?:\.\d+)*/)?.[0];
  if (!engine || !version) return null;
  const releases = RELEASES[engine] ?? [];
  const parts = numbers(version);
  // Postgres numera por version mayor desde la 10; MySQL y MariaDB, por mayor.menor.
  const found = releases.find((candidate) => {
    const release = numbers(candidate.release);
    return compare(parts.slice(0, release.length), release) === 0;
  });
  if (!found) {
    const newest = releases.reduce<number[] | null>((best, candidate) => {
      const release = numbers(candidate.release);
      return !best || compare(release, best) > 0 ? release : best;
    }, null);
    return newest && compare(parts, newest) > 0 ? { status: "newer" } : null;
  }
  const end = new Date(`${found.eol}T23:59:59Z`);
  const grace = new Date(end);
  grace.setUTCFullYear(grace.getUTCFullYear() + 1);
  const status = today <= end ? "supported" : found.lts && today <= grace ? "grace" : "unsupported";
  return { status, release: found.release, eol: found.eol };
}
