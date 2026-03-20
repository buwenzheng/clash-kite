# 日志模块（/logs）

> 参考 clash-party：日志实时流 + 级别颜色 + 搜索过滤 + 自动滚动/暂停 + 历史查看。与 mihomo API 对齐：`GET /logs?level=...` 与 `WS`。

---

## 1. 模块概述

`/logs` 展示 mihomo 运行时日志，支持：
- 实时追加（推荐优先 WS；失败时回退到轮询/文件 tail）
- 级别筛选（error/warning/info/debug）
- 搜索过滤（前端或后端二选一；建议前端先做）
- 自动滚动（可暂停以便用户阅读）
- 清空日志缓存（可截断文件实现，或仅清空前端 buffer）

---

## 2. 数据模型

### 2.1 LogLevel

```ts
type LogLevel = "debug" | "info" | "warning" | "error";
```

### 2.2 LogItem

```ts
interface LogItem {
  ts: string;      // 时间戳（原始或标准化后）
  level: LogLevel; // 级别
  message: string; // 日志正文
  raw?: string;    // 可选：保留原始行
}
```

---

## 3. 与 mihomo 的交互（关键）

- `GET /logs?level=log_level`：拉取日志（按文档支持）
- `WS /logs?level=log_level`：实时推送日志

> 实现策略建议：
1. 首选 WS：建立长连接并解析消息为 `LogItem`
2. WS 失败或不支持：使用轮询策略定时 GET /logs 或从 `mihomo.log` 做 tail

---

## 4. 页面交互设计

| 区块 | 功能 |
| ---- | ---- |
| 级别筛选 | 多选（默认全开） |
| 搜索过滤 | 输入关键字，前端过滤（可选高亮） |
| 实时流 | 虚拟列表渲染，缓冲上限（例如 2000） |
| 自动滚动 | 默认开启；用户手动滚动/暂停后停止自动滚动 |
| 清空 | 清空前端 buffer（或截断 mihomo.log 文件） |

---

## 5. Tauri Command 契约（建议新增/完善）

### 5.1 get_mihomo_log（现有）

- `get_mihomo_log(lines?: number) -> string`
- 用途：历史尾部读取（兼容 fallback）

### 5.2 start_log_stream（建议新增）

- 参数：`level?: LogLevel | "all"`
- 返回：`void`
- 行为：在后端启动 WS/轮询任务，并通过事件通道向前端推送 `LogItem`

事件名示例：
- `log:new`（payload: `LogItem`）

### 5.3 stop_log_stream（建议新增）

- 行为：停止 WS/轮询任务

### 5.4 clear_log_buffer（建议新增）

- 行为：
  - 若选择截断：对 `mihomo.log` 文件做安全截断
  - 否则：仅清空前端 buffer（不需要后端操作）

---

## 6. 错误处理要点

- WS 连接失败：降级到 tail/轮询并提示
- API 鉴权失败（如果未来配置 secret）：返回明确错误并指导用户检查配置
- JSON/文本解析失败：跳过异常行并记录到后端日志

---

## 7. 实现任务分解

1. WS 客户端封装（解析日志行/消息）
2. 后端事件推送（`log:new`）
3. 前端 store：log buffer、过滤条件、自动滚动状态
4. 虚拟列表渲染与缓存上限控制
5. fallback tail：复用现有 `get_mihomo_log`

