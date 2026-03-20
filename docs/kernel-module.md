# 内核设置模块（/kernel）

> 负责生成/应用 mihomo 内核的基础与高级配置项。与 clash-party 同类功能对齐（忽略 smart core/substore）。

---

## 1. 模块概述

`/kernel` 提供用户对 mihomo 的“内核级”配置调整能力，例如：
- 端口配置（mixed-port / socks-port / http-port）
- 日志级别（log-level）
- allow-lan（局域网访问）
- IPv6 支持
- external-controller（外部控制器）
- 高级选项（unified-delay / tcp-concurrent / find-process-mode / store-selected 等）

配置变化通常要求重启 mihomo 内核使配置生效（或调用 `POST /restart`，取决于实现策略）。

---

## 2. 数据模型（与前后端契约）

```ts
interface KernelSettings {
  ports: {
    mixedPort: number;
    socksPort: number;
    httpPort: number;
    enableHttpPort?: boolean; // 可选：按实现决定是否需要显式开关
  };
  logLevel: "silent" | "error" | "warning" | "info" | "debug";
  allowLan: boolean;
  ipv6: boolean;

  externalController: {
    enabled: boolean;
    host: string;   // 默认 127.0.0.1
    port: number;   // 默认 9090
    secret?: string | null;
  };

  advanced: {
    unifiedDelay?: boolean;
    tcpConcurrent?: boolean;
    findProcessMode?: string;
    storeSelected?: boolean;
  };
}
```

---

## 3. 页面交互设计

| 区块 | 控件 | 说明 |
| ---- | ---- | ---- |
| 端口配置 | 数字输入 + 开关 | 支持单独启用/关闭可选项 |
| 日志级别 | 单选 | 限制为 mihomo 支持枚举 |
| 局域网访问 | allow-lan 开关 + IP 列表（可选） | lan-allowed/disallowed（若实现） |
| IPv6 | 开关 | 启用/禁用 |
| 外部控制器 | host/port/secret | secret 为空表示无鉴权（或按实现约定） |
| 高级选项 | checkbox/select | 参数映射到 mihomo 的对应字段 |
| 应用/重载 | Apply 按钮 | 保存并重启内核/重载配置 |

---

## 4. 配置生成与生效策略

建议的“配置链路契约”（用于 AI 生成后端）：
1. 读取当前激活 profile 的 YAML 内容
2. 将 `KernelSettings` 注入到“最终 mihomo 配置生成器”的对应字段（general/log/api/ports 等）
3. 写入最终配置文件到 mihomo 可读取的位置
4. 若代理正在运行：
   - 方案 A：停止 -> 启动（当前实现方式）
   - 方案 B：调用 `POST /restart`（mihomo 支持）

---

## 5. 与 mihomo API 的交互（参考）

根据 mihomo API 文档：
- `POST /restart`：重启内核（可用于应用设置变更）
- `GET /configs`：读取基础配置（可用于端口显示）

> 说明：如果需要对配置文件做更复杂注入，仍以“重启内核”作为兜底。

---

## 6. Tauri Command 契约（建议新增）

### 6.1 get_kernel_settings

- 返回：`KernelSettings`

### 6.2 set_kernel_settings

- 参数：`KernelSettings`
- 行为：持久化（SQLite key 建议 `kernel_settings`）

### 6.3 apply_kernel_settings

- 行为：
  - 写入生成的最终配置片段
  - 如果 proxy 正在运行：重启/调用 restart

---

## 7. 错误处理要点

- 应用失败：返回错误并提示“是否需要管理员权限/端口被占用”
- 如果用户填写无效值（如端口越界），在保存阶段返回校验错误
- secret 配置变更后：需保证后续对 `/logs`、`/connections` 等请求的鉴权策略一致

---

## 8. mihomo 进程优先级（仅 Windows）

> 参考 clash-party 的 CPU 优先级设置功能。

### 8.1 功能说明

允许用户设置 mihomo 内核进程的 CPU 优先级，影响系统资源分配。仅 Windows 平台可用。

### 8.2 数据模型

在 `KernelSettings` 中新增字段：

```ts
interface KernelSettings {
  // ... 现有字段 ...

  processPriority: "low" | "below_normal" | "normal" | "above_normal" | "high" | "realtime";
  // 默认 "normal"
  // 仅 Windows 生效，macOS 忽略
}
```

### 8.3 页面交互

在 `/kernel` 页面的"高级选项"区块新增：

| 区块 | 控件 | 说明 |
| ---- | ---- | ---- |
| 进程优先级 | 下拉选择 | 仅 Windows 显示；选项：低 / 低于正常 / 正常 / 高于正常 / 高 / 实时 |

### 8.4 实现要点

- Windows: 使用 `SetPriorityClass` WinAPI（通过 `windows-sys` crate 或 `std::os::windows`）
- 在 mihomo 进程启动后立即设置优先级
- 持久化到 SQLite（KernelSettings 的一部分）
- macOS 下隐藏此选项（前端通过 `navigator.platform` 判断）

---

## 9. 内核版本管理

> 参考 clash-party 的多内核切换功能。

### 9.1 功能说明

内置 mihomo 内核的稳定版（stable）和预览版（alpha），用户可在 `/kernel` 页面中切换版本。切换后自动下载对应版本二进制并替换。

### 9.2 数据模型

```ts
interface CoreVersionInfo {
  currentVersion: string;           // 当前使用的版本号
  currentChannel: "stable" | "alpha";
  latestStable: string | null;      // GitHub 最新稳定版
  latestAlpha: string | null;       // GitHub 最新预览版
  downloading: boolean;             // 是否正在下载
}
```

### 9.3 页面交互

在 `/kernel` 页面新增"内核版本"区块（放在最顶部或端口配置之前）：

```
┌────────────────────────────────────────────────────┐
│ ── 内核版本 ──────────────────────────────         │
│ 当前版本       v1.19.0 (stable)                    │
│ 版本通道       [稳定版] [预览版]                     │
│ 最新版本       v1.19.1                [检查更新]    │
│ [下载并切换]                                        │
└────────────────────────────────────────────────────┘
```

### 9.4 Tauri Command 契约

#### 9.4.1 get_core_version_info

- 返回：`CoreVersionInfo`
- 行为：读取当前 mihomo 版本（执行 `mihomo -v`），读取 SQLite 中保存的通道偏好

#### 9.4.2 check_core_update

- 参数：`channel: "stable" | "alpha"`
- 返回：`{ version: string, downloadUrl: string, hasUpdate: boolean }`
- 行为：请求 GitHub Releases API

#### 9.4.3 download_and_switch_core

- 参数：`channel: "stable" | "alpha"`, `version: string`
- 行为：
  1. 停止当前 mihomo 进程
  2. 下载对应版本二进制到临时目录
  3. 替换 sidecar 目录中的 mihomo 二进制
  4. 重新启动 mihomo
  5. 更新 SQLite 中的通道和版本信息
- 返回：`CoreVersionInfo`

### 9.5 实现要点

- GitHub API：`https://api.github.com/repos/MetaCubeX/mihomo/releases`
  - stable: 非 prerelease 的最新 release
  - alpha: prerelease 为 true 的最新 release
- 下载 asset 匹配逻辑：按平台和架构选取（与 prepare.mjs 相同的逻辑）
- 替换前备份当前二进制，切换失败可回滚
- 下载进度通过 Tauri event 推送给前端（`core:download-progress`）

---

## 10. 实现任务分解

1. KernelSettings 模型 + SQLite 存储
2. 最终 mihomo 配置生成器接入（ports/log/api/advanced 注入）
3. Tauri commands：get/set/apply
4. 前端 `/kernel` 页面：表单联动 + Apply 按钮 + 状态提示
5. 进程优先级设置（Windows WinAPI，启动后设置）
6. 内核版本管理：CoreVersionInfo 模型、GitHub API 集成、下载/替换/回滚
7. 前端 `/kernel` 页面：版本区块 + 通道切换 + 下载进度

