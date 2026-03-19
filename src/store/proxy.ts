import { create } from "zustand";
import type { ProxyInfo, ProxyConfig, ProxyMode } from "@/types";
import * as api from "@/api";

interface ProxyState {
  // 状态
  info: ProxyInfo | null;
  loading: boolean;
  error: string | null;

  // 操作
  fetchProxyInfo: () => Promise<void>;
  toggleProxy: () => Promise<void>;
  setMode: (mode: ProxyMode) => Promise<void>;
  selectNode: (nodeId: string) => Promise<void>;
  startProxy: () => Promise<void>;
  stopProxy: () => Promise<void>;
  restartProxy: () => Promise<void>;
  updateConfig: (config: ProxyConfig) => Promise<void>;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  info: null,
  loading: false,
  error: null,

  fetchProxyInfo: async () => {
    set({ loading: true, error: null });
    try {
      const info = await api.getProxyInfo();
      set({ info, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  toggleProxy: async () => {
    set({ loading: true, error: null });
    try {
      await api.toggleProxy();
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setMode: async (mode: ProxyMode) => {
    set({ loading: true, error: null });
    try {
      await api.setProxyMode(mode);
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  selectNode: async (nodeId: string) => {
    set({ loading: true, error: null });
    try {
      await api.selectProxyNode(nodeId);
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  startProxy: async () => {
    set({ loading: true, error: null });
    try {
      await api.startProxy();
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  stopProxy: async () => {
    set({ loading: true, error: null });
    try {
      await api.stopProxy();
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  restartProxy: async () => {
    set({ loading: true, error: null });
    try {
      await api.restartProxy();
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateConfig: async (config: ProxyConfig) => {
    set({ loading: true, error: null });
    try {
      await api.updateProxyConfig(config);
      await get().fetchProxyInfo();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
