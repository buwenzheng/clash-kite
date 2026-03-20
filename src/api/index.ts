import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  ProxyStatus,
  ProxyGroup,
  DelayResult,
  TrafficData,
  ProfileInfo,
  AutoUpdateResult,
  AppSettings,
} from "../types";

// ==================== Proxy ====================

export const getProxyStatus = () =>
  invoke<ProxyStatus>("get_proxy_status");

export const startProxy = () =>
  invoke<ProxyStatus>("start_proxy");

export const stopProxy = () =>
  invoke<ProxyStatus>("stop_proxy");

export const toggleProxy = () =>
  invoke<ProxyStatus>("toggle_proxy");

export const getProxyGroups = () =>
  invoke<ProxyGroup[]>("get_proxy_groups");

export const selectProxy = (group: string, name: string) =>
  invoke<void>("select_proxy", { group, name });

export const testProxyDelay = (name: string) =>
  invoke<DelayResult>("test_proxy_delay", { name });

export const setProxyMode = (mode: string) =>
  invoke<void>("set_proxy_mode", { mode });

export const setSystemProxy = (enable: boolean) =>
  invoke<void>("set_system_proxy", { enable });

export const getTraffic = () =>
  invoke<TrafficData>("get_traffic");

export const getMihomoLog = (lines?: number) =>
  invoke<string>("get_mihomo_log", { lines });

// ==================== Profile ====================

export const getProfiles = () =>
  invoke<ProfileInfo[]>("get_profiles");

export const getActiveProfile = () =>
  invoke<ProfileInfo | null>("get_active_profile");

export const importProfileFile = (filePath: string, name: string) =>
  invoke<ProfileInfo>("import_profile_file", { filePath, name });

export const importProfileSubscription = (url: string, name: string) =>
  invoke<ProfileInfo>("import_profile_subscription", { url, name });

export const updateProfileSubscription = (id: string) =>
  invoke<ProfileInfo>("update_profile_subscription", { id });

export const deleteProfile = (id: string) =>
  invoke<void>("delete_profile", { id });

export const activateProfile = (id: string) =>
  invoke<ProfileInfo>("activate_profile", { id });

export const updateProfileInfo = (id: string, name: string, subscriptionUrl?: string | null) =>
  invoke<ProfileInfo>("update_profile_info", { id, name, subscriptionUrl });

export const exportProfile = (id: string, destPath: string) =>
  invoke<void>("export_profile", { id, destPath });

export const setProfileAutoUpdate = (id: string, autoUpdate: boolean, autoUpdateInterval: number) =>
  invoke<ProfileInfo>("set_profile_auto_update", { id, autoUpdate, autoUpdateInterval });

export const updateAllAutoUpdateProfiles = () =>
  invoke<AutoUpdateResult[]>("update_all_auto_update_profiles");

export const readProfileContent = (id: string) =>
  invoke<string>("read_profile_content", { id });

export const saveProfileContent = (id: string, content: string) =>
  invoke<void>("save_profile_content", { id, content });

// ==================== Settings ====================

export const getSettings = () =>
  invoke<AppSettings>("get_settings");

export const saveSettings = (settings: AppSettings) =>
  invoke<void>("save_settings", { settings });

// ==================== File Dialogs ====================

export async function openConfigFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: "Config", extensions: ["yaml", "yml"] }],
  });
  if (typeof result === "string") return result;
  return null;
}

export async function saveConfigFile(defaultName: string): Promise<string | null> {
  return save({
    defaultPath: defaultName,
    filters: [{ name: "Config", extensions: ["yaml", "yml"] }],
  });
}
