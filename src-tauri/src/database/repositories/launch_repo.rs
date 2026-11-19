use rusqlite::{params, Connection, OptionalExtension};
use chrono::Utc;
use uuid::Uuid;
use crate::models::{LaunchRunDTO, LaunchRunDetailDTO, LaunchItemResult, CommandError};

pub fn create_launch_run(
    conn: &Connection,
    workspace_id: &str,
    workspace_name_snapshot: &str,
    total_count: usize,
) -> Result<String, CommandError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO launch_runs (id, workspace_id, workspace_name_snapshot, status, started_at, total_count)
         VALUES (?1, ?2, ?3, 'running', ?4, ?5)",
        params![id, workspace_id, workspace_name_snapshot, now, total_count as i64],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to create launch run: {}", e),
    })?;

    Ok(id)
}

pub fn record_item_run(
    conn: &Connection,
    run_id: &str,
    launch_item_id: Option<&str>,
    item_name_snapshot: &str,
    item_type: &str,
    status: &str,
    duration_ms: i64,
    message: &str,
    error_code: Option<&str>,
) -> Result<(), CommandError> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO launch_run_items (id, run_id, launch_item_id, item_name_snapshot, item_type, status, completed_at, duration_ms, message, error_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            run_id,
            launch_item_id,
            item_name_snapshot,
            item_type,
            status,
            now,
            duration_ms,
            message,
            error_code
        ],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to record launch run item: {}", e),
    })?;

    Ok(())
}

pub fn finalize_launch_run(
    conn: &Connection,
    run_id: &str,
    status: &str,
    success_count: i64,
    warning_count: i64,
    failed_count: i64,
    skipped_count: i64,
) -> Result<(), CommandError> {
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE launch_runs
         SET status = ?1, completed_at = ?2, success_count = ?3, warning_count = ?4, failed_count = ?5, skipped_count = ?6
         WHERE id = ?7",
        params![status, now, success_count, warning_count, failed_count, skipped_count, run_id],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to finalize launch run: {}", e),
    })?;

    Ok(())
}

pub fn list_launch_runs(conn: &Connection, limit: Option<usize>) -> Result<Vec<LaunchRunDTO>, CommandError> {
    let limit_val = limit.unwrap_or(20) as i64;
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, workspace_name_snapshot, status, started_at, completed_at,
                total_count, success_count, warning_count, failed_count, skipped_count
         FROM launch_runs
         ORDER BY started_at DESC
         LIMIT ?1"
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prepare launch runs query: {}", e),
    })?;

    let rows = stmt.query_map(params![limit_val], |row| {
        Ok(LaunchRunDTO {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            workspace_name_snapshot: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get(4)?,
            completed_at: row.get(5)?,
            total_count: row.get(6)?,
            success_count: row.get(7)?,
            warning_count: row.get(8)?,
            failed_count: row.get(9)?,
            skipped_count: row.get(10)?,
        })
    }).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to list launch runs: {}", e),
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to read launch run row: {}", e),
        })?);
    }

    Ok(result)
}

pub fn get_launch_run(conn: &Connection, run_id: &str) -> Result<Option<LaunchRunDetailDTO>, CommandError> {
    let run_res: Option<LaunchRunDTO> = conn.query_row(
        "SELECT id, workspace_id, workspace_name_snapshot, status, started_at, completed_at,
                total_count, success_count, warning_count, failed_count, skipped_count
         FROM launch_runs
         WHERE id = ?1",
        params![run_id],
        |row| {
            Ok(LaunchRunDTO {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                workspace_name_snapshot: row.get(2)?,
                status: row.get(3)?,
                started_at: row.get(4)?,
                completed_at: row.get(5)?,
                total_count: row.get(6)?,
                success_count: row.get(7)?,
                warning_count: row.get(8)?,
                failed_count: row.get(9)?,
                skipped_count: row.get(10)?,
            })
        }
    ).optional().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to read launch run: {}", e),
    })?;

    let run = match run_res {
        Some(r) => r,
        None => return Ok(None),
    };

    let mut stmt = conn.prepare(
        "SELECT COALESCE(launch_item_id, ''), item_name_snapshot, item_type, status,
                started_at, completed_at, duration_ms, message, error_code
         FROM launch_run_items
         WHERE run_id = ?1
         ORDER BY completed_at ASC"
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prepare run items query: {}", e),
    })?;

    let rows = stmt.query_map(params![run_id], |row| {
        Ok(LaunchItemResult {
            item_id: row.get(0)?,
            item_name: row.get(1)?,
            item_type: row.get(2)?,
            status: row.get(3)?,
            started_at: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            completed_at: row.get(5)?,
            duration_ms: row.get(6)?,
            message: row.get(7)?,
            error_code: row.get(8)?,
        })
    }).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to query run items: {}", e),
    })?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to read run item: {}", e),
        })?);
    }

    Ok(Some(LaunchRunDetailDTO {
        id: run.id,
        workspace_id: run.workspace_id,
        workspace_name_snapshot: run.workspace_name_snapshot,
        status: run.status,
        started_at: run.started_at,
        completed_at: run.completed_at,
        total_count: run.total_count,
        success_count: run.success_count,
        warning_count: run.warning_count,
        failed_count: run.failed_count,
        skipped_count: run.skipped_count,
        items,
    }))
}

pub fn prune_old_runs(conn: &Connection) -> Result<(), CommandError> {
    // Keep max 500 runs and max 90 days
    conn.execute(
        "DELETE FROM launch_runs
         WHERE id NOT IN (
             SELECT id FROM launch_runs ORDER BY started_at DESC LIMIT 500
         )",
        [],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prune old runs by count: {}", e),
    })?;

    conn.execute(
        "DELETE FROM launch_runs
         WHERE datetime(started_at) < datetime('now', '-90 days')",
        [],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prune old runs by age: {}", e),
    })?;

    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrate::run_migrations;
    use crate::models::CreateWorkspaceInput;
    use crate::database::repositories::workspace_repo::create_workspace;

    fn setup_test_db() -> (Connection, String) {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;"
        ).unwrap();
        run_migrations(&mut conn).unwrap();

        let ws = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Launch Test WS".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        (conn, ws.id)
    }

    #[test]
    fn test_launch_run_lifecycle() {
        let (conn, ws_id) = setup_test_db();

        let run_id = create_launch_run(&conn, &ws_id, "Launch Test WS", 2).unwrap();

        record_item_run(
            &conn,
            &run_id,
            None,
            "App Item",
            "application",
            "success",
            45,
            "Launched successfully",
            None,
        ).unwrap();

        record_item_run(
            &conn,
            &run_id,
            None,
            "Folder Item",
            "folder",
            "warning",
            12,
            "Opened with fallback",
            None,
        ).unwrap();

        finalize_launch_run(&conn, &run_id, "completed_with_errors", 1, 1, 0, 0).unwrap();

        let runs = list_launch_runs(&conn, Some(10)).unwrap();
        assert!(!runs.is_empty());
        assert_eq!(runs[0].id, run_id);
        assert_eq!(runs[0].status, "completed_with_errors");

        let detail = get_launch_run(&conn, &run_id).unwrap().unwrap();
        assert_eq!(detail.items.len(), 2);
        assert_eq!(detail.items[0].status, "success");
        assert_eq!(detail.items[1].status, "warning");
    }
}
