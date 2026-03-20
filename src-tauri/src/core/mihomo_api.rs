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
    #[serde(rename = "type")]
    proxy_type: String,
    #[serde(default)]
    all: Vec<String>,
    now: Option<String>,
    udp: Option<bool>,
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

pub struct ProxiesResult {
    pub groups: Vec<ProxyGroup>,
}

pub struct MihomoConfigs {
    pub mode: String,
    pub port: u16,
    pub socks_port: u16,
    pub mixed_port: u16,
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

        for (name, raw) in &resp.proxies {
            if group_types.contains(&raw.proxy_type.as_str()) {
                let history: Vec<DelayHistory> = raw
                    .history
                    .iter()
                    .map(|h| DelayHistory {
                        time: h.time.clone().unwrap_or_default(),
                        delay: h.delay.unwrap_or(0),
                    })
                    .collect();

                let nodes: Vec<ProxyNode> = raw
                    .all
                    .iter()
                    .map(|node_name| {
                        if let Some(node_raw) = resp.proxies.get(node_name) {
                            ProxyNode {
                                name: node_name.clone(),
                                node_type: node_raw.proxy_type.clone(),
                                udp: node_raw.udp,
                                history: node_raw
                                    .history
                                    .iter()
                                    .map(|h| DelayHistory {
                                        time: h.time.clone().unwrap_or_default(),
                                        delay: h.delay.unwrap_or(0),
                                    })
                                    .collect(),
                            }
                        } else {
                            ProxyNode {
                                name: node_name.clone(),
                                node_type: "Unknown".to_string(),
                                udp: None,
                                history: vec![],
                            }
                        }
                    })
                    .collect();

                groups.push(ProxyGroup {
                    name: name.clone(),
                    group_type: raw.proxy_type.clone(),
                    all: raw.all.clone(),
                    nodes,
                    now: raw.now.clone(),
                    udp: raw.udp,
                    history,
                });
            }
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

        Ok(ProxiesResult { groups })
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

    pub async fn get_configs(&self) -> Result<MihomoConfigs> {
        let resp: serde_json::Value = self
            .client
            .get(format!("{}/configs", self.base))
            .send()
            .await?
            .json()
            .await?;
        Ok(MihomoConfigs {
            mode: resp.get("mode").and_then(|v| v.as_str()).unwrap_or("rule").to_string(),
            port: resp.get("port").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
            socks_port: resp.get("socks-port").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
            mixed_port: resp.get("mixed-port").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
        })
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

}
