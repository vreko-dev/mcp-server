# SnapBack MCP Server - Integration Points Documentation

## Overview
The MCP (Model Context Protocol) server exposes SnapBack's risk analysis and snapshot capabilities to Claude Code and Cursor. It uses a **stdio-based transport** for communication and an optional **HTTP server wrapper** for remote connections.

---

## 1. MCP Server Initialization

### Entry Point: `apps/mcp-server/src/index.ts`

**Function**: `startServer()` (lines 85-766)

The server initializes in the following sequence:

```typescript
export async function startServer(): Promise<{
	server: Server;
	transport: StdioServerTransport;
}> {
	// 1. Initialize core dependencies
	const dep = new DependencyAnalyzer();
	const sdkModule = await import("@snapback/sdk");
	const StorageBrokerAdapter = sdkModule.StorageBrokerAdapter;
	const storage = new StorageBrokerAdapter(`${process.cwd()}/.snapback/snapback.db`);
	await storage.initialize();

	// 2. Initialize MCP clients and services
	const mcpManager = new MCPClientManager();
	const context7Service = new Context7Service(storage);

	// 3. Connect to event bus (pub/sub)
	const eventBus = new SnapBackEventBus();
	try {
		await eventBus.connect();
		console.error("[SnapBack MCP] Connected to event bus");
	} catch (err) {
		console.error("[SnapBack MCP] Failed to connect to event bus:", err);
	}

	// 4. Connect to Extension IPC
	const extensionClient = new ExtensionIPCClient();
	try {
		await extensionClient.connect();
		console.error("[SnapBack MCP] Connected to Extension IPC");
	} catch (err) {
		console.error("[SnapBack MCP] Failed to connect to Extension IPC:", err);
	}

	// 5. Set workspace root and security telemetry
	setWorkspaceRoot(process.cwd());
	initializeSecurityTelemetry("https://telemetry.snapback.dev");

	// 6. Create and configure MCP server
	const server = new Server(
		{ name: "snapback-mcp", version: "0.1.1" },
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// 7. Register tools listing handler
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			// Tool definitions here
		],
	}));

	// 8. Register tool call handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		// Tool implementation here
	});

	// 9. Connect to stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);

	return { server, transport };
}
```

**Initialization Components**:
- **Storage**: SQLite database (`StorageBrokerAdapter`) at `${process.cwd()}/.snapback/snapback.db`
- **Event Bus**: TCP-based pub/sub connection (client mode)
- **Extension IPC**: Unix domain socket connection for request/response
- **Context7 Service**: Library documentation lookup
- **Security**: Workspace root validation, telemetry initialization

---

## 2. API Key Authentication & Authorization

### Authentication Flow: `apps/mcp-server/src/auth.ts`

#### Authentication Entry Point

**Function**: `authenticate(apiKey: string)` (lines 67-101)

```typescript
export async function authenticate(apiKey: string): Promise<AuthResult> {
	const now = Date.now();

	// 1. Check 1-minute cache first
	const cached = authCache.get(apiKey);
	if (cached && now - cached.timestamp < CACHE_DURATION) {
		return cached.result;
	}

	// 2. Perform authentication
	const result = await performAuth(apiKey);

	// 3. Add permissions based on tier
	if (result.valid && result.tier) {
		result.permissions = ROLE_PERMISSIONS[result.tier] || [];
	}

	// 4. Cache result for 1 minute
	authCache.set(apiKey, {
		timestamp: now,
		result,
	});

	return result;
}
```

#### Authentication Result Type

```typescript
export interface AuthResult {
	valid: boolean;
	tier: "free" | "pro" | "admin";
	scopes?: string[];
	permissions?: string[];
	userId?: string;
	organizationId?: string;
	error?: string;
}
```

#### Tier-Based Permissions

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
	[ROLES.ADMIN]: [
		PERMISSIONS.ANALYZE_RISK,
		PERMISSIONS.CREATE_CHECKPOINT,
		PERMISSIONS.LIST_CHECKPOINTS,
		PERMISSIONS.RESTORE_CHECKPOINT,
		PERMISSIONS.CONTEXT_SEARCH,
	],
	[ROLES.PRO]: [
		PERMISSIONS.ANALYZE_RISK,
		PERMISSIONS.CREATE_CHECKPOINT,
		PERMISSIONS.LIST_CHECKPOINTS,
		PERMISSIONS.RESTORE_CHECKPOINT,
		PERMISSIONS.CONTEXT_SEARCH,
	],
	[ROLES.FREE]: [
		PERMISSIONS.ANALYZE_RISK,
		PERMISSIONS.CONTEXT_SEARCH,
	],
};
```

#### API Key Format Detection

**Function**: `performAuth(apiKey: string)` (lines 172-247)

```typescript
async function performAuth(apiKey: string): Promise<AuthResult> {
	// Admin tier: starts with "sb_live_admin_"
	if (apiKey.startsWith("sb_live_admin_")) {
		return {
			valid: true,
			tier: "admin",
			scopes: ["analyze", "checkpoint", "context", "admin"],
			userId: "admin-user",
			organizationId: "admin-org",
		};
	}

	// Pro tier: starts with "sb_live_"
	if (apiKey.startsWith("sb_live_")) {
		return {
			valid: true,
			tier: "pro",
			scopes: ["analyze", "checkpoint", "context"],
			userId: "pro-user",
			organizationId: "pro-org",
		};
	}

	// Free tier: no key or invalid format
	return {
		valid: false,
		tier: "free",
		error: "Invalid API key format",
	};
}
```

#### Tool Access Control

**Function**: `hasToolAccess(authResult: AuthResult, toolName: string)` (lines 140-162)

```typescript
export function hasToolAccess(authResult: AuthResult, toolName: string): boolean {
	if (!authResult.valid) {
		return false;
	}

	// Map tool names to required permissions
	const toolPermissions: Record<string, string> = {
		"snapback.analyze_risk": PERMISSIONS.ANALYZE_RISK,
		"snapback.create_checkpoint": PERMISSIONS.CREATE_CHECKPOINT,
		"snapback.list_checkpoints": PERMISSIONS.LIST_CHECKPOINTS,
		"snapback.restore_checkpoint": PERMISSIONS.RESTORE_CHECKPOINT,
		"ctx7.resolve-library-id": PERMISSIONS.CONTEXT_SEARCH,
		"ctx7.get-library-docs": PERMISSIONS.CONTEXT_SEARCH,
	};

	const requiredPermission = toolPermissions[toolName];
	if (!requiredPermission) {
		return true; // Allow access if no specific permission required
	}

	return hasPermission(authResult, requiredPermission);
}
```

---

## 3. Tool Handler Implementation

### Tool Call Handler: `apps/mcp-server/src/index.ts`

**Handler Setup** (lines 387-758)

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		// 1. Get API key from environment
		const apiKey = process.env.SNAPBACK_API_KEY || "";

		// 2. Authenticate user
		const authResult = await authenticate(apiKey);

		// 3. Check tool access
		if (!hasToolAccess(authResult, name)) {
			return {
				content: [
					{
						type: "text",
						text: `❌ Access denied. You don't have permission to use the ${name} tool.`,
					},
				],
				isError: true,
			};
		}

		// 4. Route to specific tool handler
		if (name === "snapback.analyze_risk") {
			// ... analyze_risk implementation
		}
		if (name === "snapback.check_dependencies") {
			// ... check_dependencies implementation
		}
		// ... other tools

	} catch (error: unknown) {
		const sanitized = sanitizeError(error, `tool_call_${name}`);
		return {
			content: [
				{
					type: "text",
					text: `${sanitized.message} (Log ID: ${sanitized.logId})`,
				},
			],
			isError: true,
		};
	}
});
```

---

## 4. analyze_risk Tool Handler

### Tool Definition (lines 152-208)

```typescript
{
	name: "snapback.analyze_risk",
	description: `**Purpose:** Analyze code changes for potential risks before applying them.

**When to Use:**
- BEFORE accepting AI-generated code suggestions
- When reviewing pull requests with complex changes
- For critical files (auth, security, database schemas)
- When user asks "is this safe to apply?"

**When NOT to Use:**
- For trivial changes (typo fixes, formatting)
- For non-code files (images)
- After changes are already applied

**Returns:**
- Risk level (safe, low, medium, high, critical)
- Specific issues detected with severity levels
- Actionable recommendations for mitigation

**Performance:** < 200ms average`,
	inputSchema: {
		type: "object",
		properties: {
			changes: {
				type: "array",
				description: "Array of diff changes (added/removed lines with content)",
				items: {
					type: "object",
					properties: {
						added: {
							type: "boolean",
							description: "True if this line was added",
						},
						removed: {
							type: "boolean",
							description: "True if this line was removed",
						},
						value: {
							type: "string",
							description: "The actual line content",
						},
						count: {
							type: "number",
							description: "Number of lines (optional)",
						},
					},
					required: ["value"],
				},
			},
		},
		required: ["changes"],
	},
	requiresBackend: false,
}
```

### Handler Implementation (lines 412-521)

```typescript
if (name === "snapback.analyze_risk") {
	// 1. Validate input
	const parsed = z
		.object({
			changes: z.array(
				z.object({
					added: z.boolean().optional().default(false),
					removed: z.boolean().optional().default(false),
					value: z.string(),
					count: z.number().optional(),
				}),
			),
		})
		.parse(args);

	try {
		// 2. Create API client with user's API key
		const apiClient = new SnapBackAPIClient({
			baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
			apiKey: apiKey, // User's authenticated API key
		});

		// 3. Prepare analysis request
		const code = parsed.changes.map((change) => change.value).join("\n");
		const filePath = "mcp-analysis.ts";
		const analysisRequest = {
			code,
			filePath,
			context: {
				projectType: "mcp-analysis",
				language: "typescript",
			},
		};

		// 4. Call backend API
		const risk = await apiClient.analyzeFast(analysisRequest);

		// 5. Create SARIF log
		const sarifLog = createSarifLog("snapback-analyze-risk", "1.0.0");
		if (risk.factors && risk.factors.length > 0) {
			risk.factors.forEach((factor, index) => {
				addResult(sarifLog, `risk-factor-${index + 1}`, factor, undefined, undefined);
			});
		}

		// 6. Evaluate against policy
		const policyDecision = evaluate(sarifLog);

		// 7. Return results
		return {
			content: [
				{ type: "json", json: risk },
				{ type: "json", json: sarifLog },
				{
					type: "text",
					text: `Policy Decision: ${policyDecision.action.toUpperCase()}\nReason: ${policyDecision.reason}\nConfidence: ${policyDecision.confidence.toFixed(2)}`,
				},
			],
		};
	} catch (error) {
		// Fallback to basic analysis if API call fails
		const basicRisk = {
			riskLevel: "low",
			score: 0,
			factors: [],
			analysisTimeMs: 10,
			issues: [],
		};
		// ... return fallback
	}
}
```

---

## 5. API Client Implementation

### SnapBackAPIClient: `apps/mcp-server/src/client/snapback-api.ts`

#### Initialization
```typescript
export interface SnapBackConfig {
	baseUrl: string;
	apiKey: string;
}

export class SnapBackAPIClient {
	private config: SnapBackConfig;

	constructor(config: SnapBackConfig) {
		this.config = config;
	}
}
```

#### API Request Method (lines 102-123)

```typescript
private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${this.config.baseUrl}${endpoint}`;

	const headers = {
		"Content-Type": "application/json",
		...(this.config.apiKey && {
			Authorization: `Bearer ${this.config.apiKey}`, // API key in Bearer token
		}),
		...options.headers,
	};

	const response = await fetch(url, {
		...options,
		headers,
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
}
```

#### analyzeFast Method (lines 125-133)

```typescript
async analyzeFast(request: AnalysisRequest): Promise<AnalysisResponse> {
	const response = await this.fetchAPI<AnalysisResponse>("/api/analyze/fast", {
		method: "POST",
		body: JSON.stringify(request),
	});

	// Validate response
	return AnalysisResponseSchema.parse(response);
}
```

#### AnalysisRequest & Response Types

```typescript
export interface AnalysisRequest {
	code: string;
	filePath: string;
	context?: {
		surroundingCode?: string;
		projectType?: string;
		language?: string;
	};
}

export interface AnalysisResponse {
	riskLevel: string;
	score: number;
	factors: string[];
	analysisTimeMs: number;
	issues: Array<{
		severity: string;
		message: string;
		line?: number;
		column?: number;
	}>;
}
```

---

## 6. API Key Passing Flow

### From Extension to MCP Server

```
┌─────────────────────────────────────────────────┐
│ VS Code Extension                               │
├─────────────────────────────────────────────────┤
│ Environment: SNAPBACK_API_KEY = "sb_live_xxx"   │
│ (Set via configuration or authentication flow) │
└──────────────────────────┬──────────────────────┘
                           │
                           │ MCP Stdio Protocol
                           │ (tool call with API key in env)
                           ↓
┌─────────────────────────────────────────────────┐
│ MCP Server (startServer)                        │
├─────────────────────────────────────────────────┤
│ Tool Call Handler:                              │
│  1. Extract API key: process.env.SNAPBACK_API_KEY
│  2. Authenticate: authenticate(apiKey)          │
│  3. Check access: hasToolAccess(authResult)     │
│  4. Create API client: new SnapBackAPIClient({  │
│       baseUrl: "https://api.snapback.dev",      │
│       apiKey: apiKey // User's key              │
│     })                                          │
└──────────────────────────┬──────────────────────┘
                           │
                           │ HTTP POST
                           │ /api/analyze/fast
                           │ Authorization: Bearer {apiKey}
                           ↓
┌─────────────────────────────────────────────────┐
│ SnapBack Backend API                            │
├─────────────────────────────────────────────────���
│ 1. Validate API key                             │
│ 2. Check user's tier (free/pro/admin)           │
│ 3. Run Guardian analysis                        │
│ 4. Return risk analysis result                  │
└─────────────────────────────────────────────────┘
```

### Environment Variable

```bash
export SNAPBACK_API_KEY="sb_live_xxxxx"
export SNAPBACK_API_URL="https://api.snapback.dev"
```

---

## 7. Input/Output Format Specification

### analyze_risk Input (from Claude/Cursor)

```json
{
  "changes": [
    {
      "added": true,
      "removed": false,
      "value": "const API_KEY = 'sk_live_xxxxxxx';"
    },
    {
      "added": true,
      "removed": false,
      "value": "console.log(API_KEY);"
    },
    {
      "added": false,
      "removed": true,
      "value": "const oldSecret = process.env.SECRET;"
    }
  ]
}
```

### analyze_risk Output

```json
[
  {
    "riskLevel": "critical",
    "score": 0.95,
    "factors": [
      "Hardcoded API key detected",
      "High entropy string in code"
    ],
    "analysisTimeMs": 145,
    "issues": [
      {
        "severity": "critical",
        "message": "Potential AWS access key detected",
        "line": 1,
        "column": 20,
        "recommendation": "Move secrets to environment variables"
      }
    ]
  },
  {
    "version": "2.1.0",
    "runs": [
      {
        "tool": {
          "driver": {
            "name": "snapback-analyze-risk",
            "version": "1.0.0"
          }
        },
        "results": [
          {
            "ruleId": "risk-factor-1",
            "message": { "text": "Hardcoded API key detected" },
            "level": "error"
          }
        ]
      }
    ]
  },
  "Policy Decision: BLOCK\nReason: Critical risk factors detected\nConfidence: 0.95"
]
```

---

## 8. Performance Budgets

### Tracked Operations (lines 32-52)

```typescript
async function trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
	const start = Date.now();
	try {
		return await fn();
	} finally {
		const duration = Date.now() - start;
		console.error(`[PERF] ${operation}: ${duration}ms`);

		const PERFORMANCE_BUDGETS: Record<string, number> = {
			analyze_risk: 200,        // Budget for risk analysis operation
			create_checkpoint: 500,   // Budget for checkpoint creation
		};

		const budget = PERFORMANCE_BUDGETS[operation] || 1000;
		if (duration > budget) {
			console.warn(`[PERF] ⚠️  ${operation} exceeded budget: ${duration}ms > ${budget}ms`);
		}
	}
}
```

---

## 9. HTTP Server Wrapper (Optional)

### Entry Point: `apps/mcp-server/src/http-server.ts`

```typescript
export class MCPHttpServer {
	private server: any;
	private mcpServer: Server;
	private transports: Map<string, SSEServerTransport> = new Map();
	private rateLimiter: RateLimiter;

	constructor(mcpServer: Server) {
		this.mcpServer = mcpServer;
		this.rateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
	}

	async listen(port = 3000, host = "localhost"): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(port, host, () => {
				console.log(`MCP HTTP server listening on http://${host}:${port}`);
				resolve();
			});
		});
	}
}
```

**Features**:
- SSE (Server-Sent Events) connections via GET /mcp
- POST message handling via POST /mcp
- Authentication via Bearer token or X-API-Key header
- Rate limiting (100 requests/minute per IP)
- Security headers (CSP, X-Frame-Options, etc.)
- Health check endpoint: GET /health

---

## 10. Error Handling

### Error Sanitization (lines 55-82)

```typescript
function sanitizeError(
	error: unknown,
	context: string,
): {
	message: string;
	code: string;
	logId: string;
} {
	const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
	const logId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	// Log full details internally (stderr only)
	console.error(`[Error ${logId}] ${context}:`, error);

	if (isDevelopment) {
		return {
			message: error instanceof Error ? error.message : String(error),
			code: "INTERNAL_ERROR",
			logId,
		};
	}

	return {
		message: "An internal error occurred. Contact support with log ID.",
		code: "INTERNAL_ERROR",
		logId,
	};
}
```

---

## 11. Tool List (Lines 152-383)

| Tool Name | Tier | Description | Budget |
|-----------|------|-------------|--------|
| `snapback.analyze_risk` | Free | Analyze code for risks | 200ms |
| `snapback.check_dependencies` | Free | Check for phantom dependencies | 300ms |
| `snapback.create_checkpoint` | Pro | Create snapshot | 500ms |
| `snapback.list_checkpoints` | Pro | List available snapshots | N/A |
| `snapback.restore_checkpoint` | Pro | Restore from snapshot | N/A |
| `catalog.list_tools` | Free | List external MCP tools | N/A |
| `ctx7.resolve-library-id` | Free | Resolve library IDs | N/A |
| `ctx7.get-library-docs` | Free | Fetch library documentation | N/A |

---

## Summary

The MCP server integration works as follows:

1. **Initialization**: Server starts with storage, event bus, and IPC connections
2. **Authentication**: API key extracted from environment and cached (1-min TTL)
3. **Authorization**: Tool access checked via tier-based permissions
4. **Tool Dispatch**: Specific tool handler executes with user's API key
5. **Analysis**: Code changes sent to backend API with Bearer token
6. **Response**: Results returned as JSON + SARIF + policy decision
7. **Fallback**: If API fails, basic analysis provided
8. **Error Handling**: PII-safe error messages with unique log IDs

The API key flows from the VS Code extension environment → MCP server → SnapBack API, maintaining security through Bearer token authentication.
