use tauri::State;
use crate::database::connection::DbState;
use crate::database::repositories::tasks_repo;
use crate::models::{WorkspaceTaskDTO, CommandError};

#[tauri::command]
pub fn task_create(
    state: State<'_, DbState>,
    workspace_id: String,
    title: String,
) -> Result<WorkspaceTaskDTO, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    tasks_repo::create_task(&conn, &workspace_id, &title)
}

#[tauri::command]
pub fn task_toggle(
    state: State<'_, DbState>,
    task_id: String,
    is_completed: bool,
) -> Result<(), CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    tasks_repo::toggle_task(&conn, &task_id, is_completed)
}

#[tauri::command]
pub fn task_delete(
    state: State<'_, DbState>,
    task_id: String,
) -> Result<(), CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    tasks_repo::delete_task(&conn, &task_id)
}

#[tauri::command]
pub fn task_reorder(
    state: State<'_, DbState>,
    workspace_id: String,
    task_ids: Vec<String>,
) -> Result<(), CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    tasks_repo::reorder_tasks(&mut conn, &workspace_id, &task_ids)
}
