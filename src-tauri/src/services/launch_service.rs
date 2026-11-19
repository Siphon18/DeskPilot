use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use chrono::Utc;

use crate::database::connection::DbState;
use crate::database::repositories::{workspace_repo, launch_repo};
use crate::adapters::{
    application_launcher::launch_application,
    folder_launcher::open_folder,
    url_launcher::open_url,
    terminal_launcher::launch_terminal,
};
use crate::models::{
    LaunchItemDTO, LaunchProgressEvent, CurrentItemProgress, CommandError
};

pub fn start_workspace_launch(
    app: AppHandle,
    state: &DbState,
    workspace_id: &str,
) -> Result<String, CommandError> {
    let ws = {
        let conn = state.conn.lock().map_err(|_| CommandError {
            code: "DATABASE_LOCK_ERROR".into(),
            message: "Failed to lock database".into(),
        })?;
        workspace_repo::get_workspace(&conn, workspace_id)?
            .ok_or_else(|| CommandError {
                code: "WORKSPACE_NOT_FOUND".into(),
                message: "Workspace no longer exists".into(),
            })?
    };

    let enabled_items: Vec<LaunchItemDTO> = ws.items.into_iter().filter(|i| i.enabled).collect();
    if enabled_items.is_empty() {
        return Err(CommandError {
            code: "WORKSPACE_EMPTY".into(),
            message: "This workspace has no enabled items to launch".into(),
        });
    }

    let run_id = {
        let conn = state.conn.lock().map_err(|_| CommandError {
            code: "DATABASE_LOCK_ERROR".into(),
            message: "Failed to lock database".into(),
        })?;
        launch_repo::create_launch_run(&conn, &ws.id, &ws.name, enabled_items.len())?
    };

    // Sort items by phase: phase 1 = local (app, folder, terminal), phase 2 = url
    let mut ordered_items = enabled_items;
    ordered_items.sort_by(|a, b| {
        let phase_a = if a.item_type == "url" { 2 } else { 1 };
        let phase_b = if b.item_type == "url" { 2 } else { 1 };
        phase_a.cmp(&phase_b).then_with(|| a.sort_order.cmp(&b.sort_order))
    });

    let ws_id = ws.id.clone();
    let r_id = run_id.clone();

    // Spawn a temporary launch task (no permanent worker)
    let app_handle = app.clone();
    thread::spawn(move || {
        let mut completed_count = 0;
        let mut success_count = 0;
        let mut warning_count = 0;
        let mut failed_count = 0;
        let total = ordered_items.len();

        let mut url_index = 0;

        for item in ordered_items {
            let start = Instant::now();
            let mut status = "success";
            let mut message = "Launched successfully".to_string();
            let mut error_code: Option<String> = None;

            // If URL, wait 250ms delay between URLs after the first
            if item.item_type == "url" {
                if url_index > 0 {
                    thread::sleep(Duration::from_millis(250));
                }
                url_index += 1;
            }

            match item.item_type.as_str() {
                "application" => {
                    let exe_path = item.config.get("executablePath").and_then(|v| v.as_str()).unwrap_or("");
                    let args: Vec<String> = item.config.get("args")
                        .and_then(|v| v.as_array())
                        .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                        .unwrap_or_default();
                    let work_dir = item.config.get("workingDirectory").and_then(|v| v.as_str());

                    if let Err(e) = launch_application(exe_path, &args, work_dir) {
                        status = "failed";
                        message = e.message;
                        error_code = Some(e.code);
                    }
                }
                "folder" => {
                    let path = item.config.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    if let Err(e) = open_folder(path) {
                        status = "failed";
                        message = e.message;
                        error_code = Some(e.code);
                    }
                }
                "url" => {
                    let url_str = item.config.get("url").and_then(|v| v.as_str()).unwrap_or("");
                    if let Err(e) = open_url(url_str) {
                        status = "failed";
                        message = e.message;
                        error_code = Some(e.code);
                    }
                }
                "terminal" => {
                    let work_dir = item.config.get("workingDirectory").and_then(|v| v.as_str()).unwrap_or("");
                    let pref = item.config.get("terminal").and_then(|v| v.as_str()).unwrap_or("windowsTerminal");
                    let fallback = item.config.get("allowFallback").and_then(|v| v.as_bool()).unwrap_or(true);

                    match launch_terminal(work_dir, pref, fallback) {
                        Ok(used_fallback) => {
                            if used_fallback {
                                status = "warning";
                                message = "Windows Terminal unavailable; opened in PowerShell".to_string();
                            }
                        }
                        Err(e) => {
                            status = "failed";
                            message = e.message;
                            error_code = Some(e.code);
                        }
                    }
                }
                _ => {
                    status = "failed";
                    message = format!("Unknown launch item type: {}", item.item_type);
                    error_code = Some("COMMAND_VALIDATION_FAILED".into());
                }
            }

            let duration_ms = start.elapsed().as_millis() as i64;

            match status {
                "success" => success_count += 1,
                "warning" => warning_count += 1,
                _ => failed_count += 1,
            }

            completed_count += 1;

            // Persist item result immediately
            if let Some(db_state) = app_handle.try_state::<DbState>() {
                if let Ok(conn) = db_state.conn.lock() {
                    let _ = launch_repo::record_item_run(
                        &conn,
                        &r_id,
                        Some(&item.id),
                        &item.name,
                        &item.item_type,
                        status,
                        duration_ms,
                        &message,
                        error_code.as_deref(),
                    );
                }
            }

            // Emit progress event
            let progress = LaunchProgressEvent {
                run_id: r_id.clone(),
                workspace_id: ws_id.clone(),
                total_count: total,
                completed_count,
                current_item: Some(CurrentItemProgress {
                    item_id: item.id.clone(),
                    name: item.name.clone(),
                    item_type: item.item_type.clone(),
                    status: status.to_string(),
                }),
                overall_status: "running".to_string(),
            };
            let _ = app_handle.emit("launch-progress", &progress);
        }

        // Finalize run
        let final_status = if failed_count == 0 && warning_count == 0 {
            "completed"
        } else if success_count > 0 || warning_count > 0 {
            "completed_with_errors"
        } else {
            "failed"
        };

        if let Some(db_state) = app_handle.try_state::<DbState>() {
            if let Ok(conn) = db_state.conn.lock() {
                let _ = launch_repo::finalize_launch_run(
                    &conn,
                    &r_id,
                    final_status,
                    success_count,
                    warning_count,
                    failed_count,
                    0,
                );

                // Update workspace last_launched_at
                let now = Utc::now().to_rfc3339();
                let _ = conn.execute(
                    "UPDATE workspaces SET last_launched_at = ?1 WHERE id = ?2",
                    rusqlite::params![now, ws_id],
                );
            }
        }

        let final_event = LaunchProgressEvent {
            run_id: r_id,
            workspace_id: ws_id,
            total_count: total,
            completed_count,
            current_item: None,
            overall_status: final_status.to_string(),
        };
        let _ = app_handle.emit("launch-progress", &final_event);
    });

    Ok(run_id)
}
