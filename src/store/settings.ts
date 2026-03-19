import { create } from "zustand";
import type { AppSettings } from "@/types";
import * as api from "@/api";

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;

  fetchSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings });
    } catch {
      // Use defaults if backend fails
      set({
        settings: {
          theme: "system",
          language: "zh",
          autoStart: false,
          minimizeToTray: true,
          startMinimized: false,
          systemProxy: false,
          tunMode: false,
        },
      });
    }
  },

  updateSettings: async (patch: Partial<AppSettings>) => {
    const current = get().settings;
    if (!current) return;

    const updated = { ...current, ...patch };
    set({ settings: updated, loading: true });
    try {
      await api.saveSettings(updated);
    } catch {
      // Revert on failure
      set({ settings: current });
    } finally {
      set({ loading: false });
    }
  },
}));
