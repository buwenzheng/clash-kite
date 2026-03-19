use std::path::Path;
use anyhow::Result;

/// 读取文件内容
pub async fn read_file(path: &Path) -> Result<String> {
    let content = tokio::fs::read_to_string(path).await?;
    Ok(content)
}

/// 写入文件内容
pub async fn write_file(path: &Path, content: &str) -> Result<()> {
    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            tokio::fs::create_dir_all(parent).await?;
        }
    }
    
    tokio::fs::write(path, content).await?;
    Ok(())
}

/// 复制文件
pub async fn copy_file(src: &Path, dst: &Path) -> Result<()> {
    // 确保目标目录存在
    if let Some(parent) = dst.parent() {
        if !parent.exists() {
            tokio::fs::create_dir_all(parent).await?;
        }
    }
    
    tokio::fs::copy(src, dst).await?;
    Ok(())
}

/// 删除文件
pub async fn delete_file(path: &Path) -> Result<()> {
    if path.exists() {
        tokio::fs::remove_file(path).await?;
    }
    Ok(())
}

/// 检查文件是否存在
pub fn file_exists(path: &Path) -> bool {
    path.exists()
}

/// 获取文件扩展名
pub fn get_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_string())
}

/// 获取文件名（不含扩展名）
pub fn get_stem(path: &Path) -> Option<String> {
    path.file_stem()
        .and_then(|stem| stem.to_str())
        .map(|s| s.to_string())
}

/// 生成唯一文件名
pub fn generate_unique_filename(base: &str, ext: &str) -> String {
    let uuid = uuid::Uuid::new_v4();
    format!("{}_{}.{}", base, uuid, ext)
}
