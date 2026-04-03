import { create } from "zustand";
import type {
  ProxyStatus,
  ProxyGroup,
  ProxyMode,
  DelayResult,
  TrafficData,
} from "@/types";
import * as api from "@/api";

interface ProxyState {
  status: ProxyStatus | null;
  groups: ProxyGroup[];
  traffic: TrafficData;
  loading: boolean;
  error: string | null;

  fetchStatus: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  toggleProxy: () => Promise<void>;
  startProxy: () => Promise<void>;
  stopProxy: () => Promise<void>;
  setMode: (mode: ProxyMode) => Promise<void>;
  selectProxy: (group: string, name: string) => Promise<void>;
  testDelay: (name: string) => Promise<DelayResult>;
  setSystemProxy: (enable: boolean) => Promise<void>;
  fetchTraffic: () => Promise<TrafficData | null>;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  status: null,
  groups: [],
  traffic: { up: 0, down: 0 },
  loading: false,
  error: null,

  fetchStatus: async () => {
    try {
      const status = await api.getProxyStatus();
      set({ status, error: null });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchGroups: async () => {
    set({ loading: true });
    try {
      const groups = await api.getProxyGroups();
      set({ groups, loading: false, error: null });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  toggleProxy: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.toggleProxy();
      set({ status, loading: false });
      if (status.running) {
        await get().fetchGroups();
      } else {
        set({ groups: [] });
      }
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  startProxy: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.startProxy();
      set({ status, loading: false });
      await get().fetchGroups();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  stopProxy: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.stopProxy();
      set({ status, groups: [], loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setMode: async (mode: ProxyMode) => {
    try {
      await api.setProxyMode(mode);
      await get().fetchStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  selectProxy: async (group: string, name: string) => {
    try {
      await api.selectProxy(group, name);
      await get().fetchGroups();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  testDelay: async (name: string) => {
    try {
      const result = await api.testProxyDelay(name);
      // Refresh groups to get updated delay history
      await get().fetchGroups();
      return result;
    } catch (error) {
      return { name, delay: null, error: String(error) };
    }
  },

  setSystemProxy: async (enable: boolean) => {
    try {
      await api.setSystemProxy(enable);
      await get().fetchStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchTraffic: async () => {
    try {
      const traffic = await api.getTraffic();
      set({ traffic });
      return traffic;
    } catch {
      return null;
    }
  },
}));
