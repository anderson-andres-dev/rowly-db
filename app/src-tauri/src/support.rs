//! Paquetes de soporte de version (SQL_ENGINE.md §11): revisiones de las
//! lineas de cada motor publicadas despues de la app, como datos firmados.
//!
//! - Datos y validacion: `khipu_engine::lines` (`Package`, `with_packages`),
//!   la misma que valida las lineas incluidas. Nada de codigo, nada que toque
//!   el guard.
//! - Confianza: el indice y cada paquete van firmados con la clave de las
//!   actualizaciones de la app (`plugins.updater.pubkey` de tauri.conf.json)
//!   y el paquete coincide en tamaño y SHA-256 con su entrada del indice.
//! - Almacenamiento: `<datos de la app>/support/`; un paquete instalado se
//!   guarda junto con su firma y se vuelve a verificar cada vez que se lee.
//!   Instalar escribe un temporal y lo renombra: nunca queda uno a medias.
//! - Red: solo al pedirlo el usuario (Ajustes → Motores). Conectar no la
//!   usa; sin red, sin indice o sin paquetes la app usa las lineas incluidas.
//! - Activacion: las lineas activas de cada motor (`Dialect::activate_lines`)
//!   cambian bajo `ACTIVATION`, que `connect` toma para leer; una conexion
//!   abierta conserva las que tomo al conectar.

use crate::engine_context;
use base64::Engine as _;
use khipu_driver_core::Message;
use khipu_engine::Dialect;
use khipu_engine::lines::{EngineLines, Origin, PACKAGE_MAX_BYTES, Package};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};

/// El unico formato de indice que esta app sabe leer.
const INDEX_FORMAT: u32 = 1;
const INDEX_MAX_BYTES: usize = 1024 * 1024;
const STATE_FORMAT: u32 = 1;

/// Donde se publican el indice y los paquetes (tools/support/publish.mjs).
const DEFAULT_BASE_URL: &str =
    "https://github.com/anderson-andres-dev/rowly-db/releases/download/support-packages";
// Para probar contra un servidor local sin publicar nada.
const BASE_URL_ENV: &str = "ROWLY_SUPPORT_URL";

/// Cambiar las lineas activas lo toma para escribir; conectar, para leer: el
/// driver y el contexto de una conexion ven la misma revision.
pub(crate) static ACTIVATION: tokio::sync::RwLock<()> = tokio::sync::RwLock::const_new(());

/// El ultimo indice verificado, para mostrar actualizaciones sin volver a
/// pedirlo.
static INDEX: Mutex<Option<Index>> = Mutex::new(None);

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Index {
    format: u32,
    /// El commit del que salen los paquetes y su evidencia.
    #[allow(dead_code)]
    commit: String,
    packages: Vec<IndexEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct IndexEntry {
    engine: String,
    line: String,
    revision: u32,
    requires_app: String,
    file: String,
    size: usize,
    sha256: String,
}

/// Un paquete instalado: el texto tal como se firmo y su firma.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Installed {
    package: String,
    signature: String,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct State {
    format: u32,
    /// Lineas que el usuario desactivo: `[motor, linea]`.
    disabled: Vec<(String, String)>,
}

/// Por que no se acepta algo. Cada uno es una clave de mensaje.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Rejected {
    Signature,
    Integrity,
    Format(String),
    /// El paquete no dice lo mismo que su entrada del indice.
    Mismatch,
    RequiresApp(String),
    /// No cabe entre las demas lineas del motor.
    Conflict(String),
    NotFound,
    LastLine,
    Network(String),
    Storage(String),
}

impl From<Rejected> for Message {
    fn from(rejected: Rejected) -> Self {
        match rejected {
            Rejected::Signature => Message::key("support.signature"),
            Rejected::Integrity => Message::key("support.integrity"),
            Rejected::Format(detail) => Message::key("support.format").with("detail", detail),
            Rejected::Mismatch => Message::key("support.mismatch"),
            Rejected::RequiresApp(version) => {
                Message::key("support.requiresApp").with("version", version)
            }
            Rejected::Conflict(detail) => Message::key("support.conflict").with("detail", detail),
            Rejected::NotFound => Message::key("support.notFound"),
            Rejected::LastLine => Message::key("support.lastLine"),
            Rejected::Network(detail) => Message::key("support.network").with("detail", detail),
            Rejected::Storage(detail) => Message::key("support.storage").with("detail", detail),
        }
    }
}

/// La firma minisign de `data`, como la escribe `tauri signer sign` y la
/// verifica el updater: clave y firma en base64.
fn verify_signature(pubkey: &str, data: &[u8], signature: &str) -> Result<(), Rejected> {
    let decode = |text: &str| {
        base64::engine::general_purpose::STANDARD
            .decode(text.trim())
            .ok()
            .and_then(|bytes| String::from_utf8(bytes).ok())
            .ok_or(Rejected::Signature)
    };
    let key =
        minisign_verify::PublicKey::decode(&decode(pubkey)?).map_err(|_| Rejected::Signature)?;
    let signature =
        minisign_verify::Signature::decode(&decode(signature)?).map_err(|_| Rejected::Signature)?;
    key.verify(data, &signature, false)
        .map_err(|_| Rejected::Signature)
}

/// Un indice firmado y con un formato que esta app conoce, una entrada por
/// linea y nombres de archivo planos.
pub(crate) fn read_index(pubkey: &str, bytes: &[u8], signature: &str) -> Result<Index, Rejected> {
    if bytes.len() > INDEX_MAX_BYTES {
        return Err(Rejected::Integrity);
    }
    verify_signature(pubkey, bytes, signature)?;
    parse_index(bytes)
}

fn parse_index(bytes: &[u8]) -> Result<Index, Rejected> {
    let index: Index =
        serde_json::from_slice(bytes).map_err(|error| Rejected::Format(error.to_string()))?;
    if index.format != INDEX_FORMAT {
        return Err(Rejected::Format(format!(
            "indice de formato {}",
            index.format
        )));
    }
    let mut seen = std::collections::BTreeSet::new();
    for entry in &index.packages {
        let plain = !entry.file.is_empty()
            && !entry.file.starts_with('.')
            && entry
                .file
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));
        if !plain || !seen.insert((entry.engine.clone(), entry.line.clone())) {
            return Err(Rejected::Format(format!("entrada {}", entry.file)));
        }
    }
    Ok(index)
}

/// Un paquete descargado frente a su entrada del indice: tamaño, SHA-256,
/// firma, formato, que diga lo mismo que la entrada y que esta app lo sepa
/// usar. Recien entonces es un paquete.
pub(crate) fn check_package(
    pubkey: &str,
    entry: &IndexEntry,
    bytes: &[u8],
    signature: &str,
    app_version: &str,
) -> Result<Package, Rejected> {
    if bytes.len() != entry.size || bytes.len() > PACKAGE_MAX_BYTES {
        return Err(Rejected::Integrity);
    }
    if hex(&Sha256::digest(bytes)) != entry.sha256.to_ascii_lowercase() {
        return Err(Rejected::Integrity);
    }
    verify_signature(pubkey, bytes, signature)?;
    let text = std::str::from_utf8(bytes).map_err(|_| Rejected::Integrity)?;
    let package = Package::parse(text).map_err(Rejected::Format)?;
    if package.engine != entry.engine
        || package.line.line != entry.line
        || package.line.revision != entry.revision
        || package.requires_app != entry.requires_app
    {
        return Err(Rejected::Mismatch);
    }
    if !package.compatible_with(app_version) {
        return Err(Rejected::RequiresApp(package.requires_app));
    }
    Ok(package)
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// `<datos de la app>/support/`: los paquetes instalados y las lineas
/// desactivadas.
pub(crate) struct Store {
    dir: PathBuf,
}

impl Store {
    pub(crate) fn new(dir: PathBuf) -> Self {
        Self { dir }
    }

    fn installed_dir(&self) -> PathBuf {
        self.dir.join("installed")
    }

    fn package_path(&self, engine: &str, line: &str) -> PathBuf {
        self.installed_dir().join(format!("{engine}-{line}.json"))
    }

    /// Los paquetes instalados que siguen siendo validos: firma, formato y
    /// compatibilidad se vuelven a comprobar al leerlos. Uno que no pasa se
    /// ignora (vale la linea incluida); un temporal de una instalacion
    /// cortada se borra.
    pub(crate) fn installed(&self, pubkey: &str, app_version: &str) -> Vec<Package> {
        let Ok(entries) = std::fs::read_dir(self.installed_dir()) else {
            return Vec::new();
        };
        let mut found = Vec::new();
        for path in entries.flatten().map(|entry| entry.path()) {
            if path.extension().is_some_and(|ext| ext == "tmp") {
                let _ = std::fs::remove_file(&path);
                continue;
            }
            let read = std::fs::read(&path)
                .ok()
                .and_then(|bytes| serde_json::from_slice::<Installed>(&bytes).ok());
            let Some(installed) = read else { continue };
            let valid =
                verify_signature(pubkey, installed.package.as_bytes(), &installed.signature)
                    .ok()
                    .and_then(|()| Package::parse(&installed.package).ok())
                    .filter(|package| package.compatible_with(app_version))
                    .filter(|package| {
                        path == self.package_path(&package.engine, &package.line.line)
                    });
            found.extend(valid);
        }
        found.sort_by(|a, b| (&a.engine, &a.line.line).cmp(&(&b.engine, &b.line.line)));
        found
    }

    /// Guarda un paquete ya comprobado: primero un temporal completo, despues
    /// un rename sobre el anterior. Si algo falla antes del rename, el
    /// anterior sigue intacto.
    pub(crate) fn install(
        &self,
        package: &Package,
        text: &str,
        signature: &str,
    ) -> Result<(), Rejected> {
        let storage = |error: std::io::Error| Rejected::Storage(error.to_string());
        std::fs::create_dir_all(self.installed_dir()).map_err(storage)?;
        let target = self.package_path(&package.engine, &package.line.line);
        let contents = serde_json::to_vec(&Installed {
            package: text.to_string(),
            signature: signature.to_string(),
        })
        .map_err(|error| Rejected::Storage(error.to_string()))?;
        write_atomically(&target, &contents).map_err(storage)
    }

    pub(crate) fn remove(&self, engine: &str, line: &str) -> Result<(), Rejected> {
        match std::fs::remove_file(self.package_path(engine, line)) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => {
                Err(Rejected::Storage(error.to_string()))
            }
            _ => Ok(()),
        }
    }

    fn state(&self) -> State {
        std::fs::read(self.dir.join("state.json"))
            .ok()
            .and_then(|bytes| serde_json::from_slice::<State>(&bytes).ok())
            .filter(|state| state.format == STATE_FORMAT)
            .unwrap_or(State {
                format: STATE_FORMAT,
                disabled: Vec::new(),
            })
    }

    pub(crate) fn disabled(&self, engine: &str) -> Vec<String> {
        self.state()
            .disabled
            .into_iter()
            .filter(|(of, _)| of == engine)
            .map(|(_, line)| line)
            .collect()
    }

    pub(crate) fn set_enabled(
        &self,
        engine: &str,
        line: &str,
        enabled: bool,
    ) -> Result<(), Rejected> {
        let mut state = self.state();
        state
            .disabled
            .retain(|(of, id)| (of.as_str(), id.as_str()) != (engine, line));
        if !enabled {
            state.disabled.push((engine.to_string(), line.to_string()));
        }
        let storage = |error: std::io::Error| Rejected::Storage(error.to_string());
        std::fs::create_dir_all(&self.dir).map_err(storage)?;
        let contents =
            serde_json::to_vec(&state).map_err(|error| Rejected::Storage(error.to_string()))?;
        write_atomically(&self.dir.join("state.json"), &contents).map_err(storage)
    }
}

fn write_atomically(target: &Path, contents: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let temporary = target.with_extension("json.tmp");
    let mut file = std::fs::File::create(&temporary)?;
    file.write_all(contents)?;
    file.sync_all()?;
    drop(file);
    std::fs::rename(&temporary, target)
}

/// Las lineas activas de cada motor: las incluidas, con los paquetes
/// instalados que caben (uno que choca con las demas lineas se deja fuera) y
/// las desactivadas por el usuario. Si con eso no quedara ninguna activa, se
/// ignora lo desactivado.
pub(crate) fn resolve(
    store: &Store,
    pubkey: &str,
    app_version: &str,
) -> Vec<(Dialect, EngineLines)> {
    let installed = store.installed(pubkey, app_version);
    Dialect::ALL
        .into_iter()
        .map(|dialect| {
            let bundled = dialect.bundled_lines();
            let accepted = fitting(dialect, installed.iter().cloned());
            let lines = bundled
                .with_packages(&accepted, &store.disabled(dialect.id()))
                .or_else(|_| bundled.with_packages(&accepted, &[]))
                .expect("cada paquete aceptado ya cupo");
            (dialect, lines)
        })
        .collect()
}

/// Los paquetes del motor que caben entre sus lineas, en orden: uno que choca
/// con los anteriores se deja fuera.
fn fitting(dialect: Dialect, packages: impl IntoIterator<Item = Package>) -> Vec<Package> {
    let bundled = dialect.bundled_lines();
    let mut accepted: Vec<Package> = Vec::new();
    for package in packages
        .into_iter()
        .filter(|package| package.engine == dialect.id())
    {
        accepted.push(package);
        if bundled.with_packages(&accepted, &[]).is_err() {
            accepted.pop();
        }
    }
    accepted
}

/// Lo que la pantalla Motores muestra de una linea. El soporte del
/// fabricante y la verificacion salen de lo compilado en la app, nunca de un
/// paquete: instalar uno no vuelve verificada ninguna version.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LineStatus {
    engine: &'static str,
    line: String,
    /// La revision que trae la app; None si la linea solo llego en un paquete.
    included_revision: Option<u32>,
    /// La revision descargada instalada, aunque la incluida sea mas nueva.
    downloaded_revision: Option<u32>,
    /// La que se usa al conectar.
    active_revision: u32,
    origin: Origin,
    enabled: bool,
    /// Una revision del indice mas nueva que la activa.
    #[serde(skip_serializing_if = "Option::is_none")]
    available: Option<Available>,
    #[serde(skip_serializing_if = "Option::is_none")]
    support: Option<engine_context::SupportStatus>,
    /// Las versiones exactas que pasan la matriz completa y caen en esta
    /// linea (tools/test-dbs/lines.json compilado en la app).
    verified: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Available {
    revision: u32,
    requires_app: String,
    compatible: bool,
}

pub(crate) fn status(
    active: &[(Dialect, EngineLines)],
    installed: &[Package],
    index: Option<&Index>,
    app_version: &str,
    today: &str,
) -> Vec<LineStatus> {
    let mut rows = Vec::new();
    for (dialect, lines) in active {
        let engine = dialect.id();
        let bundled = dialect.bundled_lines();
        let mut ids: Vec<String> = lines.lines.iter().map(|line| line.line.clone()).collect();
        // Una linea nueva del indice que todavia no esta instalada.
        for entry in index.into_iter().flat_map(|index| &index.packages) {
            if entry.engine == engine && !ids.contains(&entry.line) {
                ids.push(entry.line.clone());
            }
        }
        for id in ids {
            let active_line = lines.get(&id);
            let active_revision = active_line.map_or(0, |line| line.revision);
            let entry = index.and_then(|index| {
                index
                    .packages
                    .iter()
                    .find(|entry| entry.engine == engine && entry.line == id)
            });
            rows.push(LineStatus {
                engine,
                included_revision: bundled.get(&id).map(|line| line.revision),
                downloaded_revision: installed
                    .iter()
                    .find(|package| package.engine == engine && package.line.line == id)
                    .map(|package| package.line.revision),
                active_revision,
                origin: active_line.map_or(Origin::Downloaded, |line| line.origin),
                enabled: active_line.is_some_and(|line| !line.disabled),
                available: entry
                    .filter(|entry| entry.revision > active_revision)
                    .map(|entry| Available {
                        revision: entry.revision,
                        requires_app: entry.requires_app.clone(),
                        compatible: khipu_engine::lines::compare(
                            &khipu_engine::lines::numbers(app_version),
                            &khipu_engine::lines::numbers(&entry.requires_app),
                        )
                        .is_ge(),
                    }),
                support: engine_context::line_support(engine, lines, &id, today),
                verified: engine_context::verified_versions(engine)
                    .into_iter()
                    .filter(|version| {
                        active_line.is_some()
                            && lines.effective(&khipu_engine::lines::numbers(version)).line == id
                    })
                    .collect(),
                line: id,
            });
        }
    }
    rows
}

fn pubkey<R: Runtime>(app: &AppHandle<R>) -> Result<String, Rejected> {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|updater| updater.get("pubkey"))
        .and_then(|key| key.as_str())
        .map(str::to_string)
        .ok_or(Rejected::Signature)
}

fn store<R: Runtime>(app: &AppHandle<R>) -> Result<Store, Rejected> {
    app.path()
        .app_data_dir()
        .map(|dir| Store::new(dir.join("support")))
        .map_err(|error| Rejected::Storage(error.to_string()))
}

fn app_version<R: Runtime>(app: &AppHandle<R>) -> String {
    app.package_info().version.to_string()
}

/// Al arrancar: las lineas activas con lo instalado. Cualquier problema deja
/// las incluidas; la app nunca deja de arrancar por un paquete.
pub(crate) fn activate_installed<R: Runtime>(app: &AppHandle<R>) {
    let (Ok(key), Ok(store)) = (pubkey(app), store(app)) else {
        return;
    };
    apply(resolve(&store, &key, &app_version(app)));
}

fn apply(resolved: Vec<(Dialect, EngineLines)>) {
    for (dialect, lines) in resolved {
        let _ = dialect.activate_lines(lines);
    }
}

fn current_status<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<LineStatus>, Rejected> {
    let (key, store) = (pubkey(app)?, store(app)?);
    let version = app_version(app);
    let active: Vec<(Dialect, EngineLines)> = Dialect::ALL
        .into_iter()
        .map(|dialect| (dialect, (*dialect.lines()).clone()))
        .collect();
    let index = INDEX.lock().expect("indice de soporte").clone();
    Ok(status(
        &active,
        &store.installed(&key, &version),
        index.as_ref(),
        &version,
        &engine_context::today(),
    ))
}

async fn fetch(url: &str, limit: usize) -> Result<Vec<u8>, Rejected> {
    let network = |error: reqwest::Error| Rejected::Network(error.to_string());
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .user_agent(concat!("Rowly-DB/", env!("CARGO_PKG_VERSION")))
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(network)?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(network)?
        .error_for_status()
        .map_err(network)?;
    if response
        .content_length()
        .is_some_and(|length| length as usize > limit)
    {
        return Err(Rejected::Integrity);
    }
    let bytes = response.bytes().await.map_err(network)?;
    if bytes.len() > limit {
        return Err(Rejected::Integrity);
    }
    Ok(bytes.to_vec())
}

fn base_url() -> String {
    std::env::var(BASE_URL_ENV).unwrap_or_else(|_| DEFAULT_BASE_URL.to_string())
}

async fn fetch_index(key: &str) -> Result<Index, Rejected> {
    let base = base_url();
    let bytes = fetch(&format!("{base}/index.json"), INDEX_MAX_BYTES).await?;
    let signature = fetch(&format!("{base}/index.json.sig"), 4096).await?;
    let index = read_index(key, &bytes, &String::from_utf8_lossy(&signature))?;
    *INDEX.lock().expect("indice de soporte") = Some(index.clone());
    Ok(index)
}

/// Las lineas de cada motor y su estado, con lo que se sepa del indice.
#[tauri::command]
pub(crate) fn support_lines<R: Runtime>(app: AppHandle<R>) -> Result<Vec<LineStatus>, Message> {
    Ok(current_status(&app)?)
}

/// Pide el indice (solo cuando lo pide el usuario) y dice que hay de nuevo.
#[tauri::command]
pub(crate) async fn check_support_updates<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Vec<LineStatus>, Message> {
    fetch_index(&pubkey(&app)?).await?;
    Ok(current_status(&app)?)
}

/// Descarga, comprueba e instala la revision del indice de una linea. Vale
/// desde la conexion siguiente.
#[tauri::command]
pub(crate) async fn install_support_package<R: Runtime>(
    app: AppHandle<R>,
    engine: String,
    line: String,
) -> Result<Vec<LineStatus>, Message> {
    let (key, store) = (pubkey(&app)?, store(&app)?);
    let version = app_version(&app);
    let index = fetch_index(&key).await?;
    let entry = index
        .packages
        .iter()
        .find(|entry| entry.engine == engine && entry.line == line)
        .ok_or(Rejected::NotFound)?;
    let base = base_url();
    let bytes = fetch(&format!("{base}/{}", entry.file), PACKAGE_MAX_BYTES).await?;
    let signature = fetch(&format!("{base}/{}.sig", entry.file), 4096).await?;
    let signature = String::from_utf8_lossy(&signature).to_string();
    let package = check_package(&key, entry, &bytes, &signature, &version)?;
    let text = String::from_utf8(bytes).map_err(|_| Rejected::Integrity)?;
    let _activation = ACTIVATION.write().await;
    install(&store, &key, &version, &package, &text, &signature)?;
    apply(resolve(&store, &key, &version));
    drop(_activation);
    Ok(current_status(&app)?)
}

/// Guarda un paquete comprobado solo si cabe entre las lineas del motor. Si
/// no cabe, nada cambia. Activarlo es aparte (`apply`).
pub(crate) fn install(
    store: &Store,
    key: &str,
    version: &str,
    package: &Package,
    text: &str,
    signature: &str,
) -> Result<(), Rejected> {
    let dialect = Dialect::from_id(&package.engine).ok_or(Rejected::Mismatch)?;
    let mut others = fitting(
        dialect,
        store
            .installed(key, version)
            .into_iter()
            .filter(|other| other.line.line != package.line.line),
    );
    others.push(package.clone());
    dialect
        .bundled_lines()
        .with_packages(&others, &[])
        .map_err(Rejected::Conflict)?;
    store.install(package, text, signature)
}

/// Quita la revision descargada: vuelve la incluida (si la linea no venia en
/// la app, desaparece).
#[tauri::command]
pub(crate) async fn remove_support_package<R: Runtime>(
    app: AppHandle<R>,
    engine: String,
    line: String,
) -> Result<Vec<LineStatus>, Message> {
    let (key, store) = (pubkey(&app)?, store(&app)?);
    let _activation = ACTIVATION.write().await;
    store.remove(&engine, &line)?;
    apply(resolve(&store, &key, &app_version(&app)));
    drop(_activation);
    Ok(current_status(&app)?)
}

/// Activa o desactiva una linea. Desactivada, sus servidores usan la activa
/// mas cercana por debajo; al menos una queda activa.
#[tauri::command]
pub(crate) async fn set_support_line_enabled<R: Runtime>(
    app: AppHandle<R>,
    engine: String,
    line: String,
    enabled: bool,
) -> Result<Vec<LineStatus>, Message> {
    let (key, store) = (pubkey(&app)?, store(&app)?);
    let version = app_version(&app);
    let _activation = ACTIVATION.write().await;
    set_enabled(&store, &key, &version, &engine, &line, enabled)?;
    apply(resolve(&store, &key, &version));
    drop(_activation);
    Ok(current_status(&app)?)
}

pub(crate) fn set_enabled(
    store: &Store,
    key: &str,
    version: &str,
    engine: &str,
    line: &str,
    enabled: bool,
) -> Result<(), Rejected> {
    let dialect = Dialect::from_id(engine).ok_or(Rejected::NotFound)?;
    let mut disabled = store.disabled(engine);
    disabled.retain(|id| id != line);
    if !enabled {
        disabled.push(line.to_string());
    }
    let installed = fitting(dialect, store.installed(key, version));
    dialect
        .bundled_lines()
        .with_packages(&installed, &disabled)
        .map_err(|_| Rejected::LastLine)?;
    store.set_enabled(engine, line, enabled)
}

#[cfg(test)]
mod tests {
    //! Los paquetes de tests/support/fixtures, firmados con
    //! tests/support/test-key: una clave solo de prueba
    //! (tests/support/fixtures.mjs los vuelve a generar).

    use super::*;
    use crate::engine_context::{ConnectionEngineContext, SessionMode};
    use khipu_driver_core::ServerIdentity;
    use khipu_engine::lines::numbers;
    use std::sync::Arc;

    const APP: &str = "0.3.0";

    fn fixtures() -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/support")
    }

    fn key() -> String {
        std::fs::read_to_string(fixtures().join("test-key.pub")).unwrap()
    }

    fn fixture(name: &str) -> (Vec<u8>, String) {
        let dir = fixtures().join("fixtures");
        (
            std::fs::read(dir.join(name)).unwrap(),
            std::fs::read_to_string(dir.join(format!("{name}.sig"))).unwrap(),
        )
    }

    /// La entrada que el indice publicaria para estos bytes.
    fn entry(
        file: &str,
        bytes: &[u8],
        engine: &str,
        line: &str,
        revision: u32,
        requires: &str,
    ) -> IndexEntry {
        IndexEntry {
            engine: engine.into(),
            line: line.into(),
            revision,
            requires_app: requires.into(),
            file: file.into(),
            size: bytes.len(),
            sha256: hex(&Sha256::digest(bytes)),
        }
    }

    fn index() -> Index {
        let (bytes, signature) = fixture("index.json");
        read_index(&key(), &bytes, &signature).expect("indice valido")
    }

    /// Un paquete del indice de fixtures, descargado y comprobado.
    fn downloaded(file: &str) -> (Package, String, String) {
        let (bytes, signature) = fixture(file);
        let index = index();
        let entry = index
            .packages
            .iter()
            .find(|entry| entry.file == file)
            .unwrap();
        let package =
            check_package(&key(), entry, &bytes, &signature, APP).expect("paquete valido");
        (package, String::from_utf8(bytes).unwrap(), signature)
    }

    fn rejected(file: &str, engine: &str, line: &str, revision: u32, requires: &str) -> Rejected {
        let (bytes, signature) = fixture(file);
        let entry = entry(file, &bytes, engine, line, revision, requires);
        check_package(&key(), &entry, &bytes, &signature, APP).unwrap_err()
    }

    struct TempStore(PathBuf);

    impl TempStore {
        fn new() -> Self {
            use std::sync::atomic::{AtomicU32, Ordering};
            static NEXT: AtomicU32 = AtomicU32::new(0);
            let dir = std::env::temp_dir().join(format!(
                "rowly-support-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            let _ = std::fs::remove_dir_all(&dir);
            Self(dir)
        }

        fn store(&self) -> Store {
            Store::new(self.0.clone())
        }
    }

    impl Drop for TempStore {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn lines_of(resolved: &[(Dialect, EngineLines)], dialect: Dialect) -> &EngineLines {
        &resolved.iter().find(|(of, _)| *of == dialect).unwrap().1
    }

    fn installed_r2(store: &Store) {
        let (package, text, signature) = downloaded("mysql-8.4-r2.json");
        install(store, &key(), APP, &package, &text, &signature).unwrap();
    }

    #[test]
    fn a_a_signed_index_and_its_packages_are_accepted() {
        let index = index();
        assert_eq!(index.packages.len(), 2);
        let (package, _, _) = downloaded("mysql-8.4-r2.json");
        assert_eq!(
            (
                package.engine.as_str(),
                package.line.line.as_str(),
                package.line.revision
            ),
            ("mysql", "8.4", 2)
        );
        let (ten, _, _) = downloaded("mysql-10-r1.json");
        assert_eq!(ten.line.line, "10");
    }

    #[test]
    fn b_c_k_an_unknown_format_or_field_is_rejected_even_when_signed() {
        assert!(matches!(
            rejected("format-2.json", "mysql", "8.4", 3, APP),
            Rejected::Format(_)
        ));
        assert!(matches!(
            rejected("unknown-field.json", "mysql", "8.4", 3, APP),
            Rejected::Format(_)
        ));
        // K: nada en un paquete puede hablarle al guard.
        assert!(matches!(
            rejected("guard-field.json", "mysql", "8.4", 3, APP),
            Rejected::Format(_)
        ));
    }

    #[test]
    fn k_the_guard_reads_no_line_data() {
        // Lo que un paquete cambia (lineas activas) no es una entrada del
        // guard: no las lee, asi que no puede relajarlo.
        let guard = std::fs::read_to_string(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../crates/engine/src/execution_guard.rs"),
        )
        .unwrap();
        assert!(
            !guard.contains("lines"),
            "execution_guard.rs no puede depender de las lineas"
        );
    }

    #[test]
    fn d_e_a_wrong_or_broken_signature_is_rejected() {
        let (bytes, _) = fixture("index.json");
        let (_, other) = fixture("mysql-10-r1.json");
        assert_eq!(
            read_index(&key(), &bytes, &other).unwrap_err(),
            Rejected::Signature
        );
        assert_eq!(
            read_index(&key(), &bytes, "no es una firma").unwrap_err(),
            Rejected::Signature
        );
        // La clave de la app no acepta lo firmado con la de prueba.
        let conf: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let production = conf["plugins"]["updater"]["pubkey"].as_str().unwrap();
        let (_, signature) = fixture("index.json");
        assert_eq!(
            read_index(production, &bytes, &signature).unwrap_err(),
            Rejected::Signature
        );
        // E: un byte cambiado, con tamaño y hash al dia, no pasa la firma.
        let (mut package, signature) = fixture("mysql-8.4-r2.json");
        let at = package.iter().position(|byte| *byte == b'2').unwrap();
        package[at] = b'9';
        let forged = entry("mysql-8.4-r2.json", &package, "mysql", "8.4", 2, APP);
        assert_eq!(
            check_package(&key(), &forged, &package, &signature, APP).unwrap_err(),
            Rejected::Signature
        );
        // Un indice manipulado tampoco.
        let mut index = bytes.clone();
        let at = index.iter().position(|byte| *byte == b'8').unwrap();
        index[at] = b'7';
        let (_, signature) = fixture("index.json");
        assert_eq!(
            read_index(&key(), &index, &signature).unwrap_err(),
            Rejected::Signature
        );
    }

    #[test]
    fn f_a_wrong_hash_or_a_truncated_download_is_rejected() {
        let (bytes, signature) = fixture("mysql-8.4-r2.json");
        let mut wrong = entry("mysql-8.4-r2.json", &bytes, "mysql", "8.4", 2, APP);
        wrong.sha256 = "0".repeat(64);
        assert_eq!(
            check_package(&key(), &wrong, &bytes, &signature, APP).unwrap_err(),
            Rejected::Integrity
        );
        let right = entry("mysql-8.4-r2.json", &bytes, "mysql", "8.4", 2, APP);
        let truncated = &bytes[..bytes.len() - 5];
        assert_eq!(
            check_package(&key(), &right, truncated, &signature, APP).unwrap_err(),
            Rejected::Integrity
        );
    }

    #[test]
    fn g_a_package_for_a_newer_app_is_not_installed() {
        assert_eq!(
            rejected("requires-newer-app.json", "mysql", "8.4", 3, "99.0.0"),
            Rejected::RequiresApp("99.0.0".into())
        );
        let (bytes, signature) = fixture("requires-newer-app.json");
        let newer = entry(
            "requires-newer-app.json",
            &bytes,
            "mysql",
            "8.4",
            3,
            "99.0.0",
        );
        assert!(check_package(&key(), &newer, &bytes, &signature, "99.0.0").is_ok());
    }

    #[test]
    fn l_a_package_that_says_another_engine_or_line_than_its_entry_is_rejected() {
        let (bytes, signature) = fixture("mysql-8.4-r2.json");
        for (engine, line, revision) in [
            ("postgres", "8.4", 2),
            ("mysql", "8.0", 2),
            ("mysql", "8.4", 3),
        ] {
            let liar = entry("mysql-8.4-r2.json", &bytes, engine, line, revision, APP);
            assert_eq!(
                check_package(&key(), &liar, &bytes, &signature, APP).unwrap_err(),
                Rejected::Mismatch
            );
        }
        // Instalado bajo el nombre de otra linea: se ignora al leerlo.
        let temp = TempStore::new();
        let store = temp.store();
        installed_r2(&store);
        std::fs::rename(
            store.package_path("mysql", "8.4"),
            store.package_path("mysql", "8.0"),
        )
        .unwrap();
        assert!(store.installed(&key(), APP).is_empty());
    }

    #[test]
    fn an_index_with_two_entries_for_a_line_a_path_or_an_unknown_field_is_rejected() {
        let entry = |file: &str| {
            format!(
                r#"{{"engine":"mysql","line":"8.4","revision":2,"requiresApp":"0.3.0","file":"{file}","size":1,"sha256":"00"}}"#
            )
        };
        let index = |packages: &[String], extra: &str| {
            format!(
                r#"{{"format":1,"commit":"x","packages":[{}]{extra}}}"#,
                packages.join(",")
            )
        };
        assert!(parse_index(index(&[entry("a.json")], "").as_bytes()).is_ok());
        for broken in [
            index(&[entry("a.json"), entry("b.json")], ""),
            index(&[entry("../a.json")], ""),
            index(&[entry(".hidden")], ""),
            index(&[], r#","run":"x""#),
            index(&[], "").replace(r#""format":1"#, r#""format":2"#),
        ] {
            assert!(
                matches!(parse_index(broken.as_bytes()), Err(Rejected::Format(_))),
                "{broken}"
            );
        }
    }

    #[test]
    fn h_an_interrupted_or_failed_install_keeps_the_previous_package() {
        let temp = TempStore::new();
        let store = temp.store();
        installed_r2(&store);
        let before = std::fs::read(store.package_path("mysql", "8.4")).unwrap();
        // Un paquete que choca con las demas lineas (CHECK declarado dos
        // veces) no llega a escribirse.
        let (bytes, signature) = fixture("capability-twice.json");
        let conflict = Package::parse(std::str::from_utf8(&bytes).unwrap()).unwrap();
        assert!(matches!(
            install(
                &store,
                &key(),
                APP,
                &conflict,
                std::str::from_utf8(&bytes).unwrap(),
                &signature
            ),
            Err(Rejected::Conflict(_))
        ));
        assert_eq!(
            std::fs::read(store.package_path("mysql", "8.4")).unwrap(),
            before
        );
        // Un corte a mitad de escribir deja solo un temporal incompleto: al
        // leer se borra y sigue el anterior.
        let temporary = store
            .package_path("mysql", "8.4")
            .with_extension("json.tmp");
        std::fs::write(&temporary, &before[..before.len() / 2]).unwrap();
        let installed = store.installed(&key(), APP);
        assert_eq!(installed.len(), 1);
        assert_eq!(installed[0].line.revision, 2);
        assert!(!temporary.exists());
        // Un archivo instalado roto (otro proceso, disco) no se usa: vale la
        // incluida.
        std::fs::write(store.package_path("mysql", "8.4"), b"{\"package\":\"x\"").unwrap();
        let resolved = resolve(&store, &key(), APP);
        assert_eq!(
            lines_of(&resolved, Dialect::MySql)
                .get("8.4")
                .unwrap()
                .revision,
            1
        );
    }

    #[test]
    fn i_j_an_update_changes_the_revision_and_removing_it_returns_the_included_one() {
        let temp = TempStore::new();
        let store = temp.store();
        let before = resolve(&store, &key(), APP);
        let line = lines_of(&before, Dialect::MySql).effective(&[8, 4, 11]);
        assert_eq!((line.revision, line.origin), (1, Origin::Included));

        installed_r2(&store);
        let after = resolve(&store, &key(), APP);
        let line = lines_of(&after, Dialect::MySql).effective(&[8, 4, 11]);
        assert_eq!((line.revision, line.origin), (2, Origin::Downloaded));
        assert!(
            line.removed_syntax
                .iter()
                .any(|removed| removed.words.contains(&"HOSTS".to_string()))
        );

        store.remove("mysql", "8.4").unwrap();
        let back = resolve(&store, &key(), APP);
        let line = lines_of(&back, Dialect::MySql).effective(&[8, 4, 11]);
        assert_eq!((line.revision, line.origin), (1, Origin::Included));
        // Quitar lo que no esta instalado no falla.
        store.remove("mysql", "8.4").unwrap();
    }

    #[test]
    fn m_offline_without_packages_the_included_lines_are_the_active_ones() {
        let temp = TempStore::new();
        let resolved = resolve(&temp.store(), &key(), APP);
        for (dialect, lines) in &resolved {
            let bundled = dialect.bundled_lines();
            let ids = |lines: &EngineLines| {
                lines
                    .lines
                    .iter()
                    .map(|line| (line.line.clone(), line.revision, line.origin, line.disabled))
                    .collect::<Vec<_>>()
            };
            assert_eq!(ids(lines), ids(bundled), "{dialect:?}");
        }
    }

    #[test]
    fn n_a_newer_server_takes_the_closest_line_below_and_never_one_above() {
        let temp = TempStore::new();
        let store = temp.store();
        let line = |resolved: &[(Dialect, EngineLines)], version: &str| {
            lines_of(resolved, Dialect::MySql)
                .effective(&numbers(version))
                .line
                .clone()
        };
        let before = resolve(&store, &key(), APP);
        assert_eq!(line(&before, "99.1.0"), "9");

        let (package, text, signature) = downloaded("mysql-10-r1.json");
        install(&store, &key(), APP, &package, &text, &signature).unwrap();
        let after = resolve(&store, &key(), APP);
        assert_eq!(line(&after, "99.1.0"), "10");
        assert_eq!(line(&after, "10.0.0"), "10");
        // Una version de la linea 9 no usa la 10 que llego en un paquete.
        assert_eq!(line(&after, "9.7.2"), "9");
        assert_eq!(line(&after, "5.6.51"), "5.7");
    }

    #[test]
    fn disabling_a_line_moves_its_servers_to_the_closest_active_line_below_and_one_stays_active() {
        let temp = TempStore::new();
        let store = temp.store();
        set_enabled(&store, &key(), APP, "mysql", "8.4", false).unwrap();
        let resolved = resolve(&store, &key(), APP);
        let mysql = lines_of(&resolved, Dialect::MySql);
        assert_eq!(mysql.effective(&[8, 4, 11]).line, "8.0");
        // Sus datos siguen ahi: las capacidades del catalogo y las reservadas
        // (el SQL generado cita lo de cualquier linea).
        assert!(mysql.get("8.4").unwrap().disabled);
        assert!(mysql.reserved_words().any(|word| word == "rank"));
        for line in ["5.7", "8.0"] {
            set_enabled(&store, &key(), APP, "mysql", line, false).unwrap();
        }
        // La ultima activa no se desactiva.
        assert_eq!(
            set_enabled(&store, &key(), APP, "mysql", "9", false),
            Err(Rejected::LastLine)
        );
        let resolved = resolve(&store, &key(), APP);
        let mysql = lines_of(&resolved, Dialect::MySql);
        assert_eq!(
            mysql.effective(&[5, 7, 44]).line,
            "9",
            "sin activas abajo, la mas antigua activa"
        );
        set_enabled(&store, &key(), APP, "mysql", "5.7", true).unwrap();
        set_enabled(&store, &key(), APP, "mysql", "8.0", true).unwrap();
        // Volver a activarla la devuelve.
        set_enabled(&store, &key(), APP, "mysql", "8.4", true).unwrap();
        let resolved = resolve(&store, &key(), APP);
        assert_eq!(
            lines_of(&resolved, Dialect::MySql)
                .effective(&[8, 4, 11])
                .line,
            "8.4"
        );
    }

    #[test]
    fn o_installing_a_package_does_not_make_a_version_verified_or_supported() {
        let temp = TempStore::new();
        let store = temp.store();
        let rows = |store: &Store| {
            let resolved = resolve(store, &key(), APP);
            status(
                &resolved,
                &store.installed(&key(), APP),
                Some(&index()),
                APP,
                "2026-10-02",
            )
        };
        let find = |rows: &[LineStatus], line: &str| {
            rows.iter()
                .find(|row| row.engine == "mysql" && row.line == line)
                .unwrap()
                .clone()
        };
        let before = rows(&store);
        let r84 = find(&before, "8.4");
        assert_eq!(r84.verified, vec!["8.4.11".to_string()]);
        assert_eq!(r84.available.as_ref().map(|a| a.revision), Some(2));
        assert_eq!(r84.support, Some(engine_context::SupportStatus::Supported));
        // La linea 10 esta en el indice, no instalada.
        assert_eq!(find(&before, "10").active_revision, 0);

        installed_r2(&store);
        let (package, text, signature) = downloaded("mysql-10-r1.json");
        install(&store, &key(), APP, &package, &text, &signature).unwrap();
        let after = rows(&store);
        let r84 = find(&after, "8.4");
        assert_eq!(
            (
                r84.active_revision,
                r84.included_revision,
                r84.downloaded_revision
            ),
            (2, Some(1), Some(2))
        );
        assert_eq!(r84.verified, vec!["8.4.11".to_string()]);
        assert_eq!(r84.support, Some(engine_context::SupportStatus::Supported));
        assert!(r84.available.is_none());
        let ten = find(&after, "10");
        assert_eq!(
            (ten.origin, ten.included_revision),
            (Origin::Downloaded, None)
        );
        assert!(
            ten.verified.is_empty(),
            "nada de la linea 10 paso la matriz"
        );
        assert_eq!(ten.support, None);
    }

    #[test]
    fn p_the_frontend_sees_the_revision_the_analysis_uses() {
        let temp = TempStore::new();
        let store = temp.store();
        installed_r2(&store);
        let resolved = resolve(&store, &key(), APP);
        let mysql = Arc::new(lines_of(&resolved, Dialect::MySql).clone());
        let context = ConnectionEngineContext::with_lines(
            1,
            Dialect::MySql,
            ServerIdentity {
                engine: "mysql",
                version: vec![8, 4, 11],
                label: "MySQL 8.4.11".into(),
            },
            SessionMode::default(),
            Some(Arc::clone(&mysql)),
            &mysql,
        );
        let shown = context.line.clone().unwrap();
        assert_eq!(
            (shown.id.as_str(), shown.revision, shown.origin),
            ("8.4", 2, Origin::Downloaded)
        );
        let (lines, id) = context.analysis_line().unwrap();
        assert_eq!(lines.get(&id).unwrap().revision, shown.revision);
        // Lo que el paquete reserva llega al SQL que escribe el editor.
        assert!(context.reserved_words.contains(&"qualify".to_string()));
        let json = serde_json::to_value(&context).unwrap();
        assert_eq!(json["line"]["revision"], 2);
        assert_eq!(json["line"]["origin"], "downloaded");
    }
}
