# SnapBack MCP — AI Safety Layer

## Value Proposition

SnapBack is an AI-aware code protection system that automatically creates intelligent snapshots before AI assistants modify your codebase. With the Model Context Protocol (MCP) integration, SnapBack provides real-time risk analysis and protection directly within your AI assistant workflow.

### Key Benefits

- **Prevent Irreversible Changes**: Automatically create snapshots before AI modifications
- **Real-time Risk Analysis**: Guardian system detects security vulnerabilities, mock replacements, and phantom dependencies
- **Flexible Protection Levels**: Watch, Warn, or Block file operations based on risk thresholds
- **Privacy-First Design**: Only metadata is transmitted, never file contents
- **Fast Recovery**: Content-deduplicated snapshots with full-text search for quick restoration

## Features

### Intelligent File Protection
- Multi-level protection (Watch, Warn, Block)
- Glob pattern-based rules for flexible file matching
- Real-time monitoring during file operations

### Smart Snapshots
- Content-based deduplication to save storage space
- Git-aware and semantic naming strategies
- Full-text search through snapshot contents
- Local-first storage with optional cloud sync

### Risk Analysis
- Secret detection to prevent credential leaks
- Mock replacement detection to identify test code in production
- Phantom dependency analysis to catch security vulnerabilities
- Configurable risk thresholds and protection levels

## Quick Start

### Installation
1. Install the SnapBack VS Code extension from the marketplace
2. Configure your protection preferences in VS Code settings
3. Start using AI assistants with automatic protection

### Basic Usage
1. Open a project in VS Code with SnapBack installed
2. Use any AI assistant (GitHub Copilot, Qoder, etc.)
3. SnapBack automatically monitors file changes
4. When risky changes are detected, SnapBack will:
   - Show warnings in the status bar
   - Create snapshots before modifications
   - Block changes if configured to do so

### Configuration
Configure SnapBack through VS Code settings:
- `snapback.guardian.plugins.secretDetection`: Enable/disable secret detection
- `snapback.guardian.plugins.mockReplacement`: Enable/disable mock replacement detection
- `snapback.guardian.plugins.phantomDependency`: Enable/disable phantom dependency detection
- `snapback.guardian.thresholds.warn`: Risk score threshold for warnings (default: 6)
- `snapback.guardian.thresholds.block`: Risk score threshold for blocking (default: 8)
- `snapback.guardian.protectionLevel`: Protection level (observe, warn, block)

## Tools List

### VS Code Extension
- File monitoring and protection
- Status bar risk indicator
- Diagnostic integration with VS Code's Problems panel
- Settings configuration UI

### CLI Tool
- `snapback analyze <file>`: Analyze a file for risks
- `snapback snapshot`: Create a snapshot manually
- `snapback list`: List existing snapshots
- `snapback check`: Pre-commit hook for CI/CD integration
- `snapback interactive`: Interactive terminal user interface

### MCP Server
- Model Context Protocol integration
- Real-time risk analysis for AI assistants
- Advisory recommendations for safer coding practices

## Screenshots

*(Note: Actual screenshots would be placed in docs/mcp/screenshots/ directory)*

1. **Status Bar Integration**: Real-time risk indicator in VS Code status bar
2. **Diagnostics View**: Risk findings displayed in VS Code's Problems panel
3. **Settings UI**: Configuration options for protection levels and plugins
4. **Snapshot List**: View of all created snapshots with search functionality
5. **CLI Interface**: Terminal-based interaction with SnapBack features

## Getting Help

- Documentation: https://snapback.dev/docs
- GitHub Issues: https://github.com/snapback/snapback/issues
- Community Support: https://discord.gg/snapback

## Privacy & Security

SnapBack follows a privacy-first design:
- Only metadata is transmitted, never file contents
- File paths are hashed before transmission
- Content validation prevents accidental data leakage
- Size limits enforce maximum payload sizes