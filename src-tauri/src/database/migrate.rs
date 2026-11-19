use rusqlite::{params, Connection, Result};
use chrono::Utc;
use uuid::Uuid;

const SCHEMA_SQL: &str = include_str!("schema.sql");

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );"
    )?;

    let current_version: Option<i64> = conn
        .query_row(
            "SELECT MAX(version) FROM _migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let current = current_version.unwrap_or(0);

    if current < 1 {
        let tx = conn.transaction()?;

        tx.execute_batch(SCHEMA_SQL)?;

        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO _migrations (version, applied_at) VALUES (?1, ?2)",
            params![1, now],
        )?;

        // Check if there are any workspaces; if 0, insert a sample workspace
        let workspace_count: i64 = tx.query_row(
            "SELECT COUNT(*) FROM workspaces",
            [],
            |row| row.get(0),
        )?;

        if workspace_count == 0 {
            let ws_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO workspaces (id, name, description, icon, color, is_favorite, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    ws_id,
                    "Development",
                    "Core developer workspace for code, docs, and terminal",
                    "code",
                    "blue",
                    1,
                    0,
                    now,
                    now
                ],
            )?;

            // Insert initial note
            tx.execute(
                "INSERT INTO workspace_notes (workspace_id, content, updated_at) VALUES (?1, ?2, ?3)",
                params![ws_id, "# Development Notes\n\n- Welcome to DeskPilot!\n- Add your apps, directories, and links here.", now],
            )?;

            // Insert initial checklist tasks
            let task1_id = Uuid::new_v4().to_string();
            let task2_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO workspace_tasks (id, workspace_id, title, is_completed, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 0, 0, ?4, ?5)",
                params![task1_id, ws_id, "Set up local development tools", now, now],
            )?;
            tx.execute(
                "INSERT INTO workspace_tasks (id, workspace_id, title, is_completed, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 0, 1, ?4, ?5)",
                params![task2_id, ws_id, "Configure workspace launch items", now, now],
            )?;

            // Insert sample URL launch item
            let item_url_id = Uuid::new_v4().to_string();
            let url_config = serde_json::json!({
                "type": "url",
                "url": "https://github.com"
            }).to_string();
            tx.execute(
                "INSERT INTO launch_items (id, workspace_id, type, name, config_json, enabled, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, 'url', ?3, ?4, 1, 0, ?5, ?6)",
                params![item_url_id, ws_id, "GitHub", url_config, now, now],
            )?;
        }

        // Initialize default settings if not exists
        let default_settings = serde_json::json!({
            "theme": "system",
            "globalShortcut": "Ctrl+Alt+Space",
            "keepRunningInTray": false,
            "urlDelayMs": 250,
            "showLaunchToast": true
        }).to_string();

        tx.execute(
            "INSERT OR IGNORE INTO settings (key, value_json, updated_at) VALUES ('general', ?1, ?2)",
            params![default_settings, now],
        )?;

        tx.commit()?;
    }

    Ok(())
}
