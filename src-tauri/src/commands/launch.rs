use tauri::{AppHandle, State};
use serde::Serialize;
use crate::database::connection::DbState;
use crate::database::repositories::launch_repo;
use crate::services::launch_service;
use crate::models::{LaunchRunDTO, LaunchRunDetailDTO, CommandError};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchWorkspaceResponse {
    pub run_id: String,
}

#[tauri::command]
pub fn launch_workspace(
    app: AppHandle,
    state: State<'_, DbState>,
    workspace_id: String,
) -> Result<LaunchWorkspaceResponse, CommandError> {
    let run_id = launch_service::start_workspace_launch(app, &state, &workspace_id)?;
    Ok(LaunchWorkspaceResponse { run_id })
}

#[tauri::command]
pub fn launch_get_run(
    state: State<'_, DbState>,
    run_id: String,
) -> Result<Option<LaunchRunDetailDTO>, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    launch_repo::get_launch_run(&conn, &run_id)
}

#[tauri::command]
pub fn launch_list_runs(
    state: State<'_, DbState>,
    limit: Option<usize>,
) -> Result<Vec<LaunchRunDTO>, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    launch_repo::list_launch_runs(&conn, limit)
}
