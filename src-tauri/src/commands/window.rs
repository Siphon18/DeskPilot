use tauri::Manager;

#[tauri::command]
pub fn window_minimize(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_hide(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_show(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_main_dashboard(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(launcher) = app.get_webview_window("launcher") {
        let _ = launcher.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn close_launcher(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(launcher) = app.get_webview_window("launcher") {
        let _ = launcher.hide();
    }
    Ok(())
}
