# Clash-Kite 开发文档

## 目录

- [开发环境搭建](#开发环境搭建)
- [项目架构](#项目架构)
- [前端开发](#前端开发)
- [后端开发](#后端开发)
- [API 文档](#api-文档)
- [国际化](#国际化)

## 开发环境搭建

### 环境要求

- **Node.js** >= 18
- **Rust** >= 1.70
- **Visual Studio Build Tools** (Windows)

### 安装步骤

1. 克隆仓库：

```bash
git clone https://github.com/buwenzheng/clash-kite.git
cd clash-kite
```

2. 安装依赖：

```bash
npm install
```

3. 启动开发服务器：

```bash
npm run tauri dev
```

## 项目架构

### 目录结构

```
clash-kite/
├── src/                          # React 前端
│   ├── api/                      # API 调用封装
│   ├── components/               # UI 组件
│   │   ├── ui/                   # Shadcn/ui 基础组件
│   │   └── Layout.tsx            # 布局组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── i18n.ts                   # 国际化配置
│   ├── lib/                      # 工具函数
│   ├── locales/                  # 语言文件
│   │   ├── en.json               # 英文
│   │   └── zh.json               # 中文
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx         # 仪表盘
│   │   ├── Nodes.tsx             # 节点管理
│   │   ├── Profiles.tsx          # 配置管理
│   │   └── Settings.tsx          # 设置
│   ├── store/                    # Zustand 状态
│   │   ├── proxy.ts              # 代理状态
│   │   ├── node.ts               # 节点状态
│   │   └── config.ts             # 配置状态
│   └── types/                    # TypeScript 类型
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── commands/             # Tauri 命令
│       │   ├── proxy.rs          # 代理命令
│       │   ├── node.rs           # 节点命令
│       │   └── config.rs         # 配置命令
│       ├── models/               # 数据模型
│       │   ├── proxy.rs          # 代理模型
│       │   ├── node.rs           # 节点模型
│       │   └── config.rs         # 配置模型
│       ├── services/             # 业务逻辑
│       │   ├── proxy.rs          # 代理服务
│       │   ├── node.rs           # 节点服务
│       │   └── config.rs         # 配置服务
│       └── utils/                # 工具函数
└── docs/                         # 文档
```

## 前端开发

### 技术栈

- **React 18** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 5** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **Shadcn/ui** - UI 组件库
- **Zustand** - 状态管理
- **React Router** - 路由
- **i18next** - 国际化

### 添加新组件

1. 在 `src/components/ui` 目录创建新组件
2. 使用 Tailwind CSS 和 cn() 工具函数
3. 遵循 Shadcn/ui 组件风格

示例：

```tsx
import { cn } from "@/lib/utils";

interface MyComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function MyComponent({ className, children }: MyComponentProps) {
  return <div className={cn("base-styles", className)}>{children}</div>;
}
```

### 添加新页面

1. 在 `src/pages` 目录创建新页面组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/Layout.tsx` 添加导航项

### 状态管理

使用 Zustand 进行状态管理：

```tsx
import { create } from "zustand";

interface MyState {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### 调用 Tauri 命令

在 `src/api/index.ts` 封装 Tauri 命令调用：

```tsx
import { invoke } from "@tauri-apps/api/core";

export async function myCommand(arg: string): Promise<string> {
  return await invoke("my_command", { arg });
}
```

## 后端开发

### 技术栈

- **Rust** - 系统编程语言
- **Tauri 2** - 桌面应用框架
- **Serde** - 序列化
- **Reqwest** - HTTP 客户端
- **Rusqlite** - SQLite 数据库

### 添加新命令

1. 在 `src-tauri/src/commands` 目录创建命令处理函数
2. 在 `src-tauri/src/lib.rs` 注册命令

示例：

```rust
use tauri::State;
use crate::services::MyService;

#[tauri::command]
pub async fn my_command(
    service: State<'_, MyService>,
    arg: String,
) -> Result<String, String> {
    service.do_something(&arg).map_err(|e| e.to_string())
}
```

### 添加新服务

在 `src-tauri/src/services` 目录创建服务：

```rust
use anyhow::Result;

pub struct MyService {
    // fields
}

impl MyService {
    pub fn new() -> Self {
        Self { /* init */ }
    }

    pub fn do_something(&self, arg: &str) -> Result<String> {
        // implementation
        Ok("result".to_string())
    }
}
```

### 添加新模型

在 `src-tauri/src/models` 目录定义数据模型：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MyModel {
    pub id: String,
    pub name: String,
}
```

## API 文档

### 代理命令

| 命令                | 参数             | 返回值      | 说明         |
| ------------------- | ---------------- | ----------- | ------------ |
| `get_proxy_info`    | -                | `ProxyInfo` | 获取代理信息 |
| `toggle_proxy`      | -                | `void`      | 切换代理开关 |
| `set_proxy_mode`    | `mode: string`   | `void`      | 设置代理模式 |
| `select_proxy_node` | `nodeId: string` | `void`      | 选择节点     |

### 节点命令

| 命令                     | 参数             | 返回值                | 说明             |
| ------------------------ | ---------------- | --------------------- | ---------------- |
| `get_node_groups`        | -                | `NodeGroup[]`         | 获取节点分组     |
| `get_all_nodes`          | -                | `NodeInfo[]`          | 获取所有节点     |
| `test_node_latency`      | `nodeId: string` | `LatencyTestResult`   | 测试节点延迟     |
| `test_all_nodes_latency` | -                | `LatencyTestResult[]` | 测试所有节点延迟 |

### 配置命令

| 命令                              | 参数                        | 返回值               | 说明         |
| --------------------------------- | --------------------------- | -------------------- | ------------ |
| `get_current_config`              | -                           | `ConfigInfo \| null` | 获取当前配置 |
| `get_all_configs`                 | -                           | `ConfigInfo[]`       | 获取所有配置 |
| `import_config_from_subscription` | `url: string, name: string` | `ConfigInfo`         | 导入订阅     |
| `delete_config`                   | `configId: string`          | `void`               | 删除配置     |

## 国际化

### 添加新语言

1. 在 `src/locales` 目录创建语言文件，如 `ja.json`
2. 在 `src/i18n.ts` 注册新语言

### 添加新翻译键

1. 在 `src/locales/en.json` 添加英文翻译
2. 在 `src/locales/zh.json` 添加中文翻译
3. 在组件中使用 `t("key")` 获取翻译

示例：

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t("my.key")}</div>;
}
```

## 构建和发布

### 开发构建

```bash
npm run tauri dev
```

### 生产构建

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle` 目录。
