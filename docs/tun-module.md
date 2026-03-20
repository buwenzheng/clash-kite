# TUN 虚拟网卡模块（/tun）

> 参考 clash-party 思路：提供虚拟网卡（tun）配置能力，并处理 Windows 管理员权限 / 防火墙重置与 macOS/Linux 授权行为。忽略 smart core 与 substore。

---

## 1. 模块概述

`/tun` 负责配置并启用 mihomo 的 `tun` 功能，使系统网络流量通过虚拟网卡接管并交由规则匹配后由 mihomo 决策转发。

该页面不仅负责“写入 tun 配置”，还负责：
- 权限/授权引导（尤其是 Windows 管理员权限）
- 必要时的“重置防火墙规则 / 授权内核二进制”
- 应用配置后重新启动/重载 mihomo 内核（确保配置生效）

---

## 2. 数据模型（与前后端契约）

### 2.1 TunStack

```rust
pub enum TunStack {
    Mixed,  // stack: mixed（推荐）
    System, // stack: system
    Gvisor, // stack: gvisor
}
```

### 2.2 TunConfig

```rust
pub struct TunConfig {
    pub enable: bool,
    pub stack: TunStack,
    pub device: String, // macOS: utun1500；Windows: Mihomo（按实现约定）

    pub dns_hijack: Vec<String>, // 默认 ["any:53"]
    pub auto_route: bool,         // 默认 true
    pub strict_route: bool,       // 默认 false
    pub mtu: u32,                 // 默认 1500

    pub route_exclude_address: Vec<String>,

    // 可选（按你希望的 parity 策略）
    pub auto_detect_interface: bool, // 默认 true
    // Linux 可选项：auto-redirect
}
```

---

## 3. 页面交互设计

### 3.1 页面控件

| 区块 | 控件 | 说明 |
| ---- | ---- | ---- |
| 总开关 | enable | 打开/关闭 TUN |
| 网络栈 | stack (mixed/system/gvisor) | 切换 tun stack |
| 设备名 | device | 设备标识 |
| DNS 劫持 | dns_hijack | 输入每条 CIDR/端口规则（默认 any:53） |
| 路由 | auto_route / strict_route / route_exclude_address | 路由相关策略 |
| MTU | mtu | MTU 值 |
| 权限管理 | 授权/重置按钮 | 与平台绑定（见 4） |

---

## 4. 权限与授权（关键）

### 4.1 Windows

- 需要管理员权限才能创建/操作 tun 接口。
- 提供“权限提升引导 UI”（若无权限，提示用户以管理员方式重启应用或执行授权流程）。
- 防火墙重置：
  - 提供按钮触发（重置 tun 相关防火墙规则）

### 4.2 macOS

- 通过 `chown root:admin` + `chmod +sx` 为 tun 相关内核/辅助二进制提供执行权限（按实现）。

### 4.3 运行时权限丢失检测

- mihomo tun 配置生效失败时，核心可能输出类似：
  - `configure tun interface: operation not permitted`
- 当检测到该错误信号：
  - 自动将 `/tun` 页面状态更新为 enable=false（或标记 enable=false 且保留用户意图）
  - 通知前端展示错误原因

---

## 5. mihomo 配置生成与重载

### 5.1 配置片段（示例）

```yaml
tun:
  enable: true
  stack: mixed
  device: utun1500
  dns-hijack:
    - any:53
  auto-route: true
  auto-detect-interface: true
  strict-route: false
  mtu: 1500
  route-exclude-address: []
```

### 5.2 生效策略

- 在应用层面，`TunConfig` 应参与“最终 mihomo 配置生成链路”
- 配置变更后，如果代理正在运行：
  - 需要触发 mihomo 内核重启（或按你实现的 reload 方案）

---

## 6. 存储策略

- 建议 SQLite key：`tun_config`（JSON 序列化）
- 如果需要将用户“意图 enable=true”与“实际 enable=false（因无权限）”区分：
  - 建议在 TunConfig 中加入额外状态字段（例如 `effective_enable` 或 `last_error`），也可单独持久化。

---

## 7. Tauri Command 契约（建议新增）

### 7.1 get_tun_config

- 返回：`TunConfig`

### 7.2 set_tun_config

- 参数：`TunConfig`
- 行为：
  - 写入 SQLite
  - 若 mihomo 正在运行：尝试重载/重启以应用新配置

### 7.3 reset_tun_firewall_windows（可选）

- 仅 Windows 用于重置防火墙规则

---

## 8. 错误处理要点

- 无权限：返回错误并在前端展示“如何授权”的提示。
- 配置不合法（字段缺失/类型错误）：返回参数校验错误。
- 重载失败：返回错误并保留前端可恢复状态。

---

## 9. 实现任务分解（用于后续代码生成）

1. 数据模型：`TunConfig`、`TunStack`
2. SQLite 存储：`tun_config`
3. 配置生成：将 `TunConfig` 注入到最终 mihomo 配置（与 profile/override 的合并顺序需明确）
4. 权限流程：
   - Windows：管理员权限引导 + firewall reset
   - macOS：授权 chmod/chown
5. Tauri Commands：`get_tun_config` / `set_tun_config`（/ 可选 reset）
6. 前端 `/tun` 页面：表单联动 + 保存/应用 + 权限状态展示

