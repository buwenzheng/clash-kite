use serde::{Deserialize, Serialize};

/// 代理模式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProxyMode {
    /// 直连模式
    Direct,
    /// 全局代理模式
    Global,
    /// 规则模式
    Rule,
}

impl std::fmt::Display for ProxyMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProxyMode::Direct => write!(f, "Direct"),
            ProxyMode::Global => write!(f, "Global"),
            ProxyMode::Rule => write!(f, "Rule"),
        }
    }
}

/// 代理状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProxyStatus {
    /// 未启动
    Stopped,
    /// 运行中
    Running,
    /// 错误状态
    Error(String),
}

/// 代理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    /// 是否启用代理
    pub enabled: bool,
    /// 代理模式
    pub mode: ProxyMode,
    /// 当前选中的节点
    pub selected_node: Option<String>,
    /// SOCKS5端口
    pub socks_port: u16,
    /// HTTP端口
    pub http_port: u16,
    /// 混合端口
    pub mixed_port: u16,
    /// 是否允许局域网连接
    pub allow_lan: bool,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            mode: ProxyMode::Rule,
            selected_node: None,
            socks_port: 7891,
            http_port: 7890,
            mixed_port: 7892,
            allow_lan: false,
        }
    }
}

/// 代理信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyInfo {
    /// 代理状态
    pub status: ProxyStatus,
    /// 代理配置
    pub config: ProxyConfig,
    /// 启动时间
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    /// 上传流量（字节）
    pub upload: u64,
    /// 下载流量（字节）
    pub download: u64,
}

impl Default for ProxyInfo {
    fn default() -> Self {
        Self {
            status: ProxyStatus::Stopped,
            config: ProxyConfig::default(),
            started_at: None,
            upload: 0,
            download: 0,
        }
    }
}
