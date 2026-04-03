use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;

use crate::core::mihomo::MihomoManager;

/// Holds the state of the connections streaming task
pub struct ConnectionsStreamState {
    pub active: bool,
}

impl Default for ConnectionsStreamState {
    fn default() -> Self {
        Self { active: false }
    }
}

/// Start streaming connections data to the frontend via Tauri events.
/// Emits `connections:update` events every STREAM_INTERVAL_MS.
#[tauri::command]
pub async fn start_connections_stream(
    app: AppHandle,
    mihomo: State<'_, Arc<MihomoManager>>,
    stream_state: State<'_, Arc<RwLock<ConnectionsStreamState>>>,
) -> Result<(), String> {
    // Prevent multiple streams
    {
        let mut state = stream_state.write().await;
        if state.active {
            return Ok(());
        }
        state.active = true;
    }

    // Clone Arcs so they can be moved into the spawned task
    let mihomo = mihomo.inner().clone();
    let stream_state = stream_state.inner().clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        loop {
            // Check if stream should stop
            {
                let state = stream_state.read().await;
                if !state.active {
                    break;
                }
            }

            if !mihomo.is_running().await {
                tokio::time::sleep(tokio::time::Duration::from_millis(STREAM_INTERVAL_MS)).await;
                continue;
            }

            match mihomo.api().get_connections().await {
                Ok(conns) => {
                    let _ = app_handle.emit("connections:update", &conns);
                }
                Err(e) => {
                    log::warn!("get_connections error: {}", e);
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(STREAM_INTERVAL_MS)).await;
        }
    });

    Ok(())
}

const STREAM_INTERVAL_MS: u64 = 1000;

/// Stop the connections streaming task.
#[tauri::command]
pub async fn stop_connections_stream(
    stream_state: State<'_, Arc<RwLock<ConnectionsStreamState>>>,
) -> Result<(), String> {
    let mut state = stream_state.write().await;
    state.active = false;
    Ok(())
}

/// Get a synchronous snapshot of connections.
#[tauri::command]
pub async fn get_connections_snapshot(
    mihomo: State<'_, Arc<MihomoManager>>,
    mode: Option<String>,
) -> Result<Vec<crate::models::connections::ConnectionItem>, String> {
    if !mihomo.is_running().await {
        return Ok(vec![]);
    }

    match mihomo.api().get_connections().await {
        Ok(conns) => {
            let mut connections: Vec<crate::models::connections::ConnectionItem> = conns;
            // Filter by mode: "active" | "closed" (case-insensitive)
            if let Some(m) = mode {
                let m_lower = m.to_lowercase();
                if m_lower == "active" {
                    connections.retain(|c| c.state == crate::models::connections::ConnectionState::Active);
                } else if m_lower == "closed" {
                    connections.retain(|c| c.state == crate::models::connections::ConnectionState::Closed);
                }
            }
            Ok(connections)
        }
        Err(e) => {
            log::warn!("get_connections_snapshot error: {}", e);
            Err(e.to_string())
        }
    }
}

/// Close a single connection by ID.
#[tauri::command]
pub async fn close_connection(
    mihomo: State<'_, Arc<MihomoManager>>,
    id: String,
) -> Result<(), String> {
    if !mihomo.is_running().await {
        return Err("Proxy is not running".to_string());
    }
    mihomo.api()
        .close_connection(&id)
        .await
        .map_err(|e: anyhow::Error| e.to_string())
}

/// Close all active connections.
#[tauri::command]
pub async fn close_all_connections(
    mihomo: State<'_, Arc<MihomoManager>>,
) -> Result<(), String> {
    if !mihomo.is_running().await {
        return Err("Proxy is not running".to_string());
    }
    mihomo.api()
        .close_all_connections()
        .await
        .map_err(|e: anyhow::Error| e.to_string())
}
