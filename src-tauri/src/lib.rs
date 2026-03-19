mod models;
mod services;
mod commands;

use std::path::Path;
use services::proxy::ProxyService;
use services::config::ConfigService;
use services::node::NodeService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    env_logger::init();

    // 获取配置目录
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| Path::new(".").to_path_buf())
        .join("clash-kite");

    // 创建服务实例
    let proxy_service = ProxyService::new();
    let config_service = ConfigService::new(&config_dir);
    let node_service = NodeService::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(proxy_service)
        .manage(config_service)
        .manage(node_service)
        .invoke_handler(tauri::generate_handler![
            // 代理相关命令
            commands::proxy::get_proxy_info,
            commands::proxy::get_proxy_config,
            commands::proxy::update_proxy_config,
            commands::proxy::start_proxy,
            commands::proxy::stop_proxy,
            commands::proxy::restart_proxy,
            commands::proxy::toggle_proxy,
            commands::proxy::set_proxy_mode,
            commands::proxy::select_proxy_node,
            commands::proxy::get_proxy_traffic,
            commands::proxy::check_proxy_status,
            
            // 配置相关命令
            commands::config::get_current_config,
            commands::config::get_all_configs,
            commands::config::import_config_from_file,
            commands::config::import_config_from_subscription,
            commands::config::update_subscription,
            commands::config::delete_config,
            commands::config::export_config,
            commands::config::read_config_content,
            commands::config::save_config_content,
            commands::config::load_all_configs,
            commands::config::set_current_config,
            
            // 节点相关命令
            commands::node::get_node_groups,
            commands::node::get_node_group,
            commands::node::get_all_nodes,
            commands::node::get_node,
            commands::node::search_nodes,
            commands::node::sort_nodes_by_latency,
            commands::node::test_node_latency,
            commands::node::test_all_nodes_latency,
            commands::node::add_node_group,
            commands::node::update_node_group,
            commands::node::delete_node_group,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
