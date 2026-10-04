//! Las lineas de version de cada motor, como datos (SQL_ENGINE.md §5): lo que
//! cambia de una linea a otra para Rowly DB. Una sola declaracion por motor,
//! `support/<motor>.json`, que el motor registra en su `EngineDefinition`
//! (`lines`). El analizador, los drivers y el backend la consultan; el
//! frontend lee el mismo archivo solo para las palabras reservadas del SQL
//! generado.
//!
//! Una linea empieza en la version que la nombra ("8.0") y llega hasta la
//! siguiente. Son datos: nada de codigo por linea; la logica que los usa es
//! la comun del nucleo. Que cada frontera existe lo demuestran los servidores
//! reales (`tests/sql/<motor>/<linea>`, `version_lines`), no este archivo.

use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BTreeMap;

/// El unico formato de `support/<motor>.json` que esta app sabe leer.
pub const FORMAT: u32 = 1;

/// El unico formato de paquete de soporte (una linea, distribuida) que esta
/// app sabe leer. Un paquete de otro formato no se instala.
pub const PACKAGE_FORMAT: u32 = 1;

/// Lo mas grande que puede ser un paquete: una linea son unos cientos de
/// bytes; algo mucho mayor no es una linea.
pub const PACKAGE_MAX_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EngineLines {
    pub format: u32,
    pub engine: String,
    pub lines: Vec<Line>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Line {
    /// La version donde empieza: "8.0", "18".
    pub line: String,
    /// Sube cada vez que cambian los datos de la linea.
    pub revision: u32,
    /// Lo que la linea agrega al catalogo, con la version desde la que vale:
    /// puede ser un parche dentro de la linea (`CHECK` desde 8.0.16).
    #[serde(default)]
    pub capabilities: BTreeMap<Capability, String>,
    /// Palabras que la linea vuelve reservadas.
    #[serde(default)]
    pub reserved_words: Vec<String>,
    /// Sintaxis que la linea elimina.
    #[serde(default)]
    pub removed_syntax: Vec<RemovedSyntax>,
    /// De donde salen los datos: la app o un paquete descargado.
    #[serde(skip)]
    pub origin: Origin,
    /// El usuario la desactivo: ningun servidor se resuelve a ella.
    #[serde(skip)]
    pub disabled: bool,
    #[serde(skip)]
    start: Vec<u32>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Origin {
    /// Compilada en la app (`support/<motor>.json`): siempre esta.
    #[default]
    Included,
    /// Una revision descargada y verificada que reemplaza a la incluida o
    /// agrega una linea nueva.
    Downloaded,
}

/// Lo que la introspeccion lee del catalogo segun la version. Como lo lee
/// cada motor es del driver; desde que version existe, de las lineas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Capability {
    /// Restricciones CHECK en el catalogo.
    CheckConstraints,
    /// Secuencias en `information_schema.tables` (MariaDB).
    Sequences,
    /// `pg_proc.prokind`, y con el los procedures.
    Procedures,
    /// `pg_index.indnkeyatts`: columnas INCLUDE en los indices.
    IndexIncludeColumns,
    /// `pg_sequence` y `relispartition`.
    CatalogV10,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RemovedSyntax {
    /// Tokens seguidos, las palabras en mayusculas; `^` ancla al principio
    /// de la sentencia y `$` al final.
    pub words: Vec<String>,
    /// Lo que se usa en su lugar, si existe.
    #[serde(default)]
    pub instead: Option<String>,
}

/// Un paquete de soporte: una linea de un motor, como datos, con la version
/// minima de la app que sabe usarla (SQL_ENGINE.md §11). Nunca codigo: solo
/// los campos de `Line`, y nada que toque el guard, el parser o el driver.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Package {
    pub format: u32,
    pub engine: String,
    pub requires_app: String,
    pub line: Line,
}

impl Package {
    /// Lee y valida un paquete por si solo; si cabe entre las demas lineas
    /// del motor lo dice `EngineLines::with_packages`.
    pub fn parse(json: &str) -> Result<Self, String> {
        if json.len() > PACKAGE_MAX_BYTES {
            return Err(format!("mas de {PACKAGE_MAX_BYTES} bytes"));
        }
        let mut package: Package = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if package.format != PACKAGE_FORMAT {
            return Err(format!("formato de paquete {} desconocido", package.format));
        }
        parse_version(&package.requires_app)?;
        package.line.start = check_line(&package.line)?;
        Ok(package)
    }

    /// Si esta app (`app_version`, "0.3.0") sabe usar el paquete.
    pub fn compatible_with(&self, app_version: &str) -> bool {
        compare(&numbers(app_version), &numbers(&self.requires_app)).is_ge()
    }
}

/// Lo que se puede comprobar de una linea sola. Devuelve donde empieza.
fn check_line(line: &Line) -> Result<Vec<u32>, String> {
    let start = parse_version(&line.line)?;
    if line.revision == 0 {
        return Err(format!("{}: la revision empieza en 1", line.line));
    }
    for since in line.capabilities.values() {
        parse_version(since)?;
    }
    for word in &line.reserved_words {
        if word.is_empty() || *word != word.to_lowercase() {
            return Err(format!("{}: reservada «{word}» en minusculas", line.line));
        }
    }
    for removed in &line.removed_syntax {
        let words = removed
            .words
            .iter()
            .filter(|word| *word != "^" && *word != "$")
            .count();
        let anchors_in_place = removed.words.iter().enumerate().all(|(at, word)| {
            (word != "^" || at == 0) && (word != "$" || at == removed.words.len() - 1)
        });
        if words == 0 || !anchors_in_place {
            return Err(format!("{}: sintaxis eliminada mal escrita", line.line));
        }
    }
    Ok(start)
}

impl EngineLines {
    /// Lee y valida las lineas de un motor. Un dato que la app no sabe usar
    /// (un formato o un campo desconocidos, lineas desordenadas) es un error:
    /// nunca se aplica a medias.
    pub fn parse(json: &str) -> Result<Self, String> {
        let mut parsed: EngineLines = serde_json::from_str(json).map_err(|e| e.to_string())?;
        parsed.validate()?;
        Ok(parsed)
    }

    /// Lo que vale para el conjunto: formato, orden, capacidades dentro de su
    /// linea y declaradas una vez, y al menos una linea activa.
    fn validate(&mut self) -> Result<(), String> {
        if self.format != FORMAT {
            return Err(format!("formato {} desconocido", self.format));
        }
        if self.lines.is_empty() {
            return Err("sin lineas".into());
        }
        let mut declared = BTreeMap::new();
        for index in 0..self.lines.len() {
            let start = check_line(&self.lines[index])?;
            let line = &self.lines[index];
            if index > 0 && compare(&start, &self.lines[index - 1].start).is_le() {
                return Err(format!(
                    "{}: las lineas van en orden creciente y sin repetir",
                    line.line
                ));
            }
            let next = self
                .lines
                .get(index + 1)
                .map(|next| parse_version(&next.line))
                .transpose()?;
            for (capability, since) in &line.capabilities {
                let since = parse_version(since)?;
                // La primera linea puede declarar lo que ya existia por
                // debajo de ella (el piso no es el origen de la capacidad).
                let before_line = index > 0 && compare(&since, &start).is_lt();
                let after_line = next
                    .as_ref()
                    .is_some_and(|next| compare(&since, next).is_ge());
                if before_line || after_line {
                    return Err(format!("{}: {capability:?} fuera de la linea", line.line));
                }
                if declared.insert(*capability, line.line.clone()).is_some() {
                    return Err(format!("{capability:?} declarada dos veces"));
                }
            }
            self.lines[index].start = start;
        }
        if self.lines.iter().all(|line| line.disabled) {
            return Err("al menos una linea tiene que quedar activa".into());
        }
        Ok(())
    }

    /// Las lineas de la app con los paquetes descargados aplicados: una
    /// revision descargada reemplaza a la incluida solo si es mas nueva, y una
    /// linea que la app no trae se agrega. `disabled`: las que el usuario
    /// desactivo. El resultado se valida entero; si un paquete no cabe (otro
    /// motor, una capacidad repetida, fuera de orden), nada se aplica.
    pub fn with_packages(&self, packages: &[Package], disabled: &[String]) -> Result<Self, String> {
        let mut lines = self.lines.clone();
        for package in packages {
            if package.engine != self.engine {
                return Err(format!(
                    "{} {}: es de {}, no de {}",
                    package.engine, package.line.line, package.engine, self.engine
                ));
            }
            let mut line = package.line.clone();
            line.origin = Origin::Downloaded;
            match lines.iter_mut().find(|known| known.line == line.line) {
                Some(known) if line.revision > known.revision => *known = line,
                // La que ya esta es igual o mas nueva: sigue ella.
                Some(_) => {}
                None => lines.push(line),
            }
        }
        lines.sort_by(|a, b| compare(&numbers(&a.line), &numbers(&b.line)));
        for line in &mut lines {
            line.disabled = disabled.contains(&line.line);
        }
        let mut merged = EngineLines {
            format: FORMAT,
            engine: self.engine.clone(),
            lines,
        };
        merged.validate()?;
        Ok(merged)
    }

    /// La linea de un servidor: la mas cercana por debajo de su version.
    /// Mas nueva que todas, la ultima; por debajo de la primera, la primera,
    /// sin las capacidades que ese servidor no alcanza (SQL_ENGINE.md §5.2).
    ///
    /// Una linea desactivada no se elige: su servidor usa la activa mas
    /// cercana por debajo, y nunca una de arriba.
    pub fn effective(&self, version: &[u32]) -> &Line {
        let active = self.lines.iter().filter(|line| !line.disabled);
        let first = active.clone().next().expect("validate deja una activa");
        active
            .rev()
            .find(|line| compare(version, &line.start).is_ge())
            .unwrap_or(first)
    }

    pub fn get(&self, id: &str) -> Option<&Line> {
        self.lines.iter().find(|line| line.line == id)
    }

    /// Si un servidor de esta version tiene la capacidad: alguna linea la
    /// declara desde una version que el servidor alcanza. Tambien una
    /// desactivada: lo que el catalogo del servidor tiene no cambia porque el
    /// usuario no quiera sus reglas.
    pub fn supports(&self, capability: Capability, version: &[u32]) -> bool {
        self.lines.iter().any(|line| {
            line.capabilities
                .get(&capability)
                .is_some_and(|since| compare(version, &numbers(since)).is_ge())
        })
    }

    /// Las reservadas de todas las lineas, desactivadas incluidas: el SQL
    /// generado las cita en cualquier version del motor (SQL_ENGINE.md §5.2).
    pub fn reserved_words(&self) -> impl Iterator<Item = &str> {
        self.lines
            .iter()
            .flat_map(|line| line.reserved_words.iter().map(String::as_str))
    }

    /// Lo que eliminaron `line` y las anteriores activas, con la linea que
    /// lo elimino.
    pub fn removed_until<'a>(
        &'a self,
        line: &'a Line,
    ) -> impl Iterator<Item = (&'a Line, &'a RemovedSyntax)> {
        self.lines
            .iter()
            .take_while(move |candidate| compare(&candidate.start, &line.start).is_le())
            .filter(|candidate| !candidate.disabled)
            .flat_map(|candidate| candidate.removed_syntax.iter().map(move |r| (candidate, r)))
    }
}

/// "8.0.16" → [8, 0, 16]; lo que no es un numero cuenta como 0.
pub fn numbers(text: &str) -> Vec<u32> {
    text.split('.')
        .map(|part| part.parse().unwrap_or(0))
        .collect()
}

fn parse_version(text: &str) -> Result<Vec<u32>, String> {
    text.split('.')
        .map(|part| {
            part.parse()
                .map_err(|_| format!("version «{text}» ilegible"))
        })
        .collect()
}

/// Compara versiones completando con ceros: `9` es `9.0.0`.
pub fn compare(a: &[u32], b: &[u32]) -> Ordering {
    (0..a.len().max(b.len()))
        .map(|index| {
            a.get(index)
                .copied()
                .unwrap_or(0)
                .cmp(&b.get(index).copied().unwrap_or(0))
        })
        .find(|order| order.is_ne())
        .unwrap_or(Ordering::Equal)
}
