# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 规范文档

- [SPEC.md](./SPEC.md) — **产品规格文档**（功能定义、页面规格、任务看板）
- [ARCHITECTURE.md](./ARCHITECTURE.md) — **技术架构文档**（设计决策、技术约定）
- [PRD.md](./PRD.md) — 历史产品文档（参考，已被 SPEC.md 取代）

## Build Commands

```bash
npm install          # Install dependencies and run prepare script (downloads mihomo + GeoIP)
npm run tauri dev    # Start development mode (Vite + Tauri hot reload)
npm run tauri build # Production build
npm run build       # Frontend only (tsc + vite build)
```

## Architecture Overview

### Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand + i18next
- **Backend**: Rust + Tauri 2 + SQLite (rusqlite)
- **Proxy Core**: mihomo (Clash Meta) as a sidecar process

### Data Flow
```
React Component
  → Zustand Store Action (useProxyStore / useProfileStore / useSettingsStore)
    → API Function (src/api/index.ts, invoke())
      → Tauri IPC Bridge (JSON-RPC, same process)
        → #[tauri::command] (src-tauri/src/commands/*.rs)
          → Service (src-tauri/src/services/*.rs)
            → Core (mihomo.rs, mihomo_api.rs) or SQLite
```

### Key Backend Modules

| Module | Path | Purpose |
|--------|------|---------|
| MihomoManager | `src-tauri/src/core/mihomo.rs` | mihomo process lifecycle (start/stop/restart) |
| MihomoApi | `src-tauri/src/core/mihomo_api.rs` | REST API client (GET/PUT/PATCH http://127.0.0.1:9090) |
| sysproxy | `src-tauri/src/core/sysproxy.rs` | System proxy (Windows: winreg, macOS: networksetup) |
| ProxyService | `src-tauri/src/services/proxy.rs` | Proxy state, mode, traffic |
| ProfileService | `src-tauri/src/services/profile.rs` | Config CRUD, subscription import |
| SettingsService | `src-tauri/src/services/settings.rs` | Key-value settings in SQLite |

### Configuration Storage

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%/clash-kite/` |
| macOS | `~/Library/Application Support/clash-kite/` |

Key files:
- `data.db` — SQLite database (profiles table, settings table)
- `profiles/{uuid}.yaml` — Individual config files
- `data/` — mihomo runtime data (GeoIP, GeoSite, cache)
- `mihomo.log` — mihomo process log

### Tauri Command Registration

Commands are registered in `src-tauri/src/lib.rs`:
1. Add function to `src-tauri/src/commands/{domain}.rs`
2. Export from `src-tauri/src/commands/mod.rs`
3. Add to `invoke_handler!` macro in `lib.rs`

Services are injected via `app.manage()` and accessed in commands via `State<'_, ServiceType>`.

### Frontend State

Three Zustand stores in `src/store/`:
- `proxy.ts` — `useProxyStore`: status, groups, toggleProxy, selectProxy, testDelay
- `config.ts` — `useProfileStore`: profiles, import/activate/delete
- `settings.ts` — `useSettingsStore`: theme, language, systemProxy

### Adding New Features

**Backend (Rust):**
1. Create model in `src-tauri/src/models/` with `#[derive(Serialize, Deserialize)]`
2. Add service methods in `src-tauri/src/services/`
3. Create `#[tauri::command]` in `src-tauri/src/commands/`
4. Register in `lib.rs`

**Frontend (React):**
1. Add API wrapper in `src/api/index.ts` using `invoke()`
2. Add TypeScript types in `src/types/index.ts`
3. Create page component in `src/pages/`
4. Add route in `src/App.tsx`
5. Add nav item in `src/components/Layout.tsx`
6. Add i18n keys in `src/locales/zh.json` and `src/locales/en.json`

### Code Patterns

**Rust command returning Result:**
```rust
#[tauri::command]
pub async fn my_command(
    service: State<'_, MyService>,
    arg: String,
) -> Result<MyResponse, String> {
    service.do_something(&arg).map_err(|e| e.to_string())
}
```

**Zustand store action:**
```typescript
export const useMyStore = create<MyState>()((set, get) => ({
  items: [],
  fetchItems: async () => {
    const data = await myApiCall();
    set({ items: data });
  },
}));
```

### UI Components

Using shadcn/ui + Radix UI primitives. Base components in `src/components/ui/`. Use `cn()` utility for conditional classes.

### Notes

- mihomo REST API docs: https://wiki.metacubex.one/api/
- mihomo runs as sidecar; dev mode binary at `src-tauri/resources/sidecar/mihomo.exe`
- prepare script (`scripts/prepare.mjs`) auto-downloads mihomo binary and GeoIP data on `npm install`
