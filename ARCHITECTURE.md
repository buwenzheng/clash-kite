# Architecture

> 技术架构文档。面向开发者，解释"为什么这样设计"。
> `CLAUDE.md` 是 AI 行为指南，`ARCHITECTURE.md` 是技术决策记录。

---

## 1. 设计决策

### 1.1 mihomo 为什么用 sidecar 而不是进程内？

**决策**：mihomo 以独立进程运行，通过 REST API 通信。

**原因**：
- mihomo 是成熟开源项目，独立进程便于热更新、不影响主应用
- REST API (`http://127.0.0.1:9090`) 已是社区标准，文档完善
- 隔离崩溃风险，mihomo panic 不会带走 Tauri 进程

**替代方案考虑**：
- 直接集成 Go 代码 → 增加跨平台编译复杂度，不值得
- 通过 `std::process::Command` 启动 → 无法精细控制生命周期，用 `MihomoManager` 管理更清晰

---

### 1.2 为什么用 SQLite 而非 JSON 文件存储？

**决策**：使用 SQLite（`rusqlite`）持久化 profiles 和 settings。

**原因**：
- 原子性写入，JSON 文件并发读写有损坏风险
- 查询效率高（按名称过滤、按时间排序）
- WAL 模式支持读写并发
- Schema 约束，数据一致性更好

**不选其他方案**：
- JSON 文件 → 并发安全问题，无事务
- `serde_json` + 锁 → 锁竞争影响性能
- ` sled` / `惩戒` → 过度工程，SQLite 足够

---

### 1.3 为什么用 Zustand 而非 Redux？

**原因**：
- API 简洁，样板代码少
- 适合本项目规模（3 个 Store，几十个状态字段）
- TypeScript 推理友好

**不选其他方案**：
- Redux → 过度工程，需要太多模板
- Jotai → 适合原子化状态，本项目 Store 边界清晰，不需要

---

### 1.4 为什么不用 tauri-plugin-sql？

**决策**：直接用 `rusqlite`，不使用 Tauri 官方 SQL 插件。

**原因**：
- 避免额外 IPC 开销，原生调用更快
- 项目只需 SQLite，不需要多数据库支持
- 迁移到 `rusqlite` 无额外学习成本

---

### 1.5 为什么不用 SSR 或 Preact？

**原因**：
- Tauri + WebView 环境下 SPA 已足够快
- React 19 的并发特性在桌面端价值有限
- shadcn/ui 生态对 React 友好

---

## 2. 服务注入模式

使用 Tauri 的 `app.manage()` 依赖注入：

```rust
// lib.rs
app.manage(ProxyService::new(mihomo.clone()));
app.manage(ProfileService::new(config_dir, db));
app.manage(SettingsService::new(db));
```

**优势**：
- 避免全局 `static`
- 便于测试时 mock
- 生命周期与 App 绑定，自动清理

**约束**：Service 必须实现 `Clone`（用 `Arc<T>` 包装内部状态）。

---

## 3. 错误处理约定

### Rust 层

所有 Command 返回 `Result<T, String>`：

```rust
// ✅ 正确
proxy.start(&path, &name).await.map_err(|e| e.to_string())?

// ❌ 不做额外封装
Err(MyError::NotFound)?  // 泄露内部类型
```

**理由**：Tauri IPC 要求序列化后的错误能传到前端，`String` 是最简的契约。

### 前端层

Store 的 `fetch*` 方法统一处理错误：

```typescript
fetchXxx: async () => {
  try {
    const data = await getXxx();
    set({ data, error: null });
  } catch (e) {
    set({ error: String(e) });
  }
}
```

**不推荐**：在组件层每个 `invoke` 都包 `try/catch`——重复且容易遗漏。

---

## 4. 配置文件合并策略

### 当前（v0.1.0）

mihomo 直接加载用户 YAML 文件，Clash-Kite 不做修改。

### 计划中（v0.2.0）

引入配置合并引擎（Override Engine）：

```
用户 YAML + 全局覆写 + 订阅级覆写 → 最终配置 → mihomo
```

- 全局覆写（YAML）：`~/.config/clash-kite/overrides/global.yaml`
- 订阅级覆写：`~/.config/clash-kite/overrides/{profile-id}.yaml`
- JS 覆写：执行用户 JS，注入动态规则（见 `rules-module.md`）

合并策略：`serde_yaml` deep merge（`YAML Merge`），JS 结果以 JSON patch 形式应用。

---

## 5. 平台差异处理

```rust
// src-tauri/src/core/sysproxy.rs

#[cfg(target_os = "windows")]
pub fn set_system_proxy(config: &SysProxyConfig) -> Result<(), SysProxyError> {
    // winreg + InternetSetOptionW
}

#[cfg(target_os = "macos")]
pub fn set_system_proxy(config: &SysProxyConfig) -> Result<(), SysProxyError> {
    // networksetup 命令
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn set_system_proxy(_config: &SysProxyConfig) -> Result<(), SysProxyError> {
    Err(SysProxyError::UnsupportedPlatform)
}
```

**原则**：平台条件编译粒度到函数级别，不在业务逻辑中散落 `if cfg!()`。

---

## 6. mihomo API 调用约定

**超时**：所有 HTTP 请求超时 `10s`，mihomo 重启等待 `3s`。

**重试**：
- 进程启动后 API 就绪探测：最多 10 次，每次间隔 300ms
- 其他 API：不重试，交给上层处理

**版本兼容**：
- 锁定 API 版本在 mihomo 1.x
- `GET /proxies` 返回字段假设稳定，不做字段存在性防御（panic on missing field 表示需要升级）

---

## 7. 数据流优先级

| 场景 | 方式 | 理由 |
|------|------|------|
| 命令调用（invoke） | 同步请求 | 简单，足够快 |
| 状态轮询（traffic/logs） | 前端 `setInterval` 轮询 | 实现简单，mihomo 无推送接口 |
| 实时日志 | 轮询 → WebSocket 升级 | mihomo 原生支持 `WS /logs` |
| 实时连接 | WebSocket（`WS /connections`） | 高频数据，轮询浪费 |

---

## 8. 性能考量

| 关注点 | 当前状态 | 优化方向 |
|--------|---------|---------|
| 节点测速 | 逐个串行 → 并发（≤10） | ✅ 已有并发控制 |
| 日志加载 | 尾读文件 | 超过 10000 行考虑内存缓存 |
| 配置文件读取 | 每次调用 `fs::read` | 高频操作可加 `RwLock` 缓存 |
| 前端 re-render | 细粒度 Store 更新 | ✅ Zustand 已有优化 |

---

## 9. 安全考量

| 风险 | 当前缓解 |
|------|---------|
| 用户 YAML 注入恶意配置 | 不执行用户 JS，仅在覆写系统（计划中）执行，且沙箱化 |
| 订阅 URL 被劫持 | HTTPS，建议用户使用 TLS 订阅 |
| mihomo REST API 暴露 | 仅监听 `127.0.0.1`，不暴露公网 |
| SQLite 注入 | 参数化查询，`rusqlite` 原生支持 |
| 配置文件路径遍历 | `Path::new().canonicalize()` 校验 |
