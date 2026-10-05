//! Un portal de escritorio roto retrasa el arranque en Linux (#75).
//!
//! Si xdg-desktop-portal es activable en el bus de sesion pero no llega a
//! tomar su nombre, dos llamadas sincronas del hilo principal lo esperan
//! antes de mostrar la ventana:
//!
//! - GTK 3, al registrar la aplicacion sin gestor de sesion GNOME ni Xfce
//!   (`gtk_application_impl_dbus_startup`), crea un proxy a
//!   `org.freedesktop.portal.Inhibit` con autoarranque: espera el
//!   `service_start_timeout` de D-Bus (25 s).
//! - tao, al crear la ventana, lee `color-scheme` de
//!   `org.freedesktop.portal.Settings` con 5 s de timeout.
//!
//! Ninguna tiene una opcion para no esperar: quitar la lectura de tao (la
//! feature `dbus` de tauri) haria que la app deje de seguir el modo oscuro
//! del sistema en los escritorios que lo publican por el portal. La app solo
//! puede decir, despues, que paso y donde mirar.

use std::time::Duration;

/// Con el portal sano el arranque hasta aqui tarda menos de 2 s; la espera
/// del portal, unos 30.
const SLOW_START: Duration = Duration::from_secs(10);

fn slow_start_hint(elapsed: Duration) -> Option<String> {
    (cfg!(target_os = "linux") && elapsed >= SLOW_START).then(|| {
        format!(
            "aviso: el arranque tardó {:.1} s antes de crear la ventana. En Linux suele ser \
             xdg-desktop-portal: activable en el bus de sesión pero sin responder. \
             Comprobar con `gdbus call --session --dest org.freedesktop.portal.Desktop \
             --object-path /org/freedesktop/portal/desktop --method org.freedesktop.DBus.Peer.Ping` \
             (sano: responde en menos de un segundo) y `systemctl --user status xdg-desktop-portal` (README, «Linux: slow start»).",
            elapsed.as_secs_f64()
        )
    })
}

/// Al terminar de arrancar (setup): no consulta el bus ni espera nada.
pub fn report_slow_start(elapsed: Duration) {
    if let Some(hint) = slow_start_hint(elapsed) {
        eprintln!("{hint}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solo_avisa_de_un_arranque_lento() {
        assert_eq!(slow_start_hint(Duration::from_millis(1200)), None);
        assert_eq!(slow_start_hint(Duration::from_secs(9)), None);
        let hint = slow_start_hint(Duration::from_secs(25));
        if cfg!(target_os = "linux") {
            let hint = hint.unwrap();
            assert!(hint.contains("25.0 s"), "{hint}");
            assert!(hint.contains("xdg-desktop-portal"), "{hint}");
        } else {
            assert_eq!(hint, None);
        }
    }
}
