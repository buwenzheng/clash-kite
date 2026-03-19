import { invoke } from "@tauri-apps/api/core";
import type {
  ProxyInfo,
  ProxyConfig,
  NodeInfo,
  NodeGroup,
  LatencyTestResult,
  ConfigInfo,
} from "../types";

// ==================== 代理相关API ====================

/// 获取代理信息
export async function getProxyInfo(): Promise<ProxyInfo> {
  return await invoke("get_proxy_info");
}

/// 获取代理配置
export async function getProxyConfig(): Promise<ProxyConfig> {
  return await invoke("get_proxy_config");
}

/// 更新代理配置
export async function updateProxyConfig(config: ProxyConfig): Promise<void> {
  return await invoke("update_proxy_config", { config });
}

/// 启动代理
export async function startProxy(): Promise<void> {
  return await invoke("start_proxy");
}

/// 停止代理
export async function stopProxy(): Promise<void> {
  return await invoke("stop_proxy");
}

/// 重启代理
export async function restartProxy(): Promise<void> {
  return await invoke("restart_proxy");
}

/// 切换代理开关
export async function toggleProxy(): Promise<void> {
  return await invoke("toggle_proxy");
}

/// 设置代理模式
export async function setProxyMode(mode: string): Promise<void> {
  return await invoke("set_proxy_mode", { mode });
}

/// 选择节点
export async function selectProxyNode(nodeId: string): Promise<void> {
  return await invoke("select_proxy_node", { nodeId });
}

/// 获取流量统计
export async function getProxyTraffic(): Promise<[number, number]> {
  return await invoke("get_proxy_traffic");
}

/// 检查代理状态
export async function checkProxyStatus(): Promise<string> {
  return await invoke("check_proxy_status");
}

// ==================== 配置相关API ====================

/// 获取当前配置
export async function getCurrentConfig(): Promise<ConfigInfo | null> {
  return await invoke("get_current_config");
}

/// 获取所有配置列表
export async function getAllConfigs(): Promise<ConfigInfo[]> {
  return await invoke("get_all_configs");
}

/// 从本地文件导入配置
export async function importConfigFromFile(
  filePath: string,
  name: string,
): Promise<ConfigInfo> {
  return await invoke("import_config_from_file", { filePath, name });
}

/// 从订阅链接导入配置
export async function importConfigFromSubscription(
  url: string,
  name: string,
): Promise<ConfigInfo> {
  return await invoke("import_config_from_subscription", { url, name });
}

/// 更新订阅配置
export async function updateSubscription(configId: string): Promise<void> {
  return await invoke("update_subscription", { configId });
}

/// 删除配置
export async function deleteConfig(configId: string): Promise<void> {
  return await invoke("delete_config", { configId });
}

/// 导出配置
export async function exportConfig(
  configId: string,
  destPath: string,
): Promise<void> {
  return await invoke("export_config", { configId, destPath });
}

/// 读取配置文件内容
export async function readConfigContent(configId: string): Promise<string> {
  return await invoke("read_config_content", { configId });
}

/// 保存配置内容
export async function saveConfigContent(
  configId: string,
  content: string,
): Promise<void> {
  return await invoke("save_config_content", { configId, content });
}

/// 加载所有配置
export async function loadAllConfigs(): Promise<void> {
  return await invoke("load_all_configs");
}

/// 设置当前配置
export async function setCurrentConfig(config: ConfigInfo): Promise<void> {
  return await invoke("set_current_config", { config });
}

// ==================== 节点相关API ====================

/// 获取所有节点分组
export async function getNodeGroups(): Promise<NodeGroup[]> {
  return await invoke("get_node_groups");
}

/// 获取指定分组
export async function getNodeGroup(
  groupName: string,
): Promise<NodeGroup | null> {
  return await invoke("get_node_group", { groupName });
}

/// 获取所有节点
export async function getAllNodes(): Promise<NodeInfo[]> {
  return await invoke("get_all_nodes");
}

/// 获取指定节点
export async function getNode(nodeId: string): Promise<NodeInfo | null> {
  return await invoke("get_node", { nodeId });
}

/// 搜索节点
export async function searchNodes(query: string): Promise<NodeInfo[]> {
  return await invoke("search_nodes", { query });
}

/// 按延迟排序节点
export async function sortNodesByLatency(
  groupName?: string,
): Promise<NodeInfo[]> {
  return await invoke("sort_nodes_by_latency", { groupName });
}

/// 测试单个节点延迟
export async function testNodeLatency(
  nodeId: string,
): Promise<LatencyTestResult> {
  return await invoke("test_node_latency", { nodeId });
}

/// 批量测试所有节点延迟
export async function testAllNodesLatency(): Promise<LatencyTestResult[]> {
  return await invoke("test_all_nodes_latency");
}

/// 添加节点分组
export async function addNodeGroup(group: NodeGroup): Promise<void> {
  return await invoke("add_node_group", { group });
}

/// 更新节点分组
export async function updateNodeGroup(
  groupName: string,
  group: NodeGroup,
): Promise<void> {
  return await invoke("update_node_group", { groupName, group });
}

/// 删除节点分组
export async function deleteNodeGroup(groupName: string): Promise<void> {
  return await invoke("delete_node_group", { groupName });
}

// ==================== 窗口相关API ====================

/// 显示窗口
export async function showWindow(): Promise<void> {
  return await invoke("show_window");
}

/// 隐藏窗口
export async function hideWindow(): Promise<void> {
  return await invoke("hide_window");
}
