# DNS 配置模块（/dns）

> 独立的 DNS 配置管理页面，对齐 clash-party 同类功能。

---

## 1. 模块概述

`/dns` 提供用户对 mihomo 的 DNS 解析策略进行可视化配置的能力，包括：

- enhanced-mode 模式切换（fake-ip / redir-host）
- 自定义 nameserver、fallback DNS
- fake-ip 范围与过滤列表
- DNS 监听端口
- fallback 过滤策略（GeoIP / IPCIDR）

配置变化需写入最终 mihomo 配置并重启/重载内核生效。

**涉及文件：**

| 层级     | 文件                                    | 职责                |
| -------- | --------------------------------------- | ------------------- |
| 前端页面 | `src/pages/Dns.tsx`                     | DNS 配置 UI         |
| API      | `src/api/index.ts`                      | DNS 相关函数        |
| 命令层   | `src-tauri/src/commands/dns.rs`         | DNS Tauri Command   |
| 服务层   | `src-tauri/src/services/dns.rs`         | DnsService          |
| 模型     | `src-tauri/src/models/dns.rs`           | DnsConfig           |

---

## 2. 数据模型（与前后端契约）

```ts
interface DnsConfig {
  enable: boolean;
  listen: string;                       // 默认 "0.0.0.0:1053"
  enhancedMode: "fake-ip" | "redir-host";
  fakeIpRange: string;                  // 默认 "198.18.0.1/16"
  fakeIpFilter: string[];               // 默认 ["*.lan", "localhost.ptlogin2.qq.com"]

  defaultNameserver: string[];           // 默认 ["114.114.114.114", "8.8.8.8"]
  nameserver: string[];                  // 默认 ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"]
  fallback: string[];                    // 默认 ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"]

  fallbackFilter: {
    geoip: boolean;                      // 默认 true
    geoipCode: string;                   // 默认 "CN"
    ipcidr: string[];                    // 默认 ["240.0.0.0/4"]
  };
}
```

---

## 3. 页面交互设计

```
┌────────────────────────────────────────────────────┐
│ DNS 配置                                   [应用]   │
├────────────────────────────────────────────────────┤
│                                                    │
│ DNS 开关          [━━━ ON ━━━]                     │
│                                                    │
│ 增强模式          [fake-ip] [redir-host]            │
│                                                    │
│ 监听地址          [0.0.0.0:1053        ]           │
│                                                    │
│ Fake-IP 范围      [198.18.0.1/16       ]           │
│                                                    │
│ ── Fake-IP 过滤列表 ──────────────────────         │
│ （匹配的域名不使用 fake-ip，每行一个）              │
│ ┌──────────────────────────────────────┐           │
│ │ *.lan                                │           │
│ │ localhost.ptlogin2.qq.com            │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── Default Nameserver ─────────────────            │
│ （用于解析 DoH 域名，每行一个）                     │
│ ┌──────────────────────────────────────┐           │
│ │ 114.114.114.114                      │           │
│ │ 8.8.8.8                              │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── Nameserver ─────────────────────────            │
│ （主 DNS 服务器，支持 DoH/DoT/普通，每行一个）      │
│ ┌──────────────────────────────────────┐           │
│ │ https://doh.pub/dns-query            │           │
│ │ https://dns.alidns.com/dns-query     │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── Fallback DNS ───────────────────────            │
│ （当域名非 CN 时使用，每行一个）                    │
│ ┌──────────────────────────────────────┐           │
│ │ https://1.1.1.1/dns-query            │           │
│ │ https://dns.google/dns-query         │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ ── Fallback 过滤 ─────────────────────             │
│ GeoIP 过滤       [━━━ ON ━━━]                      │
│ GeoIP 代码       [CN                  ]            │
│ IP-CIDR 过滤     （每行一个 CIDR）                  │
│ ┌──────────────────────────────────────┐           │
│ │ 240.0.0.0/4                          │           │
│ └──────────────────────────────────────┘           │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 4. 配置生成与生效策略

与 Kernel 模块类似的"配置链路契约"：
1. 读取当前 `DnsConfig`
2. 映射到 mihomo 配置的 `dns` 字段
3. 注入最终配置文件
4. 若代理正在运行 → 重启内核（`POST /restart` 或 stop+start）

### mihomo 配置映射

```yaml
dns:
  enable: true
  listen: "0.0.0.0:1053"
  enhanced-mode: fake-ip
  fake-ip-range: "198.18.0.1/16"
  fake-ip-filter:
    - "*.lan"
    - "localhost.ptlogin2.qq.com"
  default-nameserver:
    - 114.114.114.114
    - 8.8.8.8
  nameserver:
    - "https://doh.pub/dns-query"
    - "https://dns.alidns.com/dns-query"
  fallback:
    - "https://1.1.1.1/dns-query"
    - "https://dns.google/dns-query"
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - "240.0.0.0/4"
```

---

## 5. Tauri Command 契约

### 5.1 get_dns_config

- 返回：`DnsConfig`
- 行为：从 SQLite 读取（key: `dns_config`），不存在返回默认值

### 5.2 set_dns_config

- 参数：`DnsConfig`
- 行为：持久化到 SQLite

### 5.3 apply_dns_config

- 行为：
  - 将 DnsConfig 注入最终配置的 `dns` 字段
  - 如果代理运行中 → 重启/重载内核

---

## 6. 存储

DnsConfig 作为 JSON 存储在 SQLite settings 表（key: `dns_config`）。

---

## 7. 错误处理

- 监听地址格式校验（`host:port`）
- fake-ip-range 校验（CIDR 格式）
- nameserver URL 校验（支持 `https://`、`tls://`、纯 IP）
- 配置应用失败：返回错误信息，提示用户检查配置

---

## 8. 实现任务分解

1. DnsConfig 模型 + SQLite 存储（key: `dns_config`）
2. DnsService（get/set/apply）
3. Tauri commands：get_dns_config / set_dns_config / apply_dns_config
4. 最终 mihomo 配置生成器接入（dns 字段注入）
5. 前端 `/dns` 页面：表单联动 + Apply 按钮
6. i18n 键值补充
