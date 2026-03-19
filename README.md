# Clash-Kite

一款基于 ClashMeta 内核的现代化跨平台代理客户端，使用 Tauri + React + TypeScript + Rust 构建。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey.svg)]()

[English](./README_EN.md) | 中文

## 功能特性

- 🚀 **跨平台**：原生支持 Windows 和 macOS
- 🎨 **现代UI**：基于 Shadcn/ui 和 Tailwind CSS 构建
- ⚡ **高性能**：Rust 后端 + Tauri 框架
- 🔒 **隐私优先**：无遥测、无广告、开源免费
- 🌙 **深色模式**：支持深色/浅色/跟随系统主题
- 🌍 **多语言**：支持中文和英文
- 📡 **订阅管理**：导入和管理代理订阅
- 🔄 **自动更新**：订阅自动更新
- 📊 **节点测速**：一键测试所有节点延迟

## 技术栈

### 前端

- **React 18** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 5** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **Shadcn/ui** - UI 组件库
- **Zustand** - 状态管理
- **React Router** - 路由
- **i18next** - 国际化

### 后端

- **Rust** - 系统编程语言
- **Tauri 2** - 桌面应用框架
- **Serde** - 序列化
- **Reqwest** - HTTP 客户端
- **Rusqlite** - SQLite 数据库

### 核心

- **ClashMeta** - 代理内核（计划集成）

## 项目结构

```
clash-kite/
├── src/                          # React 前端
│   ├── api/                      # API 调用
│   ├── components/               # UI 组件
│   │   └── ui/                   # Shadcn/ui 组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具函数
│   ├── locales/                  # 语言文件 (en.json, zh.json)
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # 仪表盘
│   │   ├── Nodes.tsx             # 节点管理
│   │   ├── Profiles.tsx          # 配置管理
│   │   └── Settings.tsx          # 设置
│   ├── store/                    # Zustand 状态
│   └── types/                    # TypeScript 类型
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── commands/             # Tauri 命令
│       ├── models/               # 数据模型
│       ├── services/             # 业务逻辑
│       └── utils/                # 工具函数
├── docs/                         # 文档
└── package.json
```

## 快速开始

### 环境要求

- **Node.js** >= 18
- **Rust** >= 1.70
- **Visual Studio Build Tools** (Windows)

### 安装

1. 克隆仓库：

```bash
git clone https://github.com/buwenzheng/clash-kite.git
cd clash-kite
```

2. 安装依赖：

```bash
npm install
```

3. 运行开发服务器：

```bash
npm run tauri dev
```

### 构建

构建生产版本：

```bash
npm run tauri build
```

## 开发

### 可用脚本

- `npm run dev` - 启动 Vite 开发服务器
- `npm run build` - 构建前端
- `npm run tauri dev` - 启动 Tauri 开发模式
- `npm run tauri build` - 构建桌面应用

### 代码架构

#### 前端架构

- **Components**: 基于 Shadcn/ui 的可复用组件
- **Pages**: 基于路由的页面组件
- **Store**: Zustand 状态管理
- **API**: Tauri 命令调用

#### 后端架构

- **Models**: 数据结构（Proxy、Config、Node）
- **Services**: 业务逻辑（ProxyService、ConfigService、NodeService）
- **Commands**: Tauri 命令处理器
- **Utils**: 辅助函数

## 页面说明

### 仪表盘 (Dashboard)

- 代理开关
- 实时状态显示
- 流量统计
- 端口配置

### 节点 (Nodes)

- 节点分组列表
- 延迟测试
- 节点选择
- 搜索功能

### 配置 (Profiles)

- 订阅导入
- 配置管理
- 配置切换

### 设置 (Settings)

- 主题选择（浅色/深色/跟随系统）
- 语言设置（中文/英文）
- 开机自启
- 系统代理设置

## 配置文件

配置文件存储位置：

- **Windows**: `%APPDATA%/clash-kite/`
- **macOS**: `~/Library/Application Support/clash-kite/`

## 参与贡献

欢迎贡献代码！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [FlClash](https://github.com/chen08209/FlClash) - 灵感来源和参考
- [Tauri](https://tauri.app) - 桌面应用框架
- [Shadcn/ui](https://ui.shadcn.com) - UI 组件库
- [ClashMeta](https://github.com/MetaCubeX/mihomo) - 代理内核

## 路线图

- [ ] ClashMeta 内核集成
- [ ] 系统代理配置
- [ ] TUN 模式支持
- [ ] WebDAV 同步
- [x] 多语言支持（中文、英文）
- [ ] 二维码扫描
- [ ] 流量统计
- [ ] 规则编辑器

## 联系方式

- GitHub: [@buwenzheng](https://github.com/buwenzheng)
- 仓库: [clash-kite](https://github.com/buwenzheng/clash-kite)

---

使用 Tauri + React + Rust 构建 ❤️
