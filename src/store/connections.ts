import { create } from "zustand";
import type { ConnectionItem } from "@/types";
import * as api from "@/api";

interface ConnectionsState {
  connections: ConnectionItem[];
  loading: boolean;
  error: string | null;
  activeTab: "active" | "closed";
  search: string;
  sortBy: "default" | "traffic" | "duration";
  viewMode: "list" | "table";

  fetchSnapshot: () => Promise<void>;
  closeConnection: (id: string) => Promise<void>;
  closeAllConnections: () => Promise<void>;
  setActiveTab: (tab: "active" | "closed") => void;
  setSearch: (search: string) => void;
  setSortBy: (sortBy: "default" | "traffic" | "duration") => void;
  setViewMode: (mode: "list" | "table") => void;
  reset: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  connections: [],
  loading: false,
  error: null,
  activeTab: "active",
  search: "",
  sortBy: "default",
  viewMode: "list",

  fetchSnapshot: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await api.getConnectionsSnapshot();
      set({ connections, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  closeConnection: async (id: string) => {
    try {
      await api.closeConnection(id);
      await get().fetchSnapshot();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  closeAllConnections: async () => {
    try {
      await api.closeAllConnections();
      await get().fetchSnapshot();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearch: (search) => set({ search }),
  setSortBy: (sortBy) => set({ sortBy }),
  setViewMode: (mode) => set({ viewMode: mode }),

  reset: () =>
    set({
      connections: [],
      loading: false,
      error: null,
      activeTab: "active",
      search: "",
      sortBy: "default",
      viewMode: "list",
    }),
}));
