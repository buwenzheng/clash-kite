use std::sync::Arc;
use tokio::sync::Mutex;
use rusqlite::Connection;
use anyhow::Result;

use crate::models::settings::AppSettings;

pub struct SettingsService {
    db: Arc<Mutex<Connection>>,
}

impl SettingsService {
    pub fn new(db: Arc<Mutex<Connection>>) -> Self {
        Self { db }
    }

    pub async fn get(&self) -> Result<AppSettings> {
        let db = self.db.lock().await;
        let mut settings = AppSettings::default();

        if let Ok(v) = self.get_value(&db, "theme") { settings.theme = v; }
        if let Ok(v) = self.get_value(&db, "language") { settings.language = v; }
        if let Ok(v) = self.get_value(&db, "auto_start") { settings.auto_start = v == "true"; }
        if let Ok(v) = self.get_value(&db, "minimize_to_tray") { settings.minimize_to_tray = v == "true"; }
        if let Ok(v) = self.get_value(&db, "start_minimized") { settings.start_minimized = v == "true"; }
        if let Ok(v) = self.get_value(&db, "system_proxy") { settings.system_proxy = v == "true"; }
        if let Ok(v) = self.get_value(&db, "tun_mode") { settings.tun_mode = v == "true"; }

        Ok(settings)
    }

    pub async fn save(&self, settings: &AppSettings) -> Result<()> {
        let db = self.db.lock().await;
        self.set_value(&db, "theme", &settings.theme)?;
        self.set_value(&db, "language", &settings.language)?;
        self.set_value(&db, "auto_start", &settings.auto_start.to_string())?;
        self.set_value(&db, "minimize_to_tray", &settings.minimize_to_tray.to_string())?;
        self.set_value(&db, "start_minimized", &settings.start_minimized.to_string())?;
        self.set_value(&db, "system_proxy", &settings.system_proxy.to_string())?;
        self.set_value(&db, "tun_mode", &settings.tun_mode.to_string())?;
        Ok(())
    }

    fn get_value(&self, db: &Connection, key: &str) -> Result<String> {
        let v: String = db.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get(0),
        )?;
        Ok(v)
    }

    fn set_value(&self, db: &Connection, key: &str, value: &str) -> Result<()> {
        db.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            rusqlite::params![key, value],
        )?;
        Ok(())
    }
}
