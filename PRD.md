# Clash-Kite 产品需求文档（PRD）

## 文档信息

| 项目         | 内容                                            |
| ------------ | ----------------------------------------------- |
| **产品名称** | Clash-Kite                                      |
| **版本**     | v0.1.0                                          |
| **目标平台** | Windows、macOS                                  |
| **技术栈**   | Tauri 2.x + React 19 + TypeScript + Rust        |
| **参考项目** | [FlClash](https://github.com/chen08209/FlClash) |
| **创建日期** | 2026-03-19                                      |
| **状态**     | MVP 开发中                                      |

> 本文档为产品级概览。技术架构详见 [docs/architecture.md](docs/architecture.md)，各功能模块详见 `docs/` 目录下的模块设计文档。

---

## 1. 产品概述

### 1.1 产品定位

Clash-Kite 是一款基于 mihomo（Clash Meta）内核的多平台代理客户端，旨在为用户提供简单易用、开源免费的代理服务管理工具。

### 1.2 产品愿景

- 成为前端开发者友好的代理客户端
- 提供现代化的 UI 设计和用户体验
- 支持多平台无缝切换

### 1.3 核心价值

| 价值       | 说明                               |
| ---------- | ---------------------------------- |
| 简单易用   | 一键连接，智能分流                 |
| 开源免费   | 无广告，无追踪                     |
| 跨平台     | Windows、macOS 统一体验            |
| 高性能     | 基于 mihomo 内核，稳定可靠         |
| 轻量级     | Tauri 框架，打包体积小（< 20 MB）  |

---

## 2. 目标用户

### 2.1 主要用户群体

| 用户类型   | 特征                   | 使用场景               |
| ---------- | ---------------------- | ---------------------- |
| 开发者     | 技术背景，熟悉代理配置 | 开发调试、访问 GitHub  |
| 普通用户   | 追求简单易用           | 日常上网、保护隐私     |
| 高级用户   | 需要精细化控制         | 自定义规则、多配置管理 |

### 2.2 用户痛点

- 现有工具配置复杂
- 界面设计陈旧
- 跨平台体验不一致
- 缺乏现代化功能（如 WebDAV 同步）

---

## 3. 功能需求

### 3.1 核心功能（P0 — 必须实现）

#### 3.1.1 代理管理

| 功能       | 描述                               | 状态 | 详细设计                                |
| ---------- | ---------------------------------- | ---- | --------------------------------------- |
| 代理开关   | 一键开启/关闭 mihomo 代理          | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 代理模式   | 直连、全局、规则三种模式           | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点选择   | 手动选择代理节点                   | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点测速   | 单节点/分组批量测试延迟            | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 系统代理   | 设置/取消系统级代理                | 已完成 | [proxy-module.md](docs/proxy-module.md) |

#### 3.1.2 配置管理

| 功能         | 描述                                   | 状态 | 详细设计                                    |
| ------------ | -------------------------------------- | ---- | ------------------------------------------- |
| 订阅导入     | 支持 URL 导入订阅（含 base64 自动解码） | 已完成 | [profile-module.md](docs/profile-module.md) |
| 本地文件导入 | 支持本地 YAML 配置导入                 | 已完成 | [profile-module.md](docs/profile-module.md) |
| 配置导出     | 导出配置为 YAML 文件                   | 已完成 | [profile-module.md](docs/profile-module.md) |
| 配置编辑     | 在线编辑 YAML 配置内容（含校验）       | 已完成 | [profile-module.md](docs/profile-module.md) |
| 订阅更新     | 手动更新订阅配置                       | 已完成 | [profile-module.md](docs/profile-module.md) |
| 订阅自动更新 | 定时自动更新订阅，支持每个订阅独立设置间隔（默认 8h），激活配置更新后自动热重载，系统通知 | 未开始 | [profile-module.md](docs/profile-module.md) |
| 配置激活     | 激活配置并自动热重载 mihomo            | 已完成 | [profile-module.md](docs/profile-module.md) |

#### 3.1.3 节点管理

| 功能             | 描述                                                         | 状态   | 详细设计                                |
| ---------------- | ------------------------------------------------------------ | ------ | --------------------------------------- |
| 节点分组         | 按代理组分组显示（Selector/URLTest/Fallback/LoadBalance/Relay）| 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点搜索         | 关键字模糊搜索                                               | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 分组折叠         | 支持折叠/展开分组                                            | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点选择         | 手动选择代理组中的节点                                       | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 单节点测速       | 测试单个节点延迟                                             | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 整组批量测速     | 一键测试组内所有节点延迟                                     | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 延迟实时显示     | 从 mihomo history 取最新延迟，替代固定 "--"                  | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 延迟颜色编码     | 绿色 <200ms / 黄色 <500ms / 红色 ≥500ms / 灰色超时          | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点排序         | 按延迟升序 / 按名称 / 默认顺序，支持切换                    | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 节点类型显示     | 显示协议类型（SS/VMess/Trojan/Hysteria2/VLESS 等）           | 已完成 | [proxy-module.md](docs/proxy-module.md) |
| 测速并发控制     | 限制同时测速数量（默认 50），防止网络拥堵                    | 已完成 | [proxy-module.md](docs/proxy-module.md) |

#### 3.1.4 系统托盘

| 功能             | 描述                                                             | 状态   | 详细设计                                      |
| ---------------- | ---------------------------------------------------------------- | ------ | --------------------------------------------- |
| 基础托盘         | 最小化到系统托盘，关闭窗口时隐藏到托盘                           | 已完成 | [settings-module.md](docs/settings-module.md) |
| 显示/隐藏窗口    | 单一菜单项切换窗口可见性                                         | 未开始 | [settings-module.md](docs/settings-module.md) |
| 代理开关         | 托盘菜单中开启/关闭代理                                          | 已完成 | [settings-module.md](docs/settings-module.md) |
| 代理模式切换     | Rule / Global / Direct 三选一（radio），反映当前模式              | 未开始 | [settings-module.md](docs/settings-module.md) |
| 系统代理开关     | checkbox 控制系统代理启用/禁用                                   | 未开始 | [settings-module.md](docs/settings-module.md) |
| 配置切换         | 子菜单列出所有配置，radio 选择激活，当前配置打勾                 | 未开始 | [settings-module.md](docs/settings-module.md) |
| 退出应用         | 退出应用并关闭 mihomo 进程                                       | 已完成 | [settings-module.md](docs/settings-module.md) |

**托盘右键菜单结构（P0 目标）：**

```
┌─────────────────────────────┐
│ 显示/隐藏窗口               │
├─────────────────────────────┤
│ ● 规则模式                  │
│ ○ 全局模式                  │
│ ○ 直连模式                  │
├─────────────────────────────┤
│ ☑ 系统代理                  │
│ 开启代理 / 关闭代理         │
├─────────────────────────────┤
│ 订阅配置                  ▶ │
│   ├ ● 配置 A（当前激活）    │
│   ├ ○ 配置 B                │
│   └ ○ 配置 C                │
├─────────────────────────────┤
│ 退出 Clash Kite             │
└─────────────────────────────┘
```

### 3.2 高级功能（P1 — 重要功能）

| 功能         | 描述                     | 状态   | 详细设计                                      |
| ------------ | ------------------------ | ------ | --------------------------------------------- |
| 系统代理     | 自动设置系统代理         | 已完成 | [proxy-module.md](docs/proxy-module.md)       |
| 多语言       | 中文、英文双语           | 已完成 | [settings-module.md](docs/settings-module.md) |
| 深色模式     | light/dark/system 三种   | 已完成 | [settings-module.md](docs/settings-module.md) |
| 流量统计     | 实时上下行流量监控       | 已完成 | [proxy-module.md](docs/proxy-module.md)       |
| 展示模式切换 | 简洁/详细模式，详细模式显示类型+协议+延迟     | 未开始 | [proxy-module.md](docs/proxy-module.md)       |
| 虚拟列表     | 大量节点时的渲染性能优化                       | 未开始 | [proxy-module.md](docs/proxy-module.md)       |
| 折叠状态持久化 | 记住用户的分组展开/折叠偏好                  | 未开始 | [proxy-module.md](docs/proxy-module.md)       |
| 托盘代理组     | 在托盘菜单中展示代理组子菜单，可直接切换节点 | 未开始 | [settings-module.md](docs/settings-module.md) |
| 托盘图标状态   | 根据代理/系统代理状态变更托盘图标颜色         | 未开始 | [settings-module.md](docs/settings-module.md) |
| 打开目录       | 子菜单快速打开应用目录/日志目录等             | 未开始 | [settings-module.md](docs/settings-module.md) |
| 重启应用       | 托盘菜单一键重启应用                         | 未开始 | [settings-module.md](docs/settings-module.md) |
| WebDAV 同步  | 备份/恢复配置到 WebDAV   | 未开始 | [settings-module.md](docs/settings-module.md) |
| TUN 模式     | 虚拟网卡代理模式         | 未开始 | [settings-module.md](docs/settings-module.md) |
| 开机自启     | 开机自动启动应用         | 未开始 | [settings-module.md](docs/settings-module.md) |
| 应用自动更新 | 检查新版本、下载安装包、提示用户更新（参考 clash-party 的 GitHub Release 检查机制） | 未开始 | [settings-module.md](docs/settings-module.md) |

### 3.3 附加功能（P2 — 锦上添花）

#### 3.3.1 规则管理

| 功能               | 描述                                                                 | 状态   | 详细设计                                  |
| ------------------ | -------------------------------------------------------------------- | ------ | ----------------------------------------- |
| 规则查看           | 列出当前生效规则（type/payload/proxy），支持搜索过滤，虚拟列表       | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 规则命中统计       | 每条规则显示命中/未命中次数、最近命中时间                            | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 规则启用/禁用      | 单条规则开关（通过 mihomo API）                                      | 未开始 | [rules-module.md](docs/rules-module.md)   |
| Rule Provider 管理 | 查看/刷新外部规则集，支持通过覆写添加新的 rule-provider              | 未开始 | [rules-module.md](docs/rules-module.md)   |

#### 3.3.2 覆写系统（Override）

| 功能               | 描述                                                                 | 状态   | 详细设计                                  |
| ------------------ | -------------------------------------------------------------------- | ------ | ----------------------------------------- |
| YAML 覆写          | 静态合并覆写，写法同订阅配置，支持 `+rules`（前插）/ `rules+`（后追）| 未开始 | [rules-module.md](docs/rules-module.md)   |
| JavaScript 覆写    | 动态脚本覆写，`main(config)` 函数接收并返回配置对象                  | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 全局覆写           | 覆写应用于所有订阅配置                                               | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 订阅级覆写         | 每个订阅可关联独立的覆写文件，按顺序合并                             | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 覆写导入           | 支持 URL 导入 / 本地文件导入 / 新建                                  | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 覆写排序           | 拖拽调整覆写应用顺序                                                 | 未开始 | [rules-module.md](docs/rules-module.md)   |
| 覆写编辑           | 内置编辑器编辑 YAML / JS 覆写内容                                    | 未开始 | [rules-module.md](docs/rules-module.md)   |

#### 3.3.3 其他 P2 功能

| 功能         | 描述               | 状态   |
| ------------ | ------------------ | ------ |
| 快捷键       | 全局快捷键控制     | 未开始 |

---

## 4. 技术栈概览

> 完整技术架构详见 [docs/architecture.md](docs/architecture.md)

| 层级       | 技术                      | 版本    |
| ---------- | ------------------------- | ------- |
| 前端框架   | React                     | 19.1.0  |
| 编程语言   | TypeScript                | 5.8.3   |
| 构建工具   | Vite                      | 7.0.4   |
| 桌面框架   | Tauri                     | 2.x     |
| 后端语言   | Rust (Edition 2021)       | —       |
| 状态管理   | Zustand                   | 5.0.12  |
| 路由       | react-router-dom          | 7.13.1  |
| UI 组件    | Radix UI + shadcn/ui      | —       |
| 样式       | Tailwind CSS              | 4.2.2   |
| 国际化     | i18next + react-i18next   | —       |
| 数据库     | SQLite (rusqlite bundled) | —       |
| 代理内核   | mihomo (Clash Meta)       | latest  |

---

## 5. 页面结构

### 5.1 布局

```
┌──────────────────────────────────────────┐
│  Title Bar (drag-region, Clash Kite)     │
├──────────┬───────────────────────────────┤
│ Sidebar  │                               │
│ ┌──────┐ │         Main Content          │
│ │ 代理 │ │                               │
│ │ 开关 │ │    <Router Outlet />          │
│ └──────┘ │                               │
│          │                               │
│ Dashboard│                               │
│ Nodes    │                               │
│ Profiles │                               │
│ Settings │                               │
│          │                               │
│ 系统代理 │                               │
│ 流量统计 │                               │
│ 代理模式 │                               │
├──────────┴───────────────────────────────┤
```

### 5.2 页面功能

| 页面       | 路由        | 核心交互                                               | 优先级 |
| ---------- | ----------- | ------------------------------------------------------ | ------ |
| Dashboard  | `/`         | 代理状态总览、模式切换、端口信息、活跃配置显示         | P0     |
| Nodes      | `/nodes`    | 节点分组、搜索、排序、测速、延迟颜色、类型显示、节点选择 | P0   |
| Profiles   | `/profiles` | 订阅/本地导入、编辑、YAML 编辑器、导出、激活删除       | P0     |
| Settings   | `/settings` | 主题切换、语言、系统代理开关、托盘设置、关于信息       | P0     |
| Rules      | `/rules`    | 规则列表、搜索过滤、命中统计、启用/禁用、Rule Provider 管理 | P2   |
| Overrides  | `/overrides`| 覆写文件管理（YAML/JS）、导入/新建/编辑/排序、全局/订阅级 | P2   |

---

## 6. 开发计划

### 6.1 已完成

- [x] 项目基础架构搭建（Tauri + React + TypeScript + Rust）
- [x] Rust 后端服务模块（ProxyService、ProfileService、SettingsService）
- [x] Tauri Command 接口（30+ 命令）
- [x] mihomo 内核集成（进程管理 + RESTful API 客户端）
- [x] 前端 UI 框架（shadcn/ui + Tailwind CSS）
- [x] Zustand 状态管理（3 个 Store）
- [x] 4 个核心页面（Dashboard、Nodes、Profiles、Settings）
- [x] 多语言支持（中文、英文）
- [x] 系统托盘基础功能（显示/隐藏/切换代理/退出）
- [x] 节点测速功能（TCP 连接测试 via mihomo API）
- [x] 配置文件导入/导出/编辑功能
- [x] 订阅管理（导入、更新、base64 自动解码）
- [x] 系统代理集成（Windows 注册表 / macOS networksetup）
- [x] 深色模式（light/dark/system）
- [x] 实时流量监控（2s 轮询）
- [x] prepare 脚本（自动下载 mihomo 二进制 + GeoIP 数据文件）

### 6.2 待完成

- [ ] 托盘菜单增强（模式切换、系统代理开关、配置切换子菜单）
- [ ] 托盘 P1 功能（代理组节点选择、图标颜色状态、打开目录、重启应用）
- [ ] 订阅自动更新（每个订阅独立间隔，默认 8h，激活配置自动热重载，系统通知）
- [ ] WebDAV 配置同步
- [ ] TUN 模式支持
- [ ] 开机自启功能
- [ ] 应用自动更新（GitHub Release 检查、下载安装包、提示更新）
- [ ] 规则查看页面（规则列表、搜索过滤、命中统计、启用/禁用）
- [ ] 覆写系统（YAML + JS 覆写、全局/订阅级、导入/排序/编辑）
- [ ] Rule Provider 管理（查看/刷新/添加外部规则集）
- [ ] 全局快捷键
- [ ] UI 细节优化与动效
- [ ] 全面测试与 Bug 修复
- [ ] 性能优化
- [ ] 打包发布

---

## 7. 相关文档

| 文档 | 说明 |
| ---- | ---- |
| [docs/architecture.md](docs/architecture.md)     | 整体架构设计、技术栈、数据流、数据库 Schema、构建部署 |
| [docs/proxy-module.md](docs/proxy-module.md)     | 代理模块详细设计（mihomo 集成、状态机、时序图）       |
| [docs/profile-module.md](docs/profile-module.md) | 配置管理模块详细设计（导入/导出/编辑/激活链路）       |
| [docs/settings-module.md](docs/settings-module.md) | 设置与系统集成模块（主题/国际化/托盘/未来规划）     |
| [docs/rules-module.md](docs/rules-module.md)       | 规则管理与覆写系统模块详细设计                       |
| [docs/api-reference.md](docs/api-reference.md)     | 完整 Tauri Command 接口参考                           |

---

## 8. 风险评估

| 风险                        | 影响 | 概率 | 应对措施                  |
| --------------------------- | ---- | ---- | ------------------------- |
| mihomo 内核版本兼容性       | 高   | 中   | 锁定 API 版本，定期测试   |
| Tauri 2.x 跨平台差异       | 中   | 中   | 平台条件编译，充分测试    |
| 系统代理权限问题            | 中   | 中   | 优雅降级，提示用户        |
| TUN 模式需要管理员权限      | 高   | 高   | 提供权限提升引导          |

---

## 9. 成功指标

### 技术指标

- 应用启动时间 < 2 秒
- 内存占用 < 100 MB
- 打包体积 < 20 MB
- 代理切换响应时间 < 1 秒
- mihomo 进程启动并就绪 < 10 秒

### 用户指标

- 用户评分 > 4.5（5 分制）
- 月活跃用户 > 1000（初期）

---

## 10. 术语说明

| 术语      | 说明                                       |
| --------- | ------------------------------------------ |
| mihomo    | Clash Meta 的社区继承项目，Go 语言代理内核 |
| 订阅      | 包含代理节点信息的 URL，可能返回 YAML 或 base64 编码内容 |
| 规则      | 定义流量走向的配置（域名匹配、IP 匹配等） |
| TUN 模式  | 虚拟网卡代理模式，可代理所有系统流量       |
| Sidecar   | Tauri 的外部二进制集成方式                 |

---

## 11. 参考资料

- [mihomo 项目](https://github.com/MetaCubeX/mihomo)
- [FlClash 项目](https://github.com/chen08209/FlClash)
- [Tauri 官方文档](https://tauri.app)
- [React 官方文档](https://react.dev)
- [mihomo API 文档](https://wiki.metacubex.one/api/)

---

## 12. 变更记录

| 日期       | 版本   | 变更内容                                         |
| ---------- | ------ | ------------------------------------------------ |
| 2026-03-19 | v1.0.0 | 初始版本                                         |
| 2026-03-19 | v1.1.0 | 完成前后端架构搭建，UI 框架和组件库集成          |
| 2026-03-19 | v1.2.0 | 添加多语言支持（中文、英文）                     |
| 2026-03-19 | v1.3.0 | 添加系统托盘功能，完善节点测速                   |
| 2026-03-19 | v2.0.0 | MVP 阶段完成，集成 mihomo 内核                   |
| 2026-03-20 | v2.1.0 | PRD 重构：拆分模块文档，同步代码实现，修正技术栈 |
| 2026-03-20 | v2.2.0 | 新增订阅自动更新功能需求（per-profile 间隔、热重载、系统通知） |
| 2026-03-20 | v2.3.0 | 节点管理功能增强：排序、延迟颜色、类型显示、并发控制、展示模式等 |
| 2026-03-20 | v2.4.0 | 新增系统托盘右键菜单完整功能设计（模式切换、代理组、配置切换等） |
| 2026-03-20 | v2.5.0 | 应用自动更新从 P2 提升至 P1 |
| 2026-03-20 | v2.6.0 | P2 规则管理详细设计：规则查看/覆写系统(YAML+JS)/Rule Provider |
