//! TLS negotiation for MySQL/MariaDB connections: how each `TlsMode` maps
//! to sqlx, when `Auto` falls back to an unencrypted connection, and how to
//! read back what was actually negotiated.
//!
//! The Postgres driver has the same shape in its own `tls.rs`; the part that
//! classifies errors is identical on purpose (driver-core stays free of
//! sqlx, so it can't host it).

use crate::RawStatement;
use khipu_driver_core::{
    ConnectionErrorKind, DriverError, TlsMode, TlsStatus, io_error_kind, tls_failure_kind,
};
use sqlx::mysql::{MySqlConnectOptions, MySqlDatabaseError, MySqlSslMode};
use sqlx::{Executor, MySqlPool, Row};
use std::io::ErrorKind;

pub fn ssl_mode(mode: TlsMode) -> MySqlSslMode {
    match mode {
        TlsMode::Auto => MySqlSslMode::Preferred,
        TlsMode::Required => MySqlSslMode::Required,
        TlsMode::VerifyCa => MySqlSslMode::VerifyCa,
        TlsMode::VerifyIdentity => MySqlSslMode::VerifyIdentity,
        TlsMode::Disabled => MySqlSslMode::Disabled,
    }
}

pub fn apply(
    options: MySqlConnectOptions,
    mode: TlsMode,
    ca_certificate_path: Option<&str>,
) -> MySqlConnectOptions {
    let options = options.ssl_mode(ssl_mode(mode));
    match ca_certificate_path.filter(|path| mode.verifies_certificate() && !path.is_empty()) {
        Some(path) => options.ssl_ca(path),
        None => options,
    }
}

/// Whether `error` came from TLS negotiation, as opposed to the server
/// rejecting the login (`Error::Database`) or not being reachable at all
/// (refused / timed out). Only the former is worth retrying unencrypted:
/// retrying a wrong password in clear text would be pointless and leak it,
/// and retrying an unreachable host would just double the wait.
///
/// rustls surfaces a failed handshake either as `Error::Tls` or as an I/O
/// error carrying the TLS alert (`InvalidData`, e.g. MySQL 5.7's
/// "received fatal alert: HandshakeFailure"), and a server that drops the
/// socket mid-handshake as `UnexpectedEof`/`ConnectionReset`.
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
            // Codigos de MySQL/MariaDB: el SQLSTATE (28000, 42000) no los
            // distingue.
            sqlx::Error::Database(database) => {
                match database
                    .try_downcast_ref::<MySqlDatabaseError>()
                    .map(MySqlDatabaseError::number)
                {
                    Some(1045) => ConnectionErrorKind::AuthFailed,
                    Some(1044) => ConnectionErrorKind::AccessDenied,
                    Some(1049) => ConnectionErrorKind::UnknownDatabase,
                    _ => ConnectionErrorKind::Other,
                }
            }
            sqlx::Error::PoolTimedOut => ConnectionErrorKind::Timeout,
            sqlx::Error::Io(io) => io_error_kind(io.kind(), &detail),
            _ => ConnectionErrorKind::Other,
        }
    };
    DriverError::connection(kind, detail)
}

/// Reads `Ssl_version`/`Ssl_cipher` for the session: both are empty strings
/// on an unencrypted connection. Unprepared on purpose (`RawStatement`):
/// not every server version accepts `SHOW STATUS` as a prepared statement.
pub async fn read_status(pool: &MySqlPool, fell_back: bool) -> TlsStatus {
    let rows = pool
        .fetch_all(RawStatement(
            "SHOW SESSION STATUS WHERE Variable_name IN ('Ssl_version', 'Ssl_cipher')",
        ))
        .await;

    let Ok(rows) = rows else {
        return TlsStatus {
            encrypted: None,
            detail: None,
            fell_back,
        };
    };

    let mut version = String::new();
    let mut cipher = String::new();
    for row in rows {
        let text = |index: usize| {
            row.try_get_unchecked::<Option<Vec<u8>>, _>(index)
                .ok()
                .flatten()
                .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
                .unwrap_or_default()
        };
        match text(0).as_str() {
            "Ssl_version" => version = text(1),
            "Ssl_cipher" => cipher = text(1),
            _ => {}
        }
    }

    status_from(&version, &cipher, fell_back)
}

fn status_from(version: &str, cipher: &str, fell_back: bool) -> TlsStatus {
    let encrypted = !cipher.is_empty();
    let detail = encrypted.then(|| {
        [version, cipher]
            .into_iter()
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>()
            .join(" · ")
    });
    TlsStatus {
        encrypted: Some(encrypted),
        detail,
        fell_back,
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
        assert!(is_tls_failure(&io_error(ErrorKind::ConnectionReset)));
    }

    #[test]
    fn unreachable_hosts_and_bad_credentials_are_not_retried() {
        assert!(!is_tls_failure(&io_error(ErrorKind::ConnectionRefused)));
        assert!(!is_tls_failure(&io_error(ErrorKind::TimedOut)));
        assert!(!is_tls_failure(&sqlx::Error::PoolTimedOut));
        assert!(!is_tls_failure(&sqlx::Error::Protocol(
            "Access denied".into()
        )));
    }

    fn kind_of(error: DriverError) -> ConnectionErrorKind {
        match error {
            DriverError::Connection { kind, .. } => kind,
            other => panic!("expected a connection error, got {other}"),
        }
    }

    #[test]
    fn tls_errors_get_their_own_cause() {
        assert_eq!(
            kind_of(connection_error(
                io_error(ErrorKind::InvalidData),
                TlsMode::Required
            )),
            ConnectionErrorKind::TlsIncompatible
        );
        assert_eq!(
            kind_of(connection_error(
                sqlx::Error::Tls("invalid peer certificate: UnknownIssuer".into()),
                TlsMode::VerifyCa,
            )),
            ConnectionErrorKind::TlsCertificate
        );
        assert_eq!(
            kind_of(connection_error(
                io_error(ErrorKind::ConnectionRefused),
                TlsMode::Required
            )),
            ConnectionErrorKind::Refused
        );
        assert_eq!(
            kind_of(connection_error(sqlx::Error::PoolTimedOut, TlsMode::Auto)),
            ConnectionErrorKind::Timeout
        );
    }

    #[test]
    fn status_reports_protocol_and_cipher() {
        assert_eq!(
            status_from("TLSv1.3", "TLS_AES_256_GCM_SHA384", false),
            TlsStatus {
                encrypted: Some(true),
                detail: Some("TLSv1.3 · TLS_AES_256_GCM_SHA384".to_string()),
                fell_back: false,
            }
        );
        assert_eq!(
            status_from("", "", true),
            TlsStatus {
                encrypted: Some(false),
                detail: None,
                fell_back: true,
            }
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
    fn every_mode_maps_to_its_sqlx_mode() {
        assert!(matches!(ssl_mode(TlsMode::Auto), MySqlSslMode::Preferred));
        assert!(matches!(
            ssl_mode(TlsMode::Required),
            MySqlSslMode::Required
        ));
        assert!(matches!(
            ssl_mode(TlsMode::VerifyCa),
            MySqlSslMode::VerifyCa
        ));
        assert!(matches!(
            ssl_mode(TlsMode::VerifyIdentity),
            MySqlSslMode::VerifyIdentity
        ));
        assert!(matches!(
            ssl_mode(TlsMode::Disabled),
            MySqlSslMode::Disabled
        ));
    }
}
