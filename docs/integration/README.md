# MCP Server Integration Documentation

> **Architecture Change (Dec 2024):** MCP server is now CLI-bundled.
> See [`docs/mcp/CLI-FIRST-SETUP.md`](../mcp/CLI-FIRST-SETUP.md) for the current setup guide.

Complete documentation of the SnapBack MCP (Model Context Protocol) server integration points for Claude Code and Cursor.

## Quick Start

```bash
# New CLI-first approach
snap mcp --stdio

# Or the full alias
snapback mcp --stdio
```

See [CLI-FIRST-SETUP.md](../mcp/CLI-FIRST-SETUP.md) for complete configuration.

## Documentation Files

### 1. **CLI-First Setup Guide** (`../mcp/CLI-FIRST-SETUP.md`) - NEW
**The primary setup guide covering:**
- Installation and configuration
- Host integration (Claude Desktop, Cursor, Cline)
- Available tools (11 facade tools)
- Environment variables
- Testing and troubleshooting

### 2. **MCP Server Integration** (`mcp-server-integration.md`) - LEGACY
**Detailed technical reference covering:**
- Complete MCP server initialization flow
- API key authentication and authorization system
- Tool handler implementation
- SnapBackAPIClient implementation
- API key passing mechanism
- Tool input/output formats
- Performance budgets and error handling

**Note:** File paths reference the archived `apps/_archive/mcp-server`.

### 2. **Quick Reference** (`MCP_QUICK_REFERENCE.md`)
**Fast lookup guide for:**
- Critical code section line numbers
- Tool registration and routing
- Authentication tier mapping
- API key formats and permissions
- Performance budgets and environment variables
- Tool access control matrix
- Common troubleshooting issues

**Best for:** Quick lookups during development or troubleshooting.

**Most useful for:**
- Finding specific code locations quickly
- Understanding tier-based access control
- Troubleshooting API key issues
- Checking performance budgets

### 3. **Architecture Diagrams** (`MCP_ARCHITECTURE_DIAGRAMS.md`)
**Visual representations of:**
- Complete request-response flow
- Authentication and authorization flow
- Tool data flow through the system
- System architecture overview
- Tool access control matrix
- Performance tracking
- HTTP server alternative

**Best for:** Understanding how components interact and data flows through the system.

**Diagrams provided:**
1. Complete end-to-end request flow
2. Authentication decision tree
3. analyze_risk data transformation
4. System architecture with all dependencies
5. Tool access matrix by tier
6. Performance tracking pipeline
7. HTTP server architecture (optional)

---

## Quick Start: How to Use These Docs

### I need to understand how the API key is passed
1. Start with **Quick Reference** - see "API Key Passing Flow" diagram
2. Read **MCP Server Integration** - Section 6 "API Key Passing Flow"
3. Check code: `index.ts:393` (extraction) → `auth.ts:67` (authentication) → `snapback-api.ts:107` (usage)

### I need to find the analyze_risk tool handler
1. **Quick Reference** - Section 4 lists the exact lines (412-521)
2. **Architecture Diagrams** - Diagram 3 shows the data transformation
3. **MCP Server Integration** - Section 4 has the complete implementation

### I need to debug authentication issues
1. **Quick Reference** - "Common Issues" section has troubleshooting
2. **Architecture Diagrams** - Diagram 2 shows the authentication decision tree
3. **MCP Server Integration** - Section 2 has detailed auth flow explanation

### I need to understand tier-based permissions
1. **Quick Reference** - "Tool Tier Access" table
2. **Architecture Diagrams** - "Tool Access Control Matrix" diagram
3. **MCP Server Integration** - Section 2 "Tier-Based Permissions" code

### I need to check tool input/output formats
1. **Quick Reference** - "AnalysisRequest & Response Types" section
2. **Architecture Diagrams** - Diagram 3 shows data flow
3. **MCP Server Integration** - Section 7 "Input/Output Format Specification"

---

## File Locations in Codebase

### Current Architecture (CLI-First)
```
packages/mcp/src/
├── index.ts                      # Package exports
├── server.ts                     # createServer(), runStdioMcpServer()
├── tools/
│   ├── index.ts                  # Tool definitions
│   └── facades/                  # Facade handlers
├── transport/
│   ├── stdio.ts                  # Stdio transport
│   └── sse.ts                    # SSE transport (optional)
├── middleware/
│   ├── auth.ts                   # Authentication
│   ├── workspace.ts              # Workspace validation
│   └── errors.ts                 # Error handling
└── client/
    └── api-client.ts             # SnapBackAPIClient

apps/cli/src/commands/
└── mcp.ts                        # CLI command entry point
```

### Key Entry Points
- **CLI command**: `apps/cli/src/commands/mcp.ts`
- **Server factory**: `packages/mcp/src/server.ts` - `createServer()`
- **Tool handlers**: `packages/mcp/src/facades/handlers.ts`
- **Workspace validation**: `packages/mcp/src/middleware/workspace.ts`

---

## Data Flow Summary

```
Claude Code / Cursor
    ↓
MCP Tool Call (stdio)
    ↓
startServer() 
    ↓
authenticate(apiKey) → Check cache → Parse key format → Return tier
    ↓
hasToolAccess(authResult, toolName) → Check permissions
    ↓
Route to handler (analyze_risk, etc.)
    ↓
For analyze_risk:
  ├─ Create SnapBackAPIClient with user's apiKey
  ├─ POST /api/analyze/fast with Bearer token
  ├─ Receive AnalysisResponse
  ├─ Create SARIF log
  ├─ Evaluate policy
  └─ Return [riskJSON, sarifJSON, policyText]
    ↓
Claude Code / Cursor (displays results)
```

---

## Authentication & Authorization

### API Key Formats
```
FREE tier:      No key or invalid format → tier: "free", valid: false
PRO tier:       sb_live_* → tier: "pro", valid: true
ADMIN tier:     sb_live_admin_* → tier: "admin", valid: true
```

### Tier-Based Tool Access
| Tool | Free | Pro | Admin |
|------|------|-----|-------|
| analyze_risk | ✓ | ✓ | ✓ |
| check_dependencies | ✓ | ✓ | ✓ |
| create_checkpoint | - | ✓ | ✓ |
| list_checkpoints | - | ✓ | ✓ |
| restore_checkpoint | - | ✓ | ✓ |
| ctx7.* tools | ✓ | ✓ | ✓ |

### Caching
- **Duration**: 1 minute
- **Storage**: In-memory Map (`authCache`)
- **Key**: API key string
- **Cleanup**: Automatic when cache > 1000 entries

---

## Performance Budgets

All operations logged to stderr. Warnings issued if exceeded.

| Operation | Budget | Code Location |
|-----------|--------|---------------|
| analyze_risk | 200ms | index.ts:43 |
| create_checkpoint | 500ms | index.ts:44 |
| (default) | 1000ms | index.ts:47 |

Monitor stderr for `[PERF]` log lines to catch slowdowns.

---

## Environment Variables

### Required
```bash
SNAPBACK_API_KEY        # User's API key (sb_live_... format)
SNAPBACK_API_URL        # Backend URL (default: https://api.snapback.dev)
```

### Optional
```bash
NODE_ENV                # "development" or "production" (affects error verbosity)
SNAPBACK_IPC_SOCKET     # Unix socket path for Extension IPC
SNAPBACK_EVENT_BUS_PORT # Event bus port (auto-detected if not set)
```

---

## Common Troubleshooting

### API key not passed to backend?
- Check: Extension sets `SNAPBACK_API_KEY` in subprocess environment
- Verify: `index.ts:393` extracts from `process.env`
- Confirm: Key format starts with `sb_live_` or `sb_live_admin_`

### Bearer token authentication failing?
- Check: `snapback-api.ts:108` adds `Authorization: Bearer {apiKey}` header
- Verify: Backend accepts Bearer token format
- Confirm: API key is valid (not truncated or malformed)

### Tool access denied?
- Check: Tier permissions in `auth.ts:29-48`
- Verify: Tool name mapping in `auth.ts:146-153`
- Confirm: `hasToolAccess()` is called before routing (index.ts:399)

### Analysis timing out?
- Check: Budget is 200ms (index.ts:43)
- Verify: Backend `/api/analyze/fast` is responding
- Fallback: `index.ts:485-520` provides basic risk analysis if API fails

### SARIF validation errors?
- Check: `utils/sarif.ts` generates valid SARIF v2.1.0
- Verify: `policy-engine` imports correctly (index.ts:12)
- Confirm: `evaluate(sarifLog)` returns `{action, reason, confidence}`

---

## Testing the Integration

### Unit Testing
```bash
# Run MCP package tests
pnpm -F @snapback/mcp test
```

### Integration Testing
```bash
# Test MCP handshake via CLI
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
  snap mcp --stdio

# Test tool listing
echo -e '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | \
  snap mcp --stdio
```

### Manual Testing with Claude Desktop / Cursor
1. Configure host per [CLI-FIRST-SETUP.md](../mcp/CLI-FIRST-SETUP.md)
2. Restart the host application
3. Look for the MCP connection indicator
4. Test with: "Use snapback.prepare_workspace to check the workspace"

---

## Related Documentation

- **VS Code Extension**: `apps/vscode/CLAUDE.md`
- **Core Detection Engine**: `packages/core/CLAUDE.md`
- **Event Bus**: `packages/events/CLAUDE.md`
- **Backend API**: Backend documentation (external)

---

## Summary

This documentation provides three complementary views of the MCP server integration:

1. **Complete Technical Reference** for understanding every detail
2. **Quick Reference** for fast lookups and troubleshooting
3. **Architecture Diagrams** for visualizing data flow and system structure

Use them together to understand, develop, and troubleshoot the MCP server integration effectively.

**Last updated**: December 2024
**Covers**: SnapBack MCP (CLI-bundled)
**Scope**: packages/mcp/* + apps/cli/src/commands/mcp.ts
