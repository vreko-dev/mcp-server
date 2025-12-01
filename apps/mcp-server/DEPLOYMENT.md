# SnapBack MCP Server - Deployment Guide

## Overview

The SnapBack MCP server can be deployed in two ways:
1. **Production Build** (Recommended) - Build once, run with Node
2. **Development Mode** - Run directly with tsx (no build step)

---

## Production Deployment (Recommended)

### 1. Build the Server

```bash
# From monorepo root
pnpm --filter @snapback/mcp-server build

# Or from apps/mcp-server directory
pnpm build
```

This creates `dist/index.js` which can be run with Node.

### 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "snapback": {
      "command": "node",
      "args": ["/absolute/path/to/SnapBack-Site/apps/mcp-server/dist/index.js"],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here",
        "SNAPBACK_API_URL": "https://api.snapback.dev",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and relaunch Claude Desktop to load the MCP server.

---

## Development Mode

For testing and development, you can run the server directly without building:

```bash
# From monorepo root
pnpm --filter @snapback/mcp-server dev

# Or from apps/mcp-server directory
pnpm dev
```

### Claude Desktop Configuration (Development)

```json
{
  "mcpServers": {
    "snapback-dev": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/absolute/path/to/SnapBack-Site/apps/mcp-server/src/index.ts"
      ],
      "env": {
        "SNAPBACK_API_KEY": "your-api-key-here",
        "SNAPBACK_API_URL": "http://localhost:3000",
        "NODE_ENV": "development"
      }
    }
  }
}
```

---

## Environment Variables

Required:
- `SNAPBACK_API_KEY` - Your SnapBack API key (get from https://snapback.dev)

Optional:
- `SNAPBACK_API_URL` - Backend API URL (default: https://api.snapback.dev)
- `NODE_ENV` - Environment mode (default: development)
- `SNAPBACK_EVENT_BUS_PORT` - Event bus port (default: 6379)

---

## Verification

### Test the Server is Running

1. Open Claude Desktop
2. Start a new conversation
3. Look for the 🔌 icon in the toolbar (indicates MCP servers are connected)
4. Try using a SnapBack tool:

```
Can you analyze this code change for risks?
```

### Check Server Logs

Logs are written to stderr and can be viewed in Claude Desktop's logs:

**macOS/Linux:** `~/Library/Logs/Claude/mcp-server-snapback.log`
**Windows:** `%APPDATA%\Claude\Logs\mcp-server-snapback.log`

---

## Available Tools

Once deployed, these tools are available in Claude:

### Free Tier
- `snapback.analyze_risk` - Analyze code changes for security/quality issues
- `snapback.check_dependencies` - Check dependency changes for issues
- `ctx7.resolve-library-id` - Look up library documentation
- `ctx7.get-library-docs` - Fetch library documentation

### Pro Tier (Requires API Key)
- `snapback.create_checkpoint` - Create code snapshots before changes
- `snapback.list_checkpoints` - List available restore points
- `snapback.restore_checkpoint` - Restore from a checkpoint

---

## Troubleshooting

### Server Not Connecting

1. Check Claude Desktop logs for errors
2. Verify the path to `dist/index.js` is absolute and correct
3. Ensure all workspace dependencies are installed: `pnpm install`
4. Try rebuilding: `pnpm --filter @snapback/mcp-server build`

### Tools Not Appearing

1. Verify the 🔌 icon shows in Claude Desktop
2. Check that the API key is valid (for Pro tools)
3. Restart Claude Desktop completely

### Build Errors

If you get TypeScript errors during build:

```bash
# Clean and rebuild
rm -rf apps/mcp-server/dist
pnpm --filter @snapback/mcp-server build
```

---

## Performance

Expected performance for MCP tools:
- `analyze_risk`: < 200ms
- `check_dependencies`: < 300ms
- `create_checkpoint`: < 500ms

If tools are slower, check:
- Network latency to backend API
- Event bus connectivity
- Disk I/O for snapshot operations

---

## Security

- API keys are passed via environment variables (not logged)
- All paths are validated against workspace root
- PII is sanitized from telemetry
- Production errors don't leak sensitive information

---

## Next Steps

1. Test the free-tier tools (analyze_risk, check_dependencies)
2. Get a Pro API key from https://snapback.dev/pricing
3. Test checkpoint creation/restoration
4. Review logs for any warnings or errors

For support: https://github.com/snapback/snapback/issues
