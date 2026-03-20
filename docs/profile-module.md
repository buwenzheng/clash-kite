# 配置管理模块详细设计

## 1. 模块概述

配置管理模块负责代理配置文件（Profile）的完整生命周期：导入、存储、编辑、激活、更新、导出和删除。

**涉及文件：**

| 层级     | 文件                                | 职责                 |
| -------- | ----------------------------------- | -------------------- |
| 前端页面 | `src/pages/Profiles.tsx`            | 配置管理 UI          |
| Store    | `src/store/config.ts`               | useProfileStore      |
| API      | `src/api/index.ts`                  | 13 个配置相关函数    |
| 命令层   | `src-tauri/src/commands/profile.rs` | 13 个 Tauri Command  |
| 服务层   | `src-tauri/src/services/profile.rs` | ProfileService       |
| 核心层   | `src-tauri/src/core/scheduler.rs`   | AutoUpdateScheduler（新增） |
| 模型     | `src-tauri/src/models/profile.rs`   | ProfileInfo, ProfileSource |

---

## 2. 数据模型

### 2.1 ProfileInfo

```rust
pub struct ProfileInfo {
    pub id: String,                    // UUID v4（主键）
    pub name: String,                  // 用户自定义名称
    pub source: ProfileSource,         // Local | Subscription
    pub file_path: String,             // YAML 文件绝对路径
    pub subscription_url: Option<String>, // 订阅 URL（仅 Subscription）
    pub updated_at: String,            // RFC 3339 时间戳
    pub is_active: bool,               // 是否为当前激活配置
    pub auto_update: bool,             // 是否开启自动更新（新增）
    pub auto_update_interval: u32,     // 自动更新间隔（分钟），默认 480（8h）（新增）
}
```

### 2.2 ProfileSource

```rust
pub enum ProfileSource {
    Local,          // 本地文件导入
    Subscription,   // 订阅链接导入
}
```

### 2.3 AutoUpdateResult（新增）

```rust
pub struct AutoUpdateResult {
    pub profile_id: String,
    pub profile_name: String,
    pub success: bool,
    pub error: Option<String>,
    pub hot_reloaded: bool,       // 是否触发了热重载
    pub updated_at: String,       // 更新时间
}
```

### 2.4 存储设计

- **元数据**：存储在 SQLite `profiles` 表
- **配置内容**：存储为独立 YAML 文件，路径 `~/.config/clash-kite/profiles/{uuid}.yaml`
- **关联**：`profiles.file_path` 指向 YAML 文件绝对路径

---

## 3. 核心链路

### 3.1 订阅导入

```
用户输入 URL + 名称 → 点击导入
  │
  ▼
Profiles.tsx: handleImportSubscription()
  → useProfileStore.importSubscription(url, name)
    → api.importProfileSubscription(url, name)
      → invoke("import_profile_subscription", { url, name })
        │
        ▼ Rust 后端
        ProfileService::import_subscription(url, name)
          │
          ├─ ensure_dir()        # 确保 profiles/ 目录存在
          │
          ├─ download_subscription(url)
          │    ├─ reqwest GET (timeout=30s, UA="clash-kite/0.1.0 mihomo")
          │    ├─ 检查 HTTP 状态码
          │    ├─ 智能内容检测：
          │    │    ├─ 以 "proxies:" / "port:" / "mixed-port:" / "#" 开头 → 原始 YAML
          │    │    ├─ 尝试 base64 STANDARD 解码 → 解码后的 YAML
          │    │    └─ 以上都不匹配 → 当作原始内容
          │    └─ validate_yaml() → serde_yaml 解析校验
          │
          ├─ 生成 UUID v4 作为 id
          ├─ 写入文件: profiles/{uuid}.yaml
          ├─ 插入数据库记录 (source="subscription", is_active=0)
          │
          └─ 返回 ProfileInfo
        │
        ▼
    Store: profiles = [...profiles, newProfile]
      → React re-render
```

### 3.2 本地文件导入

```
用户输入名称 → 点击选择文件
  │
  ▼
Profiles.tsx: handleImportFile()
  → openConfigFile()
    → @tauri-apps/plugin-dialog open()  # 原生文件选择器
      → 过滤: *.yaml, *.yml
  → useProfileStore.importFile(filePath, name)
    → invoke("import_profile_file", { filePath, name })
      │
      ▼ Rust 后端
      ProfileService::import_file(src_path, name)
        ├─ 检查源文件是否存在
        ├─ 读取并 validate_yaml()
        ├─ 生成 UUID v4
        ├─ 复制文件到 profiles/{uuid}.yaml
        ├─ 插入数据库 (source="local", is_active=0)
        └─ 返回 ProfileInfo
```

### 3.3 配置激活

```
用户点击 "使用" 按钮
  │
  ▼
Profiles.tsx: handleActivate(id)
  → useProfileStore.activateProfile(id)
    → invoke("activate_profile", { id })
      │
      ▼ Rust 后端（commands/profile.rs）
      activate_profile(svc, proxy, id)
        │
        ├─ ProfileService::activate(id)
        │    ├─ UPDATE profiles SET is_active = 0  (取消所有激活)
        │    ├─ UPDATE profiles SET is_active = 1 WHERE id = ?
        │    └─ 返回更新后的 ProfileInfo
        │
        ├─ 检查 ProxyService::is_running()
        │    └─ 如果运行中 → ProxyService::restart(file_path, name)
        │         ├─ stop() (kill mihomo)
        │         ├─ sleep 300ms
        │         └─ start(new_config) (启动 mihomo 使用新配置)
        │
        └─ 返回 ProfileInfo
      │
      ▼
  → fetchProfiles() 刷新列表
  → fetchStatus() 刷新代理状态
  → 如果代理运行中 → fetchGroups() 刷新节点列表
```

**关键点**：激活配置时如果代理正在运行，会自动热重载——停止旧 mihomo → 启动新 mihomo，300ms 间隔防止端口冲突。

### 3.4 订阅更新

```
用户点击刷新按钮（仅 subscription 类型配置显示）
  │
  ▼
Profiles.tsx: handleUpdate(id)
  → useProfileStore.updateSubscription(id)
    → invoke("update_profile_subscription", { id })
      │
      ▼ Rust 后端
      ProfileService::update_subscription(id)
        ├─ get_by_id(id) → 获取配置记录
        ├─ 检查 subscription_url 是否存在
        ├─ download_subscription(url) → 下载新内容
        ├─ 覆盖写入原 YAML 文件
        ├─ 更新 updated_at 时间戳
        └─ 返回更新后的 ProfileInfo
```

### 3.5 YAML 内容编辑

```
用户点击代码图标 → 打开 YAML 编辑器对话框
  │
  ▼
openYamlEditor(profile)
  → readProfileContent(profile.id)
    → invoke("read_profile_content", { id })
      → ProfileService::read_content(id) → fs::read_to_string()
  → 显示在 Textarea 中（font-mono, 400px 最小高度）

用户编辑后点击保存
  │
  ▼
handleYamlSave()
  → saveProfileContent(id, content)
    → invoke("save_profile_content", { id, content })
      │
      ▼ Rust 后端
      ProfileService::save_content(id, content)
        ├─ validate_yaml(content) → serde_yaml 校验
        │    └─ 失败 → 返回 "Invalid YAML: {details}"
        ├─ 写入文件
        ├─ 更新 updated_at
        └─ Ok(())
```

### 3.6 配置导出

```
用户点击下载图标
  │
  ▼
handleExport(profile)
  → saveConfigFile(profile.name + ".yaml")
    → @tauri-apps/plugin-dialog save() → 原生保存对话框
  → exportProfile(id, destPath)
    → invoke("export_profile", { id, destPath })
      → ProfileService::export_profile() → fs::copy()
```

### 3.7 配置删除

```
用户点击删除图标 → AlertDialog 确认
  │
  ▼
handleDeleteConfirm()
  → useProfileStore.deleteProfile(id)
    → invoke("delete_profile", { id })
      │
      ▼ Rust 后端
      ProfileService::delete(id)
        ├─ get_by_id(id) → 获取文件路径
        ├─ 删除 YAML 文件（忽略文件不存在的错误）
        └─ DELETE FROM profiles WHERE id = ?
      │
      ▼
    Store: profiles = profiles.filter(p => p.id !== id)
```

### 3.8 配置信息编辑

```
用户点击铅笔图标 → Dialog 编辑名称/订阅URL
  │
  ▼
handleEditSave()
  → useProfileStore.updateProfileInfo(id, name, subscriptionUrl)
    → invoke("update_profile_info", { id, name, subscriptionUrl })
      → ProfileService::update_info(id, name, url)
        → UPDATE profiles SET name=?, sub_url=?, updated_at=?
```

---

## 4. YAML 校验

所有配置内容在写入前都会经过 YAML 校验：

```rust
fn validate_yaml(&self, content: &str) -> Result<()> {
    let _: serde_yaml::Value = serde_yaml::from_str(content)?;
    Ok(())
}
```

校验场景：
- 本地文件导入（读取源文件后校验）
- 订阅下载（下载内容后校验，包括 base64 解码后的内容）
- YAML 编辑器保存（用户编辑内容后校验）

校验级别：仅验证 YAML 语法合法性，不验证 mihomo 配置语义。

---

## 5. 前端 UI 交互

### 5.1 配置列表

每个配置项展示为一个卡片，包含：
- **图标**：订阅类型用 Link 图标，本地类型用 FileText 图标
- **名称**：加粗显示
- **状态标签**：激活配置显示 "Active" 标签
- **来源**：subscription / local
- **更新时间**：相对时间（just now / Xm ago / Xh ago / Xd ago）
- **操作按钮**（hover 时显示）：
  - 刷新（仅订阅类型）
  - 编辑信息
  - 编辑 YAML
  - 导出
  - 使用
  - 删除

### 5.2 导入面板

可折叠的导入面板，包含两个区域：
1. **订阅导入**：名称输入框 + URL 输入框（带粘贴按钮） + 导入按钮
2. **本地文件导入**：名称输入框 + 选择文件按钮

### 5.3 对话框

- **删除确认**：AlertDialog，显示配置名称，确认/取消
- **编辑信息**：Dialog，编辑名称和订阅 URL（仅订阅类型显示 URL 字段）
- **YAML 编辑器**：Dialog (max-w-2xl)，等宽字体 Textarea，显示配置名称

---

## 6. 错误处理

| 场景               | 错误信息                                    | 处理方式             |
| ------------------ | ------------------------------------------- | -------------------- |
| 文件不存在         | "File not found: {path}"                    | 返回错误给前端       |
| YAML 格式无效      | "Invalid YAML: {parse_error}"               | 返回错误，不写入文件 |
| 订阅下载失败       | "Download failed: HTTP {status}"            | 返回错误             |
| base64 解码后非 UTF-8 | "Base64 decoded content is not valid UTF-8" | 返回错误           |
| 配置不存在         | "Profile not found: {id}"                   | 返回错误             |
| 非订阅类型更新     | "Not a subscription profile"                | 返回错误             |
| 前端错误           | Store.error 状态                            | 页面顶部错误提示     |

---

## 7. 状态管理（useProfileStore）

```typescript
interface ProfileState {
  profiles: ProfileInfo[];    // 所有配置列表
  loading: boolean;           // 操作进行中
  error: string | null;       // 最近的错误

  fetchProfiles();            // 加载列表
  importFile(path, name);     // 导入本地文件
  importSubscription(url, name); // 导入订阅
  updateSubscription(id);     // 更新订阅
  updateProfileInfo(id, name, url); // 更新信息
  deleteProfile(id);          // 删除
  activateProfile(id);        // 激活
}
```

**乐观更新策略：**
- `importFile` / `importSubscription`：成功后将新配置 push 到数组
- `updateProfileInfo`：成功后 map 替换对应项
- `deleteProfile`：成功后 filter 移除
- `activateProfile` / `updateSubscription`：成功后调用 `fetchProfiles()` 全量刷新

---

## 8. 订阅自动更新

### 8.1 功能概述

每个订阅类型的配置可独立设置是否自动更新及更新间隔。后台调度器定时检查并执行更新，如果更新的是当前激活配置且代理正在运行，自动热重载 mihomo。更新完成后发送系统级通知。

**核心特性：**

| 特性         | 说明                                               |
| ------------ | -------------------------------------------------- |
| 控制粒度     | 每个订阅配置独立开关 + 独立间隔                    |
| 默认间隔     | 480 分钟（8 小时）                                 |
| 最小间隔     | 10 分钟（防止过于频繁请求）                        |
| 热重载       | 如果更新的是激活配置且代理运行中，自动 restart      |
| 通知         | 系统级通知（Tauri notification），窗口隐藏时也能看到 |
| 持久化       | 配置存储在 SQLite profiles 表的新增字段中          |

### 8.2 数据库变更

profiles 表新增两个字段：

```sql
ALTER TABLE profiles ADD COLUMN auto_update INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN auto_update_interval INTEGER NOT NULL DEFAULT 480;
```

| 字段                   | 类型    | 默认值 | 说明                                |
| ---------------------- | ------- | ------ | ----------------------------------- |
| auto_update            | INTEGER | 0      | 是否开启自动更新（0=关, 1=开）      |
| auto_update_interval   | INTEGER | 480    | 更新间隔（分钟），最小值 10         |

### 8.3 架构设计

新增 `AutoUpdateScheduler` 核心组件，运行在 Rust 后端的 tokio 异步任务中。

```
┌─────────────────────────────────────────────┐
│  lib.rs setup()                              │
│    ├→ ... 现有初始化 ...                     │
│    └→ AutoUpdateScheduler::start()           │
│         │                                    │
│         ▼                                    │
│  tokio::spawn(async loop)                    │
│    │                                         │
│    ├─ 每 60s 唤醒一次（调度检查间隔）         │
│    │                                         │
│    ├─ 查询所有 auto_update=1 的订阅配置       │
│    │    │                                    │
│    │    ├─ 计算: now - updated_at >= interval?│
│    │    │                                    │
│    │    ├─ 需要更新 → download_subscription() │
│    │    │    ├─ 成功 → 覆盖文件, 更新时间戳   │
│    │    │    │    ├─ 是激活配置 && 代理运行中? │
│    │    │    │    │    └─ ProxyService.restart()│
│    │    │    │    └─ 发送系统通知              │
│    │    │    └─ 失败 → 记录日志, 发送错误通知  │
│    │    │                                    │
│    │    └─ 不需要 → skip                     │
│    │                                         │
│    └─ sleep(60s) → 下一轮                    │
└─────────────────────────────────────────────┘
```

### 8.4 调度器实现

```rust
// src-tauri/src/core/scheduler.rs（新增文件）

pub struct AutoUpdateScheduler {
    profile_svc: ProfileService,
    proxy_svc: ProxyService,
    app_handle: tauri::AppHandle,
}

impl AutoUpdateScheduler {
    pub fn start(
        profile_svc: ProfileService,
        proxy_svc: ProxyService,
        app_handle: tauri::AppHandle,
    ) {
        tokio::spawn(async move {
            let scheduler = Self { profile_svc, proxy_svc, app_handle };
            scheduler.run_loop().await;
        });
    }

    async fn run_loop(&self) {
        loop {
            self.check_and_update().await;
            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    }

    async fn check_and_update(&self) {
        // 1. 查询所有 auto_update=true 的订阅配置
        // 2. 过滤: now - updated_at >= auto_update_interval
        // 3. 对每个需要更新的配置:
        //    a. download_subscription(url)
        //    b. 覆盖写入 YAML 文件
        //    c. 更新 updated_at
        //    d. 如果 is_active && proxy running → restart
        //    e. 发送系统通知
    }
}
```

### 8.5 完整调用链路

#### 8.5.1 用户设置自动更新

```
用户在配置列表中点击某个订阅配置的自动更新设置
  │
  ▼
Profiles.tsx: 打开自动更新设置 Dialog
  → 显示开关 + 间隔输入（分钟/小时选择）
  → 点击保存
    │
    ▼
  useProfileStore.setAutoUpdate(id, enabled, intervalMinutes)
    → api.setProfileAutoUpdate(id, enabled, intervalMinutes)
      → invoke("set_profile_auto_update", { id, autoUpdate, autoUpdateInterval })
        │
        ▼ Rust 后端
        ProfileService::set_auto_update(id, enabled, interval)
          ├─ 校验 interval >= 10
          ├─ UPDATE profiles SET auto_update=?, auto_update_interval=? WHERE id=?
          └─ 返回更新后的 ProfileInfo
```

#### 8.5.2 后台自动更新执行

```
AutoUpdateScheduler (每 60s 检查一次)
  │
  ├─ ProfileService::get_auto_update_candidates()
  │    → SELECT * FROM profiles
  │      WHERE source='subscription'
  │        AND auto_update=1
  │        AND (now - updated_at) >= auto_update_interval * 60
  │
  ├─ 对每个候选配置:
  │    │
  │    ├─ ProfileService::update_subscription(id)
  │    │    ├─ download_subscription(url)
  │    │    ├─ 覆盖文件
  │    │    └─ 更新 updated_at
  │    │
  │    ├─ 检查是否需要热重载:
  │    │    ├─ profile.is_active == true
  │    │    └─ ProxyService::is_running() == true
  │    │    └─ 是 → ProxyService::restart(file_path, name)
  │    │
  │    └─ 发送系统通知:
  │         ├─ 成功 → "订阅 {name} 已自动更新"
  │         │         + 如果热重载 → "代理已自动重载"
  │         └─ 失败 → "订阅 {name} 自动更新失败: {error}"
  │
  └─ sleep(60s)
```

#### 8.5.3 手动触发全部自动更新

```
用户在 Profiles 页面点击 "立即更新所有"
  │
  ▼
useProfileStore.updateAllAutoUpdate()
  → invoke("update_all_auto_update_profiles")
    │
    ▼ Rust 后端
    遍历所有 auto_update=true 的配置
      → 逐个执行 update_subscription(id)
      → 返回 Vec<AutoUpdateResult>
```

### 8.6 系统通知

使用 Tauri 的 notification API（`tauri-plugin-notification`）：

```rust
use tauri::notification::Notification;

// 成功通知
Notification::new(&app_handle.config().identifier)
    .title("Clash Kite")
    .body(format!("订阅 {} 已自动更新", profile_name))
    .show()?;

// 失败通知
Notification::new(&app_handle.config().identifier)
    .title("Clash Kite")
    .body(format!("订阅 {} 更新失败: {}", profile_name, error))
    .show()?;
```

**需要新增依赖：** `tauri-plugin-notification`

### 8.7 前端 UI 交互

#### 8.7.1 配置列表卡片变更

每个订阅类型的配置卡片新增：
- **自动更新标识**：Badge 显示 "自动更新: 8h" 或类似信息
- **设置按钮**：点击打开自动更新设置 Dialog

#### 8.7.2 自动更新设置 Dialog

```
┌────────────────────────────────────────┐
│  自动更新设置                           │
│  ─────────────────────────────────────  │
│                                        │
│  启用自动更新     [Switch ○───]        │
│                                        │
│  更新间隔                              │
│  ┌────────────┐  ┌──────────────┐      │
│  │    8       │  │ 小时    ▾   │      │
│  └────────────┘  └──────────────┘      │
│                                        │
│  提示：最小间隔 10 分钟                 │
│  上次更新：2h ago                      │
│                                        │
│  ─────────────────────────────────────  │
│              [取消]    [保存]           │
└────────────────────────────────────────┘
```

#### 8.7.3 Profiles 页面头部

新增 "更新所有" 按钮，一键触发所有已开启自动更新的订阅立即更新。

### 8.8 Store 变更（useProfileStore）

新增方法：

```typescript
interface ProfileState {
  // ... 现有状态和方法 ...

  setAutoUpdate: (id: string, enabled: boolean, intervalMinutes: number) => Promise<void>;
  updateAllAutoUpdate: () => Promise<AutoUpdateResult[]>;
}
```

### 8.9 新增 Tauri Commands

| 命令                            | 参数                                     | 返回值               | 说明                     |
| ------------------------------- | ---------------------------------------- | -------------------- | ------------------------ |
| `set_profile_auto_update`       | `id, auto_update: bool, auto_update_interval: u32` | `ProfileInfo`  | 设置单个配置的自动更新   |
| `update_all_auto_update_profiles` | 无                                     | `Vec<AutoUpdateResult>` | 立即更新所有自动更新配置 |

### 8.10 错误处理

| 场景                     | 处理方式                              |
| ------------------------ | ------------------------------------- |
| 单个订阅更新失败         | 记录日志，发送错误通知，继续处理其他  |
| 网络不可用               | 所有订阅跳过，下次调度重试            |
| 间隔值非法（< 10 分钟）  | 返回校验错误，不写入数据库            |
| 热重载失败               | 发送通知告知用户，代理可能需要手动操作 |
| 调度器本身 panic          | tokio 任务重启（或日志记录后静默）    |

### 8.11 实现任务分解

| 步骤 | 任务                                    | 涉及文件                       |
| ---- | --------------------------------------- | ------------------------------ |
| 1    | DB 迁移：profiles 表新增两个字段        | `db/mod.rs`                    |
| 2    | 模型更新：ProfileInfo 新增字段          | `models/profile.rs`, `types/index.ts` |
| 3    | Service：新增 set_auto_update / get_auto_update_candidates | `services/profile.rs` |
| 4    | 调度器：新增 AutoUpdateScheduler        | `core/scheduler.rs`（新文件）  |
| 5    | Commands：新增 2 个 Tauri Command       | `commands/profile.rs`          |
| 6    | 启动集成：lib.rs setup 中启动调度器     | `lib.rs`                       |
| 7    | 前端 API：新增 2 个 invoke 函数         | `api/index.ts`                 |
| 8    | 前端 Store：新增方法                    | `store/config.ts`              |
| 9    | 前端 UI：自动更新 Dialog + 列表标识     | `pages/Profiles.tsx`           |
| 10   | 通知插件集成                            | `Cargo.toml`, `tauri.conf.json`, `capabilities/` |
| 11   | 国际化：新增翻译键                      | `locales/zh.json`, `locales/en.json` |

---

## 9. 未来规划

### 9.1 配置合并/覆盖规则

- 支持导入时选择合并已有规则还是完全覆盖
- 需要 mihomo 配置语义层面的解析能力

### 9.2 配置模板

- 预置常用配置模板
- 用户可基于模板创建新配置
