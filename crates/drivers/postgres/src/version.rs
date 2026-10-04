//! Server version detection and the catalog capabilities derived from it.
//! Introspection picks its queries from `Capabilities`, never from the raw
//! version; since which version each capability exists is declared once, in
//! the engine's lines (`support/postgres.json`, `khipu_engine::lines`).

use khipu_engine::Dialect;
use khipu_engine::lines::Capability;

/// `server_version_num` as the server reports it: `160002` for 16.2,
/// `100023` for 10.23 (since 10, the number is major * 10000 + minor).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ServerVersion(pub u32);

/// Compatibility floor: the oldest major version introspection is written
/// against, the one that introduced `pg_sequence`, `relispartition` and
/// declarative partitioning. It is not a support threshold: vendor support
/// comes from the support window (SQL_ENGINE.md §5.2, `tools/support/vendor-support.json`)
/// and verification from `verified` in `tools/test-dbs/lines.json`. Older
/// servers still connect, with their line, and load what they can, with a
/// warning.
const COMPATIBILITY_FLOOR_MAJOR: u32 = 10;

impl ServerVersion {
    /// Parses `SHOW server_version_num`. Unparseable values become 0, which
    /// every capability check treats as "oldest" (the conservative path).
    pub fn parse(raw: &str) -> Self {
        Self(raw.trim().parse().unwrap_or(0))
    }

    /// Since 10 the number is major * 10000 + minor; before, 9.6.24 was
    /// 90624, with a two-component major.
    pub fn numbers(&self) -> Vec<u32> {
        if self.0 >= 100_000 {
            vec![self.0 / 10_000, self.0 % 10_000]
        } else {
            vec![self.0 / 10_000, (self.0 / 100) % 100, self.0 % 100]
        }
    }

    pub fn display(&self) -> String {
        let numbers: Vec<String> = self.numbers().iter().map(u32::to_string).collect();
        format!("PostgreSQL {}", numbers.join("."))
    }

    pub fn identity(&self) -> khipu_driver_core::ServerIdentity {
        khipu_driver_core::ServerIdentity {
            engine: "postgres",
            version: self.numbers(),
            label: self.display(),
        }
    }

    pub fn is_below_compatibility_floor(&self) -> bool {
        self.0 < COMPATIBILITY_FLOOR_MAJOR * 10_000
    }

    pub fn capabilities(&self) -> Capabilities {
        // Since which version each one exists is line data
        // (support/postgres.json); how to read it is this driver's.
        let lines = Dialect::Postgres.lines();
        let version = self.numbers();
        let supports = |capability| lines.supports(capability, &version);
        Capabilities {
            // pg_proc.prokind (and with it, procedures) arrived in 11;
            // before that, aggregates/window functions are told apart by
            // proisagg/proiswindow and everything else is a function.
            prokind: supports(Capability::Procedures),
            // INCLUDE columns in indexes: indnatts counts them, indnkeyatts
            // doesn't.
            index_key_attributes: supports(Capability::IndexIncludeColumns),
            // pg_sequence and relispartition.
            catalog_v10: supports(Capability::CatalogV10),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Capabilities {
    pub prokind: bool,
    pub index_key_attributes: bool,
    pub catalog_v10: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_server_version_num() {
        assert_eq!(ServerVersion::parse("160002"), ServerVersion(160002));
        assert_eq!(ServerVersion::parse(" 100023\n"), ServerVersion(100023));
        assert_eq!(ServerVersion::parse("not a number"), ServerVersion(0));
    }

    #[test]
    fn display_across_numbering_schemes() {
        assert_eq!(ServerVersion(160002).display(), "PostgreSQL 16.2");
        assert_eq!(ServerVersion(100023).display(), "PostgreSQL 10.23");
        assert_eq!(ServerVersion(90624).display(), "PostgreSQL 9.6.24");
    }

    #[test]
    fn the_identity_carries_the_numbers_not_only_the_label() {
        let identity = ServerVersion(130023).identity();
        assert_eq!(identity.engine, "postgres");
        assert_eq!(identity.version, vec![13, 23]);
        assert_eq!(identity.label, "PostgreSQL 13.23");
        assert_eq!(ServerVersion(90624).identity().version, vec![9, 6, 24]);
    }

    #[test]
    fn minimum_is_postgres_10() {
        assert!(ServerVersion(90624).is_below_compatibility_floor());
        assert!(!ServerVersion(100000).is_below_compatibility_floor());
        assert!(ServerVersion(0).is_below_compatibility_floor());
    }

    #[test]
    fn capabilities_by_version() {
        let pg10 = ServerVersion(100023).capabilities();
        assert!(!pg10.prokind);
        assert!(!pg10.index_key_attributes);
        assert!(pg10.catalog_v10);

        let pg11 = ServerVersion(110000).capabilities();
        assert!(pg11.prokind);
        assert!(pg11.index_key_attributes);

        let pg96 = ServerVersion(90624).capabilities();
        assert!(!pg96.catalog_v10);
    }
}
