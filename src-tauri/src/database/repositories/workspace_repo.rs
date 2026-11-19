use rusqlite::{params, Connection, OptionalExtension};
use chrono::Utc;
use uuid::Uuid;
use crate::models::{
    WorkspaceDTO, WorkspaceDetailDTO, LaunchItemDTO, WorkspaceTaskDTO,
    CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceQuery, CommandError
};

pub fn list_workspaces(conn: &Connection, query: Option<WorkspaceQuery>) -> Result<Vec<WorkspaceDTO>, CommandError> {
    let q = query.unwrap_or_default();
    let mut sql = String::from(
        "SELECT w.id, w.name, w.description, w.icon, w.color, w.is_favorite, w.sort_order,
                (SELECT COUNT(*) FROM launch_items WHERE workspace_id = w.id) as item_count,
                w.created_at, w.updated_at, w.last_launched_at
         FROM workspaces w
         WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref search) = q.search {
        let trimmed = search.trim();
        if !trimmed.is_empty() {
            sql.push_str(" AND (w.name LIKE ? OR w.description LIKE ?)");
            let pattern = format!("%{}%", trimmed);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }
    }

    if let Some(true) = q.favorites_only {
        sql.push_str(" AND w.is_favorite = 1");
    }

    match q.sort_by.as_deref() {
        Some("recently_launched") => sql.push_str(" ORDER BY w.last_launched_at DESC NULLS LAST, w.sort_order ASC"),
        Some("name") => sql.push_str(" ORDER BY w.name COLLATE NOCASE ASC"),
        _ => sql.push_str(" ORDER BY w.is_favorite DESC, w.sort_order ASC, w.created_at ASC"),
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prepare query: {}", e),
    })?;

    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

    let rows = stmt.query_map(params_slice.as_slice(), |row| {
        let is_fav: i64 = row.get(5)?;
        Ok(WorkspaceDTO {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            is_favorite: is_fav == 1,
            sort_order: row.get(6)?,
            item_count: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
            last_launched_at: row.get(10)?,
        })
    }).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to execute list query: {}", e),
    })?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to read workspace row: {}", e),
        })?);
    }

    Ok(result)
}

pub fn get_workspace(conn: &Connection, id: &str) -> Result<Option<WorkspaceDetailDTO>, CommandError> {
    let ws_res: Option<WorkspaceDTO> = conn.query_row(
        "SELECT w.id, w.name, w.description, w.icon, w.color, w.is_favorite, w.sort_order,
                (SELECT COUNT(*) FROM launch_items WHERE workspace_id = w.id) as item_count,
                w.created_at, w.updated_at, w.last_launched_at
         FROM workspaces w
         WHERE w.id = ?1",
        params![id],
        |row| {
            let is_fav: i64 = row.get(5)?;
            Ok(WorkspaceDTO {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                is_favorite: is_fav == 1,
                sort_order: row.get(6)?,
                item_count: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                last_launched_at: row.get(10)?,
            })
        }
    ).optional().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to get workspace: {}", e),
    })?;

    let ws = match ws_res {
        Some(w) => w,
        None => return Ok(None),
    };

    // Load items
    let mut items_stmt = conn.prepare(
        "SELECT id, workspace_id, type, name, config_json, enabled, sort_order, created_at, updated_at
         FROM launch_items
         WHERE workspace_id = ?1
         ORDER BY sort_order ASC, created_at ASC"
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prepare items query: {}", e),
    })?;

    let items_rows = items_stmt.query_map(params![id], |row| {
        let item_type: String = row.get(2)?;
        let config_str: String = row.get(4)?;
        let config_json = serde_json::from_str(&config_str).unwrap_or(serde_json::Value::Null);
        let enabled_int: i64 = row.get(5)?;
        let is_missing = super::item_repo::check_item_missing(&item_type, &config_json);
        Ok(LaunchItemDTO {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            item_type,
            name: row.get(3)?,
            config: config_json,
            enabled: enabled_int == 1,
            sort_order: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_missing: Some(is_missing),
        })
    }).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to query launch items: {}", e),
    })?;

    let mut items = Vec::new();
    for item in items_rows {
        items.push(item.map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to read launch item row: {}", e),
        })?);
    }

    // Load note
    let note: String = conn.query_row(
        "SELECT content FROM workspace_notes WHERE workspace_id = ?1",
        params![id],
        |row| row.get(0),
    ).optional().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to get note: {}", e),
    })?.unwrap_or_default();

    // Load tasks
    let mut tasks_stmt = conn.prepare(
        "SELECT id, workspace_id, title, is_completed, sort_order, created_at, updated_at
         FROM workspace_tasks
         WHERE workspace_id = ?1
         ORDER BY is_completed ASC, sort_order ASC, created_at ASC"
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to prepare tasks query: {}", e),
    })?;

    let tasks_rows = tasks_stmt.query_map(params![id], |row| {
        let is_completed: i64 = row.get(3)?;
        Ok(WorkspaceTaskDTO {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            is_completed: is_completed == 1,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to query tasks: {}", e),
    })?;

    let mut tasks = Vec::new();
    for task in tasks_rows {
        tasks.push(task.map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to read task row: {}", e),
        })?);
    }

    Ok(Some(WorkspaceDetailDTO {
        id: ws.id,
        name: ws.name,
        description: ws.description,
        icon: ws.icon,
        color: ws.color,
        is_favorite: ws.is_favorite,
        sort_order: ws.sort_order,
        item_count: ws.item_count,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        last_launched_at: ws.last_launched_at,
        items,
        note,
        tasks,
    }))
}

pub fn create_workspace(conn: &mut Connection, input: CreateWorkspaceInput) -> Result<WorkspaceDetailDTO, CommandError> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Workspace name cannot be empty".into(),
        });
    }
    if name.len() > 40 {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Workspace name cannot exceed 40 characters".into(),
        });
    }

    let description = input.description.as_deref().unwrap_or("").trim();
    if description.len() > 160 {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Description cannot exceed 160 characters".into(),
        });
    }

    let icon = input.icon.as_deref().unwrap_or("layout-grid");
    let color = input.color.as_deref().unwrap_or("blue");
    let is_favorite = input.is_favorite.unwrap_or(false);

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Get max sort_order
    let max_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM workspaces",
        [],
        |row| row.get(0),
    ).unwrap_or(-1);

    let next_sort = max_sort + 1;

    let tx = conn.transaction().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to begin transaction: {}", e),
    })?;

    tx.execute(
        "INSERT INTO workspaces (id, name, description, icon, color, is_favorite, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, name, description, icon, color, if is_favorite { 1 } else { 0 }, next_sort, now, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to insert workspace: {}", e),
    })?;

    // Create empty note
    tx.execute(
        "INSERT INTO workspace_notes (workspace_id, content, updated_at) VALUES (?1, '', ?2)",
        params![id, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to create workspace note: {}", e),
    })?;

    tx.commit().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to commit transaction: {}", e),
    })?;

    get_workspace(conn, &id)?.ok_or_else(|| CommandError {
        code: "DATABASE_ERROR".into(),
        message: "Failed to retrieve newly created workspace".into(),
    })
}

pub fn update_workspace(conn: &mut Connection, id: &str, input: UpdateWorkspaceInput) -> Result<WorkspaceDetailDTO, CommandError> {
    let current = get_workspace(conn, id)?.ok_or_else(|| CommandError {
        code: "WORKSPACE_NOT_FOUND".into(),
        message: "This workspace no longer exists".into(),
    })?;

    let name = match input.name.as_deref() {
        Some(n) => {
            let trimmed = n.trim();
            if trimmed.is_empty() {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Workspace name cannot be empty".into(),
                });
            }
            if trimmed.len() > 40 {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Workspace name cannot exceed 40 characters".into(),
                });
            }
            trimmed.to_string()
        }
        None => current.name,
    };

    let description = match input.description.as_deref() {
        Some(d) => {
            let trimmed = d.trim();
            if trimmed.len() > 160 {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Description cannot exceed 160 characters".into(),
                });
            }
            trimmed.to_string()
        }
        None => current.description,
    };

    let icon = input.icon.unwrap_or(current.icon);
    let color = input.color.unwrap_or(current.color);
    let is_favorite = input.is_favorite.unwrap_or(current.is_favorite);
    let sort_order = input.sort_order.unwrap_or(current.sort_order);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE workspaces SET name = ?1, description = ?2, icon = ?3, color = ?4, is_favorite = ?5, sort_order = ?6, updated_at = ?7
         WHERE id = ?8",
        params![name, description, icon, color, if is_favorite { 1 } else { 0 }, sort_order, now, id],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to update workspace: {}", e),
    })?;

    get_workspace(conn, id)?.ok_or_else(|| CommandError {
        code: "DATABASE_ERROR".into(),
        message: "Failed to reload updated workspace".into(),
    })
}

pub fn delete_workspace(conn: &mut Connection, id: &str) -> Result<(), CommandError> {
    let tx = conn.transaction().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to start transaction: {}", e),
    })?;

    // Foreign keys with CASCADE will delete items, notes, tasks.
    // launch_runs has ON DELETE SET NULL to preserve history.
    tx.execute("DELETE FROM workspaces WHERE id = ?1", params![id]).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to delete workspace: {}", e),
    })?;

    tx.commit().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to commit delete: {}", e),
    })?;

    Ok(())
}

pub fn duplicate_workspace(conn: &mut Connection, id: &str) -> Result<WorkspaceDetailDTO, CommandError> {
    let original = get_workspace(conn, id)?.ok_or_else(|| CommandError {
        code: "WORKSPACE_NOT_FOUND".into(),
        message: "Original workspace not found".into(),
    })?;

    let new_id = Uuid::new_v4().to_string();
    let new_name = format!("{} (Copy)", original.name);
    let now = Utc::now().to_rfc3339();

    let tx = conn.transaction().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to begin transaction: {}", e),
    })?;

    let max_sort: i64 = tx.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM workspaces",
        [],
        |row| row.get(0),
    ).unwrap_or(-1);

    tx.execute(
        "INSERT INTO workspaces (id, name, description, icon, color, is_favorite, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            new_id,
            new_name,
            original.description,
            original.icon,
            original.color,
            0,
            max_sort + 1,
            now,
            now
        ],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to clone workspace: {}", e),
    })?;

    // Duplicate launch items
    for item in original.items {
        let item_id = Uuid::new_v4().to_string();
        let config_str = item.config.to_string();
        tx.execute(
            "INSERT INTO launch_items (id, workspace_id, type, name, config_json, enabled, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                item_id,
                new_id,
                item.item_type,
                item.name,
                config_str,
                if item.enabled { 1 } else { 0 },
                item.sort_order,
                now,
                now
            ],
        ).map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to copy launch item: {}", e),
        })?;
    }

    // Duplicate note
    tx.execute(
        "INSERT INTO workspace_notes (workspace_id, content, updated_at) VALUES (?1, ?2, ?3)",
        params![new_id, original.note, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to copy note: {}", e),
    })?;

    // Duplicate checklist tasks (reset completed to false by default as per FR-W03)
    for task in original.tasks {
        let task_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO workspace_tasks (id, workspace_id, title, is_completed, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6)",
            params![task_id, new_id, task.title, task.sort_order, now, now],
        ).map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to copy task: {}", e),
        })?;
    }

    tx.commit().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to commit workspace duplicate: {}", e),
    })?;

    get_workspace(conn, &new_id)?.ok_or_else(|| CommandError {
        code: "DATABASE_ERROR".into(),
        message: "Failed to load duplicated workspace".into(),
    })
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrate::run_migrations;

    fn setup_test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;"
        ).unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn test_create_and_list_workspaces() {
        let mut conn = setup_test_db();

        let input = CreateWorkspaceInput {
            name: "Study".into(),
            description: Some("Study materials".into()),
            icon: Some("book-open".into()),
            color: Some("purple".into()),
            is_favorite: Some(true),
        };

        let created = create_workspace(&mut conn, input).unwrap();
        assert_eq!(created.name, "Study");
        assert_eq!(created.is_favorite, true);

        let list = list_workspaces(&conn, None).unwrap();
        // 1 from seed ("Development") + 1 created ("Study")
        assert!(list.iter().any(|w| w.name == "Study"));
    }

    #[test]
    fn test_validation_rejects_empty_name() {
        let mut conn = setup_test_db();
        let input = CreateWorkspaceInput {
            name: "   ".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        };
        let res = create_workspace(&mut conn, input);
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code, "COMMAND_VALIDATION_FAILED");
    }

    #[test]
    fn test_update_workspace() {
        let mut conn = setup_test_db();
        let created = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Gaming".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        let updated = update_workspace(&mut conn, &created.id, UpdateWorkspaceInput {
            name: Some("Gaming Rig".into()),
            description: Some("New description".into()),
            icon: None,
            color: None,
            is_favorite: Some(true),
            sort_order: None,
        }).unwrap();

        assert_eq!(updated.name, "Gaming Rig");
        assert_eq!(updated.description, "New description");
        assert_eq!(updated.is_favorite, true);
    }

    #[test]
    fn test_delete_workspace() {
        let mut conn = setup_test_db();
        let created = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Temporary".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        delete_workspace(&mut conn, &created.id).unwrap();
        let fetched = get_workspace(&conn, &created.id).unwrap();
        assert!(fetched.is_none());
    }

    #[test]
    fn test_duplicate_workspace() {
        let mut conn = setup_test_db();
        let created = create_workspace(&mut conn, CreateWorkspaceInput {
            name: "Work".into(),
            description: Some("Work setup".into()),
            icon: Some("briefcase".into()),
            color: Some("blue".into()),
            is_favorite: Some(true),
        }).unwrap();

        let dup = duplicate_workspace(&mut conn, &created.id).unwrap();
        assert_eq!(dup.name, "Work (Copy)");
        assert_eq!(dup.is_favorite, false); // FR-W03: resets favorite/completion
        assert_ne!(dup.id, created.id);
    }
}
