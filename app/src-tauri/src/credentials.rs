use keyring::{Entry, Error};

const SERVICE: &str = "com.khipudb.app.connection";

fn entry(profile_id: &str) -> Result<Entry, String> {
    if profile_id.is_empty() || profile_id.len() > 128 {
        return Err("invalid connection profile identifier".to_string());
    }

    Entry::new(SERVICE, profile_id).map_err(|error| error.to_string())
}

pub async fn save(profile_id: String, password: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        entry(&profile_id)?
            .set_password(&password)
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Sin almacen de credenciales (Linux sin Secret Service: `NoDefaultStore`)
/// no puede haber nada guardado. Leer o borrar no falla por eso: un perfil
/// que no guarda la contrasena tiene que poder conectar igual.
fn nothing_stored(error: &Error) -> bool {
    matches!(error, Error::NoEntry | Error::NoDefaultStore)
}

fn existing_entry(profile_id: &str) -> Result<Option<Entry>, String> {
    if profile_id.is_empty() || profile_id.len() > 128 {
        return Err("invalid connection profile identifier".to_string());
    }
    match Entry::new(SERVICE, profile_id) {
        Ok(entry) => Ok(Some(entry)),
        Err(error) if nothing_stored(&error) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

pub async fn load(profile_id: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(entry) = existing_entry(&profile_id)? else {
            return Ok(None);
        };
        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(error) if nothing_stored(&error) => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

pub async fn delete(profile_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(entry) = existing_entry(&profile_id)? else {
            return Ok(());
        };
        match entry.delete_credential() {
            Err(error) if !nothing_stored(&error) => Err(error.to_string()),
            _ => Ok(()),
        }
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn without_a_credential_store_nothing_is_stored() {
        assert!(nothing_stored(&Error::NoDefaultStore));
        assert!(nothing_stored(&Error::NoEntry));
        assert!(!nothing_stored(&Error::Invalid("a".into(), "b".into())));
    }

    #[test]
    fn an_invalid_profile_id_is_rejected_before_touching_the_store() {
        assert!(existing_entry("").is_err());
        assert!(existing_entry(&"x".repeat(129)).is_err());
    }
}
