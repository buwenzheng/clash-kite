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

### 3.0 页面契约表（AI 生成必读）

> 说明：本表用于后续 AI 生成代码/接口/前端页面时的“核心 prompt 契约”。下面的 3.1/3.2/3.3 旧功能明细表仅作为补充参考，不作为生成唯一依据。

| 页面 | 路由 | 优先级 | 模块文档 | 核心契约（Tauri Command + 关键 mihomo API） |
| ---- | ---- | ------ | --------- | ------------------------------------------ |
| Dashboard | `/` | P0 | [docs/proxy-module.md](docs/proxy-module.md) | `get_proxy_status/toggle_proxy/get_traffic`；依赖 `/configs`、`/traffic` |
| Nodes | `/nodes` | P0 | [docs/proxy-module.md](docs/proxy-module.md) | `get_proxy_groups/select_proxy/test_proxy_delay`；依赖 `/proxies` |
| Profiles | `/profiles` | P0 | [docs/profile-module.md](docs/profile-module.md) | 订阅导入/更新/编辑/激活；依赖本地 profile 文件与热重载 |
| Logs | `/logs` | P0 | [docs/logs-module.md](docs/logs-module.md) | `get_mihomo_log` + `start_log_stream/stop_log_stream`；`GET/WS /logs` |
| Connections | `/connections` | P0 | [docs/connections-module.md](docs/connections-module.md) | `start_connections_stream/get_connections_snapshot/close_connection`；`GET/WS /connections`、`DELETE` |
| SysProxy | `/sysproxy` | P1 | [docs/sysproxy-module.md](docs/sysproxy-module.md) | `get_sysproxy_advanced_config/set_sysproxy_advanced_config`；平台落地 PAC/绕过 |
| TUN | `/tun` | P1 | [docs/tun-module.md](docs/tun-module.md) | `get_tun_config/set_tun_config`；依赖 mihomo `tun` 配置生效（通常需重启） |
| Resources | `/resources` | P1 | [docs/resources-module.md](docs/resources-module.md) | `get_geo_config/update_geo_data` + `get_proxy_providers/update_proxy_provider` + `get_rule_providers/update_rule_provider`；`POST /configs/geo`、`/providers/*` |
| Kernel | `/kernel` | P1 | [docs/kernel-module.md](docs/kernel-module.md) | `get_kernel_settings/set_kernel_settings/apply_kernel_settings`；可用 `POST /restart` 兜底 |
| Settings | `/settings` | P0 | [docs/settings-module.md](docs/settings-module.md) | `get_settings/save_settings`；托盘基础逻辑依赖代理状态 |
| Rules | `/rules` | P2 | [docs/rules-module.md](docs/rules-module.md) | `get_rules/get_rule_providers/update_rule_provider`；依赖 `GET /rules`、`/providers/rules` |
| Overrides | `/overrides` | P2 | [docs/rules-module.md](docs/rules-module.md) | 覆写管理命令（YAML/JS、排序、全局/订阅级） |

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
│ Logs     │                               │
│ Conns    │                               │
│ ──────── │                               │
│ SysProxy │                               │
│ TUN      │                               │
│ Resources│                               │
│ Kernel   │                               │
│ Settings │                               │
│          │                               │
│ 系统代理 │                               │
│ 流量统计 │                               │
│ 代理模式 │                               │
├──────────┴───────────────────────────────┤
```

### 5.2 页面功能

| 页面        | 路由           | 核心交互                                                    | 优先级 |
| ----------- | -------------- | ----------------------------------------------------------- | ------ |
| Dashboard   | `/`            | 代理状态总览、模式切换、端口信息、活跃配置显示              | P0     |
| Nodes       | `/nodes`       | 节点分组、搜索、排序、测速、延迟颜色、类型显示、节点选择    | P0     |
| Profiles    | `/profiles`    | 订阅/本地导入、编辑、YAML 编辑器、导出、激活删除            | P0     |
| Logs        | `/logs`        | 实时日志流、级别颜色、搜索过滤、历史日志、自动滚动          | P0     |
| Connections | `/connections` | 活跃/已关闭连接、搜索、关闭、流量统计、排序、列表/表格视图  | P0     |
| SysProxy    | `/sysproxy`    | 系统代理开关、manual/PAC 模式、绕过列表、PAC 脚本           | P1     |
| TUN         | `/tun`         | TUN 开关、Stack 类型、DNS Hijack、路由设置、权限管理        | P1     |
| Resources   | `/resources`   | GeoIP/GeoSite/ASN 管理、Proxy Provider、Rule Provider       | P1     |
| Kernel      | `/kernel`      | 端口配置、日志级别、allow-lan、IPv6、外部控制器、高级选项   | P1     |
| Settings    | `/settings`    | 主题切换、语言、托盘设置、关于信息                          | P0     |
| Rules       | `/rules`       | 规则列表、搜索过滤、命中统计、启用/禁用、Rule Provider 管理 | P2     |
| Overrides   | `/overrides`   | 覆写文件管理（YAML/JS）、导入/新建/编辑/排序、全局/订阅级  | P2     |

---

## 6. 开发计划

### 6.1 已完成

- [x] 项目基础架构搭建（Tauri + React + TypeScript + Rust）
- [x] Rust 后端服务模块（ProxyService、ProfileService、SettingsService）
- [x] Tauri Command 接口（30+ 命令）
- [x] mihomo 内核集成（进程管理 + RESTful API 客户端）
- [x] 前端 UI 框架（shadcn/ui + Tailwind CSS）
- [x] Zustand 状态管理（3 个 Store）
- [x] 4 个核心页面（Dashboard、Nodes、Profiles、Settings），待新增 Logs、Connections
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

- [ ] 日志页面（实时日志流、级别颜色、搜索过滤、历史日志查看）
- [ ] 连接管理页面（活跃/已关闭连接、详情弹窗、搜索、关闭、排序、双视图）
- [ ] 系统代理页面（manual/PAC 模式、绕过列表、PAC 脚本编辑）
- [ ] TUN 虚拟网卡页面（Stack 类型、DNS Hijack、路由、权限管理）
- [ ] 外部资源页面（GeoIP/GeoSite/ASN 管理、Proxy/Rule Provider）
- [ ] 内核设置页面（端口、日志级别、allow-lan、IPv6、外部控制器、高级选项）
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
| [docs/settings-module.md](docs/settings-module.md) | 设置与系统集成模块（主题/国际化/托盘/应用级功能）     |
| [docs/sysproxy-module.md](docs/sysproxy-module.md) | 系统代理模块详细设计（manual/PAC、绕过、PAC 托管） |
| [docs/tun-module.md](docs/tun-module.md) | TUN 虚拟网卡模块详细设计（stack、权限、路由、DNS Hijack） |
| [docs/resources-module.md](docs/resources-module.md) | 外部资源模块详细设计（GeoData、Proxy/Rule Provider） |
| [docs/logs-module.md](docs/logs-module.md) | 日志模块详细设计（实时流、筛选、搜索、暂停/滚动） |
| [docs/connections-module.md](docs/connections-module.md) | 连接模块详细设计（active/closed、搜索、排序、关闭） |
| [docs/kernel-module.md](docs/kernel-module.md) | 内核设置模块详细设计（端口、log-level、allow-lan、external-controller 等） |
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
| 2026-03-20 | v2.7.0 | 新增日志(P0)、连接管理(P0)、内核设置(P1)功能设计 |
| 2026-03-20 | v2.8.0 | 新增系统代理/TUN/外部资源独立页面(P1)，侧边栏重构 |
