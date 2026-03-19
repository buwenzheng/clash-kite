# Clash-Kite User Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Interface Overview](#interface-overview)
- [Subscription Management](#subscription-management)
- [Node Management](#node-management)
- [Settings](#settings)
- [FAQ](#faq)

## Getting Started

### 1. Install Application

Download the installer for your platform:

- **Windows**: Download `.msi` or `.exe` installer
- **macOS**: Download `.dmg` installer

### 2. First Launch

1. Launch Clash-Kite
2. Go to "Profiles" page
3. Import subscription link or local config file
4. Return to "Dashboard" and click the proxy toggle to start

### 3. Select Node

1. Go to "Nodes" page
2. Test node latency
3. Select a suitable node

## Interface Overview

### Dashboard

The dashboard is the main interface of the application:

- **Proxy Toggle**: Large button to enable/disable proxy
- **Status Display**: Shows current proxy status (Running/Stopped)
- **Traffic Statistics**: Shows upload/download traffic
- **Port Configuration**: Shows HTTP, SOCKS5, Mixed ports

### Nodes

The nodes page is for managing proxy nodes:

- **Node List**: Display all nodes by group
- **Search**: Quick node search
- **Latency Test**: Test single or all nodes latency
- **Node Selection**: Click "Select" button to switch node

### Profiles

The profiles page is for managing proxy configurations:

- **Import Subscription**: Input subscription link and name to import
- **Config List**: Display all imported configurations
- **Update Subscription**: Click refresh button to update subscription
- **Switch Config**: Click "Use" button to switch configuration

### Settings

The settings page is for configuring the application:

- **Theme**: Choose Light/Dark/System
- **Language**: Switch English/Chinese
- **Auto Start**: Whether to start on system boot
- **Minimize to Tray**: Whether to minimize to tray when closing
- **System Proxy**: Whether to auto-set system proxy
- **TUN Mode**: Whether to enable virtual network adapter mode (experimental)

## Subscription Management

### Import Subscription

1. Go to "Profiles" page
2. In "Import Subscription" area, enter:
   - **Profile Name**: Give the subscription a name
   - **Subscription URL**: Paste the subscription URL
3. Click "Import" button

### Update Subscription

In the config list, click the refresh button next to the subscription to update it.

### Delete Configuration

Click the delete button next to the configuration to delete it.

## Node Management

### Test Latency

- **Test Single Node**: Click the refresh button next to the node
- **Test All Nodes**: Click "Test All" button at the top of the page

### Select Node

Click the "Select" button next to the node to switch to that node.

### Search Nodes

Enter keywords in the search box to search for node name, server address, etc.

## Settings

### Theme Settings

- **Light**: Use light theme
- **Dark**: Use dark theme
- **System**: Auto-switch based on system settings

### Language Settings

- **English**: English interface
- **中文**: Chinese interface

After switching language, the interface will update immediately.

### System Proxy

Enable "System Proxy" to automatically set system proxy settings.

### TUN Mode

TUN mode is an experimental feature that can take over all system traffic. Requires administrator privileges.

## FAQ

### Q: Proxy cannot start?

A: Please check:

1. Whether configuration is imported
2. Whether port is occupied
3. Whether you have administrator privileges (TUN mode)

### Q: Subscription import failed?

A: Please check:

1. Whether subscription link is correct
2. Whether network connection is normal
3. Whether subscription format is supported

### Q: Node latency shows N/A?

A: It means the node has not been tested or the test failed. Click the refresh button to test again.

### Q: How to set system proxy?

A: Enable "System Proxy" option in Settings page.

### Q: Where are configuration files stored?

A:

- **Windows**: `%APPDATA%/clash-kite/`
- **macOS**: `~/Library/Application Support/clash-kite/`

## Shortcuts

Shortcuts are not supported yet, will be added in future versions.

## Feedback

If you encounter any issues, please submit an Issue on GitHub:

https://github.com/buwenzheng/clash-kite/issues
