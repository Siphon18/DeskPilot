use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use crate::database::connection::DbState;
use crate::database::repositories::item_repo;
use crate::models::{LaunchItemDTO, CreateLaunchItemInput, UpdateLaunchItemInput, CommandError};

#[tauri::command]
pub fn item_create(
    state: State<'_, DbState>,
    workspace_id: String,
    input: CreateLaunchItemInput,
) -> Result<LaunchItemDTO, CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    item_repo::create_item(&mut conn, &workspace_id, input)
}

#[tauri::command]
pub fn item_update(
    state: State<'_, DbState>,
    id: String,
    input: UpdateLaunchItemInput,
) -> Result<LaunchItemDTO, CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    item_repo::update_item(&mut conn, &id, input)
}

#[tauri::command]
pub fn item_delete(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    item_repo::delete_item(&mut conn, &id)
}

#[tauri::command]
pub fn item_reorder(
    state: State<'_, DbState>,
    workspace_id: String,
    item_ids: Vec<String>,
) -> Result<(), CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    item_repo::reorder_items(&mut conn, &workspace_id, &item_ids)
}

#[tauri::command]
pub fn pick_executable(app: AppHandle) -> Result<Option<String>, CommandError> {
    let file = app.dialog()
        .file()
        .add_filter("Executables and Shortcuts (*.exe, *.lnk)", &["exe", "lnk"])
        .blocking_pick_file();

    Ok(file.and_then(|f| f.as_path().map(|p| p.to_string_lossy().to_string())))
}

#[tauri::command]
pub fn pick_folder(app: AppHandle) -> Result<Option<String>, CommandError> {
    let folder = app.dialog()
        .file()
        .blocking_pick_folder();

    Ok(folder.and_then(|f| f.as_path().map(|p| p.to_string_lossy().to_string())))
}
