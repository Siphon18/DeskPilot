use rusqlite::{params, Connection};
use chrono::Utc;
use crate::models::CommandError;

pub fn save_note(conn: &Connection, workspace_id: &str, content: &str) -> Result<(), CommandError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO workspace_notes (workspace_id, content, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(workspace_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at",
        params![workspace_id, content, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to save note: {}", e),
    })?;
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrate::run_migrations;
    use crate::models::CreateWorkspaceInput;
    use crate::database::repositories::workspace_repo::{create_workspace, get_workspace};

    #[test]
    fn test_save_and_retrieve_note() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;"
        ).unwrap();
        run_migrations(&mut conn).unwrap();

        let ws = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Note Test".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        save_note(&conn, &ws.id, "# Custom Note\n\n- task 1").unwrap();
        let loaded = get_workspace(&conn, &ws.id).unwrap().unwrap();
        assert_eq!(loaded.note, "# Custom Note\n\n- task 1");
    }
}
