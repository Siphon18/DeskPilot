use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDTO {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub color: String,
    pub is_favorite: bool,
    pub sort_order: i64,
    pub item_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub last_launched_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDetailDTO {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub color: String,
    pub is_favorite: bool,
    pub sort_order: i64,
    pub item_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub last_launched_at: Option<String>,
    pub items: Vec<LaunchItemDTO>,
    pub note: String,
    pub tasks: Vec<WorkspaceTaskDTO>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchItemDTO {
    pub id: String,
    pub workspace_id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub name: String,
    pub config: serde_json::Value,
    pub enabled: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    pub is_missing: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceTaskDTO {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub is_completed: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub is_favorite: Option<bool>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceQuery {
    pub search: Option<String>,
    pub favorites_only: Option<bool>,
    pub sort_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLaunchItemInput {
    #[serde(rename = "type")]
    pub item_type: String,
    pub name: String,
    pub config: serde_json::Value,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLaunchItemInput {
    pub name: Option<String>,
    pub config: Option<serde_json::Value>,
    pub enabled: Option<bool>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub global_shortcut: String,
    pub keep_running_in_tray: bool,
    pub url_delay_ms: u64,
    pub show_launch_toast: bool,
    pub data_directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for CommandError {}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchRunDTO {
    pub id: String,
    pub workspace_id: Option<String>,
    pub workspace_name_snapshot: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub total_count: i64,
    pub success_count: i64,
    pub warning_count: i64,
    pub failed_count: i64,
    pub skipped_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchItemResult {
    pub item_id: String,
    pub item_name: String,
    pub item_type: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub message: String,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchRunDetailDTO {
    pub id: String,
    pub workspace_id: Option<String>,
    pub workspace_name_snapshot: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub total_count: i64,
    pub success_count: i64,
    pub warning_count: i64,
    pub failed_count: i64,
    pub skipped_count: i64,
    pub items: Vec<LaunchItemResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchProgressEvent {
    pub run_id: String,
    pub workspace_id: String,
    pub total_count: usize,
    pub completed_count: usize,
    pub current_item: Option<CurrentItemProgress>,
    pub overall_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentItemProgress {
    pub item_id: String,
    pub name: String,
    pub item_type: String,
    pub status: String,
}
