use tauri::State;
use crate::models::kernel::KernelSettings;
use crate::services::kernel::KernelService;

#[tauri::command]
pub async fn get_kernel_settings(
    kernel_svc: State<'_, KernelService>,
) -> Result<KernelSettings, String> {
    Ok(kernel_svc.get_settings().await)
}

#[tauri::command]
pub async fn save_kernel_settings(
    kernel_svc: State<'_, KernelService>,
    settings: KernelSettings,
) -> Result<(), String> {
    kernel_svc.save_settings(&settings).await.map_err(|e| e.to_string())
}
