use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use rusqlite::Connection;
use anyhow::Result;

use crate::models::profile::{ProfileInfo, ProfileSource};

pub struct ProfileService {
    config_dir: PathBuf,
    db: Arc<Mutex<Connection>>,
}

impl ProfileService {
    pub fn new(config_dir: PathBuf, db: Arc<Mutex<Connection>>) -> Self {
        Self { config_dir, db }
    }

    fn profiles_dir(&self) -> PathBuf {
        self.config_dir.join("profiles")
    }

    async fn ensure_dir(&self) -> Result<()> {
        let dir = self.profiles_dir();
        if !dir.exists() {
            tokio::fs::create_dir_all(&dir).await?;
        }
        Ok(())
    }

    pub async fn get_all(&self) -> Result<Vec<ProfileInfo>> {
        let db = self.db.lock().await;
        let mut stmt = db.prepare(
            "SELECT id, name, source, file_path, sub_url, updated_at, is_active FROM profiles ORDER BY name",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ProfileInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                source: ProfileSource::from_str(&row.get::<_, String>(2)?),
                file_path: row.get(3)?,
                subscription_url: row.get(4)?,
                updated_at: row.get(5)?,
                is_active: row.get::<_, i32>(6)? != 0,
            })
        })?;
        let mut profiles = Vec::new();
        for row in rows {
            profiles.push(row?);
        }
        Ok(profiles)
    }

    pub async fn get_active(&self) -> Result<Option<ProfileInfo>> {
        let all = self.get_all().await?;
        Ok(all.into_iter().find(|p| p.is_active))
    }

    pub async fn import_file(&self, src_path: &str, name: &str) -> Result<ProfileInfo> {
        self.ensure_dir().await?;
        let path = Path::new(src_path);
        if !path.exists() {
            anyhow::bail!("File not found: {}", src_path);
        }

        let content = tokio::fs::read_to_string(path).await?;
        self.validate_yaml(&content)?;

        let id = uuid::Uuid::new_v4().to_string();
        let dest = self.profiles_dir().join(format!("{}.yaml", id));
        tokio::fs::copy(path, &dest).await?;

        let now = chrono::Utc::now().to_rfc3339();
        let profile = ProfileInfo {
            id: id.clone(),
            name: name.to_string(),
            source: ProfileSource::Local,
            file_path: dest.to_string_lossy().to_string(),
            subscription_url: None,
            updated_at: now.clone(),
            is_active: false,
        };
        self.insert_db(&profile).await?;

        log::info!("Imported profile from file: {}", src_path);
        Ok(profile)
    }

    pub async fn import_subscription(&self, url: &str, name: &str) -> Result<ProfileInfo> {
        self.ensure_dir().await?;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;
        let resp = client.get(url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("Download failed: HTTP {}", resp.status());
        }
        let content = resp.text().await?;
        self.validate_yaml(&content)?;

        let id = uuid::Uuid::new_v4().to_string();
        let dest = self.profiles_dir().join(format!("{}.yaml", id));
        tokio::fs::write(&dest, &content).await?;

        let now = chrono::Utc::now().to_rfc3339();
        let profile = ProfileInfo {
            id: id.clone(),
            name: name.to_string(),
            source: ProfileSource::Subscription,
            file_path: dest.to_string_lossy().to_string(),
            subscription_url: Some(url.to_string()),
            updated_at: now.clone(),
            is_active: false,
        };
        self.insert_db(&profile).await?;

        log::info!("Imported subscription: {}", url);
        Ok(profile)
    }

    pub async fn update_subscription(&self, id: &str) -> Result<ProfileInfo> {
        let profile = self.get_by_id(id).await?
            .ok_or_else(|| anyhow::anyhow!("Profile not found: {}", id))?;

        let url = profile.subscription_url.as_deref()
            .ok_or_else(|| anyhow::anyhow!("Not a subscription profile"))?;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;
        let resp = client.get(url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("Update failed: HTTP {}", resp.status());
        }
        let content = resp.text().await?;
        self.validate_yaml(&content)?;

        tokio::fs::write(&profile.file_path, &content).await?;

        let now = chrono::Utc::now().to_rfc3339();
        {
            let db = self.db.lock().await;
            db.execute(
                "UPDATE profiles SET updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )?;
        }

        log::info!("Updated subscription: {}", id);
        self.get_by_id(id).await.map(|p| p.unwrap())
    }

    pub async fn delete(&self, id: &str) -> Result<()> {
        let profile = self.get_by_id(id).await?;
        if let Some(p) = profile {
            let _ = tokio::fs::remove_file(&p.file_path).await;
        }
        let db = self.db.lock().await;
        db.execute("DELETE FROM profiles WHERE id = ?1", rusqlite::params![id])?;
        log::info!("Deleted profile: {}", id);
        Ok(())
    }

    pub async fn activate(&self, id: &str) -> Result<ProfileInfo> {
        let db = self.db.lock().await;
        db.execute("UPDATE profiles SET is_active = 0", [])?;
        db.execute(
            "UPDATE profiles SET is_active = 1 WHERE id = ?1",
            rusqlite::params![id],
        )?;
        drop(db);
        self.get_by_id(id).await?
            .ok_or_else(|| anyhow::anyhow!("Profile not found: {}", id))
    }

    pub async fn read_content(&self, id: &str) -> Result<String> {
        let profile = self.get_by_id(id).await?
            .ok_or_else(|| anyhow::anyhow!("Profile not found: {}", id))?;
        Ok(tokio::fs::read_to_string(&profile.file_path).await?)
    }

    pub async fn save_content(&self, id: &str, content: &str) -> Result<()> {
        self.validate_yaml(content)?;
        let profile = self.get_by_id(id).await?
            .ok_or_else(|| anyhow::anyhow!("Profile not found: {}", id))?;
        tokio::fs::write(&profile.file_path, content).await?;
        let now = chrono::Utc::now().to_rfc3339();
        let db = self.db.lock().await;
        db.execute(
            "UPDATE profiles SET updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        )?;
        Ok(())
    }

    async fn get_by_id(&self, id: &str) -> Result<Option<ProfileInfo>> {
        let db = self.db.lock().await;
        let mut stmt = db.prepare(
            "SELECT id, name, source, file_path, sub_url, updated_at, is_active FROM profiles WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(rusqlite::params![id], |row| {
            Ok(ProfileInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                source: ProfileSource::from_str(&row.get::<_, String>(2)?),
                file_path: row.get(3)?,
                subscription_url: row.get(4)?,
                updated_at: row.get(5)?,
                is_active: row.get::<_, i32>(6)? != 0,
            })
        })?;
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    async fn insert_db(&self, p: &ProfileInfo) -> Result<()> {
        let db = self.db.lock().await;
        db.execute(
            "INSERT INTO profiles (id, name, source, file_path, sub_url, updated_at, is_active) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            rusqlite::params![
                p.id,
                p.name,
                p.source.to_string(),
                p.file_path,
                p.subscription_url,
                p.updated_at,
                p.is_active as i32
            ],
        )?;
        Ok(())
    }

    fn validate_yaml(&self, content: &str) -> Result<()> {
        // Allow permissive parsing — just check basic YAML structure
        let _: serde_yaml::Value = serde_yaml::from_str(content)
            .map_err(|e| anyhow::anyhow!("Invalid YAML: {}", e))?;
        Ok(())
    }
}
