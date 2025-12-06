# Changelog

## 1.1.1

### Patch Changes

- Updated dependencies
  - @snapback/auth@0.0.1
  - @snapback/core@0.1.2
  - @snapback/policy-engine@0.0.1

## 1.1.0

### Minor Changes

- 884ce9e: refactor: Major repository reorganization

  - Consolidated 10 packages into 4 new packages:
    - @snapback/infrastructure (logging, metrics, tracing)
    - @snapback/integrations (email, payments)
    - @snapback/platform (database schemas, Supabase client)
    - @snapback/config (utility functions, feature flags)
  - Removed deprecated packages: @snapback/database, @snapback/storage, @snapback/telemetry, @snapback/logs, @snapback/observability, @snapback/payments, @snapback/mail, @snapback/feature-flags, @snapback/utils, @snapback/supabase
  - Updated dependencies across all packages to use new consolidated packages
  - Moved utility functions from @snapback/utils to @snapback/config/src/utils
  - Moved feature flag management to @snapback/contracts/src/feature-manager.ts
  - Updated VS Code extension to use new package structure
  - Updated SDK to use @snapback/infrastructure instead of @snapback/logs
  - Updated all import paths to reflect new package structure

### Patch Changes

- Updated dependencies [884ce9e]
  - @snapback/sdk@0.2.0
  - @snapback/contracts@0.2.0
  - @snapback/core@0.2.0
  - @snapback/events@1.1.0
  - @snapback/integrations@0.1.0
  - @snapback/config@0.2.0
  - @snapback/analytics@0.0.2
  - @snapback/auth@0.0.1
  - @snapback/policy-engine@0.0.1

All notable changes to `@snapback/mcp-server` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-05

### 📝 Changed

- License section aligned with Apache 2.0 badge standard
- Enhanced README with troubleshooting section

### 🔧 Maintenance

- Codecov integration for coverage tracking
- CI workflow updates for reliable testing

## [1.0.0] - 2025-11-25

### 🎉 Initial Stable Release

- **Core MCP Server**: Model Context Protocol server for AI tools
- **Guardian Lite Integration**: Lightweight code analysis engine
  - Risk analysis via AnalysisRouter
  - Secret detection patterns
  - Dependency vulnerability checks
- **Context7 Tools**:
  - `ctx7.resolve-library-id`
  - `ctx7.get-library-docs`
- **Deployment Support**:
  - Docker configuration
  - Fly.io deployment (`fly.toml`)

### Core Tools

- `snapback.analyze_risk` - Code change risk analysis
- `snapback.check_dependencies` - Dependency risk detection

### Pro Tools (API key required)

- `snapback.create_snapshot` - Create code snapshots
- `snapback.list_snapshots` - List available snapshots
- `snapback.restore_snapshot` - Restore from snapshot

### Features

- stdio transport for Claude Desktop integration
- Offline Mode - Works without API key for basic analysis
- Claude Desktop configuration examples
- Cursor/other MCP client support

---

[Unreleased]: https://github.com/snapback-dev/mcp-server/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/snapback-dev/mcp-server/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/snapback-dev/mcp-server/releases/tag/v1.0.0
