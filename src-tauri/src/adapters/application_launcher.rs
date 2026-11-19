use std::path::Path;
use std::process::Command;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
use crate::adapters::windows_paths::{to_wide_null, as_pcwstr};
use crate::models::CommandError;

pub fn launch_application(
    executable_path: &str,
    args: &[String],
    working_directory: Option<&str>,
) -> Result<(), CommandError> {
    let path = Path::new(executable_path);
    if !path.exists() {
        return Err(CommandError {
            code: "PATH_NOT_FOUND".into(),
            message: format!("Application path does not exist: {}", executable_path),
        });
    }

    let is_lnk = executable_path.to_lowercase().ends_with(".lnk");

    if is_lnk {
        let op_wide = to_wide_null("open");
        let file_wide = to_wide_null(executable_path);
        let params_wide = if !args.is_empty() {
            Some(to_wide_null(&args.join(" ")))
        } else {
            None
        };
        let dir_wide = working_directory.map(to_wide_null);

        let h_inst = unsafe {
            ShellExecuteW(
                None,
                as_pcwstr(&op_wide),
                as_pcwstr(&file_wide),
                params_wide.as_ref().map(|p| as_pcwstr(p)).unwrap_or(windows::core::PCWSTR::null()),
                dir_wide.as_ref().map(|d| as_pcwstr(d)).unwrap_or(windows::core::PCWSTR::null()),
                SW_SHOWNORMAL,
            )
        };

        let code = h_inst.0 as usize;
        if code <= 32 {
            return Err(CommandError {
                code: "APP_LAUNCH_FAILED".into(),
                message: format!("Windows could not open shortcut (code: {})", code),
            });
        }
        Ok(())
    } else {
        let mut cmd = Command::new(executable_path);
        cmd.args(args);

        if let Some(dir) = working_directory {
            if !dir.trim().is_empty() {
                if !Path::new(dir).exists() {
                    return Err(CommandError {
                        code: "PATH_NOT_FOUND".into(),
                        message: format!("Working directory does not exist: {}", dir),
                    });
                }
                cmd.current_dir(dir);
            }
        }

        match cmd.spawn() {
            Ok(_child) => {
                // Drop child process handle without waiting for exit or terminating it
                Ok(())
            }
            Err(e) => Err(CommandError {
                code: "APP_LAUNCH_FAILED".into(),
                message: format!("Failed to start application: {}", e),
            }),
        }
    }
}
