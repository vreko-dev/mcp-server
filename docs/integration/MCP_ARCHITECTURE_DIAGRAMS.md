# MCP Server Integration - Architecture Diagrams

## 1. Complete Request-Response Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    Claude Code / Cursor IDE                        │
│                  (MCP Client Consumer)                             │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              │ MCP Stdio Protocol (JSON-RPC 2.0)
                              │ Environment: SNAPBACK_API_KEY=sb_live_...
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│                     SnapBack MCP Server                            │
│                   (apps/mcp-server/src/)                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. startServer() [index.ts:85]                                   │
│     ├─ Initialize Storage (SQLite)                               │
│     ├─ Initialize Event Bus (TCP pub/sub)                        │
│     ├─ Initialize Extension IPC (Unix socket)                    │
│     ├─ Initialize Context7 Service                              │
│     └─ Create & register MCP Server                             │
│                                                                    │
│  2. Tool Registration [index.ts:151]                             │
│     ├─ snapback.analyze_risk (Free tier)                        │
│     ├─ snapback.check_dependencies (Free)                       │
│     ├─ snapback.create_checkpoint (Pro)                         │
│     ├─ snapback.list_checkpoints (Pro)                          │
│     ├─ snapback.restore_checkpoint (Pro)                        │
│     └─ ctx7.*, catalog.* tools                                  │
│                                                                    │
│  3. Tool Call Handler [index.ts:387]                             │
│     │                                                             │
│     ├─ Extract API Key                                          │
│     │  └─ process.env.SNAPBACK_API_KEY                         │
│     │                                                             │
│     ├─ Authenticate [auth.ts:67]                                │
│     │  ├─ Check 1-min cache                                    │
│     │  ├─ Parse API key format                                 │
│     │  │  ├─ sb_live_admin_* → admin tier                     │
│     │  │  ├─ sb_live_* → pro tier                             │
│     │  │  └─ invalid → free tier                              │
│     │  └─ Add permissions based on tier                        │
│     │                                                             │
│     ├─ Authorize [auth.ts:140]                                  │
│     │  ├─ hasToolAccess(authResult, toolName)                 │
│     │  └─ Return 403 if denied                                │
│     │                                                             │
│     └─ Route to Handler                                         │
│        ├─ snapback.analyze_risk [index.ts:412]                │
│        ├─ snapback.check_dependencies [index.ts:523]          │
│        └─ snapback.create_checkpoint [index.ts:534]           │
│                                                                    │
│  4. analyze_risk Handler [index.ts:412]                          │
│     │                                                             │
│     ├─ Validate Input (Zod)                                     │
│     │  └─ changes: Array<{added, removed, value}>             │
│     │                                                             │
│     ├─ Create API Client [client/snapback-api.ts:95]          │
│     │  └─ new SnapBackAPIClient({                             │
│     │      baseUrl: process.env.SNAPBACK_API_URL,            │
│     │      apiKey: user's authenticated key                  │
│     │    })                                                    │
│     │                                                             │
│     ├─ Prepare Request                                         │
│     │  └─ {code, filePath, context}                          │
│     │                                                             │
│     └─ Call Backend [client/snapback-api.ts:125]             │
│        └─ apiClient.analyzeFast(request)                     │
│                                                                    │
└────────────────────────────┬──────────────────────────────────────┘
                              │
                              │ HTTP POST with Bearer Token
                              │ Authorization: Bearer {apiKey}
                              │ POST /api/analyze/fast
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│              SnapBack Backend API                                  │
│          (External Service at api.snapback.dev)                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Validate API Key                                            │
│     └─ Check tier permissions                                  │
│                                                                    │
│  2. Run Guardian Analysis                                       │
│     ├─ SecretDetectionPlugin (regex + entropy)                │
│     ├─ MockReplacementPlugin (test artifacts)                │
│     └─ PhantomDependencyPlugin (missing imports)             │
│                                                                    │
│  3. Return AnalysisResponse                                     │
│     ├─ riskLevel: "safe" | "low" | "medium" | "high" | ...   │
│     ├─ score: 0-1                                             │
│     ├─ factors: string[]                                      │
│     └─ issues: Array<{severity, message, line, column}>      │
│                                                                    │
└────────────────────────────┬──────────────────────────────────────┘
                              │
                              │ JSON Response
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│              MCP Server (continued)                               │
│          Process Response [index.ts:456]                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Receive AnalysisResponse                                     │
│     └─ Validate with Zod                                       │
│                                                                    │
│  2. Create SARIF Log [utils/sarif.ts]                          │
│     ├─ Generate SARIF v2.1.0 log                              │
│     ├─ Add results for each risk factor                       │
│     └─ Return SarifLog object                                 │
│                                                                    │
│  3. Evaluate Policy [policy-engine:12]                         │
│     ├─ evaluate(sarifLog)                                     │
│     └─ Return {action, reason, confidence}                   │
│                                                                    │
│  4. Format Response [index.ts:474]                             │
│     └─ Return [                                               │
│          { type: "json", json: risk },                       │
│          { type: "json", json: sarifLog },                   │
│          { type: "text", text: policy text }                │
│        ]                                                      │
│                                                                    │
│  5. Handle Errors [index.ts:484]                               │
│     └─ If API fails:                                          │
│        ├─ Log error to stderr                                │
│        ├─ Create basicRisk fallback                          │
│        └─ Return fallback response                           │
│                                                                    │
└────────────────────────────┬──────────────────────────────────────┘
                              │
                              │ MCP Stdio Protocol
                              │ Response Content
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│            Claude Code / Cursor Display                           │
│         (Shows risk analysis to user)                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Authorization Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    MCP Tool Call                             │
│              {name, arguments}                               │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ├─ Extract apiKey from environment
                  │  └─ process.env.SNAPBACK_API_KEY
                  │
                  ▼
        ┌─────────────────────────┐
        │ authenticate(apiKey)    │ [auth.ts:67]
        │ {                       │
        │   Check 1-min cache     │
        │ }                       │
        └────────┬────────────────┘
                 │
        ┌────────▼────────┐
        │ Cache hit?      │
        └───┬─────────┬───┘
            │(yes)    │(no)
            │         ▼
            │    performAuth(apiKey)
            │    ├─ Check key format
            │    ├─ sb_live_admin_* → Admin
            │    ├─ sb_live_* → Pro
            │    └─ invalid → Free
            │         │
            │         ▼
            │    Cache result (1 min)
            │         │
        ┌───┴─────────┘
        │
        ▼
    ┌────────────────────────────┐
    │ Add permissions based on   │ [auth.ts:85-86]
    │ tier via ROLE_PERMISSIONS  │
    │ {                          │
    │   Free:  [analyze_risk,    │
    │           context_search]  │
    │                            │
    │   Pro:   [analyze_risk,    │
    │           create_checkpoint│
    │           ...]             │
    │                            │
    │   Admin: [all]             │
    │ }                          │
    └──────────┬─────────────────┘
               │
               ▼
    ┌────────────────────────────┐
    │ Return AuthResult          │
    │ {                          │
    │   valid: boolean,          │
    │   tier: string,            │
    │   permissions: string[],   │
    │   scopes: string[],        │
    │   userId?: string,         │
    │   organizationId?: string  │
    │ }                          │
    └──────────┬─────────────────┘
               │
               ▼
    ┌────────────────────────────┐
    │ hasToolAccess(authResult,  │ [auth.ts:140]
    │ toolName)                  │
    │ {                          │
    │   Check authResult.valid   │
    │   Map tool → permission    │
    │   Check permission         │
    │ }                          │
    └────────┬───────────────────┘
             │
        ┌────▼────┐
        │ Access   │
        │ granted? │
        └───┬──┬───┘
       (yes)│ │(no)
            ▼ ▼
         ✓   ✗
         │   │
         │   └─→ Return 403
         │       Access denied
         │
         └─→ Route to tool
            handler
```

---

## 3. analyze_risk Tool Data Flow

```
INPUT
└─ changes: Array<{
    added: boolean;
    removed: boolean;
    value: string;
    count?: number;
  }>

│
▼

VALIDATION (Zod)
└─ Parse & validate structure
  └─ Error → Return validation error

│
▼

PREPARE REQUEST
├─ Combine all change.value into code string
├─ Set filePath: "mcp-analysis.ts"
└─ Set context: {
    projectType: "mcp-analysis",
    language: "typescript"
  }

│
▼

CREATE API CLIENT
└─ new SnapBackAPIClient({
    baseUrl: process.env.SNAPBACK_API_URL,
    apiKey: user's authenticated apiKey
  })

│
▼

HTTP CALL
└─ POST /api/analyze/fast
  ├─ Authorization: Bearer {apiKey}
  ├─ Content-Type: application/json
  └─ Body: {code, filePath, context}

│
▼

RESPONSE HANDLING
├─ On success:
│  ├─ Receive AnalysisResponse
│  ├─ Create SARIF log from factors
│  ├─ Evaluate policy
│  └─ Return [riskJSON, sarifJSON, policyText]
│
└─ On failure:
   ├─ Log error to stderr
   ├─ Create basicRisk fallback
   └─ Return [fallbackRisk, fallbackSarif, fallbackText]

│
▼

OUTPUT (MCP Content Array)
├─ [0] { type: "json", json: {
│       riskLevel: "critical" | "high" | "medium" | "low" | "safe",
│       score: 0.95,
│       factors: ["Hardcoded API key"],
│       analysisTimeMs: 145,
│       issues: [{severity, message, line?, column?}]
│     }}
│
├─ [1] { type: "json", json: {
│       SARIF v2.1.0 log object
│       with results for each factor
│     }}
│
└─ [2] { type: "text", text:
        "Policy Decision: BLOCK\nReason: Critical risk factors detected\nConfidence: 0.95"
       }
```

---

## 4. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Workspace                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  .snapback/
│  └─ snapback.db (SQLite storage)
│                                                               │
│  .env (or extension config)
│  └─ SNAPBACK_API_KEY = "sb_live_xxxxx"
│  └─ SNAPBACK_API_URL = "https://api.snapback.dev"
│                                                               │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │ IPC (Unix socket)
                         │
┌────────────────────────┴──────────────────────────────────┐
│        VS Code Extension                                  │
│     (apps/vscode + extension host)                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  - Spawns MCP server subprocess                         │
│  - Passes env vars (including SNAPBACK_API_KEY)        │
│  - Sends/receives MCP tool calls via stdio             │
│                                                           │
└────────────────────────────────────────────────────────┘
                         ▲
                         │ Process stdin/stdout
                         │ JSON-RPC 2.0 Protocol
                         │
┌────────────────────────┴──────────────────────────────────┐
│        SnapBack MCP Server                               │
│     (apps/mcp-server/src/index.ts)                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  StdioServerTransport                                   │
│  └─ Listens on stdin, writes to stdout                 │
│                                                           │
│  Server {capabilities: {tools: {}}}                    │
│  ├─ ListToolsRequestHandler                           │
│  │  └─ Returns 8 tools with schemas                   │
│  │                                                      │
│  └─ CallToolRequestHandler                            │
│     ├─ Extract & authenticate apiKey                 │
│     ├─ Check tool access                             │
│     └─ Route to handler                              │
│                                                           │
│  Dependencies                                           │
│  ├─ Storage (SQLite via StorageBrokerAdapter)        │
│  ├─ EventBus (TCP pub/sub client)                   │
│  ├─ ExtensionIPCClient (Unix socket)               │
│  └─ Context7Service (docs lookup)                  │
│                                                           │
└────────────────────────────────────────────────────────┘
                         ▲
                         │ HTTP (Bearer token)
                         │ POST /api/analyze/fast
                         │
┌────────────────────────┴──────────────────────────────────┐
│        SnapBack Backend API                              │
│     (https://api.snapback.dev)                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Guardian (Detection Engine)                            │
│  ├─ SecretDetectionPlugin                             │
│  ├─ MockReplacementPlugin                             │
│  └─ PhantomDependencyPlugin                           │
│                                                           │
│  Returns AnalysisResponse                              │
│  └─ Risk score, factors, issues                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Tool Access Control Matrix

```
                     FREE TIER    PRO TIER    ADMIN TIER
                     ──────────   ────────    ──────────
Permissions:
- analyze_risk         ✓            ✓            ✓
- context_search       ✓            ✓            ✓
- create_checkpoint    ✗            ✓            ✓
- list_checkpoints     ✗            ✓            ✓
- restore_checkpoint   ✗            ✓            ✓

Tool Access:
- snapback.analyze_risk           ✓      ✓      ✓
- snapback.check_dependencies     ✓      ✓      ✓
- snapback.create_checkpoint      ✗      ✓      ✓
- snapback.list_checkpoints       ✗      ✓      ✓
- snapback.restore_checkpoint     ✗      ✓      ✓
- catalog.list_tools              ✓      ✓      ✓
- ctx7.resolve-library-id         ✓      ✓      ✓
- ctx7.get-library-docs           ✓      ✓      ✓

API Key Prefix:
- Free tier:     none (invalid/missing key)
- Pro tier:      sb_live_*
- Admin tier:    sb_live_admin_*
```

---

## 6. Performance Tracking

```
trackPerformance(operation, fn)
│
├─ Record start time
│
├─ Execute fn()
│
├─ Record end time
├─ Calculate duration = end - start
│
├─ Log: "[PERF] {operation}: {duration}ms"
│
├─ Check budget
│  ├─ analyze_risk: 200ms budget
│  ├─ create_checkpoint: 500ms budget
│  └─ (default): 1000ms budget
│
└─ If exceeded:
   └─ Warn: "[PERF] ⚠️  {operation} exceeded budget: {actual}ms > {budget}ms"
      (Logged to stderr, non-blocking)
```

---

## 7. HTTP Server Alternative (Optional)

```
┌─────────────────────────────────────────────────┐
│  Client (HTTPS)                                 │
└────────┬────────────────────────────────────────┘
         │
         │ TLS Handshake
         │
┌────────▼──────────────────────────────────────┐
│  MCPHttpServer                                │
│  (node:http.Server)                           │
├────────────────────────────────────────────────┤
│                                                │
│  Handler: handleRequest(req, res)            │
│  ├─ applySecurityHeaders(res)               │
│  │  ├─ X-Content-Type-Options: nosniff      │
│  │  ├─ X-Frame-Options: DENY                │
│  │  ├─ Strict-Transport-Security            │
│  │  └─ Content-Security-Policy              │
│  │                                           │
│  ├─ checkRateLimit(req, res)                │
│  │  ├─ RateLimiter(60s, 100 req/min)       │
│  │  └─ Return 429 if exceeded              │
│  │                                           │
│  ├─ Route to handler:                       │
│  │  ├─ GET /mcp                            │
│  │  │  └─ handleSSEConnection()            │
│  │  │     └─ SSEServerTransport            │
│  │  │                                       │
│  │  ├─ POST /mcp                           │
│  │  │  └─ handlePostMessage()              │
│  │  │                                       │
│  │  ├─ GET /health                         │
│  │  │  └─ handleHealthCheck()              │
│  │  │     ├─ Check this service            │
│  │  │     └─ Check API dependency          │
│  │  │                                       │
│  │  └─ GET /version                        │
│  │     └─ Return {version, name}           │
│  │                                           │
│  └─ authenticateRequest(req)                │
│     ├─ Check: Authorization: Bearer X      │
│     └─ Check: X-API-Key: X                 │
│                                            │
│  Transports: Map<sessionId, SSETransport>  │
│                                            │
└────────────────────────────────────────────┘
         │
         │ Connection established
         │
         ▼
    Server responds with
    - CORS headers (if allowed)
    - Content-Type
    - Security headers
```

