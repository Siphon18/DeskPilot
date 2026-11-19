use url::Url;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
use crate::adapters::windows_paths::{to_wide_null, as_pcwstr};
use crate::models::CommandError;

pub fn open_url(url_str: &str) -> Result<(), CommandError> {
    let trimmed = url_str.trim();
    if trimmed.len() > 2000 {
        return Err(CommandError {
            code: "URL_INVALID".into(),
            message: "URL exceeds maximum length of 2000 characters".into(),
        });
    }

    let parsed = Url::parse(trimmed).map_err(|_| CommandError {
        code: "URL_INVALID".into(),
        message: "Invalid URL format".into(),
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
            message: "URLs with credentials are not allowed".into(),
        });
    }

    let op_wide = to_wide_null("open");
    let url_wide = to_wide_null(trimmed);

    let h_inst = unsafe {
        ShellExecuteW(
            None,
            as_pcwstr(&op_wide),
            as_pcwstr(&url_wide),
            windows::core::PCWSTR::null(),
            windows::core::PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    let code = h_inst.0 as usize;
    if code <= 32 {
        return Err(CommandError {
            code: "URL_OPEN_FAILED".into(),
            message: format!("Default browser failed to open link (code: {})", code),
        });
    }

    Ok(())
}
