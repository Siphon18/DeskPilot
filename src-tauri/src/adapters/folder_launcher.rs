use std::path::Path;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
use crate::adapters::windows_paths::{to_wide_null, as_pcwstr};
use crate::models::CommandError;

pub fn open_folder(folder_path: &str) -> Result<(), CommandError> {
    let path = Path::new(folder_path);
    if !path.exists() {
        return Err(CommandError {
            code: "PATH_NOT_FOUND".into(),
            message: format!("Folder does not exist: {}", folder_path),
        });
    }
    if !path.is_dir() {
        return Err(CommandError {
            code: "PATH_NOT_DIRECTORY".into(),
            message: format!("Path is not a directory: {}", folder_path),
        });
    }

    let op_wide = to_wide_null("open");
    let file_wide = to_wide_null(folder_path);

    let h_inst = unsafe {
        ShellExecuteW(
            None,
            as_pcwstr(&op_wide),
            as_pcwstr(&file_wide),
            windows::core::PCWSTR::null(),
            windows::core::PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    let code = h_inst.0 as usize;
    if code <= 32 {
        return Err(CommandError {
            code: "FOLDER_OPEN_FAILED".into(),
            message: format!("Windows could not open folder (code: {})", code),
        });
    }

    Ok(())
}
