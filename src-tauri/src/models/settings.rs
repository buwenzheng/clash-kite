use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub auto_start: bool,
    pub minimize_to_tray: bool,
    pub start_minimized: bool,
    pub system_proxy: bool,
    pub tun_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "zh".to_string(),
            auto_start: false,
            minimize_to_tray: true,
            start_minimized: false,
            system_proxy: false,
            tun_mode: false,
        }
    }
}
