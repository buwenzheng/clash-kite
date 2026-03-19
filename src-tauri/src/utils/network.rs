use anyhow::Result;
use tokio::net::TcpStream;
use std::time::Duration;

/// 测试TCP连接延迟
pub async fn test_tcp_latency(host: &str, port: u16, timeout_ms: u64) -> Result<u64> {
    let addr = format!("{}:{}", host, port);
    let timeout = Duration::from_millis(timeout_ms);
    
    let start = std::time::Instant::now();
    
    match tokio::time::timeout(timeout, TcpStream::connect(&addr)).await {
        Ok(Ok(_)) => {
            let latency = start.elapsed().as_millis() as u64;
            Ok(latency)
        }
        Ok(Err(e)) => Err(anyhow::anyhow!("Connection failed: {}", e)),
        Err(_) => Err(anyhow::anyhow!("Connection timeout")),
    }
}

/// 检查端口是否可用
pub async fn is_port_available(port: u16) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    TcpStream::connect(&addr).await.is_err()
}

/// 获取可用端口
pub async fn get_available_port(start_port: u16) -> Option<u16> {
    for port in start_port..start_port + 1000 {
        if is_port_available(port).await {
            return Some(port);
        }
    }
    None
}

/// 解析URL
pub fn parse_url(url: &str) -> Result<url::Url> {
    Ok(url::Url::parse(url)?)
}

/// 检查URL是否有效
pub fn is_valid_url(url: &str) -> bool {
    url::Url::parse(url).is_ok()
}

/// 下载文件
pub async fn download_file(url: &str, dest_path: &std::path::Path) -> Result<()> {
    let response = reqwest::get(url).await?;
    
    if !response.status().is_success() {
        return Err(anyhow::anyhow!("Download failed: {}", response.status()));
    }
    
    let content = response.bytes().await?;
    tokio::fs::write(dest_path, &content).await?;
    
    Ok(())
}
