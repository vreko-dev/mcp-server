# SnapBack MCP Server - CLI-First Setup Guide

> **Architecture Change (Dec 2024):** MCP server is now bundled with the CLI, not a standalone app.
> The old `apps/mcp-server` is archived. Use `snap mcp --stdio` instead.

## Quick Start

### 1. Install the CLI

```bash
# Global install from npm (when published)
npm install -g @snapback/cli

# Or use npx (no install required)
npx @snapback/cli mcp --stdio

# Or from source
cd /path/to/SnapBack-Site
pnpm install
pnpm build
```

### 2. Verify MCP Command Works

```bash
snap mcp --help
# or
snapback mcp --help
```

Expected output:
```
Usage: snapback mcp [options]

Run MCP server for Cursor/Claude integration

Options:
  --stdio             Use stdio transport (default)
  --workspace <path>  Workspace root path (auto-resolved if not provided)
  --tier <tier>       User tier (free|pro|enterprise) (default: "free")
  -h, --help          display help for command
```

## Host Configuration

### Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "snapback": {
      "command": "snap",
      "args": ["mcp", "--stdio"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Using npx (no global install):**
```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/cli", "mcp", "--stdio"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Edit: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "snapback": {
      "command": "snap",
      "args": ["mcp", "--stdio"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Using npx:**
```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/cli", "mcp", "--stdio"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cline / Claude Dev

```json
{
  "mcp.servers": {
    "snapback": {
      "command": "snap",
      "args": ["mcp", "--stdio"]
    }
  }
}
```

**Using npx:**
```json
{
  "mcp.servers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/cli", "mcp", "--stdio"]
    }
  }
}
```

### Development Mode (Source)

If running from source without global install:

```json
{
  "mcpServers": {
    "snapback": {
      "command": "node",
      "args": ["/path/to/SnapBack-Site/apps/cli/dist/index.js", "mcp", "--stdio"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools (11 Facade Tools)

| Tool | Tier | Description |
|------|------|-------------|
| `snapback.analyze` | Free | Analyze code changes for risks or validate packages |
| `snapback.prepare_workspace` | Free | Pre-flight workspace check (vitals + context + snapshot advice) |
| `snapback.validate` | Free | Validate code against patterns (quick or comprehensive) |
| `snapback.context` | Free | Context operations (init, build, validate, status, constraints) |
| `snapback.session` | Free | Session management (start, stats, recommendations, end) |
| `snapback.learn` | Free | Record learnings from development sessions |
| `snapback.acknowledge_risk` | Free | Acknowledge risk and proceed with changes |
| `snapback.meta` | Free | Get tool metadata and capabilities |
| `snapback.snapshot_create` | Pro | Create code snapshots before changes |
| `snapback.snapshot_list` | Pro | List available restore points |
| `snapback.snapshot_restore` | Pro | Restore from a previous snapshot |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SNAPBACK_API_KEY` | API key for Pro features | (none - free tier) |
| `SNAPBACK_WORKSPACE_ROOT` | Override workspace detection | (auto-resolved) |
| `MCP_QUIET` | Suppress startup logging (for stdio purity) | 0 |

## Workspace Resolution

The MCP server resolves workspace root in this order:

1. `--workspace` argument
2. `SNAPBACK_WORKSPACE_ROOT` environment variable
3. Current working directory + repository root detection

Workspace is validated by checking for:
- `.git/` directory
- `package.json` file
- `.snapback/` directory

## Testing the Integration

### 1. Test MCP Handshake

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | snap mcp --stdio
```

Expected: JSON-RPC response with `protocolVersion` and `serverInfo`.

### 2. List Available Tools

```bash
echo -e '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | snap mcp --stdio
```

### 3. Test Tool Call

```bash
echo -e '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"snapback.prepare_workspace","arguments":{}}}' | snap mcp --stdio
```

## Architecture

```
┌─────────────────────────────────────────────┐
│        Claude Desktop / Cursor              │
│           (MCP Client)                      │
└─────────────────┬───────────────────────────┘
                  │ MCP Stdio Protocol
                  │
┌─────────────────▼───────────────────────────┐
│          snap mcp --stdio                   │
│       (CLI launches MCP server)             │
├─────────────────────────────────────────────┤
│  packages/mcp/                              │
│  ├── src/server.ts      createServer()     │
│  ├── src/tools/         Facade handlers     │
│  ├── src/transport/     stdio/sse           │
│  └── src/middleware/    auth, workspace     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│    @snapback/intelligence, @snapback/core  │
│        (Business logic packages)            │
└─────────────────────────────────────────────┘
```

## Migration from `apps/mcp-server`

The old `apps/mcp-server` is archived at `apps/_archive/mcp-server`.

**Before (old):**
```json
{
  "command": "node",
  "args": ["/path/to/apps/mcp-server/dist/index.js"]
}
```

**After (new):**
```json
{
  "command": "snap",
  "args": ["mcp", "--stdio"]
}
```

## Troubleshooting

### "Unknown command: mcp"

Ensure CLI is built and installed:
```bash
pnpm --filter @snapback/cli build
```

### "Cannot find module"

Rebuild all packages:
```bash
pnpm build
```

### Stdout Corruption (JSON-RPC errors)

Set `MCP_QUIET=1` to suppress logging during MCP:
```json
{
  "env": {
    "MCP_QUIET": "1"
  }
}
```

### Tool Not Found

Check tier requirements. Pro tools require `SNAPBACK_API_KEY`.

---

**Last Updated:** December 2024
**See Also:** [MCP Protocol Spec](https://modelcontextprotocol.io/)
