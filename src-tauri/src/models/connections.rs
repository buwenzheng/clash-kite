use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A single network connection as returned by mihomo GET /connections
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionItem {
    pub id: String,
    pub src: String,
    pub dst: String,
    pub protocol: String,
    #[serde(rename = "chains")]
    pub chains: Vec<String>,
    pub proxy: String,
    #[serde(rename = "upload")]
    pub upload_bytes: u64,
    #[serde(rename = "download")]
    pub download_bytes: u64,
    pub duration: u64,
    #[serde(default)]
    pub state: ConnectionState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionState {
    Active,
    Closed,
}

impl Default for ConnectionState {
    fn default() -> Self {
        ConnectionState::Active
    }
}

/// Flexible response wrapper for mihomo GET /connections.
/// Handles `{"connections": [...]}` and `{"connections": null}` (no connections).
#[derive(Debug, Deserialize)]
pub struct ConnectionsResponse {
    #[serde(deserialize_with = "deserialize_null_as_empty_vec")]
    pub connections: Vec<Value>,
}

/// Deserialize `null` or missing field as an empty Vec.
fn deserialize_null_as_empty_vec<'de, D>(deserializer: D) -> Result<Vec<Value>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt: Option<Vec<Value>> = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

impl From<ConnectionsResponse> for Vec<ConnectionItem> {
    fn from(resp: ConnectionsResponse) -> Self {
        resp.connections
            .into_iter()
            .filter_map(|v| parse_connection(v).ok())
            .collect()
    }
}

/// Parse a single raw connection from a JSON Value.
fn parse_connection(raw: Value) -> Result<ConnectionItem, serde_json::Error> {
    let id = raw.get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let metadata = raw.get("metadata").and_then(|v| v.as_object());

    // Build src
    let src = if let (Some(ip), Some(port)) = (
        metadata.and_then(|m| m.get("sourceIP")?.as_str()),
        metadata.and_then(|m| m.get("sourcePort")?.as_str()),
    ) {
        format!("{}:{}", ip, port)
    } else if let Some(ip) = metadata.and_then(|m| m.get("sourceIP")?.as_str()) {
        ip.to_string()
    } else {
        "unknown".to_string()
    };

    // Build dst: prefer host:port, fall back to destinationIP:port
    let host = metadata.and_then(|m| m.get("host")?.as_str());
    let dst_ip = metadata.and_then(|m| m.get("destinationIP")?.as_str());
    let dst_port_raw = metadata.and_then(|m| m.get("destinationPort"));
    let dst_port_str: Option<String> = dst_port_raw
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .or_else(|| dst_port_raw.and_then(|v| v.as_u64().map(|n| n.to_string())));

    let dst = if let (Some(h), Some(ref p)) = (host, dst_port_str.as_ref()) {
        format!("{}:{}", h, p)
    } else if let (Some(ip), Some(ref p)) = (dst_ip, dst_port_str.as_ref()) {
        format!("{}:{}", ip, p)
    } else if let Some(h) = host {
        h.to_string()
    } else {
        "unknown".to_string()
    };

    // Protocol: mihomo uses "type" inside metadata (e.g. "HTTPS", "TCP")
    let protocol = metadata
        .and_then(|m| m.get("type").or_else(|| m.get("network")))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();

    // Proxy chain: "chains" is at the top level of each connection
    let chains: Vec<String> = raw
        .get("chains")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect()
        })
        .unwrap_or_default();

    // Proxy name (leaf node of the chain)
    let proxy = chains.last().cloned().unwrap_or_else(|| "DIRECT".to_string());

    // Upload/download: top-level fields in mihomo response
    let upload_bytes = raw.get("upload")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    let download_bytes = raw.get("download")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    // Duration from start time (RFC3339)
    let duration_ms = raw.get("start")
        .and_then(|v| v.as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|t| {
            let now = chrono::Utc::now();
            let elapsed = now.signed_duration_since(t.with_timezone(&chrono::Utc));
            elapsed.num_milliseconds() as u64
        })
        .unwrap_or(0);

    Ok(ConnectionItem {
        id,
        src,
        dst,
        protocol,
        chains,
        proxy,
        upload_bytes,
        download_bytes,
        duration: duration_ms,
        state: ConnectionState::Active,
    })
}
