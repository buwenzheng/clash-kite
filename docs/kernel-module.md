# 内核设置模块（/kernel）

> 负责生成/应用 mihomo 内核的基础与高级配置项。与 clash-party 同类功能对齐（忽略 smart core/substore）。

---

## 1. 模块概述

`/kernel` 提供用户对 mihomo 的“内核级”配置调整能力，例如：
- 端口配置（mixed-port / socks-port / http-port）
- 日志级别（log-level）
- allow-lan（局域网访问）
- IPv6 支持
- external-controller（外部控制器）
- 高级选项（unified-delay / tcp-concurrent / find-process-mode / store-selected 等）

配置变化通常要求重启 mihomo 内核使配置生效（或调用 `POST /restart`，取决于实现策略）。

---

## 2. 数据模型（与前后端契约）

```ts
interface KernelSettings {
  ports: {
    mixedPort: number;
    socksPort: number;
    httpPort: number;
    enableHttpPort?: boolean; // 可选：按实现决定是否需要显式开关
  };
  logLevel: "silent" | "error" | "warning" | "info" | "debug";
  allowLan: boolean;
  ipv6: boolean;

  externalController: {
    enabled: boolean;
    host: string;   // 默认 127.0.0.1
    port: number;   // 默认 9090
    secret?: string | null;
  };

  advanced: {
    unifiedDelay?: boolean;
    tcpConcurrent?: boolean;
    findProcessMode?: string;
    storeSelected?: boolean;
  };
}
```

---

## 3. 页面交互设计

| 区块 | 控件 | 说明 |
| ---- | ---- | ---- |
| 端口配置 | 数字输入 + 开关 | 支持单独启用/关闭可选项 |
| 日志级别 | 单选 | 限制为 mihomo 支持枚举 |
| 局域网访问 | allow-lan 开关 + IP 列表（可选） | lan-allowed/disallowed（若实现） |
| IPv6 | 开关 | 启用/禁用 |
| 外部控制器 | host/port/secret | secret 为空表示无鉴权（或按实现约定） |
| 高级选项 | checkbox/select | 参数映射到 mihomo 的对应字段 |
| 应用/重载 | Apply 按钮 | 保存并重启内核/重载配置 |

---

## 4. 配置生成与生效策略

建议的“配置链路契约”（用于 AI 生成后端）：
1. 读取当前激活 profile 的 YAML 内容
2. 将 `KernelSettings` 注入到“最终 mihomo 配置生成器”的对应字段（general/log/api/ports 等）
3. 写入最终配置文件到 mihomo 可读取的位置
4. 若代理正在运行：
   - 方案 A：停止 -> 启动（当前实现方式）
   - 方案 B：调用 `POST /restart`（mihomo 支持）

---

## 5. 与 mihomo API 的交互（参考）

根据 mihomo API 文档：
- `POST /restart`：重启内核（可用于应用设置变更）
- `GET /configs`：读取基础配置（可用于端口显示）

> 说明：如果需要对配置文件做更复杂注入，仍以“重启内核”作为兜底。

---

## 6. Tauri Command 契约（建议新增）

### 6.1 get_kernel_settings

- 返回：`KernelSettings`

### 6.2 set_kernel_settings

- 参数：`KernelSettings`
- 行为：持久化（SQLite key 建议 `kernel_settings`）

### 6.3 apply_kernel_settings

- 行为：
  - 写入生成的最终配置片段
  - 如果 proxy 正在运行：重启/调用 restart

---

## 7. 错误处理要点

- 应用失败：返回错误并提示“是否需要管理员权限/端口被占用”
- 如果用户填写无效值（如端口越界），在保存阶段返回校验错误
- secret 配置变更后：需保证后续对 `/logs`、`/connections` 等请求的鉴权策略一致

---

## 8. 实现任务分解

1. KernelSettings 模型 + SQLite 存储
2. 最终 mihomo 配置生成器接入（ports/log/api/advanced 注入）
3. Tauri commands：get/set/apply
4. 前端 `/kernel` 页面：表单联动 + Apply 按钮 + 状态提示

