use std::path::PathBuf;
use std::process::Child;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, Context};

use super::mihomo_api::MihomoApi;

pub struct MihomoManager {
    binary_path: PathBuf,
    child: Arc<Mutex<Option<Child>>>,
    api: MihomoApi,
}

impl MihomoManager {
    pub fn new(binary_path: PathBuf) -> Self {
        Self {
            binary_path,
            child: Arc::new(Mutex::new(None)),
            api: MihomoApi::new("http://127.0.0.1:9090"),
        }
    }

    pub fn api(&self) -> &MihomoApi {
        &self.api
    }

    pub async fn start(&self, config_path: &str) -> Result<()> {
        let mut guard = self.child.lock().await;

        // Kill existing process if any
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }

        let child = std::process::Command::new(&self.binary_path)
            .arg("-f")
            .arg(config_path)
            .arg("-ext-ctl")
            .arg("127.0.0.1:9090")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .with_context(|| {
                format!("Failed to start mihomo at {:?}", self.binary_path)
            })?;

        *guard = Some(child);
        drop(guard);

        self.wait_ready(10).await?;

        log::info!("mihomo started with config: {}", config_path);
        Ok(())
    }

    pub async fn stop(&self) -> Result<()> {
        let mut guard = self.child.lock().await;
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
            log::info!("mihomo stopped");
        }
        Ok(())
    }

    pub async fn restart(&self, config_path: &str) -> Result<()> {
        self.stop().await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
        self.start(config_path).await
    }

    pub async fn is_running(&self) -> bool {
        let mut guard = self.child.lock().await;
        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(Some(_)) => {
                    *guard = None;
                    false
                }
                Ok(None) => true,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    async fn wait_ready(&self, max_seconds: u32) -> Result<()> {
        for i in 0..max_seconds * 4 {
            tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
            if self.api.check_health().await {
                log::info!("mihomo API ready after {}ms", (i + 1) * 250);
                return Ok(());
            }
        }
        anyhow::bail!("mihomo API did not become ready within {}s", max_seconds)
    }
}

impl Drop for MihomoManager {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.child.try_lock() {
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}
