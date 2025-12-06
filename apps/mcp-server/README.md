# SnapBack MCP Server

[![npm version](https://badge.fury.io/js/@snapback%2Fmcp-server.svg)](https://www.npmjs.com/package/@snapback/mcp-server)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> Give your AI agent access to SnapBack's pattern memory.
>
> Query what's broken before, get warnings about risky patterns, and let your agent learn from 1,000+ repos' mistakes.

## Quick Start

```bash
npm install -g @snapback/mcp-server
snapback-mcp
```

Works immediately - no configuration required!

## What It Does

### 🆓 Free (No Account Needed)

- ✅ **Pattern Memory Queries**: "Has this refactor pattern caused problems before?"
- ✅ **Risk Assessment**: Check if changes match known failure patterns
- ✅ **Dependency Checking**: Validate package.json changes
- ✅ **Offline Ready**: Works without internet connection

### ☁️ Pro Features (Optional API Key)

Add `SNAPBACK_API_KEY` to unlock:

- 🔐 **Report Outcomes**: Tell SnapBack what actually broke (improves future detection)
- 🔐 **Create Snapshots**: Let your AI agent checkpoint before risky refactors
- 🔐 **Cloud Sync**: Access snapshots across devices
- 🔐 **Team Sharing**: Share learned patterns with teammates

## Installation

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"]
    }
  }
}
```

### With API Key (Optional)

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"],
      "env": {
        "SNAPBACK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cursor / Other MCP Clients

```bash
# Install globally
npm install -g @snapback/mcp-server

# Run with stdio transport
snapback-mcp
```

## Available Tools

### `snapback.analyze_risk`

Analyze code changes for potential security risks before applying them.

**When to use:**
- Before accepting AI-generated code
- When reviewing complex changes
- For critical files (auth, database, config)

**Example:**
```javascript
// AI detects you want to add authentication
// Before applying changes, it calls:
snapback.analyze_risk({
  changes: [
    { added: true, value: "const API_KEY = 'sk_live_...';" }
  ]
})
// Returns: ⚠️ HIGH RISK: Hardcoded secret detected
```

### `snapback.check_dependencies`

Check for dependency-related risks when package.json changes.

**Example:**
```javascript
snapback.check_dependencies({
  before: { "lodash": "^4.17.15" },
  after: { "lodash": "^4.17.21" }
})
// Returns: ℹ️ Security update available
```

### `snapback.create_snapshot` (Pro)

Create a code snapshot before risky changes.

**Example:**
```javascript
snapback.create_snapshot({
  reason: "Before major refactor",
  files: ["src/auth.ts", "src/db.ts"]
})
// Returns: ✅ Snapshot created: snap_xyz123
```

### `snapback.list_snapshots` (Pro)

List all available snapshots.

### `snapback.restore_snapshot` (Pro)

Restore code from a previous snapshot.

### Context7 Tools

- `ctx7.resolve-library-id`: Find library documentation
- `ctx7.get-library-docs`: Fetch library docs and examples

## Configuration

### Environment Variables

```bash
# Optional: SnapBack API key for Pro features
SNAPBACK_API_KEY=sk_...

# Optional: Custom API URL
SNAPBACK_API_URL=https://api.snapback.dev

# Optional: Context7 API key for enhanced docs
CONTEXT7_API_KEY=...

# Optional: Log level
LOG_LEVEL=info
```

### Offline Mode

Works perfectly without any configuration or API keys:

```bash
# No env vars needed!
npx @snapback/mcp-server
```

**What works offline:**
- Risk analysis (basic)
- Dependency checking
- Secret detection
- Context7 library search (cached)

**What requires API key:**
- Advanced ML risk analysis
- Snapshot creation/restoration
- Cloud sync
- Team features

## Architecture

```
┌─────────────────┐
│   AI Tool       │  (Claude, Cursor, etc.)
│   (MCP Client)  │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼─────────────────────────────────┐
│  SnapBack MCP Server                     │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Free Tools   │  │  Pro Tools       │ │
│  │ - analyze    │  │  - snapshots     │ │
│  │ - check_deps │  │  - cloud sync    │ │
│  └──────────────┘  └──────────────────┘ │
└───────────┬──────────────────────────────┘
            │
        ┌───┴────┐
        │        │
   ┌────▼───┐ ┌─▼─────────┐
   │ Local  │ │ SnapBack  │
   │Analysis│ │    API    │
   └────────┘ └───────────┘
```

## Development

### Running Locally

```bash
git clone https://github.com/snapback-dev/mcp-server.git
cd mcp-server

pnpm install
pnpm build
pnpm start
```

### Testing

```bash
# Run tests
pnpm test

# Test without API key (offline mode)
unset SNAPBACK_API_KEY
pnpm start

# Test with API key
export SNAPBACK_API_KEY=sk_test_...
pnpm start
```

### Building

```bash
pnpm build

# Output: dist/index.js (ESM)
```

## Troubleshooting

### Server won't start

1. Check Node.js version: `node -v` (requires 18+)
2. Clear cache: `rm -rf node_modules && npm install`
3. Check permissions: `chmod +x $(which snapback-mcp)`

### API key not working

1. Verify key format: `sk_live_...` or `sk_test_...`
2. Check env var: `echo $SNAPBACK_API_KEY`
3. Get new key: [snapback.dev/settings/api](https://snapback.dev/settings/api)

### Tools not showing in Claude

1. Restart Claude Desktop completely
2. Check config file syntax (JSON must be valid)
3. Look for errors in Claude's console logs

## Security

- All secrets handled via environment variables
- No data sent to SnapBack without API key
- Local analysis runs offline
- Open source - audit the code yourself

Report security issues: security@snapback.dev

## Links

- **Documentation**: [docs.snapback.dev](https://docs.snapback.dev)
- **Main Repository**: [snapback-dev/snapback.dev](https://github.com/snapback-dev/snapback.dev)
- **Issues**: [github.com/snapback-dev/snapback.dev/issues](https://github.com/snapback-dev/snapback.dev/issues)
- **NPM**: [@snapback/mcp-server](https://www.npmjs.com/package/@snapback/mcp-server)

## License

Apache-2.0 © SnapBack

## Related

- [`snapback` VS Code Extension](https://marketplace.visualstudio.com/items?itemName=snapback.snapback)
- [`@snapback/sdk`](https://github.com/snapback-dev/sdk) - TypeScript SDK
- [`@snapback/contracts`](https://github.com/snapback-dev/contracts) - Type definitions
