use rusqlite::{params, Connection, OptionalExtension};
use chrono::Utc;
use crate::models::{AppSettings, CommandError};

pub fn get_settings(conn: &Connection, data_dir: &str) -> Result<AppSettings, CommandError> {
    let val_opt: Option<String> = conn.query_row(
        "SELECT value_json FROM settings WHERE key = 'general'",
        [],
        |row| row.get(0),
    ).optional().map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to read settings: {}", e),
    })?;

    let mut settings = match val_opt {
        Some(s) => serde_json::from_str::<AppSettings>(&s).unwrap_or_else(|_| AppSettings {
            theme: "system".into(),
            global_shortcut: "Ctrl+Space".into(),
            keep_running_in_tray: false,
            url_delay_ms: 250,
            show_launch_toast: true,
            data_directory: data_dir.to_string(),
        }),
        None => AppSettings {
            theme: "system".into(),
            global_shortcut: "Ctrl+Space".into(),
            keep_running_in_tray: false,
            url_delay_ms: 250,
            show_launch_toast: true,
            data_directory: data_dir.to_string(),
        },
    };

    settings.data_directory = data_dir.to_string();
    Ok(settings)
}

pub fn update_settings(conn: &Connection, current: &AppSettings, data_dir: &str) -> Result<AppSettings, CommandError> {
    let now = Utc::now().to_rfc3339();
    let json = serde_json::to_string(current).map_err(|e| CommandError {
        code: "COMMAND_VALIDATION_FAILED".into(),
        message: format!("Failed to serialize settings: {}", e),
    })?;

    conn.execute(
        "INSERT INTO settings (key, value_json, updated_at)
         VALUES ('general', ?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
        params![json, now],
    ).map_err(|e| CommandError {
        code: "DATABASE_ERROR".into(),
        message: format!("Failed to update settings: {}", e),
    })?;

    get_settings(conn, data_dir)
}
