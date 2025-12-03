# SnapBack 🧢 - AI-Aware Code Protection System

[![E2E Tests](https://github.com/Marcelle-Labs/snapback.dev/actions/workflows/e2e.yml/badge.svg)](https://github.com/Marcelle-Labs/snapback.dev/actions/workflows/e2e.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/MarcelleLabs.snapback-vscode)](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode)

SnapBack is an AI-aware code protection system that automatically creates intelligent snapshots before AI assistants make changes to your codebase. It provides comprehensive file protection with privacy-first design and supports multiple platforms including VS Code, CLI, and web applications.

With the powerful [SnapBack VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode), developers can protect their code with a three-level protection system, automatically detect AI-generated changes, and maintain a complete history of file modifications. The extension seamlessly integrates with VS Code's UI, providing intuitive controls and rich visual feedback.

## 🚀 VS Code Extension Capabilities

### 🛡️ Three-Level Protection System

Protect your files with precision using three distinct protection levels:

-   **🟢 Watch (Silent)**: Automatic snapshots with no interruptions - perfect for files you edit frequently
-   **🟡 Warn (Notify)**: Confirmation dialog before saving - ideal for important files that affect multiple systems
-   **🔴 Block (Required)**: Required snapshot note before saving - maximum protection for critical files like `.env`, `package.json`, and authentication code

### 📸 Advanced Snapshot Intelligence

-   **Smart Deduplication**: Content-based deduplication saves disk space by storing only unique file states
-   **Git-Aware Naming**: Snapshots automatically use Git context for meaningful names (branch, commit message, etc.)
-   **Session-Based Snapshots**: Group related file changes into atomic sessions for comprehensive rollback
-   **Timeline Integration**: View snapshots directly in VS Code's built-in Timeline view
-   **Snapshot Comparison**: Visual diff views to compare file changes over time
-   **Bulk Operations**: Delete older snapshots, rename snapshots, and protect/unprotect in bulk

### 🤖 AI-Powered Risk Detection

-   **Secret Detection**: Automatically identifies and alerts on secrets (API keys, passwords, tokens) in your code
-   **Mock Detection**: Prevents test mocks from accidentally entering production code
-   **Phantom Dependency Detection**: Identifies missing dependencies that could break your application
-   **AI Change Tracking**: Detects AI-generated code and tracks changes for security auditing

### 👥 Team Collaboration Features

-   **Shared Policies**: Use `.snapbackrc` configuration files to share protection policies across your team
-   **Policy Overrides**: Create temporary overrides for special circumstances
-   **Workspace Awareness**: Multi-root workspace support for complex project structures
-   **Offline Mode**: Work disconnected from the internet with full local functionality

### 🎯 Advanced IDE Integration

-   **File Health Indicators**: Visual indicators (🛡️/⚠️/🚨) show the health status of your files
-   **Contextual Menus**: Right-click any file for instant access to protection and snapshot actions
-   **Keyboard Shortcuts**: Quick access with customizable shortcuts:
    -   `Ctrl+Alt+S` / `Cmd+Alt+S` - Create Snapshot
    -   `Ctrl+Alt+Z` / `Cmd+Alt+Z` - Snap Back (Restore)
    -   `Ctrl+Alt+P` / `Cmd+Alt+P` - Protect Current File
-   **Status Bar Integration**: Quick access to protection status and AI detection results
-   **Customizable Views**: Dedicated sidebar panels for snapshots, protected files, and sessions

### 🔧 Powerful Command Palette

Access over 30 commands through VS Code's Command Palette:

-   **Protection Management**: Protect files, change protection levels, unprotect files
-   **Snapshot Operations**: Create, restore, delete, rename, and compare snapshots
-   **Session Control**: Preview and restore entire sessions of related changes
-   **Team Configuration**: Update and synchronize team protection policies
-   **AI Analysis**: Review security issues and risk assessments

### 🔒 Privacy-First Design

-   **Metadata-only Transmission**: Never sends file contents to the cloud, only metadata for optional sync
-   **Path Hashing**: File paths are hashed before transmission to protect directory structure
-   **Content Validation**: Prevents accidental content leakage with built-in safeguards
-   **Size Limits**: Enforces maximum payload sizes to prevent oversized transmissions
-   **Local-First Storage**: All snapshots stored locally in encrypted SQLite database within VS Code's storage
-   **Workspace Trust Integration**: Respects VS Code's workspace trust model for secure operation

## Key Features

### 🛡️ Intelligent File Protection

-   **Three-Level Protection System**: Watch (silent), Warn (notification), Block (require snapshot) with visual indicators (🟢🟡🔴)
-   **Pattern-based Rules**: Glob patterns for flexible file matching with team-shared `.snapbackrc` configurations
-   **Real-time Monitoring**: Automatic protection during file operations with workspace-aware context
-   **AI-Powered Detection**: Automatically identifies AI-generated code, secrets, mocks, and phantom dependencies

### 📸 Smart Snapshots

-   **Content Deduplication**: Content-based deduplication to save storage space
-   **Intelligent Naming**: Git-aware, semantic, and timestamp-based naming strategies
-   **Full-text Search**: Fast search through snapshot contents
-   **Local-first Storage**: SQLite-based local storage with optional cloud sync
-   **Session Support**: Atomic multi-file snapshot groups for complex changes
-   **Timeline Integration**: View snapshots directly in VS Code's built-in Timeline view
-   **Visual Comparison**: Side-by-side diff views for comparing file changes over time

### 🔒 Privacy-First Design

-   **Metadata-only Transmission**: Never sends file contents to the cloud
-   **Path Hashing**: File paths are hashed before transmission
-   **Content Validation**: Prevents accidental content leakage
-   **Size Limits**: Enforces maximum payload sizes

### 🌐 Platform Features

-   **VS Code Extension**: Native IDE integration with file decorators, timeline integration, rich UI, and over 30 commands accessible through the Command Palette
-   **CLI Tool**: Command-line interface for automation and scripting
-   **Web SDK**: JavaScript/TypeScript SDK for web applications
-   **MCP Server**: Model Context Protocol integration for AI assistant interoperability

### ⚡ Performance & Reliability

-   **Fast Operations**: Sub-100ms snapshot creation optimized for VS Code's responsive UI
-   **Built-in Caching**: HTTP and query result caching for smooth IDE experience
-   **Robust Error Handling**: Comprehensive error recovery with retry logic and user-friendly notifications
-   **Rate Limit Management**: Automatic handling of API rate limits to prevent disruption
-   **Resource Efficient**: Lightweight design that minimizes impact on VS Code performance

### 🧪 Quality Assurance

-   **Comprehensive Testing**: 1,204 lines of critical integration tests including VS Code extension E2E tests
-   **CI/CD Pipeline**: Automated testing with database integration and VS Code-specific test suites
-   **Coverage Enforcement**: 70%+ code coverage requirements across all packages including the VS Code extension
-   **Pre-commit Hooks**: Local quality checks before commits with VS Code extension validation

## Helpful links

-   [📘 Documentation](https://snapback.dev/docs)
-   [🚀 Demo](https://snapback.dev)
-   [🧢 VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode)

## Open Source Packages

The following packages are available as open-source under Apache-2.0 license:

- [`@snapback-oss/sdk`](./packages-oss/sdk) - TypeScript/JavaScript SDK
- [`@snapback-oss/infrastructure`](./packages-oss/infrastructure) - Generic logging, metrics, and tracing utilities
- [`@snapback-oss/contracts`](./packages-oss/contracts) - TypeScript types and schemas
- [`@snapback-oss/config`](./packages-oss/config) - Configuration utilities
- [`@snapback-oss/events`](./packages-oss/events) - Event bus implementation

See [`packages-oss/README.md`](./packages-oss/README.md) for more information.

## Architecture Overview

The SnapBack platform consists of several key components organized into 10 consolidated packages:

### Core Packages

1.  **@snapback/config** - Configuration and utilities

    -   Contains all configuration files and utility functions

2.  **@snapback/contracts** - Shared types and interfaces

    -   Contains shared TypeScript types and interfaces used across packages

3.  **@snapback/core** - Core functionality

    -   Contains AI detection, dependency analysis, feature management, and other core features

4.  **@snapback/events** - Event system

    -   Contains event handling and messaging functionality

5.  **@snapback/infrastructure** - Infrastructure components

    -   Contains logging, metrics, tracing, and other infrastructure-related functionality

6.  **@snapback/integrations** - Third-party integrations

    -   Contains integrations with external services like payments, email, and feature flags

7.  **@snapback/platform** - Platform services

    -   Contains database schemas, queries, and Supabase client

8.  **@snapback/sdk** - Client SDK

    -   Platform-agnostic TypeScript SDK for SnapBack functionality

9.  **@snapback/api-service** - API Service (Standalone)

    -   Standalone Hono.js-based API service with Docker containerization
    -   Ready for Fly.io deployment
    -   Provides all backend functionality via REST and RPC endpoints

10. **@snapback/web** - Web application

    -   Next.js web application for the SnapBack dashboard

11. **snapback-vscode** - VS Code extension

    -   Native VS Code extension for IDE integration with comprehensive file protection
    -   Implements three-level protection system (Watch, Warn, Block) with visual indicators
    -   Features AI-powered risk detection including secret, mock, and phantom dependency detection
    -   Provides rich UI with dedicated sidebar panels, timeline integration, and status bar indicators
    -   Supports team collaboration through shared `.snapbackrc` configuration files
    -   Offers offline mode for disconnected work
    -   Includes session-based snapshots for atomic multi-file operations
    -   Integrates with VS Code's Command Palette for over 30 available commands
    -   Features keyboard shortcuts for quick access to common operations

For detailed information about the package consolidation and architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

For information about feature flags and runtime configuration, see [Feature Manager Documentation](./docs/development/feature-manager.md).

## 🧢 Detailed VS Code Extension Features

The SnapBack VS Code extension provides comprehensive file protection with an intuitive interface and powerful features:

### Three Protection Levels

-   **🟢 Watch (Silent)**: Automatic snapshots with no interruptions - perfect for files you edit frequently
-   **🟡 Warn (Notify)**: Confirmation dialog before saving - ideal for important files that affect multiple systems
-   **🔴 Block (Required)**: Required snapshot note before saving - maximum protection for critical files like `.env`, `package.json`, and authentication code

### Advanced Snapshot Management

-   **Smart Deduplication**: Content-based deduplication saves disk space by storing only unique file states
-   **Git-Aware Naming**: Snapshots automatically use Git context for meaningful names (branch, commit message, etc.)
-   **Session-Based Snapshots**: Group related file changes into atomic sessions for comprehensive rollback
-   **Timeline Integration**: View snapshots directly in VS Code's built-in Timeline view
-   **Snapshot Comparison**: Visual diff views to compare file changes over time
-   **Bulk Operations**: Delete older snapshots, rename snapshots, and protect/unprotect in bulk

### AI-Powered Risk Detection

-   **Secret Detection**: Automatically identifies and alerts on secrets (API keys, passwords, tokens) in your code
-   **Mock Detection**: Prevents test mocks from accidentally entering production code
-   **Phantom Dependency Detection**: Identifies missing dependencies that could break your application
-   **AI Change Tracking**: Detects AI-generated code and tracks changes for security auditing

### Team Collaboration

-   **Shared Policies**: Use `.snapbackrc` configuration files to share protection policies across your team
-   **Policy Overrides**: Create temporary overrides for special circumstances
-   **Workspace Awareness**: Multi-root workspace support for complex project structures

### IDE Integration

-   **File Health Indicators**: Visual indicators (🛡️/⚠️/🚨) show the health status of your files
-   **Contextual Menus**: Right-click any file for instant access to protection and snapshot actions
-   **Keyboard Shortcuts**: Quick access with customizable shortcuts:
    -   `Ctrl+Alt+S` / `Cmd+Alt+S` - Create Snapshot
    -   `Ctrl+Alt+Z` / `Cmd+Alt+Z` - Snap Back (Restore)
    -   `Ctrl+Alt+P` / `Cmd+Alt+P` - Protect Current File
-   **Status Bar Integration**: Quick access to protection status and AI detection results
-   **Customizable Views**: Dedicated sidebar panels for snapshots, protected files, and sessions

## AI Assistant Integration

### Qoder Configuration

This project includes enhanced configuration for Qoder, an AI coding assistant that works with the SnapBack system. The configuration is optimized for use with Context7, providing intelligent code assistance, documentation retrieval, and risk analysis.

For details about the Qoder configuration and Context7 integration, see [QODER_CONTEXT7_INTEGRATION.md](./QODER_CONTEXT7_INTEGRATION.md).

## Versioning

This project uses automated versioning with Changesets. For more information, see [Autoversioning Documentation](./claudedocs/technical/autoversioning.md).

## Local Development

### Development Environment Setup

SnapBack uses **Node.js v22.19.0** with **better-sqlite3** as the local snapshot storage engine. We provide Docker-based development environments to ensure consistent builds across platforms.

#### Option 1: Local Development (native, recommended for active development)

Requires Node.js v22.19.0 and native build tools:

```bash
# Use nvm to switch to the correct Node version
nvm install
nvm use

# Install dependencies
pnpm install

# Verify better-sqlite3 is working
pnpm snapback:check-sqlite

# Start development
pnpm dev
```

#### Option 2: Docker-based Development (recommended for setup/CI)

No local Node.js required. Docker handles all dependencies:

```bash
# Start the dev container
pnpm dev:docker

# Or using make
make dev:docker

# Inside the container:
pnpm install
pnpm snapback:check-sqlite
pnpm test
pnpm type-check
```

The dev container includes:
- Node.js v22.19.0 with pnpm v10.14.0
- Native build tools (python3, g++, make, etc.)
- SQLite development headers
- Git and curl for utilities

### Supported Development Matrix

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | v22.19.0 | Required for native module compatibility. Use `.nvmrc` with `nvm use` |
| **pnpm** | v10.14.0 | Enforced via `packageManager` field in package.json |
| **better-sqlite3** | 9.6.0 | Local snapshot storage engine (native module) |
| **OS Support** | macOS, Linux, Windows (WSL2) | Native modules work best on macOS/Linux. Windows users should use Docker or WSL2 |

**⚠️ Important:** If you're on Windows, use WSL2 or the Docker environment. Windows native development requires additional setup for native modules.

### Health Check: SQLite

Before committing code, verify that better-sqlite3 is working:

```bash
pnpm snapback:check-sqlite
```

This script verifies:
- ✅ better-sqlite3 can be loaded
- ✅ Database files can be created
- ✅ Basic SQL operations (CREATE, INSERT, SELECT, DELETE) work

If this fails, your environment is not ready for SnapBack development.

### Full-Stack Development (all services)

To set up and run the SnapBack platform locally, follow our comprehensive development guide:

- [Local Development Guide](./docs/local-development.md) - Complete setup instructions
- [DNS Configuration](./docs/setup/dns-configuration.md) - Configure subdomain routing
- [Docker Architecture](./docs/architecture/docker.md) - Understand the container setup

#### Quick Start (Full-Stack)

```bash
# Clone the repository
git clone <repository-url>
cd snapback

# Set up environment
cp .env.docker.example .env.docker
# Edit .env.docker with your configuration

# Start development environment
make dev
```

Access the services at:
- Marketing site: http://snapback.dev
- Console: http://console.snapback.dev
- Documentation: http://docs.snapback.dev
- API: http://api.snapback.dev
- MCP: http://mcp.snapback.dev"}, "old_text": "## Local Development

To set up and run the SnapBack platform locally, follow our comprehensive development guide:

- [Local Development Guide](./docs/local-development.md) - Complete setup instructions
- [DNS Configuration](./docs/setup/dns-configuration.md) - Configure subdomain routing
- [Docker Architecture](./docs/architecture/docker.md) - Understand the container setup

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd snapback

# Set up environment
cp .env.docker.example .env.docker
# Edit .env.docker with your configuration

# Start development environment
make dev
```

Access the services at:
- Marketing site: http://snapback.dev
- Console: http://console.snapback.dev
- Documentation: http://docs.snapback.dev
- API: http://api.snapback.dev
- MCP: http://mcp.snapback.dev

## Testing

### Unit Tests

Run unit tests with:
```bash
pnpm test
```

### E2E Tests

Run end-to-end tests with:
```bash
pnpm test:e2e
```

For detailed information about testing, see:
- [E2E Testing Guide](./docs/testing/e2e-guide.md) - Comprehensive testing documentation
- [Test Implementation Details](./TESTING_REPORT.md) - Technical test coverage information

## Architecture

The SnapBack platform follows a monorepo architecture with 10 core packages and 5 applications. For detailed architectural information, see:

- [Architecture Overview](./ARCHITECTURE.md) - Complete system architecture
- [Docker Architecture](./docs/architecture/docker.md) - Container orchestration
- [Package Consolidation Report](./PACKAGE-ARCHITECTURE-ANALYSIS.md) - Package structure analysis

## Developer Documentation

For developers working on the SnapBack codebase, see our comprehensive canonical developer guide:

- [Canonical Developer Guide](./docs/development/canonical-developer-guide.md) - Complete guide to the current architecture using industry-standard libraries
