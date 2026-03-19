use serde::{Deserialize, Serialize};

/// 节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeType {
    /// Shadowsocks
    SS,
    /// ShadowsocksR
    SSR,
    /// VMess
    VMess,
    /// Trojan
    Trojan,
    /// Hysteria
    Hysteria,
    /// Hysteria2
    Hysteria2,
    /// WireGuard
    WireGuard,
    /// VLESS
    VLESS,
    /// Tuic
    Tuic,
    /// 未知类型
    Unknown,
}

impl std::fmt::Display for NodeType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NodeType::SS => write!(f, "Shadowsocks"),
            NodeType::SSR => write!(f, "ShadowsocksR"),
            NodeType::VMess => write!(f, "VMess"),
            NodeType::Trojan => write!(f, "Trojan"),
            NodeType::Hysteria => write!(f, "Hysteria"),
            NodeType::Hysteria2 => write!(f, "Hysteria2"),
            NodeType::WireGuard => write!(f, "WireGuard"),
            NodeType::VLESS => write!(f, "VLESS"),
            NodeType::Tuic => write!(f, "Tuic"),
            NodeType::Unknown => write!(f, "Unknown"),
        }
    }
}

/// 节点信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    /// 节点ID
    pub id: String,
    /// 节点名称
    pub name: String,
    /// 节点类型
    pub node_type: NodeType,
    /// 服务器地址
    pub server: String,
    /// 端口
    pub port: u16,
    /// 延迟（毫秒），None表示未测试
    pub latency: Option<u64>,
    /// 是否可用
    pub available: bool,
    /// 所属分组
    pub group: Option<String>,
    /// 国家/地区代码
    pub country_code: Option<String>,
    /// 额外信息
    pub extra: serde_json::Value,
}

/// 节点分组
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeGroup {
    /// 分组名称
    pub name: String,
    /// 节点类型
    pub node_type: Option<NodeType>,
    /// 节点列表
    pub nodes: Vec<NodeInfo>,
    /// 当前选中的节点
    pub selected_node: Option<String>,
}

/// 测速结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyTestResult {
    /// 节点ID
    pub node_id: String,
    /// 延迟（毫秒）
    pub latency: Option<u64>,
    /// 测试时间
    pub tested_at: chrono::DateTime<chrono::Utc>,
    /// 是否成功
    pub success: bool,
    /// 错误信息
    pub error: Option<String>,
}
