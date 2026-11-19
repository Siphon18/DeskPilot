use std::path::Path;
use std::process::Command;
use crate::adapters::windows_paths::escape_powershell_literal_path;
use crate::models::CommandError;

pub fn launch_terminal(
    working_directory: &str,
    preferred_terminal: &str,
    allow_fallback: bool,
) -> Result<bool, CommandError> {
    let path = Path::new(working_directory);
    if !path.exists() {
        return Err(CommandError {
            code: "PATH_NOT_FOUND".into(),
            message: format!("Terminal working directory does not exist: {}", working_directory),
        });
    }
    if !path.is_dir() {
        return Err(CommandError {
            code: "PATH_NOT_DIRECTORY".into(),
            message: format!("Terminal working directory is not a directory: {}", working_directory),
        });
    }

    let mut used_fallback = false;

    if preferred_terminal == "windowsTerminal" {
        // Attempt Windows Terminal (wt.exe)
        let res = Command::new("wt.exe")
            .arg("-w")
            .arg("new")
            .arg("-d")
            .arg(working_directory)
            .spawn();

        match res {
            Ok(_child) => {
                return Ok(false);
            }
            Err(e) => {
                if !allow_fallback {
                    return Err(CommandError {
                        code: "TERMINAL_NOT_FOUND".into(),
                        message: format!("Windows Terminal could not be started: {}", e),
                    });
                }
                used_fallback = true;
            }
        }
    }

    // Launch PowerShell with safe LiteralPath command
    let escaped = escape_powershell_literal_path(working_directory);
    let ps_command = format!("Set-Location -LiteralPath '{}'", escaped);

    let ps_res = Command::new("powershell.exe")
        .arg("-NoExit")
        .arg("-Command")
        .arg(&ps_command)
        .spawn();

    match ps_res {
        Ok(_child) => Ok(used_fallback),
        Err(e) => Err(CommandError {
            code: "TERMINAL_NOT_FOUND".into(),
            message: format!("PowerShell could not be started: {}", e),
        }),
    }
}
