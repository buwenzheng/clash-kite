# Clash-Kite 开发计划

> 基于 SPEC.md 制定的详细开发计划。任务按阶段组织，每阶段标注依赖关系。
>
> **范围声明**（与 SPEC.md §0 对齐）：**不做** SmartCore、Sub-Store、双内核、Overrides 覆写、WebDAV 同步、应用自动更新、多主题、免服务 TUN。

---

## 阶段划分

```
✅ 已完成
  └─ P0 核心：Dashboard / Nodes / Profiles / Settings / Logs / Connections
  └─ 31 个 Tauri Commands
     (proxy × 11 + profile × 13 + settings × 2 + connections × 5 + kernel × 2[仅占位])

🚧 当前
  └─ Phase 1: T-02 ~ T-07 P1 后端命令与前端页面
     (SysProxy / TUN / DNS / Sniffer / Resources / Kernel)

📋 后续
  ├─ Phase 2: T-08 ~ T-13 P1 增强
  │   (实时日志 / 托盘 / 自动更新 / 二维码 / 开机自启 / 工作目录)
  └─ Phase 3: T-14 ~ T-16 P2 页面
      (Rules / 快捷键 / 备份迁移)
```

---

## Phase 1 — P1 mihomo 高级配置（六模块并进）

**范围**：后端命令 + 前端页面同时交付。T-02 无依赖可最先启动，其余五个模块互不依赖可并行。

### 通用交付物（六个模块均需）

**后端（Rust）：**
- `commands/{module}.rs` 新建
- `models/{module}.rs` 新建
- `services/{module}.rs` 新建
- 存读 SQLite（settings 表 / 独立表二选一）
- apply 时调用 `MihomoManager::reload()` 或 `MihomoApi::restart()`
- `lib.rs` 注册 `invoke_handler`

**前端（React）：**
- `pages/{Module}.tsx` 新建
- `store/{module}.ts` 新建
- `api/index.ts` 添加对应函数
- i18n key（按页面 20~30 个）
- `App.tsx` 添加路由
- `Layout.tsx` 侧边栏添加导航

**关键技术决策：**

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
- TUN / DNS / Sniffer / Kernel 的 apply：生成最终配置片段 → `MihomoManager::reload(config_path)` 或 `MihomoApi::restart()`
- Sysproxy：直接调用 `sysproxy::set_system_proxy()`

### T-02 SysProxy 高级配置（无依赖、可先启动）

- **命令（3 个）**：`get_sysproxy_advanced_config` / `set_sysproxy_advanced_config` / `reset_sysproxy_advanced_defaults`
- **模型**：`SysProxyAdvancedConfig { enable, mode, host, bypass, pacScript }`
- **页面**：enable 开关、mode（manual/pac）、host、bypass 列表、pacScript 编辑器

### T-03 TUN 配置

- **命令（3 个）**：`get_tun_config` / `set_tun_config` / `reset_tun_firewall_windows`
- **模型**：`TunConfig { enable, stack, autoRoute, autoDetectInterface, strictRoute, mtu, dnsHijack, routeExcludeAddress }`
- **页面**：enable、stack、autoRoute、autoDetectInterface、strictRoute、mtu、dnsHijack、routeExcludeAddress，权限提升提示

### T-04 DNS 配置

- **命令（3 个）**：`get_dns_config` / `set_dns_config` / `apply_dns_config`
- **模型**：`DnsConfig { enable, listen, enhancedMode, fakeIpRange, fakeIpFilter, defaultNameserver, nameserver, fallback, fallbackFilter }`
- **页面**：enable、listen、enhancedMode、fakeIpRange、fakeIpFilter、defaultNameserver、nameserver、fallback、fallbackFilter

### T-05 Sniffer 配置

- **命令（3 个）**：`get_sniffer_config` / `set_sniffer_config` / `apply_sniffer_config`
- **模型**：`SnifferConfig { enable, sniff, forceDomain, skipDomain }`
- **页面**：enable、HTTP/TLS/QUIC 协议配置、forceDomain、skipDomain

### T-06 Resources（GeoIP/Provider）

- **命令（7 个）**：`get_geo_config` / `set_geo_config` / `update_geo_data` / `get_proxy_providers` / `update_proxy_provider` / `get_rule_providers` / `update_rule_provider`
- **模型**：`GeoConfig`、`ProxyProviderItem`、`RuleProviderItem`
- **页面**：geodataMode、geoAutoUpdate、geoUpdateInterval、geoxUrl、Proxy/Rule Provider 表格

### T-07 Kernel 配置 + 内核版本管理

- **命令（8 个）**：`get_kernel_settings` / `set_kernel_settings` / `apply_kernel_settings` / `get_core_version_info` / `check_core_update` / `download_and_switch_core` / `get_download_progress` / `cancel_download`
- **模型**：`KernelSettings`、`CoreVersionInfo`
- **页面**：端口、logLevel、allowLan、ipv6、externalController、当前版本、通道选择、下载进度

### 验收标准

- [ ] 6 个模块的 3~8 个命令全部可调用
- [ ] SQLite 持久化正常（重启后值保留）
- [ ] Apply 后 mihomo 热重载正常
- [ ] `lib.rs` 注册所有新模块
- [ ] 6 个页面全部可访问、配置可保存
- [ ] 所有 i18n key 覆盖

---

## Phase 2 — P1 体验增强

**可并行开发（均依赖 Phase 1）**

| ID | 任务 | 说明 | 命令数 |
|----|------|------|--------|
| T-08 | 实时日志流（WebSocket） | `start_log_stream` / `stop_log_stream` / `clear_log_cache`；Logs.tsx 改造 | 3 |
| T-09 | 托盘菜单增强 | 模式切换子菜单、配置切换子菜单、代理组节点选择动态生成 | 0（仅前端） |
| T-10 | 订阅自动更新调度器 | `AutoUpdateScheduler` tokio 后台任务（每 60s 唤醒） | 0（仅调度器） |
| T-11 | 二维码导入 | `decode_qr_from_screen` / `decode_qr_from_file`；Profiles.tsx 新增按钮 | 2 |
| T-12 | 开机自启 | `set_auto_start(enable)` — Win 注册表 / macOS LaunchAgents | 1 |
| T-13 | 工作目录配置与迁移 | `get_work_dir` / `set_work_dir` / `migrate_work_dir` | 3 |

**T-08 日志流补充**：
- Logs.tsx：轮询 → WebSocket + fallback
- `store/proxy.ts` 改造：`addLogs()` / `clearLogs()`
- 事件：`logs:append` / `logs:clear`

**T-10 订阅调度器补充**：
- 启动时 `tokio::spawn`，定时唤醒
- 查 `auto_update=1` 的订阅 → 到点下载 → 更新 mihomo（如激活）
- 发系统通知（tauri-plugin-notification）

---

## Phase 3 — P2 页面与轻量增强

| ID | 任务 | 说明 | 命令数 |
|----|------|------|--------|
| T-14 | Rules 查看页 | `get_rules` / `toggle_rule` / `get_rule_providers_ui`；Rules.tsx | 3 |
| T-15 | 全局快捷键 | tauri-plugin-global-shortcut 代理开关热键 | 0 |
| T-16 | 备份/迁移（压缩包） | `export_work_dir` / `import_work_dir`；Settings.tsx | 2 |

> **已移除（与 SPEC §0.3 对齐）**：Overrides 覆写、MetaCubeXd Dashboard、应用自动更新、WebDAV 同步。

---

## 任务总览

| ID | 任务 | 阶段 | 优先级 | 依赖 | 预计工作量 |
|----|------|------|--------|------|-----------|
| T-01 | Connections 页面 | Phase 0 | P0 | — | ✅ 已完成 |
| T-02 | SysProxy 高级配置 | Phase 1 | P1 | — | 中 |
| T-03 | TUN 配置 | Phase 1 | P1 | T-02 | 中 |
| T-04 | DNS 配置 | Phase 1 | P1 | T-02 | 中 |
| T-05 | Sniffer 配置 | Phase 1 | P1 | T-02 | 中 |
| T-06 | Resources（GeoIP/Provider）| Phase 1 | P1 | T-02 | 中 |
| T-07 | Kernel 配置 + 版本管理 | Phase 1 | P1 | T-02 | 大 |
| T-08 | 实时日志流（WebSocket）| Phase 2 | P1 | T-02 | 中 |
| T-09 | 托盘菜单增强 | Phase 2 | P1 | — | 中 |
| T-10 | 订阅自动更新调度器 | Phase 2 | P1 | — | 中 |
| T-11 | 二维码导入 | Phase 2 | P1 | — | 小 |
| T-12 | 开机自启 | Phase 2 | P1 | — | 小 |
| T-13 | 工作目录配置与迁移 | Phase 2 | P1 | — | 中 |
| T-14 | Rules 查看页 | Phase 3 | P2 | T-04~T-07 | 中 |
| T-15 | 全局快捷键 | Phase 3 | P2 | — | 小 |
| T-16 | 备份/迁移（压缩包）| Phase 3 | P2 | — | 小 |

**已移除（原编号）**：T-11 Overrides 覆写系统、T-13 MetaCubeXd Dashboard、T-18 应用自动更新、T-19 WebDAV 同步。

---

## 开发建议

1. **Phase 1 内部完全并行** — T-02 ~ T-07 各自独立，可同时启动
2. **Phase 2 内部完全并行** — T-08 ~ T-13 各自独立，只需 Phase 1 全部完成
3. **先完成后端再完成前端** — 每阶段先实现 Rust 命令并验证，再开发前端 UI
4. **i18n 随页面同步完成** — 不要留到最后的"批量翻译"阶段
5. **每个阶段结束跑一次 `npm run tauri build`** — 验证没有 regression

---

## 版本规划

| 版本 | 目标 | 包含任务 |
|------|------|---------|
| v0.2.0 | P0 完成 | T-01（已发） |
| v0.3.0 | P1 mihomo 高级配置 | T-02 ~ T-07 |
| v0.4.0 | P1 体验增强 | T-08 ~ T-13 |
| v0.5.0 | P2 页面与轻量增强 | T-14 ~ T-16 + 发版准备 |

> **不再计划**的版本：v0.5.0 覆写系统、v0.6.0 应用自动更新与 WebDAV（已从范围外移除）。
