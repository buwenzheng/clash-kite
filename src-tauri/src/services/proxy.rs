use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;
use crate::models::proxy::{ProxyConfig, ProxyInfo, ProxyMode, ProxyStatus};

/// 代理服务
pub struct ProxyService {
    /// 代理信息
    info: Arc<RwLock<ProxyInfo>>,
    /// Clash Meta API地址
    api_base: String,
    /// 配置文件路径
    config_path: Option<String>,
}

impl ProxyService {
    /// 创建新的代理服务实例
    pub fn new() -> Self {
        Self {
            info: Arc::new(RwLock::new(ProxyInfo::default())),
            api_base: "http://127.0.0.1:9090".to_string(),
            config_path: None,
        }
    }

    /// 获取代理信息
    pub async fn get_info(&self) -> ProxyInfo {
        self.info.read().await.clone()
    }

    /// 获取代理配置
    pub async fn get_config(&self) -> ProxyConfig {
        self.info.read().await.config.clone()
    }

    /// 更新代理配置
    pub async fn update_config(&self, config: ProxyConfig) -> Result<()> {
        let mut info = self.info.write().await;
        info.config = config;
        Ok(())
    }

    /// 启动代理
    pub async fn start(&self) -> Result<()> {
        let mut info = self.info.write().await;
        
        // 检查是否已经运行
        if info.status == ProxyStatus::Running {
            return Ok(());
        }

        // 这里应该启动Clash Meta核心
        // 暂时模拟启动成功
        info.status = ProxyStatus::Running;
        info.started_at = Some(chrono::Utc::now());
        
        log::info!("Proxy started");
        Ok(())
    }

    /// 停止代理
    pub async fn stop(&self) -> Result<()> {
        let mut info = self.info.write().await;
        
        // 检查是否已经停止
        if info.status == ProxyStatus::Stopped {
            return Ok(());
        }

        // 这里应该停止Clash Meta核心
        // 暂时模拟停止成功
        info.status = ProxyStatus::Stopped;
        info.started_at = None;
        
        log::info!("Proxy stopped");
        Ok(())
    }

    /// 重启代理
    pub async fn restart(&self) -> Result<()> {
        self.stop().await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        self.start().await?;
        Ok(())
    }

    /// 切换代理开关
    pub async fn toggle(&self) -> Result<()> {
        let info = self.info.read().await;
        if info.status == ProxyStatus::Running {
            drop(info);
            self.stop().await
        } else {
            drop(info);
            self.start().await
        }
    }

    /// 设置代理模式
    pub async fn set_mode(&self, mode: ProxyMode) -> Result<()> {
        let mut info = self.info.write().await;
        info.config.mode = mode.clone();
        
        // 这里应该调用Clash Meta API设置模式
        log::info!("Proxy mode set to: {}", mode);
        Ok(())
    }

    /// 选择节点
    pub async fn select_node(&self, node_id: &str) -> Result<()> {
        let mut info = self.info.write().await;
        info.config.selected_node = Some(node_id.to_string());
        
        // 这里应该调用Clash Meta API选择节点
        log::info!("Selected node: {}", node_id);
        Ok(())
    }

    /// 获取流量统计
    pub async fn get_traffic(&self) -> Result<(u64, u64)> {
        let info = self.info.read().await;
        Ok((info.upload, info.download))
    }

    /// 更新流量统计
    pub async fn update_traffic(&self, upload: u64, download: u64) -> Result<()> {
        let mut info = self.info.write().await;
        info.upload = upload;
        info.download = download;
        Ok(())
    }

    /// 检查代理状态
    pub async fn check_status(&self) -> Result<ProxyStatus> {
        // 这里应该检查Clash Meta核心的运行状态
        let info = self.info.read().await;
        Ok(info.status.clone())
    }

    /// 设置配置文件路径
    pub fn set_config_path(&mut self, path: &str) {
        self.config_path = Some(path.to_string());
    }

    /// 加载配置文件
    pub async fn load_config(&self, path: &str) -> Result<()> {
        // 这里应该加载并解析配置文件
        log::info!("Loading config from: {}", path);
        Ok(())
    }

    /// 获取Clash Meta API地址
    pub fn get_api_base(&self) -> &str {
        &self.api_base
    }

    /// 设置Clash Meta API地址
    pub fn set_api_base(&mut self, url: &str) {
        self.api_base = url.to_string();
    }
}

impl Default for ProxyService {
    fn default() -> Self {
        Self::new()
    }
}
