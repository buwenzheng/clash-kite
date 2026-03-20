# Clash-Kite 架构设计文档

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Clash-Kite App                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  UI Layer (React 19 + TypeScript)                           │   │
│  │  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐    │   │
│  │  │ Dashboard  │ │  Nodes   │ │ Profiles  │ │ Settings │    │   │
│  │  └───────────┘ └──────────┘ └───────────┘ └──────────┘    │   │
│  │        │            │             │             │           │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │ State Management (Zustand)                          │   │   │
│  │  │ useProxyStore | useProfileStore | useSettingsStore   │   │   │
│  │  └──────────────────────┬──────────────────────────────┘   │   │
│  │                         │                                   │   │
│  │  ┌──────────────────────┴──────────────────────────────┐   │   │
│  │  │ API Layer (src/api/index.ts)                        │   │   │
│  │  │ Tauri invoke() 封装                                 │   │   │
│  │  └──────────────────────┬──────────────────────────────┘   │   │
│  └─────────────────────────┼───────────────────────────────────┘   │
│                            │ Tauri IPC (JSON-RPC)                  │
│  ┌─────────────────────────┼───────────────────────────────────┐   │
│  │  Rust Backend           │                                   │   │
│  │  ┌──────────────────────┴──────────────────────────────┐   │   │
│  │  │ Commands Layer (src-tauri/src/commands/)             │   │   │
│  │  │ proxy.rs | profile.rs | settings.rs                 │   │   │
│  │  └──────────────────────┬──────────────────────────────┘   │   │
│  │                         │                                   │   │
│  │  ┌──────────────────────┴──────────────────────────────┐   │   │
│  │  │ Services Layer (src-tauri/src/services/)            │   │   │
│  │  │ ProxyService | ProfileService | SettingsService     │   │   │
│  │  └───────┬──────────────┬──────────────────────────────┘   │   │
│  │          │              │                                   │   │
│  │  ┌───────┴──────┐ ┌────┴─────────┐                        │   │
│  │  │ Core Layer   │ │ Data Layer   │                        │   │
│  │  │ mihomo.rs    │ │ db/mod.rs    │                        │   │
│  │  │ mihomo_api.rs│ │ (SQLite)     │                        │   │
│  │  │ sysproxy.rs  │ │              │                        │   │
│  │  └───────┬──────┘ └──────────────┘                        │   │
│  └──────────┼──────────────────────────────────────────────────┘   │
│             │                                                      │
│  ┌──────────┴──────────────────────────────────────────────────┐   │
│  │  mihomo Process (Sidecar)                                   │   │
│  │  RESTful API @ http://127.0.0.1:9090                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Platform Integration                                       │   │
│  │  Windows: winreg + InternetSetOptionW (系统代理)             │   │
│  │  macOS: networksetup (系统代理)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. 分层架构说明

### 2.1 UI Layer

| 组成         | 技术             | 职责                       |
| ------------ | ---------------- | -------------------------- |
| 页面组件     | React 19         | 14 个路由页面              |
| UI 基础组件  | Radix UI + shadcn/ui | Button/Card/Dialog 等  |
| 路由         | react-router-dom | BrowserRouter, 嵌套路由    |
| 样式         | Tailwind CSS     | 原子化 CSS，darkMode: class |
| 国际化       | i18next          | 中/英双语                  |
| 图标         | lucide-react     | SVG 图标库                 |

### 2.2 State Management Layer

三个独立的 Zustand Store，每个 Store 封装对应领域的状态和异步操作：

| Store            | 状态                          | 核心方法                                     |
| ---------------- | ----------------------------- | -------------------------------------------- |
| useProxyStore    | status, groups, loading, error | toggleProxy, setMode, selectProxy, testDelay |
| useProfileStore  | profiles, loading, error       | importFile, importSubscription, activate     |
| useSettingsStore | settings, loading              | fetchSettings, updateSettings               |

**数据流模式**：单向数据流。Store 方法调用 API Layer → Tauri IPC → Rust Backend → 返回结果 → set() 更新状态 → React 自动 re-render。

### 2.3 API Layer

`src/api/index.ts` 是前后端的桥梁，所有函数都是对 `@tauri-apps/api/core` 中 `invoke()` 的薄封装。

特点：
- 强类型：每个函数都有完整的 TypeScript 输入/输出类型
- 零网络：Tauri IPC 基于进程内通信，非 HTTP
- 同时使用 `@tauri-apps/plugin-dialog` 进行原生文件对话框

### 2.4 Commands Layer

Rust 侧的 `#[tauri::command]` 函数。职责：
- 接收前端参数（自动 JSON 反序列化）
- 调用对应 Service
- 统一错误处理（`Result<T, String>`）
- 跨 Service 协调（例如 `activate_profile` 同时调用 ProfileService 和 ProxyService）

### 2.5 Services Layer

业务逻辑核心，通过 `app.manage()` 注入为 Tauri 全局状态：

| Service          | 依赖                 | 职责                               |
| ---------------- | -------------------- | ---------------------------------- |
| ProxyService     | MihomoManager        | 代理状态管理、模式切换、节点操作   |
| ProfileService   | SQLite Connection    | 配置 CRUD、订阅下载、YAML 校验    |
| SettingsService  | SQLite Connection    | 设置键值对读写                     |
| RulesService     | MihomoApi            | 规则查看、Rule Provider（计划中）  |
| OverrideService  | SQLite + 文件系统     | 覆写 CRUD、配置合并引擎（计划中）  |

### 2.6 Core Layer

| 模块                | 文件              | 职责                                     |
| ------------------- | ----------------- | ---------------------------------------- |
| MihomoManager       | `mihomo.rs`       | mihomo 进程生命周期管理                  |
| MihomoApi           | `mihomo_api.rs`   | mihomo RESTful API 客户端                |
| sysproxy            | `sysproxy.rs`     | 跨平台系统代理设置                       |
| AutoUpdateScheduler | `scheduler.rs`    | 订阅自动更新后台调度器（计划中）         |
| OverrideEngine      | `override_engine.rs` | YAML deep_merge + JS 执行引擎（计划中） |

### 2.7 Data Layer

SQLite 数据库，通过 rusqlite 直接访问。

---

## 3. 技术栈详情

### 3.1 前端依赖

**生产依赖：**

| 包名                             | 用途                 |
| -------------------------------- | -------------------- |
| react / react-dom                | UI 框架              |
| react-router-dom                 | 路由                 |
| zustand                          | 状态管理             |
| i18next / react-i18next          | 国际化               |
| @tauri-apps/api                  | Tauri IPC            |
| @tauri-apps/plugin-dialog        | 原生文件对话框       |
| @tauri-apps/plugin-opener        | 系统默认程序打开     |
| @radix-ui/react-*                | 无样式 UI 原语       |
| class-variance-authority         | 组件变体管理         |
| clsx / tailwind-merge            | className 合并       |
| lucide-react                     | 图标                 |

**开发依赖：**

| 包名                     | 用途         |
| ------------------------ | ------------ |
| vite / @vitejs/plugin-react | 构建工具   |
| typescript               | 类型系统     |
| tailwindcss              | CSS 框架     |
| @tailwindcss/postcss     | PostCSS 集成 |
| @tauri-apps/cli          | Tauri CLI    |

### 3.2 Rust 依赖

| Crate         | 用途                          |
| ------------- | ----------------------------- |
| tauri (2.x)   | 桌面应用框架（含 tray-icon）  |
| tokio         | 异步运行时                    |
| reqwest       | HTTP 客户端（访问 mihomo API）|
| rusqlite      | SQLite 数据库                 |
| serde / serde_json / serde_yaml | 序列化       |
| dirs          | 跨平台系统目录                |
| chrono        | 日期时间                      |
| uuid          | UUID 生成                     |
| anyhow        | 错误处理                      |
| log / env_logger | 日志                       |
| urlencoding   | URL 编码                      |
| base64        | Base64 解码（订阅内容）       |
| winreg        | Windows 注册表（仅 Windows）  |

---

## 4. 数据库设计

### 4.1 数据库文件

路径：`~/.config/clash-kite/data.db`（或各平台等价的 config 目录）

配置：`PRAGMA journal_mode=WAL`（Write-Ahead Logging，提升并发读写性能）

### 4.2 表结构

#### profiles 表

```sql
CREATE TABLE IF NOT EXISTS profiles (
    id                    TEXT PRIMARY KEY,     -- UUID v4
    name                  TEXT NOT NULL,        -- 用户自定义名称
    source                TEXT NOT NULL DEFAULT 'local',  -- 'local' | 'subscription'
    file_path             TEXT NOT NULL,        -- YAML 文件绝对路径
    sub_url               TEXT,                 -- 订阅 URL（仅 subscription 类型）
    updated_at            TEXT NOT NULL,        -- RFC 3339 时间戳
    is_active             INTEGER NOT NULL DEFAULT 0,  -- 0 或 1，同一时刻仅一个为 1
    auto_update           INTEGER NOT NULL DEFAULT 0,  -- 自动更新开关（计划中）
    auto_update_interval  INTEGER NOT NULL DEFAULT 480  -- 自动更新间隔/分钟（计划中）
);
```

#### settings 表

```sql
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,    -- 设置键名
    value TEXT NOT NULL         -- 设置值（字符串化）
);
```

**settings 使用的键名：**

| key              | 类型    | 默认值   | 说明         |
| ---------------- | ------- | -------- | ------------ |
| theme            | string  | "system" | 主题模式     |
| language         | string  | "zh"     | 界面语言     |
| auto_start       | bool    | false    | 开机自启     |
| minimize_to_tray | bool    | true     | 最小化到托盘 |
| start_minimized  | bool    | false    | 启动时最小化 |
| system_proxy     | bool    | false    | 系统代理     |
| tun_mode         | bool    | false    | TUN 模式     |

#### overrides 表（计划中 — P2）

```sql
CREATE TABLE IF NOT EXISTS overrides (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'local',
    ext         TEXT NOT NULL DEFAULT 'yaml',
    url         TEXT,
    file_path   TEXT NOT NULL,
    global      INTEGER NOT NULL DEFAULT 0,
    enabled     INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL
);
```

#### profile_overrides 表（计划中 — P2）

```sql
CREATE TABLE IF NOT EXISTS profile_overrides (
    profile_id  TEXT NOT NULL,
    override_id TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (profile_id, override_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (override_id) REFERENCES overrides(id) ON DELETE CASCADE
);
```

### 4.3 文件存储

| 路径                                | 说明                    |
| ----------------------------------- | ----------------------- |
| `~/.config/clash-kite/`             | 应用根配置目录          |
| `~/.config/clash-kite/data.db`      | SQLite 数据库           |
| `~/.config/clash-kite/profiles/`    | 配置文件目录            |
| `~/.config/clash-kite/profiles/{uuid}.yaml` | 单个配置文件   |
| `~/.config/clash-kite/overrides/`           | 覆写文件目录（计划中） |
| `~/.config/clash-kite/overrides/{uuid}.yaml` | YAML 覆写文件（计划中）|
| `~/.config/clash-kite/overrides/{uuid}.js`   | JS 覆写文件（计划中）  |
| `~/.config/clash-kite/overrides/{uuid}.log`  | JS 执行日志（计划中）  |
| `~/.config/clash-kite/data/`        | mihomo 运行时数据目录   |
| `~/.config/clash-kite/data/config.yaml`    | 最终生成配置（计划中）|
| `~/.config/clash-kite/data/country.mmdb` | GeoIP 数据        |
| `~/.config/clash-kite/data/geoip.dat`    | GeoIP 数据        |
| `~/.config/clash-kite/data/geosite.dat`  | GeoSite 数据      |
| `~/.config/clash-kite/mihomo.log`   | mihomo 日志文件         |

---

## 5. 数据流总览

### 5.1 前端→后端完整调用链

```
React Component
  → Zustand Store Action (e.g. toggleProxy)
    → API Function (src/api/index.ts, invoke())
      → Tauri IPC Bridge (JSON-RPC, 进程内通信)
        → #[tauri::command] (commands/*.rs)
          → Service Method (services/*.rs)
            → Core / DB / External API
              ↪ mihomo Process (HTTP 127.0.0.1:9090)
              ↪ SQLite Database
              ↪ System API (winreg / networksetup)
          ← Result<T, String>
        ← Tauri IPC 返回
      ← Promise<T>
    ← set({ ... }) 更新 Store
  ← React re-render
```

### 5.2 事件驱动流（Tauri → Frontend）

```
System Tray "Toggle Proxy" 点击
  → Tauri on_menu_event
    → app.emit("toggle-proxy", ())
      → 前端 listen("toggle-proxy") (App.tsx)
        → useProxyStore.toggleProxy()
          → 标准调用链...
```

### 5.3 定时轮询流

```
Layout 组件 mount
  → useEffect: setInterval(pollTraffic, 2000)
    → fetchTraffic() → invoke("get_traffic")
      → ProxyService.get_traffic()
        → MihomoApi.get_traffic() (GET /traffic)
    → setTraffic(data)  (React useState)
```

### 5.4 后台调度流（计划中）

```
AutoUpdateScheduler (tokio::spawn, 应用启动时创建)
  → 每 60s 唤醒
    → 查询 auto_update=1 的订阅配置
      → 判断 now - updated_at >= interval
        → 下载更新 → 覆盖文件 → 更新时间戳
          → 是激活配置 && 代理运行中 → ProxyService.restart()
          → 发送系统通知 (tauri-plugin-notification)
```

---

## 6. 目录结构

```
clash-kite/
├── PRD.md                          # 产品需求文档（概览）
├── docs/                           # 详细设计文档
│   ├── architecture.md             # 本文档
│   ├── proxy-module.md             # 代理模块设计
│   ├── profile-module.md           # 配置管理模块设计
│   ├── settings-module.md          # 设置与系统集成设计
│   ├── dns-module.md               # DNS 配置模块设计
│   ├── sniffer-module.md           # 域名嗅探模块设计
│   └── api-reference.md            # API 接口参考
│
├── src/                            # 前端源码
│   ├── main.tsx                    # 入口
│   ├── App.tsx                     # 路由 + 托盘事件监听
│   ├── i18n.ts                     # i18next 配置
│   ├── globals.css                 # 全局样式 + 主题变量
│   ├── vite-env.d.ts               # Vite 类型声明
│   ├── api/
│   │   └── index.ts                # Tauri IPC 封装（30+ 函数）
│   ├── types/
│   │   └── index.ts                # TypeScript 类型定义
│   ├── lib/
│   │   └── utils.ts                # cn() 等工具函数
│   ├── store/
│   │   ├── index.ts                # Store 统一导出
│   │   ├── proxy.ts                # useProxyStore
│   │   ├── config.ts               # useProfileStore
│   │   └── settings.ts             # useSettingsStore
│   ├── components/
│   │   ├── Layout.tsx              # 侧边栏 + 代理开关 + 流量 + 路由 Outlet
│   │   └── ui/                     # shadcn/ui 基础组件
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── badge.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       ├── scroll-area.tsx
│   │       ├── label.tsx
│   │       ├── dialog.tsx
│   │       └── alert-dialog.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx           # 仪表盘
│   │   ├── Nodes.tsx               # 节点列表
│   │   ├── Profiles.tsx            # 配置管理
│   │   ├── Logs.tsx                # 日志
│   │   ├── Connections.tsx         # 连接管理
│   │   ├── SysProxy.tsx            # 系统代理设置
│   │   ├── Tun.tsx                 # TUN 虚拟网卡
│   │   ├── Dns.tsx                 # DNS 配置
│   │   ├── Sniffer.tsx             # 域名嗅探配置
│   │   ├── Resources.tsx           # 外部资源管理
│   │   ├── Kernel.tsx              # 内核设置（含版本管理、进程优先级）
│   │   └── Settings.tsx            # 应用设置（含工作目录、Dashboard）
│   └── locales/
│       ├── zh.json                 # 中文翻译
│       └── en.json                 # 英文翻译
│
├── src-tauri/                      # Tauri / Rust 后端
│   ├── Cargo.toml                  # Rust 依赖
│   ├── tauri.conf.json             # Tauri 配置
│   ├── build.rs                    # 构建脚本
│   ├── capabilities/
│   │   └── default.json            # 权限配置
│   ├── resources/
│   │   ├── sidecar/                # mihomo 二进制
│   │   └── files/                  # GeoIP/GeoSite 数据文件
│   └── src/
│       ├── main.rs                 # 入口
│       ├── lib.rs                  # 应用初始化、托盘、命令注册
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── proxy.rs            # 代理命令（11 个）
│       │   ├── profile.rs          # 配置命令（13 个）
│       │   ├── settings.rs         # 设置命令（2 个）
│       │   ├── rules.rs            # 规则命令（计划中）
│       │   └── overrides.rs        # 覆写命令（计划中）
│       ├── services/
│       │   ├── mod.rs
│       │   ├── proxy.rs            # ProxyService
│       │   ├── profile.rs          # ProfileService
│       │   ├── settings.rs         # SettingsService
│       │   ├── rules.rs            # RulesService（计划中）
│       │   └── overrides.rs        # OverrideService（计划中）
│       ├── models/
│       │   ├── mod.rs
│       │   ├── proxy.rs            # ProxyStatus, ProxyGroup, ProxyNode, ProxyMode 等
│       │   ├── profile.rs          # ProfileInfo, ProfileSource
│       │   ├── settings.rs         # AppSettings
│       │   ├── rules.rs            # RuleItem, RuleProvider（计划中）
│       │   └── overrides.rs        # OverrideItem（计划中）
│       ├── core/
│       │   ├── mod.rs
│       │   ├── mihomo.rs           # MihomoManager（进程管理）
│       │   ├── mihomo_api.rs       # MihomoApi（HTTP API 客户端）
│       │   ├── sysproxy.rs         # 系统代理（Win/macOS/fallback）
│       │   └── scheduler.rs        # AutoUpdateScheduler（计划中）
│       └── db/
│           └── mod.rs              # SQLite 初始化 + 迁移
│
├── scripts/
│   └── prepare.mjs                 # 自动下载 mihomo + GeoIP 数据
├── public/                         # 静态资源
├── index.html                      # HTML 入口
├── package.json                    # npm 配置
├── vite.config.ts                  # Vite 配置
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.js              # Tailwind 配置
└── postcss.config.js               # PostCSS 配置
```

---

## 7. 构建与部署

### 7.1 开发环境搭建

**前置要求：**
- Node.js >= 18
- Rust (stable)
- Windows: MSVC Build Tools; macOS: Xcode Command Line Tools

**初始化流程：**

```
npm install
  └→ prepare 脚本自动执行 (scripts/prepare.mjs)
     ├→ 下载 mihomo 二进制 → src-tauri/resources/sidecar/mihomo[.exe]
     └→ 下载 GeoIP 数据文件 → src-tauri/resources/files/
```

### 7.2 开发模式

```bash
npm run tauri dev
```

启动流程：
1. Vite 启动前端开发服务器（端口 1420）
2. Tauri 编译 Rust 代码并启动桌面窗口
3. WebView 加载 `http://localhost:1420`

### 7.3 生产构建

```bash
npm run tauri build
```

构建产物：
- Windows: `.msi` / `.exe` 安装包
- macOS: `.dmg` / `.app` 应用包

**Sidecar 打包：** mihomo 二进制和 GeoIP 数据文件通过 `tauri.conf.json` 中的 `resources` 配置打包到应用内。

### 7.4 应用启动流程

```
main.rs → lib.rs run()
  ├→ env_logger 初始化（info 级别，clash_kite_app_lib 为 debug）
  ├→ 创建配置目录 (~/.config/clash-kite/)
  ├→ SQLite 数据库初始化 + 迁移
  ├→ 解析 mihomo 二进制路径（dev 模式 vs 生产模式）
  ├→ 同步数据文件（bundled → runtime data dir）
  ├→ 创建服务实例
  │   ├→ MihomoManager::new(binary_path, data_dir, config_dir)
  │   ├→ ProfileService::new(config_dir, db)
  │   ├→ ProxyService::new(mihomo)
  │   └→ SettingsService::new(db)
  ├→ app.manage() 注入所有服务
  ├→ 创建系统托盘（Show/Hide/Toggle Proxy/Quit）
  ├→ 启动 AutoUpdateScheduler（后台订阅自动更新，计划中）
  ├→ 窗口关闭事件：隐藏窗口而非退出
  └→ 注册 26 个 Tauri Command
```

### 7.5 prepare 脚本

`scripts/prepare.mjs` 在 `npm install` 后自动执行：

| 步骤 | 动作 | 来源 |
| ---- | ---- | ---- |
| 1 | 获取 mihomo 最新版本号 | GitHub Releases API |
| 2 | 下载平台对应的 mihomo 二进制 | GitHub Releases |
| 3 | 解压（Windows: zip, macOS/Linux: gz） | — |
| 4 | 下载 country.mmdb, geoip.metadb, geosite.dat, geoip.dat | meta-rules-dat Releases |

支持自动重试（3 次），已存在的文件自动跳过。

---

## 8. 跨平台差异

| 功能         | Windows                            | macOS                          |
| ------------ | ---------------------------------- | ------------------------------ |
| 系统代理设置 | winreg 注册表 + InternetSetOptionW | networksetup 命令行            |
| mihomo 二进制 | mihomo.exe                        | mihomo                         |
| 解压方式     | PowerShell Expand-Archive          | zlib gunzip + chmod 755        |
| 配置目录     | `%APPDATA%/clash-kite`             | `~/Library/Application Support/clash-kite` |
| 数据库路径   | `%APPDATA%/clash-kite/data.db`     | `~/Library/Application Support/clash-kite/data.db` |
