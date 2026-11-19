use tauri::State;
use crate::database::connection::DbState;
use crate::database::repositories::settings_repo;
use crate::adapters::folder_launcher::open_folder;
use crate::models::{AppSettings, CommandError};

#[tauri::command]
pub fn settings_get(
    state: State<'_, DbState>,
) -> Result<AppSettings, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    let data_dir_str = state.data_dir.to_string_lossy().to_string();
    settings_repo::get_settings(&conn, &data_dir_str)
}

#[tauri::command]
pub fn settings_update(
    state: State<'_, DbState>,
    settings: AppSettings,
) -> Result<AppSettings, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    let data_dir_str = state.data_dir.to_string_lossy().to_string();
    settings_repo::update_settings(&conn, &settings, &data_dir_str)
}

#[tauri::command]
pub fn settings_open_data_folder(
    state: State<'_, DbState>,
) -> Result<(), CommandError> {
    let data_dir_str = state.data_dir.to_string_lossy().to_string();
    open_folder(&data_dir_str)
}
