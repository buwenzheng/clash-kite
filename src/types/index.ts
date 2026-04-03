// Proxy types — matches Rust models::proxy

export type ProxyMode = "direct" | "global" | "rule";

export interface DelayHistory {
  time: string;
  delay: number;
}

export interface ProxyNode {
  name: string;
  nodeType: string;
  udp: boolean | null;
  history: DelayHistory[];
}

export interface ProxyGroup {
  name: string;
  groupType: string;
  all: string[];
  nodes: ProxyNode[];
  now: string | null;
  udp: boolean | null;
  history: DelayHistory[];
}

export interface ProxyStatus {
  running: boolean;
  mode: ProxyMode;
  httpPort: number;
  socksPort: number;
  mixedPort: number;
  activeProfile: string | null;
  systemProxy: boolean;
}

export interface TrafficData {
  up: number;
  down: number;
}

export interface DelayResult {
  name: string;
  delay: number | null;
  error: string | null;
}

// Profile types — matches Rust models::profile

export type ProfileSource = "local" | "subscription";

export interface ProfileInfo {
  id: string;
  name: string;
  source: ProfileSource;
  filePath: string;
  subscriptionUrl: string | null;
  updatedAt: string;
  isActive: boolean;
  autoUpdate: boolean;
  autoUpdateInterval: number;
}

export interface AutoUpdateResult {
  profileId: string;
  profileName: string;
  success: boolean;
  error: string | null;
  hotReloaded: boolean;
  updatedAt: string;
}

// Connection types — matches Rust models::connections

export type ConnectionState = "active" | "closed";

export interface ConnectionItem {
  id: string;
  src: string;
  dst: string;
  protocol: string;
  chains: string[];
  proxy: string;
  uploadBytes: number;
  downloadBytes: number;
  duration: number;
  state: ConnectionState;
}

// Settings types — matches Rust models::settings

export interface AppSettings {
  theme: string;
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  systemProxy: boolean;
  tunMode: boolean;
}

// Kernel types — matches Rust models::kernel
export interface KernelSettings {
  mixedPort: number; // default 7890
  httpPort: number;  // default 7892
  socksPort: number; // default 7891
}
