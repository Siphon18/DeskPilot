use rusqlite::{params, Connection, OptionalExtension};
use chrono::Utc;
use uuid::Uuid;
use std::path::Path;
use url::Url;
use crate::models::{LaunchItemDTO, CreateLaunchItemInput, UpdateLaunchItemInput, CommandError};

pub fn validate_item_config(item_type: &str, config: &serde_json::Value) -> Result<(), CommandError> {
    match item_type {
        "application" => {
            let exe_path = config.get("executablePath")
                .and_then(|v| v.as_str())
                .ok_or_else(|| CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Application executablePath is required".into(),
                })?;

            let trimmed = exe_path.trim();
            if trimmed.is_empty() {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Executable path cannot be empty".into(),
                });
            }

            let lower = trimmed.to_lowercase();
            if !lower.ends_with(".exe") && !lower.ends_with(".lnk") {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Application must be a .exe or .lnk file".into(),
                });
            }

            if let Some(args_val) = config.get("args") {
                if !args_val.is_array() {
                    return Err(CommandError {
                        code: "COMMAND_VALIDATION_FAILED".into(),
                        message: "Application args must be an array of strings".into(),
                    });
                }
            }
        }
        "folder" => {
            let path = config.get("path")
                .and_then(|v| v.as_str())
                .ok_or_else(|| CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Folder path is required".into(),
                })?;

            if path.trim().is_empty() {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Folder path cannot be empty".into(),
                });
            }
        }
        "url" => {
            let url_str = config.get("url")
                .and_then(|v| v.as_str())
                .ok_or_else(|| CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "URL is required".into(),
                })?;

            let trimmed = url_str.trim();
            if trimmed.len() > 2000 {
                return Err(CommandError {
                    code: "URL_INVALID".into(),
                    message: "URL cannot exceed 2000 characters".into(),
                });
            }

            let parsed = Url::parse(trimmed).map_err(|_| CommandError {
                code: "URL_INVALID".into(),
                message: "Enter a valid HTTP or HTTPS address".into(),
            })?;

            if parsed.scheme() != "http" && parsed.scheme() != "https" {
                return Err(CommandError {
                    code: "URL_INVALID".into(),
                    message: "Only http:// and https:// URLs are allowed".into(),
                });
            }

            if !parsed.username().is_empty() || parsed.password().is_some() {
                return Err(CommandError {
                    code: "URL_INVALID".into(),
                    message: "URLs with embedded credentials are not permitted".into(),
                });
            }
        }
        "terminal" => {
            let working_dir = config.get("workingDirectory")
                .and_then(|v| v.as_str())
                .ok_or_else(|| CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Terminal workingDirectory is required".into(),
                })?;

            if working_dir.trim().is_empty() {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Terminal working directory cannot be empty".into(),
                });
            }

            let term = config.get("terminal").and_then(|v| v.as_str()).unwrap_or("windowsTerminal");
            if term != "windowsTerminal" && term != "powershell" {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Invalid terminal type. Supported: windowsTerminal, powershell".into(),
                });
            }
        }
        _ => {
            return Err(CommandError {
                code: "COMMAND_VALIDATION_FAILED".into(),
                message: format!("Unsupported launch item type: {}", item_type),
            });
        }
    }
    Ok(())
}

pub fn check_item_missing(item_type: &str, config: &serde_json::Value) -> bool {
    match item_type {
        "application" => {
            if let Some(path) = config.get("executablePath").and_then(|v| v.as_str()) {
                !Path::new(path).exists()
            } else {
                true
            }
        }
        "folder" => {
            if let Some(path) = config.get("path").and_then(|v| v.as_str()) {
                let p = Path::new(path);
                !p.exists() || !p.is_dir()
            } else {
                true
            }
        }
        "terminal" => {
            if let Some(path) = config.get("workingDirectory").and_then(|v| v.as_str()) {
                let p = Path::new(path);
                !p.exists() || !p.is_dir()
            } else {
                true
            }
        }
        _ => false,
    }
}

pub fn create_item(
    conn: &mut Connection,
    workspace_id: &str,
    input: CreateLaunchItemInput,
) -> Result<LaunchItemDTO, CommandError> {
    let item_type = input.item_type.trim();
    validate_item_config(item_type, &input.config)?;

    let name = input.name.trim();
    if name.is_empty() {
        return Err(CommandError {
            code: "COMMAND_VALIDATION_FAILED".into(),
            message: "Item display name cannot be empty".into(),
        });
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let enabled = input.enabled.unwrap_or(true);
    let config_str = input.config.to_string();

    let max_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM launch_items WHERE workspace_id = ?1",
        params![workspace_id],
        |row| row.get(0),
    ).unwrap_or(-1);

    let next_sort = max_sort + 1;

    conn.execute(
        "INSERT INTO launch_items (id, workspace_id, type, name, config_json, enabled, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, workspace_id, item_type, name, config_str, if enabled { 1 } else { 0 }, next_sort, now, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to create launch item: {}", e),
    })?;

    // Also touch workspace updated_at
    let _ = conn.execute(
        "UPDATE workspaces SET updated_at = ?1 WHERE id = ?2",
        params![now, workspace_id],
    );

    let is_missing = check_item_missing(item_type, &input.config);

    Ok(LaunchItemDTO {
        id,
        workspace_id: workspace_id.to_string(),
        item_type: item_type.to_string(),
        name: name.to_string(),
        config: input.config,
        enabled,
        sort_order: next_sort,
        created_at: now.clone(),
        updated_at: now,
        is_missing: Some(is_missing),
    })
}

pub fn update_item(
    conn: &mut Connection,
    id: &str,
    input: UpdateLaunchItemInput,
) -> Result<LaunchItemDTO, CommandError> {
    let current_res: Option<(String, String, String, String, i64, i64, String)> = conn.query_row(
        "SELECT workspace_id, type, name, config_json, enabled, sort_order, created_at
         FROM launch_items WHERE id = ?1",
        params![id],
        |row| Ok((
            row.get(0)?,
            row.get(1)?,
            row.get(2)?,
            row.get(3)?,
            row.get(4)?,
            row.get(5)?,
            row.get(6)?,
        )),
    ).optional().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to read item: {}", e),
    })?;

    let (workspace_id, item_type, current_name, current_config_str, current_enabled_int, current_sort, created_at) =
        current_res.ok_or_else(|| CommandError {
            code: "PATH_NOT_FOUND".into(),
            message: "Launch item not found".into(),
        })?;

    let name = match input.name.as_deref() {
        Some(n) => {
            let trimmed = n.trim();
            if trimmed.is_empty() {
                return Err(CommandError {
                    code: "COMMAND_VALIDATION_FAILED".into(),
                    message: "Item display name cannot be empty".into(),
                });
            }
            trimmed.to_string()
        }
        None => current_name,
    };

    let config = match input.config {
        Some(c) => {
            validate_item_config(&item_type, &c)?;
            c
        }
        None => serde_json::from_str(&current_config_str).unwrap_or(serde_json::Value::Null),
    };

    let enabled = input.enabled.unwrap_or(current_enabled_int == 1);
    let sort_order = input.sort_order.unwrap_or(current_sort);
    let now = Utc::now().to_rfc3339();
    let config_str = config.to_string();

    conn.execute(
        "UPDATE launch_items
         SET name = ?1, config_json = ?2, enabled = ?3, sort_order = ?4, updated_at = ?5
         WHERE id = ?6",
        params![name, config_str, if enabled { 1 } else { 0 }, sort_order, now, id],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to update launch item: {}", e),
    })?;

    let is_missing = check_item_missing(&item_type, &config);

    Ok(LaunchItemDTO {
        id: id.to_string(),
        workspace_id,
        item_type,
        name,
        config,
        enabled,
        sort_order,
        created_at,
        updated_at: now,
        is_missing: Some(is_missing),
    })
}

pub fn delete_item(conn: &mut Connection, id: &str) -> Result<(), CommandError> {
    conn.execute("DELETE FROM launch_items WHERE id = ?1", params![id]).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to delete launch item: {}", e),
    })?;
    Ok(())
}

pub fn reorder_items(conn: &mut Connection, workspace_id: &str, item_ids: &[String]) -> Result<(), CommandError> {
    let tx = conn.transaction().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to begin transaction: {}", e),
    })?;

    for (index, item_id) in item_ids.iter().enumerate() {
        tx.execute(
            "UPDATE launch_items SET sort_order = ?1 WHERE id = ?2 AND workspace_id = ?3",
            params![index as i64, item_id, workspace_id],
        ).map_err(|e| CommandError {
            code: "DATABASE_ERROR".into(),
            message: format!("Failed to update item order: {}", e),
        })?;
    }

    tx.commit().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to commit item reorder: {}", e),
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
            name: "Test WS".into(),
            description: None,
            icon: None,
            color: None,
            is_favorite: None,
        }).unwrap();

        (conn, ws.id)
    }

    #[test]
    fn test_create_and_update_items() {
        let (mut conn, ws_id) = setup_test_db();

        // 1. Application Item
        let app_item = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "application".into(),
            name: "VS Code".into(),
            config: serde_json::json!({
                "executablePath": "C:\\Tools\\Code.exe",
                "args": ["--new-window"]
            }),
            enabled: Some(true),
        }).unwrap();

        assert_eq!(app_item.name, "VS Code");
        assert_eq!(app_item.item_type, "application");

        // 2. Folder Item
        let folder_item = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "folder".into(),
            name: "Projects".into(),
            config: serde_json::json!({
                "path": "C:\\Users\\User\\Projects"
            }),
            enabled: Some(true),
        }).unwrap();

        assert_eq!(folder_item.name, "Projects");

        // 3. URL Item
        let url_item = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "url".into(),
            name: "Docs".into(),
            config: serde_json::json!({
                "url": "https://doc.rust-lang.org"
            }),
            enabled: Some(true),
        }).unwrap();

        assert_eq!(url_item.name, "Docs");

        // 4. Terminal Item
        let term_item = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "terminal".into(),
            name: "Terminal".into(),
            config: serde_json::json!({
                "workingDirectory": "C:\\Users\\User\\Projects",
                "terminal": "windowsTerminal",
                "allowFallback": true
            }),
            enabled: Some(true),
        }).unwrap();

        assert_eq!(term_item.name, "Terminal");

        // Test Update
        let updated = update_item(&mut conn, &app_item.id, UpdateLaunchItemInput {
            name: Some("VS Code Insiders".into()),
            config: None,
            enabled: Some(false),
            sort_order: None,
        }).unwrap();

        assert_eq!(updated.name, "VS Code Insiders");
        assert_eq!(updated.enabled, false);

        // Test Delete
        delete_item(&mut conn, &folder_item.id).unwrap();
    }

    #[test]
    fn test_url_validation() {
        let (mut conn, ws_id) = setup_test_db();

        // Invalid scheme (ftp)
        let res = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "url".into(),
            name: "FTP Link".into(),
            config: serde_json::json!({
                "url": "ftp://example.com"
            }),
            enabled: Some(true),
        });
        assert!(res.is_err());
        assert_eq!(res.unwrap_err().code, "URL_INVALID");

        // Embedded credentials
        let res2 = create_item(&mut conn, &ws_id, CreateLaunchItemInput {
            item_type: "url".into(),
            name: "Auth Link".into(),
            config: serde_json::json!({
                "url": "https://admin:pass@example.com"
            }),
            enabled: Some(true),
        });
        assert!(res2.is_err());
        assert_eq!(res2.unwrap_err().code, "URL_INVALID");
    }
}
