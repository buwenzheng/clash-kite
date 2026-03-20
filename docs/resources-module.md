# 外部资源模块（/resources）

> 参考 clash-party：集中管理 mihomo 依赖的地理数据库（GeoIP/GeoSite/ASN）与规则/代理 Provider，并支持单个刷新与一键更新。忽略 smart core 与 substore。

---

## 1. 模块概述

`/resources` 统一提供三类能力：
- GeoData：GeoIP / GeoSite / ASN 数据库（dat/mmdb 两种模式）管理与更新
- Proxy Provider：代理订阅源（mihomo providers/proxies）管理与刷新
- Rule Provider：规则订阅源（mihomo providers/rules）管理与刷新

---

## 2. 数据模型（与前后端契约）

### 2.1 GeoxUrl

```rust
pub struct GeoxUrl {
    pub geoip: String,   // geoip.dat / geoip-lite.dat
    pub geosite: String, // geosite.dat
    pub mmdb: String,    // country.mmdb / geoip.metadb
    pub asn: String,     // GeoLite2-ASN.mmdb
}
```

### 2.2 GeoConfig

```rust
pub struct GeoConfig {
    pub geodata_mode: bool,     // false=mmdb, true=dat
    pub geo_auto_update: bool,  // 自动更新开关
    pub geo_update_interval: u32, // 小时，默认 24
    pub geox_url: GeoxUrl,
}
```

### 2.3 ProxyProviderItem

```rust
pub struct ProxyProviderItem {
    pub name: String,
    pub provider_type: String,   // http/file/...
    pub behavior: Option<String>,
    pub node_count: Option<u32>,
    pub updated_at: Option<String>,
    pub url: Option<String>,
}
```

### 2.4 RuleProviderItem

```rust
pub struct RuleProviderItem {
    pub name: String,
    pub provider_type: String, // http/file
    pub behavior: String,      // domain / ipcidr / classical ...
    pub rule_count: Option<u32>,
    pub updated_at: Option<String>,
    pub url: Option<String>,
}
```

---

## 3. 页面交互设计

### 3.1 顶部操作

- `全部更新`：一键更新 Geo 数据（以及按你选择的 parity 更新 provider）

### 3.2 GeoData 区域

- GeoIP / GeoSite / ASN 的更新状态展示（可含 last updated / size）
- Geodata 模式切换：`dat` / `mmdb`
- 自动更新开关与间隔（小时）
- 自定义 URL 输入（4 项）
- 单个更新按钮：调用 mihomo 对应更新（或调用 `/configs/geo` 全量更新）

### 3.3 ProxyProvider 列表

- 列：名称、类型、节点数、更新时间、刷新按钮、查看详情（可选）
- 支持单个刷新与全部刷新（全部刷新可由前端逐个并发/串行触发）

### 3.4 RuleProvider 列表

- 列：名称、行为（behavior）、规则数、更新时间、刷新按钮、查看详情（可选）

---

## 4. 与 mihomo 的交互（关键）

根据 mihomo API 文档：
- `POST /configs/geo`：更新 GEO 数据库
- `GET /providers/proxies` / `PUT /providers/proxies/{name}`：获取/刷新 Proxy Provider
- `GET /providers/rules` / `PUT /providers/rules/{name}`：获取/刷新 Rule Provider

> 注意：Provider 的具体字段结构以 mihomo 返回为准。前端用于展示的关键字段可以从 response 中提取或在后续增强时补齐。

---

## 5. 存储策略

- GeoConfig：建议写入 SQLite key `geo_config`（JSON 序列化）
- provider 列表：由 mihomo 管理，无需本地持久化（但为了列表排序/缓存可做轻量缓存）

---

## 6. Tauri Command 契约（建议新增）

### 6.1 Geo

- `get_geo_config` -> GeoConfig
- `set_geo_config(config: GeoConfig)`（保存；如需应用可选择立即更新或等待）
- `update_geo_data` -> `{ success: bool, updatedAt: string, error?: string }`

### 6.2 Proxy Provider

- `get_proxy_providers` -> ProxyProviderItem[]
- `update_proxy_provider(name: string)` -> void / 更新结果

### 6.3 Rule Provider

- `get_rule_providers` -> RuleProviderItem[]
- `update_rule_provider(name: string)` -> void / 更新结果

---

## 7. 错误处理要点

- GEO 更新失败（网络/URL 无效）：返回错误并保留上一次成功状态
- Provider 刷新失败：标记该 provider 的失败原因（不要影响其他 provider 刷新）
- 空 provider 列表：前端展示“无 provider”而非报错

---

## 8. 实现任务分解（用于后续代码生成）

1. Geo 数据模型与 SQLite 存储：`geo_config`
2. 配置写入与 mihomo API 调用：
   - `POST /configs/geo`
   - 读取 provider 列表：`GET /providers/proxies`、`GET /providers/rules`
3. Tauri commands：8 个（get/set/update for geo + get/update for two provider types）
4. 前端 `/resources` 页面：三栏布局 + 列表联动
5. 自动更新调度（可选增强）：实现 `geo_auto_update` 定时任务

