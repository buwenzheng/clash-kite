mod models;
mod services;
mod commands;
mod utils;

use std::path::Path;
use services::proxy::ProxyService;
use services::config::ConfigService;
use services::node::NodeService;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Emitter,
};

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
        .setup(|app| {
            // 创建托盘菜单
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let toggle_proxy_i = MenuItem::with_id(app, "toggle_proxy", "Toggle Proxy", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_i, &hide_i, &toggle_proxy_i, &quit_i])?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Clash Kite")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "toggle_proxy" => {
                        // 触发代理切换
                        let _ = app.emit("toggle-proxy", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 隐藏窗口而不是关闭
                window.hide().unwrap();
                api.prevent_close();
            }
        })
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

            // 窗口相关命令
            commands::window::show_window,
            commands::window::hide_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
