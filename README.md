<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/lockup-white.png" width="400">
    <img alt="Vreko" src="./assets/lockup-dark.png" width="400">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vreko-mcp-server"><img src="https://img.shields.io/npm/v/vreko-mcp-server?style=flat-square&color=4ADE80" alt="Version" /></a>
  <a href="https://github.com/vreko-dev/mcp-server/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square" alt="License" /></a>
  <a href="https://discord.gg/B4BXeYkE2F"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <strong>AI-powered context server for the Vreko platform.</strong><br />
  Enables Claude, Cursor, and other AI assistants to coordinate with your code intelligence system.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-what-is-vreko-mcp-server">About</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-api-reference">API</a> ·
  <a href="https://docs.vreko.dev/mcp">Documentation</a>
</p>

---

## What is Vreko MCP Server?

Vreko MCP Server is a **Model Context Protocol (MCP) server** that gives AI coding agents a session memory and intelligence layer. It enables Claude, Cursor, Windsurf, and any MCP-compatible assistant to:

- **Brief themselves** before every task  -  past learnings, active warnings, risk context
- **Check vitals mid-session**  -  activity level, risk pressure, trajectory
- **Capture discoveries**  -  patterns, gotchas, and decisions that carry forward to future sessions
- **Close with ceremony**  -  session outcome recorded, compound intelligence grows

**Key Capabilities:**
| Feature | Description |
|---------|-------------|
| **Session Intelligence** | `vreko` → `vreko_pulse` → `vreko_learn` → `vreko_end`  -  the agentic coding loop |
| **Pattern Memory** | Learns your codebase’s specific failure modes over time |
| **Multi-Assistant Support** | Works with Claude, Cursor, Windsurf, and any MCP-compatible client |
| **Cloud & Local Modes** | Deploy to Fly.io or run locally via CLI |
| **Security-First** | API key validation, path traversal protection, CORS security |

---

## Quick Start

### 1. Install

**Option A: npx (No Installation)**
```bash
npx vreko-mcp-server
```

**Option B: Global Install**
```bash
npm install -g vreko-mcp-server
vreko-mcp-server
```

**Option C: Docker**
```bash
docker run -p 8080:8080 -e VREKO_API_KEY=your_key vreko/mcp-server
```

### 2. Configure Your AI Assistant

**Claude Desktop Config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "vreko": {
      "command": "npx",
      "args": ["vreko-mcp-server"],
      "env": {
        "VREKO_API_KEY": "YOUR_VREKO_API_KEY"
      }
    }
  }
}
```

**Cursor Config** (Settings → MCP):
```json
{
  "mcpServers": {
    "vreko": {
      "command": "npx",
      "args": ["vreko-mcp-server"],
      "env": {
        "VREKO_API_KEY": "YOUR_VREKO_API_KEY"
      }
    }
  }
}
```

### 3. Verify Installation

```bash
# Health check
curl http://localhost:8080/health

# Expected response:
{"status":"healthy","version":"1.0.0","timestamp":"2026-01-..."}
```

---

## Architecture

Wraps the CLI-based MCP server (`packages/mcp`) in an Express HTTP server that can be deployed to Fly.io or other cloud providers. This allows Claude Desktop, Cursor, and other AI tools to connect to Vreko over HTTPS instead of requiring local installation.

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant Clients                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Claude Desktop│  │    Cursor    │  │  Other MCP Tools │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          └─────────────────┼───────────────────┘
                            ▼ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    apps/mcp-server                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express HTTP Server  •  API Key Auth  •  CORS         │ │
│  │  • Request Validation  •  Error Handling  •  Logging   │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        ▼ Stdio
┌─────────────────────────────────────────────────────────────┐
│                    packages/mcp                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MCP Protocol Handler  •  Tool Registry  •  Context    │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vreko Platform                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Pattern Memory│  │  Snapshot    │  │   Intelligence   │  │
│  │   Engine     │  │   Engine     │  │     Layer        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **HTTP Server** | Handles HTTPS requests, authentication, request/response formatting |
| **MCP Protocol** | Implements Model Context Protocol spec, tool registration, JSON-RPC |
| **Vreko Core** | Pattern analysis, snapshot management, learning capture |

## Local Development

### Build

```bash
pnpm build
```

### Run

```bash
# Development
PORT=8080 NODE_ENV=development node dist/index.js

# With API key
VREKO_API_KEY=YOUR_VREKO_API_KEY PORT=8080 node dist/index.js
```

### Test Health

```bash
curl http://localhost:8080/health
```

### Test MCP Call

```bash
# Initialize MCP session (standard JSON-RPC initialize handshake)
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "x-workspace-path: /path/to/your/project" \
  -H "x-api-key: YOUR_VREKO_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

## Deployment to Fly.io

### Quick Deploy (Recommended)

From the monorepo root:

```bash
# Full deployment with pre-flight checks and verification
pnpm --filter=vreko-mcp-server deploy

# Dry run (validates without deploying)
pnpm --filter=vreko-mcp-server deploy:dry-run
```

The deploy script automatically:
- ✅ Validates Fly CLI is installed and authenticated
- ✅ Checks for uncommitted changes
- ✅ Builds and validates the bundle
- ✅ Deploys to Fly.io
- ✅ Verifies health and `/bridge/push` endpoints after deployment

### Alternative Deploy Methods

```bash
# Quick deploy (skips pre-flight checks)
pnpm --filter=vreko-mcp-server deploy:quick

# Force immediate deployment (no rolling update)
pnpm --filter=vreko-mcp-server deploy:force

# Check deployment status
pnpm --filter=vreko-mcp-server deploy:status

# View live logs
pnpm --filter=vreko-mcp-server deploy:logs

# View releases for rollback
pnpm --filter=vreko-mcp-server deploy:rollback
```

### First-Time Setup

If deploying for the first time:

```bash
# 1. Login to Fly.io
fly auth login

# 2. Create the app (only once)
fly apps create vreko-mcp

# 3. Set secrets
fly secrets set VREKO_API_KEY=YOUR_VREKO_API_KEY -a vreko-mcp
fly secrets set CORS_ORIGIN=https://your-domain.com -a vreko-mcp

# 4. Deploy
pnpm --filter=vreko-mcp-server deploy
```

### CI/CD Deployment

Automatic deployments are triggered on push to `main` when changes are detected in:
- `apps/mcp-server/**`
- `packages/mcp/**`, `packages/core/**`, `packages/intelligence/**`

**Required GitHub Secret**: `FLY_API_TOKEN`

Generate a token: `fly tokens create deploy -x 999999h`

### Verify Deployment

```bash
# Health check
curl https://vreko-mcp.fly.dev/health

# Bridge endpoint test
curl -X POST https://vreko-mcp.fly.dev/bridge/push \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws_00000000000000000000000000000000","observations":[]}'
```

Expected responses:
```json
{"status":"healthy","uptime":123.456,"timestamp":"2025-01-06T...","version":"1.0.0"}
{"received":true,"observationsCount":0,"changesCount":0}
```

### Rollback

If something goes wrong:

```bash
# List recent releases
fly releases -a vreko-mcp

# Rollback to a previous version
fly releases rollback v123 -a vreko-mcp
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `NODE_ENV` | development | Environment (production/development) |
| `VREKO_API_KEY` | (required) | API key for authentication |
| `CORS_ORIGIN` | * | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | info | Logging level |

### Fly.io Secrets

Set via `fly secrets set KEY=value`:

```bash
fly secrets set VREKO_API_KEY=YOUR_VREKO_API_KEY
fly secrets set CORS_ORIGIN=https://your-app.com
```

View secrets:
```bash
fly secrets list
```

## The V2 Agentic Workflow

Vreko MCP exposes a **4-tool session API** designed for the agentic coding loop. Configure once, and your AI assistant uses it automatically:

| Tool | When | What it does |
|------|------|--------------|
| `vreko` | Task start | Returns intelligence briefing: recent learnings, active warnings, session lineage |
| `vreko_pulse` | Mid-session | Read-only vitals: pulse level, risk pressure, trajectory |
| `vreko_learn` | Any discovery | Records a pattern, gotcha, or decision for future sessions |
| `vreko_end` | Task complete | Closes session with ceremony  -  outcome, carry-forward context |

```
vreko({ task: "add rate limiting to API" })
  → briefing: 3 past learnings, 1 active warning, lineage from last session

  [... agent works ...]

vreko_pulse()
  → pulse: racing, pressure: 71%, trajectory: increasing  -  snapshot recommended

vreko_learn({ insight: "rate limiting config is shared  -  test in staging first" })

vreko_end({ outcome: "completed" })
  → ceremony: 4 files modified, 1 learning captured, context carried forward
```

The full consolidated surface is also available: `check`, `advise`, `guide`, `safe_to_write`, intelligence and refactoring tools. See [MCP documentation →](https://docs.vreko.dev/mcp)

---

## API Reference

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2024-12-30T...",
  "version": "1.0.0"
}
```

### `POST /mcp`

Main MCP endpoint  -  handles standard JSON-RPC 2.0 requests per the MCP protocol spec.

**Headers:**
```
x-workspace-path: /absolute/path/to/project
x-api-key: YOUR_VREKO_API_KEY
mcp-session-id: (returned from initialize, required for subsequent calls)
```

**Example  -  initialize session:**
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0"}}}
```

**Response:** Standard JSON-RPC 2.0 response. The `mcp-session-id` header in the response must be included in all subsequent requests.

## Security

- **Authentication**: Required `apiKey` parameter (validated against `VREKO_API_KEY`)
- **HTTPS Only**: Fly.io auto-configures HTTPS on port 443
- **CORS**: Configurable via `CORS_ORIGIN` environment variable
- **Non-root user**: Container runs as unprivileged user
- **Request timeouts**: 30-second timeout on MCP calls
- **Rate limiting**: Consider adding in production (not yet implemented)

## Monitoring

### Logs

```bash
fly logs
```

### Metrics

```bash
# CPU/Memory usage
fly scale show

# App status
fly status
```

### Scaling

Edit `fly.toml`:
```toml
[scaling]
min_count = 1
max_count = 5
```

Then deploy:
```bash
fly deploy
```

## Troubleshooting

### "Connection refused"

Ensure Fly.io app is running:
```bash
fly status
```

### "Unauthorized"

Check that API key is set:
```bash
fly secrets list
```

Should show `VREKO_API_KEY`.

### "MCP server timeout"

Default timeout is 30 seconds. Check workspace size and API key validity.

### Logs show errors

View detailed logs:
```bash
fly logs --follow
```

## Integration with VS Code Extension

### Quick Setup (2 steps)

1. **Get your API key** from deployment output (look for `YOUR_VREKO_API_KEY`)
2. **Configure VS Code settings**:

```json
{
  "vreko.mcp.enabled": true,
  "vreko.mcp.serverUrl": "https://vreko-mcp.fly.dev",
  "vreko.mcp.authType": "apikey"
}
```

3. **Store your API key securely** using VS Code command palette:
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Run: `Vreko: Set MCP Auth Token (Secure)`
   - Paste your API key: `YOUR_VREKO_API_KEY`

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `vreko.mcp.enabled` | `true` | Enable MCP integration |
| `vreko.mcp.serverUrl` | `https://mcp.vreko.dev` | Remote MCP server URL |
| `vreko.mcp.authType` | `bearer` | Authentication type (`bearer` or `apikey`) |
| `vreko.mcp.timeout` | `5000` | Request timeout in milliseconds |

### Programmatic Usage

The VS Code extension automatically uses `RemoteMCPClient` when `serverUrl` is configured:

```typescript
const client = new RemoteMCPClient({
  serverUrl: 'https://vreko-mcp.fly.dev',
  apiKey: 'YOUR_VREKO_API_KEY',
  authType: 'apikey',
  timeout: 5000,
  maxRetries: 3,
});

await client.connect();
```

See [`apps/vscode/src/services/RemoteMCPClient.ts`](../vscode/src/services/RemoteMCPClient.ts) for implementation details.

### Health Check

Verify the server is accessible:

```bash
curl https://vreko-mcp.fly.dev/health
```

Expected response:
```json
{"status":"healthy","uptime":123.45,"timestamp":"2025-12-31T...","version":"1.0.0"}
```

## Cost

Fly.io free tier includes:
- 3 shared-cpu-1x VMs (256MB each)
- 160GB bandwidth/month

This MCP server easily fits within free tier for individual/small team use.

## Status

| Metric | Value |
|--------|-------|
| **Version** | 3.1.0 |
| **License** | Apache-2.0 |
| **Status** | Production Ready |
| **Node.js** | >= 20.0.0 |

## References

- [Fly.io Docs](https://fly.io/docs/)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Vreko Documentation](https://docs.vreko.dev/mcp)
- [VS Code Extension](https://github.com/vreko-dev/vscode)

---

<p align="center">
  <sub>Built with 💚 by <a href="https://vreko.dev">Marcelle Labs</a></sub>
</p>

<p align="center">
  <a href="https://vreko.dev">Website</a> •
  <a href="https://docs.vreko.dev">Docs</a> •
  <a href="https://discord.gg/B4BXeYkE2F">Discord</a> •
  <a href="https://github.com/vreko-dev/mcp-server/issues">Issues</a>
</p>
