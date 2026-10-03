mod catalog_adapter;
mod commands;
mod console_texts;
mod credentials;
mod drivers;
mod export;
mod result_editing;
mod sql_files;
mod state;
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
            updates::restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
