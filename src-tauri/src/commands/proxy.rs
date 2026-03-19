use tauri::State;
use crate::services::proxy::ProxyService;
use crate::models::proxy::{ProxyConfig, ProxyInfo, ProxyMode};

/// 获取代理信息
#[tauri::command]
pub async fn get_proxy_info(
    proxy_service: State<'_, ProxyService>,
) -> Result<ProxyInfo, String> {
    Ok(proxy_service.get_info().await)
}

/// 获取代理配置
#[tauri::command]
pub async fn get_proxy_config(
    proxy_service: State<'_, ProxyService>,
) -> Result<ProxyConfig, String> {
    Ok(proxy_service.get_config().await)
}

/// 更新代理配置
#[tauri::command]
pub async fn update_proxy_config(
    proxy_service: State<'_, ProxyService>,
    config: ProxyConfig,
) -> Result<(), String> {
    proxy_service.update_config(config).await.map_err(|e| e.to_string())
}

/// 启动代理
#[tauri::command]
pub async fn start_proxy(
    proxy_service: State<'_, ProxyService>,
) -> Result<(), String> {
    proxy_service.start().await.map_err(|e| e.to_string())
}

/// 停止代理
#[tauri::command]
pub async fn stop_proxy(
    proxy_service: State<'_, ProxyService>,
) -> Result<(), String> {
    proxy_service.stop().await.map_err(|e| e.to_string())
}

/// 重启代理
#[tauri::command]
pub async fn restart_proxy(
    proxy_service: State<'_, ProxyService>,
) -> Result<(), String> {
    proxy_service.restart().await.map_err(|e| e.to_string())
}

/// 切换代理开关
#[tauri::command]
pub async fn toggle_proxy(
    proxy_service: State<'_, ProxyService>,
) -> Result<(), String> {
    proxy_service.toggle().await.map_err(|e| e.to_string())
}

/// 设置代理模式
#[tauri::command]
pub async fn set_proxy_mode(
    proxy_service: State<'_, ProxyService>,
    mode: String,
) -> Result<(), String> {
    let proxy_mode = match mode.as_str() {
        "direct" => ProxyMode::Direct,
        "global" => ProxyMode::Global,
        "rule" => ProxyMode::Rule,
        _ => return Err(format!("Invalid proxy mode: {}", mode)),
    };
    proxy_service.set_mode(proxy_mode).await.map_err(|e| e.to_string())
}

/// 选择节点
#[tauri::command]
pub async fn select_proxy_node(
    proxy_service: State<'_, ProxyService>,
    node_id: String,
) -> Result<(), String> {
    proxy_service.select_node(&node_id).await.map_err(|e| e.to_string())
}

/// 获取流量统计
#[tauri::command]
pub async fn get_proxy_traffic(
    proxy_service: State<'_, ProxyService>,
) -> Result<(u64, u64), String> {
    proxy_service.get_traffic().await.map_err(|e| e.to_string())
}

/// 检查代理状态
#[tauri::command]
pub async fn check_proxy_status(
    proxy_service: State<'_, ProxyService>,
) -> Result<String, String> {
    let status = proxy_service.check_status().await.map_err(|e| e.to_string())?;
    Ok(match status {
        crate::models::proxy::ProxyStatus::Stopped => "stopped".to_string(),
        crate::models::proxy::ProxyStatus::Running => "running".to_string(),
        crate::models::proxy::ProxyStatus::Error(msg) => format!("error: {}", msg),
    })
}
