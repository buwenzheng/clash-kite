# Clash-Kite

A modern, cross-platform proxy client based on ClashMeta, built with Tauri + React + TypeScript + Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey.svg)]()

## Features

- 🚀 **Cross-platform**: Native support for Windows and macOS
- 🎨 **Modern UI**: Built with Shadcn/ui and Tailwind CSS
- ⚡ **High Performance**: Rust backend with Tauri framework
- 🔒 **Privacy First**: No telemetry, no ads, open source
- 🌙 **Dark Mode**: Beautiful dark and light themes
- 📡 **Subscription Support**: Import and manage proxy subscriptions
- 🔄 **Auto Update**: Automatic subscription updates
- 📊 **Node Testing**: Latency testing for all nodes

## Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Vite 5** - Build tool
- **Tailwind CSS 4** - Utility-first CSS
- **Shadcn/ui** - UI components
- **Zustand** - State management
- **React Router** - Routing

### Backend

- **Rust** - System programming
- **Tauri 2** - Desktop framework
- **Serde** - Serialization
- **Reqwest** - HTTP client
- **Rusqlite** - SQLite database

### Core

- **ClashMeta** - Proxy kernel (planned integration)

## Project Structure

```
clash-kite/
├── src/                      # React frontend
│   ├── api/                  # API calls
│   ├── components/           # UI components
│   │   └── ui/              # Shadcn/ui components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Nodes.tsx        # Node management
│   │   ├── Profiles.tsx     # Configuration
│   │   └── Settings.tsx     # Settings
│   ├── store/               # Zustand stores
│   └── types/               # TypeScript types
├── src-tauri/                # Rust backend
│   └── src/
│       ├── commands/        # Tauri commands
│       ├── models/          # Data models
│       ├── services/        # Business logic
│       └── utils/           # Utilities
├── public/                   # Static assets
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

### Dashboard

- Proxy toggle switch
- Real-time status display
- Traffic statistics
- Port configuration

### Nodes

- Node list with groups
- Latency testing
- Node selection
- Search functionality

### Profiles

- Subscription import
- Configuration management
- Profile switching

### Settings

- Theme selection (Light/Dark/System)
- Language settings
- Auto-start configuration
- System proxy settings

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
- [Tauri](https://tauri.app) - Desktop framework
- [Shadcn/ui](https://ui.shadcn.com) - UI components
- [ClashMeta](https://github.com/MetaCubeX/mihomo) - Proxy kernel

## Roadmap

- [ ] ClashMeta kernel integration
- [ ] System proxy configuration
- [ ] TUN mode support
- [ ] WebDAV sync
- [ ] Multi-language support
- [ ] QR code scanning
- [ ] Traffic statistics
- [ ] Rule editor

## Contact

- GitHub: [@buwenzheng](https://github.com/buwenzheng)
- Repository: [clash-kite](https://github.com/buwenzheng/clash-kite)

---

Built with ❤️ using Tauri + React + Rust
