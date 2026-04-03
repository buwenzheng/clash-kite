import { create } from "zustand";
import type { KernelSettings } from "@/types";
import * as api from "@/api";

interface KernelState {
  settings: KernelSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  saveSettings: (settings: KernelSettings) => Promise<boolean>;
}

const DEFAULT_KERNEL_SETTINGS: KernelSettings = {
  mixedPort: 7890,
  httpPort: 7892,
  socksPort: 7891,
};

export const useKernelStore = create<KernelState>((set) => ({
  settings: null,
  loading: false,
  saving: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await api.getKernelSettings();
      set({ settings, loading: false });
    } catch {
      set({ settings: DEFAULT_KERNEL_SETTINGS, loading: false });
    }
  },

  saveSettings: async (settings: KernelSettings) => {
    set({ saving: true, error: null });
    try {
      await api.saveKernelSettings(settings);
      set({ settings, saving: false });
      return true;
    } catch (e) {
      set({ error: String(e), saving: false });
      return false;
    }
  },
}));
