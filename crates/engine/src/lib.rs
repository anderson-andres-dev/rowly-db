pub mod catalog;
pub mod diagnostics;
pub mod dialects;
pub mod editing;
pub mod error_position;
pub mod execution_guard;
pub mod pagination;
pub mod parser;

pub use dialects::{DoBlocks, EngineDefinition, InsertDefaults, RoutineBodies};

/// El SQL de cada motor (SQL_ENGINE.es.md). Lo que cambia de uno a otro esta
/// en su `EngineDefinition` (dialects/); este es el registro: el unico `match`
/// sobre el motor. Un motor nuevo en el enum no compila hasta tener su
/// definicion, y ningun componente lo trata en silencio como a otro. En el
/// frontend, las decisiones equivalentes viven en `app/src/lib/engines`, y
/// tests/engines/contract.json comprueba que los dos lados coinciden.
///
/// Los mismos motores que `ConnectionDriver` del frontend. MariaDB es uno
/// propio aunque use el driver y casi todo el SQL de MySQL.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    MySql,
    MariaDb,
    Postgres,
}

impl Dialect {
    /// Todos los motores: lo que recorre el contrato de cada modulo.
    pub const ALL: [Dialect; 3] = [Dialect::MySql, Dialect::MariaDb, Dialect::Postgres];

    pub fn definition(self) -> &'static EngineDefinition {
        match self {
            Dialect::MySql => &dialects::mysql::DEFINITION,
            Dialect::MariaDb => &dialects::mariadb::DEFINITION,
            Dialect::Postgres => &dialects::postgres::DEFINITION,
        }
    }

    /// El identificador del motor ("mysql", "mariadb", "postgres").
    pub fn id(self) -> &'static str {
        self.definition().id
    }

    /// El parser de sqlparser para el motor. sqlparser no tiene uno de
    /// MariaDB: el de MySQL, y lo que no entiende va en `unparsed_syntax`.
    pub fn as_sqlparser_dialect(&self) -> Box<dyn sqlparser::dialect::Dialect> {
        (self.definition().parser)()
    }

    /// SQL valido en el motor que su parser rechaza o lee mal, como
    /// secuencias de palabras. Lo que se encuentre se agrega en la
    /// definicion del motor, no en diagnostics.rs (el contrato de alli lo
    /// prueba en cada motor).
    pub fn unparsed_syntax(self) -> Vec<&'static [&'static str]> {
        self.definition().unparsed_syntax.concat()
    }

    pub fn statement_starters(self) -> &'static [&'static str] {
        self.definition().statement_starters
    }

    /// Una tabla del sistema que se nombra sin schema y no esta en el
    /// catalogo cargado (`DUAL`, `pg_tables`). Existe; sus columnas no se
    /// revisan.
    pub fn is_system_table(self, name: &str) -> bool {
        let definition = self.definition();
        let lower = name.to_ascii_lowercase();
        definition
            .system_tables
            .iter()
            .any(|table| table.eq_ignore_ascii_case(name))
            || definition
                .system_table_prefixes
                .iter()
                .any(|prefix| lower.starts_with(prefix))
    }

    /// Un nombre sin comillas se guarda en minusculas (`FROM Users` es la
    /// tabla `users` en Postgres); en MySQL queda como se escribio. Tambien
    /// dice que un nombre con mayusculas necesita comillas.
    pub fn folds_unquoted_to_lowercase(self) -> bool {
        self.definition().folds_unquoted_to_lowercase
    }

    /// Dentro de '...', la barra invertida escapa (MySQL, salvo
    /// NO_BACKSLASH_ESCAPES) o es un caracter mas (Postgres).
    pub fn backslash_escapes(self) -> bool {
        self.definition().backslash_escapes
    }

    /// El identificador entre las comillas del motor, con la de adentro
    /// duplicada.
    pub fn quote_identifier(self, ident: &str) -> String {
        let quote = self.definition().identifier_quote;
        let doubled: String = [quote, quote].iter().collect();
        format!("{quote}{}{quote}", ident.replace(quote, &doubled))
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
        match self.definition().insert_defaults {
            InsertDefaults::EmptyValues => format!("INSERT INTO {target} () VALUES ();"),
            InsertDefaults::DefaultValues => format!("INSERT INTO {target} DEFAULT VALUES;"),
        }
    }
}

#[cfg(test)]
mod contract {
    //! El contrato de cada motor (SQL_ENGINE.es.md):
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

    /// tests/engines/contract.json: lo mismo que deciden el backend y el
    /// frontend para cada motor, en el mismo orden.
    #[test]
    fn coincide_con_el_contrato_compartido_con_el_frontend() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/engines/contract.json");
        let contract: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        let ours: Vec<serde_json::Value> = ALL
            .iter()
            .map(|dialect| {
                let definition = dialect.definition();
                serde_json::json!({
                    "id": definition.id,
                    "identifierQuote": definition.identifier_quote.to_string(),
                    "backslashEscapes": definition.backslash_escapes,
                    "executableComments": definition.executable_comments,
                })
            })
            .collect();
        assert_eq!(contract["engines"].as_array().unwrap(), &ours);
    }

    #[test]
    fn cada_motor_tiene_su_identidad() {
        let ids: Vec<&str> = ALL.iter().map(|dialect| dialect.id()).collect();
        assert_eq!(ids, ["mysql", "mariadb", "postgres"]);
        // MariaDB usa el driver y casi todo el SQL de MySQL, pero no es MySQL:
        // tiene sus comentarios ejecutables y su sintaxis propia.
        let (mysql, mariadb) = (Dialect::MySql.definition(), Dialect::MariaDb.definition());
        assert_ne!(mysql.executable_comments, mariadb.executable_comments);
        let mysql_syntax = Dialect::MySql.unparsed_syntax();
        let mariadb_syntax = Dialect::MariaDb.unparsed_syntax();
        assert!(
            mysql_syntax
                .iter()
                .all(|pattern| mariadb_syntax.contains(pattern))
        );
        assert!(mariadb_syntax.len() > mysql_syntax.len());
    }

    /// El nucleo pregunta a la definicion del motor; no compara motores. Un
    /// `dialect == Dialect::Postgres` en un modulo trataria a un motor nuevo
    /// como a otro sin que el compilador lo diga. Los tests si los nombran.
    #[test]
    fn ningun_modulo_del_nucleo_compara_motores() {
        let src = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let mut found = Vec::new();
        for entry in std::fs::read_dir(&src).unwrap() {
            let path = entry.unwrap().path();
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            if !name.ends_with(".rs") || name == "lib.rs" {
                continue;
            }
            let text = std::fs::read_to_string(&path).unwrap();
            let code = text.split("#[cfg(test)]").next().unwrap();
            for (number, line) in code.lines().enumerate() {
                if ["Dialect::MySql", "Dialect::MariaDb", "Dialect::Postgres"]
                    .iter()
                    .any(|variant| line.contains(variant))
                {
                    found.push(format!("{name}:{}: {}", number + 1, line.trim()));
                }
            }
        }
        assert!(
            found.is_empty(),
            "decide con dialect.definition(), no comparando motores:\n{}",
            found.join("\n")
        );
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
