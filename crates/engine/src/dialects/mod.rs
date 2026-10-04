//! Las decisiones de cada motor, en un solo lugar (SQL_ENGINE.md §12,
//! contrato de motores). Cada motor es un `EngineDefinition`: valores (citas,
//! verbos, sintaxis que el parser no lee...) y la eleccion de los pocos
//! mecanismos que de verdad cambian de un motor a otro (`RoutineBodies`,
//! `DoBlocks`). El nucleo pregunta al contrato; no compara motores.
//!
//! El unico `match` sobre el motor es `Dialect::definition` (lib.rs): un motor
//! nuevo no compila hasta tener su definicion, y ningun componente lo trata
//! en silencio como a otro. Las lineas de version aportan valores a este
//! contrato, nunca codigo.

pub mod mariadb;
pub mod mysql;
pub mod postgres;

/// Lo que define a un motor para el analisis, el guard y el SQL generado.
pub struct EngineDefinition {
    /// El mismo identificador que `ConnectionDriver` del frontend y
    /// `DatabaseKind` del backend (tests/engines/contract.json).
    pub id: &'static str,
    /// El parser de sqlparser para el motor.
    pub parser: fn() -> Box<dyn sqlparser::dialect::Dialect>,
    /// Los verbos con que empieza una sentencia: lo que el guard reconoce
    /// aunque sqlparser no la lea y lo que el analizador usa para sugerir.
    pub statement_starters: &'static [&'static str],
    /// SQL valido que su parser rechaza o lee mal, como secuencias de
    /// palabras (`...` es un hueco de cualquier largo), en grupos. Una
    /// sentencia que las contiene no recibe diagnosticos.
    pub unparsed_syntax: &'static [&'static [&'static [&'static str]]],
    /// Escrituras validas que sqlparser no lee y el guard reconoce por sus
    /// primeras palabras.
    pub unparsed_writes: &'static [&'static [&'static str]],
    /// Tablas del sistema que se nombran sin schema y no estan en el
    /// catalogo: por nombre exacto o por prefijo.
    pub system_tables: &'static [&'static str],
    pub system_table_prefixes: &'static [&'static str],
    /// Un nombre sin comillas se guarda en minusculas (Postgres).
    pub folds_unquoted_to_lowercase: bool,
    /// Dentro de '...', la barra invertida escapa.
    pub backslash_escapes: bool,
    /// La comilla de los identificadores; la de adentro se duplica.
    pub identifier_quote: char,
    /// Como se escribe una fila nueva con todos sus valores por defecto.
    pub insert_defaults: InsertDefaults,
    /// Comentarios cuyo contenido el servidor ejecuta (`/*!`, `/*M!`).
    pub executable_comments: &'static [&'static str],
    /// Lo que puede crear un CREATE de rutina.
    pub routine_kinds: &'static [&'static str],
    pub routine_bodies: RoutineBodies,
    pub do_blocks: DoBlocks,
    /// `SELECT ... INTO a, b`: varias variables de una vez (sqlparser no lo lee).
    pub select_into_variable_lists: bool,
    /// La consulta que dice si la sesion usa NO_BACKSLASH_ESCAPES.
    pub sql_mode_query: Option<&'static str>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InsertDefaults {
    /// `INSERT INTO t () VALUES ();`
    EmptyValues,
    /// `INSERT INTO t DEFAULT VALUES;`
    DefaultValues,
}

/// Como se escribe el cuerpo de una rutina, un trigger o un evento.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoutineBodies {
    /// Un bloque SQL del propio motor (BEGIN ... END) que se valida por dentro
    /// (MySQL, MariaDB).
    Block,
    /// Un texto entre comillas en otro lenguaje (plpgsql, sql, python...):
    /// opaco para el analizador (Postgres).
    Quoted,
}

/// Que es `DO` en el motor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DoBlocks {
    /// Evalua expresiones (MySQL, MariaDB).
    Expression,
    /// Un bloque anonimo de codigo, cuyo efecto no se puede clasificar
    /// estaticamente (Postgres).
    Anonymous,
}
