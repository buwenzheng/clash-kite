use tauri::State;
use crate::services::profile::ProfileService;
use crate::services::proxy::ProxyService;
use crate::models::profile::ProfileInfo;

#[tauri::command]
pub async fn get_profiles(
    svc: State<'_, ProfileService>,
) -> Result<Vec<ProfileInfo>, String> {
    svc.get_all().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_active_profile(
    svc: State<'_, ProfileService>,
) -> Result<Option<ProfileInfo>, String> {
    svc.get_active().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_profile_file(
    svc: State<'_, ProfileService>,
    file_path: String,
    name: String,
) -> Result<ProfileInfo, String> {
    svc.import_file(&file_path, &name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_profile_subscription(
    svc: State<'_, ProfileService>,
    url: String,
    name: String,
) -> Result<ProfileInfo, String> {
    svc.import_subscription(&url, &name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_profile_subscription(
    svc: State<'_, ProfileService>,
    id: String,
) -> Result<ProfileInfo, String> {
    svc.update_subscription(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_profile(
    svc: State<'_, ProfileService>,
    id: String,
) -> Result<(), String> {
    svc.delete(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn activate_profile(
    svc: State<'_, ProfileService>,
    proxy: State<'_, ProxyService>,
    id: String,
) -> Result<ProfileInfo, String> {
    let profile = svc.activate(&id).await.map_err(|e| e.to_string())?;

    // If proxy is running, restart with the new config
    if proxy.is_running().await {
        proxy
            .restart(&profile.file_path, &profile.name)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(profile)
}

#[tauri::command]
pub async fn read_profile_content(
    svc: State<'_, ProfileService>,
    id: String,
) -> Result<String, String> {
    svc.read_content(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_profile_content(
    svc: State<'_, ProfileService>,
    id: String,
    content: String,
) -> Result<(), String> {
    svc.save_content(&id, &content).await.map_err(|e| e.to_string())
}
