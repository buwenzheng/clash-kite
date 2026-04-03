# Clash-Kite 开发计划

> 基于 SPEC.md 制定的详细开发计划。任务按阶段组织，每阶段标注依赖关系。

---

## 阶段划分

```
✅ 已完成
  └─ P0 核心：Dashboard / Nodes / Profiles / Settings / Logs
  └─ 26 个 Tauri Commands（proxy × 11 + profile × 13 + settings × 2）

🚧 当前
  └─ T-01: Connections 连接管理页面

📋 后续（按依赖顺序）
  ├─ Phase 1: P1 后端命令基底
  ├─ Phase 2: P1 前端页面
  ├─ Phase 3: P1 增强功能
  ├─ Phase 4: P2 规则与覆写
  └─ Phase 5: P2 高级功能
```

---

## Phase 0 — T-01：连接管理页面

**T-01 | P0 | 无依赖 | 🚧 进行中**

### 交付物

**后端（Rust）：**
- `commands/connections.rs` 新建
- `start_connections_stream` — mihomo `GET /connections` 轮询（1000ms），向前端发 `connections:active` 事件
- `stop_connections_stream` — 停止轮询
- `get_connections_snapshot(mode, limit?, offset?)` — 同步获取快照
- `close_connection(id)` — `DELETE /connections/:id`
- `close_all_connections` — `DELETE /connections`
- `models/connections.rs` 新建：`ConnectionItem { id, src, dst, protocol, proxy, trafficUp, trafficDown, duration, state }`

**前端：**
- `pages/Connections.tsx` 新建
- 活跃 / 已关闭 Tab
- 连接列表：ID、源地址、目标地址、协议、代理节点、上行/下行流量、持续时间、状态
- 搜索过滤、流量/时间排序、列表/表格双视图
- `store/connections.ts` 新建（`useConnectionsStore`）
- `api/index.ts` 添加 5 个 API 函数
- `locales/zh.json`、`locales/en.json` 添加 connections key（~15 个）
- `App.tsx` 添加路由 `/connections`
- `Layout.tsx` 侧边栏添加导航

### 验收标准
- [ ] 连接列表实时刷新（每 1 秒）
- [ ] 点击关闭连接立即生效
- [ ] 搜索和排序正常
- [ ] 活跃/已关闭 Tab 正确切换

---

## Phase 1 — T-02：P1 后端命令基底

**T-02 | P1 | 依赖 T-01 | 无依赖（独立可开始）**

### 交付物

#### Sysproxy（`commands/sysproxy.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_sysproxy_advanced_config` | 读 SQLite，无则返回默认值 |
| `set_sysproxy_advanced_config` | 保存 + apply |
| `reset_sysproxy_advanced_defaults` | 恢复默认值 |

`models/sysproxy.rs`：`SysProxyAdvancedConfig { enable, mode, host, bypass, pacScript }`

#### TUN（`commands/tun.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_tun_config` | 读 SQLite，无则返回默认值 |
| `set_tun_config` | 保存 + apply（热重载） |
| `reset_tun_firewall_windows` | 重置 Windows 防火墙规则（可选） |

`models/tun.rs`：`TunConfig { enable, stack, autoRoute, autoDetectInterface, strictRoute, mtu, dnsHijack, routeExcludeAddress }`

#### DNS（`commands/dns.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_dns_config` | 读 SQLite，无则返回 mihomo 默认值 |
| `set_dns_config` | 保存 |
| `apply_dns_config` | 生成配置片段 + restart/reload |

`models/dns.rs`：`DnsConfig { enable, listen, enhancedMode, fakeIpRange, fakeIpFilter, defaultNameserver, nameserver, fallback, fallbackFilter }`

#### Sniffer（`commands/sniffer.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_sniffer_config` | 读 SQLite，无则返回默认值 |
| `set_sniffer_config` | 保存 |
| `apply_sniffer_config` | 注入配置 + restart/reload |

`models/sniffer.rs`：`SnifferConfig { enable, sniff, forceDomain, skipDomain }`

#### Resources（`commands/resources.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_geo_config` / `set_geo_config` | GeoIP/GeoSite 配置 |
| `update_geo_data` | `POST /configs/geo` |
| `get_proxy_providers` | `GET /providers/proxies` |
| `update_proxy_provider(name)` | `PUT /providers/proxies/:name` |
| `get_rule_providers` | `GET /providers/rules` |
| `update_rule_provider(name)` | `PUT /providers/rules/:name` |

`models/resources.rs`：`GeoConfig`、`ProxyProviderItem`、`RuleProviderItem`

#### Kernel（`commands/kernel.rs` 新建）

| Command | 说明 |
|---------|------|
| `get_kernel_settings` / `set_kernel_settings` / `apply_kernel_settings` | 内核参数 |
| `get_core_version_info` | `mihomo -v` + SQLite 通道偏好 |
| `check_core_update(channel)` | GitHub Releases API |
| `download_and_switch_core(channel, version)` | 下载 + 替换 + 重启 |

`models/kernel.rs`：`KernelSettings`、`CoreVersionInfo`

### 关键设计决策

**ConfigService\<T> 模板抽象（建议）：**
```rust
// services/config.rs — 可抽取通用 CRUD，减少样板
pub struct ConfigService<T> {
    db: Arc<Connection>,
    key: &'static str,
    _phantom: PhantomData<T>,
}
impl<T: Serialize + DeserializeOwned + Default> ConfigService<T> {
    pub fn get(&self) -> Result<T, String>
    pub fn set(&self, val: &T) -> Result<(), String>
    pub fn apply(&self, val: &T) -> Result<(), String>  // 交给子类实现
}
```

**Apply 策略：**
- TUN / DNS / Sniffer / Kernel 的 apply：生成最终配置片段 → 调用 `MihomoManager::reload(config_path)` 或 `MihomoApi::restart()`
- Sysproxy：直接调用 `sysproxy::set_system_proxy()`

### 验收标准
- [ ] 每个模块 3 个命令全部可调用
- [ ] SQLite 持久化正常（重启后值保留）
- [ ] Apply 后 mihomo 热重载正常
- [ ] `lib.rs` 注册所有新模块

---

## Phase 2 — T-03：P1 前端页面

**T-03 | P1 | 依赖 T-02**

### 交付物（6 个页面）

#### 1. SysProxy.tsx
- enable 开关、mode 选择（manual/pac）
- host 输入、bypass 列表（可增删 tag）
- pacScript Textarea 编辑器
- `store/sysproxy.ts` 新建
- `api/index.ts` 添加 3 个函数
- i18n ~20 key

#### 2. Tun.tsx
- enable 开关、stack 选择（mixed/system/gvisor）
- autoRoute / autoDetectInterface / strictRoute 开关
- mtu 输入、dnsHijack / routeExcludeAddress 列表
- 权限提升提示 Banner（Windows 管理员 / macOS root）
- `store/tun.ts` 新建
- i18n ~25 key

#### 3. Dns.tsx
- enable 开关、listen 输入
- enhancedMode 选择（fake-ip/redir-host）
- fakeIpRange 输入、fakeIpFilter 列表
- defaultNameserver / nameserver / fallback 列表（各可增删）
- fallbackFilter 折叠区（geoip / geoipCode / ipcidr）
- `store/dns.ts` 新建
- i18n ~30 key

#### 4. Sniffer.tsx
- enable 开关
- HTTP / TLS / QUIC 协议配置区（ports 列表 + overrideDestination 开关）
- forceDomain / skipDomain 列表
- `store/sniffer.ts` 新建
- i18n ~20 key

#### 5. Resources.tsx
- GeoIP/GeoSite：geodataMode 开关、geoAutoUpdate 开关、geoUpdateInterval、URL 配置
- Proxy Provider 表格（名称、类型、节点数、更新时间、刷新按钮）
- Rule Provider 表格（名称、类型、规则数、更新时间、刷新按钮）
- `store/resources.ts` 新建
- i18n ~25 key

#### 6. Kernel.tsx
- 端口配置（mixed/socks/http）、logLevel 选择
- allowLan / ipv6 开关
- externalController（enable + host + port + secret 输入）
- 内核版本区（当前版本、通道、latest stable/alpha 版本）
- "检查更新" / "切换版本" 按钮
- 下载进度条（`core:download-progress` 事件）
- `store/kernel.ts` 新建
- i18n ~30 key

### 全局交付
- `App.tsx` 添加 6 个路由
- `Layout.tsx` 侧边栏添加 6 个导航 item
- `src/types/index.ts` 添加所有新 TypeScript 类型

### 验收标准
- [ ] 6 个页面全部可访问、配置可保存
- [ ] Apply 后 mihomo 重启生效
- [ ] 所有 i18n key 覆盖

---

## Phase 3 — T-04 ~ T-10：P1 增强功能

**可并行开发（均依赖 T-03）**

#### T-04 | 日志实时流（WebSocket）| 依赖 T-02
- `start_log_stream` / `stop_log_stream` / `clear_log_cache`
- Logs.tsx 改造：轮询 → WebSocket + fallback
- `store/proxy.ts` 改造：addLogs() / clearLogs()

#### T-05 | 二维码导入订阅 | 依赖 T-03
- `decode_qr_from_screen` / `decode_qr_from_file`
- Profiles.tsx 新增"扫码导入"按钮和弹窗

#### T-06 | 托盘菜单增强 | 依赖 T-03
- 菜单项完整化（模式切换子菜单、配置切换子菜单、代理组节点选择）
- 动态生成菜单（从 profiles 列表 + proxy groups）

#### T-07 | 订阅自动更新调度器 | 依赖 T-03
- AutoUpdateScheduler 后台任务（每 60s 唤醒）
- tauri-plugin-notification 系统通知

#### T-08 | 工作目录配置与迁移 | 依赖 T-03
- `get_work_dir` / `set_work_dir` / `migrate_work_dir`
- Settings.tsx 新增工作目录配置 UI + 迁移确认对话框

#### T-09 | 开机自启 + 全局快捷键 | 依赖 T-03
- `set_auto_start(enable)` — Windows 注册表 / macOS LaunchAgents
- tauri-plugin-global-shortcut 注册切换代理热键
- Settings.tsx 新增快捷键配置 UI

#### T-10 | MetaCubeXd Dashboard 集成 | 依赖 T-03
- `open_dashboard` / `download_dashboard`
- 内置 HTTP 服务器 serve `data/ui/`
- Settings.tsx 新增 Dashboard 配置区域

---

## Phase 4 — T-11 ~ T-12：P2 规则与覆写

#### T-11 | 规则管理页面 | 依赖 T-03
- `commands/rules.rs` + `models/rules.rs` + `services/rules.rs`
- Rules.tsx 页面（规则列表 + Rule Provider 管理）
- `store/rules.ts`

#### T-12 | 覆写系统 | 依赖 T-11
- 数据库迁移：`overrides` 表 + `profile_overrides` 表
- `commands/overrides.rs` — CRUD + 排序
- OverrideEngine — YAML deep_merge + JS 执行
- Overrides.tsx 页面（YAML/JS 编辑器 + 拖拽排序 + 关联订阅）
- `store/overrides.ts`

---

## Phase 5 — T-13 ~ T-14：P2 高级功能

#### T-13 | 应用自动更新 | 依赖 T-03
- `check_app_update` / `download_app_update` / `install_app_update`
- GitHub Releases API + SHA256 校验
- Settings.tsx 新增更新检查 UI + 进度条 + 弹窗

#### T-14 | WebDAV 配置同步 | 依赖 T-11, T-12
- `get/set_webdav_config` / `test_webdav_connection`
- `sync_to_webdav` / `sync_from_webdav`（冲突策略：本地优先）
- WebDAV 密码加密存储
- Settings.tsx 新增 WebDAV 配置区域

---

## 任务总览

| ID | 任务 | 阶段 | 优先级 | 依赖 | 预计工作量 |
|----|------|------|--------|------|-----------|
| T-01 | Connections 页面 | Phase 0 | P0 | — | 中 |
| T-02 | P1 后端命令基底 | Phase 1 | P1 | T-01（可独立） | 大 |
| T-03 | P1 前端页面 | Phase 2 | P1 | T-02 | 大 |
| T-04 | 日志实时流 | Phase 3 | P1 | T-02 | 中 |
| T-05 | 二维码导入 | Phase 3 | P1 | T-03 | 小 |
| T-06 | 托盘菜单增强 | Phase 3 | P1 | T-03 | 中 |
| T-07 | 订阅自动更新 | Phase 3 | P1 | T-03 | 中 |
| T-08 | 工作目录配置 | Phase 3 | P1 | T-03 | 中 |
| T-09 | 开机自启 + 快捷键 | Phase 3 | P1 | T-03 | 小 |
| T-10 | Dashboard 集成 | Phase 3 | P1 | T-03 | 小 |
| T-11 | 规则管理页面 | Phase 4 | P2 | T-03 | 中 |
| T-12 | 覆写系统 | Phase 5 | P2 | T-11 | 大 |
| T-13 | 应用自动更新 | Phase 5 | P2 | T-03 | 中 |
| T-14 | WebDAV 同步 | Phase 5 | P2 | T-11, T-12 | 中 |

---

## 开发建议

1. **Phase 1（T-02）和 Phase 0（T-01）可并行** — T-02 纯后端，不影响 T-01 的前端开发
2. **Phase 3 内部完全并行** — T-04 ~ T-10 各自独立，只需等 T-03 完成
3. **先完成后端再完成前端** — 每阶段先实现 Rust 命令并验证，再开发前端 UI
4. **i18n 随页面同步完成** — 不要留到最后的"批量翻译"阶段
5. **每个阶段结束跑一次 `npm run tauri build`** — 验证没有 regression

---

## 版本规划

| 版本 | 目标 | 包含任务 |
|------|------|---------|
| v0.2.0 | P0 完成 | T-01 |
| v0.3.0 | P1 后端 + 页面 | T-02, T-03 |
| v0.4.0 | P1 增强功能 | T-04 ~ T-10 |
| v0.5.0 | P2 规则与覆写 | T-11, T-12 |
| v0.6.0 | P2 高级功能 | T-13, T-14 + 发版准备 |
