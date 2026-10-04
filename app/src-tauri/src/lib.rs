mod commands;
mod credentials;
mod drivers;
mod engine_context;
mod services;
mod state;
mod support;
mod text_encoding;
mod updates;
mod webkit_env;

use state::AppState;
use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    webkit_env::apply();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // Remembers size, position and maximized state of the main window.
        // Connection windows get a random label (connectionWindow.ts), so
        // tracking them would only pile up entries that are never reused.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                .with_filter(|label| label == "main")
                .build(),
        )
        .manage(AppState::default())
        // Las lineas activas con los paquetes de soporte instalados; sin
        // ellos, o si alguno no es valido, las incluidas.
        .setup(|app| {
            support::activate_installed(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<AppState>() {
                    state
                        .connections
                        .lock()
                        .expect("connections mutex poisoned")
                        .remove(window.label());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::catalog::list_tables,
            commands::catalog::database_explorer,
            commands::catalog::set_visible_schemas,
            commands::connection::connect,
            commands::connection::disconnect,
            commands::query::execute_query,
            commands::query::cancel_query,
            commands::query::classify_statements,
            commands::query::analyze_sql,
            commands::catalog::table_definition,
            commands::connection::test_connection,
            commands::connection::save_connection_password,
            commands::connection::load_connection_password,
            commands::connection::delete_connection_password,
            commands::files::read_sql_file,
            commands::files::write_sql_file,
            commands::files::write_console_text,
            commands::files::read_console_text,
            commands::files::prune_console_texts,
            commands::files::rename_sql_file,
            commands::files::list_sql_dir,
            commands::files::create_sql_file,
            commands::files::trash_sql_file,
            commands::query::count_query_rows,
            commands::results::result_edit_info,
            commands::results::preview_result_changes,
            commands::results::apply_result_changes,
            commands::results::export_query_to_file,
            updates::update_context,
            updates::list_releases,
            updates::install_release,
            updates::restart_app,
            support::support_lines,
            support::check_support_updates,
            support::install_support_package,
            support::remove_support_package,
            support::set_support_line_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    /// Los nombres de `invoke("…")` en el frontend (app/src, sin tests).
    fn frontend_commands() -> std::collections::BTreeSet<String> {
        fn walk(dir: &std::path::Path, out: &mut Vec<std::path::PathBuf>) {
            for entry in std::fs::read_dir(dir).unwrap() {
                let path = entry.unwrap().path();
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                if path.is_dir() {
                    walk(&path, out);
                } else if (name.ends_with(".ts") || name.ends_with(".svelte"))
                    && !name.contains(".test.")
                {
                    out.push(path);
                }
            }
        }
        let mut files = Vec::new();
        walk(
            &std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src"),
            &mut files,
        );
        let mut found = std::collections::BTreeSet::new();
        for file in files {
            let text = std::fs::read_to_string(&file).unwrap();
            let mut rest = text.as_str();
            while let Some(at) = rest.find("invoke") {
                rest = &rest[at + "invoke".len()..];
                let mut chars = rest.trim_start();
                // invoke<T>(…): el tipo puede llevar sus propios < >.
                if let Some(generic) = chars.strip_prefix('<') {
                    let mut depth = 1;
                    let end = generic
                        .char_indices()
                        .find(|&(_, c)| {
                            depth += match c {
                                '<' => 1,
                                '>' => -1,
                                _ => 0,
                            };
                            depth == 0
                        })
                        .map(|(index, _)| index + 1);
                    let Some(end) = end else { continue };
                    chars = generic[end..].trim_start();
                }
                let Some(call) = chars.strip_prefix('(') else {
                    continue;
                };
                let Some(quoted) = call.trim_start().strip_prefix('"') else {
                    continue;
                };
                if let Some(end) = quoted.find('"') {
                    found.insert(quoted[..end].to_string());
                }
            }
        }
        found
    }

    /// La superficie IPC: lo que registra `run()` es exactamente lo que llama
    /// el frontend. Un comando que se mueve, se renombra o queda sin
    /// registrar rompe esto antes que la app.
    #[test]
    fn the_registered_commands_are_exactly_the_ones_the_frontend_invokes() {
        let lib = include_str!("lib.rs");
        let start = lib.find("generate_handler![").unwrap() + "generate_handler![".len();
        let end = start + lib[start..].find(']').unwrap();
        let registered: std::collections::BTreeSet<String> = lib[start..end]
            .split(',')
            .map(|path| path.trim().rsplit("::").next().unwrap().to_string())
            .filter(|name| !name.is_empty())
            .collect();
        assert_eq!(registered, frontend_commands());
    }
}
