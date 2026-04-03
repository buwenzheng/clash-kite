- [user](user.md) — 用户信息和使用偏好

## 2026-04-03 项目规范文档

- **SPEC.md** — 产品规格文档（功能规格、页面契约、任务看板 T-01~T-20）
- **ARCHITECTURE.md** — 技术架构文档（设计决策、技术约定）
- **PLAN.md** — 详细开发计划，14 个任务（T-01~T-14），5 个 Phase，版本路线 v0.2.0~v0.6.0

## 2026-04-03 重要 Bug 修复记录

### 连接列表为空（connections API）
- **根因**: mihomo API 返回 `upload`/`download` 是顶层字段，而非 `status.upload`；`state` 字段根本不存在
- **修复**: `connections.rs` 中 `parse_connection()` 改为从顶层读取，`state` 加 `#[serde(default)]`
- **相关文件**: `src-tauri/src/models/connections.rs`

### Sidebar 流量显示始终为 0
- **根因**: `fetchTraffic()` 返回数据但没有 `set({ traffic })` 存入 Zustand store
- **修复**: `proxy.ts` 的 `fetchTraffic` 添加 `set({ traffic })`；`Layout.tsx` 移除本地 useState
- **相关文件**: `src/store/proxy.ts`, `src/components/Layout.tsx`

### 端口注入到 mihomo 配置
- **实现**: `MihomoManager::start()` 接收 `KernelSettings`，通过 serde_json::Value 中间层注入 `mixed-port`/`http-port`/`socks-port` 到用户 YAML，写入 `config-merged.yaml` 再启动
- **相关文件**: `src-tauri/src/core/mihomo.rs`, `src-tauri/src/services/proxy.rs`, `src-tauri/src/lib.rs`
