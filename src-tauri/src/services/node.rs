use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;
use crate::models::node::{NodeInfo, NodeGroup, NodeType, LatencyTestResult};

/// 节点服务
pub struct NodeService {
    /// 节点分组列表
    groups: Arc<RwLock<Vec<NodeGroup>>>,
    /// Clash Meta API地址
    api_base: String,
}

impl NodeService {
    /// 创建新的节点服务实例
    pub fn new() -> Self {
        Self {
            groups: Arc::new(RwLock::new(Vec::new())),
            api_base: "http://127.0.0.1:9090".to_string(),
        }
    }

    /// 获取所有节点分组
    pub async fn get_groups(&self) -> Vec<NodeGroup> {
        self.groups.read().await.clone()
    }

    /// 获取指定分组
    pub async fn get_group(&self, group_name: &str) -> Option<NodeGroup> {
        let groups = self.groups.read().await;
        groups.iter().find(|g| g.name == group_name).cloned()
    }

    /// 添加节点分组
    pub async fn add_group(&self, group: NodeGroup) -> Result<()> {
        let mut groups = self.groups.write().await;
        groups.push(group);
        Ok(())
    }

    /// 更新节点分组
    pub async fn update_group(&self, group_name: &str, group: NodeGroup) -> Result<()> {
        let mut groups = self.groups.write().await;
        if let Some(existing) = groups.iter_mut().find(|g| g.name == group_name) {
            *existing = group;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Group not found: {}", group_name))
        }
    }

    /// 删除节点分组
    pub async fn remove_group(&self, group_name: &str) -> Result<()> {
        let mut groups = self.groups.write().await;
        groups.retain(|g| g.name != group_name);
        Ok(())
    }

    /// 获取所有节点
    pub async fn get_all_nodes(&self) -> Vec<NodeInfo> {
        let groups = self.groups.read().await;
        groups.iter().flat_map(|g| g.nodes.clone()).collect()
    }

    /// 获取指定节点
    pub async fn get_node(&self, node_id: &str) -> Option<NodeInfo> {
        let nodes = self.get_all_nodes().await;
        nodes.into_iter().find(|n| n.id == node_id)
    }

    /// 根据类型获取节点
    pub async fn get_nodes_by_type(&self, node_type: &NodeType) -> Vec<NodeInfo> {
        let nodes = self.get_all_nodes().await;
        nodes.into_iter().filter(|n| &n.node_type == node_type).collect()
    }

    /// 搜索节点
    pub async fn search_nodes(&self, query: &str) -> Vec<NodeInfo> {
        let nodes = self.get_all_nodes().await;
        let query_lower = query.to_lowercase();
        
        nodes.into_iter()
            .filter(|n| {
                n.name.to_lowercase().contains(&query_lower) ||
                n.server.to_lowercase().contains(&query_lower) ||
                n.group.as_ref().map_or(false, |g| g.to_lowercase().contains(&query_lower))
            })
            .collect()
    }

    /// 按延迟排序节点
    pub async fn sort_nodes_by_latency(&self, group_name: Option<&str>) -> Vec<NodeInfo> {
        let mut nodes = if let Some(group_name) = group_name {
            let groups = self.groups.read().await;
            groups.iter()
                .find(|g| g.name == group_name)
                .map(|g| g.nodes.clone())
                .unwrap_or_default()
        } else {
            self.get_all_nodes().await
        };

        nodes.sort_by(|a, b| {
            match (a.latency, b.latency) {
                (Some(a_lat), Some(b_lat)) => a_lat.cmp(&b_lat),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        });

        nodes
    }

    /// 测试单个节点延迟
    pub async fn test_node_latency(&self, node_id: &str) -> Result<LatencyTestResult> {
        let node = self.get_node(node_id).await
            .ok_or_else(|| anyhow::anyhow!("Node not found: {}", node_id))?;

        // 这里应该调用Clash Meta API测试延迟
        // 暂时模拟测试结果
        let latency = Some(rand::random::<u64>() % 1000 + 50);

        // 更新节点延迟信息
        self.update_node_latency(node_id, latency).await?;

        let result = LatencyTestResult {
            node_id: node_id.to_string(),
            latency,
            tested_at: chrono::Utc::now(),
            success: true,
            error: None,
        };

        log::info!("Tested latency for node {}: {:?}ms", node.name, latency);
        Ok(result)
    }

    /// 批量测试节点延迟
    pub async fn test_all_nodes_latency(&self) -> Result<Vec<LatencyTestResult>> {
        let nodes = self.get_all_nodes().await;
        let mut results = Vec::new();

        for node in nodes {
            match self.test_node_latency(&node.id).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    log::error!("Failed to test node {}: {}", node.name, e);
                    results.push(LatencyTestResult {
                        node_id: node.id,
                        latency: None,
                        tested_at: chrono::Utc::now(),
                        success: false,
                        error: Some(e.to_string()),
                    });
                }
            }
        }

        Ok(results)
    }

    /// 更新节点延迟
    pub async fn update_node_latency(&self, node_id: &str, latency: Option<u64>) -> Result<()> {
        let mut groups = self.groups.write().await;
        
        for group in groups.iter_mut() {
            if let Some(node) = group.nodes.iter_mut().find(|n| n.id == node_id) {
                node.latency = latency;
                node.available = latency.is_some();
                return Ok(());
            }
        }

        Err(anyhow::anyhow!("Node not found: {}", node_id))
    }

    /// 从配置文件加载节点
    pub async fn load_nodes_from_config(&self, config: &crate::models::config::ClashConfig) -> Result<()> {
        let mut groups = Vec::new();

        // 解析代理节点
        if let Some(proxies) = &config.proxies {
            let mut nodes = Vec::new();
            
            for proxy in proxies {
                if let Some(node) = self.parse_proxy_to_node(proxy) {
                    nodes.push(node);
                }
            }

            // 创建默认分组
            if !nodes.is_empty() {
                groups.push(NodeGroup {
                    name: "Proxies".to_string(),
                    node_type: None,
                    nodes,
                    selected_node: None,
                });
            }
        }

        // 解析代理组
        if let Some(proxy_groups) = &config.proxy_groups {
            for group_value in proxy_groups {
                if let Some(group) = self.parse_proxy_group(group_value) {
                    groups.push(group);
                }
            }
        }

        // 更新分组列表
        let mut stored_groups = self.groups.write().await;
        *stored_groups = groups;

        log::info!("Loaded {} groups from config", stored_groups.len());
        Ok(())
    }

    /// 解析代理配置为节点
    fn parse_proxy_to_node(&self, proxy: &serde_json::Value) -> Option<NodeInfo> {
        let name = proxy.get("name")?.as_str()?.to_string();
        let server = proxy.get("server")?.as_str()?.to_string();
        let port = proxy.get("port")?.as_u64()? as u16;
        let proxy_type = proxy.get("type")?.as_str()?.to_string();

        let node_type = match proxy_type.as_str() {
            "ss" => NodeType::SS,
            "ssr" => NodeType::SSR,
            "vmess" => NodeType::VMess,
            "trojan" => NodeType::Trojan,
            "hysteria" => NodeType::Hysteria,
            "hysteria2" => NodeType::Hysteria2,
            "wireguard" => NodeType::WireGuard,
            "vless" => NodeType::VLESS,
            "tuic" => NodeType::Tuic,
            _ => NodeType::Unknown,
        };

        Some(NodeInfo {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            node_type,
            server,
            port,
            latency: None,
            available: false,
            group: None,
            country_code: None,
            extra: proxy.clone(),
        })
    }

    /// 解析代理组
    fn parse_proxy_group(&self, group_value: &serde_json::Value) -> Option<NodeGroup> {
        let name = group_value.get("name")?.as_str()?.to_string();
        let group_type = group_value.get("type")?.as_str()?.to_string();
        
        let node_type = match group_type.as_str() {
            "select" | "url-test" | "fallback" | "load-balance" => None,
            _ => None,
        };

        let mut nodes = Vec::new();
        if let Some(proxies) = group_value.get("proxies").and_then(|p| p.as_array()) {
            for proxy_name in proxies {
                if let Some(proxy_str) = proxy_name.as_str() {
                    // 这里需要根据名称查找对应的节点
                    // 暂时创建一个占位节点
                    nodes.push(NodeInfo {
                        id: uuid::Uuid::new_v4().to_string(),
                        name: proxy_str.to_string(),
                        node_type: NodeType::Unknown,
                        server: String::new(),
                        port: 0,
                        latency: None,
                        available: false,
                        group: Some(name.clone()),
                        country_code: None,
                        extra: serde_json::Value::Null,
                    });
                }
            }
        }

        Some(NodeGroup {
            name,
            node_type,
            nodes,
            selected_node: None,
        })
    }

    /// 设置Clash Meta API地址
    pub fn set_api_base(&mut self, url: &str) {
        self.api_base = url.to_string();
    }

    /// 获取Clash Meta API地址
    pub fn get_api_base(&self) -> &str {
        &self.api_base
    }
}

impl Default for NodeService {
    fn default() -> Self {
        Self::new()
    }
}
