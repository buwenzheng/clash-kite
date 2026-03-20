use std::fs;
use std::path::PathBuf;
use std::process::Child;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, Context};

use super::mihomo_api::MihomoApi;

pub struct MihomoManager {
    binary_path: PathBuf,
    data_dir: Option<PathBuf>,
    log_path: PathBuf,
    child: Arc<Mutex<Option<Child>>>,
    api: MihomoApi,
}

impl MihomoManager {
    pub fn new(binary_path: PathBuf, data_dir: Option<PathBuf>, log_dir: PathBuf) -> Self {
        Self {
            binary_path,
            data_dir,
            log_path: log_dir.join("mihomo.log"),
            child: Arc::new(Mutex::new(None)),
            api: MihomoApi::new("http://127.0.0.1:9090"),
        }
    }

    pub fn api(&self) -> &MihomoApi {
        &self.api
    }

    pub async fn start(&self, config_path: &str) -> Result<()> {
        let mut guard = self.child.lock().await;

        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }

        let log_file = fs::File::create(&self.log_path)
            .with_context(|| format!("Failed to create mihomo log at {:?}", self.log_path))?;
        let log_stderr = log_file.try_clone()?;

        let mut cmd = std::process::Command::new(&self.binary_path);
        cmd.arg("-f").arg(config_path);
        cmd.arg("-ext-ctl").arg("127.0.0.1:9090");

        if let Some(ref dir) = self.data_dir {
            cmd.arg("-d").arg(dir);
        }

        cmd.stdout(log_file);
        cmd.stderr(log_stderr);

        let child = cmd
            .spawn()
            .with_context(|| {
                format!(
                    "Failed to start mihomo at {:?}. Does the binary exist?",
                    self.binary_path
                )
            })?;

        let pid = child.id();
        *guard = Some(child);
        drop(guard);

        log::info!("mihomo spawned (pid={}) config={}", pid, config_path);
        log::info!("mihomo log: {:?}", self.log_path);

        match self.wait_ready(10).await {
            Ok(()) => {
                log::info!("mihomo API ready");
                Ok(())
            }
            Err(_) => {
                let mut guard = self.child.lock().await;
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }

                let log_tail = self.read_log_tail(20);
                if !log_tail.is_empty() {
                    log::error!("mihomo log (last lines):\n{}", log_tail);
                    anyhow::bail!(
                        "mihomo failed to start.\nLog:\n{}",
                        log_tail
                    );
                }
                anyhow::bail!("mihomo failed to start: API did not become ready within 10s")
            }
        }
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

    pub fn read_log_tail(&self, lines: usize) -> String {
        match fs::read_to_string(&self.log_path) {
            Ok(content) => {
                let all_lines: Vec<&str> = content.lines().collect();
                let start = all_lines.len().saturating_sub(lines);
                all_lines[start..].join("\n")
            }
            Err(_) => String::new(),
        }
    }

    async fn wait_ready(&self, max_seconds: u32) -> Result<()> {
        for i in 0..max_seconds * 4 {
            tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;

            // Also check if the process has exited early
            {
                let mut guard = self.child.lock().await;
                if let Some(child) = guard.as_mut() {
                    if let Ok(Some(exit_status)) = child.try_wait() {
                        *guard = None;
                        let log_tail = self.read_log_tail(10);
                        anyhow::bail!(
                            "mihomo exited with {} during startup.\n{}",
                            exit_status,
                            log_tail
                        );
                    }
                } else {
                    anyhow::bail!("mihomo process disappeared during startup");
                }
            }

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
