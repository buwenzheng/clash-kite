use tauri::State;
use crate::services::node::NodeService;
use crate::models::node::{NodeInfo, NodeGroup, LatencyTestResult};

/// 获取所有节点分组
#[tauri::command]
pub async fn get_node_groups(
    node_service: State<'_, NodeService>,
) -> Result<Vec<NodeGroup>, String> {
    Ok(node_service.get_groups().await)
}

/// 获取指定分组
#[tauri::command]
pub async fn get_node_group(
    node_service: State<'_, NodeService>,
    group_name: String,
) -> Result<Option<NodeGroup>, String> {
    Ok(node_service.get_group(&group_name).await)
}

/// 获取所有节点
#[tauri::command]
pub async fn get_all_nodes(
    node_service: State<'_, NodeService>,
) -> Result<Vec<NodeInfo>, String> {
    Ok(node_service.get_all_nodes().await)
}

/// 获取指定节点
#[tauri::command]
pub async fn get_node(
    node_service: State<'_, NodeService>,
    node_id: String,
) -> Result<Option<NodeInfo>, String> {
    Ok(node_service.get_node(&node_id).await)
}

/// 搜索节点
#[tauri::command]
pub async fn search_nodes(
    node_service: State<'_, NodeService>,
    query: String,
) -> Result<Vec<NodeInfo>, String> {
    Ok(node_service.search_nodes(&query).await)
}

/// 按延迟排序节点
#[tauri::command]
pub async fn sort_nodes_by_latency(
    node_service: State<'_, NodeService>,
    group_name: Option<String>,
) -> Result<Vec<NodeInfo>, String> {
    Ok(node_service.sort_nodes_by_latency(group_name.as_deref()).await)
}

/// 测试单个节点延迟
#[tauri::command]
pub async fn test_node_latency(
    node_service: State<'_, NodeService>,
    node_id: String,
) -> Result<LatencyTestResult, String> {
    node_service.test_node_latency(&node_id).await.map_err(|e| e.to_string())
}

/// 批量测试所有节点延迟
#[tauri::command]
pub async fn test_all_nodes_latency(
    node_service: State<'_, NodeService>,
) -> Result<Vec<LatencyTestResult>, String> {
    node_service.test_all_nodes_latency().await.map_err(|e| e.to_string())
}

/// 添加节点分组
#[tauri::command]
pub async fn add_node_group(
    node_service: State<'_, NodeService>,
    group: NodeGroup,
) -> Result<(), String> {
    node_service.add_group(group).await.map_err(|e| e.to_string())
}

/// 更新节点分组
#[tauri::command]
pub async fn update_node_group(
    node_service: State<'_, NodeService>,
    group_name: String,
    group: NodeGroup,
) -> Result<(), String> {
    node_service.update_group(&group_name, group).await.map_err(|e| e.to_string())
}

/// 删除节点分组
#[tauri::command]
pub async fn delete_node_group(
    node_service: State<'_, NodeService>,
    group_name: String,
) -> Result<(), String> {
    node_service.remove_group(&group_name).await.map_err(|e| e.to_string())
}
