import { create } from "zustand";
import type { NodeInfo, NodeGroup, LatencyTestResult } from "@/types";
import * as api from "@/api";

interface NodeState {
  // 状态
  groups: NodeGroup[];
  nodes: NodeInfo[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchGroups: () => Promise<void>;
  fetchAllNodes: () => Promise<void>;
  searchNodes: (query: string) => Promise<void>;
  sortByLatency: (groupName?: string) => Promise<void>;
  testNodeLatency: (nodeId: string) => Promise<LatencyTestResult>;
  testAllLatency: () => Promise<LatencyTestResult[]>;
  selectNode: (nodeId: string) => Promise<void>;
}

export const useNodeStore = create<NodeState>((set, get) => ({
  groups: [],
  nodes: [],
  loading: false,
  error: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const groups = await api.getNodeGroups();
      set({ groups, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchAllNodes: async () => {
    set({ loading: true, error: null });
    try {
      const nodes = await api.getAllNodes();
      set({ nodes, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  searchNodes: async (query: string) => {
    set({ loading: true, error: null });
    try {
      const nodes = await api.searchNodes(query);
      set({ nodes, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  sortByLatency: async (groupName?: string) => {
    set({ loading: true, error: null });
    try {
      const nodes = await api.sortNodesByLatency(groupName);
      set({ nodes, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  testNodeLatency: async (nodeId: string) => {
    try {
      const result = await api.testNodeLatency(nodeId);
      // 更新节点延迟信息
      const nodes = get().nodes.map((node) =>
        node.id === nodeId ? { ...node, latency: result.latency } : node,
      );
      set({ nodes });
      return result;
    } catch (error) {
      throw error;
    }
  },

  testAllLatency: async () => {
    set({ loading: true, error: null });
    try {
      const results = await api.testAllNodesLatency();
      // 更新所有节点的延迟信息
      const nodes = get().nodes.map((node) => {
        const result = results.find((r) => r.nodeId === node.id);
        return result ? { ...node, latency: result.latency } : node;
      });
      set({ nodes, loading: false });
      return results;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  selectNode: async (nodeId: string) => {
    try {
      await api.selectProxyNode(nodeId);
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
