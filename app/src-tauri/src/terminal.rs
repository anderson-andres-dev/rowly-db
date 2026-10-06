//! La terminal integrada: el backend es dueño de cada PTY y de su shell. El
//! frontend solo conoce un id, que pertenece a la ventana que lo abrió.
//!
//! Cada terminal tiene dos hilos dormidos en llamadas bloqueantes, sin
//! sondeos: el lector (`read` del PTY → canal `output`, en bytes; xterm
//! decodifica el UTF-8 aunque un carácter llegue partido entre dos lecturas)
//! y el que espera al shell (`wait` → quita la sesión del registro → canal
//! `exit`). Esperar en otro hilo y no tras el fin de la lectura es lo que
//! recoge siempre al shell: un proceso que el usuario separó (`setsid`) puede
//! dejar abierto el PTY con el shell ya muerto, y en Windows ConPTY no da fin
//! de lectura hasta que se cierra la pseudoconsola.
//!
//! Control de flujo: el frontend confirma lo que xterm ya proceso
//! (`ack_terminal`) y el lector deja de leer con mas de `MAX_UNACKED` sin
//! confirmar. Asi el PTY se llena y el kernel frena al programa que escribe.
//! Sin esto, `yes` crecia unos 80 MB/s en el backend y 40 MB/s en WebKit, y
//! al pasar xterm de 50 MB pendientes la terminal quedaba muerta.

use khipu_driver_core::Message;
use portable_pty::{ChildKiller, CommandBuilder, MasterPty, PtySize, native_pty_system};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::io::{ErrorKind, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};
use tauri::ipc::{Channel, InvokeResponseBody};

/// Las terminales abiertas, por id.
pub(crate) type Registry = Arc<Mutex<HashMap<u32, TerminalSession>>>;

pub(crate) struct TerminalSession {
    /// La ventana que la abrió: ninguna otra puede escribirle, cambiarle el
    /// tamaño ni cerrarla.
    window: String,
    /// Aparte del registro: una escritura grande puede bloquear hasta que el
    /// shell lea, y no debe retener el lock de todas las terminales.
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    flow: Arc<Flow>,
}

/// Al salir del registro (el shell termino o se cerro) el lector ya no
/// espera confirmaciones: lee hasta el final del PTY.
impl Drop for TerminalSession {
    fn drop(&mut self) {
        self.flow.close();
    }
}

/// Lo que el lector mando y xterm todavia no proceso.
#[derive(Default)]
struct Flow {
    /// Bytes sin confirmar y si la sesion ya se cerro.
    state: Mutex<(usize, bool)>,
    changed: Condvar,
}

impl Flow {
    /// Antes de mandar `bytes`: espera, dormido, mientras haya demasiado sin
    /// confirmar.
    fn reserve(&self, bytes: usize) {
        let mut state = self.state.lock().expect("terminal flow mutex poisoned");
        while state.0 > MAX_UNACKED && !state.1 {
            state = self
                .changed
                .wait(state)
                .expect("terminal flow mutex poisoned");
        }
        state.0 += bytes;
    }

    fn ack(&self, bytes: usize) {
        let mut state = self.state.lock().expect("terminal flow mutex poisoned");
        state.0 = state.0.saturating_sub(bytes);
        self.changed.notify_all();
    }

    fn close(&self) {
        self.state.lock().expect("terminal flow mutex poisoned").1 = true;
        self.changed.notify_all();
    }
}

static NEXT_ID: AtomicU32 = AtomicU32::new(1);

/// Lo que se lee del PTY de una vez: una ráfaga cruza la IPC en pocos
/// mensajes grandes y el eco de una tecla, en uno pequeño.
const READ_BUFFER: usize = 64 * 1024;

/// Lo que puede estar en camino o esperando a xterm: mas de lo que el
/// frontend acumula antes de confirmar (64 KiB) y lejos de los 50 MB en que
/// xterm empieza a descartar.
const MAX_UNACKED: usize = 1024 * 1024;

/// Cuánto espera `close` a que el shell termine con `SIGHUP` antes de cerrar
/// el PTY por su cuenta.
const CLOSE_GRACE: Duration = Duration::from_millis(500);

fn lock(registry: &Registry) -> std::sync::MutexGuard<'_, HashMap<u32, TerminalSession>> {
    registry.lock().expect("terminals mutex poisoned")
}

/// PowerShell 7 (`pwsh.exe`), si no Windows PowerShell (`powershell.exe`),
/// buscados en este orden en el `PATH`. `None`: queda ComSpec (`cmd.exe`).
#[cfg_attr(not(windows), allow(dead_code))]
fn windows_shell(path: Option<&OsStr>) -> Option<PathBuf> {
    let dirs: Vec<PathBuf> = std::env::split_paths(path?).collect();
    ["pwsh.exe", "powershell.exe"].iter().find_map(|name| {
        dirs.iter()
            .map(|dir| dir.join(name))
            .find(|candidate| candidate.is_file())
    })
}

#[derive(Debug, PartialEq)]
enum Outside {
    Unchanged,
    Kept(std::ffi::OsString),
    Empty,
}

/// Una lista de rutas (separadas por `:`) sin las que están dentro de la
/// carpeta de la AppImage. Un valor sin ninguna queda como está.
#[cfg_attr(windows, allow(dead_code))]
fn outside_appdir(value: &OsStr, appdir: &Path) -> Outside {
    // Path::starts_with("") es cierto para cualquier ruta.
    if !appdir.is_absolute() || !std::env::split_paths(value).any(|entry| entry.starts_with(appdir))
    {
        return Outside::Unchanged;
    }
    let kept: Vec<PathBuf> = std::env::split_paths(value)
        .filter(|entry| !entry.as_os_str().is_empty() && !entry.starts_with(appdir))
        .collect();
    match std::env::join_paths(kept) {
        Ok(kept) if !kept.is_empty() => Outside::Kept(kept),
        _ => Outside::Empty,
    }
}

/// Lo que muestra la cabecera del panel: el nombre del shell y la carpeta
/// en que arrancó, con `~` por HOME.
#[derive(serde::Serialize)]
pub struct TerminalInfo {
    id: u32,
    shell: String,
    cwd: String,
}

/// El shell del usuario. Linux y macOS: `$SHELL` si es ejecutable, si no el
/// de passwd, si no `/bin/sh`, como shell de login (lo resuelve
/// portable-pty). Windows: PowerShell sin logo, o ComSpec. Devuelve también
/// el nombre del shell y la carpeta para la cabecera.
fn shell_command(cwd: Option<String>) -> (CommandBuilder, String, String) {
    #[cfg(windows)]
    let (mut command, shell) = match windows_shell(std::env::var_os("PATH").as_deref()) {
        Some(powershell) => {
            let mut command = CommandBuilder::new(&powershell);
            command.arg("-NoLogo");
            (command, powershell.to_string_lossy().into_owned())
        }
        None => {
            let command = CommandBuilder::new_default_prog();
            let shell = command.get_shell();
            (command, shell)
        }
    };
    #[cfg(not(windows))]
    let (mut command, shell) = {
        let command = CommandBuilder::new_default_prog();
        let shell = command.get_shell();
        (command, shell)
    };

    // La carpeta SQL del perfil; si no hay o ya no existe, HOME.
    let home = command
        .get_env(if cfg!(windows) { "USERPROFILE" } else { "HOME" })
        .map(PathBuf::from);
    let dir = cwd
        .map(PathBuf::from)
        .filter(|dir| dir.is_dir())
        .or_else(|| home.clone());
    if let Some(dir) = &dir {
        command.cwd(dir);
    }
    // El entorno es el de la app. Solo se agrega lo que xterm necesita y se
    // quita lo que puso Rowly para su WebView.
    command.env("TERM", "xterm-256color");
    command.env("COLORTERM", "truecolor");
    if crate::webkit_env::dmabuf_set_by_rowly() {
        command.env_remove(crate::webkit_env::DMABUF_VAR);
    }
    // Dentro de una AppImage, AppRun apunta PYTHONHOME, LD_LIBRARY_PATH,
    // GTK_PATH, PATH... a la carpeta montada de la app, y con eso python3 ni
    // arranca. El shell es del usuario: se le quitan esas entradas.
    #[cfg(not(windows))]
    if let (Some(appdir), Some(_)) = (std::env::var_os("APPDIR"), std::env::var_os("APPIMAGE")) {
        for (name, value) in std::env::vars_os() {
            match outside_appdir(&value, Path::new(&appdir)) {
                Outside::Unchanged => {}
                Outside::Kept(kept) => command.env(name, kept),
                Outside::Empty => command.env_remove(name),
            }
        }
    }
    let name = Path::new(&shell)
        .file_stem()
        .map(|stem| stem.to_string_lossy().into_owned())
        .unwrap_or(shell);
    (command, name, shown_dir(dir.as_deref(), home.as_deref()))
}

fn shown_dir(dir: Option<&Path>, home: Option<&Path>) -> String {
    let Some(dir) = dir else {
        return "~".to_string();
    };
    match home.map(|home| dir.strip_prefix(home)) {
        Some(Ok(rest)) if rest.as_os_str().is_empty() => "~".to_string(),
        Some(Ok(rest)) => format!("~{}{}", std::path::MAIN_SEPARATOR, rest.display()),
        _ => dir.display().to_string(),
    }
}

fn size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        rows: rows.max(1),
        cols: cols.max(1),
        pixel_width: 0,
        pixel_height: 0,
    }
}

/// Abre el PTY, lanza `command` y deja corriendo el lector y el que espera.
fn open(
    registry: &Registry,
    window: &str,
    cols: u16,
    rows: u16,
    command: CommandBuilder,
    mut output: impl FnMut(Vec<u8>) + Send + 'static,
    exit: impl FnOnce(Option<u32>) + Send + 'static,
) -> Result<u32, Message> {
    let failed =
        |error: &dyn std::fmt::Display| Message::key("terminal.openFailed").with("error", error);
    let pair = native_pty_system()
        .openpty(size(cols, rows))
        .map_err(|e| failed(&e))?;
    let mut child = pair.slave.spawn_command(command).map_err(|e| failed(&e))?;
    // Sin soltar el lado del shell, el lector nunca veria el fin del PTY.
    drop(pair.slave);
    let killer = child.clone_killer();
    let (mut reader, writer) = match (pair.master.try_clone_reader(), pair.master.take_writer()) {
        (Ok(reader), Ok(writer)) => (reader, writer),
        (Err(e), _) | (_, Err(e)) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err(failed(&e));
        }
    };

    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    let flow = Arc::new(Flow::default());
    lock(registry).insert(
        id,
        TerminalSession {
            window: window.to_string(),
            writer: Arc::new(Mutex::new(writer)),
            master: pair.master,
            killer,
            flow: Arc::clone(&flow),
        },
    );

    std::thread::Builder::new()
        .name(format!("terminal-{id}-read"))
        .spawn(move || {
            let mut buffer = vec![0; READ_BUFFER];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(read) => {
                        flow.reserve(read);
                        output(buffer[..read].to_vec());
                    }
                    Err(e) if e.kind() == ErrorKind::Interrupted => continue,
                    // En Linux, leer un PTY sin nadie del otro lado da EIO:
                    // es su fin.
                    Err(_) => break,
                }
            }
        })
        .map_err(|e| failed(&e))?;

    let registry = Arc::clone(registry);
    std::thread::Builder::new()
        .name(format!("terminal-{id}-wait"))
        .spawn(move || {
            let code = child.wait().ok().map(|status| status.exit_code());
            // Con el shell ya muerto, soltar el PTY no le llega a nadie.
            let session = lock(&registry).remove(&id);
            drop(session);
            exit(code);
        })
        .map_err(|e| failed(&e))?;
    Ok(id)
}

/// Sin la terminal, o con su PTY ya cerrado: escribir o cambiar el tamaño
/// solo falla porque el shell terminó.
fn not_found() -> Message {
    Message::key("terminal.notFound")
}

fn write(registry: &Registry, window: &str, id: u32, data: &[u8]) -> Result<(), Message> {
    let writer = match lock(registry).get(&id) {
        Some(session) if session.window == window => Arc::clone(&session.writer),
        _ => return Err(not_found()),
    };
    let mut writer = writer.lock().expect("terminal writer mutex poisoned");
    writer
        .write_all(data)
        .and_then(|()| writer.flush())
        .map_err(|_| not_found())
}

fn resize(registry: &Registry, window: &str, id: u32, cols: u16, rows: u16) -> Result<(), Message> {
    match lock(registry).get(&id) {
        Some(session) if session.window == window => session
            .master
            .resize(size(cols, rows))
            .map_err(|_| not_found()),
        _ => Err(not_found()),
    }
}

/// Termina las terminales con estos ids: `SIGHUP` al shell (en Windows,
/// `TerminateProcess`), que lo reenvía a sus trabajos, y el que espera la
/// quita del registro. Primero la señal y después el PTY: al soltarse, el
/// writer de portable-pty escribe un salto de línea y un EOF, y con el
/// shell vivo eso ejecutaría lo que el usuario dejó escrito en el prompt. Si
/// el shell no termina a tiempo (ignora `SIGHUP`), se cierra el PTY igual:
/// el cuelgue del terminal y el fin de su entrada lo terminan.
fn shut_down(registry: &Registry, ids: &[u32]) {
    for id in ids {
        if let Some(session) = lock(registry).get_mut(id) {
            let _ = session.killer.kill();
        }
    }
    let deadline = Instant::now() + CLOSE_GRACE;
    while Instant::now() < deadline && ids.iter().any(|id| lock(registry).contains_key(id)) {
        std::thread::sleep(Duration::from_millis(10));
    }
    let left: Vec<TerminalSession> = {
        let mut sessions = lock(registry);
        ids.iter().filter_map(|id| sessions.remove(id)).collect()
    };
    drop(left);
}

/// xterm proceso `bytes` de la salida.
fn ack(registry: &Registry, window: &str, id: u32, bytes: usize) -> Result<(), Message> {
    match lock(registry).get(&id) {
        Some(session) if session.window == window => {
            session.flow.ack(bytes);
            Ok(())
        }
        _ => Err(not_found()),
    }
}

fn close(registry: &Registry, window: &str, id: u32) -> Result<(), Message> {
    match lock(registry).get(&id) {
        Some(session) if session.window == window => {}
        _ => return Err(not_found()),
    }
    shut_down(registry, &[id]);
    Ok(())
}

/// Las terminales de una ventana que se cerró.
pub(crate) fn close_window(registry: &Registry, window: &str) {
    let ids: Vec<u32> = lock(registry)
        .iter()
        .filter(|(_, session)| session.window == window)
        .map(|(id, _)| *id)
        .collect();
    if !ids.is_empty() {
        shut_down(registry, &ids);
    }
}

/// Todas, al salir de la app: con `panic = "abort"` y `process::exit` no
/// corre ningún `Drop` del estado.
pub(crate) fn close_all(registry: &Registry) {
    let ids: Vec<u32> = lock(registry).keys().copied().collect();
    if !ids.is_empty() {
        shut_down(registry, &ids);
    }
}

#[tauri::command]
pub async fn create_terminal(
    window: tauri::Window,
    state: tauri::State<'_, crate::state::AppState>,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    output: Channel<InvokeResponseBody>,
    exit: Channel<Option<u32>>,
) -> Result<TerminalInfo, Message> {
    let (command, shell, cwd) = shell_command(cwd);
    let id = open(
        &state.terminals,
        window.label(),
        cols,
        rows,
        command,
        // Si la ventana ya no está, no hay a quién mandarle nada.
        move |bytes| {
            let _ = output.send(InvokeResponseBody::Raw(bytes));
        },
        move |code| {
            let _ = exit.send(code);
        },
    )?;
    Ok(TerminalInfo { id, shell, cwd })
}

/// `binary`: lo que xterm entrega por `onBinary` (reportes de ratón
/// antiguos), un byte por carácter; el resto es texto UTF-8.
#[tauri::command]
pub async fn write_terminal(
    window: tauri::Window,
    state: tauri::State<'_, crate::state::AppState>,
    id: u32,
    data: String,
    binary: bool,
) -> Result<(), Message> {
    let terminals = Arc::clone(&state.terminals);
    let window = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || {
        if binary {
            let bytes: Vec<u8> = data.chars().map(|c| c as u32 as u8).collect();
            write(&terminals, &window, id, &bytes)
        } else {
            write(&terminals, &window, id, data.as_bytes())
        }
    })
    .await
    .map_err(|_| not_found())?
}

#[tauri::command]
pub async fn resize_terminal(
    window: tauri::Window,
    state: tauri::State<'_, crate::state::AppState>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), Message> {
    resize(&state.terminals, window.label(), id, cols, rows)
}

#[tauri::command]
pub async fn ack_terminal(
    window: tauri::Window,
    state: tauri::State<'_, crate::state::AppState>,
    id: u32,
    bytes: u32,
) -> Result<(), Message> {
    ack(&state.terminals, window.label(), id, bytes as usize)
}

#[tauri::command]
pub async fn close_terminal(
    window: tauri::Window,
    state: tauri::State<'_, crate::state::AppState>,
    id: u32,
) -> Result<(), Message> {
    let terminals = Arc::clone(&state.terminals);
    let window = window.label().to_string();
    tauri::async_runtime::spawn_blocking(move || close(&terminals, &window, id))
        .await
        .map_err(|_| not_found())?
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::sync::mpsc;

    /// Un bash interactivo sin la configuración del usuario: el prompt y lo
    /// que hace al recibir `SIGHUP` son los de bash, no los de un rc. Sin
    /// expansión del historial (`+H`): el bash 3.2 de macOS la aplica a `$!`.
    fn bash() -> CommandBuilder {
        let mut command = CommandBuilder::new("bash");
        command.args(["--noprofile", "--norc", "+H", "-i"]);
        command.env("PS1", "$ ");
        command.env("TERM", "xterm-256color");
        command
    }

    struct Opened {
        id: u32,
        output: mpsc::Receiver<Vec<u8>>,
        exit: mpsc::Receiver<Option<u32>>,
        seen: Vec<u8>,
    }

    impl Opened {
        /// Lee hasta que lo recibido contenga `needle` (o falla a los 10 s).
        fn until(&mut self, needle: &str) -> String {
            let deadline = Instant::now() + Duration::from_secs(10);
            loop {
                let text = String::from_utf8_lossy(&self.seen).to_string();
                if text.contains(needle) {
                    return text;
                }
                let left = deadline.saturating_duration_since(Instant::now());
                match self.output.recv_timeout(left) {
                    Ok(bytes) => self.seen.extend(bytes),
                    Err(_) => panic!("sin {needle:?} en la salida: {text:?}"),
                }
            }
        }
    }

    fn start(registry: &Registry, window: &str, command: CommandBuilder) -> Opened {
        let (output_tx, output) = mpsc::channel();
        let (exit_tx, exit) = mpsc::channel();
        let id = open(
            registry,
            window,
            80,
            24,
            command,
            move |bytes| {
                let _ = output_tx.send(bytes);
            },
            move |code| {
                let _ = exit_tx.send(code);
            },
        )
        .expect("abrir la terminal");
        Opened {
            id,
            output,
            exit,
            seen: Vec::new(),
        }
    }

    fn alive(pid: u32) -> bool {
        // Un zombi también responde a `kill -0`: que no responda es que se
        // recogió.
        std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stderr(std::process::Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
    }

    fn gone(pids: &[u32]) -> bool {
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline {
            if pids.iter().all(|pid| !alive(*pid)) {
                return true;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        false
    }

    impl Opened {
        /// El número que el shell imprimió tras `marker` (el eco del comando
        /// tiene la marca seguida de `$`, no de cifras).
        fn pid(&mut self, marker: &str) -> u32 {
            let deadline = Instant::now() + Duration::from_secs(10);
            loop {
                let text = String::from_utf8_lossy(&self.seen).to_string();
                for (at, _) in text.match_indices(marker) {
                    let rest = &text[at + marker.len()..];
                    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
                    if !digits.is_empty() && rest[digits.len()..].starts_with(['\r', '\n']) {
                        return digits.parse().unwrap();
                    }
                }
                let left = deadline.saturating_duration_since(Instant::now());
                match self.output.recv_timeout(left) {
                    Ok(bytes) => self.seen.extend(bytes),
                    Err(_) => panic!("sin {marker:?} en la salida: {text:?}"),
                }
            }
        }
    }

    #[test]
    fn el_shell_del_usuario_abre_responde_y_al_cerrar_no_queda() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", shell_command(None).0);
        write(&registry, "main", terminal.id, b"echo PID=$$\r").unwrap();
        let pid = terminal.pid("PID=");
        close(&registry, "main", terminal.id).unwrap();
        assert!(lock(&registry).is_empty());
        assert!(gone(&[pid]), "el shell {pid} sigue vivo");
        assert!(terminal.exit.recv_timeout(Duration::from_secs(5)).is_ok());
    }

    #[test]
    fn el_tamano_llega_al_shell() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", bash());
        terminal.until("$ ");
        resize(&registry, "main", terminal.id, 100, 30).unwrap();
        write(&registry, "main", terminal.id, b"stty size\r").unwrap();
        terminal.until("30 100");
        close(&registry, "main", terminal.id).unwrap();
    }

    #[test]
    fn un_caracter_partido_entre_dos_lecturas_llega_entero() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", bash());
        terminal.until("$ ");
        // Los dos primeros bytes de € (E2 82 AC), una pausa y el tercero.
        write(
            &registry,
            "main",
            terminal.id,
            b"printf '\\342\\202'; sleep 0.3; printf '\\254\\n'\r",
        )
        .unwrap();
        let mut chunks: Vec<Vec<u8>> = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(10);
        while !chunks.concat().windows(3).any(|w| w == "€".as_bytes()) {
            let left = deadline.saturating_duration_since(Instant::now());
            chunks.push(terminal.output.recv_timeout(left).expect("el €"));
        }
        assert!(
            chunks.iter().any(|chunk| chunk.ends_with(&[0xE2, 0x82])),
            "el carácter no llegó partido: {chunks:?}"
        );
        close(&registry, "main", terminal.id).unwrap();
    }

    #[test]
    fn cien_aperturas_y_cierres_no_dejan_procesos_ni_registros() {
        let registry = Registry::default();
        let mut pids = Vec::new();
        for _ in 0..100 {
            let mut terminal = start(&registry, "main", bash());
            // El shell, un trabajo en segundo plano y otro en primer plano.
            write(
                &registry,
                "main",
                terminal.id,
                b"echo S=$$; sleep 1000 & echo J=$!; sh -c 'echo F=$$; exec sleep 1000'\r",
            )
            .unwrap();
            pids.extend(["S=", "J=", "F="].map(|marker| terminal.pid(marker)));
            close(&registry, "main", terminal.id).unwrap();
            assert!(terminal.exit.recv_timeout(Duration::from_secs(5)).is_ok());
        }
        assert!(lock(&registry).is_empty());
        let alive: Vec<u32> = pids.iter().copied().filter(|pid| alive(*pid)).collect();
        assert!(gone(&pids), "siguen vivos: {alive:?}");
    }

    /// Lo recibido hasta que pasan `quiet` sin nada nuevo.
    fn drain(terminal: &mut Opened, quiet: Duration) -> usize {
        let mut total = 0;
        while let Ok(bytes) = terminal.output.recv_timeout(quiet) {
            total += bytes.len();
            terminal.seen.extend(bytes);
        }
        total
    }

    #[test]
    fn sin_confirmar_el_lector_se_detiene_y_al_confirmar_sigue() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", bash());
        terminal.until("$ ");
        // 4 MB sin confirmar nada: el lector para en MAX_UNACKED (más una
        // lectura) y el resto espera en el PTY.
        write(
            &registry,
            "main",
            terminal.id,
            b"head -c 4000000 /dev/zero | tr '\\0' a; echo; echo FIN-$((6*7))\r",
        )
        .unwrap();
        let first = drain(&mut terminal, Duration::from_millis(800));
        assert!(
            first <= MAX_UNACKED + 2 * READ_BUFFER,
            "sin confirmar llegaron {first} bytes"
        );
        // Confirmando lo recibido llega todo.
        let mut total = first;
        let deadline = Instant::now() + Duration::from_secs(30);
        while !String::from_utf8_lossy(&terminal.seen).contains("FIN-42") {
            assert!(
                Instant::now() < deadline,
                "no llegó el final con {total} bytes"
            );
            ack(&registry, "main", terminal.id, total).unwrap();
            total = drain(&mut terminal, Duration::from_millis(50));
        }
        let received = terminal.seen.iter().filter(|byte| **byte == b'a').count();
        assert!(received >= 4_000_000, "llegaron {received} de 4000000");
        close(&registry, "main", terminal.id).unwrap();
    }

    #[test]
    fn cerrar_con_el_lector_detenido_no_deja_nada() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", bash());
        write(&registry, "main", terminal.id, b"echo S=$$; yes\r").unwrap();
        let pid = terminal.pid("S=");
        drain(&mut terminal, Duration::from_millis(500));
        close(&registry, "main", terminal.id).unwrap();
        assert!(lock(&registry).is_empty());
        assert!(terminal.exit.recv_timeout(Duration::from_secs(5)).is_ok());
        assert!(gone(&[pid]), "el shell {pid} sigue vivo");
        // El lector termina: suelta el canal de salida.
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            match terminal.output.recv_timeout(Duration::from_millis(100)) {
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
                _ => assert!(Instant::now() < deadline, "el lector sigue vivo"),
            }
        }
    }

    #[test]
    fn una_ventana_no_opera_la_terminal_de_otra() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "connection-a", bash());
        terminal.until("$ ");
        assert!(write(&registry, "connection-b", terminal.id, b"exit\r").is_err());
        assert!(resize(&registry, "connection-b", terminal.id, 10, 10).is_err());
        assert!(ack(&registry, "connection-b", terminal.id, 10).is_err());
        assert!(close(&registry, "connection-b", terminal.id).is_err());
        close_window(&registry, "connection-b");
        assert!(lock(&registry).contains_key(&terminal.id));
        close_window(&registry, "connection-a");
        assert!(lock(&registry).is_empty());
    }

    #[test]
    fn salir_del_shell_lo_quita_del_registro_y_avisa() {
        let registry = Registry::default();
        let mut terminal = start(&registry, "main", bash());
        terminal.until("$ ");
        write(&registry, "main", terminal.id, b"exit 3\r").unwrap();
        assert_eq!(
            terminal.exit.recv_timeout(Duration::from_secs(5)).unwrap(),
            Some(3)
        );
        assert!(lock(&registry).is_empty());
    }

    #[test]
    fn close_all_cierra_las_de_todas_las_ventanas() {
        let registry = Registry::default();
        let mut a = start(&registry, "main", bash());
        let mut b = start(&registry, "connection-a", bash());
        a.until("$ ");
        b.until("$ ");
        close_all(&registry);
        assert!(lock(&registry).is_empty());
    }
}

#[cfg(test)]
mod shell_tests {
    use super::{Outside, outside_appdir, shown_dir, windows_shell};
    use std::fs;
    use std::path::{MAIN_SEPARATOR, Path};

    #[test]
    fn la_cabecera_muestra_la_carpeta_con_virgulilla_por_home() {
        let home = std::env::temp_dir();
        let inside = home.join("sql").join("ventas");
        assert_eq!(shown_dir(Some(&home), Some(&home)), "~");
        assert_eq!(
            shown_dir(Some(&inside), Some(&home)),
            format!("~{MAIN_SEPARATOR}sql{MAIN_SEPARATOR}ventas")
        );
        let outside = Path::new("/srv");
        assert_eq!(
            shown_dir(Some(outside), Some(&home)),
            outside.display().to_string()
        );
        assert_eq!(shown_dir(None, Some(&home)), "~");
    }

    // Lo que AppRun dejó en la AppImage medida en CI (ubuntu-22.04).
    #[cfg(unix)]
    #[test]
    fn el_shell_no_hereda_las_rutas_de_la_appimage() {
        use std::ffi::OsStr;
        let appdir = Path::new("/tmp/appimage_extracted_fb50");
        let outside = |value: &str| outside_appdir(OsStr::new(value), appdir);
        assert_eq!(outside("/tmp/appimage_extracted_fb50/usr/"), Outside::Empty);
        assert_eq!(
            outside(
                "/tmp/appimage_extracted_fb50/usr/lib/:/tmp/appimage_extracted_fb50//usr/lib/x86_64-linux-gnu/:"
            ),
            Outside::Empty
        );
        assert_eq!(
            outside("/tmp/appimage_extracted_fb50/usr/bin/:/home/u/.cargo/bin:/usr/bin"),
            Outside::Kept("/home/u/.cargo/bin:/usr/bin".into())
        );
        // Lo que no apunta a la AppImage no se toca, ni una carpeta que solo
        // empieza igual.
        assert_eq!(
            outside("/usr/share::/var/lib/snapd/desktop"),
            Outside::Unchanged
        );
        assert_eq!(
            outside("/tmp/appimage_extracted_fb50x/usr"),
            Outside::Unchanged
        );
        assert_eq!(
            outside_appdir(OsStr::new("/usr/bin"), Path::new("")),
            Outside::Unchanged
        );
    }

    #[test]
    fn en_windows_powershell_7_antes_que_windows_powershell_y_si_no_comspec() {
        let root = std::env::temp_dir().join(format!("rowly-shell-{}", std::process::id()));
        let (first, second) = (root.join("a"), root.join("b"));
        fs::create_dir_all(&first).unwrap();
        fs::create_dir_all(&second).unwrap();
        let path = std::env::join_paths([&first, &second]).unwrap();

        assert_eq!(windows_shell(Some(&path)), None);
        assert_eq!(windows_shell(None), None);

        fs::write(second.join("powershell.exe"), "").unwrap();
        assert_eq!(
            windows_shell(Some(&path)),
            Some(second.join("powershell.exe"))
        );

        // pwsh gana aunque su carpeta vaya después en el PATH.
        fs::write(first.join("powershell.exe"), "").unwrap();
        fs::write(second.join("pwsh.exe"), "").unwrap();
        assert_eq!(windows_shell(Some(&path)), Some(second.join("pwsh.exe")));

        fs::remove_dir_all(&root).unwrap();
    }
}
