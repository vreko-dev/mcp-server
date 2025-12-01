# MCP Server Integration Documentation

Complete documentation of the SnapBack MCP (Model Context Protocol) server integration points for Claude Code and Cursor.

## Documentation Files

### 1. **MCP Server Integration** (`mcp-server-integration.md`)
**Detailed technical reference covering:**
- Complete MCP server initialization flow
- API key authentication and authorization system
- Tool handler implementation for `analyze_risk`
- SnapBackAPIClient implementation
- API key passing mechanism
- Tool input/output formats
- Performance budgets and error handling
- HTTP server wrapper (optional)

**Best for:** Understanding the complete integration architecture and debugging specific integration points.

**Key sections:**
- Section 1: Server initialization (index.ts lines 85-766)
- Section 2: Authentication flow (auth.ts lines 67-247)
- Section 4: analyze_risk handler (index.ts lines 412-521)
- Section 5: API client (snapback-api.ts lines 95-176)

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

### Core MCP Server Files
```
apps/mcp-server/src/
├── index.ts                      # Main server (startServer, tool handlers)
├── auth.ts                       # Authentication (authenticate, hasToolAccess)
├── http-server.ts               # HTTP wrapper (MCPHttpServer)
├── client/
│   └── snapback-api.ts          # API client (SnapBackAPIClient)
├── tools/
│   ├── create-snapshot.ts       # Snapshot creation
│   ├── list-snapshots.ts        # Snapshot listing
│   └── restore-snapshot.ts      # Snapshot restoration
├── utils/
│   ├── sarif.ts                 # SARIF log generation
│   └── security.ts              # Path validation, telemetry
└── context7/
    └── index.ts                 # Library documentation service
```

### Key Entry Points
- **Server start**: `index.ts:85` - `startServer()`
- **Tool routing**: `index.ts:387` - `CallToolRequestSchema` handler
- **Authentication**: `auth.ts:67` - `authenticate(apiKey)`
- **API communication**: `client/snapback-api.ts:125` - `analyzeFast()`

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
# Run MCP server tests
pnpm -F @snapback/mcp-server test

# Test specific auth logic
pnpm -F @snapback/mcp-server test auth.test.ts
```

### Integration Testing
```bash
# Start server and test tool calls
export SNAPBACK_API_KEY="sb_live_test_key"
node dist/index.js

# In another terminal, test tool listing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  SNAPBACK_API_KEY="sb_live_test_key" nc localhost 5000
```

### Manual Testing with Claude Code
1. Set `SNAPBACK_API_KEY` in VS Code extension settings
2. Configure extension to use MCP server
3. Trigger a code analysis request
4. Check MCP server stderr logs for `[PERF]` and `[Error]` messages

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

**Last updated**: November 17, 2025
**Covers**: SnapBack MCP Server v0.1.1
**Scope**: apps/mcp-server/src/* implementation
