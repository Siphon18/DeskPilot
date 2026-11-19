use tauri::State;
use crate::database::connection::DbState;
use crate::database::repositories::{workspace_repo, item_repo};
use crate::adapters::window_capture::{self, CapturedWindowApp};
use crate::models::{
    WorkspaceDTO, WorkspaceDetailDTO, CreateWorkspaceInput,
    UpdateWorkspaceInput, WorkspaceQuery, CommandError, CreateLaunchItemInput
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

#[tauri::command]
pub fn workspace_get_open_apps() -> Result<Vec<CapturedWindowApp>, CommandError> {
    Ok(window_capture::capture_open_application_windows())
}

static IS_CAPTURING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static LAST_CAPTURE_TIME: std::sync::atomic::AtomicI64 = std::sync::atomic::AtomicI64::new(0);

#[tauri::command]
pub fn workspace_capture_current(
    state: State<'_, DbState>,
    name: Option<String>,
) -> Result<WorkspaceDetailDTO, CommandError> {
    let now = chrono::Utc::now().timestamp_millis();
    let last = LAST_CAPTURE_TIME.load(std::sync::atomic::Ordering::SeqCst);
    if now - last < 2000 {
        // Return latest workspace if captured within last 2 seconds
        let conn = state.conn.lock().map_err(|_| CommandError {
            code: "DATABASE_LOCK_ERROR".into(),
            message: "Failed to acquire database lock".into(),
        })?;
        if let Ok(list) = workspace_repo::list_workspaces(&conn, None) {
            if let Some(first) = list.into_iter().next() {
                if let Ok(detail) = workspace_repo::get_workspace(&conn, &first.id) {
                    if let Some(ws) = detail {
                        return Ok(ws);
                    }
                }
            }
        }
    }

    if IS_CAPTURING
        .compare_exchange(
            false,
            true,
            std::sync::atomic::Ordering::SeqCst,
            std::sync::atomic::Ordering::SeqCst,
        )
        .is_err()
    {
        // Another capture is currently in-flight; wait up to 500ms and return the newly captured workspace
        std::thread::sleep(std::time::Duration::from_millis(500));
        let conn = state.conn.lock().map_err(|_| CommandError {
            code: "DATABASE_LOCK_ERROR".into(),
            message: "Failed to acquire database lock".into(),
        })?;
        if let Ok(list) = workspace_repo::list_workspaces(&conn, None) {
            if let Some(first) = list.into_iter().next() {
                if let Ok(detail) = workspace_repo::get_workspace(&conn, &first.id) {
                    if let Some(ws) = detail {
                        return Ok(ws);
                    }
                }
            }
        }
        return Err(CommandError {
            code: "CAPTURE_BUSY".into(),
            message: "Workspace capture is already in progress".into(),
        });
    }

    struct CaptureGuard;
    impl Drop for CaptureGuard {
        fn drop(&mut self) {
            IS_CAPTURING.store(false, std::sync::atomic::Ordering::SeqCst);
            LAST_CAPTURE_TIME.store(chrono::Utc::now().timestamp_millis(), std::sync::atomic::Ordering::SeqCst);
        }
    }
    let _guard = CaptureGuard;

    let apps = window_capture::capture_open_application_windows();

    let workspace_name = match name {
        Some(n) if !n.trim().is_empty() => n.trim().to_string(),
        _ => {
            let now = chrono::Local::now();
            format!("Workspace ({})", now.format("%b %d, %I:%M %p"))
        }
    };

    let app_count = apps.len();
    let desc = if app_count > 0 {
        let names: Vec<String> = apps.iter().take(3).map(|a| a.name.clone()).collect();
        names.join(" · ")
    } else {
        "Captured empty desktop".to_string()
    };

    let input = CreateWorkspaceInput {
        name: workspace_name,
        description: Some(desc),
        icon: Some("laptop".to_string()),
        color: Some("#3b82f6".to_string()),
        is_favorite: Some(false),
    };

    let mut conn = state.conn.lock().map_err(|_| CommandError {
        code: "DATABASE_LOCK_ERROR".into(),
        message: "Failed to acquire database lock".into(),
    })?;

    let created = workspace_repo::create_workspace(&mut conn, input)?;

    for app in apps {
        let item_input = CreateLaunchItemInput {
            item_type: "application".to_string(),
            name: app.name,
            config: serde_json::json!({
                "executablePath": app.executable_path,
                "args": []
            }),
            enabled: Some(true),
        };
        let _ = item_repo::create_item(&mut conn, &created.id, item_input);
    }

    workspace_repo::get_workspace(&conn, &created.id)?
        .ok_or_else(|| CommandError {
            code: "WORKSPACE_NOT_FOUND".into(),
            message: "Failed to retrieve newly captured workspace".into(),
        })
}
