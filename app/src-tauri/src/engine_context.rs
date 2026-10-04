//! El contexto de motor de una conexion (docs/specs/contrato-motores-y-versiones.md
//! §2): lo que el backend sabe del servidor, armado una vez al conectar. El
//! frontend lo recibe de solo lectura y no deduce motor ni version de la
//! etiqueta visible.
//!
//! La linea efectiva sale de las lineas del motor (`support/<motor>.json`,
//! `Dialect::lines`); la verificacion, de la evidencia de
//! tools/test-dbs/lines.json (`verified`); el soporte del fabricante, de
//! tools/support/vendor-support.json con la regla de SQL_ENGINE.md §5.2. Todo
//! se compila dentro de la app: conectar no pide nada a la red. Ni la
//! verificacion ni el soporte cambian lo que el guard permite.

use khipu_driver_core::ServerIdentity;
use khipu_engine::Dialect;
use khipu_engine::lines::{Line, compare, numbers};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectionEngineContext {
    /// Sube en cada `connect` de la app (`AppState::generations`) y cuando
    /// cambia el modo de la sesion de la consola (`follow_console`): lo que
    /// se pidio con otra generacion ya no vale.
    pub(crate) generation: u64,
    /// El motor con el que se parte, analiza y protege el SQL: el del perfil.
    pub(crate) engine_id: &'static str,
    /// El servidor como lo detecto el driver; puede ser otro motor que el del
    /// perfil (un MariaDB detras de un perfil MySQL).
    pub(crate) server: ServerIdentity,
    /// El modo de la sesion de la consola, leido al conectar y otra vez
    /// despues de cada sentencia que puede cambiarlo.
    pub(crate) session_mode: SessionMode,
    /// La linea de comportamiento del servidor, de las lineas de su motor:
    /// la mas cercana por debajo de su version; por debajo de la primera, la
    /// primera. None solo si el driver informa un motor sin registrar.
    pub(crate) line: Option<LineIdentity>,
    /// Sube cada vez que cambian los schemas cargados (`set_schemas`): un
    /// refresco o un DDL no crean una generacion nueva.
    pub(crate) schema_epoch: u64,
    /// El ciclo de vida del fabricante: solo para mostrar. None si no hay
    /// fechas para esa version.
    pub(crate) support: Option<VendorSupport>,
    pub(crate) verification: Verification,
}

/// Que linea y que revision de sus datos se aplican a la conexion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub(crate) struct LineIdentity {
    pub(crate) id: &'static str,
    pub(crate) revision: u32,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionMode {
    /// El `sql_mode` incluye NO_BACKSLASH_ESCAPES: la barra invertida es un
    /// caracter mas al partir y al escribir literales.
    pub(crate) no_backslash_escapes: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VendorSupport {
    pub(crate) status: SupportStatus,
    /// La version del fabricante ("8.4", "18") y su fin de soporte.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) release: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) eol: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum SupportStatus {
    Supported,
    Grace,
    Unsupported,
    /// Mas nueva que todas las fechas conocidas.
    Newer,
}

/// Si esta version exacta pasa la matriz completa (`verified` en
/// lines.json). Solo para la UI y el reporte.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum Verification {
    Verified,
    Unverified,
}

impl ConnectionEngineContext {
    pub(crate) fn new(
        generation: u64,
        dialect: Dialect,
        server: ServerIdentity,
        session_mode: SessionMode,
    ) -> Self {
        Self {
            generation,
            engine_id: dialect.id(),
            line: effective_line(server.engine, &server.version),
            support: vendor_support(server.engine, &server.version, &today()),
            verification: verification(server.engine, &server.version),
            server,
            session_mode,
            schema_epoch: 0,
        }
    }

    /// Lo que se pidio con este contexto sigue valiendo: la misma conexion,
    /// con los mismos schemas cargados.
    pub(crate) fn is_current(&self, generation: u64, schema_epoch: u64) -> bool {
        self.generation == generation && self.schema_epoch == schema_epoch
    }

    /// La linea con que se analiza el SQL: la del servidor, si es del motor
    /// del perfil. Un MariaDB detras de un perfil MySQL no aplica reglas de
    /// lineas de MariaDB al SQL de MySQL.
    pub(crate) fn analysis_line(&self) -> Option<&'static Line> {
        let line = self.line?;
        if self.server.engine != self.engine_id {
            return None;
        }
        Dialect::from_id(self.engine_id)?.lines().get(line.id)
    }
}

/// La evidencia de prueba: que versiones exactas pasan la matriz completa.
#[derive(Deserialize)]
struct Lines {
    verified: HashMap<String, Vec<VerifiedServer>>,
}

#[derive(Deserialize)]
struct VerifiedServer {
    version: String,
}

#[derive(Deserialize)]
struct Release {
    release: String,
    lts: bool,
    eol: String,
}

static LINES: LazyLock<Lines> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../../tools/test-dbs/lines.json"))
        .expect("tools/test-dbs/lines.json")
});

static RELEASES: LazyLock<HashMap<String, Vec<Release>>> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../../tools/support/vendor-support.json"))
        .expect("tools/support/vendor-support.json")
});

fn dotted(version: &[u32]) -> String {
    version
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(".")
}

fn effective_line(engine: &str, version: &[u32]) -> Option<LineIdentity> {
    let line = Dialect::from_id(engine)?.lines().effective(version);
    Some(LineIdentity {
        id: &line.line,
        revision: line.revision,
    })
}

fn verification(engine: &str, version: &[u32]) -> Verification {
    let exact = dotted(version);
    let verified = LINES
        .verified
        .get(engine)
        .is_some_and(|servers| servers.iter().any(|server| server.version == exact));
    if verified {
        Verification::Verified
    } else {
        Verification::Unverified
    }
}

/// SQL_ENGINE.md §5.2: soportada hasta el fin de soporte; las LTS (cada mayor
/// de PostgreSQL cuenta como una), 12 meses mas de gracia. `today` es
/// `AAAA-MM-DD` en UTC: las fechas se comparan como texto.
fn vendor_support(engine: &str, version: &[u32], today: &str) -> Option<VendorSupport> {
    let releases = RELEASES.get(engine)?;
    // Postgres numera por version mayor desde la 10; MySQL y MariaDB, por
    // mayor.menor.
    let found = releases.iter().find(|candidate| {
        let release = numbers(&candidate.release);
        version.len() >= release.len() && version[..release.len()] == release[..]
    });
    let Some(found) = found else {
        let newest = releases
            .iter()
            .map(|candidate| numbers(&candidate.release))
            .max_by(|a, b| compare(a, b))?;
        return compare(version, &newest).is_gt().then_some(VendorSupport {
            status: SupportStatus::Newer,
            release: None,
            eol: None,
        });
    };
    let status = if today <= found.eol.as_str() {
        SupportStatus::Supported
    } else if found.lts && today <= one_year_after(&found.eol).as_str() {
        SupportStatus::Grace
    } else {
        SupportStatus::Unsupported
    };
    Some(VendorSupport {
        status,
        release: Some(found.release.clone()),
        eol: Some(found.eol.clone()),
    })
}

fn one_year_after(date: &str) -> String {
    match date.split_once('-') {
        Some((year, rest)) => match year.parse::<u32>() {
            Ok(year) => format!("{}-{rest}", year + 1),
            Err(_) => date.to_string(),
        },
        None => date.to_string(),
    }
}

/// La fecha de hoy en UTC, `AAAA-MM-DD` (algoritmo de dias civiles de
/// Howard Hinnant: sin dependencias de fechas).
fn today() -> String {
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs())
        .unwrap_or(0);
    civil_date(seconds / 86_400)
}

fn civil_date(days_since_epoch: u64) -> String {
    let z = days_since_epoch as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let day_of_era = z.rem_euclid(146_097);
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month = if month_index < 10 {
        month_index + 3
    } else {
        month_index - 9
    };
    let year = year_of_era + era * 400 + i64::from(month <= 2);
    format!("{year:04}-{month:02}-{day:02}")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TODAY: &str = "2026-10-02";

    fn status(engine: &str, version: &str, today: &str) -> Option<SupportStatus> {
        vendor_support(engine, &numbers(version), today).map(|support| support.status)
    }

    #[test]
    fn the_vendor_support_follows_sql_engine_5_2_with_the_real_dates() {
        use SupportStatus::*;
        assert_eq!(status("mysql", "8.4.11", TODAY), Some(Supported));
        // LTS: 8.0 paso a Sustaining Support el 2026-04-21 y sigue en gracia
        // un año.
        assert_eq!(
            vendor_support("mysql", &[8, 0, 46], TODAY),
            Some(VendorSupport {
                status: Grace,
                release: Some("8.0".into()),
                eol: Some("2026-04-21".into()),
            })
        );
        assert_eq!(status("mysql", "5.7.44", TODAY), Some(Unsupported));
        // De ciclo corto: sin gracia.
        assert_eq!(status("mysql", "8.3.0", TODAY), Some(Unsupported));
        assert_eq!(status("mariadb", "10.6.28", TODAY), Some(Grace));
        assert_eq!(status("mariadb", "11.7.2", TODAY), Some(Unsupported));
        assert_eq!(status("mariadb", "11.8.9", TODAY), Some(Supported));
        assert_eq!(status("postgres", "13.23", TODAY), Some(Grace));
        assert_eq!(status("postgres", "12.22", TODAY), Some(Unsupported));
        assert_eq!(status("postgres", "18.6", TODAY), Some(Supported));
    }

    #[test]
    fn the_grace_of_an_lts_ends_after_12_months() {
        assert_eq!(
            status("postgres", "13.23", "2026-11-14"),
            Some(SupportStatus::Unsupported)
        );
        assert_eq!(
            status("mysql", "8.0.46", "2027-04-22"),
            Some(SupportStatus::Unsupported)
        );
    }

    #[test]
    fn newer_than_the_known_dates_is_marked_as_such_and_the_unknown_is_not_guessed() {
        assert_eq!(
            status("postgres", "99.1", TODAY),
            Some(SupportStatus::Newer)
        );
        assert_eq!(status("mysql", "99.0.1", TODAY), Some(SupportStatus::Newer));
        assert_eq!(status("sqlite", "3.46.0", TODAY), None);
        // Debajo del piso tambien se describe: 9.6 tiene sus fechas.
        assert_eq!(
            status("postgres", "9.6.24", TODAY),
            Some(SupportStatus::Unsupported)
        );
    }

    #[test]
    fn the_line_is_the_closest_one_below_and_the_floor_below_the_first() {
        let line = |engine: &str, version: &str| {
            effective_line(engine, &numbers(version)).map(|line| line.id)
        };
        assert_eq!(line("mysql", "8.4.11"), Some("8.4"));
        assert_eq!(line("mysql", "8.3.0"), Some("8.0"));
        // Mas nueva que las probadas: la linea mas cercana por debajo
        // (SQL_ENGINE.md §5.2).
        assert_eq!(line("mysql", "12.1.0"), Some("9"));
        assert_eq!(line("mariadb", "11.4.13"), Some("10.6"));
        assert_eq!(line("postgres", "13.23"), Some("12"));
        // Debajo del piso conecta con la primera linea, la del piso.
        assert_eq!(line("mysql", "5.6.51"), Some("5.7"));
        assert_eq!(line("postgres", "9.6.24"), Some("10"));
        assert_eq!(line("sqlite", "3.46.0"), None);
    }

    #[test]
    fn the_analysis_uses_the_line_only_when_it_is_of_the_profiles_engine() {
        let context = |dialect: Dialect, engine: &'static str, version: Vec<u32>| {
            ConnectionEngineContext::new(
                1,
                dialect,
                ServerIdentity {
                    engine,
                    version,
                    label: String::new(),
                },
                SessionMode::default(),
            )
        };
        let mysql = context(Dialect::MySql, "mysql", vec![8, 4, 11]);
        let line = mysql.analysis_line().expect("MySQL 8.4 con perfil MySQL");
        assert_eq!(line.line, mysql.line.unwrap().id);
        assert_eq!(line.revision, mysql.line.unwrap().revision);
        // Un MariaDB detras de un perfil MySQL muestra su linea, pero el SQL
        // de MySQL no se analiza con reglas de lineas de MariaDB.
        let mariadb = context(Dialect::MySql, "mariadb", vec![11, 8, 9]);
        assert_eq!(mariadb.line.map(|line| line.id), Some("11.7"));
        assert!(mariadb.analysis_line().is_none());
    }

    #[test]
    fn only_the_exact_versions_of_lines_json_are_verified() {
        assert_eq!(verification("mysql", &[8, 4, 11]), Verification::Verified);
        assert_eq!(verification("postgres", &[18, 6]), Verification::Verified);
        // El mismo menor con otro parche no hereda la verificacion.
        assert_eq!(verification("mysql", &[8, 4, 10]), Verification::Unverified);
        // Un MariaDB que se presenta como MySQL se busca como MariaDB.
        assert_eq!(verification("mysql", &[11, 8, 9]), Verification::Unverified);
        assert_eq!(verification("mariadb", &[11, 8, 9]), Verification::Verified);
    }

    #[test]
    fn today_is_the_civil_date_in_utc() {
        assert_eq!(civil_date(0), "1970-01-01");
        // 2024 es bisiesto.
        assert_eq!(civil_date(19_782), "2024-02-29");
        assert_eq!(civil_date(20_728), "2026-10-02");
        assert_eq!(today().len(), 10);
    }

    #[test]
    fn a_request_from_another_generation_or_epoch_is_no_longer_current() {
        let mut context = ConnectionEngineContext::new(
            3,
            Dialect::Postgres,
            ServerIdentity {
                engine: "postgres",
                version: vec![18, 6],
                label: "PostgreSQL 18.6".into(),
            },
            SessionMode::default(),
        );
        assert!(context.is_current(3, 0));
        assert!(!context.is_current(2, 0));
        context.schema_epoch += 1;
        assert!(!context.is_current(3, 0));
        assert!(context.is_current(3, 1));
    }

    #[test]
    fn the_context_keeps_its_shape() {
        let context = ConnectionEngineContext::new(
            7,
            Dialect::MySql,
            ServerIdentity {
                engine: "mariadb",
                version: vec![11, 8, 9],
                label: "MariaDB 11.8.9".into(),
            },
            SessionMode {
                no_backslash_escapes: true,
            },
        );
        let mut value = serde_json::to_value(&context).unwrap();
        // Depende del dia en que corre la prueba.
        assert_eq!(value["support"]["release"], "11.8");
        value.as_object_mut().unwrap().remove("support");
        assert_eq!(
            value,
            serde_json::json!({
                "generation": 7,
                "engineId": "mysql",
                "server": { "engine": "mariadb", "version": [11, 8, 9], "label": "MariaDB 11.8.9" },
                "sessionMode": { "noBackslashEscapes": true },
                "line": { "id": "11.7", "revision": 1 },
                "schemaEpoch": 0,
                "verification": "verified",
            })
        );
    }
}
