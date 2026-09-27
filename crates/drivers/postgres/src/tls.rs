//! TLS negotiation for Postgres connections: how each `TlsMode` maps to
//! sqlx, when `Auto` falls back to an unencrypted connection, and how to
//! read back what was actually negotiated.
//!
//! The MySQL driver has the same shape in its own `tls.rs`; the part that
//! classifies errors is identical on purpose (driver-core stays free of
//! sqlx, so it can't host it).

use khipu_driver_core::{
    ConnectionErrorKind, DriverError, TlsMode, TlsStatus, io_error_kind, tls_failure_kind,
};
use sqlx::PgPool;
use sqlx::postgres::{PgConnectOptions, PgSslMode};
use std::io::ErrorKind;

pub fn ssl_mode(mode: TlsMode) -> PgSslMode {
    match mode {
        TlsMode::Auto => PgSslMode::Prefer,
        TlsMode::Required => PgSslMode::Require,
        TlsMode::VerifyCa => PgSslMode::VerifyCa,
        TlsMode::VerifyIdentity => PgSslMode::VerifyFull,
        TlsMode::Disabled => PgSslMode::Disable,
    }
}

pub fn apply(
    options: PgConnectOptions,
    mode: TlsMode,
    ca_certificate_path: Option<&str>,
) -> PgConnectOptions {
    let options = options.ssl_mode(ssl_mode(mode));
    match ca_certificate_path.filter(|path| mode.verifies_certificate() && !path.is_empty()) {
        Some(path) => options.ssl_root_cert(path),
        None => options,
    }
}

/// Whether `error` came from TLS negotiation, as opposed to the server
/// rejecting the login (`Error::Database`) or not being reachable at all
/// (refused / timed out). Only the former is worth retrying unencrypted:
/// retrying a wrong password in clear text would be pointless and leak it,
/// and retrying an unreachable host would just double the wait.
pub fn is_tls_failure(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Tls(_) => true,
        sqlx::Error::Io(io) => matches!(
            io.kind(),
            ErrorKind::InvalidData | ErrorKind::UnexpectedEof | ErrorKind::ConnectionReset
        ),
        _ => false,
    }
}

/// The error shown when connecting fails: the raw detail plus its cause
/// (`ConnectionErrorKind`), which the app turns into a message and a hint in
/// the user's language.
pub fn connection_error(error: sqlx::Error, mode: TlsMode) -> DriverError {
    let detail = error.to_string();
    let kind = if mode != TlsMode::Disabled && is_tls_failure(&error) {
        tls_failure_kind(&detail)
    } else {
        match &error {
            sqlx::Error::Database(database) => match database.code().as_deref() {
                // invalid_password; invalid_authorization_specification (rol
                // inexistente o pg_hba.conf que no admite a este usuario).
                Some("28P01" | "28000") => ConnectionErrorKind::AuthFailed,
                Some("42501") => ConnectionErrorKind::AccessDenied,
                Some("3D000") => ConnectionErrorKind::UnknownDatabase,
                _ => ConnectionErrorKind::Other,
            },
            sqlx::Error::PoolTimedOut => ConnectionErrorKind::Timeout,
            sqlx::Error::Io(io) => io_error_kind(io.kind(), &detail),
            _ => ConnectionErrorKind::Other,
        }
    };
    DriverError::connection(kind, detail)
}

/// Reads this session's row of `pg_stat_ssl` (9.5+). Without the view, or
/// without a row for the backend, the status is unknown rather than
/// assumed.
pub async fn read_status(pool: &PgPool, fell_back: bool) -> TlsStatus {
    // (ssl, version, cipher)
    type SslRow = (bool, Option<String>, Option<String>);
    let row: Result<Option<SslRow>, _> =
        sqlx::query_as("SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()")
            .fetch_optional(pool)
            .await;

    match row {
        Ok(Some((encrypted, version, cipher))) => TlsStatus {
            encrypted: Some(encrypted),
            detail: encrypted
                .then(|| {
                    [version, cipher]
                        .into_iter()
                        .flatten()
                        .collect::<Vec<_>>()
                        .join(" · ")
                })
                .filter(|detail| !detail.is_empty()),
            fell_back,
        },
        _ => TlsStatus {
            encrypted: None,
            detail: None,
            fell_back,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn io_error(kind: ErrorKind) -> sqlx::Error {
        sqlx::Error::Io(std::io::Error::new(kind, "boom"))
    }

    #[test]
    fn handshake_failures_are_tls_failures() {
        assert!(is_tls_failure(&sqlx::Error::Tls("alert".into())));
        assert!(is_tls_failure(&io_error(ErrorKind::InvalidData)));
        assert!(is_tls_failure(&io_error(ErrorKind::UnexpectedEof)));
    }

    #[test]
    fn unreachable_hosts_are_not_retried() {
        assert!(!is_tls_failure(&io_error(ErrorKind::ConnectionRefused)));
        assert!(!is_tls_failure(&io_error(ErrorKind::TimedOut)));
        assert!(!is_tls_failure(&sqlx::Error::PoolTimedOut));
    }

    fn kind_of(error: DriverError) -> ConnectionErrorKind {
        match error {
            DriverError::Connection { kind, .. } => kind,
            other => panic!("expected a connection error, got {other}"),
        }
    }

    #[test]
    fn certificate_errors_are_labelled() {
        assert_eq!(
            kind_of(connection_error(
                sqlx::Error::Tls("invalid peer certificate: UnknownIssuer".into()),
                TlsMode::VerifyIdentity,
            )),
            ConnectionErrorKind::TlsCertificate
        );
    }

    #[test]
    fn server_without_tls_gets_its_own_cause() {
        assert_eq!(
            kind_of(connection_error(
                sqlx::Error::Tls("server does not support TLS".into()),
                TlsMode::Required,
            )),
            ConnectionErrorKind::TlsUnavailable
        );
    }

    #[test]
    fn network_errors_keep_their_cause() {
        assert_eq!(
            kind_of(connection_error(
                io_error(ErrorKind::ConnectionRefused),
                TlsMode::Auto
            )),
            ConnectionErrorKind::Refused
        );
        assert_eq!(
            kind_of(connection_error(sqlx::Error::PoolTimedOut, TlsMode::Auto)),
            ConnectionErrorKind::Timeout
        );
    }

    #[test]
    fn every_mode_maps_to_its_sqlx_mode() {
        assert!(matches!(ssl_mode(TlsMode::Auto), PgSslMode::Prefer));
        assert!(matches!(ssl_mode(TlsMode::Required), PgSslMode::Require));
        assert!(matches!(ssl_mode(TlsMode::VerifyCa), PgSslMode::VerifyCa));
        assert!(matches!(
            ssl_mode(TlsMode::VerifyIdentity),
            PgSslMode::VerifyFull
        ));
        assert!(matches!(ssl_mode(TlsMode::Disabled), PgSslMode::Disable));
    }
}
