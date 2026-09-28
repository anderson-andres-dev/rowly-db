//! Posicion de un error de la base dentro del SQL que escribio el usuario.
//!
//! Postgres dice en que caracter del texto recibido esta el error. Pero al
//! ordenar o paginar, `execute_query` no manda el texto del usuario: manda la
//! consulta vuelta a escribir desde el AST (otro formato, `LIMIT` agregado,
//! a veces envuelta en `SELECT * FROM (...)`). Solo se reescriben consultas
//! que parsean, asi que sus errores son de nombres (columna o tabla que no
//! existe) y apuntan a un identificador: se busca que aparicion de esa
//! palabra es en el texto reescrito y se ubica la misma en el original.

/// Palabras que el envoltorio puede agregar antes del texto del usuario: si
/// el error apunta a una de ellas, no se adivina.
const WRAPPER_WORDS: [&str; 4] = ["select", "from", "as", "khipu_sorted"];

fn is_word_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_' || c == '$'
}

/// Posiciones (en caracteres) donde empieza `word` como palabra completa,
/// sin distinguir mayusculas.
fn word_starts(chars: &[char], word: &[char]) -> Vec<usize> {
    let mut starts = Vec::new();
    let mut index = 0;
    while index + word.len() <= chars.len() {
        let before_ok = index == 0 || !is_word_char(chars[index - 1]);
        let matches = chars[index..index + word.len()]
            .iter()
            .zip(word)
            .all(|(a, b)| a.to_lowercase().eq(b.to_lowercase()));
        let after_ok = chars
            .get(index + word.len())
            .is_none_or(|c| !is_word_char(*c));
        if before_ok && matches && after_ok {
            starts.push(index);
            index += word.len();
        } else {
            index += 1;
        }
    }
    starts
}

/// `position` es 1-based, en caracteres de `rewritten`; devuelve la
/// equivalente en `original` (1-based) o `None` si no se puede saber.
pub fn map_error_position(original: &str, rewritten: &str, position: u64) -> Option<u64> {
    if original == rewritten {
        return Some(position);
    }
    let rewritten: Vec<char> = rewritten.chars().collect();
    let mut at = usize::try_from(position).ok()?.checked_sub(1)?;
    // Un identificador citado: la posicion cae en la comilla.
    if matches!(rewritten.get(at), Some('"' | '`')) {
        at += 1;
    }
    if !rewritten.get(at).is_some_and(|c| is_word_char(*c)) {
        return None;
    }
    let mut start = at;
    while start > 0 && is_word_char(rewritten[start - 1]) {
        start -= 1;
    }
    let mut end = at;
    while end < rewritten.len() && is_word_char(rewritten[end]) {
        end += 1;
    }
    let word: Vec<char> = rewritten[start..end].to_vec();
    let lower: String = word.iter().collect::<String>().to_lowercase();
    if WRAPPER_WORDS.contains(&lower.as_str()) {
        return None;
    }
    let occurrence = word_starts(&rewritten, &word)
        .iter()
        .position(|&found| found == start)?;
    let original: Vec<char> = original.chars().collect();
    let found = *word_starts(&original, &word).get(occurrence)?;
    Some(found as u64 + 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_text_keeps_the_position() {
        assert_eq!(map_error_position("SELECT x", "SELECT x", 8), Some(8));
    }

    #[test]
    fn finds_the_same_identifier_in_the_original() {
        let original = "select id,\n  fcha  from usuarios";
        let rewritten = "SELECT id, fcha FROM usuarios LIMIT 501";
        let position = rewritten.find("fcha").unwrap() as u64 + 1;
        assert_eq!(
            map_error_position(original, rewritten, position),
            Some(original.find("fcha").unwrap() as u64 + 1)
        );
    }

    #[test]
    fn repeated_words_keep_their_order_and_accents_count_as_one_char() {
        let original = "SELECT año, a.x FROM t a WHERE a.x > 1";
        let rewritten = "SELECT año, a.x FROM t AS a WHERE a.x > 1 LIMIT 501";
        let second_x = rewritten.rfind("x").unwrap();
        let chars_before = rewritten[..second_x].chars().count() as u64;
        let expected = original[..original.rfind("x").unwrap()].chars().count() as u64;
        assert_eq!(
            map_error_position(original, rewritten, chars_before + 1),
            Some(expected + 1)
        );
    }

    #[test]
    fn words_the_wrapper_adds_are_not_guessed() {
        let rewritten = "SELECT * FROM (SELECT a FROM t LIMIT 5) AS khipu_sorted ORDER BY 1";
        assert_eq!(
            map_error_position("SELECT a FROM t LIMIT 5", rewritten, 1),
            None
        );
    }
}
