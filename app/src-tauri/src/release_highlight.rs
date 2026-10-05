//! La novedad de una versión para el aviso de actualización: un
//! `highlight.json` (y, si lo nombra, su imagen) adjunto a la release.
//!
//! - El aviso lo muestra la versión instalada, que no conoce la nueva: la
//!   novedad viaja como datos, nunca como código. Formato 1, sin campos
//!   desconocidos, textos en los idiomas de la app con el inglés obligatorio.
//! - La imagen la descarga el backend (png, webp o jpg, con tamaño máximo) y
//!   la interfaz la recibe como `data:`: la vista no pide nada a la red.
//! - Cualquier fallo (sin red, 404, formato) se registra en stderr y deja el
//!   aviso clásico: una novedad rota nunca impide actualizar.

use crate::updates::{download_base, http_client, version_from_tag};
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Nombre del adjunto en la release.
pub(crate) const HIGHLIGHT_FILE: &str = "highlight.json";
const FORMAT: u32 = 1;
const JSON_MAX_BYTES: usize = 64 * 1024;
const IMAGE_MAX_BYTES: usize = 1536 * 1024;
const MAX_ITEMS: usize = 4;
const LOCALES: [&str; 5] = ["es", "en", "pt-BR", "fr", "de"];

/// Un texto por idioma (`es`, `en`, `pt-BR`, `fr`, `de`); el inglés es el de
/// respaldo.
type Localized = BTreeMap<String, String>;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct HighlightFile {
    format: u32,
    badge: Option<Localized>,
    title: Localized,
    #[serde(default)]
    items: Vec<ItemFile>,
    image: Option<String>,
    image_alt: Option<Localized>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ItemFile {
    icon: Option<String>,
    title: Localized,
    text: Option<Localized>,
}

/// Lo que recibe la interfaz.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Highlight {
    badge: Option<Localized>,
    title: Localized,
    items: Vec<Item>,
    /// `data:image/...;base64,...`
    image: Option<String>,
    image_alt: Option<Localized>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Item {
    icon: Option<String>,
    title: Localized,
    text: Option<Localized>,
}

fn localized(name: &str, value: &Localized, max_chars: usize) -> Result<(), String> {
    if !value.contains_key("en") {
        return Err(format!("{name}: falta el inglés"));
    }
    for (locale, text) in value {
        if !LOCALES.contains(&locale.as_str()) {
            return Err(format!("{name}: idioma desconocido {locale}"));
        }
        let length = text.trim().chars().count();
        if length == 0 || length > max_chars {
            return Err(format!("{name}.{locale}: entre 1 y {max_chars} caracteres"));
        }
    }
    Ok(())
}

fn plain_icon(icon: &str) -> bool {
    let mut chars = icon.chars();
    icon.len() <= 32
        && chars.next().is_some_and(|first| first.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// El tipo de la imagen por su extensión; solo un nombre de archivo plano.
fn image_mime(file: &str) -> Option<&'static str> {
    let plain = !file.starts_with('.')
        && file
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));
    if !plain {
        return None;
    }
    match file.rsplit_once('.')?.1.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "webp" => Some("image/webp"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        _ => None,
    }
}

/// Lee y valida el archivo; la imagen queda como nombre, sin descargar.
fn parse(bytes: &[u8]) -> Result<HighlightFile, String> {
    if bytes.len() > JSON_MAX_BYTES {
        return Err("highlight.json demasiado grande".into());
    }
    let file: HighlightFile = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    if file.format != FORMAT {
        return Err(format!("formato {}", file.format));
    }
    localized("title", &file.title, 80)?;
    if let Some(badge) = &file.badge {
        localized("badge", badge, 24)?;
    }
    if file.items.len() > MAX_ITEMS {
        return Err(format!("más de {MAX_ITEMS} puntos"));
    }
    for (index, item) in file.items.iter().enumerate() {
        localized(&format!("items[{index}].title"), &item.title, 80)?;
        if let Some(text) = &item.text {
            localized(&format!("items[{index}].text"), text, 240)?;
        }
        if item.icon.as_deref().is_some_and(|icon| !plain_icon(icon)) {
            return Err(format!("items[{index}].icon no válido"));
        }
    }
    if let Some(image) = &file.image {
        image_mime(image).ok_or_else(|| format!("imagen no válida: {image}"))?;
    }
    if let Some(alt) = &file.image_alt {
        localized("imageAlt", alt, 160)?;
    }
    Ok(file)
}

fn into_highlight(file: HighlightFile, image: Option<String>) -> Highlight {
    Highlight {
        badge: file.badge,
        title: file.title,
        items: file
            .items
            .into_iter()
            .map(|item| Item {
                icon: item.icon,
                title: item.title,
                text: item.text,
            })
            .collect(),
        image,
        image_alt: file.image_alt,
    }
}

fn data_url(mime: &str, bytes: &[u8]) -> String {
    format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

async fn fetch(url: &str, limit: usize) -> Result<Vec<u8>, String> {
    let client = http_client().map_err(|error| format!("{error:?}"))?;
    let response = client
        .get(url)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|error| error.to_string())?;
    if response
        .content_length()
        .is_some_and(|length| length as usize > limit)
    {
        return Err(format!("{url}: más de {limit} bytes"));
    }
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    if bytes.len() > limit {
        return Err(format!("{url}: más de {limit} bytes"));
    }
    Ok(bytes.to_vec())
}

async fn load(base: &str, tag: &str) -> Result<Highlight, String> {
    version_from_tag(tag).ok_or_else(|| format!("tag no válido: {tag}"))?;
    let base = format!("{}/{tag}", base.trim_end_matches('/'));
    let file = parse(&fetch(&format!("{base}/{HIGHLIGHT_FILE}"), JSON_MAX_BYTES).await?)?;
    let image = match &file.image {
        Some(name) => {
            let mime = image_mime(name).expect("validada en parse");
            Some(data_url(
                mime,
                &fetch(&format!("{base}/{name}"), IMAGE_MAX_BYTES).await?,
            ))
        }
        None => None,
    };
    Ok(into_highlight(file, image))
}

/// La novedad de la release `tag`, o nada si no tiene o no es válida.
#[tauri::command]
pub async fn release_highlight(tag: String) -> Option<Highlight> {
    match load(&download_base(), &tag).await {
        Ok(highlight) => Some(highlight),
        Err(error) => {
            eprintln!("novedad de {tag}: {error}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str = r#"{
        "format": 1,
        "badge": { "es": "Nuevo", "en": "New" },
        "title": { "es": "Edita resultados sin miedo", "en": "Edit results without fear" },
        "items": [
            { "icon": "eye", "title": { "en": "Review every change" }, "text": { "en": "As SQL, before it runs." } },
            { "title": { "en": "Undo" } }
        ],
        "image": "highlight.webp",
        "imageAlt": { "en": "The changes preview" }
    }"#;

    #[test]
    fn a_valid_highlight_is_read() {
        let file = parse(VALID.as_bytes()).unwrap();
        assert_eq!(file.items.len(), 2);
        assert_eq!(file.image.as_deref(), Some("highlight.webp"));
    }

    #[test]
    fn the_documented_example_is_valid() {
        let example = std::fs::read(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../docs/release/highlight.example.json"),
        )
        .unwrap();
        let file = parse(&example).unwrap();
        assert_eq!(file.title.len(), LOCALES.len());
    }

    #[test]
    fn a_broken_or_unexpected_highlight_is_refused() {
        let cases = [
            (r#"{"format": 2, "title": {"en": "x"}}"#, "formato"),
            (r#"{"format": 1, "title": {"es": "x"}}"#, "inglés"),
            (
                r#"{"format": 1, "title": {"en": "x"}, "script": "x"}"#,
                "unknown field",
            ),
            (
                r#"{"format": 1, "title": {"en": "x", "it": "x"}}"#,
                "idioma",
            ),
            (r#"{"format": 1, "title": {"en": "  "}}"#, "caracteres"),
            (
                r#"{"format": 1, "title": {"en": "x"}, "image": "../x.png"}"#,
                "imagen",
            ),
            (
                r#"{"format": 1, "title": {"en": "x"}, "image": "x.svg"}"#,
                "imagen",
            ),
            (
                r#"{"format": 1, "title": {"en": "x"}, "items": [{"icon": "<b>", "title": {"en": "x"}}]}"#,
                "icon",
            ),
        ];
        for (json, expected) in cases {
            let error = parse(json.as_bytes()).unwrap_err();
            assert!(error.contains(expected), "{json}: {error}");
        }
        let five = format!(
            r#"{{"format": 1, "title": {{"en": "x"}}, "items": [{}]}}"#,
            [r#"{"title": {"en": "x"}}"#; 5].join(",")
        );
        assert!(parse(five.as_bytes()).unwrap_err().contains("puntos"));
        assert!(parse(&vec![b' '; JSON_MAX_BYTES + 1]).is_err());
    }

    #[test]
    fn the_languages_are_the_app_ones() {
        let locales = std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/lib/i18n/locales.ts"),
        )
        .unwrap();
        let line = locales
            .lines()
            .find(|line| line.starts_with("export const LOCALES"))
            .unwrap();
        let app: Vec<&str> = line.split('"').skip(1).step_by(2).collect();
        assert_eq!(app, LOCALES);
    }

    #[test]
    fn only_plain_png_webp_or_jpg_images() {
        assert_eq!(image_mime("hero.webp"), Some("image/webp"));
        assert_eq!(image_mime("hero.JPG"), Some("image/jpeg"));
        assert_eq!(image_mime(".hidden.png"), None);
        assert_eq!(image_mime("dir/hero.png"), None);
        assert_eq!(image_mime("hero.gif"), None);
    }

    /// Un servidor local con los adjuntos de la release v9.9.9.
    async fn serve(files: Vec<(&'static str, Vec<u8>)>) -> String {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            loop {
                let Ok((mut socket, _)) = listener.accept().await else {
                    return;
                };
                let mut request = vec![0u8; 2048];
                let read = socket.read(&mut request).await.unwrap_or(0);
                let line = String::from_utf8_lossy(&request[..read]).to_string();
                let path = line.split_whitespace().nth(1).unwrap_or("").to_string();
                let found = files
                    .iter()
                    .find(|(name, _)| path == format!("/v9.9.9/{name}"));
                let (status, body) = match found {
                    Some((_, body)) => ("200 OK", body.clone()),
                    None => ("404 Not Found", Vec::new()),
                };
                let head = format!(
                    "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                );
                let _ = socket.write_all(head.as_bytes()).await;
                let _ = socket.write_all(&body).await;
            }
        });
        base
    }

    #[tokio::test]
    async fn the_image_arrives_as_a_data_url() {
        let base = serve(vec![
            ("highlight.json", VALID.as_bytes().to_vec()),
            ("highlight.webp", b"RIFFwebp".to_vec()),
        ])
        .await;
        let highlight = load(&base, "v9.9.9").await.unwrap();
        assert_eq!(
            highlight.image.as_deref(),
            Some("data:image/webp;base64,UklGRndlYnA=")
        );
        assert_eq!(highlight.title["es"], "Edita resultados sin miedo");
    }

    #[tokio::test]
    async fn a_missing_file_or_image_falls_back_to_the_classic_prompt() {
        let base = serve(vec![("highlight.json", VALID.as_bytes().to_vec())]).await;
        assert!(load(&base, "v9.9.9").await.unwrap_err().contains("404"));
        assert!(load(&base, "v1.0.0").await.is_err());
        assert!(load(&base, "../etc").await.unwrap_err().contains("tag"));
    }
}
