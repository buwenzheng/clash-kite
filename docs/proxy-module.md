# 代理模块详细设计

## 1. 模块概述

代理模块是 Clash-Kite 的核心功能模块，负责 mihomo 进程的生命周期管理、代理状态维护、节点操作和系统代理集成。

**涉及文件：**

| 层级     | 文件                              | 职责               |
| -------- | --------------------------------- | ------------------ |
| 前端页面 | `src/pages/Dashboard.tsx`         | 状态总览、模式切换 |
| 前端页面 | `src/pages/Nodes.tsx`             | 节点列表、搜索、测速 |
| 前端布局 | `src/components/Layout.tsx`       | 代理开关、流量、系统代理 |
| Store    | `src/store/proxy.ts`              | useProxyStore      |
| API      | `src/api/index.ts`                | 11 个代理相关函数  |
| 命令层   | `src-tauri/src/commands/proxy.rs` | 11 个 Tauri Command |
| 服务层   | `src-tauri/src/services/proxy.rs` | ProxyService       |
| 核心层   | `src-tauri/src/core/mihomo.rs`    | MihomoManager      |
| 核心层   | `src-tauri/src/core/mihomo_api.rs`| MihomoApi          |
| 核心层   | `src-tauri/src/core/sysproxy.rs`  | 系统代理           |
| 模型     | `src-tauri/src/models/proxy.rs`   | 数据结构           |

---

## 2. 数据模型

### 2.1 ProxyStatus（代理状态）

```rust
pub struct ProxyStatus {
    pub running: bool,           // mihomo 进程是否运行中
    pub mode: ProxyMode,         // 当前代理模式
    pub http_port: u16,          // HTTP 代理端口
    pub socks_port: u16,         // SOCKS5 代理端口
    pub mixed_port: u16,         // 混合代理端口
    pub active_profile: Option<String>,  // 当前激活配置名称
    pub system_proxy: bool,      // 系统代理是否启用
}
```

默认值：`running=false, mode=Rule, http_port=7890, socks_port=7891, mixed_port=7892`

### 2.2 ProxyMode（代理模式）

```rust
pub enum ProxyMode {
    Direct,   // 直连模式：所有流量直连
    Global,   // 全局模式：所有流量走代理
    Rule,     // 规则模式：按规则分流（默认）
}
```

### 2.3 ProxyGroup（代理组）

```rust
pub struct ProxyGroup {
    pub name: String,             // 组名
    pub group_type: String,       // Selector / URLTest / Fallback / LoadBalance / Relay
    pub all: Vec<String>,         // 组内所有节点名称
    pub now: Option<String>,      // 当前选中的节点
    pub udp: Option<bool>,        // 是否支持 UDP
    pub history: Vec<DelayHistory>, // 延迟历史
}
```

### 2.4 TrafficData / DelayResult

```rust
pub struct TrafficData { pub up: u64, pub down: u64 }
pub struct DelayResult { pub name: String, pub delay: Option<u32>, pub error: Option<String> }
```

---

## 3. mihomo 进程管理

### 3.1 MihomoManager

MihomoManager 负责 mihomo 子进程的完整生命周期：

```
                    ┌─────────┐
                    │  Idle   │
                    └────┬────┘
                         │ start(config_path)
                         ▼
                    ┌─────────┐
              ┌─────│ Starting │
              │     └────┬────┘
              │          │ wait_ready() 轮询 /version
              │          │ (每 250ms，最多 10s)
              │          ▼
              │     ┌─────────┐
              │     │ Running │◄───── restart()
              │     └────┬────┘       (stop → 300ms delay → start)
              │          │ stop()
              │          ▼
              │     ┌─────────┐
              └─────│ Stopped │
                    └─────────┘
                         │ Drop trait
                         ▼
                    kill() 确保进程退出
```

### 3.2 启动流程时序图

```
Frontend          ProxyService       MihomoManager       mihomo Process     mihomo API
   │                   │                   │                   │                │
   │ toggleProxy()     │                   │                   │                │
   │──────────────────►│                   │                   │                │
   │                   │ start(config)     │                   │                │
   │                   │──────────────────►│                   │                │
   │                   │                   │ kill old process  │                │
   │                   │                   │──────────────────►│                │
   │                   │                   │                   │                │
   │                   │                   │ spawn(mihomo -f config             │
   │                   │                   │        -ext-ctl 127.0.0.1:9090    │
   │                   │                   │        -d data_dir)               │
   │                   │                   │──────────────────►│                │
   │                   │                   │                   │ ─ starting ──► │
   │                   │                   │                   │                │
   │                   │                   │ wait_ready loop:  │                │
   │                   │                   │ GET /version      │                │
   │                   │                   │────────────────────────────────────►│
   │                   │                   │                   │   200 OK       │
   │                   │                   │◄────────────────────────────────────│
   │                   │                   │                   │                │
   │                   │ get_configs()     │                   │                │
   │                   │──────────────────►│                   │                │
   │                   │                   │ GET /configs      │                │
   │                   │                   │────────────────────────────────────►│
   │                   │                   │ {mode, port, ...} │                │
   │                   │                   │◄────────────────────────────────────│
   │                   │                   │                   │                │
   │                   │ update status     │                   │                │
   │                   │ (running=true,    │                   │                │
   │                   │  ports, mode)     │                   │                │
   │  ProxyStatus      │                   │                   │                │
   │◄──────────────────│                   │                   │                │
```

### 3.3 进程启动参数

```bash
mihomo -f <config_path> -ext-ctl 127.0.0.1:9090 -d <data_dir>
```

| 参数       | 说明                           |
| ---------- | ------------------------------ |
| `-f`       | 配置文件路径（YAML）           |
| `-ext-ctl` | 外部控制 API 监听地址          |
| `-d`       | 数据目录（GeoIP 文件所在目录） |

stdout 和 stderr 重定向到 `~/.config/clash-kite/mihomo.log`。

### 3.4 健康检查

启动后通过轮询 `GET /version` 检测 API 就绪：
- 间隔：250ms
- 超时：10 秒（40 次尝试）
- 每次轮询同时检测子进程是否已退出
- 失败时读取 mihomo.log 最后 20 行作为错误信息

### 3.5 进程清理

- `stop()`: 调用 `child.kill()` + `child.wait()`
- `Drop trait`: MihomoManager 被销毁时确保 kill 子进程
- 停止前自动取消系统代理

---

## 4. mihomo API 客户端

MihomoApi 通过 HTTP 与 mihomo 进程通信（`http://127.0.0.1:9090`）：

| 方法           | HTTP 请求                          | 用途             |
| -------------- | ---------------------------------- | ---------------- |
| check_health   | `GET /version`                     | 健康检查         |
| get_proxies    | `GET /proxies`                     | 获取所有代理组   |
| select_proxy   | `PUT /proxies/{group}`             | 选择节点         |
| test_delay     | `GET /proxies/{name}/delay?timeout=5000&url=...` | 测速 |
| get_configs    | `GET /configs`                     | 获取当前配置     |
| set_mode       | `PATCH /configs`                   | 切换代理模式     |
| get_traffic    | `GET /traffic`                     | 获取实时流量     |

**reqwest 客户端配置：** 超时 5 秒。

### 4.1 代理组解析逻辑

从 `GET /proxies` 返回的原始数据中筛选代理组：

```
过滤条件：type ∈ {Selector, URLTest, Fallback, LoadBalance, Relay}
排序规则：GLOBAL 排在最前，其余按名称字母序
前端过滤：排除 GLOBAL, DIRECT, REJECT 组（在 Nodes.tsx 中）
```

---

## 5. 代理状态机

### 5.1 ProxyService 状态

ProxyService 通过 `Arc<RwLock<ProxyStatus>>` 维护运行时状态：

```
                           ┌──────────────────┐
                           │   Not Running    │
                           │  running = false │
                           │  system_proxy=F  │
                           └────────┬─────────┘
                                    │
                        start() / toggleProxy()
                                    │
                                    ▼
                           ┌──────────────────┐
                     ┌────►│    Running        │◄────┐
                     │     │  running = true   │     │
                     │     │  mode = Rule/...  │     │
                     │     │  ports = mihomo   │     │
                     │     └──┬──────┬─────┬───┘     │
                     │        │      │     │         │
               setMode()     │  setSystemProxy()    │
               selectProxy() │      │     restart()
               testDelay()   │      │         │
                     │        │      ▼         │
                     │        │  ┌─────────┐   │
                     │        │  │ Running  │   │
                     └────────┘  │ +SysProxy│───┘
                                 └─────┬────┘
                                       │
                            stop() / toggleProxy()
                            (先取消系统代理)
                                       │
                                       ▼
                           ┌──────────────────┐
                           │   Not Running    │
                           └──────────────────┘
```

### 5.2 端口解析优先级

系统代理使用的端口按以下优先级解析：

```
mixed_port > 0 → 使用 mixed_port
http_port > 0  → 使用 http_port
fallback       → 7890
```

---

## 6. 系统代理实现

### 6.1 Windows

通过修改注册表实现：

```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Internet Settings
├── ProxyEnable: DWORD (1=启用, 0=禁用)
└── ProxyServer: STRING ("127.0.0.1:{port}")
```

修改后调用 `InternetSetOptionW` 通知系统刷新：
- `INTERNET_OPTION_SETTINGS_CHANGED` (39)
- `INTERNET_OPTION_REFRESH` (37)

### 6.2 macOS

通过 `networksetup` 命令行工具，操作 Wi-Fi 网络服务：

**启用：**
```bash
networksetup -setwebproxy Wi-Fi 127.0.0.1 {port}
networksetup -setsecurewebproxy Wi-Fi 127.0.0.1 {port}
networksetup -setsocksfirewallproxy Wi-Fi 127.0.0.1 {port}
networksetup -setwebproxystate Wi-Fi on
networksetup -setsecurewebproxystate Wi-Fi on
networksetup -setsocksfirewallproxystate Wi-Fi on
```

**禁用：**
```bash
networksetup -setwebproxystate Wi-Fi off
networksetup -setsecurewebproxystate Wi-Fi off
networksetup -setsocksfirewallproxystate Wi-Fi off
```

### 6.3 其他平台

返回错误：`"System proxy not supported on this platform"`

### 6.4 安全保障

- 代理停止时自动取消系统代理
- 系统代理开关仅在代理运行时可用（前端 disabled 控制）

---

## 7. 流量监控

### 7.1 实现方式

- Layout 组件中使用 `setInterval` 每 2 秒轮询
- 调用链：`fetchTraffic() → invoke("get_traffic") → MihomoApi.get_traffic() → GET /traffic`
- 返回 `{ up: u64, down: u64 }`（单位：字节/秒）

### 7.2 前端格式化

```
formatSpeed(bytes):
  0        → "0 B/s"
  < 1024   → "xxx B/s"
  < 1024²  → "xxx KB/s"
  < 1024³  → "xxx MB/s"
  else     → "xxx GB/s"
```

### 7.3 生命周期

- 代理未运行：不启动轮询，显示 0
- 代理启动：立即轮询一次，然后每 2s 一次
- 代理停止：清除定时器，重置为 0

---

## 8. 节点管理

### 8.1 数据模型变更

当前 `ProxyGroup.all` 仅存储节点名称字符串，丢失了 mihomo 返回的节点类型和延迟历史。需要引入 `ProxyNode` 结构。

#### 8.1.1 新增 ProxyNode 数据模型

**Rust 端（models/proxy.rs）：**

```rust
pub struct ProxyNode {
    pub name: String,
    pub node_type: String,       // "Shadowsocks" | "VMess" | "Trojan" | "Hysteria2" | "VLESS" | ...
    pub udp: Option<bool>,
    pub history: Vec<DelayHistory>,
}
```

**ProxyGroup 变更：**

```rust
pub struct ProxyGroup {
    pub name: String,
    pub group_type: String,
    pub all: Vec<String>,        // 保留原始节点名列表（排序用）
    pub nodes: Vec<ProxyNode>,   // 新增：每个节点的详细信息
    pub now: Option<String>,
    pub udp: Option<bool>,
    pub history: Vec<DelayHistory>,
}
```

**TypeScript 端（types/index.ts）：**

```typescript
interface ProxyNode {
  name: string;
  nodeType: string;
  udp: boolean | null;
  history: DelayHistory[];
}

interface ProxyGroup {
  name: string;
  groupType: string;
  all: string[];
  nodes: ProxyNode[];           // 新增
  now: string | null;
  udp: boolean | null;
  history: DelayHistory[];
}
```

#### 8.1.2 mihomo API 解析变更

`MihomoApi::get_proxies()` 需要在遍历代理组时，同时查找每个组内节点的详细信息：

```
GET /proxies → resp.proxies (HashMap<String, RawProxy>)
  → 遍历 group_types 筛选代理组
    → 遍历 group.all 中的每个节点名
      → 在 resp.proxies 中查找该节点 → 提取 type、udp、history
      → 构造 ProxyNode { name, node_type, udp, history }
    → ProxyGroup { ..., nodes: Vec<ProxyNode> }
```

mihomo `GET /proxies` 返回的每个代理节点结构：

```json
{
  "节点名称": {
    "type": "Shadowsocks",     // 协议类型
    "udp": true,
    "history": [
      { "time": "2026-03-20T10:00:00Z", "delay": 120 }
    ],
    "alive": true,
    "all": [],                 // 非组节点此字段为空
    "now": ""
  }
}
```

### 8.2 延迟实时显示

**当前问题**：节点卡片固定显示 `--`，不展示实际延迟。

**解决方案**：从 `ProxyNode.history` 取最新一条记录的 delay 值。

```
getLatestDelay(node: ProxyNode):
  history = node.history
  if history.length === 0 → null (未测速)
  last = history[history.length - 1]
  if last.delay === 0 → "timeout" (超时)
  else → last.delay (毫秒数)
```

### 8.3 延迟颜色编码

根据延迟值分级着色，提供直观的节点质量感知：

| 延迟范围    | 颜色等级 | CSS 类名                | 语义   |
| ----------- | -------- | ----------------------- | ------ |
| 未测速      | 灰色     | `text-muted-foreground` | 未知   |
| < 200ms     | 绿色     | `text-green-500`        | 优秀   |
| 200ms–500ms | 黄色     | `text-yellow-500`       | 一般   |
| ≥ 500ms     | 橙色     | `text-orange-500`       | 较差   |
| 超时(0)     | 红色     | `text-red-500`          | 不可用 |

**前端实现函数：**

```typescript
function getDelayColor(node: ProxyNode): string {
  const delay = getLatestDelay(node);
  if (delay === null) return "text-muted-foreground";
  if (delay === 0) return "text-red-500";
  if (delay < 200) return "text-green-500";
  if (delay < 500) return "text-yellow-500";
  return "text-orange-500";
}

function getDelayText(node: ProxyNode): string {
  const delay = getLatestDelay(node);
  if (delay === null) return "--";
  if (delay === 0) return "timeout";
  return `${delay}ms`;
}
```

### 8.4 节点排序

支持三种排序模式，用户可通过工具栏按钮循环切换：

| 排序模式  | 排序逻辑                                           | 图标         |
| --------- | -------------------------------------------------- | ------------ |
| `default` | 保持 mihomo 返回的原始顺序（all 数组顺序）          | `ArrowUpDown` |
| `delay`   | 按最新延迟升序，未测速/超时排末尾                   | `Clock`       |
| `name`    | 按节点名称 `localeCompare` 字母升序                 | `ArrowDownAZ` |

**排序算法（delay 模式）：**

```typescript
function sortByDelay(nodes: ProxyNode[]): ProxyNode[] {
  return [...nodes].sort((a, b) => {
    const da = getLatestDelay(a);
    const db = getLatestDelay(b);
    // 未测速排末尾
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    // 超时排末尾（delay === 0 表示超时）
    if (da === 0 && db === 0) return 0;
    if (da === 0) return 1;
    if (db === 0) return -1;
    return da - db;
  });
}
```

**排序状态管理**：排序模式存储在组件的 `useState` 中，所有分组共用同一排序模式。

### 8.5 节点类型显示

在节点卡片中展示协议类型标签，帮助用户区分不同代理协议。

**类型映射与缩写：**

| mihomo type    | 显示缩写 | 说明         |
| -------------- | -------- | ------------ |
| Shadowsocks    | SS       | Shadowsocks  |
| ShadowsocksR   | SSR      | ShadowsocksR |
| VMess          | VMess    | V2Ray VMess  |
| VLESS          | VLESS    | V2Ray VLESS  |
| Trojan         | Trojan   | Trojan       |
| Hysteria       | Hy       | Hysteria     |
| Hysteria2      | Hy2      | Hysteria2    |
| WireGuard      | WG       | WireGuard    |
| Tuic           | TUIC     | TUIC         |
| Ssh            | SSH      | SSH          |
| Http           | HTTP     | HTTP 代理    |
| Socks5         | SOCKS5   | SOCKS5 代理  |
| Direct         | DIRECT   | 直连         |
| Reject         | REJECT   | 拒绝         |
| 其他           | 原始值   | 未知类型     |

**前端实现：**

```typescript
function getNodeTypeLabel(nodeType: string): string {
  const map: Record<string, string> = {
    Shadowsocks: "SS", ShadowsocksR: "SSR",
    VMess: "VMess", VLESS: "VLESS", Trojan: "Trojan",
    Hysteria: "Hy", Hysteria2: "Hy2",
    WireGuard: "WG", Tuic: "TUIC", Ssh: "SSH",
    Http: "HTTP", Socks5: "SOCKS5",
    Direct: "DIRECT", Reject: "REJECT",
  };
  return map[nodeType] ?? nodeType;
}
```

节点类型以 `Badge` 组件呈现在节点名称右侧或下方，使用 `variant="secondary"` 和较小字号。

### 8.6 测速并发控制

**当前问题**：批量测速使用 `Promise.allSettled` 并行测试所有节点，可能导致：
- 大量并发请求造成网络拥堵
- mihomo API 负载过高
- 延迟结果不准确

**解决方案**：实现前端并发限制器（concurrency limiter）。

```typescript
async function testDelayWithConcurrency(
  nodes: string[],
  concurrency: number = 50,
  testFn: (name: string) => Promise<void>,
): Promise<void> {
  let index = 0;

  async function worker() {
    while (index < nodes.length) {
      const current = index++;
      await testFn(nodes[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, nodes.length) },
    () => worker(),
  );
  await Promise.allSettled(workers);
}
```

**并发数配置**：默认 50，可在设置中调整（`AppSettings.delayTestConcurrency`，P1）。

**调用链变更：**

```
handleTestGroupAll(groupNodes)
  → testDelayWithConcurrency(groupNodes, 50, testDelay)
  → 最多 50 个节点同时测速
  → 逐个完成后 worker 取下一个
```

### 8.7 节点选择

```
用户点击节点
  → selectProxy(groupName, nodeName)
    → PUT /proxies/{group} { name: nodeName }
      → mihomo 切换该组的当前节点
    → fetchGroups() 刷新组列表
```

### 8.8 节点搜索

全局搜索框，输入关键字后对所有分组的节点名进行不区分大小写的模糊过滤：

```
getFilteredNodes(nodes: ProxyNode[], query: string):
  if query is empty → return all nodes
  return nodes.filter(n =>
    n.name.toLowerCase().includes(query.toLowerCase())
  )
```

---

## 9. 节点管理 — P1 增强功能

### 9.1 展示模式切换

支持两种展示模式，用户可通过工具栏按钮切换：

**简洁模式（Simple）— 默认：**
```
┌──────────────────────────┐
│ 节点名称               ✓ │
│ [120ms]           [测速] │
└──────────────────────────┘
```

**详细模式（Full）：**
```
┌──────────────────────────┐
│ 节点名称               ✓ │
│ [SS] [UDP]               │
│ [120ms]           [测速] │
└──────────────────────────┘
```

差异点：
- 详细模式额外显示协议类型 Badge 和 UDP 支持标识
- 详细模式节点卡片高度略增

状态管理：`displayMode: "simple" | "full"` 存储在 `localStorage`，页面刷新后保持。

### 9.2 虚拟列表

当节点数量较大时（如 100+ 节点），使用虚拟列表优化渲染性能。

**技术选型**：`@tanstack/react-virtual`（轻量、React 19 兼容）

**实现策略：**
- 每个代理组内部使用虚拟网格（virtual grid）
- 仅渲染视口内可见的节点卡片
- 节点卡片固定高度（simple: 64px, full: 88px）

**触发阈值**：
- 组内节点 ≤ 50：直接渲染（无需虚拟化）
- 组内节点 > 50：启用虚拟列表

### 9.3 折叠状态持久化

当前分组折叠状态存储在 React `useState`，页面导航后丢失。

**解决方案**：将折叠状态持久化到 `localStorage`。

```typescript
const STORAGE_KEY = "clash-kite-node-collapsed";

function loadCollapsed(): Set<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
}

function saveCollapsed(collapsed: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
}
```

在 `toggleCollapse` 中同步调用 `saveCollapsed`，组件初始化时通过 `loadCollapsed` 恢复。

---

## 10. 节点管理 — 实现任务分解

### 10.1 P0 任务（必须实现）

| # | 任务                     | 涉及文件                                   | 估时  |
|---|--------------------------|-------------------------------------------|-------|
| 1 | 新增 ProxyNode Rust 模型  | `models/proxy.rs`                          | 0.5h  |
| 2 | 修改 mihomo API 解析逻辑  | `core/mihomo_api.rs`                       | 1h    |
| 3 | 新增 ProxyNode TS 类型    | `types/index.ts`                           | 0.5h  |
| 4 | 延迟显示与颜色编码        | `pages/Nodes.tsx`                          | 1h    |
| 5 | 节点排序（3 模式切换）     | `pages/Nodes.tsx`                          | 1h    |
| 6 | 节点类型显示              | `pages/Nodes.tsx`                          | 0.5h  |
| 7 | 测速并发控制              | `pages/Nodes.tsx` 或提取 `utils/concurrency.ts` | 1h    |
| 8 | 前端 i18n 键值补充        | `locales/en.json`, `locales/zh.json`       | 0.5h  |

### 10.2 P1 任务（重要但可稍后）

| # | 任务                | 涉及文件                                   | 估时  |
|---|---------------------|-------------------------------------------|-------|
| 9 | 展示模式切换         | `pages/Nodes.tsx`                          | 1h    |
| 10| 虚拟列表性能优化     | `pages/Nodes.tsx`, `package.json`          | 2h    |
| 11| 折叠状态持久化       | `pages/Nodes.tsx`                          | 0.5h  |

**总估时**：P0 约 6h，P1 约 3.5h

---

## 11. 错误处理

### 11.1 mihomo 启动失败

```
start() 可能的错误：
├── 二进制不存在 → "Failed to start mihomo at {path}. Does the binary exist?"
├── 进程启动后异常退出 → "mihomo exited with {status} during startup.\n{log_tail}"
├── API 10s 内未就绪 → "mihomo failed to start: API did not become ready within 10s"
└── 配置文件格式错误 → mihomo 进程退出，日志中包含解析错误
```

### 11.2 节点操作失败

- 测速失败：返回 `DelayResult { delay: None, error: Some(msg) }`，不影响其他节点
- 选择失败：通过 Store error 状态展示
- 批量测速部分失败：`Promise.allSettled` 保证所有请求完成，单个失败不中断整体

### 11.3 系统代理失败

- Windows：注册表访问失败（权限问题）
- macOS：networksetup 命令执行失败
- 不影响代理本身运行，错误通过 IPC 返回给前端

---

## 12. 前端组件交互

### 12.1 Layout 侧边栏

- **代理开关**：大按钮，点击触发 `toggleProxy()`，显示运行状态和活跃配置名
- **系统代理开关**：Switch 组件，仅代理运行时可用
- **流量显示**：上行/下行分别显示，仅代理运行时可见
- **模式指示器**：显示当前代理模式（rule/global/direct）

### 12.2 Dashboard

- 三列卡片：活跃配置、端口配置、代理状态
- 模式选择器：三列按钮，当前模式高亮，仅运行时可点击

### 12.3 Nodes 页面

**页面布局：**
```
┌──────────────────────────────────────────────────┐
│ 节点管理                          [排序] [模式] [刷新] │
├──────────────────────────────────────────────────┤
│ 🔍 搜索节点...                                     │
├──────────────────────────────────────────────────┤
│ ▼ 代理组名称  [Selector] (12)   当前节点名  [⚡测速] │
│ ┌────────┐ ┌────────┐ ┌────────┐                  │
│ │节点 A  ✓│ │节点 B   │ │节点 C   │                  │
│ │[SS]     │ │[VMess]  │ │[Trojan] │                  │
│ │120ms  🔄│ │350ms  🔄│ │timeout🔄│                  │
│ └────────┘ └────────┘ └────────┘                  │
│                                                    │
│ ▶ 另一个代理组  [URLTest] (8)      当前节点  [⚡]   │
│   (已折叠)                                         │
└──────────────────────────────────────────────────┘
```

**工具栏按钮：**

| 按钮       | 功能                                        | 状态                          |
| ---------- | ------------------------------------------- | ----------------------------- |
| 排序       | 循环切换 default → delay → name             | 按钮图标随模式变化            |
| 展示模式   | 切换 simple / full                          | P1，按钮图标 LayoutGrid/List  |
| 刷新       | 重新拉取代理组数据                          | loading 时旋转动画            |

**节点卡片内容：**

- 节点名称（最多两行截断）
- 选中状态（Check 图标 + primary 边框 + 浅底色）
- 延迟值（带颜色编码，实时从 history 取）
- 协议类型 Badge（如 SS、VMess、Trojan）
- 单节点测速按钮（点击测速，loading 态旋转）

**代理未运行**：显示居中占位提示（Signal 图标 + 文案）
