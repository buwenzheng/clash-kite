use tauri::State;
use crate::services::config::ConfigService;
use crate::models::config::ConfigInfo;

/// 获取当前配置
#[tauri::command]
pub async fn get_current_config(
    config_service: State<'_, ConfigService>,
) -> Result<Option<ConfigInfo>, String> {
    Ok(config_service.get_current_config().await)
}

/// 获取所有配置列表
#[tauri::command]
pub async fn get_all_configs(
    config_service: State<'_, ConfigService>,
) -> Result<Vec<ConfigInfo>, String> {
    Ok(config_service.get_configs().await)
}

/// 从本地文件导入配置
#[tauri::command]
pub async fn import_config_from_file(
    config_service: State<'_, ConfigService>,
    file_path: String,
    name: String,
) -> Result<ConfigInfo, String> {
    config_service.import_from_file(&file_path, &name).await.map_err(|e| e.to_string())
}

/// 从订阅链接导入配置
#[tauri::command]
pub async fn import_config_from_subscription(
    config_service: State<'_, ConfigService>,
    url: String,
    name: String,
) -> Result<ConfigInfo, String> {
    config_service.import_from_subscription(&url, &name).await.map_err(|e| e.to_string())
}

/// 更新订阅配置
#[tauri::command]
pub async fn update_subscription(
    config_service: State<'_, ConfigService>,
    config_id: String,
) -> Result<(), String> {
    config_service.update_subscription(&config_id).await.map_err(|e| e.to_string())
}

/// 删除配置
#[tauri::command]
pub async fn delete_config(
    config_service: State<'_, ConfigService>,
    config_id: String,
) -> Result<(), String> {
    config_service.remove_config(&config_id).await.map_err(|e| e.to_string())
}

/// 导出配置
#[tauri::command]
pub async fn export_config(
    config_service: State<'_, ConfigService>,
    config_id: String,
    dest_path: String,
) -> Result<(), String> {
    config_service.export_config(&config_id, &dest_path).await.map_err(|e| e.to_string())
}

/// 读取配置文件内容
#[tauri::command]
pub async fn read_config_content(
    config_service: State<'_, ConfigService>,
    config_id: String,
) -> Result<String, String> {
    config_service.read_config_content(&config_id).await.map_err(|e| e.to_string())
}

/// 保存配置内容
#[tauri::command]
pub async fn save_config_content(
    config_service: State<'_, ConfigService>,
    config_id: String,
    content: String,
) -> Result<(), String> {
    config_service.save_config_content(&config_id, &content).await.map_err(|e| e.to_string())
}

/// 加载所有配置
#[tauri::command]
pub async fn load_all_configs(
    config_service: State<'_, ConfigService>,
) -> Result<(), String> {
    config_service.load_all_configs().await.map_err(|e| e.to_string())
}

/// 设置当前配置
#[tauri::command]
pub async fn set_current_config(
    config_service: State<'_, ConfigService>,
    config: ConfigInfo,
) -> Result<(), String> {
    config_service.set_current_config(config).await.map_err(|e| e.to_string())
}
