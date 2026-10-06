//! Ajustes de WebKitGTK (el motor del WebView en Linux) antes de crear la
//! ventana.
//!
//! Con el driver propietario de NVIDIA, el renderizador DMA-BUF de
//! WebKitGTK degrada el pintado con el uso (tirones al mover paneles, cada
//! vez peores): se desactiva, como hacen la mayoría de las apps Tauri. Con
//! Intel o AMD (Mesa) funciona bien y no se toca. Si la variable ya viene
//! puesta —en cualquier valor— se respeta: `WEBKIT_DISABLE_DMABUF_RENDERER=0`
//! la deja activa.

pub(crate) const DMABUF_VAR: &str = "WEBKIT_DISABLE_DMABUF_RENDERER";

/// La puso Rowly, no el usuario: la terminal integrada no se la pasa al shell.
static SET_BY_ROWLY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

pub(crate) fn dmabuf_set_by_rowly() -> bool {
    SET_BY_ROWLY.load(std::sync::atomic::Ordering::Relaxed)
}

fn should_disable_dmabuf(nvidia_driver: bool, already_set: bool) -> bool {
    nvidia_driver && !already_set
}

/// Se llama al principio de `main`, antes de cualquier hilo.
pub fn apply() {
    if !cfg!(target_os = "linux") {
        return;
    }
    let nvidia_driver = std::path::Path::new("/proc/driver/nvidia/version").exists();
    let already_set = std::env::var_os(DMABUF_VAR).is_some();
    if should_disable_dmabuf(nvidia_driver, already_set) {
        // SAFETY: todavía no hay otros hilos que lean el entorno.
        unsafe { std::env::set_var(DMABUF_VAR, "1") };
        SET_BY_ROWLY.store(true, std::sync::atomic::Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::should_disable_dmabuf;

    #[test]
    fn solo_con_nvidia_y_sin_valor_del_usuario() {
        assert!(should_disable_dmabuf(true, false));
        assert!(!should_disable_dmabuf(true, true));
        assert!(!should_disable_dmabuf(false, false));
        assert!(!should_disable_dmabuf(false, true));
    }
}
