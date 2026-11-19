use tauri::State;
use crate::database::connection::DbState;
use crate::database::repositories::notes_repo;
use crate::models::CommandError;

#[tauri::command]
pub fn note_save(
    state: State<'_, DbState>,
    workspace_id: String,
    content: String,
) -> Result<(), CommandError> {
    let conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;
    notes_repo::save_note(&conn, &workspace_id, &content)
}
