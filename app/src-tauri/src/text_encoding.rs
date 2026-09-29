//! El encoding de un .sql: se detecta al abrir y se respeta al guardar, asi
//! un script viejo en Windows-1252 (tildes y eñes de Windows) abre bien y
//! vuelve al disco igual. Sin dependencias: los encodings que aparecen en
//! scripts SQL son pocos y chicos.
//!
//! Al abrir: el BOM manda (UTF-8, UTF-16 LE/BE); sin BOM, UTF-8 si lo es
//! (valido es casi seguro UTF-8: un Windows-1252 con tildes casi nunca lo
//! es); si no, Windows-1252, que lee cualquier byte (y cubre Latin-1).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TextEncoding {
    #[serde(rename = "utf-8")]
    Utf8,
    #[serde(rename = "utf-8-bom")]
    Utf8Bom,
    #[serde(rename = "utf-16le")]
    Utf16Le,
    #[serde(rename = "utf-16be")]
    Utf16Be,
    #[serde(rename = "windows-1252")]
    Windows1252,
}

const UTF8_BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

/// De 0x80 a 0x9F, lo que Windows-1252 pone donde Latin-1 tiene controles
/// (los cinco sin asignar quedan como el control, igual que en la web).
const WINDOWS_1252_HIGH: [u32; 32] = [
    0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039,
    0x0152, 0x008D, 0x017D, 0x008F, 0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
    0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178,
];

pub fn decode(bytes: &[u8]) -> (String, TextEncoding) {
    if let Some(rest) = bytes.strip_prefix(&UTF8_BOM) {
        return (
            String::from_utf8_lossy(rest).into_owned(),
            TextEncoding::Utf8Bom,
        );
    }
    if let Some(rest) = bytes.strip_prefix(&[0xFF, 0xFE]) {
        return (
            decode_utf16(rest, u16::from_le_bytes),
            TextEncoding::Utf16Le,
        );
    }
    if let Some(rest) = bytes.strip_prefix(&[0xFE, 0xFF]) {
        return (
            decode_utf16(rest, u16::from_be_bytes),
            TextEncoding::Utf16Be,
        );
    }
    match std::str::from_utf8(bytes) {
        Ok(text) => (text.to_string(), TextEncoding::Utf8),
        Err(_) => (
            bytes.iter().map(|&byte| windows_1252_char(byte)).collect(),
            TextEncoding::Windows1252,
        ),
    }
}

fn decode_utf16(bytes: &[u8], unit: fn([u8; 2]) -> u16) -> String {
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|pair| unit([pair[0], pair[1]]))
        .collect();
    String::from_utf16_lossy(&units)
}

fn windows_1252_char(byte: u8) -> char {
    match byte {
        0x80..=0x9F => {
            char::from_u32(WINDOWS_1252_HIGH[(byte - 0x80) as usize]).unwrap_or('\u{FFFD}')
        }
        _ => char::from(byte),
    }
}

/// Los bytes del texto en ese encoding, o el primer caracter que no tiene
/// lugar en el (un emoji en Windows-1252): no se guarda a medias.
pub fn encode(text: &str, encoding: TextEncoding) -> Result<Vec<u8>, char> {
    match encoding {
        TextEncoding::Utf8 => Ok(text.as_bytes().to_vec()),
        TextEncoding::Utf8Bom => Ok([UTF8_BOM.as_slice(), text.as_bytes()].concat()),
        TextEncoding::Utf16Le => Ok([0xFF, 0xFE]
            .into_iter()
            .chain(text.encode_utf16().flat_map(u16::to_le_bytes))
            .collect()),
        TextEncoding::Utf16Be => Ok([0xFE, 0xFF]
            .into_iter()
            .chain(text.encode_utf16().flat_map(u16::to_be_bytes))
            .collect()),
        TextEncoding::Windows1252 => text.chars().map(windows_1252_byte).collect(),
    }
}

fn windows_1252_byte(character: char) -> Result<u8, char> {
    let code = character as u32;
    // Latin-1, salvo el tramo 0x80-0x9F que Windows-1252 usa para otros.
    if code < 0x80 || (0xA0..=0xFF).contains(&code) {
        return Ok(code as u8);
    }
    WINDOWS_1252_HIGH
        .iter()
        .position(|&mapped| mapped == code)
        .map(|index| 0x80 + index as u8)
        .ok_or(character)
}

#[cfg(test)]
mod tests {
    use super::{TextEncoding, decode, encode};

    const SAMPLE: &str = "SELECT 'Año', 'Peña', 'acción', '€ 10', '“hola”' FROM t;\n";

    #[test]
    fn cada_encoding_va_y_vuelve_igual() {
        for encoding in [
            TextEncoding::Utf8,
            TextEncoding::Utf8Bom,
            TextEncoding::Utf16Le,
            TextEncoding::Utf16Be,
            TextEncoding::Windows1252,
        ] {
            let bytes = encode(SAMPLE, encoding).unwrap();
            assert_eq!(
                decode(&bytes),
                (SAMPLE.to_string(), encoding),
                "{encoding:?}"
            );
        }
    }

    #[test]
    fn un_script_de_windows_se_detecta_y_se_lee() {
        // "Año" y "€" como los guarda Windows-1252: no son UTF-8 valido.
        let bytes = [b'A', 0xF1, b'o', b' ', 0x80];
        assert_eq!(
            decode(&bytes),
            ("Año €".to_string(), TextEncoding::Windows1252)
        );
    }

    #[test]
    fn solo_ascii_es_utf8() {
        assert_eq!(
            decode(b"SELECT 1;"),
            ("SELECT 1;".to_string(), TextEncoding::Utf8)
        );
    }

    #[test]
    fn lo_que_no_entra_en_windows_1252_no_se_guarda() {
        assert_eq!(encode("SELECT '🙂'", TextEncoding::Windows1252), Err('🙂'));
        assert!(encode("SELECT '🙂'", TextEncoding::Utf8).is_ok());
    }

    #[test]
    fn los_nombres_son_los_del_frontend() {
        let names: Vec<String> = [
            TextEncoding::Utf8,
            TextEncoding::Utf8Bom,
            TextEncoding::Utf16Le,
            TextEncoding::Utf16Be,
            TextEncoding::Windows1252,
        ]
        .iter()
        .map(|encoding| serde_json::to_string(encoding).unwrap())
        .collect();
        assert_eq!(
            names,
            [
                "\"utf-8\"",
                "\"utf-8-bom\"",
                "\"utf-16le\"",
                "\"utf-16be\"",
                "\"windows-1252\""
            ]
        );
    }
}
