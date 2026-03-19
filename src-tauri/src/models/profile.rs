use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProfileSource {
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "subscription")]
    Subscription,
}

impl std::fmt::Display for ProfileSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProfileSource::Local => write!(f, "local"),
            ProfileSource::Subscription => write!(f, "subscription"),
        }
    }
}

impl ProfileSource {
    pub fn from_str(s: &str) -> Self {
        match s {
            "subscription" => ProfileSource::Subscription,
            _ => ProfileSource::Local,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInfo {
    pub id: String,
    pub name: String,
    pub source: ProfileSource,
    pub file_path: String,
    pub subscription_url: Option<String>,
    pub updated_at: String,
    pub is_active: bool,
}

/// Minimal clash config for YAML validation.
/// Uses serde aliases to handle both snake_case and kebab-case keys
/// that appear in real mihomo configs.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct ClashConfig {
    pub port: Option<u16>,
    #[serde(alias = "socks_port")]
    pub socks_port: Option<u16>,
    #[serde(alias = "mixed_port")]
    pub mixed_port: Option<u16>,
    #[serde(alias = "allow_lan")]
    pub allow_lan: Option<bool>,
    pub mode: Option<String>,
    pub proxies: Option<Vec<serde_json::Value>>,
    #[serde(alias = "proxy_groups")]
    pub proxy_groups: Option<Vec<serde_json::Value>>,
    pub rules: Option<Vec<String>>,
    pub dns: Option<serde_json::Value>,
}
