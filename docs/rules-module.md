# 规则管理与覆写系统模块详细设计

## 1. 模块概述

本模块涵盖代理规则查看、覆写系统（YAML + JavaScript）、Rule Provider 管理三大功能领域，属于 P2 优先级。参考 [clash-party](https://github.com/mihomo-party-org/clash-party) 的覆写与规则管理能力设计。

**涉及文件（计划中）：**

| 层级     | 文件                                      | 职责                          |
| -------- | ----------------------------------------- | ----------------------------- |
| 前端页面 | `src/pages/Rules.tsx`                     | 规则列表、搜索、统计、开关    |
| 前端页面 | `src/pages/Overrides.tsx`                 | 覆写文件管理、编辑器          |
| Store    | `src/store/rules.ts`                      | useRulesStore                 |
| Store    | `src/store/overrides.ts`                  | useOverridesStore             |
| API      | `src/api/index.ts`                        | 规则/覆写相关函数             |
| 命令层   | `src-tauri/src/commands/rules.rs`         | 规则相关 Tauri Command        |
| 命令层   | `src-tauri/src/commands/overrides.rs`     | 覆写相关 Tauri Command        |
| 服务层   | `src-tauri/src/services/rules.rs`         | RulesService                  |
| 服务层   | `src-tauri/src/services/overrides.rs`     | OverrideService               |
| 核心层   | `src-tauri/src/core/mihomo_api.rs`        | 新增规则相关 mihomo API       |
| 核心层   | `src-tauri/src/core/override_engine.rs`   | 覆写合并引擎（YAML+JS）      |
| 模型     | `src-tauri/src/models/rules.rs`           | 规则数据结构                  |
| 模型     | `src-tauri/src/models/overrides.rs`       | 覆写数据结构                  |

---

## 2. 规则查看

### 2.1 数据来源

规则数据来自 mihomo 内核 API：

```
GET /rules
  → 返回当前生效的规则列表
  → 每条规则包含 type、payload、proxy 以及统计信息
```

### 2.2 数据模型

**Rust 端：**

```rust
pub struct RuleItem {
    pub rule_type: String,       // "DOMAIN" | "DOMAIN-SUFFIX" | "IP-CIDR" | "GEOIP" | "MATCH" | ...
    pub payload: String,         // 匹配目标（域名、IP、国家代码等）
    pub proxy: String,           // 策略组名称
    pub size: Option<i64>,       // RULE-SET 规则数量
}

pub struct RuleDetail {
    pub rule_type: String,
    pub payload: String,
    pub proxy: String,
    pub size: Option<i64>,
}

pub struct RulesResponse {
    pub rules: Vec<RuleDetail>,
}
```

**TypeScript 端：**

```typescript
interface RuleItem {
  ruleType: string;
  payload: string;
  proxy: string;
  size: number | null;
}
```

### 2.3 mihomo API 扩展

| 方法             | HTTP 请求                                   | 用途               |
| ---------------- | ------------------------------------------- | ------------------ |
| get_rules        | `GET /rules`                                | 获取当前生效规则   |
| get_providers    | `GET /providers/rules`                      | 获取 Rule Provider |
| update_provider  | `PUT /providers/rules/{name}`               | 更新指定 Provider  |

### 2.4 前端页面设计

```
┌────────────────────────────────────────────────────────────┐
│ 规则                                            [刷新]     │
├────────────────────────────────────────────────────────────┤
│ 🔍 搜索规则... (payload / type / proxy)     总计: 1234 条  │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Rule Provider                                          │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                │ │
│ │ │ reject    │ │ direct   │ │ proxy    │  ...           │ │
│ │ │ domain    │ │ domain   │ │ domain   │                │ │
│ │ │ 2340 条   │ │ 156 条   │ │ 892 条   │                │ │
│ │ │     [🔄]  │ │     [🔄]  │ │     [🔄]  │                │ │
│ │ └──────────┘ └──────────┘ └──────────┘                │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  #   │ 类型          │ 匹配内容          │ 策略组   │      │
│ ─────┼───────────────┼───────────────────┼──────────┼───── │
│  1   │ DOMAIN-SUFFIX │ google.com        │ PROXY    │      │
│  2   │ DOMAIN        │ api.github.com    │ PROXY    │      │
│  3   │ IP-CIDR       │ 192.168.0.0/16    │ DIRECT   │      │
│  4   │ GEOIP         │ CN                │ DIRECT   │      │
│  5   │ RULE-SET      │ reject (2340)     │ REJECT   │      │
│ ...  │ ...           │ ...               │ ...      │      │
│ 1234 │ MATCH         │ *                 │ PROXY    │      │
└────────────────────────────────────────────────────────────┘
```

### 2.5 搜索过滤

全局搜索框，对 `payload`、`ruleType`、`proxy` 三个字段进行不区分大小写的模糊匹配：

```typescript
function filterRules(rules: RuleItem[], query: string): RuleItem[] {
  if (!query) return rules;
  const q = query.toLowerCase();
  return rules.filter(r =>
    r.payload.toLowerCase().includes(q) ||
    r.ruleType.toLowerCase().includes(q) ||
    r.proxy.toLowerCase().includes(q)
  );
}
```

### 2.6 虚拟列表

规则数量可能达到数千条，使用 `@tanstack/react-virtual` 优化渲染：

- 固定行高 40px
- 仅渲染视口内可见行
- 搜索过滤后重新计算虚拟列表

### 2.7 规则类型说明

| mihomo 规则类型     | 说明                           | 匹配示例               |
| ------------------- | ------------------------------ | ---------------------- |
| DOMAIN              | 精确域名匹配                   | `google.com`           |
| DOMAIN-SUFFIX       | 域名后缀匹配                   | `.google.com`          |
| DOMAIN-KEYWORD      | 域名关键字匹配                 | `google`               |
| DOMAIN-REGEX        | 域名正则匹配                   | `.*\.google\.com$`     |
| IP-CIDR             | IPv4 CIDR 匹配                 | `192.168.0.0/16`       |
| IP-CIDR6            | IPv6 CIDR 匹配                 | `::1/128`              |
| GEOIP               | GeoIP 国家代码匹配             | `CN`                   |
| GEOSITE             | GeoSite 域名集匹配             | `google`               |
| SRC-PORT            | 源端口匹配                     | `8080`                 |
| DST-PORT            | 目标端口匹配                   | `443`                  |
| PROCESS-NAME        | 进程名匹配                     | `chrome.exe`           |
| RULE-SET            | 引用外部规则集                 | `provider-name`        |
| MATCH               | 兜底规则（匹配所有）           | 无                     |

---

## 3. Rule Provider 管理

### 3.1 数据模型

```rust
pub struct RuleProvider {
    pub name: String,
    pub provider_type: String,       // "http" | "file"
    pub behavior: String,            // "domain" | "ipcidr" | "classical"
    pub rule_count: u64,
    pub updated_at: Option<String>,
    pub url: Option<String>,         // HTTP 类型的 URL
    pub format: Option<String>,      // "yaml" | "mrs" (mihomo rule set)
    pub vehicle_type: String,        // "HTTP" | "File"
}
```

```typescript
interface RuleProvider {
  name: string;
  providerType: string;
  behavior: string;
  ruleCount: number;
  updatedAt: string | null;
  url: string | null;
  format: string | null;
  vehicleType: string;
}
```

### 3.2 Provider 卡片 UI

每个 Rule Provider 以卡片形式展示在规则列表上方：

```
┌──────────────────┐
│ provider-name    │
│ behavior: domain │
│ 规则数: 2340     │
│ 更新: 2h ago     │
│          [🔄刷新] │
└──────────────────┘
```

### 3.3 刷新 Provider

```
用户点击刷新按钮
  → updateRuleProvider(name)
    → PUT /providers/rules/{name}
      → mihomo 重新拉取规则集
    → getRuleProviders() 刷新列表
```

### 3.4 添加新 Provider

通过覆写系统添加新的 rule-provider，而非直接修改配置。在覆写编辑器中：

```yaml
rule-providers:
  my-custom-rules:
    type: http
    url: "https://example.com/rules.yaml"
    behavior: domain
    interval: 86400

+rules:
  - RULE-SET,my-custom-rules,PROXY
```

---

## 4. 覆写系统（Override）

### 4.1 核心概念

覆写是在订阅配置的基础上叠加自定义修改的机制，确保订阅更新后自定义规则不会丢失。

**配置生成流程：**

```
原始订阅配置 (profiles/{id}.yaml)
  │
  ▼
应用全局覆写 (global=true 的覆写项，按顺序)
  │
  ▼
应用订阅级覆写 (该订阅关联的覆写项，按顺序)
  │
  ▼
写入最终配置 (data/config.yaml)
  │
  ▼
mihomo 加载最终配置
```

### 4.2 数据模型

**Rust 端：**

```rust
pub struct OverrideItem {
    pub id: String,                      // UUID
    pub name: String,                    // 用户自定义名称
    pub override_type: OverrideType,     // Local | Remote
    pub ext: OverrideExt,                // Yaml | Js
    pub url: Option<String>,             // Remote 类型的 URL
    pub file_path: String,              // 覆写文件路径
    pub global: bool,                    // 是否全局覆写
    pub enabled: bool,                   // 是否启用
    pub order: i32,                      // 排序权重
    pub updated_at: String,              // 最后更新时间
}

pub enum OverrideType {
    Local,
    Remote,
}

pub enum OverrideExt {
    Yaml,
    Js,
}
```

**TypeScript 端：**

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

### 4.3 数据库 Schema

```sql
CREATE TABLE IF NOT EXISTS overrides (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'local',   -- 'local' | 'remote'
    ext         TEXT NOT NULL DEFAULT 'yaml',    -- 'yaml' | 'js'
    url         TEXT,
    file_path   TEXT NOT NULL,
    global      INTEGER NOT NULL DEFAULT 0,
    enabled     INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL
);

-- 订阅与覆写的关联表
CREATE TABLE IF NOT EXISTS profile_overrides (
    profile_id  TEXT NOT NULL,
    override_id TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (profile_id, override_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (override_id) REFERENCES overrides(id) ON DELETE CASCADE
);
```

### 4.4 覆写文件存储

```
~/.config/clash-kite/
  └── overrides/
      ├── {uuid}.yaml      # YAML 覆写文件
      └── {uuid}.js         # JS 覆写文件
```

---

## 5. YAML 覆写

### 5.1 合并策略（Deep Merge）

YAML 覆写采用深度合并，对不同数据类型有不同策略：

**简单值（标量）：** 直接覆盖

```yaml
# 覆写
mixed-port: 7893
mode: global
```

**嵌套对象：** 递归合并

```yaml
# 原始
dns:
  enable: true
  nameserver:
    - 8.8.8.8

# 覆写
dns:
  enhanced-mode: fake-ip

# 结果
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver:
    - 8.8.8.8
```

**嵌套对象 + `!` 后缀：** 整块覆盖（不合并）

```yaml
# 覆写（dns 整块替换）
dns!:
  enable: false
```

**数组：** 三种操作方式

| 写法          | 行为                       | 示例                              |
| ------------- | -------------------------- | --------------------------------- |
| `rules:`      | 整体替换                   | 替换所有规则                      |
| `+rules:`     | 前插（prepend）            | 在现有规则之前插入                |
| `rules+:`     | 后追（append）             | 在现有规则之后追加                |

```yaml
# 在规则最前面插入
+rules:
  - DOMAIN,my-site.com,DIRECT
  - DOMAIN-SUFFIX,internal.corp,DIRECT

# 在规则最后面追加
rules+:
  - DOMAIN,fallback.com,PROXY
```

### 5.2 合并引擎实现

```rust
fn deep_merge(base: &mut serde_yaml::Value, patch: &serde_yaml::Value) {
    match (base, patch) {
        (Value::Mapping(base_map), Value::Mapping(patch_map)) => {
            for (key, patch_val) in patch_map {
                let key_str = key.as_str().unwrap_or("");

                if key_str.ends_with('!') {
                    // 整块覆盖：去掉 ! 后缀作为 key
                    let real_key = &key_str[..key_str.len() - 1];
                    base_map.insert(
                        Value::String(real_key.to_string()),
                        patch_val.clone(),
                    );
                } else if key_str.starts_with('+') {
                    // +key: 前插数组
                    let real_key = &key_str[1..];
                    prepend_array(base_map, real_key, patch_val);
                } else if key_str.ends_with('+') {
                    // key+: 后追数组
                    let real_key = &key_str[..key_str.len() - 1];
                    append_array(base_map, real_key, patch_val);
                } else {
                    // 递归合并
                    let entry = base_map.entry(key.clone())
                        .or_insert(Value::Null);
                    deep_merge(entry, patch_val);
                }
            }
        }
        (base, patch) => {
            *base = patch.clone();
        }
    }
}
```

---

## 6. JavaScript 覆写

### 6.1 入口函数

JS 覆写必须导出 `main` 函数，接收当前配置对象并返回修改后的配置：

```javascript
function main(config) {
  // 在规则最前面插入自定义规则
  config.rules = config.rules || [];
  config.rules.unshift(
    "DOMAIN,my-site.com,DIRECT",
    "DOMAIN-SUFFIX,.internal.corp,DIRECT"
  );

  // 修改 DNS 设置
  config.dns = config.dns || {};
  config.dns["enhanced-mode"] = "fake-ip";

  // 添加自定义代理组
  config["proxy-groups"] = config["proxy-groups"] || [];
  config["proxy-groups"].push({
    name: "My Group",
    type: "select",
    proxies: ["DIRECT", "REJECT"],
  });

  return config;
}
```

### 6.2 执行环境

使用 Rust 端的轻量 JS 运行时执行覆写脚本：

**技术选型**：`boa_engine` crate（纯 Rust JS 引擎，无外部依赖）

```rust
fn execute_js_override(script: &str, config: serde_yaml::Value) -> Result<serde_yaml::Value> {
    let mut context = boa_engine::Context::default();

    // 将 YAML config 转为 JSON 注入 JS 上下文
    let config_json = serde_json::to_string(&config)?;
    let js_code = format!(
        r#"
        var __config = {};
        {}
        JSON.stringify(main(__config));
        "#,
        config_json, script
    );

    let result = context.eval(Source::from_bytes(&js_code))?;
    let result_str = result.to_string(&mut context)?
        .to_std_string_escaped();

    let modified: serde_yaml::Value = serde_json::from_str(&result_str)?;
    Ok(modified)
}
```

### 6.3 安全限制

- 无文件系统访问
- 无网络访问
- 执行超时：5 秒
- 内存限制：通过 boa_engine 的资源限制配置

### 6.4 日志支持

覆写 `console.log` 等函数，将输出写入日志文件：

```
~/.config/clash-kite/overrides/{uuid}.log
```

前端可通过"查看日志"按钮查看执行日志，方便调试。

---

## 7. 覆写应用流程

### 7.1 触发时机

覆写在以下场景被应用：

| 触发事件               | 说明                                 |
| ---------------------- | ------------------------------------ |
| 激活配置               | `activate_profile()` 时生成最终配置  |
| 代理启动               | `start_proxy()` 时生成最终配置       |
| 订阅更新               | 更新后重新应用覆写生成最终配置       |
| 覆写编辑保存           | 保存后如果代理运行中则重新生成并热重载 |

### 7.2 配置生成时序

```
ProfileService                OverrideService              MihomoManager
     │                             │                            │
     │ generate_final_config(id)   │                            │
     │────────────────────────────►│                            │
     │                             │                            │
     │  1. 读取原始配置            │                            │
     │  profiles/{id}.yaml         │                            │
     │                             │                            │
     │  2. 获取全局覆写列表        │                            │
     │     (global=true, enabled=true, 按 order 排序)           │
     │                             │                            │
     │  3. 获取订阅级覆写列表      │                            │
     │     (profile_overrides 关联, 按 order 排序)              │
     │                             │                            │
     │  4. 去重合并覆写列表        │                            │
     │     (全局在前，订阅级在后)   │                            │
     │                             │                            │
     │  5. 逐个应用覆写            │                            │
     │  ┌─── for override in list  │                            │
     │  │  if yaml → deep_merge()  │                            │
     │  │  if js → execute_js()    │                            │
     │  └──────────────────────────│                            │
     │                             │                            │
     │  6. 写入最终配置            │                            │
     │  data/config.yaml           │                            │
     │                             │                            │
     │  7. 通知 mihomo 重载        │                            │
     │─────────────────────────────────────────────────────────►│
     │                             │         restart / reload   │
```

### 7.3 配置文件路径

| 文件                               | 用途                       |
| ---------------------------------- | -------------------------- |
| `profiles/{id}.yaml`               | 原始订阅/导入配置（不修改）|
| `overrides/{override_id}.yaml/js`  | 覆写文件                   |
| `data/config.yaml`                 | 最终生成的配置（mihomo 使用）|

---

## 8. 覆写页面 UI

### 8.1 页面布局

```
┌────────────────────────────────────────────────────────────┐
│ 覆写管理                           [URL导入] [本地导入] [新建] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 全局覆写                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ☰ ☑ DNS 优化 (yaml)           全局    [编辑] [删除]    │ │
│ │ ☰ ☑ 自定义规则 (yaml)         全局    [编辑] [删除]    │ │
│ │ ☰ ☐ 调试脚本 (js)             全局    [编辑] [日志] [删除] │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ 订阅级覆写                                                   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ☰ ☑ 机场自定义规则 (yaml)     —       [编辑] [删除]    │ │
│ │ ☰ ☑ 节点过滤脚本 (js)         —       [编辑] [日志] [删除] │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 8.2 覆写项操作

| 操作       | 说明                                           |
| ---------- | ---------------------------------------------- |
| ☰ 拖拽排序 | 调整覆写应用顺序（全局和订阅级分别排序）       |
| ☑ 启用/禁用| 禁用后不参与配置合并                           |
| 编辑       | 打开内置编辑器修改覆写内容                     |
| 日志       | JS 覆写专用，查看执行日志                      |
| 删除       | 删除覆写文件和数据库记录                       |

### 8.3 覆写导入方式

| 方式       | 流程                                                      |
| ---------- | --------------------------------------------------------- |
| URL 导入   | 输入 `.yaml` 或 `.js` 文件的 URL → 下载 → 保存 → 插入 DB |
| 本地导入   | 文件选择对话框 → 复制文件 → 插入 DB                       |
| 新建       | 选择 YAML/JS 类型 → 创建空模板 → 打开编辑器              |

### 8.4 覆写编辑器

使用内置的文本编辑器组件：

- YAML 覆写：纯文本编辑，保存时校验 YAML 语法
- JS 覆写：纯文本编辑，保存时尝试执行检查语法错误
- 保存后如果代理运行中 → 重新生成最终配置 → 热重载

### 8.5 订阅关联

在 Profiles 页面的"编辑配置"对话框中，新增"覆写"选项卡：

```
编辑配置
├── 基本信息 (名称、URL)
├── 自动更新 (开关、间隔)
└── 覆写关联
    ☑ DNS 优化 (yaml)
    ☑ 自定义规则 (yaml)
    ☐ 调试脚本 (js)
    ☐ 节点过滤脚本 (js)
```

通过 checkbox 多选关联覆写，关联后该订阅更新时会自动应用选中的覆写。

---

## 9. Tauri Command 接口

### 9.1 规则相关

| Command                  | 参数                 | 返回值            | 说明               |
| ------------------------ | -------------------- | ----------------- | ------------------ |
| `get_rules`              | 无                   | `RuleItem[]`      | 获取当前生效规则   |
| `get_rule_providers`     | 无                   | `RuleProvider[]`  | 获取 Rule Provider |
| `update_rule_provider`   | `name: String`       | `()`              | 刷新指定 Provider  |

### 9.2 覆写相关

| Command                  | 参数                                           | 返回值            | 说明                 |
| ------------------------ | ---------------------------------------------- | ----------------- | -------------------- |
| `get_overrides`          | 无                                             | `OverrideItem[]`  | 获取所有覆写         |
| `create_override`        | `name, ext, global`                            | `OverrideItem`    | 新建覆写             |
| `import_override_file`   | `file_path, name, global`                      | `OverrideItem`    | 本地文件导入覆写     |
| `import_override_url`    | `url, name, global`                            | `OverrideItem`    | URL 导入覆写         |
| `update_override_info`   | `id, name?, global?, enabled?`                 | `OverrideItem`    | 更新覆写信息         |
| `read_override_content`  | `id`                                           | `String`          | 读取覆写文件内容     |
| `save_override_content`  | `id, content`                                  | `()`              | 保存覆写文件内容     |
| `delete_override`        | `id`                                           | `()`              | 删除覆写             |
| `reorder_overrides`      | `ids: Vec<String>`                             | `()`              | 调整覆写排序         |
| `set_profile_overrides`  | `profile_id, override_ids: Vec<String>`        | `()`              | 设置订阅关联的覆写   |
| `get_profile_overrides`  | `profile_id`                                   | `OverrideItem[]`  | 获取订阅关联的覆写   |
| `read_override_log`      | `id`                                           | `String`          | 读取 JS 覆写执行日志 |
| `refresh_remote_override`| `id`                                           | `OverrideItem`    | 刷新远程覆写         |

---

## 10. 前端 Store

### 10.1 useRulesStore

```typescript
interface RulesState {
  rules: RuleItem[];
  providers: RuleProvider[];
  loading: boolean;
  error: string | null;

  fetchRules(): Promise<void>;
  fetchProviders(): Promise<void>;
  updateProvider(name: string): Promise<void>;
}
```

### 10.2 useOverridesStore

```typescript
interface OverridesState {
  overrides: OverrideItem[];
  loading: boolean;
  error: string | null;

  fetchOverrides(): Promise<void>;
  createOverride(name: string, ext: "yaml" | "js", global: boolean): Promise<OverrideItem>;
  importFile(filePath: string, name: string, global: boolean): Promise<OverrideItem>;
  importUrl(url: string, name: string, global: boolean): Promise<OverrideItem>;
  updateInfo(id: string, patch: Partial<OverrideItem>): Promise<void>;
  deleteOverride(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
  readContent(id: string): Promise<string>;
  saveContent(id: string, content: string): Promise<void>;
}
```

---

## 11. 错误处理

### 11.1 规则查看

- mihomo API 未就绪：显示"代理未运行"占位提示
- API 返回错误：在页面顶部显示错误 toast

### 11.2 覆写系统

| 错误场景                         | 处理方式                                |
| -------------------------------- | --------------------------------------- |
| YAML 覆写语法错误                | 保存时弹出错误提示，不保存              |
| JS 覆写执行异常                  | 记录到 log 文件，跳过该覆写继续合并     |
| JS 覆写执行超时（>5s）           | 中断执行，记录超时错误                  |
| 远程覆写下载失败                 | 显示错误提示，保留上次的覆写内容        |
| 覆写合并后配置无效               | 回退到无覆写的原始配置，提示用户        |
| 覆写引用的 rule-provider 不存在  | mihomo 加载配置时报错，通过日志展示     |

### 11.3 配置回退

当覆写合并后的配置导致 mihomo 启动失败时：

```
apply_overrides() 失败
  → 保存原始配置为 data/config.yaml（不应用覆写）
  → 启动 mihomo
  → 前端提示"覆写应用失败，已回退到原始配置"
```

---

## 12. 实现任务分解

### 12.1 规则查看（Phase 1）

| # | 任务                          | 涉及文件                                 | 估时  |
|---|-------------------------------|------------------------------------------|-------|
| 1 | mihomo API 扩展（rules 相关） | `core/mihomo_api.rs`                     | 1h    |
| 2 | 规则数据模型                  | `models/rules.rs`                        | 0.5h  |
| 3 | RulesService                  | `services/rules.rs`                      | 1h    |
| 4 | 规则 Tauri Command            | `commands/rules.rs`                      | 0.5h  |
| 5 | 前端 API + Store              | `api/index.ts`, `store/rules.ts`         | 1h    |
| 6 | Rules 页面 UI（虚拟列表）     | `pages/Rules.tsx`                        | 2h    |
| 7 | Rule Provider 卡片 + 刷新     | `pages/Rules.tsx`                        | 1h    |
| 8 | i18n 键值补充                 | `locales/en.json`, `locales/zh.json`     | 0.5h  |

### 12.2 覆写系统（Phase 2）

| # | 任务                            | 涉及文件                                 | 估时  |
|---|---------------------------------|------------------------------------------|-------|
| 9 | 覆写数据库 Schema               | `db/mod.rs`                              | 0.5h  |
| 10| 覆写数据模型                    | `models/overrides.rs`                    | 0.5h  |
| 11| OverrideService CRUD            | `services/overrides.rs`                  | 2h    |
| 12| YAML deep_merge 引擎            | `core/override_engine.rs`                | 3h    |
| 13| JS 执行引擎（boa_engine）       | `core/override_engine.rs`, `Cargo.toml`  | 3h    |
| 14| 配置生成流程集成                 | `services/profile.rs`                    | 2h    |
| 15| 覆写 Tauri Command              | `commands/overrides.rs`                  | 1h    |
| 16| 前端 API + Store                | `api/index.ts`, `store/overrides.ts`     | 1h    |
| 17| Overrides 页面 UI               | `pages/Overrides.tsx`                    | 3h    |
| 18| 覆写编辑器组件                  | `components/OverrideEditor.tsx`          | 2h    |
| 19| 拖拽排序（@dnd-kit）            | `pages/Overrides.tsx`, `package.json`    | 1.5h  |
| 20| Profiles 页面覆写关联 UI        | `pages/Profiles.tsx`                     | 1.5h  |
| 21| 错误处理与配置回退              | `services/overrides.rs`                  | 1h    |
| 22| i18n 键值补充                   | `locales/en.json`, `locales/zh.json`     | 0.5h  |

**总估时**：Phase 1 约 7.5h，Phase 2 约 22.5h，合计约 30h
