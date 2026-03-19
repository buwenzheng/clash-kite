mod models;
mod db;
mod core;
mod services;
mod commands;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Emitter,
};

fn resolve_mihomo_path(app: &tauri::App) -> PathBuf {
    let binary_name = if cfg!(target_os = "windows") {
        "mihomo.exe"
    } else {
        "mihomo"
    };

    // Dev mode: look in src-tauri/resources/sidecar/
    if cfg!(debug_assertions) {
        let dev_path = std::env::current_dir()
            .unwrap_or_default()
            .join("resources")
            .join("sidecar")
            .join(binary_name);
        if dev_path.exists() {
            return dev_path;
        }
    }

    // Production: look in the bundled resource dir
    app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("sidecar")
        .join(binary_name)
}

fn resolve_files_dir(app: &tauri::App) -> PathBuf {
    if cfg!(debug_assertions) {
        let dev_path = std::env::current_dir()
            .unwrap_or_default()
            .join("resources")
            .join("files");
        if dev_path.exists() {
            return dev_path;
        }
    }
    app.path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("files")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Paths
            let config_dir = dirs::config_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("clash-kite");
            std::fs::create_dir_all(&config_dir)?;

            let db_path = config_dir.join("data.db");
            let conn = db::init(&db_path)?;
            let db = Arc::new(Mutex::new(conn));

            // Services
            let mihomo_path = resolve_mihomo_path(app);
            let files_dir = resolve_files_dir(app);
            log::info!("mihomo binary: {:?}", mihomo_path);
            log::info!("data files dir: {:?}", files_dir);

            let mihomo = Arc::new(core::mihomo::MihomoManager::new(mihomo_path));
            let profile_svc = services::profile::ProfileService::new(config_dir.clone(), db.clone());
            let proxy_svc = services::proxy::ProxyService::new(mihomo.clone());
            let settings_svc = services::settings::SettingsService::new(db.clone());

            app.manage(profile_svc);
            app.manage(proxy_svc);
            app.manage(settings_svc);

            // System tray
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle_proxy", "Toggle Proxy", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Clash Kite")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                    "toggle_proxy" => {
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
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Proxy
            commands::proxy::get_proxy_status,
            commands::proxy::start_proxy,
            commands::proxy::stop_proxy,
            commands::proxy::toggle_proxy,
            commands::proxy::get_proxy_groups,
            commands::proxy::select_proxy,
            commands::proxy::test_proxy_delay,
            commands::proxy::set_proxy_mode,
            commands::proxy::set_system_proxy,
            commands::proxy::get_traffic,
            // Profile
            commands::profile::get_profiles,
            commands::profile::get_active_profile,
            commands::profile::import_profile_file,
            commands::profile::import_profile_subscription,
            commands::profile::update_profile_subscription,
            commands::profile::delete_profile,
            commands::profile::activate_profile,
            commands::profile::read_profile_content,
            commands::profile::save_profile_content,
            // Settings
            commands::settings::get_settings,
            commands::settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
