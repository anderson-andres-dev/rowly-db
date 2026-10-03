//! Server flavor/version detection and the catalog capabilities derived from
//! it. Introspection picks its queries from `Capabilities`, never from the
//! raw version, so every version-dependent decision lives in one place.

/// MySQL and MariaDB speak the same protocol and share most of
/// `information_schema`, but diverged after MySQL 5.5 / MariaDB 10.0 in
/// exactly the parts introspection needs (check constraints, sequences).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Flavor {
    MySql,
    MariaDb,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ServerVersion {
    pub flavor: Flavor,
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

/// Compatibility floor: the oldest versions whose catalog introspection is
/// written against. It is not a support threshold: vendor support comes from
/// the support window (SQL_ENGINE.md §5.2, `vendorSupport.json`) and
/// verification from `verified` in `tools/test-dbs/lines.json`. Older servers
/// still connect, with their line, and load what their catalog has, with a
/// warning.
const COMPATIBILITY_FLOOR_MYSQL: (u32, u32) = (5, 7);
const COMPATIBILITY_FLOOR_MARIADB: (u32, u32) = (10, 3);

impl ServerVersion {
    /// Parses what `SELECT VERSION()` returns: `"8.0.35"`, `"5.7.44-log"`,
    /// `"8.0.35-0ubuntu0.22.04.1"`, `"10.6.12-MariaDB-log"`, and the
    /// `"5.5.5-10.11.6-MariaDB"` form some MariaDB builds report so that old
    /// MySQL clients accept them (the real version follows the fake 5.5.5).
    /// Anything unparseable becomes 0.0.0 of the detected flavor, which the
    /// capability checks treat as "oldest", i.e. the most conservative path.
    pub fn parse(raw: &str) -> Self {
        let is_mariadb = raw.to_ascii_lowercase().contains("mariadb");
        let text = if is_mariadb {
            raw.strip_prefix("5.5.5-").unwrap_or(raw)
        } else {
            raw
        };

        let mut parts = text
            .split(|c: char| !c.is_ascii_digit())
            .take(3)
            .map(|part| part.parse::<u32>().unwrap_or(0));
        Self {
            flavor: if is_mariadb {
                Flavor::MariaDb
            } else {
                Flavor::MySql
            },
            major: parts.next().unwrap_or(0),
            minor: parts.next().unwrap_or(0),
            patch: parts.next().unwrap_or(0),
        }
    }

    fn at_least(&self, major: u32, minor: u32, patch: u32) -> bool {
        (self.major, self.minor, self.patch) >= (major, minor, patch)
    }

    pub fn display(&self) -> String {
        let product = match self.flavor {
            Flavor::MySql => "MySQL",
            Flavor::MariaDb => "MariaDB",
        };
        format!("{product} {}.{}.{}", self.major, self.minor, self.patch)
    }

    pub fn is_below_compatibility_floor(&self) -> bool {
        let (major, minor) = match self.flavor {
            Flavor::MySql => COMPATIBILITY_FLOOR_MYSQL,
            Flavor::MariaDb => COMPATIBILITY_FLOOR_MARIADB,
        };
        !self.at_least(major, minor, 0)
    }

    pub fn capabilities(&self) -> Capabilities {
        let check_constraints = match self.flavor {
            // information_schema.check_constraints appeared in 8.0.16, when
            // CHECK stopped being parsed-and-ignored.
            Flavor::MySql => {
                if self.at_least(8, 0, 16) {
                    CheckConstraints::JoinTableConstraints
                } else {
                    CheckConstraints::Unsupported
                }
            }
            // MariaDB has had it since 10.2.1, with TABLE_NAME in the view
            // itself (and it also lists column-level checks).
            Flavor::MariaDb => {
                if self.at_least(10, 2, 1) {
                    CheckConstraints::WithTableName
                } else {
                    CheckConstraints::Unsupported
                }
            }
        };

        Capabilities {
            check_constraints,
            // MariaDB 10.3 sequences show up in information_schema.tables
            // with TABLE_TYPE = 'SEQUENCE'.
            sequences: self.flavor == Flavor::MariaDb && self.at_least(10, 3, 0),
        }
    }
}

/// Where (if anywhere) check constraints can be read from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckConstraints {
    Unsupported,
    /// MySQL: `check_constraints` has no table name, so it's joined with
    /// `table_constraints` (constraint names are unique per schema).
    JoinTableConstraints,
    /// MariaDB: `check_constraints.table_name` is there directly.
    WithTableName,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Capabilities {
    pub check_constraints: CheckConstraints,
    pub sequences: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn version(flavor: Flavor, major: u32, minor: u32, patch: u32) -> ServerVersion {
        ServerVersion {
            flavor,
            major,
            minor,
            patch,
        }
    }

    #[test]
    fn parses_mysql_versions_with_suffixes() {
        assert_eq!(
            ServerVersion::parse("8.0.35"),
            version(Flavor::MySql, 8, 0, 35)
        );
        assert_eq!(
            ServerVersion::parse("5.7.44-log"),
            version(Flavor::MySql, 5, 7, 44)
        );
        assert_eq!(
            ServerVersion::parse("8.0.35-0ubuntu0.22.04.1"),
            version(Flavor::MySql, 8, 0, 35)
        );
    }

    #[test]
    fn parses_mariadb_with_and_without_compat_prefix() {
        assert_eq!(
            ServerVersion::parse("10.6.12-MariaDB-log"),
            version(Flavor::MariaDb, 10, 6, 12)
        );
        assert_eq!(
            ServerVersion::parse("5.5.5-10.11.6-MariaDB"),
            version(Flavor::MariaDb, 10, 11, 6)
        );
        assert_eq!(
            ServerVersion::parse("11.4.2-MariaDB-ubu2404"),
            version(Flavor::MariaDb, 11, 4, 2)
        );
    }

    #[test]
    fn unparseable_version_is_treated_as_oldest() {
        let parsed = ServerVersion::parse("garbage");
        assert_eq!(parsed, version(Flavor::MySql, 0, 0, 0));
        assert!(parsed.is_below_compatibility_floor());
        assert_eq!(
            parsed.capabilities().check_constraints,
            CheckConstraints::Unsupported
        );
    }

    #[test]
    fn check_constraints_depend_on_flavor_and_version() {
        let checks = |v: ServerVersion| v.capabilities().check_constraints;
        assert_eq!(
            checks(version(Flavor::MySql, 5, 7, 44)),
            CheckConstraints::Unsupported
        );
        assert_eq!(
            checks(version(Flavor::MySql, 8, 0, 15)),
            CheckConstraints::Unsupported
        );
        assert_eq!(
            checks(version(Flavor::MySql, 8, 0, 16)),
            CheckConstraints::JoinTableConstraints
        );
        assert_eq!(
            checks(version(Flavor::MariaDb, 10, 3, 0)),
            CheckConstraints::WithTableName
        );
    }

    #[test]
    fn sequences_only_on_mariadb_10_3_and_later() {
        assert!(!version(Flavor::MySql, 8, 4, 0).capabilities().sequences);
        assert!(!version(Flavor::MariaDb, 10, 2, 40).capabilities().sequences);
        assert!(version(Flavor::MariaDb, 10, 3, 0).capabilities().sequences);
    }

    #[test]
    fn minimum_versions_per_flavor() {
        assert!(version(Flavor::MySql, 5, 6, 51).is_below_compatibility_floor());
        assert!(!version(Flavor::MySql, 5, 7, 0).is_below_compatibility_floor());
        assert!(version(Flavor::MariaDb, 10, 2, 44).is_below_compatibility_floor());
        assert!(!version(Flavor::MariaDb, 10, 3, 0).is_below_compatibility_floor());
    }
}
