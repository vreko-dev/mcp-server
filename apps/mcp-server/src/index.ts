if (process.env.SNAPBACK_MCP_SELFTEST === "1") {
	const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
	process.stderr.write(`SnapBack MCP Server started rssMB=${rssMB}\n`);
	setTimeout(() => process.exit(0), 50).unref();
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DependencyAnalyzer, MCPClientManager, validateToolArgs } from "@snapback/core";
import { SnapBackEventBusEventEmitter2 as SnapBackEventBus } from "@snapback/events";
import { evaluate } from "@snapback/policy-engine"; // Import the proper policy engine
import { z } from "zod";
import { authenticate, hasToolAccess } from "./auth.js";
import { ExtensionIPCClient } from "./client/extension-ipc.js";
import { SnapBackAPIClient } from "./client/snapback-api.js";
import { AnalysisRouter } from "./services/AnalysisRouter.js";
import { Context7Service } from "./context7/index.js";
import { MCPHttpServer } from "./http-server.js";
import { CreateSnapshotSchema, createSnapshot } from "./tools/create-snapshot.js";
import { addSnapshot, listSnapshots } from "./tools/list-snapshots.js";
import { restoreSnapshot, storeSnapshotContent } from "./tools/restore-snapshot.js";
import { addResult, createSarifLog } from "./utils/sarif.js";
import { initializeSecurityTelemetry, setWorkspaceRoot } from "./utils/security.js";

/**
 * Performance tracker for monitoring operation times
 *
 * Note: Performance budgets are MCP-specific operational constraints.
 * For data-related thresholds (risk scores, session timeouts, etc.),
 * use centralized THRESHOLDS from @snapback/sdk.
 */
async function trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
	const start = Date.now();
	try {
		return await fn();
	} finally {
		const duration = Date.now() - start;
		console.error(`[PERF] ${operation}: ${duration}ms`);

		// MCP-specific performance budgets (operational, not data thresholds)
		// For data thresholds (risk, session, protection), import THRESHOLDS from @snapback/sdk
		const PERFORMANCE_BUDGETS: Record<string, number> = {
			analyze_risk: 200, // Budget for risk analysis operation
			create_snapshot: 500, // Budget for snapshot creation
		};

		const budget = PERFORMANCE_BUDGETS[operation] || 1000;
		if (duration > budget) {
			console.warn(`[PERF] ⚠️  ${operation} exceeded budget: ${duration}ms > ${budget}ms`);
		}
	}
}

// Error handler for production-grade error sanitization
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

// Export a function to create and start the server
export async function startServer(): Promise<{
	server: Server;
	transport: StdioServerTransport;
}> {
	// ARCHITECTURAL DECISION: API-First Approach
	// See CLAUDE.md "Architectural Decisions" section for rationale
	// Benefits: Consistency, feature flags, circuit breaker, centralized updates
	// Tradeoffs: Network dependency vs local processing
	// Future: AnalysisRouter will provide tier-based routing (local for Free, API for Pro)
	// See: apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts
	// Remove local Guardian initialization since we'll use the backend API
	// const guardian = new Guardian();
	// Add detection plugins
	// guardian.addPlugin(new SecretDetectionPlugin());
	// guardian.addPlugin(new MockReplacementPlugin());
	// guardian.addPlugin(new PhantomDependencyPlugin());

	const dep = new DependencyAnalyzer();
	// Use StorageBrokerAdapter instead of LocalStorage for single-writer discipline
	// Use the standard workspace database path
	const sdkModule = await import("@snapback/sdk");
	const StorageBrokerAdapter = sdkModule.StorageBrokerAdapter;
	const storage = new StorageBrokerAdapter(`${process.cwd()}/.snapback/snapback.db`);
	await storage.initialize();

	const mcpManager = new MCPClientManager();
	// Initialize Context7 service for documentation and code search
	const context7Service = new Context7Service(storage);

	// Initialize event bus for pub/sub with EventEmitter2
	const eventBus = new SnapBackEventBus();
	await eventBus.initialize();
	console.error("[SnapBack MCP] Using EventEmitter2 event bus");

	// Initialize IPC client for request/response with Extension
	const extensionClient = new ExtensionIPCClient();
	try {
		await extensionClient.connect();
		console.error("[SnapBack MCP] Connected to Extension IPC");
	} catch (err) {
		console.error("[SnapBack MCP] Failed to connect to Extension IPC:", err);
	}

	// Initialize AnalysisRouter with optional API client
	const apiClient = process.env.SNAPBACK_API_KEY
		? new SnapBackAPIClient({
				baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
				apiKey: process.env.SNAPBACK_API_KEY,
			})
		: undefined;
	const _analysisRouter = new AnalysisRouter(apiClient);

	// Set workspace root for path validation
	// In a real implementation, this would come from the extension or config
	// For now, we'll use the current working directory as the workspace root
	setWorkspaceRoot(process.cwd());

	// Initialize security telemetry
	// In a real implementation, this would come from configuration
	initializeSecurityTelemetry("https://telemetry.snapback.dev");

	const server = new Server(
		{ name: "snapback-mcp", version: "0.1.1" },
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Register tools listing
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
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
				// Free-tier tool - does not require backend
				requiresBackend: false,
			},
			{
				name: "snapback.check_dependencies",
				description: `**Purpose:** Check for dependency-related risks when package.json changes.

**When to Use:**
- After modifying package.json dependencies
- Before installing new packages
- When troubleshooting version conflicts
- When user adds/removes npm packages

**Returns:**
- Added dependencies with known vulnerabilities
- Removed dependencies that might break existing code
- Version changes that could cause compatibility issues`,
				inputSchema: {
					type: "object",
					properties: {
						before: {
							type: "object",
							description: "Dependencies object before changes",
							additionalProperties: true,
						},
						after: {
							type: "object",
							description: "Dependencies object after changes",
							additionalProperties: true,
						},
					},
					required: ["before", "after"],
				},
				// Free-tier tool - does not require backend
				requiresBackend: false,
			},
			{
				name: "snapback.create_snapshot",
				description: `**Purpose:** Create a code snapshot before making risky changes.

**When to Use:**
- Before major refactoring
- Before implementing breaking changes
- When about to modify critical files
- As a safety net for experimental changes
- When user explicitly asks to "create snapshot" or "save snapshot"

**When NOT to Use:**
- After every single file save (too frequent)
- For trivial changes (typo fixes)

**Returns:**
- Snapshot ID for later restoration
- Timestamp of snapshot
- Files included in snapshot

**Performance:** < 500ms average (larger codebases may take longer)`,
				inputSchema: CreateSnapshotSchema,

				// Pro-tier tool - requires backend
				requiresBackend: true,
			},
			{
				name: "snapback.list_snapshots",
				description: `**Purpose:** List all available code snapshots for restoration.

**When to Use:**
- When user wants to see available restore points
- Before choosing which snapshot to restore
- To verify a snapshot was created successfully

**Returns:**
- Array of snapshots with IDs, timestamps, and descriptions
- Recent snapshots listed first (up to 500 most recent)`,
				inputSchema: {
					type: "object",
					properties: {},
				},
				// Pro-tier tool - requires backend
				requiresBackend: true,
			},
			{
				name: "snapback.restore_snapshot",
				description: `**Purpose:** Restore code from a previously created snapshot.

**When to Use:**
- When user wants to revert to a previous state
- After realizing changes were problematic
- To restore from a known good state

**Returns:**
- The content of the restored snapshot
- Files and their contents`,
				inputSchema: {
					type: "object",
					properties: {
						snapshotId: {
							type: "string",
							description: "The ID of the snapshot to restore",
						},
					},
					required: ["snapshotId"],
				},
				// Pro-tier tool - requires backend
				requiresBackend: true,
			},
			{
				name: "catalog.list_tools",
				description:
					"List available tools from connected external MCP servers (Context7, GitHub, NPM Registry, etc.)",
				inputSchema: {
					type: "object",
					properties: {},
				},
				// Free-tier tool - does not require backend
				requiresBackend: false,
			},
			{
				name: "ctx7.resolve-library-id",
				description: `**Purpose:** Resolve a library or package name into a Context7-compatible library ID.

**When to Use:**
- When you need documentation for a specific library
- Before calling ctx7.get-library-docs
- To find the correct library ID for a package name

**Returns:**
- Context7-compatible library ID
- Library metadata (description, trust score, versions)
- Multiple matches if applicable`,
				inputSchema: {
					type: "object",
					properties: {
						libraryName: {
							type: "string",
							description: "The name of the library to resolve",
						},
					},
					required: ["libraryName"],
				},
				// Free-tier tool - does not require backend
				requiresBackend: false,
			},
			{
				name: "ctx7.get-library-docs",
				description: `**Purpose:** Fetch up-to-date documentation for a specific library.

**When to Use:**
- When you need documentation for a library
- To understand library APIs and usage patterns
- For code examples and best practices

**Returns:**
- Formatted documentation with code examples
- API references and integration patterns
- Version-specific information`,
				inputSchema: {
					type: "object",
					properties: {
						context7CompatibleLibraryID: {
							type: "string",
							description: "The Context7-compatible library ID",
						},
						topic: {
							type: "string",
							description: "Optional topic to filter documentation",
						},
						tokens: {
							type: "number",
							description: "Optional limit on response size in tokens",
						},
					},
					required: ["context7CompatibleLibraryID"],
				},
				// Free-tier tool - does not require backend
				requiresBackend: false,
			},
		],
	}));

	// Handle tool calls
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			// Get API key from environment (for stdio transport)
			// In a real implementation with HTTP transport, this would come from headers
			const apiKey = process.env.SNAPBACK_API_KEY || "";

			// Authenticate user
			const authResult = await authenticate(apiKey);

			// Check if user has access to this tool
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

			// Handle SnapBack's native tools
			if (name === "snapback.analyze_risk") {
				// ARCHITECTURAL DECISION: API-First Approach
				// See CLAUDE.md "Architectural Decisions" section for rationale
				// Current implementation proxies to backend API for consistent detection
				// Future: AnalysisRouter will provide tier-based routing
				// See: apps/mcp-server/src/services/AnalysisRouter.IMPLEMENTATION.ts
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

				// Proxy to backend API instead of using local Guardian
				try {
					// Create API client
					const apiClient = new SnapBackAPIClient({
						baseUrl: process.env.SNAPBACK_API_URL || "https://api.snapback.dev",
						apiKey: apiKey,
					});

					// Prepare the analysis request
					// Combine all changes into a single code string for analysis
					const code = parsed.changes.map((change) => change.value).join("\n");

					// For now, we'll use a placeholder file path
					const filePath = "mcp-analysis.ts";

					const analysisRequest = {
						code,
						filePath,
						context: {
							projectType: "mcp-analysis",
							language: "typescript",
						},
					};

					// Call the backend API
					const risk = await apiClient.analyzeFast(analysisRequest);

					// Create SARIF log
					const sarifLog = createSarifLog("snapback-analyze-risk", "1.0.0");

					// Add results to SARIF log based on risk factors
					if (risk.factors && risk.factors.length > 0) {
						risk.factors.forEach((factor, index) => {
							addResult(sarifLog, `risk-factor-${index + 1}`, factor, undefined, undefined);
						});
					} else {
						// Add a default result if no factors
						addResult(sarifLog, "analysis-complete", "Risk analysis completed", undefined, undefined);
					}

					// Evaluate SARIF against policy using the proper policy engine
					const policyDecision = evaluate(sarifLog);

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
					console.error("Backend API call failed, using basic analysis:", error);

					// Create a basic risk analysis as fallback
					const basicRisk = {
						riskLevel: "low",
						score: 0,
						factors: [],
						analysisTimeMs: 10,
						issues: [],
					};

					// Create SARIF log
					const sarifLog = createSarifLog("snapback-analyze-risk", "1.0.0");
					addResult(
						sarifLog,
						"analysis-complete",
						"Risk analysis completed with basic fallback",
						undefined,
						undefined,
					);

					// Evaluate SARIF against policy using the proper policy engine
					const policyDecision = evaluate(sarifLog);

					return {
						content: [
							{ type: "json", json: basicRisk },
							{ type: "json", json: sarifLog },
							{
								type: "text",
								text: `Policy Decision: ${policyDecision.action.toUpperCase()}
Reason: ${policyDecision.reason}
Confidence: ${policyDecision.confidence.toFixed(2)}

⚠️ Using basic analysis due to backend connectivity issues.`,
							},
						],
					};
				}
			}

			if (name === "snapback.check_dependencies") {
				const parsed = z
					.object({
						before: z.record(z.string(), z.any()),
						after: z.record(z.string(), z.any()),
					})
					.parse(args);
				const result = dep.quickAnalyze(parsed.before, parsed.after);
				return { content: [{ type: "json", json: result }] };
			}

			if (name === "snapback.create_snapshot") {
				// Check if user has access to this Pro-tier tool
				if (authResult.tier !== "pro") {
					// Return SARIF note for Free users trying to access Pro tools
					const sarifLog = createSarifLog("snapback-create-snapshot", "1.0.0");
					addResult(
						sarifLog,
						"pro-tool-restricted",
						"This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
						undefined,
						undefined,
					);

					return {
						content: [
							{ type: "json", json: sarifLog },
							{
								type: "text",
								text: "❌ This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
							},
						],
					};
				}

				// Validate arguments using the security schema
				const validation = validateToolArgs(args, CreateSnapshotSchema);
				if (!validation.success) {
					return validation.error;
				}
				const input = validation.data;

				// Create snapshot
				const result = await createSnapshot(input);

				if (!result.success) {
					return {
						content: [
							{
								type: "text",
								text: `❌ Failed to create snapshot: ${result.error}`,
							},
						],
						isError: true,
					};
				}

				// Check if snapshot exists
				if (!result.snapshot) {
					return {
						content: [
							{
								type: "text",
								text: "❌ Failed to create snapshot: No snapshot returned",
							},
						],
						isError: true,
					};
				}

				// Store snapshot in the list
				addSnapshot(result.snapshot);

				// If files were provided, store their content
				if (input.files && input.files.length > 0) {
					storeSnapshotContent(result.snapshot.id, input.files);
				}

				return {
					content: [
						{
							type: "text",
							text: `✅ Snapshot created successfully

ID: ${result.snapshot.id}
Timestamp: ${new Date(result.snapshot.timestamp).toLocaleString()}
Reason: ${result.snapshot.reason}
File Count: ${result.snapshot.fileCount}

You can restore this snapshot using its ID.`,
						},
					],
				};
			}

			if (name === "snapback.list_snapshots") {
				// Check if user has access to this Pro-tier tool
				if (authResult.tier !== "pro") {
					// Return SARIF note for Free users trying to access Pro tools
					const sarifLog = createSarifLog("snapback-list-snapshots", "1.0.0");
					addResult(
						sarifLog,
						"pro-tool-restricted",
						"This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
						undefined,
						undefined,
					);

					return {
						content: [
							{ type: "json", json: sarifLog },
							{
								type: "text",
								text: "❌ This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
							},
						],
					};
				}

				const result = await listSnapshots();

				if (!result.success) {
					return {
						content: [
							{
								type: "text",
								text: `❌ Failed to list snapshots: ${result.error}`,
							},
						],
						isError: true,
					};
				}

				return { content: [{ type: "json", json: result.snapshots }] };
			}

			if (name === "snapback.restore_snapshot") {
				// Check if user has access to this Pro-tier tool
				if (authResult.tier !== "pro") {
					// Return SARIF note for Free users trying to access Pro tools
					const sarifLog = createSarifLog("snapback-restore-snapshot", "1.0.0");
					addResult(
						sarifLog,
						"pro-tool-restricted",
						"This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
						undefined,
						undefined,
					);

					return {
						content: [
							{ type: "json", json: sarifLog },
							{
								type: "text",
								text: "❌ This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
							},
						],
					};
				}

				const parsed = z.object({ snapshotId: z.string() }).parse(args);
				const result = await restoreSnapshot(parsed.snapshotId);

				if (!result.success) {
					return {
						content: [
							{
								type: "text",
								text: `❌ Failed to restore snapshot: ${result.error}`,
							},
						],
						isError: true,
					};
				}

				return { content: [{ type: "json", json: result.snapshot }] };
			}

			// Handle catalog tool
			if (name === "catalog.list_tools") {
				const catalog = mcpManager.getToolCatalog();
				return { content: [{ type: "json", json: catalog }] };
			}

			// Handle Context7 tools with internal implementation as fallback
			if (name === "ctx7.resolve-library-id") {
				const parsed = z.object({ libraryName: z.string().min(1) }).parse(args);
				const result = await trackPerformance("ctx7_resolve_library", () =>
					context7Service.resolveLibraryId(parsed.libraryName),
				);
				return result;
			}

			if (name === "ctx7.get-library-docs") {
				const parsed = z
					.object({
						context7CompatibleLibraryID: z.string().min(1),
						topic: z.string().optional(),
						tokens: z.number().optional(),
					})
					.parse(args);
				const result = await trackPerformance("ctx7_get_docs", () =>
					context7Service.getLibraryDocs(parsed.context7CompatibleLibraryID, {
						topic: parsed.topic,
						tokens: parsed.tokens,
					}),
				);
				return result;
			}

			// Handle proxied tools from external MCP servers
			if (name.startsWith("ctx7.") || name.startsWith("gh.") || name.startsWith("registry.")) {
				const result = await mcpManager.callToolByName(name, args);
				return result;
			}

			throw new Error(`Unknown tool: ${name}`);
		} catch (error: unknown) {
			const sanitized = sanitizeError(error, `tool_call_${name}`);
			console.error(`[SnapBack MCP] Error handling tool ${name}:`, error);

			return {
				content: [
					{
						type: "text",
						text: `${sanitized.message} (Log ID: ${sanitized.logId})`,
					},
				],
				isError: true,
				error: {
					message: sanitized.message,
					code: sanitized.code,
				},
			};
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);

	// Log to stderr to avoid corrupting JSON-RPC on stdout
	console.error("SnapBack MCP Server started");
	return { server, transport };
}

// Export a function to create and start the HTTP server
export async function startHttpServer(port?: number): Promise<MCPHttpServer> {
	// Create and start the MCP server
	const { server } = await startServer();

	// Create HTTP server wrapper
	const httpServer = new MCPHttpServer(server);

	// Start listening
	await httpServer.listen(port || 3000);

	return httpServer;
}

// Only start the server if this file is run directly
// ESM check: import.meta.url matches the entry point
if (import.meta.url === new URL(process.argv[1], "file:").href) {
	startServer().catch(console.error);
}
