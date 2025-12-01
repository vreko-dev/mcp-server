# MCP Server Integration - Quick Reference

**Location**: `apps/mcp-server/src/index.ts`
**Transport**: Stdio (JSON-RPC 2.0)
**Alternative**: HTTP/SSE via `MCPHttpServer`

---

## Critical Code Sections

### 1. Server Initialization (`index.ts` lines 85-148)
**Where**: `startServer()` function
**Does**: Initializes storage, event bus, IPC, and MCP server
**Returns**: `{ server: Server, transport: StdioServerTransport }`

### 2. Tool Registration (`index.ts` lines 151-384)
**Handler**: `ListToolsRequestSchema`
**Returns**: Array of 8 tools with definitions and schemas

### 3. Tool Call Handler (`index.ts` lines 387-758)
**Handler**: `CallToolRequestSchema`
**Flow**: 
1. Extract API key from `process.env.SNAPBACK_API_KEY`
2. Call `authenticate(apiKey)` from `auth.ts`
3. Check `hasToolAccess(authResult, toolName)`
4. Route to specific tool handler

### 4. analyze_risk Handler (`index.ts` lines 412-521)
**Input**: `{ changes: Array<{ added, removed, value }> }`
**Processing**:
- Parse input with Zod
- Create `SnapBackAPIClient` with user's API key
- POST to `${SNAPBACK_API_URL}/api/analyze/fast`
- Include Bearer token: `Authorization: Bearer ${apiKey}`
- Create SARIF log from results
- Evaluate against policy using `evaluate(sarifLog)`

**Output**: Array of 3 items:
1. Risk analysis JSON: `{ riskLevel, score, factors, issues }`
2. SARIF log (v2.1.0)
3. Policy decision text

### 5. Authentication (`auth.ts` lines 67-247)
**Function**: `authenticate(apiKey: string) => AuthResult`
**Caching**: 1-minute TTL, in-memory Map
**Key Formats**:
- `sb_live_admin_*` → tier: "admin"
- `sb_live_*` → tier: "pro"
- Invalid → tier: "free" (invalid: true = false)

**Tier Permissions**:
```
Free:  [analyze_risk, context_search]
Pro:   [analyze_risk, create_checkpoint, list_checkpoints, 
        restore_checkpoint, context_search]
Admin: [all permissions]
```

### 6. API Client (`client/snapback-api.ts` lines 95-176)
**Class**: `SnapBackAPIClient`
**Constructor**: Takes `{ baseUrl, apiKey }`
**Method**: `analyzeFast(request)` → POST `/api/analyze/fast`

**Request Envelope**:
```typescript
{
  code: string;              // Combined code from changes
  filePath: string;          // "mcp-analysis.ts"
  context?: {
    projectType?: string;    // "mcp-analysis"
    language?: string;       // "typescript"
  };
}
```

**Response Type**:
```typescript
{
  riskLevel: string;         // "safe" | "low" | "medium" | "high" | "critical"
  score: number;             // 0-1
  factors: string[];         // Risk factor descriptions
  analysisTimeMs: number;    // Execution time
  issues: Array<{
    severity: string;        // Issue severity
    message: string;
    line?: number;
    column?: number;
  }>;
}
```

---

## Data Flow Diagram

```
Claude Code / Cursor
    ↓ (MCP stdio)
startServer() initializes:
  - Storage (SQLite)
  - Event Bus (pub/sub)
  - Extension IPC (unix socket)
  - Context7 Service
    ↓
Tool Call Handler
  ↓
1. Extract: process.env.SNAPBACK_API_KEY
2. Authenticate: authenticate(apiKey) → AuthResult
3. Authorize: hasToolAccess(authResult, name)
4. Route: if (name === "snapback.analyze_risk")
    ↓
analyze_risk Handler
  ↓
5. Parse: Zod validation
6. Create: SnapBackAPIClient with user's apiKey
7. Call: apiClient.analyzeFast({code, filePath, context})
    ↓ (HTTP POST with Bearer token)
SnapBack Backend API
  ↓ (validates API key, runs Guardian)
8. Receive: AnalysisResponse
9. Create SARIF log
10. Evaluate policy
11. Return: [riskJSON, sarifJSON, policyText]
    ↓ (MCP stdio)
Claude Code / Cursor (displays results)
```

---

## Environment Variables

```bash
# Required for stdio transport
export SNAPBACK_API_KEY="sb_live_xxxxx"      # User's API key
export SNAPBACK_API_URL="https://api.snapback.dev"

# Optional
export NODE_ENV="development"                # Affects error verbosity
export SNAPBACK_IPC_SOCKET="/tmp/snapback.sock"
export SNAPBACK_EVENT_BUS_PORT="6379"       # Auto-detected if not set
```

---

## Performance Budgets

| Operation | Budget | Location |
|-----------|--------|----------|
| analyze_risk | 200ms | index.ts:43 |
| create_checkpoint | 500ms | index.ts:44 |
| (exceeded? logged as warning) | - | index.ts:48-49 |

---

## Tool Tier Access

| Tool | Free | Pro | Admin |
|------|------|-----|-------|
| analyze_risk | ✓ | ✓ | ✓ |
| check_dependencies | ✓ | ✓ | ✓ |
| create_checkpoint | - | ✓ | ✓ |
| list_checkpoints | - | ✓ | ✓ |
| restore_checkpoint | - | ✓ | ✓ |
| ctx7.* | ✓ | ✓ | ✓ |

---

## Error Handling

**sanitizeError()** (lines 55-82)
- Development: Full error message + stack
- Production: Generic message + log ID
- All errors logged to stderr with unique ID format: `ERR-{timestamp}-{random}`

---

## HTTP Server Alternative

**Class**: `MCPHttpServer` (`http-server.ts`)

**Endpoints**:
- `GET /mcp` → SSE connection (requires Bearer token or X-API-Key)
- `POST /mcp?sessionId={id}` → Send MCP message
- `GET /health` → Health check with API dependency
- `GET /version` → Server version

**Features**:
- Rate limiting: 100 req/min per IP
- Security headers: CSP, X-Frame-Options, HSTS
- CORS preflight handling

---

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `index.ts` | Main server + tool handlers | 85-766 |
| `auth.ts` | Authentication & authorization | 67-247 |
| `client/snapback-api.ts` | API client for backend | 95-176 |
| `http-server.ts` | HTTP/SSE wrapper | 57-372 |
| `utils/sarif.ts` | SARIF log creation | - |
| `tools/create-snapshot.ts` | Snapshot tool handler | - |

---

## Testing the Integration

```bash
# Start the MCP server
export SNAPBACK_API_KEY="sb_live_test_key"
export SNAPBACK_API_URL="https://api.snapback.dev"
node dist/index.js

# In another terminal, test with a sample tool call
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  SNAPBACK_API_KEY="sb_live_test_key" node dist/index.js
```

---

## Common Issues

**API Key not passed?**
- Check: `process.env.SNAPBACK_API_KEY` in extension environment
- Verify: Extension sets env var before spawning MCP server process

**Bearer token rejected?**
- Confirm: API key starts with valid prefix (sb_live_* or sb_live_admin_*)
- Check: SnapBackAPIClient passes `Authorization: Bearer ${apiKey}` header (line 108)

**Analysis timing out?**
- Budget: 200ms for analyze_risk
- If exceeded: Warning logged to stderr (line 49)
- Fallback: Basic risk returned if API fails (lines 485-520)

**Policy evaluation failing?**
- Confirm: `@snapback/policy-engine` imported (line 12)
- Check: `evaluate(sarifLog)` returns `{ action, reason, confidence }` (line 472)
