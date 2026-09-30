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
///
/// Los mismos motores que `ConnectionDriver` del frontend. MariaDB es uno
/// propio aunque use el driver y casi todo el SQL de MySQL: donde coincide,
/// el `match` lo dice (`MySql | MariaDb`); donde no, tiene su respuesta.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    MySql,
    MariaDb,
    Postgres,
}

impl Dialect {
    /// Todos los motores: lo que recorre el contrato de cada modulo.
    pub const ALL: [Dialect; 3] = [Dialect::MySql, Dialect::MariaDb, Dialect::Postgres];

    /// El parser de sqlparser para el motor. sqlparser no tiene uno de
    /// MariaDB: el de MySQL, y lo que no entiende va en `unparsed_syntax`.
    pub fn as_sqlparser_dialect(&self) -> Box<dyn sqlparser::dialect::Dialect> {
        match self {
            Dialect::MySql | Dialect::MariaDb => Box::new(sqlparser::dialect::MySqlDialect {}),
            Dialect::Postgres => Box::new(sqlparser::dialect::PostgreSqlDialect {}),
        }
    }

    /// SQL valido en el motor que su parser rechaza o lee mal (toma
    /// `SELECT SQL_CALC_FOUND_ROWS a` por una columna con alias), como
    /// secuencias de palabras; `...` es un hueco de cualquier largo. Una
    /// sentencia que las contiene no recibe diagnosticos: mejor no decir nada
    /// que marcar algo valido. Lo que se encuentre se agrega aca, no en
    /// diagnostics.rs (el contrato de alli lo prueba en cada motor).
    pub fn unparsed_syntax(self) -> Vec<&'static [&'static str]> {
        match self {
            Dialect::MySql => MYSQL_UNPARSED.to_vec(),
            Dialect::MariaDb => [MYSQL_UNPARSED, MARIADB_UNPARSED].concat(),
            Dialect::Postgres => POSTGRES_UNPARSED.to_vec(),
        }
    }

    /// Una tabla del sistema que se nombra sin schema y no esta en el
    /// catalogo cargado: `DUAL` en MySQL y MariaDB, `pg_tables` (pg_catalog
    /// esta siempre en el search_path) en Postgres. Existe; sus columnas no
    /// se revisan.
    pub fn is_system_table(self, name: &str) -> bool {
        match self {
            Dialect::MySql | Dialect::MariaDb => name.eq_ignore_ascii_case("dual"),
            Dialect::Postgres => name.to_ascii_lowercase().starts_with("pg_"),
        }
    }

    /// Un nombre sin comillas se guarda en minusculas (`FROM Users` es la
    /// tabla `users` en Postgres); en MySQL queda como se escribio. Tambien
    /// dice que un nombre con mayusculas necesita comillas.
    pub fn folds_unquoted_to_lowercase(self) -> bool {
        match self {
            Dialect::MySql | Dialect::MariaDb => false,
            Dialect::Postgres => true,
        }
    }

    /// Dentro de '...', la barra invertida escapa (MySQL, salvo
    /// NO_BACKSLASH_ESCAPES) o es un caracter mas (Postgres, con
    /// standard_conforming_strings, lo predeterminado).
    pub fn backslash_escapes(self) -> bool {
        match self {
            Dialect::MySql | Dialect::MariaDb => true,
            Dialect::Postgres => false,
        }
    }

    /// El identificador entre las comillas del motor, con la de adentro
    /// duplicada.
    pub fn quote_identifier(self, ident: &str) -> String {
        match self {
            Dialect::MySql | Dialect::MariaDb => format!("`{}`", ident.replace('`', "``")),
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
            Dialect::MySql | Dialect::MariaDb => format!("INSERT INTO {target} () VALUES ();"),
            Dialect::Postgres => format!("INSERT INTO {target} DEFAULT VALUES;"),
        }
    }
}

/// MySQL, y por lo tanto MariaDB (ver `Dialect::unparsed_syntax`).
const MYSQL_UNPARSED: &[&[&str]] = &[
    // Operadores: `a MOD 2`, `a SOUNDS LIKE 'x'`.
    &["MOD"],
    &["SOUNDS", "LIKE"],
    // Modificadores del SELECT, que el parser toma por una columna.
    &["SQL_CALC_FOUND_ROWS"],
    &["SQL_NO_CACHE"],
    &["SQL_CACHE"],
    &["SQL_BUFFER_RESULT"],
    &["SQL_SMALL_RESULT"],
    &["SQL_BIG_RESULT"],
    &["HIGH_PRIORITY"],
    &["STRAIGHT_JOIN"],
    &["DISTINCTROW"],
    // `BINARY a`: tambien lo lee como una columna.
    &["BINARY"],
    &["WITH", "ROLLUP"],
    &["LOCK", "IN", "SHARE", "MODE"],
    &["INTO", "OUTFILE"],
    &["INTO", "DUMPFILE"],
    &["PREPARE"],
    // UPDATE de una tabla con ORDER BY o LIMIT.
    &["UPDATE", "...", "ORDER", "BY"],
    &["UPDATE", "...", "LIMIT"],
];

/// Lo propio de MariaDB, ademas de lo de MySQL.
const MARIADB_UNPARSED: &[&[&str]] = &[
    // Secuencias: SELECT NEXT VALUE FOR s (PREVIOUS VALUE igual).
    &["NEXT", "VALUE", "FOR"],
    &["PREVIOUS", "VALUE", "FOR"],
    // Tablas versionadas: FROM t FOR SYSTEM_TIME AS OF ...
    &["FOR", "SYSTEM_TIME"],
    // ALTER TABLE ... ADD/DROP COLUMN IF [NOT] EXISTS.
    &["COLUMN", "IF", "NOT", "EXISTS"],
    &["COLUMN", "IF", "EXISTS"],
];

const POSTGRES_UNPARSED: &[&[&str]] = &[
    &["FOR", "NO", "KEY", "UPDATE"],
    &["FOR", "KEY", "SHARE"],
    &["BETWEEN", "SYMMETRIC"],
];

#[cfg(test)]
mod contract {
    //! El contrato de cada motor (docs/specs/v0.2-perfiles-de-motor.md, §5):
    //! lo que la app escribe en su SQL, su propio parser lo vuelve a leer
    //! igual.

    use super::Dialect;
    use sqlparser::tokenizer::{Token, Tokenizer};

    const ALL: [Dialect; 3] = Dialect::ALL;

    #[test]
    fn la_lista_tiene_todos_los_motores() {
        // Un motor nuevo en el enum rompe este match: darle su lugar y
        // sumarlo a Dialect::ALL. Con un lugar por motor, ALL no puede
        // omitir ni repetir ninguno.
        let place = |dialect: Dialect| match dialect {
            Dialect::MySql => 0,
            Dialect::MariaDb => 1,
            Dialect::Postgres => 2,
        };
        for (index, dialect) in ALL.into_iter().enumerate() {
            assert_eq!(place(dialect), index, "{dialect:?}");
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
