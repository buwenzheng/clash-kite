use std::sync::Arc;
use tokio::sync::Mutex;
use rusqlite::Connection;
use anyhow::Result;

use crate::models::kernel::KernelSettings;

const KEY_PREFIX: &str = "kernel_";

#[derive(Clone)]
pub struct KernelService {
    db: Arc<Mutex<Connection>>,
}

impl KernelService {
    pub fn new(db: Arc<Mutex<Connection>>) -> Self {
        Self { db }
    }

    /// Get kernel settings from SQLite, falling back to defaults.
    pub async fn get_settings(&self) -> KernelSettings {
        let db = self.db.lock().await;
        KernelSettings {
            mixed_port: self.get_u16(&db, "mixed_port").unwrap_or(7890),
            http_port: self.get_u16(&db, "http_port").unwrap_or(7892),
            socks_port: self.get_u16(&db, "socks_port").unwrap_or(7891),
        }
    }

    /// Save kernel settings to SQLite.
    pub async fn save_settings(&self, settings: &KernelSettings) -> Result<()> {
        let db = self.db.lock().await;
        self.set_u16(&db, "mixed_port", settings.mixed_port)?;
        self.set_u16(&db, "http_port", settings.http_port)?;
        self.set_u16(&db, "socks_port", settings.socks_port)?;
        Ok(())
    }

    fn get_u16(&self, db: &Connection, key: &str) -> Option<u16> {
        let full_key = format!("{}{}", KEY_PREFIX, key);
        db.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&full_key],
            |row| {
                let v: String = row.get(0)?;
                Ok(v)
            },
        )
        .ok()
        .and_then(|v| v.parse().ok())
    }

    fn set_u16(&self, db: &Connection, key: &str, value: u16) -> Result<()> {
        let full_key = format!("{}{}", KEY_PREFIX, key);
        db.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            [&full_key, &value.to_string()],
        )?;
        Ok(())
    }
}
