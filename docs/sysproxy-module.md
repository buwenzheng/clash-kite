# 系统代理模块（/sysproxy）

> 参考 clash-party 的实现思路：支持 manual（手动）与 auto（PAC）两类模式；支持绕过列表与 PAC 脚本编辑。忽略 smart core 与 substore。

---

## 1. 模块概述

`/sysproxy` 负责配置“操作系统层面的代理规则”，并将请求转发到正在运行的 mihomo 内核端口（通常使用 `mixed-port`）。

系统代理配置包含两部分：
- 外部“是否启用系统代理 / 使用何种模式（manual 或 PAC）”
- 模式相关的细节（绕过列表、PAC 脚本等）

---

## 2. 数据模型（与前后端契约）

### 2.1 SysProxyMode

```rust
// 前端可用字符串： "manual" | "auto"
pub enum SysProxyMode {
    Manual,
    Auto, // PAC
}
```

### 2.2 SysProxyAdvancedConfig

```rust
pub struct SysProxyAdvancedConfig {
    pub enable: bool,               // 系统代理开关（独立于代理运行状态）
    pub mode: SysProxyMode,        // manual | auto
    pub host: String,              // 默认 "127.0.0.1"（本地 PAC/代理服务器地址）
    pub bypass: Vec<String>,      // 绕过列表（域名/IP/CIDR，平台能力决定最终落地方式）
    pub pac_script: Option<String>// 仅 mode=Auto 时生效；PAC 脚本文本
}
```

### 2.3 默认值建议

- `enable`: false
- `mode`: manual
- `host`: "127.0.0.1"
- `bypass`: 平台默认绕过（见 3.4）
- `pac_script`: 使用内置默认 PAC（当用户未提供脚本时）

---

## 3. 页面交互设计

### 3.1 页面布局（核心控件）

| 区块 | 控件 | 说明 |
| ---- | ---- | ---- |
| 系统代理总开关 | Switch | enable：启用/禁用系统代理 |
| 代理模式 | Radio/Tabs | manual / auto（PAC） |
| 代理主机 | Input | host：默认 127.0.0.1（实际端口来自 mihomo mixed-port） |
| 绕过列表 | TextArea + 行项目 | bypass：每行一个规则；提供“添加默认绕过” |
| PAC 脚本编辑 | Editor（仅 auto 模式显示） | pac_script；支持 `%mixed-port%` 占位符 |
| 平台辅助工具 | Button（Windows 专属） | UWP 回环解锁（可选，见 3.6） |

### 3.2 PAC 脚本占位符

- 内置约定：`%mixed-port%` 会在生成为 PAC 结果时替换为 mihomo 的 `mixed-port`。
- 默认 PAC 行为示例：

```javascript
function FindProxyForURL(url, host) {
  return "PROXY 127.0.0.1:%mixed-port%; DIRECT";
}
```

（bypass 最终落地方式取决于平台实现；若平台无法直接承载 bypass，则可通过 PAC 逻辑实现绕过。）

### 3.3 运行态限制与提示

- 当 `mihomo` 未运行时：
  - 允许保存配置，但“应用到系统代理”需要等待代理就绪（或禁用按钮并提示）。
- 当用户修改配置且已启用 enable：
  - 需要重新应用系统代理（必要时重建 PAC 服务/刷新系统代理）。

---

## 4. 与 mihomo 的交互

### 4.1 读取端口

系统代理的目标端口应来自运行中的 mihomo：
- `GET /configs` 读取 `mixed-port`（如果没有则回退到其他端口策略，按项目约定）

### 4.2 PAC 服务

在 PAC 模式下，客户端需要一个本地 PAC URL：
- 本地 HTTP 服务地址：`http://{host}:{pac_port}/proxy.pac`
- pac_port：
  - clash-party 思路：从一个范围开始探测空闲端口
  - 本项目可先选定固定端口（例如 10000+），避免探测复杂度

---

## 5. 平台差异（忽略 smart core/substore）

### 5.1 Windows

- 应用系统代理通过 Windows 注册表 / WinInet 通知实现（当前项目已有基础能力：`sysproxy::set_system_proxy`）
- 如需 bypass 与 PAC：
  - 可引入 sysproxy-rs 或等价方式，以支持绕过列表与 PAC 的平台能力
- UWP 回环解锁：
  - 提供按钮触发平台工具（如果你的实现选择沿用 clash-party 的 enableLoopback 思路）

### 5.2 macOS

- 通过 `networksetup` 配置 Web/Secure Web/SOCKS 代理
- PAC 模式：
  - 可由本项目托管 PAC HTTP 服务并让系统指向 PAC URL
- 如需要更高权限（仅在你实现要求时才触发）：
  - 参考 clash-party：helper 服务 + 提权后写入配置

---

## 6. 存储策略

- `SysProxyAdvancedConfig` 建议独立存储（不要塞到 `AppSettings` 的简单开关里）
- SQLite key 建议：
  - `sysproxy_config`（JSON 序列化）

---

## 7. Tauri Command 契约（建议新增）

> 当前代码库只有 `set_system_proxy(enable)` 的开关级能力；要完成 `/sysproxy` 页面，需要新增“高级配置 + 应用”接口。

### 7.1 get_sysproxy_advanced_config

- 返回：`SysProxyAdvancedConfig`
- 存储读取：SQLite key `sysproxy_config`

### 7.2 set_sysproxy_advanced_config

- 参数：`SysProxyAdvancedConfig`
- 行为：
  - 写入 SQLite
  - 若 `config.enable == true` 且 mihomo 正在运行：立即应用
  - 若 `config.enable == true` 但 mihomo 未运行：仅保存，等待用户“启动代理”后按保存值应用（或提示用户启动后应用）

### 7.3 reset_sysproxy_advanced_defaults

- 行为：恢复默认绕过与默认 PAC 脚本策略，并应用（同上）

---

## 8. 错误处理要点

- 系统代理应用失败（权限/系统限制）：
  - 返回错误 `Result<T, String>` 并在前端通过 toast/dialog 提示
- PAC 服务端口冲突：
  - 需要重试选择端口或返回明确错误
- mixed-port 获取失败：
  - 返回错误并提示用户先启动 mihomo

---

## 9. 实现任务分解（用于后续代码生成）

1. 新建 `models/sysproxy.rs`（或放入 settings 配套模块）
2. 新建 `services/sysproxy.rs`（读写 SQLite + 应用策略）
3. 新增 Tauri Commands：`get_sysproxy_advanced_config` / `set_sysproxy_advanced_config` / `reset_sysproxy_advanced_defaults`
4. 实现 PAC 托管（仅 auto 模式启用）
5. 平台落地：
   - Windows：扩展/替换当前 sysproxy::set_system_proxy 使其支持 bypass 与 PAC（或在 PAC 中实现绕过）
   - macOS：配置系统指向 PAC URL
6. 前端 `/sysproxy` 页面：表单联动 + 保存/应用 + 状态展示

