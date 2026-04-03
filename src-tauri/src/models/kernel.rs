use serde::{Deserialize, Serialize};

/// Kernel port and settings that can be configured via the UI.
/// Persisted in the SQLite `settings` table with keys `kernel_*`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSettings {
    /// Mixed proxy port (default: 7890)
    pub mixed_port: u16,
    /// HTTP proxy port (default: 7892)
    pub http_port: u16,
    /// SOCKS5 proxy port (default: 7891)
    pub socks_port: u16,
}

impl Default for KernelSettings {
    fn default() -> Self {
        Self {
            mixed_port: 7890,
            http_port: 7892,
            socks_port: 7891,
        }
    }
}
