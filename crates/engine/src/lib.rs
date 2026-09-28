pub mod catalog;
pub mod diagnostics;
pub mod editing;
pub mod error_position;
pub mod execution_guard;
pub mod pagination;
pub mod parser;

/// El SQL de cada motor (docs/specs/v0.2-perfiles-de-motor.md). Todo lo que
/// cambia de uno a otro se decide aca, con `match` exhaustivos: un motor
/// nuevo en el enum no compila hasta que cada decision tenga su respuesta, y
/// nada cae en silencio al SQL de otro motor. Del lado del frontend, lo mismo
/// es `app/src/lib/engines`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    MySql,
    Postgres,
}

impl Dialect {
    /// El parser de sqlparser para el motor.
    pub fn as_sqlparser_dialect(&self) -> Box<dyn sqlparser::dialect::Dialect> {
        match self {
            Dialect::MySql => Box::new(sqlparser::dialect::MySqlDialect {}),
            Dialect::Postgres => Box::new(sqlparser::dialect::PostgreSqlDialect {}),
        }
    }

    /// Un nombre sin comillas se guarda en minusculas (`FROM Users` es la
    /// tabla `users` en Postgres); en MySQL queda como se escribio. Tambien
    /// dice que un nombre con mayusculas necesita comillas.
    pub fn folds_unquoted_to_lowercase(self) -> bool {
        match self {
            Dialect::MySql => false,
            Dialect::Postgres => true,
        }
    }

    /// Dentro de '...', la barra invertida escapa (MySQL, salvo
    /// NO_BACKSLASH_ESCAPES) o es un caracter mas (Postgres, con
    /// standard_conforming_strings, lo predeterminado).
    pub fn backslash_escapes(self) -> bool {
        match self {
            Dialect::MySql => true,
            Dialect::Postgres => false,
        }
    }

    /// El identificador entre las comillas del motor, con la de adentro
    /// duplicada.
    pub fn quote_identifier(self, ident: &str) -> String {
        match self {
            Dialect::MySql => format!("`{}`", ident.replace('`', "``")),
            Dialect::Postgres => format!("\"{}\"", ident.replace('"', "\"\"")),
        }
    }

    /// Un texto como literal '...': la comilla duplicada y, donde la barra
    /// invertida escapa, tambien ella y el NUL.
    pub fn string_literal(self, text: &str) -> String {
        let mut out = String::with_capacity(text.len() + 2);
        out.push('\'');
        for character in text.chars() {
            match character {
                '\'' => out.push_str("''"),
                '\\' if self.backslash_escapes() => out.push_str("\\\\"),
                '\0' if self.backslash_escapes() => out.push_str("\\0"),
                _ => out.push(character),
            }
        }
        out.push('\'');
        out
    }

    /// Una fila nueva con todos sus valores por defecto.
    pub fn insert_defaults(self, target: &str) -> String {
        match self {
            Dialect::MySql => format!("INSERT INTO {target} () VALUES ();"),
            Dialect::Postgres => format!("INSERT INTO {target} DEFAULT VALUES;"),
        }
    }
}

#[cfg(test)]
mod contract {
    //! El contrato de cada motor (docs/specs/v0.2-perfiles-de-motor.md, §5):
    //! lo que la app escribe en su SQL, su propio parser lo vuelve a leer
    //! igual.

    use super::Dialect;
    use sqlparser::tokenizer::{Token, Tokenizer};

    /// Todos los motores. El `match` de abajo no compila si falta uno.
    const ALL: [Dialect; 2] = [Dialect::MySql, Dialect::Postgres];

    #[test]
    fn la_lista_tiene_todos_los_motores() {
        for dialect in ALL {
            // Un motor nuevo en el enum rompe este match: sumarlo a ALL.
            match dialect {
                Dialect::MySql | Dialect::Postgres => {}
            }
        }
    }

    fn tokens(dialect: Dialect, sql: &str) -> Vec<Token> {
        Tokenizer::new(&*dialect.as_sqlparser_dialect(), sql)
            .tokenize()
            .unwrap()
            .into_iter()
            .filter(|token| !matches!(token, Token::Whitespace(_)))
            .collect()
    }

    #[test]
    fn los_literales_de_texto_se_leen_igual() {
        let text = "a;b 'c' \"d\" `e` \\ f";
        for dialect in ALL {
            let literal = dialect.string_literal(text);
            let read = tokens(dialect, &format!("SELECT {literal}"));
            assert_eq!(
                read.get(1),
                Some(&Token::SingleQuotedString(text.to_string())),
                "{dialect:?}: {literal}"
            );
        }
    }

    #[test]
    fn los_identificadores_entre_comillas_se_leen_igual() {
        let name = "raro\"nombre`con comillas";
        for dialect in ALL {
            let quoted = dialect.quote_identifier(name);
            let read = tokens(dialect, &format!("SELECT {quoted} FROM t"));
            match read.get(1) {
                Some(Token::Word(word)) => {
                    assert_eq!(word.value, name, "{dialect:?}: {quoted}");
                    assert!(word.quote_style.is_some());
                }
                other => panic!("{dialect:?}: {quoted} se leyo como {other:?}"),
            }
        }
    }

    #[test]
    fn la_fila_con_valores_por_defecto_es_sql_valido() {
        for dialect in ALL {
            let sql = dialect.insert_defaults("t");
            assert!(
                sqlparser::parser::Parser::parse_sql(&*dialect.as_sqlparser_dialect(), &sql)
                    .is_ok(),
                "{dialect:?}: {sql}"
            );
        }
    }
}
