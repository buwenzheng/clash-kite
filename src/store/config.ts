import { create } from "zustand";
import type { ProfileInfo } from "@/types";
import * as api from "@/api";

interface ProfileState {
  profiles: ProfileInfo[];
  loading: boolean;
  error: string | null;

  fetchProfiles: () => Promise<void>;
  importFile: (filePath: string, name: string) => Promise<ProfileInfo>;
  importSubscription: (url: string, name: string) => Promise<ProfileInfo>;
  updateSubscription: (id: string) => Promise<void>;
  updateProfileInfo: (id: string, name: string, subscriptionUrl?: string | null) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  activateProfile: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  loading: false,
  error: null,

  fetchProfiles: async () => {
    set({ loading: true, error: null });
    try {
      const profiles = await api.getProfiles();
      set({ profiles, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  importFile: async (filePath: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const profile = await api.importProfileFile(filePath, name);
      set({ profiles: [...get().profiles, profile], loading: false });
      return profile;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  importSubscription: async (url: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const profile = await api.importProfileSubscription(url, name);
      set({ profiles: [...get().profiles, profile], loading: false });
      return profile;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  updateSubscription: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.updateProfileSubscription(id);
      await get().fetchProfiles();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateProfileInfo: async (id: string, name: string, subscriptionUrl?: string | null) => {
    set({ loading: true, error: null });
    try {
      const updated = await api.updateProfileInfo(id, name, subscriptionUrl);
      set({
        profiles: get().profiles.map((p) => (p.id === id ? updated : p)),
        loading: false,
      });
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  deleteProfile: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteProfile(id);
      set({
        profiles: get().profiles.filter((p) => p.id !== id),
        loading: false,
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  activateProfile: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.activateProfile(id);
      await get().fetchProfiles();
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
