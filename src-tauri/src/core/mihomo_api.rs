use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::proxy::{DelayHistory, ProxyGroup, ProxyNode, TrafficData};

pub struct MihomoApi {
    client: Client,
    base: String,
}

/// Raw proxy entry returned by mihomo GET /proxies
#[derive(Debug, Deserialize)]
struct RawProxy {
    name: String,
    #[serde(rename = "type")]
    proxy_type: String,
    #[serde(default)]
    all: Vec<String>,
    now: Option<String>,
    udp: Option<bool>,
    alive: Option<bool>,
    #[serde(default)]
    history: Vec<RawHistory>,
}

#[derive(Debug, Deserialize)]
struct RawHistory {
    time: Option<String>,
    delay: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct ProxiesResponse {
    proxies: HashMap<String, RawProxy>,
}

/// Groups vs individual nodes result
pub struct ProxiesResult {
    pub groups: Vec<ProxyGroup>,
    pub nodes: HashMap<String, ProxyNode>,
}

#[derive(Debug, Serialize)]
struct ModePayload {
    mode: String,
}

#[derive(Debug, Serialize)]
struct SelectPayload {
    name: String,
}

impl MihomoApi {
    pub fn new(base: &str) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(5))
                .build()
                .unwrap_or_default(),
            base: base.to_string(),
        }
    }

    pub async fn check_health(&self) -> bool {
        self.client
            .get(format!("{}/version", self.base))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    pub async fn get_proxies(&self) -> Result<ProxiesResult> {
        let resp: ProxiesResponse = self
            .client
            .get(format!("{}/proxies", self.base))
            .send()
            .await?
            .json()
            .await?;

        let group_types = [
            "Selector", "URLTest", "Fallback", "LoadBalance", "Relay",
        ];

        let mut groups = Vec::new();
        let mut nodes = HashMap::new();

        for (name, raw) in &resp.proxies {
            let history: Vec<DelayHistory> = raw
                .history
                .iter()
                .map(|h| DelayHistory {
                    time: h.time.clone().unwrap_or_default(),
                    delay: h.delay.unwrap_or(0),
                })
                .collect();

            if group_types.contains(&raw.proxy_type.as_str()) {
                groups.push(ProxyGroup {
                    name: name.clone(),
                    group_type: raw.proxy_type.clone(),
                    all: raw.all.clone(),
                    now: raw.now.clone(),
                    udp: raw.udp,
                    history: history.clone(),
                });
            }

            nodes.insert(
                name.clone(),
                ProxyNode {
                    name: name.clone(),
                    node_type: raw.proxy_type.clone(),
                    udp: raw.udp,
                    alive: raw.alive,
                    history,
                },
            );
        }

        // Sort groups alphabetically but put GLOBAL first
        groups.sort_by(|a, b| {
            if a.name == "GLOBAL" {
                std::cmp::Ordering::Less
            } else if b.name == "GLOBAL" {
                std::cmp::Ordering::Greater
            } else {
                a.name.cmp(&b.name)
            }
        });

        Ok(ProxiesResult { groups, nodes })
    }

    pub async fn select_proxy(&self, group: &str, name: &str) -> Result<()> {
        let url = format!("{}/proxies/{}", self.base, urlencoding::encode(group));
        self.client
            .put(&url)
            .json(&SelectPayload {
                name: name.to_string(),
            })
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    pub async fn test_delay(&self, name: &str, timeout: u32, url: &str) -> Result<u32> {
        let api_url = format!(
            "{}/proxies/{}/delay?timeout={}&url={}",
            self.base,
            urlencoding::encode(name),
            timeout,
            urlencoding::encode(url)
        );
        let resp: serde_json::Value = self.client.get(&api_url).send().await?.json().await?;
        resp.get("delay")
            .and_then(|v| v.as_u64())
            .map(|d| d as u32)
            .ok_or_else(|| {
                let msg = resp
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown error");
                anyhow::anyhow!("{}", msg)
            })
    }

    pub async fn get_mode(&self) -> Result<String> {
        let resp: serde_json::Value = self
            .client
            .get(format!("{}/configs", self.base))
            .send()
            .await?
            .json()
            .await?;
        Ok(resp
            .get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("rule")
            .to_string())
    }

    pub async fn set_mode(&self, mode: &str) -> Result<()> {
        self.client
            .patch(format!("{}/configs", self.base))
            .json(&ModePayload {
                mode: mode.to_string(),
            })
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    pub async fn get_traffic(&self) -> Result<TrafficData> {
        let resp: serde_json::Value = self
            .client
            .get(format!("{}/traffic", self.base))
            .send()
            .await?
            .json()
            .await?;
        Ok(TrafficData {
            up: resp.get("up").and_then(|v| v.as_u64()).unwrap_or(0),
            down: resp.get("down").and_then(|v| v.as_u64()).unwrap_or(0),
        })
    }

    pub async fn reload_config(&self, path: &str) -> Result<()> {
        let body = serde_json::json!({ "path": path });
        self.client
            .put(format!("{}/configs", self.base))
            .json(&body)
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }
}
