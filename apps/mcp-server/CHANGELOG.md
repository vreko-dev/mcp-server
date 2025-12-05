# Changelog

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
