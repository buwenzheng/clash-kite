import { create } from "zustand";
import type { ConfigInfo } from "@/types";
import * as api from "@/api";

interface ConfigState {
  // 状态
  currentConfig: ConfigInfo | null;
  configs: ConfigInfo[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchCurrentConfig: () => Promise<void>;
  fetchAllConfigs: () => Promise<void>;
  importFromFile: (filePath: string, name: string) => Promise<ConfigInfo>;
  importFromSubscription: (url: string, name: string) => Promise<ConfigInfo>;
  updateSubscription: (configId: string) => Promise<void>;
  deleteConfig: (configId: string) => Promise<void>;
  setCurrentConfig: (config: ConfigInfo) => Promise<void>;
  readConfigContent: (configId: string) => Promise<string>;
  saveConfigContent: (configId: string, content: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  currentConfig: null,
  configs: [],
  loading: false,
  error: null,

  fetchCurrentConfig: async () => {
    set({ loading: true, error: null });
    try {
      const currentConfig = await api.getCurrentConfig();
      set({ currentConfig, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchAllConfigs: async () => {
    set({ loading: true, error: null });
    try {
      const configs = await api.getAllConfigs();
      set({ configs, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  importFromFile: async (filePath: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const config = await api.importConfigFromFile(filePath, name);
      const configs = [...get().configs, config];
      set({ configs, loading: false });
      return config;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  importFromSubscription: async (url: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const config = await api.importConfigFromSubscription(url, name);
      const configs = [...get().configs, config];
      set({ configs, loading: false });
      return config;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  updateSubscription: async (configId: string) => {
    set({ loading: true, error: null });
    try {
      await api.updateSubscription(configId);
      // 刷新配置列表
      await get().fetchAllConfigs();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  deleteConfig: async (configId: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteConfig(configId);
      const configs = get().configs.filter((c) => c.id !== configId);
      set({ configs, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setCurrentConfig: async (config: ConfigInfo) => {
    set({ loading: true, error: null });
    try {
      await api.setCurrentConfig(config);
      set({ currentConfig: config, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  readConfigContent: async (configId: string) => {
    try {
      return await api.readConfigContent(configId);
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  saveConfigContent: async (configId: string, content: string) => {
    set({ loading: true, error: null });
    try {
      await api.saveConfigContent(configId, content);
      set({ loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
