//! Cancelling a running query from elsewhere (the "Cancel" action or Esc).
//!
//! A query can only be interrupted by the server, from another connection
//! (`KILL QUERY <id>` on MySQL/MariaDB, `pg_cancel_backend(pid)` on
//! Postgres), so the driver records the server-side id of the connection
//! running it while it runs. The id is cleared as soon as the query ends:
//! the connection goes back to the pool and a late cancel must not
//! interrupt whatever it runs next.

use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct QueryCancel {
    state: Mutex<CancelState>,
}

#[derive(Debug, Default)]
struct CancelState {
    backend_id: Option<u64>,
    requested: bool,
}

impl QueryCancel {
    /// Called by the driver once it knows which connection runs the query.
    /// `false` when a cancel arrived first (while waiting for a connection):
    /// then the query must not start.
    pub fn begin(&self, backend_id: u64) -> bool {
        let mut state = self.state.lock().expect("query cancel poisoned");
        if state.requested {
            return false;
        }
        state.backend_id = Some(backend_id);
        true
    }

    /// Called when the query ends, however it ends.
    pub fn end(&self) {
        self.state.lock().expect("query cancel poisoned").backend_id = None;
    }

    /// Marks the query as cancelled and returns the connection to
    /// interrupt, if it's running right now.
    pub fn request(&self) -> Option<u64> {
        let mut state = self.state.lock().expect("query cancel poisoned");
        state.requested = true;
        state.backend_id
    }

    pub fn is_requested(&self) -> bool {
        self.state.lock().expect("query cancel poisoned").requested
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_cancel_while_running_returns_the_connection_to_interrupt() {
        let cancel = QueryCancel::default();
        assert!(cancel.begin(42));
        assert_eq!(cancel.request(), Some(42));
        assert!(cancel.is_requested());
    }

    #[test]
    fn a_cancel_before_starting_keeps_the_query_from_running() {
        let cancel = QueryCancel::default();
        assert_eq!(cancel.request(), None);
        assert!(!cancel.begin(42));
    }

    #[test]
    fn a_late_cancel_never_touches_the_connection_again() {
        let cancel = QueryCancel::default();
        assert!(cancel.begin(42));
        cancel.end();
        assert_eq!(cancel.request(), None);
    }
}
