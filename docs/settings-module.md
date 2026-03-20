# 设置与系统集成模块详细设计

## 1. 模块概述

本模块涵盖应用设置管理、主题/国际化切换、系统托盘、窗口管理等系统集成功能，以及未来规划中的 WebDAV 同步与开机自启。

**涉及文件：**

| 层级     | 文件                                  | 职责               |
| -------- | ------------------------------------- | ------------------ |
| 前端页面 | `src/pages/Settings.tsx`              | 设置 UI            |
| 前端布局 | `src/components/Layout.tsx`           | 系统代理开关、模式 |
| Store    | `src/store/settings.ts`               | useSettingsStore   |
| API      | `src/api/index.ts`                    | 2 个设置函数       |
| 命令层   | `src-tauri/src/commands/settings.rs`  | 2 个 Tauri Command |
| 服务层   | `src-tauri/src/services/settings.rs`  | SettingsService    |
| 模型     | `src-tauri/src/models/settings.rs`    | AppSettings        |
| 入口     | `src-tauri/src/lib.rs`                | 托盘、窗口事件     |
| 国际化   | `src/i18n.ts`                         | i18next 配置       |
| 国际化   | `src/locales/zh.json`, `en.json`      | 翻译文件           |

---

## 2. 设置数据模型

### 2.1 AppSettings

```rust
pub struct AppSettings {
    pub theme: String,           // "light" | "dark" | "system"
    pub language: String,        // "zh" | "en"
    pub auto_start: bool,        // 开机自启（未实现）
    pub minimize_to_tray: bool,  // 关闭时最小化到托盘
    pub start_minimized: bool,   // 启动时最小化（未实现）
    pub system_proxy: bool,      // 系统代理偏好
    pub tun_mode: bool,          // TUN 模式（未实现）
}
```

### 2.2 存储方式

SettingsService 使用 SQLite `settings` 表，以键值对形式存储。读取时逐个查询，缺失的键使用默认值；保存时使用 `INSERT ... ON CONFLICT DO UPDATE` 实现 upsert。

**读取流程：**
```
get() → 创建 AppSettings::default()
  → 逐个 get_value(db, key)
    → SELECT value FROM settings WHERE key = ?
  → 覆盖对应字段
  → 返回 AppSettings
```

**保存流程：**
```
save(settings) → 逐个 set_value(db, key, value)
  → INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
```

---

## 3. 主题切换

### 3.1 三种主题模式

| 模式   | 行为                                  |
| ------ | ------------------------------------- |
| light  | `document.documentElement` 移除 dark class |
| dark   | `document.documentElement` 添加 dark class |
| system | 跟随系统偏好 (`prefers-color-scheme`)  |

### 3.2 实现链路

```
Settings.tsx: handleTheme(theme)
  │
  ├─ applyTheme(theme)
  │    ├─ "dark"   → classList.add("dark")
  │    ├─ "light"  → classList.remove("dark")
  │    └─ "system" → matchMedia("prefers-color-scheme: dark")
  │                   → 匹配则 add，否则 remove
  │
  └─ updateSettings({ theme })
       → useSettingsStore.updateSettings()
         → api.saveSettings(updated)
           → invoke("save_settings") → SQLite
```

### 3.3 Tailwind 配置

```javascript
// tailwind.config.js
darkMode: "class"  // 基于 class 切换，非 media query
```

### 3.4 已知限制

- 选择 "system" 后不会实时监听系统主题变化，仅在切换时读取一次
- 应用启动时需要从 settings 读取主题并应用（目前未在启动时自动应用）

---

## 4. 国际化

### 4.1 技术方案

- **框架**：i18next + react-i18next
- **默认语言**：从 `localStorage("i18nextLng")` 读取，回退到 "zh"
- **翻译文件**：`src/locales/zh.json`, `src/locales/en.json`

### 4.2 命名空间

翻译键按页面组织：

| 命名空间   | 内容                 |
| ---------- | -------------------- |
| common     | 通用按钮文本         |
| nav        | 导航菜单             |
| dashboard  | 仪表盘               |
| nodes      | 节点列表             |
| profiles   | 配置管理             |
| settings   | 设置页面             |

### 4.3 切换流程

```
Settings.tsx: handleLanguage(lang)
  ├─ i18n.changeLanguage(lang)  # 立即切换前端语言
  └─ updateSettings({ language: lang })  # 持久化到 SQLite
```

语言偏好同时存储在两个位置：
- `localStorage("i18nextLng")` — i18next 自身管理
- SQLite settings 表 — 应用级持久化

---

## 5. 系统托盘

### 5.1 当前实现（基础托盘）

当前托盘菜单仅有 4 个静态菜单项：

```rust
let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
let toggle_i = MenuItem::with_id(app, "toggle_proxy", "Toggle Proxy", true, None::<&str>)?;
let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
```

### 5.2 增强托盘菜单设计（P0）

#### 5.2.1 完整菜单结构

```
┌──────────────────────────────────┐
│ 显示 Clash Kite / 隐藏 Clash Kite│  ← 根据窗口可见性动态切换文案
├──────────────────────────────────┤
│ ● 规则模式                       │  ← radio group，反映当前模式
│ ○ 全局模式                       │
│ ○ 直连模式                       │
├──────────────────────────────────┤
│ ☑ 系统代理                       │  ← checkbox，代理未运行时 disabled
│ 开启代理 / 关闭代理              │  ← 根据代理状态动态切换文案
├──────────────────────────────────┤
│ 订阅配置                       ▶ │  ← submenu
│   ├ ● 配置 A                     │  ← radio，当前激活的配置打勾
│   ├ ○ 配置 B                     │
│   └ ○ 配置 C                     │
├──────────────────────────────────┤
│ 退出 Clash Kite                  │
└──────────────────────────────────┘
```

#### 5.2.2 菜单项详细定义

| #  | 菜单项 ID           | 类型       | 文案                           | 条件/状态                          | 动作                                      |
|----|---------------------|------------|--------------------------------|------------------------------------|--------------------------------------------|
| 1  | `show_hide`         | normal     | "显示 Clash Kite" / "隐藏 Clash Kite" | 窗口可见 → "隐藏"，否则 → "显示"   | `window.show()`+`set_focus()` 或 `window.hide()` |
| 2  | —                   | separator  | —                              | —                                  | —                                          |
| 3  | `mode_rule`         | radio      | "规则模式"                     | 当前 mode==rule 时选中             | `set_mode("rule")` → 刷新菜单             |
| 4  | `mode_global`       | radio      | "全局模式"                     | 当前 mode==global 时选中           | `set_mode("global")` → 刷新菜单           |
| 5  | `mode_direct`       | radio      | "直连模式"                     | 当前 mode==direct 时选中           | `set_mode("direct")` → 刷新菜单           |
| 6  | —                   | separator  | —                              | —                                  | —                                          |
| 7  | `system_proxy`      | checkbox   | "系统代理"                     | 代理未运行时 disabled，选中态同步   | `set_system_proxy(!current)` → 刷新菜单   |
| 8  | `toggle_proxy`      | normal     | "开启代理" / "关闭代理"        | running → "关闭代理"，否则 → "开启" | `toggle_proxy()` → 刷新菜单               |
| 9  | —                   | separator  | —                              | —                                  | —                                          |
| 10 | `profiles`          | submenu    | "订阅配置"                     | 动态生成子菜单项                   | —                                          |
| 10a| `profile_{id}`      | radio      | 配置名称                       | `is_active==true` 的配置选中       | `activate_profile(id)` → 刷新菜单         |
| 11 | —                   | separator  | —                              | —                                  | —                                          |
| 12 | `quit`              | normal     | "退出 Clash Kite"              | 始终可用                           | 停止代理 + 取消系统代理 + `app.exit(0)`    |

#### 5.2.3 菜单状态同步

托盘菜单需要反映实时状态（代理模式、系统代理、配置列表），因此需要**动态重建菜单**。

**菜单刷新时机：**

| 触发事件                | 来源           | 影响的菜单项                         |
|------------------------|----------------|--------------------------------------|
| 代理启动/停止           | ProxyService    | toggle_proxy 文案、system_proxy 可用性、mode radio |
| 代理模式切换            | ProxyService    | mode radio 选中状态                   |
| 系统代理开关            | sysproxy        | system_proxy checkbox 状态            |
| 配置激活/导入/删除       | ProfileService  | profiles submenu 内容                 |
| 窗口显示/隐藏            | WindowEvent     | show_hide 文案                       |

**实现方案：**

```rust
fn rebuild_tray_menu(app: &AppHandle) -> Result<()> {
    let proxy_status = proxy_service.get_status();
    let profiles = profile_service.get_all()?;
    let window_visible = app.get_webview_window("main")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false);

    // 1. 显示/隐藏
    let show_hide_label = if window_visible { "隐藏 Clash Kite" } else { "显示 Clash Kite" };

    // 2. 模式 radio
    let mode = &proxy_status.mode;

    // 3. 系统代理 checkbox
    let sys_proxy_checked = proxy_status.system_proxy;
    let sys_proxy_enabled = proxy_status.running;

    // 4. 代理开关
    let toggle_label = if proxy_status.running { "关闭代理" } else { "开启代理" };

    // 5. 配置 submenu
    // 遍历 profiles，为每个创建 radio 菜单项

    // 6. 退出

    // 组装菜单并 set_menu()
    tray.set_menu(Some(menu))?;
    Ok(())
}
```

**事件驱动刷新**：在每次状态变更的 Tauri Command 返回前，调用 `rebuild_tray_menu()`。具体注入点：

```
start_proxy / stop_proxy / toggle_proxy  → rebuild (代理状态)
set_proxy_mode                           → rebuild (模式)
set_system_proxy                         → rebuild (系统代理)
activate_profile / delete_profile        → rebuild (配置列表)
import_profile_*                         → rebuild (配置列表)
on_window_event(Focused/CloseRequested)  → rebuild (窗口可见性)
```

#### 5.2.4 托盘菜单事件处理

```rust
.on_menu_event(|app, event| {
    let id = event.id().as_ref();
    match id {
        "show_hide" => { /* 切换窗口可见性 */ }
        "mode_rule" | "mode_global" | "mode_direct" => {
            let mode = id.strip_prefix("mode_").unwrap();
            // 异步调用 ProxyService::set_mode(mode)
            // rebuild_tray_menu(app)
        }
        "system_proxy" => {
            // 异步调用 ProxyService::set_system_proxy(!current)
            // rebuild_tray_menu(app)
        }
        "toggle_proxy" => {
            // 发送事件到前端 或 直接调用 ProxyService
            // rebuild_tray_menu(app)
        }
        "quit" => {
            // stop proxy → disable system proxy → app.exit(0)
        }
        _ if id.starts_with("profile_") => {
            let profile_id = id.strip_prefix("profile_").unwrap();
            // 异步调用 ProfileService::activate(profile_id)
            // 如果代理运行中则 restart
            // rebuild_tray_menu(app)
        }
        _ => {}
    }
})
```

#### 5.2.5 Tauri 2.x Menu API 要点

Tauri 2.x 使用 `tauri::menu` 模块构建菜单：

```rust
use tauri::menu::{
    Menu, MenuItem, Submenu, CheckMenuItem, PredefinedMenuItem,
    IsMenuItem,
};

// 分隔线
PredefinedMenuItem::separator(app)?;

// checkbox
CheckMenuItem::with_id(app, "system_proxy", "系统代理", true, checked, None::<&str>)?;

// radio 通过多个 CheckMenuItem 手动管理互斥状态实现

// submenu
let profiles_sub = Submenu::with_id(app, "profiles", "订阅配置", true)?;
profiles_sub.append(&profile_item)?;
```

> **注意**：Tauri 2.x 的 Menu API 没有原生 radio 类型。代理模式的 radio 效果通过多个 `CheckMenuItem` + 手动互斥逻辑实现（点击一个时取消其他的 checked 状态）。

#### 5.2.6 国际化

托盘菜单文案需要跟随应用语言设置。在 `rebuild_tray_menu()` 中根据当前 `AppSettings.language` 选择文案：

```rust
let labels = match language.as_str() {
    "en" => TrayLabels {
        show: "Show Clash Kite",
        hide: "Hide Clash Kite",
        rule: "Rule Mode",
        global: "Global Mode",
        direct: "Direct Mode",
        sys_proxy: "System Proxy",
        start: "Start Proxy",
        stop: "Stop Proxy",
        profiles: "Profiles",
        quit: "Quit Clash Kite",
    },
    _ => TrayLabels {
        show: "显示 Clash Kite",
        hide: "隐藏 Clash Kite",
        rule: "规则模式",
        global: "全局模式",
        direct: "直连模式",
        sys_proxy: "系统代理",
        start: "开启代理",
        stop: "关闭代理",
        profiles: "订阅配置",
        quit: "退出 Clash Kite",
    },
};
```

### 5.3 增强托盘功能（P1）

#### 5.3.1 代理组节点选择

在"订阅配置"菜单项之后，增加代理组子菜单，允许用户直接在托盘中切换代理节点。

```
┌──────────────────────────────────┐
│ ...（P0 菜单项）                  │
├──────────────────────────────────┤
│ 代理分组                       ▶ │  ← submenu（仅代理运行时显示）
│   ├ 🇭🇰 香港节点             ▶ │  ← 每个代理组一个子菜单
│   │   ├ ● 香港 01 (120ms)      │
│   │   ├ ○ 香港 02 (350ms)      │
│   │   └ ○ 香港 03 (timeout)    │
│   ├ 🇺🇸 美国节点             ▶ │
│   │   └ ...                     │
│   └ 🇯🇵 日本节点             ▶ │
│       └ ...                     │
├──────────────────────────────────┤
│ 退出 Clash Kite                  │
└──────────────────────────────────┘
```

**实现要点：**
- 仅代理运行中时显示
- 过滤 GLOBAL、DIRECT、REJECT 组
- 每个代理组创建 `Submenu`，组内节点用 `CheckMenuItem` 实现 radio
- 节点标签格式：`节点名 (延迟ms)` 或 `节点名 (timeout)` 或 `节点名`
- 点击节点 → `select_proxy(group, name)` → `rebuild_tray_menu()`
- 需从 mihomo API 获取实时数据（`get_proxies()`）

**性能考虑：**
- 节点数量可能很大（100+ 节点），菜单构建需控制在 < 100ms
- 延迟数据取自缓存（上次 `get_proxies()` 的结果），不在菜单构建时触发测速

#### 5.3.2 托盘图标颜色状态

根据代理运行状态和系统代理状态动态切换托盘图标颜色，提供即时的视觉反馈。

| 状态组合                   | 图标颜色 | 含义                   |
|--------------------------|---------|------------------------|
| 代理未运行                 | 灰色     | 未启动                 |
| 代理运行 + 无系统代理       | 白色     | 运行但未接管系统流量   |
| 代理运行 + 系统代理启用     | 蓝色     | 系统流量已代理         |
| 代理运行 + TUN 启用         | 绿色     | TUN 全局代理（未来）   |
| 代理运行 + 系统代理 + TUN   | 红色     | 双重代理（未来）       |

**实现方案：**
- 准备 4-5 套图标资源（`.ico` for Windows, `.png` for macOS）
- 放置在 `src-tauri/icons/tray/` 目录
- 在 `rebuild_tray_menu()` 中同时调用 `tray.set_icon()` 更新图标

```rust
fn get_tray_icon(status: &ProxyStatus) -> Icon {
    let icon_name = match (status.running, status.system_proxy) {
        (false, _) => "tray_gray",
        (true, false) => "tray_white",
        (true, true) => "tray_blue",
    };
    load_icon(icon_name)
}
```

#### 5.3.3 打开目录

在退出菜单项前增加"打开目录"子菜单：

```
│ 打开目录                       ▶ │
│   ├ 应用数据目录                 │  → ~/.config/clash-kite/
│   ├ 配置文件目录                 │  → ~/.config/clash-kite/profiles/
│   └ 日志文件                     │  → ~/.config/clash-kite/mihomo.log
```

**实现**：使用 `tauri::api::shell::open()` 或 `std::process::Command` 打开文件管理器。

#### 5.3.4 重启应用

```rust
"restart" => {
    app.restart();
    // Tauri 2.x: AppHandle::restart() 自动 relaunch + quit
}
```

### 5.4 托盘实现任务分解

#### P0 任务

| # | 任务                          | 涉及文件                       | 估时  |
|---|-------------------------------|-------------------------------|-------|
| 1 | 重构托盘菜单构建为独立模块     | 新建 `src-tauri/src/tray.rs`   | 1h    |
| 2 | 实现 `rebuild_tray_menu()`    | `tray.rs`                      | 2h    |
| 3 | 显示/隐藏窗口（动态文案）      | `tray.rs`                      | 0.5h  |
| 4 | 代理模式 radio 切换            | `tray.rs`                      | 1h    |
| 5 | 系统代理 checkbox              | `tray.rs`                      | 0.5h  |
| 6 | 代理开关（动态文案）           | `tray.rs`                      | 0.5h  |
| 7 | 配置切换子菜单                 | `tray.rs`                      | 1h    |
| 8 | 各 Command 中注入菜单刷新      | `commands/*.rs` 或 `lib.rs`    | 1h    |
| 9 | 托盘菜单国际化                 | `tray.rs`                      | 0.5h  |

#### P1 任务

| #  | 任务                   | 涉及文件                       | 估时  |
|----|------------------------|-------------------------------|-------|
| 10 | 代理组节点选择子菜单    | `tray.rs`                      | 2h    |
| 11 | 托盘图标颜色状态        | `tray.rs`, 图标资源文件         | 1.5h  |
| 12 | 打开目录子菜单          | `tray.rs`                      | 0.5h  |
| 13 | 重启应用                | `tray.rs`                      | 0.5h  |

**总估时**：P0 约 8h，P1 约 4.5h

### 5.5 托盘图标

当前使用应用默认窗口图标：`app.default_window_icon()`。P1 阶段将引入多色图标资源。

---

## 6. 窗口管理

### 6.1 关闭行为

窗口关闭请求被拦截，改为隐藏窗口而非退出：

```rust
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
    }
})
```

用户必须通过托盘菜单的 "Quit" 选项才能完全退出应用。

### 6.2 窗口配置

定义在 `tauri.conf.json` 中：
- 标题：Clash Kite
- 自定义标题栏区域：Layout 组件顶部 `drag-region` div

---

## 7. 前端 UI 交互

### 7.1 Settings 页面结构

```
Settings 页面
├── 外观 (Appearance)
│   └── 主题切换：light / dark / system 三选一按钮组
│
├── 通用 (General)
│   ├── 语言切换：English / 中文 按钮组
│   └── 最小化到托盘：Switch 开关
│
├── 代理设置 (Proxy Settings)
│   └── 系统代理：Switch 开关（代理未运行时 disabled）
│
└── 关于 (About)
    └── Clash Kite v0.1.0, 基于 mihomo (Clash Meta)
```

### 7.2 useSettingsStore

```typescript
interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;

  fetchSettings();                        // 从 SQLite 加载
  updateSettings(patch: Partial<AppSettings>);  // 部分更新
}
```

**乐观更新 + 回滚策略：**
```
updateSettings(patch):
  1. 合并 patch 到当前 settings
  2. 立即 set({ settings: updated })  ← 乐观更新
  3. await api.saveSettings(updated)
  4. 失败 → set({ settings: current })  ← 回滚
```

如果后端不可用，`fetchSettings()` 会使用硬编码默认值。

---

## 8. 未来规划

### 8.1 WebDAV 配置同步（P1）

**目标**：用户可将配置备份到 WebDAV 服务器（如坚果云、NextCloud），并在其他设备恢复。

**技术方案设计：**

```
┌───────────────┐     reqwest     ┌───────────────┐
│  Clash-Kite   │ ──── WebDAV ──► │  WebDAV Server│
│               │  PUT/GET/PROPFIND│  (坚果云等)   │
└───────────────┘                 └───────────────┘
```

**数据结构（新增）：**
```rust
pub struct WebDavConfig {
    pub url: String,         // WebDAV 服务器地址
    pub username: String,    // 用户名
    pub password: String,    // 密码（需加密存储）
    pub remote_path: String, // 远程目录路径
}
```

**功能点：**
- 手动备份：打包所有 profiles YAML + settings 为一个 JSON/tar
- 手动恢复：从 WebDAV 下载并导入
- 自动同步：可选，定时备份
- 冲突处理：以时间戳为准，或提供选择

**实现要点：**
- Rust 侧使用 reqwest 发送 WebDAV 请求（PUT/GET/PROPFIND/MKCOL）
- 密码使用平台密钥链存储（Windows Credential Manager / macOS Keychain）或 AES 加密后存 SQLite
- 新增 `SyncService` 和对应的 Tauri Commands

### 8.2 已拆分模块文档

> 以下功能已迁移为独立模块文档，后续实现/代码生成请以独立文档为准：
> - [sysproxy-module.md](sysproxy-module.md) — 系统代理（manual/PAC、绕过列表）
> - [tun-module.md](tun-module.md) — TUN 虚拟网卡（stack、权限、路由）
> - [resources-module.md](resources-module.md) — 外部资源（GeoData、Provider）
> - [dns-module.md](dns-module.md) — DNS 配置（fake-ip、nameserver、fallback）
> - [sniffer-module.md](sniffer-module.md) — 域名嗅探（协议检测、force/skip-domain）

### 8.3 工作目录配置（P1）

> 参考 clash-party 的工作目录功能，允许用户自定义数据存储目录。

**目标**：允许用户配置独立的数据存储目录，实现多实例数据隔离或将数据放在指定位置。

**数据模型变更（AppSettings 新增字段）：**

```rust
pub struct AppSettings {
    // ... 现有字段 ...
    pub work_dir: Option<String>,    // 自定义工作目录，None 表示使用默认目录
}
```

**Settings 页面新增：**

```
├── 高级 (Advanced)
│   └── 工作目录: [~/.config/clash-kite/    ] [浏览] [重置默认]
│       提示：修改后需重启应用生效
```

**实现要点：**
- 默认目录：`~/.config/clash-kite/`（各平台等价路径）
- 修改工作目录后需要重启应用（提示用户）
- 切换目录时提供"迁移数据"选项（复制现有 profiles + data.db + data/ 到新目录）
- 新增 Tauri Commands：
  - `get_work_dir` — 返回当前工作目录路径
  - `set_work_dir(path)` — 设置新工作目录并提示重启
  - `migrate_work_dir(from, to)` — 迁移数据到新目录

### 8.4 MetaCubeXd Dashboard 集成（P2）

> 参考 clash-party，集成 mihomo 官方 Web Dashboard。

**目标**：提供内置的 MetaCubeXd Dashboard 访问入口，作为备用的代理管理界面。

**实现方式（二选一）：**

| 方案 | 说明 | 优点 | 缺点 |
| ---- | ---- | ---- | ---- |
| 外部浏览器打开 | 点击按钮在浏览器中打开 `http://127.0.0.1:{external-controller-port}/ui` | 实现简单 | 需要下载 dashboard 资源 |
| 内嵌 WebView | 在应用内新开一个页面/窗口加载 dashboard URL | 无缝体验 | 需额外窗口管理 |

**推荐方案 A（外部浏览器）：**
- 在 Settings 页面"关于"区域添加"打开 Dashboard"按钮
- 使用 `tauri::api::shell::open()` 打开 `http://127.0.0.1:{port}/ui`
- 需要先确保 external-controller 已配置且 dashboard 资源已下载
- Dashboard 资源（metacubexd）下载到 `data/ui/` 目录

**前端入口：**

```
Settings 页面
├── 关于 (About)
│   ├── Clash Kite v0.1.0
│   ├── [检查更新]
│   └── [打开 MetaCubeXd Dashboard]  ← 新增
```

**Tauri Command 契约：**

| Command                   | 参数 | 返回值                           | 说明                  |
| ------------------------- | ---- | -------------------------------- | --------------------- |
| `open_dashboard`          | 无   | `()`                             | 在浏览器中打开 Dashboard |
| `check_dashboard_exists`  | 无   | `bool`                           | 检查 dashboard 资源是否存在 |
| `download_dashboard`      | 无   | `()`                             | 下载 metacubexd 资源  |

### 8.5 开机自启（P1）

**目标**：应用跟随系统启动。

**技术方案：**

| 平台    | 实现方式                                     |
| ------- | -------------------------------------------- |
| Windows | 写入注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |
| macOS   | 创建 `~/Library/LaunchAgents/com.clash-kite.plist` |

**或使用 Tauri 插件：** `tauri-plugin-autostart`（如果 Tauri 2.x 生态已支持）。

### 8.4 应用自动更新（P1）

**目标**：自动检查 GitHub Release 是否有新版本，提示用户下载安装。

**技术方案设计（参考 clash-party 的更新机制）：**

```
应用启动 / 手动点击"检查更新"
  │
  ▼
GET https://api.github.com/repos/{owner}/{repo}/releases/latest
  │
  ▼
比较 tag_name 与当前版本 (semver)
  │
  ├─ 无更新 → 不提示（启动时静默）/ 提示"已是最新版本"（手动时）
  │
  └─ 有更新 → 弹出更新对话框
       │
       ├─ 显示：版本号、更新日志（release body）、安装包大小
       ├─ "立即更新" → 下载对应平台安装包 → 打开安装 → 退出应用
       ├─ "稍后提醒" → 关闭对话框，下次启动再提示
       └─ "跳过此版本" → 记录跳过的版本号到 settings，不再提示该版本
```

**数据结构（新增）：**

```rust
pub struct UpdateInfo {
    pub current_version: String,     // 当前应用版本
    pub latest_version: String,      // 最新版本
    pub has_update: bool,            // 是否有更新
    pub release_notes: String,       // 更新日志（GitHub Release body）
    pub download_url: String,        // 对应平台的安装包下载 URL
    pub published_at: String,        // 发布时间
}
```

**平台安装包匹配逻辑：**

```
GitHub Release assets 筛选：
  Windows → *.msi 或 *.exe (NSIS installer)
  macOS (Intel) → *_x64.dmg
  macOS (Apple Silicon) → *_aarch64.dmg
```

**实现要点：**

- Rust 侧使用 reqwest 请求 GitHub API（需处理 rate limit，可带 User-Agent）
- 版本比较使用 semver crate 进行语义化版本对比
- 下载安装包到临时目录，完成后调用系统命令打开安装器
- 也可考虑使用 `tauri-plugin-updater`（Tauri 2.x 官方更新插件），支持静默下载和安装
- 新增 AppSettings 字段：`skipped_version: Option<String>`（跳过的版本号）
- 新增 Tauri Commands：`check_for_update`、`download_and_install_update`
- 检查频率：启动时检查一次，之后每 24h 检查一次（后台定时器）

**前端 UI：**

- Settings 页面"关于"部分显示当前版本和"检查更新"按钮
- 更新弹窗使用 `AlertDialog`，展示更新日志（Markdown 渲染）

### 8.5 规则管理与覆写系统（P2）

> 已拆分为独立模块文档，详见 **[rules-module.md](rules-module.md)**。
>
> 包含：规则查看（列表/搜索/统计）、Rule Provider 管理、YAML 覆写（deep_merge）、JavaScript 覆写（boa_engine）、全局/订阅级覆写、配置生成流程等。

### 8.6 全局快捷键（P2）

**目标**：通过全局快捷键快速操作。

**技术方案：**
- 使用 Tauri 2.x 的 global shortcut 插件
- 默认快捷键：
  - `Ctrl+Shift+P` / `Cmd+Shift+P`：切换代理开关
  - `Ctrl+Shift+M` / `Cmd+Shift+M`：切换代理模式
- 支持自定义快捷键配置
