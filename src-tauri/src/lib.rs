pub mod adapters;
pub mod commands;
pub mod database;
pub mod models;
pub mod services;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Initialize Database and run migrations
            let db = database::connection::init_db(app.handle())
                .expect("Failed to initialize DeskPilot database");

            {
                let mut conn = db.conn.lock().expect("Failed to lock database");
                database::migrate::run_migrations(&mut conn)
                    .expect("Failed to execute database migrations");

                // Prune old runs on startup as per FR-L05
                let _ = database::repositories::launch_repo::prune_old_runs(&conn);
            }

            // Apply Windows 11 Mica / Acrylic native liquid glass effect
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    use window_vibrancy::{apply_mica, apply_acrylic};
                    // Attempt Windows 11 native Mica effect (dark mode)
                    if apply_mica(&window, Some(true)).is_err() {
                        // Fallback to Windows 10/11 Acrylic
                        let _ = apply_acrylic(&window, Some((17, 21, 27, 210)));
                    }
                }
            }

            // Register default global shortcut Ctrl+Space (or Ctrl+Alt+Space fallback)
            let shortcut_res = "ctrl+space".parse::<Shortcut>();
            let shortcut = match shortcut_res {
                Ok(s) => s,
                Err(_) => "ctrl+alt+space".parse::<Shortcut>().expect("Valid shortcut format"),
            };

            let _ = app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        let _ = window.emit("quick-switcher:show", ());
                    }
                }
            });

            // Also register ctrl+alt+space just in case
            if let Ok(alt_shortcut) = "ctrl+alt+space".parse::<Shortcut>() {
                let _ = app.global_shortcut().on_shortcut(alt_shortcut, |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.emit("quick-switcher:show", ());
                        }
                    }
                });
            }

            app.manage(db);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workspace::workspace_list,
            commands::workspace::workspace_get,
            commands::workspace::workspace_create,
            commands::workspace::workspace_update,
            commands::workspace::workspace_delete,
            commands::workspace::workspace_duplicate,
            commands::workspace::workspace_get_open_apps,
            commands::workspace::workspace_capture_current,
            commands::item::item_create,
            commands::item::item_update,
            commands::item::item_delete,
            commands::item::item_reorder,
            commands::item::pick_executable,
            commands::item::pick_folder,
            commands::notes::note_save,
            commands::tasks::task_create,
            commands::tasks::task_toggle,
            commands::tasks::task_delete,
            commands::tasks::task_reorder,
            commands::launch::launch_workspace,
            commands::launch::launch_get_run,
            commands::launch::launch_list_runs,
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_open_data_folder,
            commands::settings::settings_get_windows_theme_color,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeskPilot application");
}
