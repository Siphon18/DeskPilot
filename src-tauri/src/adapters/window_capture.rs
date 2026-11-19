use std::collections::HashSet;
use std::path::Path;
use windows::core::BOOL;
use windows::Win32::Foundation::{HWND, LPARAM, CloseHandle};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, IsWindowVisible, GetWindowTextW, GetWindowTextLengthW,
    GetWindowThreadProcessId, GetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW
};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    PROCESS_NAME_WIN32
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapturedWindowApp {
    pub name: String,
    pub executable_path: String,
    pub window_title: String,
}

struct CaptureContext {
    seen_paths: HashSet<String>,
    apps: Vec<CapturedWindowApp>,
}

unsafe extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    unsafe {
        let ctx = &mut *(lparam.0 as *mut CaptureContext);

        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        // Skip toolwindows
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        if (ex_style as u32 & WS_EX_TOOLWINDOW.0) != 0 {
            return BOOL(1);
        }

        let length = GetWindowTextLengthW(hwnd);
        if length <= 0 {
            return BOOL(1);
        }

        let mut title_buf = vec![0u16; (length + 1) as usize];
        let read_len = GetWindowTextW(hwnd, &mut title_buf);
        if read_len <= 0 {
            return BOOL(1);
        }

        let title = String::from_utf16_lossy(&title_buf[..read_len as usize]).trim().to_string();
        if title.is_empty() || title == "Program Manager" || title == "Settings" || title == "DeskPilot" {
            return BOOL(1);
        }

        let mut process_id = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        if process_id == 0 {
            return BOOL(1);
        }

        let Ok(process_handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) else {
            return BOOL(1);
        };

        let mut path_buf = vec![0u16; 1024];
        let mut size = path_buf.len() as u32;

        let success = QueryFullProcessImageNameW(
            process_handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(path_buf.as_mut_ptr()),
            &mut size,
        );

        let _ = CloseHandle(process_handle);

        if success.is_err() || size == 0 {
            return BOOL(1);
        }

        let exe_path = String::from_utf16_lossy(&path_buf[..size as usize]).trim().to_string();
        let lower_path = exe_path.to_lowercase();

        // Ignore Windows internal background and system processes
        let ignored = [
            "explorer.exe",
            "dwm.exe",
            "searchhost.exe",
            "shellexperiencehost.exe",
            "startmenuexperiencehost.exe",
            "textinputhost.exe",
            "systemsettings.exe",
            "deskpilot.exe",
            "conhost.exe",
            "svchost.exe",
            "applicationframehost.exe",
            "taskmgr.exe",
        ];

        let filename = Path::new(&exe_path)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("")
            .to_lowercase();

        if ignored.iter().any(|&ig| filename == ig) {
            return BOOL(1);
        }

        if ctx.seen_paths.contains(&lower_path) {
            return BOOL(1);
        }

        ctx.seen_paths.insert(lower_path);

        // Derive a clean friendly app name (e.g., Code.exe -> Visual Studio Code or Code)
        let display_name = match filename.as_str() {
            "code.exe" => "Visual Studio Code".to_string(),
            "chrome.exe" => "Google Chrome".to_string(),
            "msedge.exe" => "Microsoft Edge".to_string(),
            "firefox.exe" => "Mozilla Firefox".to_string(),
            "wt.exe" => "Windows Terminal".to_string(),
            "powershell.exe" => "PowerShell".to_string(),
            "cmd.exe" => "Command Prompt".to_string(),
            "spotify.exe" => "Spotify".to_string(),
            "discord.exe" => "Discord".to_string(),
            "slack.exe" => "Slack".to_string(),
            "notion.exe" => "Notion".to_string(),
            "obsidian.exe" => "Obsidian".to_string(),
            "notepad.exe" => "Notepad".to_string(),
            _ => {
                let stem = Path::new(&exe_path)
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or(&title);
                stem.to_string()
            }
        };

        ctx.apps.push(CapturedWindowApp {
            name: display_name,
            executable_path: exe_path,
            window_title: title,
        });

        BOOL(1)
    }
}

pub fn capture_open_application_windows() -> Vec<CapturedWindowApp> {
    let mut ctx = CaptureContext {
        seen_paths: HashSet::new(),
        apps: Vec::new(),
    };

    unsafe {
        let _ = EnumWindows(Some(enum_window_callback), LPARAM(&mut ctx as *mut _ as isize));
    }

    ctx.apps
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capture_open_application_windows_executes_safely() {
        let apps = capture_open_application_windows();
        // The call should succeed and return a list without panicking
        println!("Captured {} apps", apps.len());
        for app in &apps {
            assert!(!app.name.is_empty());
            assert!(!app.executable_path.is_empty());
        }
    }
}
