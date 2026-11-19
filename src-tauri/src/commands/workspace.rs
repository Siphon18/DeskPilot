use tauri::State;
use crate::database::connection::DbState;
use crate::database::repositories::workspace_repo;
use crate::models::{
    WorkspaceDTO, WorkspaceDetailDTO, CreateWorkspaceInput,
    UpdateWorkspaceInput, WorkspaceQuery, CommandError
};

#[tauri::command]
pub fn workspace_list(
    state: State<'_, DbState>,
    query: Option<WorkspaceQuery>,
) -> Result<Vec<WorkspaceDTO>, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::list_workspaces(&conn, query)
}

#[tauri::command]
pub fn workspace_get(
    state: State<'_, DbState>,
    id: String,
) -> Result<Option<WorkspaceDetailDTO>, CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::get_workspace(&conn, &id)
}

#[tauri::command]
pub fn workspace_create(
    state: State<'_, DbState>,
    input: CreateWorkspaceInput,
) -> Result<WorkspaceDetailDTO, CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::create_workspace(&mut conn, input)
}

#[tauri::command]
pub fn workspace_update(
    state: State<'_, DbState>,
    id: String,
    input: UpdateWorkspaceInput,
) -> Result<WorkspaceDetailDTO, CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::update_workspace(&mut conn, &id, input)
}

#[tauri::command]
pub fn workspace_delete(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::delete_workspace(&mut conn, &id)
}

#[tauri::command]
pub fn workspace_duplicate(
    state: State<'_, DbState>,
    id: String,
) -> Result<WorkspaceDetailDTO, CommandError> {
    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    workspace_repo::duplicate_workspace(&mut conn, &id)
}
