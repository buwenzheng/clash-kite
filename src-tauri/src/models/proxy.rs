use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyMode {
    Direct,
    Global,
    Rule,
}

impl std::fmt::Display for ProxyMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProxyMode::Direct => write!(f, "direct"),
            ProxyMode::Global => write!(f, "global"),
            ProxyMode::Rule => write!(f, "rule"),
        }
    }
}

impl ProxyMode {
    pub fn from_str(s: &str) -> Self {
        match s {
            "global" => ProxyMode::Global,
            "direct" => ProxyMode::Direct,
            _ => ProxyMode::Rule,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelayHistory {
    pub time: String,
    pub delay: u32,
}

/// A single proxy node with its protocol type and delay history
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyNode {
    pub name: String,
    pub node_type: String,
    pub udp: Option<bool>,
    pub history: Vec<DelayHistory>,
}

/// A proxy group as returned by mihomo GET /proxies
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyGroup {
    pub name: String,
    #[serde(rename = "type")]
    pub group_type: String,
    pub all: Vec<String>,
    pub nodes: Vec<ProxyNode>,
    pub now: Option<String>,
    pub udp: Option<bool>,
    pub history: Vec<DelayHistory>,
}

/// High-level proxy status shown on the dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyStatus {
    pub running: bool,
    pub mode: ProxyMode,
    pub http_port: u16,
    pub socks_port: u16,
    pub mixed_port: u16,
    pub active_profile: Option<String>,
    pub system_proxy: bool,
}

impl Default for ProxyStatus {
    fn default() -> Self {
        Self {
            running: false,
            mode: ProxyMode::Rule,
            http_port: 7892,
            socks_port: 7891,
            mixed_port: 7890,
            active_profile: None,
            system_proxy: false,
        }
    }
}

/// Traffic data snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficData {
    pub up: u64,
    pub down: u64,
}

/// Delay test result for a single proxy
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelayResult {
    pub name: String,
    pub delay: Option<u32>,
    pub error: Option<String>,
}
