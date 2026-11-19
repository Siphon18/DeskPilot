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

            // Apply Windows 11 Acrylic native liquid glass effect to both windows
            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::{apply_acrylic, apply_blur};
                use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE};
                use windows::Win32::Foundation::HWND;

                for win_label in &["main", "launcher"] {
                    if let Some(window) = app.get_webview_window(win_label) {
                        if let Ok(hwnd) = window.hwnd() {
                            let win_hwnd = HWND(hwnd.0);
                            let dark_mode: u32 = 1;
                            unsafe {
                                let _ = DwmSetWindowAttribute(
                                    win_hwnd,
                                    DWMWA_USE_IMMERSIVE_DARK_MODE,
                                    &dark_mode as *const _ as _,
                                    std::mem::size_of::<u32>() as u32,
                                );
                            }
                        }

                        // Apply Windows 11 Acrylic blur behind with higher transparency (23% tint alpha) and blur fallback
                        if apply_acrylic(&window, Some((12, 16, 24, 60))).is_err() {
                            let _ = apply_blur(&window, Some((12, 16, 24, 60)));
                        }
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

            // Register Global Shortcuts that work everywhere, even when windows are closed or app is in background
            let handle = app.handle().clone();

            // 1. Quick Launcher Hotkeys: Ctrl+Space AND Alt+Space
            for sc_str in &["ctrl+space", "alt+space", "ctrl+alt+space"] {
                if let Ok(shortcut) = sc_str.parse::<Shortcut>() {
                    let h = handle.clone();
                    let sc_name = *sc_str;
                    let res = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                        if event.state == ShortcutState::Pressed {
                            if let Some(launcher) = h.get_webview_window("launcher") {
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
                    log::info!("Registered global shortcut {}: {:?}", sc_name, res);
                }
            }

            // 2. Capture Desktop: Ctrl+Shift+C (debounced to avoid multiple rapid executions)
            if let Ok(shortcut) = "ctrl+shift+c".parse::<Shortcut>() {
                let h = handle.clone();
                static LAST_SC_CAPTURE: std::sync::atomic::AtomicI64 = std::sync::atomic::AtomicI64::new(0);
                let res = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                    if event.state == ShortcutState::Pressed {
                        let now = chrono::Utc::now().timestamp_millis();
                        let prev = LAST_SC_CAPTURE.swap(now, std::sync::atomic::Ordering::SeqCst);
                        if now - prev < 1500 {
                            return;
                        }

                        if let Some(launcher) = h.get_webview_window("launcher") {
                            let _ = launcher.show();
                            let _ = launcher.unminimize();
                            let _ = launcher.set_focus();
                            let _ = launcher.emit("workspace:capture-desktop", ());
                        } else if let Some(main) = h.get_webview_window("main") {
                            let _ = main.emit("workspace:capture-desktop", ());
                        }
                    }
                });
                log::info!("Registered global shortcut ctrl+shift+c: {:?}", res);
            }

            // 3. Launch Last Workspace: Ctrl+Shift+L (debounced)
            if let Ok(shortcut) = "ctrl+shift+l".parse::<Shortcut>() {
                let h = handle.clone();
                static LAST_SC_LAUNCH: std::sync::atomic::AtomicI64 = std::sync::atomic::AtomicI64::new(0);
                let res = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                    if event.state == ShortcutState::Pressed {
                        let now = chrono::Utc::now().timestamp_millis();
                        let prev = LAST_SC_LAUNCH.swap(now, std::sync::atomic::Ordering::SeqCst);
                        if now - prev < 1500 {
                            return;
                        }

                        if let Some(main) = h.get_webview_window("main") {
                            let _ = main.emit("workspace:launch-last", ());
                        } else if let Some(launcher) = h.get_webview_window("launcher") {
                            let _ = launcher.emit("workspace:launch-last", ());
                        }
                    }
                });
                log::info!("Registered global shortcut ctrl+shift+l: {:?}", res);
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
