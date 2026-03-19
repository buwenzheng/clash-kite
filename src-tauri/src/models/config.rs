use serde::{Deserialize, Serialize};

/// 配置来源类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConfigSource {
    /// 本地文件
    LocalFile,
    /// 订阅链接
    Subscription,
}

/// 配置信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigInfo {
    /// 配置ID
    pub id: String,
    /// 配置名称
    pub name: String,
    /// 配置来源
    pub source: ConfigSource,
    /// 配置文件路径
    pub file_path: String,
    /// 订阅链接（如果是订阅类型）
    pub subscription_url: Option<String>,
    /// 最后更新时间
    pub updated_at: chrono::DateTime<chrono::Utc>,
    /// 是否启用
    pub enabled: bool,
}

/// 订阅信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionInfo {
    /// 订阅名称
    pub name: String,
    /// 订阅链接
    pub url: String,
    /// 用户代理
    pub user_agent: Option<String>,
    /// 最后更新时间
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    /// 过期时间
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    /// 总流量（字节）
    pub total_traffic: Option<u64>,
    /// 已用流量（字节）
    pub used_traffic: Option<u64>,
}

/// Clash配置文件结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClashConfig {
    /// 端口
    pub port: Option<u16>,
    /// SOCKS5端口
    pub socks_port: Option<u16>,
    /// 混合端口
    pub mixed_port: Option<u16>,
    /// 是否允许局域网
    pub allow_lan: Option<bool>,
    /// 绑定地址
    pub bind_address: Option<String>,
    /// 代理模式
    pub mode: Option<String>,
    /// 日志级别
    pub log_level: Option<String>,
    /// 代理配置
    pub proxies: Option<Vec<serde_json::Value>>,
    /// 代理组
    pub proxy_groups: Option<Vec<serde_json::Value>>,
    /// 规则
    pub rules: Option<Vec<String>>,
    /// DNS配置
    pub dns: Option<serde_json::Value>,
}

impl Default for ClashConfig {
    fn default() -> Self {
        Self {
            port: Some(7890),
            socks_port: Some(7891),
            mixed_port: Some(7892),
            allow_lan: Some(false),
            bind_address: Some("*".to_string()),
            mode: Some("rule".to_string()),
            log_level: Some("info".to_string()),
            proxies: None,
            proxy_groups: None,
            rules: None,
            dns: None,
        }
    }
}
