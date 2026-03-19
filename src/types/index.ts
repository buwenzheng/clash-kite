// Proxy types — matches Rust models::proxy

export type ProxyMode = "direct" | "global" | "rule";

export interface DelayHistory {
  time: string;
  delay: number;
}

export interface ProxyGroup {
  name: string;
  groupType: string;
  all: string[];
  now: string | null;
  udp: boolean | null;
  history: DelayHistory[];
}

export interface ProxyNode {
  name: string;
  nodeType: string;
  udp: boolean | null;
  alive: boolean | null;
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
