//! Text the app shows to the user, coming from the backend.
//!
//! What the app itself says (no active connection, the table has no primary
//! key, ...) travels as a key plus parameters and the frontend translates it
//! (`backend.*` in its i18n). What the database or the OS says (a SQL
//! error, an I/O error) has no translation and travels as it came, as a
//! plain string: on the wire a `Message` is either `"text"` or
//! `{ "key": "...", "params": { ... } }`.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Message {
    Raw(String),
    Key {
        key: String,
        #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
        params: BTreeMap<String, String>,
    },
}

impl Message {
    pub fn key(key: impl Into<String>) -> Self {
        Message::Key {
            key: key.into(),
            params: BTreeMap::new(),
        }
    }

    /// Adds a parameter (`{name}` in the translated text). No-op on a raw
    /// message.
    pub fn with(mut self, name: &str, value: impl ToString) -> Self {
        if let Message::Key { params, .. } = &mut self {
            params.insert(name.to_string(), value.to_string());
        }
        self
    }

    /// The key, for code that branches on it (and for tests).
    pub fn key_name(&self) -> Option<&str> {
        match self {
            Message::Key { key, .. } => Some(key),
            Message::Raw(_) => None,
        }
    }
}

impl From<String> for Message {
    fn from(text: String) -> Self {
        Message::Raw(text)
    }
}

impl From<&str> for Message {
    fn from(text: &str) -> Self {
        Message::Raw(text.to_string())
    }
}

/// For logs and tests: the raw text, or the key with its parameters.
impl fmt::Display for Message {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Message::Raw(text) => f.write_str(text),
            Message::Key { key, params } if params.is_empty() => f.write_str(key),
            Message::Key { key, params } => {
                write!(f, "{key}(")?;
                for (index, (name, value)) in params.iter().enumerate() {
                    if index > 0 {
                        f.write_str(", ")?;
                    }
                    write!(f, "{name}={value}")?;
                }
                f.write_str(")")
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn raw_text_travels_as_a_plain_string() {
        let json = serde_json::to_string(&Message::from("Unknown column 'x'")).unwrap();
        assert_eq!(json, "\"Unknown column 'x'\"");
    }

    #[test]
    fn app_text_travels_as_key_and_params() {
        let message = Message::key("noPrimaryKey").with("table", "pedidos");
        assert_eq!(
            serde_json::to_string(&message).unwrap(),
            r#"{"key":"noPrimaryKey","params":{"table":"pedidos"}}"#
        );
        assert_eq!(
            serde_json::to_string(&Message::key("noActiveConnection")).unwrap(),
            r#"{"key":"noActiveConnection"}"#
        );
        assert_eq!(message.to_string(), "noPrimaryKey(table=pedidos)");
    }
}
