# Sniffer 域名嗅探模块（/sniffer）

> 配置 mihomo 的域名嗅探功能，从 TLS/HTTP/QUIC 握手包中还原真实域名，对齐 clash-party 同类功能。

---

## 1. 模块概述

`/sniffer` 提供对 mihomo 的 Sniffer（域名嗅探器）进行可视化配置的能力。域名嗅探用于从网络协议握手包中提取真实域名，解决 fake-ip 模式下 IP 映射丢失域名信息的问题。

核心功能：
- 嗅探开关
- 协议级别配置（HTTP / TLS / QUIC）
- 强制嗅探域名列表（force-domain）
- 跳过嗅探域名列表（skip-domain）
- 端口白名单

**涉及文件：**

| 层级     | 文件                                      | 职责                 |
| -------- | ----------------------------------------- | -------------------- |
| 前端页面 | `src/pages/Sniffer.tsx`                   | Sniffer 配置 UI      |
| API      | `src/api/index.ts`                        | Sniffer 相关函数     |
| 命令层   | `src-tauri/src/commands/sniffer.rs`       | Sniffer Tauri Command|
| 服务层   | `src-tauri/src/services/sniffer.rs`       | SnifferService       |
| 模型     | `src-tauri/src/models/sniffer.rs`         | SnifferConfig        |

---

## 2. 数据模型（与前后端契约）

```ts
interface SniffProtocol {
  ports: string[];                  // 如 ["80", "8080-8880"]
  overrideDestination: boolean;     // 是否用嗅探到的域名覆盖目标地址
}

interface SnifferConfig {
  enable: boolean;

  sniff: {
    HTTP?: SniffProtocol;           // 默认 { ports: ["80", "8080-8880"], overrideDestination: true }
    TLS?: SniffProtocol;            // 默认 { ports: ["443", "8443"], overrideDestination: false }
    QUIC?: SniffProtocol;           // 默认 { ports: ["443", "8443"], overrideDestination: false }
  };

  forceDomain: string[];            // 强制嗅探域名，如 ["+.v2ex.com"]
  skipDomain: string[];             // 跳过嗅探域名，如 ["Mijia Cloud"]
  portWhitelist: string[];          // 端口白名单，如 ["443", "8080-8880"]
}
```

---

## 3. 页面交互设计

```
┌────────────────────────────────────────────────────┐
│ 域名嗅探 Sniffer                           [应用]   │
├────────────────────────────────────────────────────┤
│                                                    │
│ 嗅探开关          [━━━ ON ━━━]                     │
│                                                    │
│ ── 协议配置 ──────────────────────────────         │
│                                                    │
│ HTTP                                               │
│   启用            [━━━ ON ━━━]                     │
│   端口            [80, 8080-8880      ]            │
│   覆盖目标        [━━━ ON ━━━]                     │
│                                                    │
│ TLS                                                │
│   启用            [━━━ ON ━━━]                     │
│   端口            [443, 8443          ]            │
│   覆盖目标        [━━━ OFF ━━]                     │
│                                                    │
│ QUIC                                               │
│   启用            [━━━ ON ━━━]                     │
│   端口            [443, 8443          ]            │
│   覆盖目标        [━━━ OFF ━━]                     │
│                                                    │
│ ── 强制嗅探域名 ──────────────────────────         │
│ （匹配的域名始终嗅探，每行一个）                    │
│ ┌──────────────────────────────────────┐           │
│ │ +.v2ex.com                           │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── 跳过嗅探域名 ──────────────────────────         │
│ （匹配的域名跳过嗅探，每行一个）                    │
│ ┌──────────────────────────────────────┐           │
│ │ Mijia Cloud                          │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── 端口白名单 ────────────────────────────         │
│ （仅对指定端口嗅探，每行一个，支持范围如 8080-8880）│
│ ┌──────────────────────────────────────┐           │
│ │ 443                                  │           │
│ │ 8080-8880                            │           │
│ └──────────────────────────────────────┘           │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 4. 配置生成与生效策略

与 DNS/Kernel 模块类似：
1. 读取当前 `SnifferConfig`
2. 映射到 mihomo 配置的 `sniffer` 字段
3. 注入最终配置文件
4. 若代理正在运行 → 重启内核

### mihomo 配置映射

```yaml
sniffer:
  enable: true
  sniff:
    HTTP:
      ports: [80, 8080-8880]
      override-destination: true
    TLS:
      ports: [443, 8443]
    QUIC:
      ports: [443, 8443]
  force-domain:
    - "+.v2ex.com"
  skip-domain:
    - "Mijia Cloud"
  port-whitelist:
    - 443
    - 8080-8880
```

---

## 5. Tauri Command 契约

### 5.1 get_sniffer_config

- 返回：`SnifferConfig`
- 行为：从 SQLite 读取（key: `sniffer_config`），不存在返回默认值

### 5.2 set_sniffer_config

- 参数：`SnifferConfig`
- 行为：持久化到 SQLite

### 5.3 apply_sniffer_config

- 行为：
  - 将 SnifferConfig 注入最终配置的 `sniffer` 字段
  - 如果代理运行中 → 重启/重载内核

---

## 6. 存储

SnifferConfig 作为 JSON 存储在 SQLite settings 表（key: `sniffer_config`）。

---

## 7. 错误处理

- 端口格式校验（纯数字或范围格式 `min-max`，1-65535）
- 域名格式基本校验
- 配置应用失败：返回错误信息

---

## 8. 实现任务分解

1. SnifferConfig 模型 + SQLite 存储（key: `sniffer_config`）
2. SnifferService（get/set/apply）
3. Tauri commands：get_sniffer_config / set_sniffer_config / apply_sniffer_config
4. 最终 mihomo 配置生成器接入（sniffer 字段注入）
5. 前端 `/sniffer` 页面：协议卡片 + 列表编辑 + Apply 按钮
6. i18n 键值补充
