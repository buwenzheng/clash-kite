use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

use crate::core::mihomo::MihomoManager;
use crate::core::sysproxy;
use crate::models::proxy::*;

#[derive(Clone)]
pub struct ProxyService {
    mihomo: Arc<MihomoManager>,
    status: Arc<RwLock<ProxyStatus>>,
}

impl ProxyService {
    pub fn new(mihomo: Arc<MihomoManager>) -> Self {
        Self {
            mihomo,
            status: Arc::new(RwLock::new(ProxyStatus::default())),
        }
    }

    pub async fn get_status(&self) -> ProxyStatus {
        self.status.read().await.clone()
    }

    pub async fn start(&self, config_path: &str, profile_name: &str) -> Result<()> {
        self.mihomo.start(config_path).await?;

        // Read actual config from mihomo API to get real ports and mode
        let configs = self.mihomo.api().get_configs().await?;

        let mut status = self.status.write().await;
        status.running = true;
        status.mode = ProxyMode::from_str(&configs.mode);
        status.active_profile = Some(profile_name.to_string());
        status.http_port = configs.port;
        status.socks_port = configs.socks_port;
        status.mixed_port = configs.mixed_port;

        log::info!(
            "Proxy started: mode={}, http={}, socks={}, mixed={}",
            configs.mode, configs.port, configs.socks_port, configs.mixed_port
        );

        Ok(())
    }

    pub async fn stop(&self) -> Result<()> {
        let status = self.status.read().await;
        if status.system_proxy {
            let port = self.resolve_proxy_port(&status);
            let _ = sysproxy::set_system_proxy(false, "127.0.0.1", port);
        }
        drop(status);

        self.mihomo.stop().await?;

        let mut status = self.status.write().await;
        status.running = false;
        status.active_profile = None;
        status.system_proxy = false;
        Ok(())
    }

    pub async fn restart(&self, config_path: &str, profile_name: &str) -> Result<()> {
        self.stop().await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        self.start(config_path, profile_name).await
    }

    pub async fn get_groups(&self) -> Result<Vec<ProxyGroup>> {
        let result = self.mihomo.api().get_proxies().await?;
        Ok(result.groups)
    }

    pub async fn select_proxy(&self, group: &str, name: &str) -> Result<()> {
        self.mihomo.api().select_proxy(group, name).await
    }

    pub async fn test_delay(&self, name: &str) -> Result<DelayResult> {
        let test_url = "http://www.gstatic.com/generate_204";
        match self.mihomo.api().test_delay(name, 5000, test_url).await {
            Ok(delay) => Ok(DelayResult {
                name: name.to_string(),
                delay: Some(delay),
                error: None,
            }),
            Err(e) => Ok(DelayResult {
                name: name.to_string(),
                delay: None,
                error: Some(e.to_string()),
            }),
        }
    }

    pub async fn set_mode(&self, mode: ProxyMode) -> Result<()> {
        self.mihomo.api().set_mode(&mode.to_string()).await?;
        let mut status = self.status.write().await;
        status.mode = mode;
        Ok(())
    }

    pub async fn set_system_proxy(&self, enable: bool) -> Result<()> {
        let status = self.status.read().await;
        let port = self.resolve_proxy_port(&status);
        drop(status);

        sysproxy::set_system_proxy(enable, "127.0.0.1", port)?;

        let mut status = self.status.write().await;
        status.system_proxy = enable;
        Ok(())
    }

    pub async fn get_traffic(&self) -> Result<TrafficData> {
        self.mihomo.api().get_traffic().await
    }

    pub async fn is_running(&self) -> bool {
        self.mihomo.is_running().await
    }

    fn resolve_proxy_port(&self, status: &ProxyStatus) -> u16 {
        if status.mixed_port > 0 {
            status.mixed_port
        } else if status.http_port > 0 {
            status.http_port
        } else {
            7890
        }
    }
}
