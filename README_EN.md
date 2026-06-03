# Clash-Kite

A modern, cross-platform proxy client based on ClashMeta, built with Tauri + React + TypeScript + Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey.svg)]()

English | [中文](./README.md)

## Features

- 🚀 **Cross-platform**: Native support for Windows and macOS
- 🎨 **Modern UI**: Built with Shadcn/ui and Tailwind CSS
- ⚡ **High Performance**: Rust backend with Tauri framework
- 🔒 **Privacy First**: No telemetry, no ads, open source
- 🌙 **Dark Mode**: Supports dark/light/system theme
- 🌍 **Multi-language**: English and Chinese support
- 📡 **Subscription Support**: Import and manage proxy subscriptions
- 🔄 **Auto Update**: Automatic subscription updates
- 📊 **Node Testing**: TCP connection latency testing
- 🔔 **System Tray**: Minimize to tray with quick actions

## Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 5** - Build tool
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **React Router** - Routing
- **i18next** - Internationalization

### Backend

- **Rust** - System programming
- **Tauri 2** - Desktop framework
- **Serde** - Serialization
- **Reqwest** - HTTP client
- **Rusqlite** - SQLite database

### Core

- **ClashMeta** - Built-in mihomo kernel

> **Scope note**: This project is positioned as a **lightweight, sufficient** mihomo desktop client. We **do not** implement SmartCore, Sub-Store, dual kernel, Overrides, WebDAV sync, or other differentiating integrations. See [SPEC.md §0](./SPEC.md).

## Project Structure

```
clash-kite/
├── src/                          # React frontend
│   ├── api/                      # API calls
│   ├── components/               # UI components
│   │   └── ui/                   # Shadcn/ui components
│   ├── hooks/                    # Custom hooks
│   ├── lib/                      # Utilities
│   ├── locales/                  # Language files (en.json, zh.json)
│   ├── pages/                    # Page components
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── Nodes.tsx             # Node management
│   │   ├── Profiles.tsx          # Configuration
│   │   ├── Connections.tsx       # Connection management
│   │   ├── Logs.tsx              # Logs
│   │   ├── Settings.tsx          # Settings
│   │   ├── SysProxy.tsx          # System proxy (planned)
│   │   ├── Tun.tsx               # TUN mode (planned)
│   │   ├── Dns.tsx               # DNS configuration (planned)
│   │   ├── Sniffer.tsx           # Domain sniffing (planned)
│   │   ├── Resources.tsx         # External resources (planned)
│   │   └── Kernel.tsx            # Kernel settings (planned)
│   ├── store/                    # Zustand stores
│   └── types/                    # TypeScript types
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── commands/             # Tauri commands
│       ├── models/               # Data models
│       ├── services/             # Business logic
│       └── utils/                # Utilities
├── docs/                         # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.70
- **Visual Studio Build Tools** (Windows)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/buwenzheng/clash-kite.git
cd clash-kite
```

2. Install dependencies:

```bash
npm install
```

3. Run development server:

```bash
npm run tauri dev
```

### Build

Build for production:

```bash
npm run tauri build
```

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build frontend
- `npm run tauri dev` - Start Tauri development
- `npm run tauri build` - Build desktop application

### Code Structure

#### Frontend Architecture

- **Components**: Reusable UI components with Shadcn/ui
- **Pages**: Route-based page components
- **Store**: Zustand state management
- **API**: Tauri command invocations

#### Backend Architecture

- **Models**: Data structures (Proxy, Config, Node)
- **Services**: Business logic (ProxyService, ConfigService, NodeService)
- **Commands**: Tauri command handlers
- **Utils**: Helper functions

## Pages

### P0 Completed

**Dashboard**
- Proxy toggle, real-time status, traffic stats, port config

**Nodes**
- Node groups, latency testing, node selection, search

**Profiles**
- Subscription import, config management, profile switching, YAML editor

**Connections**
- Active/closed tabs, close single/all, search and sort

**Logs**
- Real-time logs, level filter, keyword search

**Settings**
- Theme, language, auto-start, system proxy toggle, tray options

### P1 Planned

- SysProxy advanced (manual / PAC / bypass)
- TUN mode (requires admin)
- DNS configuration (fake-ip / redir-host)
- Sniffer domain sniffing
- Resources (GeoIP / Provider refresh)
- Kernel (ports / logLevel / version management)

### P2 Planned

- Rules view page
- Global shortcuts
- Config directory backup/migration

## Configuration

Configuration files are stored in:

- **Windows**: `%APPDATA%/clash-kite/`
- **macOS**: `~/Library/Application Support/clash-kite/`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FlClash](https://github.com/chen08209/FlClash) - Inspiration and reference
- [clash-party](https://github.com/mihomo-party-org/clash-party) - Product reference (not feature-for-feature)
- [Tauri](https://tauri.app) - Desktop framework
- [Shadcn/ui](https://ui.shadcn.com) - UI components
- [ClashMeta](https://github.com/MetaCubeX/mihomo) - Proxy kernel

## Roadmap

### Completed
- [x] mihomo kernel integration (process management + API client)
- [x] Configuration import/export (local files + subscriptions)
- [x] Node latency testing (TCP connection)
- [x] Multi-language (English, Chinese)
- [x] System tray
- [x] Connections management (active/closed, close single/all)
- [x] Logs view (polling)

### v0.3.0 — P1 mihomo advanced configuration
- [ ] SysProxy advanced (manual / PAC / bypass)
- [ ] TUN mode
- [ ] DNS configuration (fake-ip / redir-host)
- [ ] Sniffer domain sniffing
- [ ] Resources page (GeoIP update, Provider refresh)
- [ ] Kernel page (ports, logLevel, external controller, kernel version management)

### v0.4.0 — P1 experience enhancements
- [ ] Real-time log stream (WebSocket)
- [ ] Tray menu enhancement (dynamic mode/profile/proxy group)
- [ ] Subscription auto-update scheduler
- [ ] QR code import
- [ ] Auto-start on boot
- [ ] Working directory configuration & migration

### v0.5.0 — P2 pages & lightweight enhancements
- [ ] Rules view (enable/disable)
- [ ] Global shortcuts
- [ ] Config directory backup/migration (zip)

### Explicitly Out of Scope
- ❌ SmartCore / AI node selection
- ❌ Sub-Store integration
- ❌ Dual kernel (Smart + Mihomo)
- ❌ TUN service-less mode
- ❌ Overrides system (YAML/JS)
- ❌ WebDAV backup/restore
- ❌ Application auto-update
- ❌ Multiple color themes (light/dark only)
- ❌ MetaCubeXd Dashboard integration

## Contact

- GitHub: [@buwenzheng](https://github.com/buwenzheng)
- Repository: [clash-kite](https://github.com/buwenzheng/clash-kite)

---

Built with ❤️ using Tauri + React + Rust
