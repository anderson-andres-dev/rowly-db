//! Actualizaciones de Rowly DB.
//!
//! Las versiones salen de los GitHub Releases del repositorio y todas quedan
//! disponibles: el usuario elige cuál instalar, más nueva o más vieja, y
//! nunca se instala nada sin que lo pida. Cada release publica su propio
//! `latest.json` (lo genera tauri-action), así que apuntar el updater a ese
//! archivo permite instalar exactamente esa versión.
//!
//! La descarga pasa siempre por `tauri-plugin-updater`, que verifica la firma
//! con la clave pública de `tauri.conf.json`. La instalación depende de cómo
//! se instaló la app:
//! - AppImage, Windows y macOS: la hace el plugin.
//! - `.deb`, `.rpm` y pacman: la hacemos aquí con `pkexec`, porque el plugin
//!   usa `rpm -U`, que se niega a volver a una versión anterior, y no conoce
//!   pacman.

use reqwest::header::{HeaderMap, RETRY_AFTER};
use semver::Version;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_updater::UpdaterExt;

const REPOSITORY: &str = "anderson-andres-dev/rowly-db";

// Para probar el flujo contra un servidor local sin publicar releases.
const RELEASES_URL_ENV: &str = "ROWLY_RELEASES_URL";
const DOWNLOAD_BASE_ENV: &str = "ROWLY_RELEASES_DOWNLOAD_BASE";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallKind {
    AppImage,
    Deb,
    Rpm,
    Pacman,
    Windows,
    Macos,
    /// Compilado desde el código o copiado a mano: no hay a quién delegar la
    /// instalación, así que solo se ofrece la descarga.
    Source,
}

impl InstallKind {
    fn can_install(self) -> bool {
        self != InstallKind::Source
    }

    /// Clave de la plataforma dentro de `latest.json`.
    fn updater_target(self) -> Option<String> {
        let arch = std::env::consts::ARCH;
        let format = match self {
            InstallKind::AppImage => "appimage",
            InstallKind::Deb => "deb",
            InstallKind::Rpm => "rpm",
            InstallKind::Pacman => "pacman",
            // El plugin elige solo el instalador de Windows y macOS.
            InstallKind::Windows | InstallKind::Macos | InstallKind::Source => return None,
        };
        Some(format!("linux-{arch}-{format}"))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateContext {
    current_version: String,
    install_kind: InstallKind,
    can_install: bool,
    releases_page: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Relation {
    Current,
    Newer,
    Older,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseInfo {
    tag: String,
    version: String,
    name: String,
    notes: String,
    published_at: Option<String>,
    prerelease: bool,
    url: String,
    relation: Relation,
    /// Tiene `latest.json`, o sea que se puede instalar desde la app.
    installable: bool,
    /// Trae su novedad para el aviso (release_highlight.rs).
    has_highlight: bool,
}

/// Error con un código estable para que la interfaz lo traduzca; `detail`
/// lleva el mensaje técnico original.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateError {
    code: &'static str,
    detail: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    retry_at: Option<u64>,
}

impl UpdateError {
    fn new(code: &'static str, detail: impl ToString) -> Self {
        Self {
            code,
            detail: detail.to_string(),
            retry_at: None,
        }
    }

    fn with_retry_at(mut self, retry_at: Option<u64>) -> Self {
        self.retry_at = retry_at;
        self
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Progress {
    downloaded: u64,
    total: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    prerelease: bool,
    draft: bool,
    html_url: String,
    #[serde(default)]
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
}

fn releases_page() -> String {
    format!("https://github.com/{REPOSITORY}/releases")
}

pub(crate) fn version_from_tag(tag: &str) -> Option<Version> {
    Version::parse(tag.strip_prefix('v').unwrap_or(tag)).ok()
}

fn relation(current: &Version, other: &Version) -> Relation {
    match other.cmp(current) {
        std::cmp::Ordering::Equal => Relation::Current,
        std::cmp::Ordering::Greater => Relation::Newer,
        std::cmp::Ordering::Less => Relation::Older,
    }
}

fn current_version<R: Runtime>(app: &AppHandle<R>) -> Version {
    let raw = app.package_info().version.to_string();
    Version::parse(&raw).unwrap_or_else(|_| Version::new(0, 0, 0))
}

fn command_succeeds(program: &str, args: &[&str], path: &Path) -> bool {
    Command::new(program)
        .args(args)
        .arg(path)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok_and(|status| status.success())
}

/// Cómo se instaló esta copia de la app. En Linux se pregunta al gestor de
/// paquetes quién es dueño del ejecutable: el binario de un `.deb`
/// reempaquetado para Arch dice "deb" aunque lo haya instalado pacman.
pub fn detect_install_kind() -> InstallKind {
    if cfg!(target_os = "windows") {
        return InstallKind::Windows;
    }
    if cfg!(target_os = "macos") {
        let in_bundle = std::env::current_exe()
            .map(|exe| exe.to_string_lossy().contains(".app/Contents/MacOS/"))
            .unwrap_or(false);
        return if in_bundle {
            InstallKind::Macos
        } else {
            InstallKind::Source
        };
    }
    if std::env::var_os("APPIMAGE").is_some() {
        return InstallKind::AppImage;
    }
    let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) else {
        return InstallKind::Source;
    };
    linux_package_kind(&exe)
}

fn linux_package_kind(exe: &Path) -> InstallKind {
    if !exe.starts_with("/usr") {
        return InstallKind::Source;
    }
    if Path::new("/var/lib/pacman/local").is_dir() && command_succeeds("pacman", &["-Qqo"], exe) {
        return InstallKind::Pacman;
    }
    if command_succeeds("rpm", &["-qf"], exe) {
        return InstallKind::Rpm;
    }
    if command_succeeds("dpkg", &["-S"], exe) {
        return InstallKind::Deb;
    }
    InstallKind::Source
}

#[tauri::command]
pub fn update_context<R: Runtime>(app: AppHandle<R>) -> UpdateContext {
    let install_kind = detect_install_kind();
    UpdateContext {
        current_version: current_version(&app).to_string(),
        install_kind,
        can_install: install_kind.can_install(),
        releases_page: releases_page(),
    }
}

pub(crate) fn http_client() -> Result<reqwest::Client, UpdateError> {
    // Mismo proveedor criptográfico que usa tauri-plugin-updater.
    let _ = rustls::crypto::ring::default_provider().install_default();
    reqwest::Client::builder()
        .user_agent(concat!("Rowly-DB/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|error| UpdateError::new("network", error))
}

fn rate_limit_retry_at(headers: &HeaderMap) -> Option<u64> {
    if let Some(seconds) = headers
        .get(RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
    {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .ok()?
            .as_millis() as u64;
        return Some(now.saturating_add(seconds.saturating_mul(1000)));
    }
    if headers.get("x-ratelimit-remaining")?.to_str().ok()? != "0" {
        return None;
    }
    headers
        .get("x-ratelimit-reset")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(|seconds| seconds.saturating_mul(1000))
}

fn is_rate_limited(status: reqwest::StatusCode, headers: &HeaderMap, detail: &str) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS
        || (status == reqwest::StatusCode::FORBIDDEN
            && (headers.get(RETRY_AFTER).is_some()
                || headers
                    .get("x-ratelimit-remaining")
                    .is_some_and(|value| value.to_str().is_ok_and(|text| text == "0"))
                || detail.to_ascii_lowercase().contains("rate limit")))
}

#[tauri::command]
pub async fn list_releases<R: Runtime>(app: AppHandle<R>) -> Result<Vec<ReleaseInfo>, UpdateError> {
    let url = std::env::var(RELEASES_URL_ENV).unwrap_or_else(|_| {
        format!("https://api.github.com/repos/{REPOSITORY}/releases?per_page=100")
    });
    let response = http_client()?
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| UpdateError::new("offline", error))?;
    let status = response.status();
    if !status.is_success() {
        let retry_at = rate_limit_retry_at(response.headers());
        let headers = response.headers().clone();
        let detail = response.text().await.unwrap_or_default();
        if is_rate_limited(status, &headers, &detail) {
            return Err(UpdateError::new("rateLimited", status).with_retry_at(retry_at));
        }
        return Err(UpdateError::new("network", status));
    }
    let releases: Vec<GithubRelease> = response
        .json()
        .await
        .map_err(|error| UpdateError::new("network", error))?;
    Ok(to_release_infos(releases, &current_version(&app)))
}

fn to_release_infos(releases: Vec<GithubRelease>, current: &Version) -> Vec<ReleaseInfo> {
    let mut infos: Vec<(Version, ReleaseInfo)> = releases
        .into_iter()
        .filter(|release| !release.draft)
        .filter_map(|release| {
            let version = version_from_tag(&release.tag_name)?;
            let has_asset = |name: &str| release.assets.iter().any(|asset| asset.name == name);
            let installable = has_asset("latest.json");
            let has_highlight = has_asset(crate::release_highlight::HIGHLIGHT_FILE);
            let info = ReleaseInfo {
                relation: relation(current, &version),
                version: version.to_string(),
                name: release
                    .name
                    .filter(|name| !name.trim().is_empty())
                    .unwrap_or_else(|| release.tag_name.clone()),
                tag: release.tag_name,
                notes: release.body.unwrap_or_default(),
                published_at: release.published_at,
                prerelease: release.prerelease,
                url: release.html_url,
                installable,
                has_highlight,
            };
            Some((version, info))
        })
        .collect();
    // La más nueva primero, sin depender del orden en que responda GitHub.
    infos.sort_by(|(a, _), (b, _)| b.cmp(a));
    infos.into_iter().map(|(_, info)| info).collect()
}

/// Donde se descargan los adjuntos de cada release (`<base>/<tag>/<archivo>`).
pub(crate) fn download_base() -> String {
    std::env::var(DOWNLOAD_BASE_ENV)
        .unwrap_or_else(|_| format!("https://github.com/{REPOSITORY}/releases/download"))
}

fn release_manifest_url(tag: &str) -> Result<url::Url, UpdateError> {
    let base = download_base();
    url::Url::parse(&format!("{}/{tag}/latest.json", base.trim_end_matches('/')))
        .map_err(|error| UpdateError::new("network", error))
}

/// Descarga (con la firma verificada) e instala la versión `tag`. No
/// reinicia: la interfaz ofrece reiniciar cuando termina.
#[tauri::command]
pub async fn install_release<R: Runtime>(
    app: AppHandle<R>,
    tag: String,
) -> Result<(), UpdateError> {
    let kind = detect_install_kind();
    if !kind.can_install() {
        return Err(UpdateError::new(
            "notInstallable",
            "installation not managed by Rowly DB",
        ));
    }

    let mut builder = app
        .updater_builder()
        .endpoints(vec![release_manifest_url(&tag)?])
        .map_err(|error| UpdateError::new("network", error))?
        // Cualquier versión elegida vale, también una anterior.
        .version_comparator(|_, _| true);
    if let Some(target) = kind.updater_target() {
        builder = builder.target(target);
    }
    let update = builder
        .build()
        .map_err(|error| UpdateError::new("network", error))?
        .check()
        .await
        .map_err(|error| UpdateError::new("unavailable", error))?
        .ok_or_else(|| UpdateError::new("unavailable", format!("no release data for {tag}")))?;

    let mut downloaded: u64 = 0;
    let bytes = update
        .download(
            |chunk, total| {
                downloaded += chunk as u64;
                let _ = app.emit("update-progress", Progress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(|error| match error {
            tauri_plugin_updater::Error::Minisign(_)
            | tauri_plugin_updater::Error::SignatureUtf8(_) => UpdateError::new("signature", error),
            other => UpdateError::new("network", other),
        })?;

    match kind {
        InstallKind::Deb => install_package(&bytes, "deb", &["dpkg", "-i"]),
        // --oldpackage deja volver a una versión anterior; --replacepkgs,
        // reinstalar la misma.
        InstallKind::Rpm => install_package(
            &bytes,
            "rpm",
            &["rpm", "-U", "--oldpackage", "--replacepkgs"],
        ),
        InstallKind::Pacman => {
            install_package(&bytes, "pkg.tar.zst", &["pacman", "-U", "--noconfirm"])
        }
        _ => update
            .install(bytes)
            .map_err(|error| UpdateError::new("installFailed", error)),
    }
}

fn install_package(bytes: &[u8], extension: &str, command: &[&str]) -> Result<(), UpdateError> {
    let dir = std::env::temp_dir().join(format!("rowly-db-update-{}", std::process::id()));
    std::fs::create_dir_all(&dir).map_err(|error| UpdateError::new("installFailed", error))?;
    let package: PathBuf = dir.join(format!("rowly-db.{extension}"));
    std::fs::write(&package, bytes).map_err(|error| UpdateError::new("installFailed", error))?;

    // pkexec muestra el diálogo de contraseña del sistema.
    let status = Command::new("pkexec")
        .args(command)
        .arg(&package)
        .status()
        .map_err(|error| UpdateError::new("noPkexec", error));
    let _ = std::fs::remove_dir_all(&dir);
    let status = status?;
    match status.code() {
        Some(0) => Ok(()),
        // 126: el usuario cerró o canceló el diálogo de autenticación.
        Some(126) => Err(UpdateError::new("cancelled", "authentication dismissed")),
        _ => Err(UpdateError::new(
            "installFailed",
            format!("{} exited with {status}", command[0]),
        )),
    }
}

#[tauri::command]
pub fn restart_app<R: Runtime>(app: AppHandle<R>) {
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solo_un_403_de_limite_se_muestra_como_rate_limited() {
        let mut headers = HeaderMap::new();
        assert!(!is_rate_limited(
            reqwest::StatusCode::FORBIDDEN,
            &headers,
            "forbidden"
        ));
        assert!(is_rate_limited(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            &headers,
            ""
        ));
        headers.insert("x-ratelimit-remaining", "0".parse().unwrap());
        assert!(is_rate_limited(
            reqwest::StatusCode::FORBIDDEN,
            &headers,
            ""
        ));
        headers.insert("x-ratelimit-reset", "1800000000".parse().unwrap());
        assert_eq!(rate_limit_retry_at(&headers), Some(1_800_000_000_000));
    }

    fn release(tag: &str, assets: &[&str]) -> GithubRelease {
        GithubRelease {
            tag_name: tag.to_string(),
            name: None,
            body: Some(format!("notes {tag}")),
            published_at: Some("2026-09-25T00:00:00Z".to_string()),
            prerelease: tag.contains('-'),
            draft: false,
            html_url: format!("https://example.com/{tag}"),
            assets: assets
                .iter()
                .map(|name| GithubAsset {
                    name: name.to_string(),
                })
                .collect(),
        }
    }

    #[test]
    fn ordena_de_la_mas_nueva_a_la_mas_vieja_y_marca_la_relacion() {
        let current = Version::parse("0.2.0").unwrap();
        let infos = to_release_infos(
            vec![
                release("v0.1.0", &["latest.json"]),
                release("v0.3.0-rc.1", &["latest.json"]),
                release("v0.2.0", &[]),
                release("not-a-version", &["latest.json"]),
            ],
            &current,
        );
        let summary: Vec<_> = infos
            .iter()
            .map(|info| (info.version.as_str(), info.relation, info.installable))
            .collect();
        assert_eq!(
            summary,
            vec![
                ("0.3.0-rc.1", Relation::Newer, true),
                ("0.2.0", Relation::Current, false),
                ("0.1.0", Relation::Older, true),
            ]
        );
        assert!(infos[0].prerelease);
        assert_eq!(infos[2].name, "v0.1.0");
    }

    #[test]
    fn omite_borradores() {
        let mut draft = release("v9.9.9", &["latest.json"]);
        draft.draft = true;
        let infos = to_release_infos(vec![draft], &Version::new(0, 1, 0));
        assert!(infos.is_empty());
    }

    #[test]
    fn target_por_formato_de_instalacion() {
        let arch = std::env::consts::ARCH;
        assert_eq!(
            InstallKind::Rpm.updater_target(),
            Some(format!("linux-{arch}-rpm"))
        );
        assert_eq!(
            InstallKind::Pacman.updater_target(),
            Some(format!("linux-{arch}-pacman"))
        );
        assert_eq!(InstallKind::Windows.updater_target(), None);
        assert!(!InstallKind::Source.can_install());
    }

    #[test]
    fn un_binario_fuera_de_usr_es_una_compilacion_propia() {
        assert_eq!(
            linux_package_kind(Path::new("/home/dev/rowly-db/target/release/rowly-db")),
            InstallKind::Source
        );
    }

    #[test]
    fn manifiesto_por_tag() {
        let url = release_manifest_url("v0.2.0").unwrap();
        assert_eq!(
            url.as_str(),
            "https://github.com/anderson-andres-dev/rowly-db/releases/download/v0.2.0/latest.json"
        );
    }
}
