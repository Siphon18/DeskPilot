pub mod adapters;
pub mod commands;
pub mod database;
pub mod models;
pub mod services;

use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(launcher) = app.get_webview_window("launcher") {
                let _ = launcher.show();
                let _ = launcher.unminimize();
                let _ = launcher.set_focus();
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

            // Apply Windows 11 Mica / Acrylic native liquid glass effect to both windows
            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::{apply_mica, apply_acrylic};

                if let Some(main) = app.get_webview_window("main") {
                    if apply_mica(&main, Some(true)).is_err() {
                        let _ = apply_acrylic(&main, Some((17, 21, 27, 210)));
                    }
                }

                if let Some(launcher) = app.get_webview_window("launcher") {
                    if apply_acrylic(&launcher, Some((20, 26, 36, 220))).is_err() {
                        let _ = apply_mica(&launcher, Some(true));
                    }
                }
            }

            // Create System Tray with Quick Actions (matching design mockup)
            let launcher_item = MenuItem::with_id(app, "launcher", "Quick Launcher (Ctrl+Space)", true, None::<&str>)?;
            let capture_item = MenuItem::with_id(app, "capture", "Capture Desktop (Ctrl+Shift+C)", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings & Workspaces", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit DeskPilot", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&launcher_item, &capture_item, &settings_item, &sep, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("DeskPilot Quick Launcher")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "launcher" => {
                            if let Some(launcher) = app.get_webview_window("launcher") {
                                let _ = launcher.show();
                                let _ = launcher.unminimize();
                                let _ = launcher.set_focus();
                                let _ = launcher.emit("quick-launcher:focus", ());
                            }
                        }
                        "capture" => {
                            if let Some(launcher) = app.get_webview_window("launcher") {
                                let _ = launcher.show();
                                let _ = launcher.set_focus();
                                let _ = launcher.emit("workspace:capture-desktop", ());
                            }
                        }
                        "settings" => {
                            let _ = commands::window::open_main_dashboard(app.clone());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(launcher) = app.get_webview_window("launcher") {
                            if launcher.is_visible().unwrap_or(false) {
                                let _ = launcher.hide();
                            } else {
                                let _ = launcher.show();
                                let _ = launcher.unminimize();
                                let _ = launcher.set_focus();
                                let _ = launcher.emit("quick-launcher:focus", ());
                            }
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _ = tray_builder.build(app)?;

            // Register default global shortcut Ctrl+Space (or Ctrl+Alt+Space fallback)
            let shortcut_res = "ctrl+space".parse::<Shortcut>();
            let shortcut = match shortcut_res {
                Ok(s) => s,
                Err(_) => "ctrl+alt+space".parse::<Shortcut>().expect("Valid shortcut format"),
            };

            let _ = app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(launcher) = app.get_webview_window("launcher") {
                        if launcher.is_visible().unwrap_or(false) {
                            let _ = launcher.hide();
                        } else {
                            let _ = launcher.show();
                            let _ = launcher.unminimize();
                            let _ = launcher.set_focus();
                            let _ = launcher.emit("quick-launcher:focus", ());
                        }
                    }
                }
            });

            // Also register ctrl+alt+space just in case
            if let Ok(alt_shortcut) = "ctrl+alt+space".parse::<Shortcut>() {
                let _ = app.global_shortcut().on_shortcut(alt_shortcut, |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(launcher) = app.get_webview_window("launcher") {
                            if launcher.is_visible().unwrap_or(false) {
                                let _ = launcher.hide();
                            } else {
                                let _ = launcher.show();
                                let _ = launcher.unminimize();
                                let _ = launcher.set_focus();
                                let _ = launcher.emit("quick-launcher:focus", ());
                            }
                        }
                    }
                });
            }

            app.manage(db);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
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
            commands::window::start_dragging,
            commands::window::window_hide,
            commands::window::window_show,
            commands::window::window_minimize,
            commands::window::window_toggle_maximize,
            commands::window::open_main_dashboard,
            commands::window::close_launcher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeskPilot application");
}
