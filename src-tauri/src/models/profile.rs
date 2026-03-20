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

