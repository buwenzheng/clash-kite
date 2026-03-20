use std::time::Duration;
use anyhow::Result;

use crate::models::profile::AutoUpdateResult;
use crate::services::profile::ProfileService;
use crate::services::proxy::ProxyService;

pub struct AutoUpdateScheduler;

impl AutoUpdateScheduler {
    pub fn start(
        profile_svc: ProfileService,
        proxy_svc: ProxyService,
        app_handle: tauri::AppHandle,
    ) {
        tauri::async_runtime::spawn(async move {
            log::info!("AutoUpdateScheduler started");
            loop {
                if let Err(e) = Self::check_and_update(&profile_svc, &proxy_svc, &app_handle).await {
                    log::error!("AutoUpdateScheduler error: {}", e);
                }
                tokio::time::sleep(Duration::from_secs(60)).await;
            }
        });
    }

    async fn check_and_update(
        profile_svc: &ProfileService,
        proxy_svc: &ProxyService,
        app_handle: &tauri::AppHandle,
    ) -> Result<()> {
        let candidates = profile_svc.get_auto_update_candidates().await?;
        if candidates.is_empty() {
            return Ok(());
        }

        log::info!("AutoUpdate: {} candidates to update", candidates.len());

        for profile in candidates {
            let result = Self::update_single(profile_svc, proxy_svc, &profile.id).await;
            Self::send_notification(app_handle, &profile.name, &result);
        }

        Ok(())
    }

    async fn update_single(
        profile_svc: &ProfileService,
        proxy_svc: &ProxyService,
        id: &str,
    ) -> AutoUpdateResult {
        let now = chrono::Utc::now().to_rfc3339();

        match profile_svc.update_subscription(id).await {
            Ok(updated) => {
                let mut hot_reloaded = false;

                if updated.is_active && proxy_svc.is_running().await {
                    match proxy_svc.restart(&updated.file_path, &updated.name).await {
                        Ok(_) => {
                            hot_reloaded = true;
                            log::info!("AutoUpdate: hot-reloaded active profile {}", updated.name);
                        }
                        Err(e) => {
                            log::error!("AutoUpdate: hot-reload failed for {}: {}", updated.name, e);
                        }
                    }
                }

                AutoUpdateResult {
                    profile_id: updated.id,
                    profile_name: updated.name,
                    success: true,
                    error: None,
                    hot_reloaded,
                    updated_at: now,
                }
            }
            Err(e) => {
                log::error!("AutoUpdate: failed to update {}: {}", id, e);
                AutoUpdateResult {
                    profile_id: id.to_string(),
                    profile_name: String::new(),
                    success: false,
                    error: Some(e.to_string()),
                    hot_reloaded: false,
                    updated_at: now,
                }
            }
        }
    }

    pub async fn update_all(
        profile_svc: &ProfileService,
        proxy_svc: &ProxyService,
        app_handle: &tauri::AppHandle,
    ) -> Vec<AutoUpdateResult> {
        let profiles = match profile_svc.get_all().await {
            Ok(p) => p,
            Err(e) => {
                log::error!("AutoUpdate update_all: failed to get profiles: {}", e);
                return vec![];
            }
        };

        let auto_profiles: Vec<_> = profiles.into_iter()
            .filter(|p| p.auto_update && p.source == crate::models::profile::ProfileSource::Subscription)
            .collect();

        let mut results = Vec::new();
        for profile in auto_profiles {
            let result = Self::update_single(profile_svc, proxy_svc, &profile.id).await;
            Self::send_notification(app_handle, &profile.name, &result);
            results.push(result);
        }
        results
    }

    fn send_notification(app_handle: &tauri::AppHandle, profile_name: &str, result: &AutoUpdateResult) {
        use tauri_plugin_notification::NotificationExt;

        let (title, body) = if result.success {
            let mut msg = format!("Subscription \"{}\" updated", profile_name);
            if result.hot_reloaded {
                msg.push_str(" (proxy reloaded)");
            }
            ("Clash Kite".to_string(), msg)
        } else {
            let err = result.error.as_deref().unwrap_or("Unknown error");
            (
                "Clash Kite".to_string(),
                format!("Failed to update \"{}\": {}", profile_name, err),
            )
        };

        if let Err(e) = app_handle.notification().builder().title(&title).body(&body).show() {
            log::warn!("Failed to send notification: {}", e);
        }
    }
}
