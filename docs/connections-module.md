# 连接模块（/connections）

> 参考 clash-party：活跃/已关闭连接（需要本地追踪闭合）、搜索/排序/双视图、关闭连接与详情展示。与 mihomo API 对齐：`GET/WS /connections`，`DELETE /connections` 与 `DELETE /connections/:id`。

---

## 1. 模块概述

`/connections` 用于可视化 mihomo 当前连接状态，并提供控制能力：
- 活跃连接列表（推荐 WS 或 GET interval）
- 已关闭连接历史（通过“本地 diff/追踪”实现）
- 搜索过滤、排序
- 关闭活跃连接（单个/全部）
- 连接详情弹窗（展示更完整 metadata；字段以 mihomo response 为准）

---

## 2. 数据模型（与前后端契约）

mihomo `/connections` 的返回字段在不同版本中可能略有差异。为了 AI 生成友好，建议以“最小展示字段 + 原始 payload 兜底”策略：

```ts
interface ConnectionItem {
  id: string;            // 来自 mihomo 的连接 ID（或构造唯一键）
  src: string;          // 源地址（ip:port）
  dst: string;          // 目的地址（ip:port）
  protocol: string;     // tcp/udp 等（或从 response 提取）
  proxy: string | null; // 命中的策略/代理组（字段名取决于 mihomo）
  trafficUp?: number;   // 可选：上传速率/累计
  trafficDown?: number; // 可选：下载速率/累计
  duration?: number;    // 可选：持续时长
  state?: string;       // 可选：状态
  raw?: any;            // 原始响应（用于详情渲染/后续扩展）
}
```

---

## 3. 与 mihomo 的交互（关键）

根据 mihomo API 文档：
- `GET /connections?interval=milliseconds`：返回连接信息（文档支持默认 1000ms 刷新）
- `WS /connections`：实时连接推送（按文档）
- `DELETE /connections`：关闭所有连接
- `DELETE /connections/:id`：关闭指定连接

---

## 4. 已关闭连接历史的实现策略

由于 `/connections` API 本身更偏向“当前连接”，需要本地维护：
- 后端或前端维护 `activeMap: id -> ConnectionItem`
- 每次拉取/推送时：
  - 新出现的 id：加入活跃列表
  - 消失的 id：在满足“消失超过阈值（例如 2~3 个 interval）”后移入 closed 列表
- closed 列表支持 limit（例如最多 5000），超出后丢弃最旧项

---

## 5. 页面交互设计

| 功能 | 说明 |
| ---- | ---- |
| 活跃/已关闭 Tab | 切换显示 active/closed |
| 搜索过滤 | 支持 src/dst/proxy/state 等字段关键词搜索 |
| 排序 | 支持 duration / trafficUp / trafficDown 等排序（字段以实现为准） |
| 视图切换 | 列表/表格双视图 |
| 关闭连接 | 关闭单个 / 关闭全部（仅作用于活跃列表） |
| 暂停/恢复更新 | 暂停不影响 closed 推断（可按实现选择） |
| 详情弹窗 | 点击行展示原始 payload / 解析后的扩展字段 |

---

## 6. Tauri Command 契约（建议新增）

### 6.1 start_connections_stream（建议新增）

- 参数：`interval_ms?: number`（默认 1000）
- 返回：void
- 行为：通过 WS 或 GET interval 循环拉取，并向前端推送事件

事件名示例：
- `connections:active`（payload: ConnectionItem[] 或增量）

### 6.2 stop_connections_stream

- 行为：停止流

### 6.3 get_connections_snapshot（建议新增）

- 参数：`mode: "active" | "closed"`, `limit`, `offset`, `sort?`
- 返回：ConnectionItem[]

### 6.4 close_connection / close_all_connections（建议新增）

- `close_connection(id)` -> void
- `close_all_connections()` -> void

---

## 7. 错误处理要点

- 关闭连接失败：显示错误并建议用户刷新连接列表
- 解析失败：详情弹窗使用 `raw` 做降级展示
- WS/轮询失败：降级到 GET interval，必要时提示用户

---

## 8. 实现任务分解

1. 连接数据解析与最小字段映射
2. active -> closed diff 追踪与闭合阈值
3. Tauri commands + 事件推送
4. 前端 store：active/closed buffer、搜索与排序
5. 关闭连接动作：调用 mihomo DELETE API

