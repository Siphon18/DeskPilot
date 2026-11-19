use rusqlite::{params, Connection};
use chrono::Utc;
use uuid::Uuid;
use crate::models::{WorkspaceTaskDTO, CommandError};

pub fn create_task(conn: &Connection, workspace_id: &str, title: &str) -> Result<WorkspaceTaskDTO, CommandError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Task title cannot be empty".into(),
        });
    }
    if trimmed.len() > 120 {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Task title cannot exceed 120 characters".into(),
        });
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let max_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM workspace_tasks WHERE workspace_id = ?1",
        params![workspace_id],
        |row| row.get(0),
    ).unwrap_or(-1);

    let next_sort = max_sort + 1;

    conn.execute(
        "INSERT INTO workspace_tasks (id, workspace_id, title, is_completed, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6)",
        params![id, workspace_id, trimmed, next_sort, now, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to create task: {}", e),
    })?;

    Ok(WorkspaceTaskDTO {
        id,
        workspace_id: workspace_id.to_string(),
        title: trimmed.to_string(),
        is_completed: false,
        sort_order: next_sort,
        created_at: now.clone(),
        updated_at: now,
    })
}

pub fn toggle_task(conn: &Connection, task_id: &str, is_completed: bool) -> Result<(), CommandError> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE workspace_tasks SET is_completed = ?1, updated_at = ?2 WHERE id = ?3",
        params![if is_completed { 1 } else { 0 }, now, task_id],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to toggle task: {}", e),
    })?;
    Ok(())
}

pub fn delete_task(conn: &Connection, task_id: &str) -> Result<(), CommandError> {
    conn.execute("DELETE FROM workspace_tasks WHERE id = ?1", params![task_id]).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to delete task: {}", e),
    })?;
    Ok(())
}

pub fn reorder_tasks(conn: &mut Connection, workspace_id: &str, task_ids: &[String]) -> Result<(), CommandError> {
    let tx = conn.transaction().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to begin transaction: {}", e),
    })?;

    for (index, task_id) in task_ids.iter().enumerate() {
        tx.execute(
            "UPDATE workspace_tasks SET sort_order = ?1 WHERE id = ?2 AND workspace_id = ?3",
            params![index as i64, task_id, workspace_id],
        ).map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to update task order: {}", e),
        })?;
    }

    tx.commit().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to commit task reorder: {}", e),
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
    fn test_task_crud_and_toggle() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;"
        ).unwrap();
        run_migrations(&mut conn).unwrap();

        let ws = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Task Test".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        let task = create_task(&conn, &ws.id, "Buy coffee").unwrap();
        assert_eq!(task.title, "Buy coffee");
        assert_eq!(task.is_completed, false);

        toggle_task(&conn, &task.id, true).unwrap();
        let loaded = get_workspace(&conn, &ws.id).unwrap().unwrap();
        let found = loaded.tasks.iter().find(|t| t.id == task.id).unwrap();
        assert_eq!(found.is_completed, true);

        delete_task(&conn, &task.id).unwrap();
        let loaded2 = get_workspace(&conn, &ws.id).unwrap().unwrap();
        assert!(loaded2.tasks.iter().all(|t| t.id != task.id));
    }
}
