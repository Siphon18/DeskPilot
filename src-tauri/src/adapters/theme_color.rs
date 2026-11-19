use windows::core::w;
use windows::Win32::System::Registry::{
    RegOpenKeyExW, RegQueryValueExW, RegCloseKey, HKEY_CURRENT_USER, KEY_READ, HKEY, REG_VALUE_TYPE
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsThemeColorDTO {
    pub hex: String,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub accent_glow: String,
    pub accent_subtle: String,
    pub liquid_highlight: String,
}

pub fn get_windows_active_theme_color() -> WindowsThemeColorDTO {
    let mut hkey = HKEY::default();
    let subkey = w!("Software\\Microsoft\\Windows\\DWM");

    let status = unsafe {
        RegOpenKeyExW(
            HKEY_CURRENT_USER,
            subkey,
            Some(0),
            KEY_READ,
            &mut hkey,
        )
    };

    let mut color = (37u8, 99u8, 235u8); // Default to Windows Fluent Blue #2563eb

    if status.is_ok() && !hkey.is_invalid() {
        // Try AccentColor first (0xAABBGGRR)
        let mut dword_val: u32 = 0;
        let mut data_len = std::mem::size_of::<u32>() as u32;
        let mut val_type = REG_VALUE_TYPE::default();

        let query_accent = unsafe {
            RegQueryValueExW(
                hkey,
                w!("AccentColor"),
                None,
                Some(&mut val_type),
                Some(&mut dword_val as *mut _ as *mut u8),
                Some(&mut data_len),
            )
        };

        if query_accent.is_ok() && dword_val != 0 {
            let r = (dword_val & 0xFF) as u8;
            let g = ((dword_val >> 8) & 0xFF) as u8;
            let b = ((dword_val >> 16) & 0xFF) as u8;
            color = (r, g, b);
        } else {
            // Fallback to ColorizationColor (0xAARRGGBB)
            let mut col_val: u32 = 0;
            let mut col_len = std::mem::size_of::<u32>() as u32;
            let query_col = unsafe {
                RegQueryValueExW(
                    hkey,
                    w!("ColorizationColor"),
                    None,
                    Some(&mut val_type),
                    Some(&mut col_val as *mut _ as *mut u8),
                    Some(&mut col_len),
                )
            };

            if query_col.is_ok() && col_val != 0 {
                let r = ((col_val >> 16) & 0xFF) as u8;
                let g = ((col_val >> 8) & 0xFF) as u8;
                let b = (col_val & 0xFF) as u8;
                color = (r, g, b);
            }
        }

        unsafe {
            let _ = RegCloseKey(hkey);
        }
    }

    let (r, g, b) = color;
    let hex = format!("#{:02x}{:02x}{:02x}", r, g, b);
    let accent_glow = format!("rgba({}, {}, {}, 0.45)", r, g, b);
    let accent_subtle = format!("rgba({}, {}, {}, 0.15)", r, g, b);
    let liquid_highlight = format!("rgba({}, {}, {}, 0.28)", r, g, b);

    WindowsThemeColorDTO {
        hex,
        r,
        g,
        b,
        accent_glow,
        accent_subtle,
        liquid_highlight,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_windows_active_theme_color() {
        let theme_color = get_windows_active_theme_color();
        println!("Detected Windows active theme color: {:?}", theme_color);
        assert!(!theme_color.hex.is_empty());
        assert!(theme_color.hex.starts_with('#'));
    }
}
