# Clash-Kite SPEC

> 产品规格文档。本文件是开发的唯一权威依据，所有功能实现以本文档为准。
>
> - **变更流程**：功能开发前，先更新本文档对应章节，双方（人/AI）对齐后再动手
> - **与模块文档的关系**：`docs/*.md` 是实现参考，`SPEC.md` 是产品契约
> - **与 PRD.md 的关系**：PRD.md 是历史文档，`SPEC.md` 是其精简继承者

---

## 1. 项目概览

| 项目 | 内容 |
|------|------|
| **产品名称** | Clash-Kite |
| **定位** | 基于 mihomo (Clash Meta) 内核的多平台代理客户端 |
| **目标平台** | Windows、macOS |
| **技术栈** | Tauri 2 + React 19 + TypeScript + Rust |
| **当前状态** | MVP 开发中（v0.1.0） |
| **参考项目** | [FlClash](https://github.com/chen08209/FlClash)、[clash-party](https://github.com/mihomo-party-org/clash-party) |
| **GitHub** | https://github.com/buwenzheng/clash-kite |

### 核心价值主张

- **简单易用**：一键连接，智能分流
- **开源免费**：无广告，无追踪
- **跨平台**：Windows / macOS 统一体验
- **轻量**：Tauri 框架，< 20 MB

### 技术约束

- mihomo 以 sidecar 进程运行，REST API 监听 `127.0.0.1:9090`
- 数据存储在 `~/.config/clash-kite/`（或等效平台目录）
- SQLite 用于持久化配置和设置
- 前后端通过 Tauri IPC（`invoke()`）通信，零 HTTP 开销

---

## 2. 页面与路由

共 **14 个页面**，按优先级分组：

| 页面 | 路由 | 优先级 | 状态 |
|------|------|--------|------|
| Dashboard | `/` | P0 | ✅ 已完成 |
| Nodes | `/nodes` | P0 | ✅ 已完成 |
| Profiles | `/profiles` | P0 | ✅ 已完成 |
| Logs | `/logs` | P0 | ✅ 已完成 |
| Connections | `/connections` | P0 | 🚧 待开发 |
| Settings | `/settings` | P0 | ✅ 已完成 |
| SysProxy | `/sysproxy` | P1 | 🚧 待开发 |
| TUN | `/tun` | P1 | 🚧 待开发 |
| DNS | `/dns` | P1 | 🚧 待开发 |
| Sniffer | `/sniffer` | P1 | 🚧 待开发 |
| Resources | `/resources` | P1 | 🚧 待开发 |
| Kernel | `/kernel` | P1 | 🚧 待开发 |
| Rules | `/rules` | P2 | 📋 待设计 |
| Overrides | `/overrides` | P2 | 📋 待设计 |

### 侧边栏约定

侧边栏固定显示：
- 代理总开关（开 / 关）
- 当前流量（上行 / 下行）
- 当前代理模式（direct / global / rule）
- 活跃配置名

P0/P1 页面全部在侧边栏展示；P2 页面可选折叠。

---

## 3. P0 功能规格

> P0 = MVP 必须包含。完成标准：有可用的 UI + 端到端流程跑通。

### 3.1 Dashboard (`/`)

**用途**：代理状态总览

**显示内容**：
- 代理运行状态（运行中 / 已停止）
- 当前代理模式（direct / global / rule），支持点击切换
- 端口信息：http port、socks port、mixed port
- 活跃配置名称
- 系统代理状态（已启用 / 已关闭）

**交互**：
- 点击"启动 / 停止"按钮 → 调用 `toggle_proxy`
- 点击模式切换 → 调用 `set_proxy_mode`
- 每 2 秒轮询一次 `get_traffic` 更新流量显示

**数据依赖**：`get_proxy_status`（`ProxyStatus`）

---

### 3.2 Nodes (`/nodes`)

**用途**：节点分组管理、测速、选择

**显示内容**：
- 代理组列表（每个组为一个卡片）
- 每个节点显示：名称、类型（Shadowsocks / VMess / Trojan / Hysteria2 等）、延迟
- 延迟颜色约定：`≤ 100ms` 绿色，`100-300ms` 黄色，`> 300ms` 红色，`超时` 灰色
- 当前选中的节点打勾标记

**交互**：
- 点击节点 → 调用 `select_proxy(group, name)`
- 点击"测速全部" → 并发调用 `test_proxy_delay`（并发数 ≤ 10）
- 支持按名称搜索
- 支持按类型过滤
- 支持按延迟排序

**数据依赖**：`get_proxy_groups`（`ProxyGroup[]`）、`test_proxy_delay`

---

### 3.3 Profiles (`/profiles`)

**用途**：配置文件的 CRUD 和订阅管理

**支持三种导入方式**：
1. **本地文件**：通过原生文件对话框选择 `.yaml` 文件
2. **订阅 URL**：输入 URL，自动下载并 base64 解码
3. **二维码导入**：截屏或选择图片文件识别 QR Code（🚧 待开发）

**每个配置显示**：
- 名称、来源（本地 / 订阅）
- 激活状态（仅一个激活）
- 上次更新时间
- 自动更新开关 + 间隔（仅订阅）

**交互**：
- 点击"激活" → 调用 `activate_profile`，如果代理运行中则热重载
- 点击"编辑" → 进入 YAML 编辑器页面，保存调用 `save_profile_content`
- 点击"更新订阅" → 调用 `update_profile_subscription`
- 点击"删除" → 确认对话框后调用 `delete_profile`
- 导出到本地 → 调用 `export_profile`

**数据依赖**：`get_profiles`、`import_profile_file`、`import_profile_subscription`、`activate_profile`、`delete_profile`、`update_profile_subscription`、`save_profile_content`、`export_profile`、`read_profile_content`

---

### 3.4 Logs (`/logs`)

**用途**：查看 mihomo 运行日志

**显示内容**：
- 日志列表，最新在下，支持自动滚动（可暂停）
- 每条日志显示：时间戳、级别（debug / info / warning / error）、消息内容
- 级别颜色约定：debug 灰色、info 蓝色、warning 黄色、error 红色

**交互**：
- 支持按级别过滤（多选：debug / info / warning / error）
- 支持搜索关键字
- 支持分页加载（初始加载最近 2000 行）
- 点击"清空" → 截断日志文件（🚧 待开发）

**数据依赖**：`get_mihomo_log(lines?, level?)`

**注意**：当前为轮询模式（`get_mihomo_log` 每 2 秒调用一次），计划升级为 WebSocket 实时流（`start_log_stream` / `stop_log_stream`），优先级 P1。

---

### 3.5 Connections (`/connections`) 🚧 待开发

**用途**：实时查看和管理活跃连接

**显示内容**：
- 连接列表：ID、源地址、目标地址、协议、代理节点、上行流量、下行流量、持续时间、状态
- 分类 Tab：活跃 / 已关闭

**交互**：
- 点击"关闭连接" → 调用 `close_connection`
- 点击"关闭全部" → 调用 `close_all_connections`
- 支持搜索（目标地址 / 节点名过滤）
- 支持按流量 / 持续时间排序
- 双视图切换：列表视图 / 表格视图

**数据依赖**：`start_connections_stream`、`stop_connections_stream`、`get_connections_snapshot`、`close_connection`、`close_all_connections`

**注意**：后端通过 `GET /connections` 轮询 + `DELETE /connections/:id` 关闭连接。mihomo 支持 WebSocket 订阅 `WS /connections`，优先实现 WebSocket 模式。

---

### 3.6 Settings (`/settings`)

**用途**：应用全局设置

**设置项**：

| 设置项 | 类型 | 默认值 |
|--------|------|--------|
| 主题 | enum（light / dark / system） | system |
| 语言 | enum（zh / en） | zh |
| 开机自启 | bool | false |
| 最小化到托盘 | bool | true |
| 启动时最小化 | bool | false |
| 系统代理 | bool | false |
| TUN 模式 | bool | false |
| 工作目录 | string | 默认路径 |

**其他功能**：
- "打开配置目录"：调用系统文件管理器
- "关于"：显示版本号、GitHub 链接
- "检查更新"：检查应用新版本（🚧 待开发）
- "MetaCubeXd Dashboard"：下载并打开内置 Dashboard（🚧 待开发）

**数据依赖**：`get_settings`、`save_settings`

---

## 4. P1 功能规格

> P1 = MVP 后立即开发。完成标准：UI 可配置 + 后端命令已注册 + 可热重载生效。

### 4.1 SysProxy (`/sysproxy`)

**用途**：系统代理高级配置

**设置项**：

| 字段 | 类型 | 说明 |
|------|------|------|
| enable | bool | 是否启用系统代理 |
| mode | manual / auto | 系统代理模式 |
| host | string | 手动代理地址 |
| bypass | string[] | 绕过地址列表（支持通配符） |
| pacScript | string? | PAC 脚本内容（仅 auto 模式） |

**交互**：
- 切换 enable → 调用 `set_system_proxy`
- 保存配置 → 调用 `set_sysproxy_advanced_config`
- 重置默认值 → 调用 `reset_sysproxy_advanced_defaults`

**平台差异**：
- Windows：winreg 注册表 + `InternetSetOptionW`
- macOS：`networksetup` 命令

---

### 4.2 TUN (`/tun`)

**用途**：TUN 虚拟网卡配置

**设置项**：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enable | bool | false | 是否启用 TUN |
| stack | mixed / system / gvisor | gvisor | TUN 堆栈类型 |
| autoRoute | bool | true | 自动设置系统路由 |
| autoDetectInterface | bool | true | 自动检测出口网卡 |
| strictRoute | bool | false | 严格路由 |
| mtu | number | 9000 | MTU |
| dnsHijack | string[] | `["198.18.0.0/15"]` | DNS 劫持地址 |
| routeExcludeAddress | string[] | [] | 排除路由地址 |

**交互**：保存后需重启 mihomo 生效。TUN 模式需要管理员 / root 权限，应提供权限提升引导。

---

### 4.3 DNS (`/dns`)

**用途**：DNS 配置

**设置项**：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enable | bool | true | DNS 是否启用 |
| listen | string | `127.0.0.1:53` | DNS 监听地址 |
| enhancedMode | fake-ip / redir-host | fake-ip | 增强模式 |
| fakeIpRange | string | `198.18.0.0/15` | fake-ip 地址段 |
| fakeIpFilter | string[] | 内置列表 | fake-ip 过滤域名 |
| defaultNameserver | string[] | `["https://doh.pub/dns-query"]` | 默认 DNS |
| nameserver | string[] | 系统 DNS | 主 DNS |
| fallback | string[] | `["https://dns.alidns.com/dns-query"]` | 备用 DNS |
| fallbackFilter | object | 见 mihomo 文档 | fallback 过滤规则 |

**交互**：保存后调用 `apply_dns_config` 重启 DNS 服务生效。

---

### 4.4 Sniffer (`/sniffer`)

**用途**：域名嗅探配置

**设置项**：

| 字段 | 类型 | 说明 |
|------|------|------|
| enable | bool | 是否启用嗅探 |
| sniff.HTTP | object | HTTP 嗅探配置 |
| sniff.TLS | object | TLS 嗅探配置 |
| sniff.QUIC | object | QUIC 嗅探配置 |
| forceDomain | string[] | 强制嗅探的域名 |
| skipDomain | string[] | 跳过嗅探的域名 |

**协议配置**：

| 字段 | 类型 | 说明 |
|------|------|------|
| ports | string[] | 监听端口 |
| overrideDestination | bool | 是否覆盖目标地址 |

---

### 4.5 Resources (`/resources`)

**用途**：GeoIP / GeoSite / Proxy Provider / Rule Provider 管理

**GeoIP / GeoSite**：

| 字段 | 类型 | 说明 |
|------|------|------|
| geodataMode | bool | 是否启用 geodata 模式 |
| geoAutoUpdate | bool | 自动更新开关 |
| geoUpdateInterval | number | 更新间隔（小时） |
| geoxUrl.geoip | string | GeoIP 数据 URL |
| geoxUrl.geosite | string | GeoSite 数据 URL |
| geoxUrl.mmdb | string | MaxMind DB URL |
| geoxUrl.asn | string | ASN 数据 URL |

**Proxy Provider**：列表展示 + 手动刷新

**Rule Provider**：列表展示 + 手动刷新

**交互**：
- 点击"更新 GeoIP" → 调用 `update_geo_data`
- 点击 Provider "刷新" → 调用 `update_proxy_provider` / `update_rule_provider`

---

### 4.6 Kernel (`/kernel`)

**用途**：mihomo 内核参数配置和版本管理

**设置项**：

| 字段 | 类型 | 说明 |
|------|------|------|
| mixedPort | number | 混合代理端口 |
| socksPort | number | SOCKS5 代理端口 |
| httpPort | number | HTTP 代理端口 |
| logLevel | silent / error / warning / info / debug | 日志级别 |
| allowLan | bool | 是否允许局域网连接 |
| ipv6 | bool | 是否启用 IPv6 |
| externalController | object | 外部控制器（enable, host, port, secret） |
| processPriority | enum | 进程优先级（仅 Windows） |

**内核版本管理**：

| 功能 | 说明 |
|------|------|
| 显示当前版本 | 调用 `mihomo -v` |
| 切换稳定版 / 预览版 | 下载并替换二进制 |
| 检查更新 | 调用 GitHub Releases API |
| 下载进度 | 实时进度条（`core:download-progress` 事件） |

**交互**：
- 保存 → 调用 `apply_kernel_settings` + 重启 mihomo
- 切换内核版本 → 停止 → 下载 → 替换 → 重启

---

## 5. P2 功能规格

> P2 = 后续迭代。设计尚未冻结，需要补充详细规格后开始开发。

### 5.1 Rules (`/rules`)

显示当前生效的规则列表，支持搜索、过滤、启用/禁用。

### 5.2 Overrides (`/overrides`)

YAML / JS 覆写文件管理，支持导入、新建、编辑、排序、关联订阅配置。

### 5.3 全局快捷键

注册全局热键，快速切换代理状态。

### 5.4 应用自动更新

检查 GitHub Release、下载安装包、提示用户更新。

### 5.5 WebDAV 配置同步

跨设备同步配置和覆写。

---

## 6. 技术规格

### 6.1 Tauri Command 清单

已实现（26 个）：

**proxy.rs（11 个）**
`get_proxy_status` · `start_proxy` · `stop_proxy` · `toggle_proxy` · `get_proxy_groups` · `select_proxy` · `test_proxy_delay` · `set_proxy_mode` · `set_system_proxy` · `get_traffic` · `get_mihomo_log`

**profile.rs（13 个）**
`get_profiles` · `get_active_profile` · `import_profile_file` · `import_profile_subscription` · `update_profile_subscription` · `delete_profile` · `activate_profile` · `update_profile_info` · `export_profile` · `read_profile_content` · `save_profile_content` · `set_profile_auto_update` · `update_all_auto_update_profiles`

**settings.rs（2 个）**
`get_settings` · `save_settings`

待实现（按优先级）：
- Connections 相关：5 个
- SysProxy 高级配置：3 个
- TUN 配置：2 个
- DNS 配置：3 个
- Sniffer 配置：3 个
- Resources：7 个
- Kernel：3 个
- 内核版本管理：3 个
- 二维码导入：2 个
- Rules：3 个
- Overrides：4 个

### 6.2 数据库 Schema

**profiles 表**

```sql
CREATE TABLE profiles (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    source                TEXT NOT NULL DEFAULT 'local',
    file_path             TEXT NOT NULL,
    sub_url               TEXT,
    updated_at            TEXT NOT NULL,
    is_active             INTEGER NOT NULL DEFAULT 0,
    auto_update           INTEGER NOT NULL DEFAULT 0,
    auto_update_interval  INTEGER NOT NULL DEFAULT 480
);
```

**settings 表**

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### 6.3 Zustand Store 清单

| Store | 文件 | 状态 |
|-------|------|------|
| useProxyStore | `src/store/proxy.ts` | ✅ |
| useProfileStore | `src/store/config.ts` | ✅ |
| useSettingsStore | `src/store/settings.ts` | ✅ |

### 6.4 目录结构

```
clash-kite/
├── SPEC.md                          ← 本文档（产品规格）
├── CLAUDE.md                        ← AI 开发指南
├── PRD.md                           ← 历史产品文档（参考）
├── docs/
│   ├── architecture.md              ← 技术架构
│   ├── api-reference.md             ← 命令接口参考
│   └── *.md                          ← 各模块详细设计（实现参考）
├── src/
│   ├── api/index.ts                 ← Tauri IPC 封装
│   ├── types/index.ts               ← TypeScript 类型
│   ├── store/
│   │   ├── proxy.ts                 ← useProxyStore
│   │   ├── config.ts                ← useProfileStore
│   │   └── settings.ts              ← useSettingsStore
│   ├── pages/
│   │   ├── Dashboard.tsx            ← P0 ✅
│   │   ├── Nodes.tsx                ← P0 ✅
│   │   ├── Profiles.tsx             ← P0 ✅
│   │   ├── Logs.tsx                 ← P0 ✅
│   │   ├── Connections.tsx          ← P0 🚧
│   │   ├── Settings.tsx             ← P0 ✅
│   │   ├── SysProxy.tsx             ← P1 🚧
│   │   ├── Tun.tsx                  ← P1 🚧
│   │   ├── Dns.tsx                  ← P1 🚧
│   │   ├── Sniffer.tsx              ← P1 🚧
│   │   ├── Resources.tsx            ← P1 🚧
│   │   └── Kernel.tsx               ← P1 🚧
│   └── locales/
│       ├── zh.json
│       └── en.json
└── src-tauri/src/
    ├── commands/
    │   ├── proxy.rs                 ← 11 个 ✅
    │   ├── profile.rs               ← 13 个 ✅
    │   └── settings.rs              ← 2 个 ✅
    ├── services/
    │   ├── proxy.rs
    │   ├── profile.rs
    │   └── settings.rs
    ├── core/
    │   ├── mihomo.rs                ← 进程管理
    │   ├── mihomo_api.rs            ← REST API 客户端
    │   └── sysproxy.rs              ← 系统代理
    └── db/mod.rs                    ← SQLite
```

---

## 7. 开发任务看板

| ID | 任务 | 优先级 | 依赖 | 状态 |
|----|------|--------|------|------|
| T-01 | Connections 页面 | P0 | — | 🚧 |
| T-02 | SysProxy 页面 | P1 | T-01 完成后 | 📋 |
| T-03 | TUN 页面 | P1 | T-02 | 📋 |
| T-04 | DNS 页面 | P1 | T-02 | 📋 |
| T-05 | Sniffer 页面 | P1 | T-02 | 📋 |
| T-06 | Resources 页面 | P1 | T-02, T-03 | 📋 |
| T-07 | Kernel 页面 | P1 | T-02 | 📋 |
| T-08 | 实时日志流（WebSocket） | P1 | T-02 | 📋 |
| T-09 | Rules 页面 | P2 | T-04~T-07 | 📋 |
| T-10 | Overrides 系统 | P2 | T-09 | 📋 |
| T-11 | 二维码导入 | P1 | T-02 | 📋 |
| T-12 | 内核版本管理 | P1 | T-07 | 📋 |
| T-13 | 托盘增强 | P1 | — | 📋 |
| T-14 | 订阅自动更新 | P1 | — | 📋 |
| T-15 | 工作目录配置 | P1 | — | 📋 |
| T-16 | 开机自启 | P1 | — | 📋 |
| T-17 | 全局快捷键 | P2 | — | 📋 |
| T-18 | 应用自动更新 | P2 | — | 📋 |
| T-19 | WebDAV 同步 | P2 | T-10 | 📋 |
| T-20 | MetaCubeXd Dashboard | P1 | T-07 | 📋 |

---

## 8. 成功指标

| 指标 | 目标 |
|------|------|
| 启动时间 | < 2 秒 |
| 内存占用 | < 100 MB |
| 打包体积 | < 20 MB |
| 代理切换响应 | < 1 秒 |
| mihomo 就绪 | < 10 秒 |

---

## 9. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-03 | 初始化 SPEC.md，整合 PRD.md 和 CLAUDE.md，建立产品规格文档 |
