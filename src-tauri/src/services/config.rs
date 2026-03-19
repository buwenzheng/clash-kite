use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;
use crate::models::config::{ConfigInfo, ConfigSource, ClashConfig};

/// 配置服务
pub struct ConfigService {
    /// 配置目录
    config_dir: PathBuf,
    /// 当前配置信息
    current_config: Arc<RwLock<Option<ConfigInfo>>>,
    /// 所有配置列表
    configs: Arc<RwLock<Vec<ConfigInfo>>>,
}

impl ConfigService {
    /// 创建新的配置服务实例
    pub fn new(config_dir: &Path) -> Self {
        Self {
            config_dir: config_dir.to_path_buf(),
            current_config: Arc::new(RwLock::new(None)),
            configs: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// 获取配置目录
    pub fn get_config_dir(&self) -> &Path {
        &self.config_dir
    }

    /// 确保配置目录存在
    pub async fn ensure_config_dir(&self) -> Result<()> {
        if !self.config_dir.exists() {
            tokio::fs::create_dir_all(&self.config_dir).await?;
            log::info!("Created config directory: {:?}", self.config_dir);
        }
        Ok(())
    }

    /// 获取当前配置
    pub async fn get_current_config(&self) -> Option<ConfigInfo> {
        self.current_config.read().await.clone()
    }

    /// 设置当前配置
    pub async fn set_current_config(&self, config: ConfigInfo) -> Result<()> {
        let mut current = self.current_config.write().await;
        *current = Some(config);
        Ok(())
    }

    /// 获取所有配置列表
    pub async fn get_configs(&self) -> Vec<ConfigInfo> {
        self.configs.read().await.clone()
    }

    /// 添加配置
    pub async fn add_config(&self, config: ConfigInfo) -> Result<()> {
        let mut configs = self.configs.write().await;
        configs.push(config);
        Ok(())
    }

    /// 删除配置
    pub async fn remove_config(&self, config_id: &str) -> Result<()> {
        let mut configs = self.configs.write().await;
        configs.retain(|c| c.id != config_id);
        Ok(())
    }

    /// 从本地文件导入配置
    pub async fn import_from_file(&self, file_path: &str, name: &str) -> Result<ConfigInfo> {
        let path = Path::new(file_path);
        if !path.exists() {
            return Err(anyhow::anyhow!("File not found: {}", file_path));
        }

        // 确保配置目录存在
        self.ensure_config_dir().await?;

        // 读取文件内容
        let content = tokio::fs::read_to_string(path).await?;
        
        // 验证YAML格式
        let _: ClashConfig = serde_yaml::from_str(&content)
            .map_err(|e| anyhow::anyhow!("Invalid YAML format: {}", e))?;

        // 生成配置ID
        let id = uuid::Uuid::new_v4().to_string();
        
        // 复制文件到配置目录
        let dest_path = self.config_dir.join(format!("{}.yaml", id));
        tokio::fs::copy(path, &dest_path).await?;

        // 创建配置信息
        let config = ConfigInfo {
            id: id.clone(),
            name: name.to_string(),
            source: ConfigSource::LocalFile,
            file_path: dest_path.to_string_lossy().to_string(),
            subscription_url: None,
            updated_at: chrono::Utc::now(),
            enabled: true,
        };

        // 添加到配置列表
        self.add_config(config.clone()).await?;

        log::info!("Imported config from file: {}", file_path);
        Ok(config)
    }

    /// 从订阅链接导入配置
    pub async fn import_from_subscription(&self, url: &str, name: &str) -> Result<ConfigInfo> {
        // 确保配置目录存在
        self.ensure_config_dir().await?;

        // 下载订阅内容
        let client = reqwest::Client::new();
        let response = client.get(url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to download subscription: {}", response.status()));
        }

        let content = response.text().await?;
        
        // 尝试解析为YAML
        let _: ClashConfig = serde_yaml::from_str(&content)
            .map_err(|e| anyhow::anyhow!("Invalid subscription format: {}", e))?;

        // 生成配置ID
        let id = uuid::Uuid::new_v4().to_string();
        
        // 保存到配置目录
        let dest_path = self.config_dir.join(format!("{}.yaml", id));
        tokio::fs::write(&dest_path, &content).await?;

        // 创建配置信息
        let config = ConfigInfo {
            id: id.clone(),
            name: name.to_string(),
            source: ConfigSource::Subscription,
            file_path: dest_path.to_string_lossy().to_string(),
            subscription_url: Some(url.to_string()),
            updated_at: chrono::Utc::now(),
            enabled: true,
        };

        // 添加到配置列表
        self.add_config(config.clone()).await?;

        log::info!("Imported config from subscription: {}", url);
        Ok(config)
    }

    /// 更新订阅配置
    pub async fn update_subscription(&self, config_id: &str) -> Result<()> {
        let configs = self.configs.read().await;
        let config = configs.iter().find(|c| c.id == config_id)
            .ok_or_else(|| anyhow::anyhow!("Config not found: {}", config_id))?;

        if config.source != ConfigSource::Subscription {
            return Err(anyhow::anyhow!("Config is not a subscription"));
        }

        let url = config.subscription_url.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Subscription URL not found"))?;

        // 下载新内容
        let client = reqwest::Client::new();
        let response = client.get(url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to download subscription: {}", response.status()));
        }

        let content = response.text().await?;
        
        // 验证格式
        let _: ClashConfig = serde_yaml::from_str(&content)
            .map_err(|e| anyhow::anyhow!("Invalid subscription format: {}", e))?;

        // 更新文件
        let path = Path::new(&config.file_path);
        tokio::fs::write(path, &content).await?;

        drop(configs);

        // 更新配置信息
        let mut configs = self.configs.write().await;
        if let Some(config) = configs.iter_mut().find(|c| c.id == config_id) {
            config.updated_at = chrono::Utc::now();
        }

        log::info!("Updated subscription: {}", config_id);
        Ok(())
    }

    /// 导出配置
    pub async fn export_config(&self, config_id: &str, dest_path: &str) -> Result<()> {
        let configs = self.configs.read().await;
        let config = configs.iter().find(|c| c.id == config_id)
            .ok_or_else(|| anyhow::anyhow!("Config not found: {}", config_id))?;

        tokio::fs::copy(&config.file_path, dest_path).await?;

        log::info!("Exported config to: {}", dest_path);
        Ok(())
    }

    /// 读取配置文件内容
    pub async fn read_config_content(&self, config_id: &str) -> Result<String> {
        let configs = self.configs.read().await;
        let config = configs.iter().find(|c| c.id == config_id)
            .ok_or_else(|| anyhow::anyhow!("Config not found: {}", config_id))?;

        let content = tokio::fs::read_to_string(&config.file_path).await?;
        Ok(content)
    }

    /// 解析配置文件
    pub async fn parse_config(&self, config_id: &str) -> Result<ClashConfig> {
        let content = self.read_config_content(config_id).await?;
        let config: ClashConfig = serde_yaml::from_str(&content)?;
        Ok(config)
    }

    /// 保存配置到文件
    pub async fn save_config_content(&self, config_id: &str, content: &str) -> Result<()> {
        // 验证格式
        let _: ClashConfig = serde_yaml::from_str(content)
            .map_err(|e| anyhow::anyhow!("Invalid YAML format: {}", e))?;

        let configs = self.configs.read().await;
        let config = configs.iter().find(|c| c.id == config_id)
            .ok_or_else(|| anyhow::anyhow!("Config not found: {}", config_id))?;

        tokio::fs::write(&config.file_path, content).await?;

        drop(configs);

        // 更新配置信息
        let mut configs = self.configs.write().await;
        if let Some(config) = configs.iter_mut().find(|c| c.id == config_id) {
            config.updated_at = chrono::Utc::now();
        }

        log::info!("Saved config: {}", config_id);
        Ok(())
    }

    /// 从默认目录加载所有配置
    pub async fn load_all_configs(&self) -> Result<()> {
        self.ensure_config_dir().await?;

        let mut entries = tokio::fs::read_dir(&self.config_dir).await?;
        let mut configs = Vec::new();

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "yaml" || ext == "yml") {
                let file_name = path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("unknown")
                    .to_string();

                // 尝试读取并验证文件
                if let Ok(content) = tokio::fs::read_to_string(&path).await {
                    if serde_yaml::from_str::<ClashConfig>(&content).is_ok() {
                        let config = ConfigInfo {
                            id: file_name.clone(),
                            name: file_name,
                            source: ConfigSource::LocalFile,
                            file_path: path.to_string_lossy().to_string(),
                            subscription_url: None,
                            updated_at: chrono::Utc::now(),
                            enabled: true,
                        };
                        configs.push(config);
                    }
                }
            }
        }

        let mut stored_configs = self.configs.write().await;
        *stored_configs = configs;

        log::info!("Loaded {} configs", stored_configs.len());
        Ok(())
    }
}
