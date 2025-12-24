# SnapBack MCP Server Specification

## Phase 1.5: Lightweight AI Tool Integration

**Version:** 1.0  
**Implementation Time:** 3-5 days  
**Stack:** TypeScript, MCP SDK, SnapBack API

---

## Executive Summary

The SnapBack MCP Server is a lightweight integration layer that enables AI coding tools (Copilot, Cursor, Claude, etc.) to interact with SnapBack's safety system in real-time. Instead of inferring AI edits from file changes, this provides direct integration with AI tools for superior detection and pre-emptive intervention.

### Core Value Proposition

**Before MCP:**

-   Detect AI edits by analyzing file change patterns (80% accuracy)
-   React AFTER code is written
-   No context sharing with AI tools

**After MCP:**

-   Know definitively when AI generates code (100% accuracy)
-   Analyze suggestions BEFORE acceptance (pre-emptive)
-   Inject safety context into AI prompts (guidance)
-   Precise metering of AI interactions

### ROI vs Complexity

| Feature                  | Complexity | ROI       | Priority |
| ------------------------ | ---------- | --------- | -------- |
| Pre-suggestion analysis  | Low        | Very High | MVP      |
| Iteration tracking       | Low        | High      | MVP      |
| Safety context injection | Medium     | High      | MVP      |
| Snapshot management      | Low        | Medium    | Phase 2  |
| Team analytics           | Medium     | Medium    | Phase 2  |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Coding Tool                            │
│            (Copilot, Cursor, Claude Code, etc.)             │
└───────────────────────┬─────────────────────────────────────┘
                        │ MCP Protocol
                        │ (stdio/SSE)
┌───────────────────────▼─────────────────────────────────────┐
│                 SnapBack MCP Server                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tools      │  │  Resources   │  │  Prompts     │     │
│  │              │  │              │  │              │     │
│  │ • analyze    │  │ • session    │  │ • safety     │     │
│  │ • check      │  │ • guidelines │  │ • context    │     │
│  │ • snapshot   │  │ • history    │  │ • warnings   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         └────────────────┬┴────────────────┬─┘             │
│                    ┌─────▼─────────────────▼──┐            │
│                    │   SnapBack API Client   │            │
│                    └─────────────────────────┬─┘            │
└──────────────────────────────────────────────┼──────────────┘
                                               │ REST/WebSocket
┌──────────────────────────────────────────────▼──────────────┐
│                  SnapBack Backend (Next.js)                  │
│         (Risk Analysis, Snapshots, Sessions)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Server Implementation

### Project Structure

```
snapback-mcp-server/
├── src/
│   ├── index.ts                 # Main server entry
│   ├── tools/
│   │   ├── analyze.ts          # Pre-suggestion analysis
│   │   ├── check-iteration.ts  # Iteration tracking
│   │   └── create-snapshot.ts  # Manual snapshot creation
│   ├── resources/
│   │   ├── session-context.ts  # Current session state
│   │   └── safety-guidelines.ts # Project-specific rules
│   ├── prompts/
│   │   ├── safety-prompt.ts    # Safety context for AI
│   │   └── warning-prompt.ts   # Risk warnings
│   ├── client/
│   │   └── snapback-api.ts     # Backend API client
│   └── types/
│       └── index.ts             # Shared types
├── package.json
├── tsconfig.json
└── README.md
```

### Core Implementation

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
	ListPromptsRequestSchema,
	GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SnapBackAPIClient } from "./client/snapback-api.js";
import { analyzeTool } from "./tools/analyze.js";
import { checkIterationTool } from "./tools/check-iteration.js";
import { createSnapshotTool } from "./tools/create-snapshot.js";

/**
 * SnapBack MCP Server
 *
 * Provides real-time safety analysis for AI coding tools.
 * Enables pre-emptive risk detection and safety context injection.
 */
class SnapBackMCPServer {
	private server: Server;
	private apiClient: SnapBackAPIClient;

	constructor() {
		this.server = new Server(
			{
				name: "snapback-mcp-server",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {}, // Risk analysis and snapshot management
					resources: {}, // Session state and guidelines
					prompts: {}, // Safety context for AI tools
				},
			}
		);

		// Initialize SnapBack API client
		this.apiClient = new SnapBackAPIClient({
			baseUrl:
				process.env.SNAPBACK_API_URL || "http://localhost:3000/api",
			apiKey: process.env.SNAPBACK_API_KEY || "",
		});

		this.setupHandlers();
	}

	private setupHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				{
					name: "analyze_suggestion",
					description:
						"Analyze an AI code suggestion for potential risks before applying it. " +
						"Returns risk level, specific issues, and recommendation (allow/warn/block). " +
						"Use this BEFORE accepting any AI-generated code.",
					inputSchema: {
						type: "object",
						properties: {
							code: {
								type: "string",
								description: "The AI-suggested code to analyze",
							},
							file_path: {
								type: "string",
								description:
									"Path to the file where code will be applied",
							},
							context: {
								type: "object",
								description:
									"Additional context about the change",
								properties: {
									surrounding_code: { type: "string" },
									project_type: { type: "string" },
									language: { type: "string" },
								},
							},
						},
						required: ["code", "file_path"],
					},
				},
				{
					name: "check_iteration_safety",
					description:
						"Check if continuing with AI suggestions is safe based on iteration count. " +
						"Returns current iteration number, risk level, and recommendation. " +
						"Call this periodically during AI-assisted coding sessions.",
					inputSchema: {
						type: "object",
						properties: {
							file_path: {
								type: "string",
								description: "Path to the file being edited",
							},
						},
						required: ["file_path"],
					},
				},
				{
					name: "create_snapshot",
					description:
						"Manually create a code snapshot before making risky changes. " +
						"Returns snapshot ID for later restoration if needed. " +
						"Use when about to accept a significant AI suggestion.",
					inputSchema: {
						type: "object",
						properties: {
							file_path: {
								type: "string",
								description: "Path to the file to snapshot",
							},
							reason: {
								type: "string",
								description:
									"Reason for creating snapshot (e.g., 'before major refactor')",
							},
						},
						required: ["file_path"],
					},
				},
			],
		}));

		// Handle tool calls
		this.server.setRequestHandler(
			CallToolRequestSchema,
			async (request) => {
				switch (request.params.name) {
					case "analyze_suggestion":
						return await analyzeTool(
							request.params.arguments,
							this.apiClient
						);

					case "check_iteration_safety":
						return await checkIterationTool(
							request.params.arguments,
							this.apiClient
						);

					case "create_snapshot":
						return await createSnapshotTool(
							request.params.arguments,
							this.apiClient
						);

					default:
						throw new Error(`Unknown tool: ${request.params.name}`);
				}
			}
		);

		// List available resources
		this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
			resources: [
				{
					uri: "snapback://session/current",
					name: "Current Session State",
					description:
						"Real-time information about the current coding session",
					mimeType: "application/json",
				},
				{
					uri: "snapback://guidelines/safety",
					name: "Safety Guidelines",
					description:
						"Project-specific safety rules and patterns to avoid",
					mimeType: "text/plain",
				},
			],
		}));

		// Read resource contents
		this.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				const uri = request.params.uri;

				if (uri === "snapback://session/current") {
					const session = await this.apiClient.getCurrentSession();
					return {
						contents: [
							{
								uri,
								mimeType: "application/json",
								text: JSON.stringify(session, null, 2),
							},
						],
					};
				}

				if (uri === "snapback://guidelines/safety") {
					const guidelines =
						await this.apiClient.getSafetyGuidelines();
					return {
						contents: [
							{
								uri,
								mimeType: "text/plain",
								text: guidelines,
							},
						],
					};
				}

				throw new Error(`Unknown resource: ${uri}`);
			}
		);

		// List available prompts
		this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
			prompts: [
				{
					name: "safety_context",
					description:
						"Inject safety context into AI coding assistant prompts",
					arguments: [
						{
							name: "file_path",
							description: "Current file being edited",
							required: false,
						},
					],
				},
				{
					name: "risk_warning",
					description:
						"Show risk warning based on current session state",
					arguments: [
						{
							name: "risk_type",
							description: "Type of risk detected",
							required: true,
						},
					],
				},
			],
		}));

		// Get prompt content
		this.server.setRequestHandler(
			GetPromptRequestSchema,
			async (request) => {
				if (request.params.name === "safety_context") {
					const filePath = request.params.arguments
						?.file_path as string;
					const session = await this.apiClient.getCurrentSession();

					return {
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: this.buildSafetyPrompt(
										session,
										filePath
									),
								},
							},
						],
					};
				}

				if (request.params.name === "risk_warning") {
					const riskType = request.params.arguments
						?.risk_type as string;

					return {
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: this.buildRiskWarning(riskType),
								},
							},
						],
					};
				}

				throw new Error(`Unknown prompt: ${request.params.name}`);
			}
		);
	}

	private buildSafetyPrompt(session: any, filePath?: string): string {
		const iterations = session.consecutiveAIEdits || 0;
		const riskLevel =
			iterations >= 5 ? "HIGH" : iterations >= 3 ? "MEDIUM" : "LOW";

		return `SNAPBACK SAFETY CONTEXT:
Current AI iteration count: ${iterations} (Risk: ${riskLevel})
${
	iterations >= 3
		? "\n⚠️ WARNING: Multiple AI iterations detected. Code quality may be degrading.\n"
		: ""
}
${filePath ? `File: ${filePath}\n` : ""}
Safety guidelines:
- Avoid removing input validation
- Don't introduce known vulnerable patterns (eval, innerHTML, etc.)
- Maintain backward compatibility
- Keep complexity increases minimal
${
	iterations >= 5
		? "\n🚨 CRITICAL: Stop and test code before continuing with more AI edits.\n"
		: ""
}
When generating code suggestions:
1. Prioritize security and maintainability
2. Avoid over-engineering
3. Keep changes minimal and focused
4. Preserve existing error handling`;
	}

	private buildRiskWarning(riskType: string): string {
		const warnings: Record<string, string> = {
			"high-iteration":
				"⚠️ You have made 5+ consecutive AI edits. Research shows quality degrades significantly. Consider testing before continuing.",
			security:
				"🚨 Security vulnerability detected in AI suggestion. Review carefully before accepting.",
			"breaking-change":
				"⚠️ This change may break existing functionality. Consider creating a snapshot first.",
			complexity:
				"⚠️ Complexity increase detected. This may make code harder to maintain.",
			config: "🚨 Configuration file change detected. These often have cascading effects.",
		};

		return (
			warnings[riskType] ||
			"⚠️ Potential risk detected. Review carefully."
		);
	}

	async start() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("SnapBack MCP Server running on stdio");
	}
}

// Start server
const server = new SnapBackMCPServer();
server.start().catch(console.error);
```

### Tool Implementations

```typescript
// src/tools/analyze.ts
import { SnapBackAPIClient } from "../client/snapback-api.js";

export async function analyzeTool(args: any, apiClient: SnapBackAPIClient) {
	const { code, file_path, context } = args;

	try {
		// Call SnapBack backend for fast analysis
		const analysis = await apiClient.analyzeFast({
			code,
			filePath: file_path,
			context: context || {},
		});

		// Format response for AI tool
		const riskEmoji =
			{
				safe: "✅",
				low: "🟢",
				medium: "🟡",
				high: "🔴",
				critical: "🚨",
			}[analysis.riskLevel] || "⚠️";

		const recommendation =
			analysis.riskLevel === "high" || analysis.riskLevel === "critical"
				? "BLOCK: Do not apply this suggestion"
				: analysis.riskLevel === "medium"
				? "WARN: Review carefully before applying"
				: "ALLOW: Safe to apply";

		let responseText = `${riskEmoji} Risk Analysis Complete
    
Risk Level: ${analysis.riskLevel.toUpperCase()}
Recommendation: ${recommendation}
Analysis Time: ${analysis.analysisTimeMs}ms

`;

		if (analysis.issues.length > 0) {
			responseText += `Issues Detected:\n`;
			analysis.issues.forEach((issue: any, idx: number) => {
				responseText += `${idx + 1}. [${issue.severity}] ${
					issue.message
				}\n`;
			});
		} else {
			responseText += `No issues detected. This change appears safe.\n`;
		}

		// Add actionable guidance
		if (
			analysis.riskLevel === "high" ||
			analysis.riskLevel === "critical"
		) {
			responseText += `\n⚠️ RECOMMENDED ACTION: Create a snapshot before proceeding or reject this suggestion.\n`;
		}

		return {
			content: [
				{
					type: "text",
					text: responseText,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error analyzing suggestion: ${error.message}`,
				},
			],
			isError: true,
		};
	}
}
```

```typescript
// src/tools/check-iteration.ts
import { SnapBackAPIClient } from "../client/snapback-api.js";

export async function checkIterationTool(
	args: any,
	apiClient: SnapBackAPIClient
) {
	const { file_path } = args;

	try {
		const stats = await apiClient.getIterationStats(file_path);

		const emoji =
			stats.riskLevel === "high"
				? "🚨"
				: stats.riskLevel === "medium"
				? "⚠️"
				: "✅";

		let responseText = `${emoji} Iteration Safety Check

Current AI Iterations: ${stats.consecutiveAIEdits}
Risk Level: ${stats.riskLevel.toUpperCase()}
Change Velocity: ${stats.velocity} edits/min

${stats.recommendation}
`;

		// Research-backed warning thresholds
		if (stats.consecutiveAIEdits >= 5) {
			responseText += `\n🚨 CRITICAL WARNING:
Research shows that 5+ consecutive AI iterations increase vulnerability risk by 37.6%.
Current iteration count (${stats.consecutiveAIEdits}) is in the danger zone.

RECOMMENDED ACTIONS:
1. Stop accepting AI suggestions
2. Run tests on current code
3. Manually review all recent changes
4. Consider restoring to an earlier snapshot
`;
		} else if (stats.consecutiveAIEdits >= 3) {
			responseText += `\n⚠️ CAUTION:
Multiple AI iterations detected. Quality tends to degrade with each iteration.
Consider manual review or testing before continuing.
`;
		}

		return {
			content: [
				{
					type: "text",
					text: responseText,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error checking iteration safety: ${error.message}`,
				},
			],
			isError: true,
		};
	}
}
```

```typescript
// src/tools/create-snapshot.ts
import { SnapBackAPIClient } from "../client/snapback-api.js";

export async function createSnapshotTool(
	args: any,
	apiClient: SnapBackAPIClient
) {
	const { file_path, reason } = args;

	try {
		const snapshot = await apiClient.createSnapshot({
			filePath: file_path,
			reason: reason || "Manual snapshot via MCP",
			source: "mcp",
		});

		return {
			content: [
				{
					type: "text",
					text: `✅ Snapshot created successfully

Snapshot ID: ${snapshot.id}
File: ${file_path}
Timestamp: ${new Date(snapshot.timestamp).toLocaleString()}
Reason: ${reason || "Manual snapshot"}

You can now safely proceed with changes. If anything goes wrong, you can restore to this snapshot.`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: `Error creating snapshot: ${error.message}`,
				},
			],
			isError: true,
		};
	}
}
```

### API Client

```typescript
// src/client/snapback-api.ts

interface SnapBackConfig {
	baseUrl: string;
	apiKey: string;
}

interface AnalysisRequest {
	code: string;
	filePath: string;
	context: any;
}

interface SnapshotRequest {
	filePath: string;
	reason: string;
	source: string;
}

export class SnapBackAPIClient {
	private config: SnapBackConfig;

	constructor(config: SnapBackConfig) {
		this.config = config;
	}

	async analyzeFast(request: AnalysisRequest) {
		const response = await fetch(`${this.config.baseUrl}/analyze/fast`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		return await response.json();
	}

	async getIterationStats(filePath: string) {
		const response = await fetch(
			`${
				this.config.baseUrl
			}/session/iteration-stats?filePath=${encodeURIComponent(filePath)}`,
			{
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		return await response.json();
	}

	async createSnapshot(request: SnapshotRequest) {
		const response = await fetch(
			`${this.config.baseUrl}/snapshots/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: JSON.stringify(request),
			}
		);

		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		return await response.json();
	}

	async getCurrentSession() {
		const response = await fetch(`${this.config.baseUrl}/session/current`, {
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
			},
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		return await response.json();
	}

	async getSafetyGuidelines() {
		const response = await fetch(
			`${this.config.baseUrl}/guidelines/safety`,
			{
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error(`API error: ${response.statusText}`);
		}

		return await response.text();
	}
}
```

---

## Package Configuration

```json
// package.json
{
	"name": "snapback-mcp-server",
	"version": "1.0.0",
	"description": "MCP server for SnapBack AI safety integration",
	"type": "module",
	"bin": {
		"snapback-mcp": "./build/index.js"
	},
	"scripts": {
		"build": "tsc && chmod +x build/index.js",
		"dev": "tsc --watch",
		"prepare": "npm run build"
	},
	"dependencies": {
		"@modelcontextprotocol/sdk": "^1.0.0",
		"node-fetch": "^3.3.0"
	},
	"devDependencies": {
		"@types/node": "^20.0.0",
		"typescript": "^5.3.0"
	},
	"files": ["build"]
}
```

```json
// tsconfig.json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "Node16",
		"moduleResolution": "Node16",
		"outDir": "./build",
		"rootDir": "./src",
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"declaration": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "build"]
}
```

---

## Integration with AI Tools

### Claude Desktop Configuration

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
	"mcpServers": {
		"snapback": {
			"command": "node",
			"args": ["/path/to/snapback-mcp-server/build/index.js"],
			"env": {
				"SNAPBACK_API_URL": "https://api.snapback.dev",
				"SNAPBACK_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

### VS Code with Copilot (Future)

```json
// .vscode/settings.json
{
	"github.copilot.advanced": {
		"mcp.servers": {
			"snapback": {
				"command": "snapback-mcp",
				"env": {
					"SNAPBACK_API_KEY": "your-api-key"
				}
			}
		}
	}
}
```

### Cursor Configuration (Future)

```json
// .cursor/mcp.json
{
	"servers": {
		"snapback": {
			"command": "snapback-mcp",
			"args": [],
			"env": {
				"SNAPBACK_API_KEY": "your-api-key"
			}
		}
	}
}
```

---

## Usage Patterns

### Pattern 1: Pre-Acceptance Analysis

**AI Tool → SnapBack → Decision**

```
User: "Refactor this function to use async/await"
↓
AI Tool generates suggestion
↓
AI Tool calls: analyze_suggestion(code, file_path)
↓
SnapBack analyzes: HIGH RISK - removes error handling
↓
AI Tool shows warning to user
↓
User decides: reject or create snapshot first
```

### Pattern 2: Iteration Monitoring

**Periodic Safety Checks**

```
Every 3 AI suggestions in same file:
↓
AI Tool calls: check_iteration_safety(file_path)
↓
SnapBack returns: "3 iterations, MEDIUM risk, consider review"
↓
AI Tool surfaces warning to user
```

### Pattern 3: Safety Context Injection

**Guiding AI Behavior**

```
User starts AI-assisted coding session
↓
AI Tool requests: safety_context prompt
↓
SnapBack provides: "Current iteration: 2, avoid removing validation..."
↓
AI Tool incorporates into system prompt
↓
AI generates safer suggestions
```

---

## Backend API Additions

You'll need to add these endpoints to your Next.js backend:

```typescript
// app/api/analyze/fast/route.ts (already exists, no changes)

// app/api/session/iteration-stats/route.ts (NEW)
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const filePath = searchParams.get("filePath");

	const tracker = new IterationTracker();
	const stats = tracker.getIterationStats(filePath);

	return Response.json(stats);
}

// app/api/session/current/route.ts (NEW)
export async function GET(request: Request) {
	const userId = await getUserIdFromAuth(request);

	const { data: sessions } = await supabase
		.from("edit_sessions")
		.select("*")
		.eq("user_id", userId)
		.order("updated_at", { ascending: false })
		.limit(1);

	return Response.json(sessions[0] || {});
}

// app/api/guidelines/safety/route.ts (NEW)
export async function GET(request: Request) {
	const userId = await getUserIdFromAuth(request);

	// Get project-specific guidelines
	const guidelines = await getProjectGuidelines(userId);

	return new Response(guidelines, {
		headers: { "Content-Type": "text/plain" },
	});
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/tools/analyze.test.ts
import { analyzeTool } from "../../src/tools/analyze";
import { SnapBackAPIClient } from "../../src/client/snapback-api";

describe("analyzeTool", () => {
	it("should detect high-risk code", async () => {
		const mockClient = {
			analyzeFast: jest.fn().mockResolvedValue({
				riskLevel: "high",
				issues: [
					{ severity: "high", message: "eval() usage detected" },
				],
				analysisTimeMs: 45,
			}),
		};

		const result = await analyzeTool(
			{
				code: "eval(userInput)",
				file_path: "test.js",
			},
			mockClient as any
		);

		expect(result.content[0].text).toContain("🔴");
		expect(result.content[0].text).toContain("BLOCK");
	});
});
```

### Integration Tests

```typescript
// tests/integration/mcp-server.test.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

describe("SnapBack MCP Server Integration", () => {
	let client: Client;

	beforeAll(async () => {
		// Start MCP server
		client = await startMCPServer();
	});

	it("should list all tools", async () => {
		const tools = await client.listTools();

		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name)).toEqual([
			"analyze_suggestion",
			"check_iteration_safety",
			"create_snapshot",
		]);
	});

	it("should analyze code suggestion", async () => {
		const result = await client.callTool("analyze_suggestion", {
			code: "const x = eval(input);",
			file_path: "test.js",
		});

		expect(result.content[0].text).toContain("Risk Level");
	});
});
```

### Manual Testing with Claude Desktop

1. Install the MCP server
2. Configure Claude Desktop
3. Test conversation:

```
User: "I'm working on a Node.js API. Can you help me add authentication?"

Claude: "I'll help with that. Let me check the current safety context first."
[calls snapback://session/current resource]

Claude: "I see you're at 2 AI iterations already. I'll make sure my suggestions
are especially careful about security. Here's my recommendation..."
[generates auth code]

Claude: "Before you apply this, let me analyze it for risks."
[calls analyze_suggestion tool]

Claude: "✅ Analysis shows LOW risk. The code includes proper input validation
and uses bcrypt for password hashing. Safe to apply."
```

---

## Performance Targets

| Operation         | Target | Rationale                             |
| ----------------- | ------ | ------------------------------------- |
| Tool call latency | <200ms | Fast enough for real-time suggestions |
| Fast analysis     | <100ms | Backend target (unchanged)            |
| Resource fetch    | <50ms  | Cached session data                   |
| MCP overhead      | <10ms  | Protocol should be negligible         |

---

## Rollout Strategy

### Week 1: Development

-   Day 1-2: Core MCP server structure + tools
-   Day 3: Resources and prompts
-   Day 4: API client integration
-   Day 5: Testing and polish

### Week 2: Validation

-   Day 1-2: Integration testing with Claude Desktop
-   Day 3-4: Beta user testing (5-10 users)
-   Day 5: Bug fixes and refinements

### Week 3: Launch

-   Publish to npm
-   Documentation
-   Announce to early users

---

## Success Metrics

### Detection Accuracy

-   **Before MCP**: ~80% AI edit detection (heuristic-based)
-   **After MCP**: 100% AI edit detection (direct integration)

### Intervention Timing

-   **Before MCP**: React after code written
-   **After MCP**: Analyze before acceptance (30-60s earlier)

### User Experience

-   **Before MCP**: Interruptions after mistakes
-   **After MCP**: Guidance before mistakes (proactive)

### Adoption

-   **Target**: 30% of users enable MCP within first month
-   **Benefit**: 2x more accurate detection for those users

---

## Future Enhancements (Phase 3+)

1. **Team Collaboration**

    - Share safety guidelines across team
    - Aggregate iteration stats
    - Team-wide risk dashboards

2. **AI Tool Specific Optimizations**

    - Copilot: Hook into inline completion API
    - Cursor: Integrate with Composer
    - Claude Code: Deep terminal integration

3. **Advanced Analysis**

    - Multi-file impact analysis
    - Dependency change tracking
    - Performance regression detection

4. **Prompt Engineering**
    - Dynamic safety prompts based on risk
    - Project-specific instruction injection
    - Learning from past mistakes

---

## Cost Analysis

### Development Cost

-   **Time**: 3-5 days (minimal)
-   **LOC**: ~800 lines TypeScript
-   **Complexity**: Low (just tools + prompts)

### Operational Cost

-   **Server**: No additional server (uses stdio)
-   **API Calls**: Same as current (no increase)
-   **Latency**: +10-50ms per AI suggestion

### ROI

-   **Detection**: 80% → 100% accuracy (+25%)
-   **Prevention**: React → Pre-empt (30-60s earlier)
-   **User Value**: 2x better safety for MCP-enabled users

**Verdict**: Very high ROI for minimal investment

---

## Conclusion

The SnapBack MCP Server is a lightweight but high-impact addition that transforms SnapBack from reactive to pre-emptive. By integrating directly with AI tools, you get:

1. **Perfect Detection**: Know definitively when AI generates code
2. **Earlier Intervention**: Analyze before acceptance, not after
3. **Guided AI**: Inject safety context into AI prompts
4. **Better Metrics**: Precise tracking of AI interactions

**Implementation**: 3-5 days  
**Complexity**: Low  
**ROI**: Very High

This positions SnapBack as the industry-leading AI safety tool with the deepest integrations into developer workflows.

---

## Getting Started

```bash
# Clone and setup
git clone https://github.com/yourusername/snapback-mcp-server
cd snapback-mcp-server
npm install
npm run build

# Configure environment
export SNAPBACK_API_URL="https://api.snapback.dev"
export SNAPBACK_API_KEY="your-api-key"

# Test locally
node build/index.js

# Install for Claude Desktop
npm install -g .
# Then add to Claude config (see Integration section)
```

**Ready to build the future of AI-safe coding! 🚀**
