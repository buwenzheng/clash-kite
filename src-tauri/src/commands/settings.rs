use tauri::State;
use crate::services::settings::SettingsService;
use crate::models::settings::AppSettings;

#[tauri::command]
pub async fn get_settings(
    svc: State<'_, SettingsService>,
) -> Result<AppSettings, String> {
    svc.get().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(
    svc: State<'_, SettingsService>,
    settings: AppSettings,
) -> Result<(), String> {
    svc.save(&settings).await.map_err(|e| e.to_string())
}
