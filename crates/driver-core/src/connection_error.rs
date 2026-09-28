//! Why a connection failed, in a form the app can explain in the user's
//! language: a `ConnectionErrorKind` for the message and hint, and the raw
//! detail kept apart so it can still be copied.
//!
//! What only depends on the OS (I/O errors, the TCP probe) lives here; each
//! driver maps its own sqlx errors (login rejected, unknown database, TLS)
//! on top.

use crate::DriverError;
use serde::{Deserialize, Serialize};
use std::io::ErrorKind;
use std::time::Duration;
use tokio::net::TcpStream;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionErrorKind {
    /// Wrong user or password, or the server doesn't accept this user from
    /// this machine (Postgres' pg_hba.conf).
    AuthFailed,
    /// The login worked but the user can't use that database.
    AccessDenied,
    UnknownDatabase,
    /// DNS couldn't resolve the host name.
    HostNotFound,
    /// Nothing listening on that port.
    Refused,
    /// No network route to the host.
    Unreachable,
    Timeout,
    /// The mode requires TLS but the server doesn't offer it at all.
    TlsUnavailable,
    /// The server offers TLS, but nothing the client accepts (old servers).
    TlsIncompatible,
    TlsCertificate,
    Other,
}

impl DriverError {
    pub fn connection(kind: ConnectionErrorKind, detail: impl Into<String>) -> Self {
        DriverError::Connection {
            kind,
            detail: detail.into(),
        }
    }
}

/// Classifies an I/O error from connecting. A failed DNS lookup has no
/// `ErrorKind` of its own, so it's recognised by the message the standard
/// library and tokio give it on each OS.
pub fn io_error_kind(kind: ErrorKind, message: &str) -> ConnectionErrorKind {
    match kind {
        ErrorKind::ConnectionRefused => ConnectionErrorKind::Refused,
        ErrorKind::TimedOut => ConnectionErrorKind::Timeout,
        ErrorKind::HostUnreachable
        | ErrorKind::NetworkUnreachable
        | ErrorKind::AddrNotAvailable => ConnectionErrorKind::Unreachable,
        _ if is_lookup_failure(message) => ConnectionErrorKind::HostNotFound,
        _ => ConnectionErrorKind::Other,
    }
}

/// Classifies a failed TLS negotiation. rustls and sqlx only describe it in
/// text, so it's read from the message.
pub fn tls_failure_kind(detail: &str) -> ConnectionErrorKind {
    if detail.to_ascii_lowercase().contains("certificate") {
        ConnectionErrorKind::TlsCertificate
    } else if detail.contains("does not support TLS") {
        // sqlx: Error::Tls("server does not support TLS") cuando el servidor
        // ni siquiera ofrece TLS (p.ej. MariaDB sin certificados configurados).
        ConnectionErrorKind::TlsUnavailable
    } else {
        ConnectionErrorKind::TlsIncompatible
    }
}

fn is_lookup_failure(message: &str) -> bool {
    let message = message.to_ascii_lowercase();
    [
        "failed to lookup address",
        "could not resolve to any address",
        "name or service not known",
        "nodename nor servname",
        "no such host is known",
        "temporary failure in name resolution",
    ]
    .iter()
    .any(|pattern| message.contains(pattern))
}

/// Opens and drops a plain TCP connection to the server before the driver's
/// handshake. sqlx's pool treats "connection refused" as a server still
/// starting up and keeps retrying until its timeout, so a closed port used
/// to hang for the whole wait and end as "pool timed out"; with the probe it
/// fails right away and with its real cause. A host starting with `/` is a
/// Unix socket directory (Postgres) and is left to the driver.
pub async fn probe_tcp(host: &str, port: u16, timeout: Duration) -> Result<(), DriverError> {
    if host.starts_with('/') {
        return Ok(());
    }
    match tokio::time::timeout(timeout, TcpStream::connect((host, port))).await {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(error)) => {
            let detail = error.to_string();
            Err(DriverError::connection(
                io_error_kind(error.kind(), &detail),
                detail,
            ))
        }
        Err(_) => Err(DriverError::connection(
            ConnectionErrorKind::Timeout,
            format!("no answer from {host}:{port} after {} s", timeout.as_secs()),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::TcpListener;

    #[test]
    fn io_errors_map_to_their_cause() {
        assert_eq!(
            io_error_kind(ErrorKind::ConnectionRefused, ""),
            ConnectionErrorKind::Refused
        );
        assert_eq!(
            io_error_kind(ErrorKind::TimedOut, ""),
            ConnectionErrorKind::Timeout
        );
        assert_eq!(
            io_error_kind(ErrorKind::HostUnreachable, ""),
            ConnectionErrorKind::Unreachable
        );
        assert_eq!(
            io_error_kind(
                ErrorKind::Other,
                "failed to lookup address information: Name or service not known"
            ),
            ConnectionErrorKind::HostNotFound
        );
        assert_eq!(
            io_error_kind(ErrorKind::Other, "boom"),
            ConnectionErrorKind::Other
        );
    }

    #[test]
    fn tls_failures_are_told_apart() {
        assert_eq!(
            tls_failure_kind("invalid peer certificate: UnknownIssuer"),
            ConnectionErrorKind::TlsCertificate
        );
        assert_eq!(
            tls_failure_kind("server does not support TLS"),
            ConnectionErrorKind::TlsUnavailable
        );
        assert_eq!(
            tls_failure_kind("received fatal alert: HandshakeFailure"),
            ConnectionErrorKind::TlsIncompatible
        );
    }

    #[tokio::test]
    async fn probe_reports_a_closed_port_at_once() {
        // Un puerto que se acaba de liberar: nadie escucha ahi.
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);

        match probe_tcp("127.0.0.1", port, Duration::from_secs(5)).await {
            Err(DriverError::Connection { kind, .. }) => {
                assert_eq!(kind, ConnectionErrorKind::Refused)
            }
            other => panic!("expected a refused connection, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn probe_passes_when_something_listens() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        assert!(
            probe_tcp("127.0.0.1", port, Duration::from_secs(5))
                .await
                .is_ok()
        );
    }

    #[test]
    fn kinds_serialize_in_camel_case() {
        assert_eq!(
            serde_json::to_string(&ConnectionErrorKind::UnknownDatabase).unwrap(),
            "\"unknownDatabase\""
        );
    }
}
