use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub data_dir: PathBuf,
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<DbState, Box<dyn std::error::Error>> {
    use tauri::Manager;

    let data_dir = match app_handle.path().app_local_data_dir() {
        Ok(dir) => dir,
        Err(_) => {
            let local_app_data = std::env::var("LOCALAPPDATA")
                .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
            PathBuf::from(local_app_data).join("DeskPilot")
        }
    };

    let logs_dir = data_dir.join("logs");
    let backups_dir = data_dir.join("backups");

    fs::create_dir_all(&data_dir)?;
    fs::create_dir_all(&logs_dir)?;
    fs::create_dir_all(&backups_dir)?;

    let db_path = data_dir.join("deskpilot.sqlite");
    let conn = Connection::open(&db_path)?;

    // Configure SQLite pragmas for security and performance
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;"
    )?;

    Ok(DbState {
        conn: Mutex::new(conn),
        data_dir,
    })
}
