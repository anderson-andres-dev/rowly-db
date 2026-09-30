import mysqlIcon from "devicon/icons/mysql/mysql-original.svg?url";
import mariaDbIcon from "devicon/icons/mariadb/mariadb-original.svg?url";
import postgresIcon from "devicon/icons/postgresql/postgresql-plain.svg?url";
import mysqlWordmark from "devicon/icons/mysql/mysql-plain-wordmark.svg?url";
import mariaDbWordmark from "devicon/icons/mariadb/mariadb-original-wordmark.svg?url";
import postgresWordmark from "devicon/icons/postgresql/postgresql-plain-wordmark.svg?url";

// El motor: los mismos valores que `DatabaseKind` y `Dialect` en Rust
// (app/src-tauri/src/drivers.rs). Que driver le habla lo decide el backend.
export type ConnectionDriver = "mysql" | "mariadb" | "postgres";

export interface DriverDefinition {
  id: ConnectionDriver;
  name: string;
  icon: string;
  wordmark: string;
  defaultPort: number;
}

export const connectionDrivers: DriverDefinition[] = [
  {
    id: "mysql",
    name: "MySQL",
    icon: mysqlIcon,
    wordmark: mysqlWordmark,
    defaultPort: 3306,
  },
  {
    id: "mariadb",
    name: "MariaDB",
    icon: mariaDbIcon,
    wordmark: mariaDbWordmark,
    defaultPort: 3306,
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    icon: postgresIcon,
    wordmark: postgresWordmark,
    defaultPort: 5432,
  },
];

// Sin caida a otro motor: un perfil guardado con un motor desconocido ya se
// descarta al cargar (connectionProfiles.ts).
export function getDriver(driver: ConnectionDriver): DriverDefinition {
  const found = connectionDrivers.find((candidate) => candidate.id === driver);
  if (!found) throw new Error(`Motor sin definir: ${driver}`);
  return found;
}
