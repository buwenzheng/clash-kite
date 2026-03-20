# Tauri Command API 参考

本文档列出所有已注册的 Tauri Command 接口，包括参数、返回值和调用链。

> 前端 API 封装位于 `src/api/index.ts`，TypeScript 类型定义位于 `src/types/index.ts`。

---

## 1. 代理相关命令（11 个）

### 1.1 get_proxy_status

获取当前代理状态。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getProxyStatus()` |
| 参数   | 无 |
| 返回值 | `ProxyStatus` |
| 服务调用 | `ProxyService::get_status()` |

**返回值结构：**
```typescript
interface ProxyStatus {
  running: boolean;
  mode: "direct" | "global" | "rule";
  httpPort: number;
  socksPort: number;
  mixedPort: number;
  activeProfile: string | null;
  systemProxy: boolean;
}
```

---

### 1.2 start_proxy

启动 mihomo 代理。自动使用当前激活的配置文件。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `startProxy()` |
| 参数   | 无 |
| 返回值 | `ProxyStatus` |
| 服务调用 | `ProfileService::get_active()` → `ProxyService::start(file_path, name)` |
| 错误   | 无激活配置："No active profile. Please activate a profile first." |

**内部流程：**
1. 查找激活配置
2. 调用 `MihomoManager::start(config_path)`
3. 等待 mihomo API 就绪
4. 从 mihomo API 读取实际端口和模式
5. 更新 ProxyStatus

---

### 1.3 stop_proxy

停止 mihomo 代理。如果系统代理已启用，会先取消。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `stopProxy()` |
| 参数   | 无 |
| 返回值 | `ProxyStatus` |
| 服务调用 | `ProxyService::stop()` |

---

### 1.4 toggle_proxy

切换代理状态。运行中则停止，停止则启动。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `toggleProxy()` |
| 参数   | 无 |
| 返回值 | `ProxyStatus` |
| 服务调用 | `ProxyService::is_running()` → `start()` 或 `stop()` |

---

### 1.5 get_proxy_groups

获取所有代理组及其节点。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getProxyGroups()` |
| 参数   | 无 |
| 返回值 | `ProxyGroup[]` |
| 服务调用 | `ProxyService::get_groups()` → `MihomoApi::get_proxies()` |
| 依赖   | 代理必须运行中 |

**返回值结构：**
```typescript
interface ProxyGroup {
  name: string;
  groupType: string;  // "Selector" | "URLTest" | "Fallback" | ...
  all: string[];
  nodes: ProxyNode[];  // 每个节点的详细信息（类型、延迟历史等）
  now: string | null;
  udp: boolean | null;
  history: DelayHistory[];
}

interface ProxyNode {
  name: string;
  nodeType: string;    // "Shadowsocks" | "VMess" | "Trojan" | "Hysteria2" | ...
  udp: boolean | null;
  history: DelayHistory[];
}
```

---

### 1.6 select_proxy

在指定代理组中选择节点。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `selectProxy(group, name)` |
| 参数   | `group: String` — 组名<br>`name: String` — 节点名 |
| 返回值 | `()` |
| 服务调用 | `ProxyService::select_proxy()` → `MihomoApi::select_proxy()` |
| HTTP   | `PUT /proxies/{group}` body: `{ "name": "{name}" }` |

---

### 1.7 test_proxy_delay

测试单个节点的延迟。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `testProxyDelay(name)` |
| 参数   | `name: String` — 节点名 |
| 返回值 | `DelayResult` |
| 服务调用 | `ProxyService::test_delay()` → `MihomoApi::test_delay()` |
| HTTP   | `GET /proxies/{name}/delay?timeout=5000&url=http://www.gstatic.com/generate_204` |

**返回值结构：**
```typescript
interface DelayResult {
  name: string;
  delay: number | null;     // 延迟毫秒数，失败时为 null
  error: string | null;     // 错误信息，成功时为 null
}
```

---

### 1.8 set_proxy_mode

切换代理模式。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `setProxyMode(mode)` |
| 参数   | `mode: String` — "direct" \| "global" \| "rule" |
| 返回值 | `()` |
| 服务调用 | `ProxyService::set_mode()` → `MihomoApi::set_mode()` |
| HTTP   | `PATCH /configs` body: `{ "mode": "{mode}" }` |

---

### 1.9 set_system_proxy

设置或取消系统代理。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `setSystemProxy(enable)` |
| 参数   | `enable: bool` |
| 返回值 | `()` |
| 服务调用 | `ProxyService::set_system_proxy()` → `sysproxy::set_system_proxy()` |

**平台差异：**
- Windows：修改注册表 + InternetSetOptionW
- macOS：执行 networksetup 命令

---

### 1.10 get_traffic

获取实时流量数据（上行/下行字节数/秒）。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getTraffic()` |
| 参数   | 无 |
| 返回值 | `TrafficData` |
| 服务调用 | `ProxyService::get_traffic()` → `MihomoApi::get_traffic()` |
| HTTP   | `GET /traffic` |

**返回值结构：**
```typescript
interface TrafficData {
  up: number;    // 上行字节/秒
  down: number;  // 下行字节/秒
}
```

---

### 1.11 get_mihomo_log

获取 mihomo 日志文件末尾内容。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getMihomoLog(lines?)` |
| 参数   | `lines: Option<usize>` — 行数，默认 100 |
| 返回值 | `String` |
| 服务调用 | `MihomoManager::read_log_tail(lines)` |

---

## 2. 配置相关命令（13 个）

### 2.1 get_profiles

获取所有配置列表。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getProfiles()` |
| 参数   | 无 |
| 返回值 | `ProfileInfo[]` |
| 服务调用 | `ProfileService::get_all()` |
| SQL    | `SELECT ... FROM profiles ORDER BY name` |

**返回值结构：**
```typescript
interface ProfileInfo {
  id: string;
  name: string;
  source: "local" | "subscription";
  filePath: string;
  subscriptionUrl: string | null;
  updatedAt: string;
  isActive: boolean;
  autoUpdate: boolean;              // 是否开启自动更新
  autoUpdateInterval: number;       // 自动更新间隔（分钟），默认 480
}
```

---

### 2.2 get_active_profile

获取当前激活的配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getActiveProfile()` |
| 参数   | 无 |
| 返回值 | `ProfileInfo \| null` |
| 服务调用 | `ProfileService::get_active()` |

---

### 2.3 import_profile_file

从本地文件导入配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `importProfileFile(filePath, name)` |
| 参数   | `file_path: String` — 源文件路径<br>`name: String` — 配置名称 |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::import_file()` |

**流程：** 校验文件存在 → 读取并校验 YAML → 生成 UUID → 复制文件 → 插入 DB

---

### 2.4 import_profile_subscription

从订阅 URL 导入配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `importProfileSubscription(url, name)` |
| 参数   | `url: String` — 订阅链接<br>`name: String` — 配置名称 |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::import_subscription()` |

**流程：** 下载内容（30s 超时）→ base64 自动检测/解码 → 校验 YAML → 写入文件 → 插入 DB

---

### 2.5 update_profile_subscription

更新已有的订阅配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `updateProfileSubscription(id)` |
| 参数   | `id: String` — 配置 ID |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::update_subscription()` |
| 错误   | 非订阅类型："Not a subscription profile" |

**流程：** 查找配置 → 获取 URL → 下载新内容 → 覆盖文件 → 更新时间戳

---

### 2.6 delete_profile

删除配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `deleteProfile(id)` |
| 参数   | `id: String` — 配置 ID |
| 返回值 | `()` |
| 服务调用 | `ProfileService::delete()` |

**流程：** 查找配置 → 删除 YAML 文件 → 删除 DB 记录

---

### 2.7 activate_profile

激活指定配置，如果代理运行中则热重载。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `activateProfile(id)` |
| 参数   | `id: String` — 配置 ID |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::activate()` + `ProxyService::restart()`（如果运行中） |

**流程：** 取消所有激活 → 激活指定配置 → 如果代理运行中 → 停止 → 等待 300ms → 使用新配置启动

---

### 2.8 update_profile_info

更新配置的名称和订阅 URL。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `updateProfileInfo(id, name, subscriptionUrl?)` |
| 参数   | `id: String`<br>`name: String`<br>`subscription_url: Option<String>` |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::update_info()` |

---

### 2.9 export_profile

导出配置文件到指定路径。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `exportProfile(id, destPath)` |
| 参数   | `id: String`<br>`dest_path: String` — 目标文件路径 |
| 返回值 | `()` |
| 服务调用 | `ProfileService::export_profile()` |

---

### 2.10 read_profile_content

读取配置文件的 YAML 内容。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `readProfileContent(id)` |
| 参数   | `id: String` |
| 返回值 | `String` — YAML 内容 |
| 服务调用 | `ProfileService::read_content()` → `fs::read_to_string()` |

---

### 2.11 save_profile_content

保存编辑后的 YAML 内容。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `saveProfileContent(id, content)` |
| 参数   | `id: String`<br>`content: String` — YAML 内容 |
| 返回值 | `()` |
| 服务调用 | `ProfileService::save_content()` |
| 校验   | 保存前进行 YAML 语法校验 |

---

### 2.12 set_profile_auto_update

设置单个订阅配置的自动更新策略。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `setProfileAutoUpdate(id, autoUpdate, autoUpdateInterval)` |
| 参数   | `id: String` — 配置 ID<br>`auto_update: bool` — 是否启用<br>`auto_update_interval: u32` — 间隔（分钟，最小 10） |
| 返回值 | `ProfileInfo` |
| 服务调用 | `ProfileService::set_auto_update()` |
| 校验   | interval >= 10，否则返回错误；仅 subscription 类型可设置 |

---

### 2.13 update_all_auto_update_profiles

立即更新所有已开启自动更新的订阅配置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `updateAllAutoUpdateProfiles()` |
| 参数   | 无 |
| 返回值 | `AutoUpdateResult[]` |
| 服务调用 | `ProfileService::get_auto_update_candidates()` → 逐个 `update_subscription()` |

**返回值结构：**

```typescript
interface AutoUpdateResult {
  profileId: string;
  profileName: string;
  success: boolean;
  error: string | null;
  hotReloaded: boolean;
  updatedAt: string;
}
```

**流程：** 查询所有 auto_update=true 的订阅配置 → 逐个下载更新 → 激活配置且代理运行中则热重载 → 发送系统通知 → 返回每个配置的更新结果

---

## 3. 设置相关命令（2 个）

### 3.1 get_settings

获取应用设置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getSettings()` |
| 参数   | 无 |
| 返回值 | `AppSettings` |
| 服务调用 | `SettingsService::get()` |

**返回值结构：**
```typescript
interface AppSettings {
  theme: string;           // "light" | "dark" | "system"
  language: string;        // "zh" | "en"
  autoStart: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  systemProxy: boolean;
  tunMode: boolean;
}
```

---

### 3.2 save_settings

保存应用设置。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `saveSettings(settings)` |
| 参数   | `settings: AppSettings` — 完整设置对象 |
| 返回值 | `()` |
| 服务调用 | `SettingsService::save()` |

---

## 4. 规则与覆写相关命令（计划中 — P2）

> 详细设计见 [rules-module.md](rules-module.md)

### 4.1 get_rules

获取当前生效的代理规则列表。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getRules()` |
| 参数   | 无 |
| 返回值 | `RuleItem[]` |
| 服务调用 | `RulesService::get_rules()` → `MihomoApi::get_rules()` |
| HTTP   | `GET /rules` |
| 依赖   | 代理必须运行中 |

**返回值结构：**
```typescript
interface RuleItem {
  ruleType: string;    // "DOMAIN" | "DOMAIN-SUFFIX" | "IP-CIDR" | "GEOIP" | "MATCH" | ...
  payload: string;     // 匹配目标
  proxy: string;       // 策略组名称
  size: number | null;  // RULE-SET 规则数量
}
```

---

### 4.2 get_rule_providers

获取所有 Rule Provider。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getRuleProviders()` |
| 参数   | 无 |
| 返回值 | `RuleProvider[]` |
| 服务调用 | `RulesService::get_providers()` → `MihomoApi::get_providers()` |
| HTTP   | `GET /providers/rules` |

**返回值结构：**
```typescript
interface RuleProvider {
  name: string;
  providerType: string;   // "http" | "file"
  behavior: string;       // "domain" | "ipcidr" | "classical"
  ruleCount: number;
  updatedAt: string | null;
  url: string | null;
  format: string | null;
  vehicleType: string;    // "HTTP" | "File"
}
```

---

### 4.3 update_rule_provider

刷新指定的 Rule Provider。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `updateRuleProvider(name)` |
| 参数   | `name: String` — Provider 名称 |
| 返回值 | `()` |
| HTTP   | `PUT /providers/rules/{name}` |

---

### 4.4 get_overrides

获取所有覆写项列表。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `getOverrides()` |
| 参数   | 无 |
| 返回值 | `OverrideItem[]` |
| 服务调用 | `OverrideService::get_all()` |

**返回值结构：**
```typescript
interface OverrideItem {
  id: string;
  name: string;
  overrideType: "local" | "remote";
  ext: "yaml" | "js";
  url: string | null;
  filePath: string;
  global: boolean;
  enabled: boolean;
  order: number;
  updatedAt: string;
}
```

---

### 4.5 create_override

新建空覆写文件。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `createOverride(name, ext, global)` |
| 参数   | `name: String`<br>`ext: String` — "yaml" \| "js"<br>`global: bool` |
| 返回值 | `OverrideItem` |
| 服务调用 | `OverrideService::create()` |

---

### 4.6 save_override_content

保存覆写文件内容。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `saveOverrideContent(id, content)` |
| 参数   | `id: String`<br>`content: String` |
| 返回值 | `()` |
| 服务调用 | `OverrideService::save_content()` |
| 校验   | YAML：校验语法；JS：尝试执行检查语法 |

---

### 4.7 set_profile_overrides

设置订阅配置关联的覆写列表。

| 项目   | 值 |
| ------ | -- |
| 前端函数 | `setProfileOverrides(profileId, overrideIds)` |
| 参数   | `profile_id: String`<br>`override_ids: Vec<String>` |
| 返回值 | `()` |
| 服务调用 | `OverrideService::set_profile_overrides()` |

---

## 4.8 系统代理/TUN/外部资源/日志/连接/内核/DNS/Sniffer 相关命令（计划中）

> 本节命令尚未在当前仓库后端实现，但用于后续 AI 生成代码时的”IPC 契约”参考。

### 4.8.1 系统代理（`/sysproxy`）

#### 4.8.1.1 get_sysproxy_advanced_config

- 返回：`SysProxyAdvancedConfig`
- 服务调用：`SysProxyService::get_advanced_config()`

#### 4.8.1.2 set_sysproxy_advanced_config

- 参数：`SysProxyAdvancedConfig`
- 行为：写入 SQLite + 如 mihomo 运行则应用

#### 4.8.1.3 reset_sysproxy_advanced_defaults

- 行为：恢复默认绕过与 PAC 策略，并应用当前保存的 enable 状态

---

### 4.8.2 TUN 虚拟网卡（`/tun`）

#### 4.8.2.1 get_tun_config

- 返回：`TunConfig`

#### 4.8.2.2 set_tun_config

- 参数：`TunConfig`
- 行为：写入 SQLite + 重载/重启 mihomo 以应用新配置（如代理正在运行）

#### 4.8.2.3 reset_tun_firewall_windows（可选）

- 行为：重置 Windows 防火墙规则

---

### 4.8.3 外部资源（`/resources`）

#### 4.8.3.1 get_geo_config

- 返回：`GeoConfig`

#### 4.8.3.2 set_geo_config

- 参数：`GeoConfig`
- 行为：写入 SQLite

#### 4.8.3.3 update_geo_data

- 行为：调用 mihomo `POST /configs/geo`

#### 4.8.3.4 get_proxy_providers

- 返回：`ProxyProviderItem[]`
- HTTP：`GET /providers/proxies`

#### 4.8.3.5 update_proxy_provider

- 参数：`name: String`
- HTTP：`PUT /providers/proxies/{name}`

#### 4.8.3.6 get_rule_providers

- 返回：`RuleProviderItem[]`
- HTTP：`GET /providers/rules`

#### 4.8.3.7 update_rule_provider

- 参数：`name: String`
- HTTP：`PUT /providers/rules/{name}`

---

### 4.8.4 日志（`/logs`）

#### 4.8.4.1 start_log_stream（建议新增）

- 参数：`level?: LogLevel | "all"`
- 行为：优先连接 mihomo `WS /logs`；失败则 fallback 到 tail/轮询
- 事件：`log:new`（payload: `LogItem`）

#### 4.8.4.2 stop_log_stream（建议新增）

- 行为：停止日志流任务

#### 4.8.4.3 clear_log_cache（建议新增）

- 行为：清空前端 buffer 或截断本地 `mihomo.log`（按实现选择）

---

### 4.8.5 连接管理（`/connections`）

#### 4.8.5.1 start_connections_stream（建议新增）

- 参数：`interval_ms?: number`（默认 1000）
- 行为：通过 `GET/WS /connections` 轮询/订阅并向前端推送快照或增量
- 事件：`connections:active`（payload: `ConnectionItem[]` 或增量）

#### 4.8.5.2 stop_connections_stream（建议新增）

- 行为：停止任务

#### 4.8.5.3 get_connections_snapshot（建议新增）

- 参数：`mode: "active" | "closed"`, `limit?`, `offset?`, `sort?`
- 返回：`ConnectionItem[]`

#### 4.8.5.4 close_connection（建议新增）

- 参数：`id: String`
- HTTP：`DELETE /connections/:id`

#### 4.8.5.5 close_all_connections（建议新增）

- HTTP：`DELETE /connections`

---

### 4.8.6 内核设置（`/kernel`）

#### 4.8.6.1 get_kernel_settings

- 返回：`KernelSettings`

#### 4.8.6.2 set_kernel_settings

- 参数：`KernelSettings`
- 行为：写入 SQLite

#### 4.8.6.3 apply_kernel_settings

- 行为：生成最终 mihomo 配置片段并重启/重载内核（可用 `POST /restart` 兜底）

---

### 4.8.7 DNS 配置（`/dns`）

#### 4.8.7.1 get_dns_config

- 返回：`DnsConfig`
- 行为：从 SQLite 读取（key: `dns_config`），不存在返回默认值

#### 4.8.7.2 set_dns_config

- 参数：`DnsConfig`
- 行为：写入 SQLite

#### 4.8.7.3 apply_dns_config

- 行为：将 DnsConfig 注入最终配置的 `dns` 字段 + 重启/重载内核

---

### 4.8.8 Sniffer 域名嗅探（`/sniffer`）

#### 4.8.8.1 get_sniffer_config

- 返回：`SnifferConfig`
- 行为：从 SQLite 读取（key: `sniffer_config`），不存在返回默认值

#### 4.8.8.2 set_sniffer_config

- 参数：`SnifferConfig`
- 行为：写入 SQLite

#### 4.8.8.3 apply_sniffer_config

- 行为：将 SnifferConfig 注入最终配置的 `sniffer` 字段 + 重启/重载内核

---

### 4.8.9 内核版本管理

#### 4.8.9.1 get_core_version_info

- 返回：`CoreVersionInfo`
- 行为：读取当前 mihomo 版本（`mihomo -v`），读取 SQLite 中保存的通道偏好

#### 4.8.9.2 check_core_update

- 参数：`channel: "stable" | "alpha"`
- 返回：`{ version: string, downloadUrl: string, hasUpdate: boolean }`
- 行为：请求 GitHub Releases API

#### 4.8.9.3 download_and_switch_core

- 参数：`channel: "stable" | "alpha"`, `version: string`
- 返回：`CoreVersionInfo`
- 行为：停止 mihomo → 下载新版本 → 替换二进制 → 重启
- 事件：`core:download-progress`（payload: `{ downloaded: number, total: number }`）

---

### 4.8.10 二维码导入

#### 4.8.10.1 decode_qr_from_screen

- 返回：`String | null`
- 行为：截屏并识别二维码，返回解析到的 URL

#### 4.8.10.2 decode_qr_from_file

- 参数：`file_path: String`
- 返回：`String | null`
- 行为：从图片文件识别二维码，返回解析到的 URL

---

### 4.8.11 工作目录 & Dashboard

#### 4.8.11.1 get_work_dir

- 返回：`String`
- 行为：返回当前工作目录路径

#### 4.8.11.2 set_work_dir

- 参数：`path: String`
- 行为：设置新工作目录，提示重启

#### 4.8.11.3 migrate_work_dir

- 参数：`from: String`, `to: String`
- 行为：迁移数据到新目录

#### 4.8.11.4 open_dashboard

- 行为：在系统浏览器中打开 MetaCubeXd Dashboard

#### 4.8.11.5 download_dashboard

- 行为：下载 metacubexd 资源到 data/ui/ 目录

---

## 5. 文件对话框（前端独立）

以下函数不经过 Tauri Command，直接使用 `@tauri-apps/plugin-dialog`：

### 4.1 openConfigFile

```typescript
async function openConfigFile(): Promise<string | null>
```

调用原生文件打开对话框，过滤 `.yaml` / `.yml` 文件。返回选中文件路径或 null。

### 4.2 saveConfigFile

```typescript
async function saveConfigFile(defaultName: string): Promise<string | null>
```

调用原生文件保存对话框，默认文件名由参数指定。返回保存路径或 null。

---

## 5. 类型定义汇总

所有 TypeScript 类型定义位于 `src/types/index.ts`：

```typescript
// 代理
type ProxyMode = "direct" | "global" | "rule";
interface DelayHistory { time: string; delay: number; }
interface ProxyNode { name, nodeType, udp, history }
interface ProxyGroup { name, groupType, all, nodes, now, udp, history }
interface ProxyStatus { running, mode, httpPort, socksPort, mixedPort, activeProfile, systemProxy }
interface TrafficData { up: number; down: number; }
interface DelayResult { name, delay, error }

// 配置
type ProfileSource = "local" | "subscription";
interface ProfileInfo { id, name, source, filePath, subscriptionUrl, updatedAt, isActive, autoUpdate, autoUpdateInterval }
interface AutoUpdateResult { profileId, profileName, success, error, hotReloaded, updatedAt }

// 设置
interface AppSettings { theme, language, autoStart, minimizeToTray, startMinimized, systemProxy, tunMode }

// 系统代理（计划中）
type SysProxyMode = "manual" | "auto";
interface SysProxyAdvancedConfig { enable, mode: SysProxyMode, host, bypass: string[], pacScript: string | null }

// TUN（计划中）
type TunStack = "mixed" | "system" | "gvisor";
interface TunConfig { enable, stack: TunStack, device, dnsHijack: string[], autoRoute: boolean, autoDetectInterface: boolean, strictRoute: boolean, mtu: number, routeExcludeAddress: string[] }

// 外部资源（计划中）
interface GeoxUrl { geoip: string, geosite: string, mmdb: string, asn: string }
interface GeoConfig { geodataMode: boolean, geoAutoUpdate: boolean, geoUpdateInterval: number, geoxUrl: GeoxUrl }
interface ProxyProviderItem { name: string, providerType: string, behavior?: string, nodeCount?: number, updatedAt?: string | null, url?: string | null }
interface RuleProviderItem { name: string, providerType: string, behavior: string, ruleCount?: number, updatedAt?: string | null, url?: string | null }

// 日志与连接（计划中）
type LogLevel = "debug" | "info" | "warning" | "error";
interface LogItem { ts: string, level: LogLevel, message: string, raw?: string }
interface ConnectionItem { id: string, src: string, dst: string, protocol: string, proxy: string | null, trafficUp?: number, trafficDown?: number, duration?: number, state?: string, raw?: any }

// 内核设置（计划中）
interface KernelSettings {
  ports: { mixedPort: number, socksPort: number, httpPort: number };
  logLevel: "silent" | "error" | "warning" | "info" | "debug";
  allowLan: boolean;
  ipv6: boolean;
  externalController: { enabled: boolean, host: string, port: number, secret: string | null };
  advanced?: { unifiedDelay?: boolean, tcpConcurrent?: boolean, findProcessMode?: string, storeSelected?: boolean };
  processPriority: "low" | "below_normal" | "normal" | "above_normal" | "high" | "realtime";  // 仅 Windows
}

// 内核版本（计划中）
interface CoreVersionInfo { currentVersion: string, currentChannel: "stable" | "alpha", latestStable: string | null, latestAlpha: string | null, downloading: boolean }

// DNS 配置（计划中）
interface DnsConfig {
  enable: boolean, listen: string, enhancedMode: "fake-ip" | "redir-host",
  fakeIpRange: string, fakeIpFilter: string[],
  defaultNameserver: string[], nameserver: string[], fallback: string[],
  fallbackFilter: { geoip: boolean, geoipCode: string, ipcidr: string[] }
}

// Sniffer 配置（计划中）
interface SniffProtocol { ports: string[], overrideDestination: boolean }
interface SnifferConfig {
  enable: boolean,
  sniff: { HTTP?: SniffProtocol, TLS?: SniffProtocol, QUIC?: SniffProtocol },
  forceDomain: string[], skipDomain: string[], portWhitelist: string[]
}

// 规则（计划中 — P2）
interface RuleItem { ruleType, payload, proxy, size }
interface RuleProvider { name, providerType, behavior, ruleCount, updatedAt, url, format, vehicleType }

// 覆写（计划中 — P2）
interface OverrideItem { id, name, overrideType, ext, url, filePath, global, enabled, order, updatedAt }
```

所有 Rust 模型使用 `#[serde(rename_all = "camelCase")]`，确保 JSON 序列化时字段名与 TypeScript 类型对齐（如 `file_path` → `filePath`）。

---

## 6. 错误处理约定

所有 Tauri Command 的返回值类型为 `Result<T, String>`：
- 成功：返回序列化后的数据
- 失败：返回错误消息字符串

前端 `invoke()` 在失败时 reject Promise，Store 层统一 catch 并设置 `error` 状态。
