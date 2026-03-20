use std::sync::Arc;
use tauri::State;
use crate::core::mihomo::MihomoManager;
use crate::services::proxy::ProxyService;
use crate::services::profile::ProfileService;
use crate::models::proxy::*;

#[tauri::command]
pub async fn get_proxy_status(
    proxy: State<'_, ProxyService>,
) -> Result<ProxyStatus, String> {
    Ok(proxy.get_status().await)
}

#[tauri::command]
pub async fn start_proxy(
    proxy: State<'_, ProxyService>,
    profile_svc: State<'_, ProfileService>,
) -> Result<ProxyStatus, String> {
    let active = profile_svc
        .get_active()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No active profile. Please activate a profile first.".to_string())?;

    proxy
        .start(&active.file_path, &active.name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(proxy.get_status().await)
}

#[tauri::command]
pub async fn stop_proxy(
    proxy: State<'_, ProxyService>,
) -> Result<ProxyStatus, String> {
    proxy.stop().await.map_err(|e| e.to_string())?;
    Ok(proxy.get_status().await)
}

#[tauri::command]
pub async fn toggle_proxy(
    proxy: State<'_, ProxyService>,
    profile_svc: State<'_, ProfileService>,
) -> Result<ProxyStatus, String> {
    if proxy.is_running().await {
        proxy.stop().await.map_err(|e| e.to_string())?;
    } else {
        let active = profile_svc
            .get_active()
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No active profile".to_string())?;
        proxy
            .start(&active.file_path, &active.name)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(proxy.get_status().await)
}

#[tauri::command]
pub async fn get_proxy_groups(
    proxy: State<'_, ProxyService>,
) -> Result<Vec<ProxyGroup>, String> {
    proxy.get_groups().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn select_proxy(
    proxy: State<'_, ProxyService>,
    group: String,
    name: String,
) -> Result<(), String> {
    proxy.select_proxy(&group, &name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_proxy_delay(
    proxy: State<'_, ProxyService>,
    name: String,
) -> Result<DelayResult, String> {
    proxy.test_delay(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_proxy_mode(
    proxy: State<'_, ProxyService>,
    mode: String,
) -> Result<(), String> {
    let m = ProxyMode::from_str(&mode);
    proxy.set_mode(m).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_system_proxy(
    proxy: State<'_, ProxyService>,
    enable: bool,
) -> Result<(), String> {
    proxy.set_system_proxy(enable).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_traffic(
    proxy: State<'_, ProxyService>,
) -> Result<TrafficData, String> {
    proxy.get_traffic().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_mihomo_log(
    mihomo: State<'_, Arc<MihomoManager>>,
    lines: Option<usize>,
    level: Option<String>,
) -> Result<String, String> {
    let level = level.unwrap_or_else(|| "all".to_string());
    Ok(mihomo.read_log_tail_filtered(lines.unwrap_or(2000), &level))
}
