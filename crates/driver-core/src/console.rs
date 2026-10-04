//! La conexion de la consola: una sola por conector (una ventana).
//!
//! Ejecutar, contar y exportar corren en ella, en orden: lo que una sentencia
//! deja en la sesion (`SET`, variables, tablas temporales, `USE`, un `BEGIN`)
//! vale para la siguiente. El catalogo, la introspeccion, cancelar y aplicar
//! los cambios del grid siguen en el pool.
//!
//! Si la conexion queda inservible (se perdio, o quedaron filas sin leer), se
//! cierra y la siguiente sentencia abre otra, sin el estado de la anterior.
//! Nunca se repite en silencio una sentencia. `epoch` cuenta esas aperturas y
//! cierres: quien la usa sabe asi que la sesion cambio.

use std::sync::atomic::{AtomicU64, Ordering};

pub struct ConsoleConnection<C> {
    slot: tokio::sync::Mutex<Option<C>>,
    epoch: AtomicU64,
}

impl<C> Default for ConsoleConnection<C> {
    fn default() -> Self {
        Self {
            slot: tokio::sync::Mutex::new(None),
            epoch: AtomicU64::new(0),
        }
    }
}

impl<C> ConsoleConnection<C> {
    /// La conexion para una sentencia, cuando termine la anterior. `open` la
    /// abre si no hay ninguna.
    pub async fn lock<E, F>(&self, open: F) -> Result<ConsoleGuard<'_, C>, E>
    where
        F: AsyncFnOnce() -> Result<C, E>,
    {
        let mut slot = self.slot.lock().await;
        if slot.is_none() {
            *slot = Some(open().await?);
            self.epoch.fetch_add(1, Ordering::Relaxed);
        }
        Ok(ConsoleGuard {
            slot,
            epoch: &self.epoch,
        })
    }

    /// Sube cada vez que se abre o se cierra la conexion.
    pub fn epoch(&self) -> u64 {
        self.epoch.load(Ordering::Relaxed)
    }
}

pub struct ConsoleGuard<'a, C> {
    slot: tokio::sync::MutexGuard<'a, Option<C>>,
    epoch: &'a AtomicU64,
}

impl<C> ConsoleGuard<'_, C> {
    pub fn connection(&mut self) -> &mut C {
        self.slot
            .as_mut()
            .expect("console connection opened in lock")
    }

    /// La conexion no se puede seguir usando: se cierra, y la siguiente
    /// sentencia abre otra.
    pub fn discard(mut self) {
        if self.slot.take().is_some() {
            self.epoch.fetch_add(1, Ordering::Relaxed);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn the_same_connection_serves_every_statement_until_it_is_discarded() {
        let console = ConsoleConnection::<u32>::default();
        let mut opened = 0;
        let mut open = async || -> Result<u32, ()> {
            opened += 1;
            Ok(opened)
        };
        assert_eq!(*console.lock(&mut open).await.unwrap().connection(), 1);
        assert_eq!(*console.lock(&mut open).await.unwrap().connection(), 1);
        assert_eq!(console.epoch(), 1);
        console.lock(&mut open).await.unwrap().discard();
        assert_eq!(console.epoch(), 2);
        assert_eq!(*console.lock(&mut open).await.unwrap().connection(), 2);
        assert_eq!(console.epoch(), 3);
    }

    #[tokio::test]
    async fn a_connection_that_does_not_open_leaves_the_slot_empty() {
        let console = ConsoleConnection::<u32>::default();
        assert!(console.lock(async || Err::<u32, _>("down")).await.is_err());
        assert_eq!(console.epoch(), 0);
        assert_eq!(
            *console
                .lock(async || Ok::<_, ()>(7))
                .await
                .unwrap()
                .connection(),
            7
        );
    }
}
