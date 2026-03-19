/// 代理模式
export type ProxyMode = "direct" | "global" | "rule";

/// 代理状态
export type ProxyStatus = "stopped" | "running" | "error";

/// 代理配置
export interface ProxyConfig {
  enabled: boolean;
  mode: ProxyMode;
  selectedNode: string | null;
  socksPort: number;
  httpPort: number;
  mixedPort: number;
  allowLan: boolean;
}

/// 代理信息
export interface ProxyInfo {
  status: ProxyStatus;
  config: ProxyConfig;
  startedAt: string | null;
  upload: number;
  download: number;
}

/// 节点类型
export type NodeType =
  | "SS"
  | "SSR"
  | "VMess"
  | "Trojan"
  | "Hysteria"
  | "Hysteria2"
  | "WireGuard"
  | "VLESS"
  | "Tuic"
  | "Unknown";

/// 节点信息
export interface NodeInfo {
  id: string;
  name: string;
  nodeType: NodeType;
  server: string;
  port: number;
  latency: number | null;
  available: boolean;
  group: string | null;
  countryCode: string | null;
  extra: any;
}

/// 节点分组
export interface NodeGroup {
  name: string;
  nodeType: NodeType | null;
  nodes: NodeInfo[];
  selectedNode: string | null;
}

/// 测速结果
export interface LatencyTestResult {
  nodeId: string;
  latency: number | null;
  testedAt: string;
  success: boolean;
  error: string | null;
}

/// 配置来源类型
export type ConfigSource = "LocalFile" | "Subscription";

/// 配置信息
export interface ConfigInfo {
  id: string;
  name: string;
  source: ConfigSource;
  filePath: string;
  subscriptionUrl: string | null;
  updatedAt: string;
  enabled: boolean;
}

/// 应用设置
export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: "zh-CN" | "en-US";
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  systemProxy: boolean;
  tunMode: boolean;
}
