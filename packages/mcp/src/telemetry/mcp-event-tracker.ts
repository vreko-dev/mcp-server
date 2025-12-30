/**
 * MCP Event Tracker
 *
 * Tracks MCP tool usage telemetry for product analytics.
 * Events: mcp_tool_called, mcp_context_provided, mcp_agent_self_check
 *
 * Schema Reference: packages/infrastructure/src/metrics/core/events.ts
 * Pattern Reference: apps/vscode/src/telemetry/core-event-tracker.ts
 *
 * Design Decisions:
 * - Opt-in via McpServerOptions.telemetry
 * - Fire-and-forget pattern to avoid blocking tool execution
 * - Parameter sanitization to protect sensitive data
 * - Client type detection for cross-platform analytics
 *
 * @package packages/mcp
 */

/**
 * Properties for mcp_tool_called event
 */
export interface McpToolCalledProps {
	/** Name of the tool called */
	tool_name: string;
	/** Client type (vscode, jetbrains, cli, api) */
	client_type: "vscode" | "jetbrains" | "cli" | "api";
	/** Sanitized parameters (no secrets, paths redacted) */
	parameters: Record<string, unknown>;
	/** Execution time in milliseconds */
	execution_time_ms: number;
	/** Whether the tool call succeeded */
	was_successful: boolean;
	/** Error code if failed */
	error_code?: string;
}

/**
 * Properties for mcp_context_provided event
 */
export interface McpContextProvidedProps {
	/** Type of context provided (snapshot, session, file, pattern) */
	context_type: string;
	/** Size in bytes (approximate) */
	size_bytes: number;
	/** Time to gather context in milliseconds */
	gather_time_ms: number;
	/** Number of items in context */
	item_count: number;
}

/**
 * Properties for mcp_agent_self_check event
 */
export interface McpAgentSelfCheckProps {
	/** Check type (patterns, violations, coverage) */
	check_type: string;
	/** Number of issues found */
	issues_found: number;
	/** Highest severity of issues */
	highest_severity: "info" | "low" | "medium" | "high" | "critical";
	/** Time to run check in milliseconds */
	check_time_ms: number;
}

/**
 * Telemetry sink interface
 */
export interface TelemetrySink {
	log: (event: string, data: Record<string, unknown>) => void;
}

/**
 * Event names for MCP telemetry
 */
export const MCP_EVENTS = {
	TOOL_CALLED: "mcp_tool_called",
	CONTEXT_PROVIDED: "mcp_context_provided",
	AGENT_SELF_CHECK: "mcp_agent_self_check",
} as const;

/**
 * Parameter keys to redact for privacy
 */
const SENSITIVE_KEYS = new Set([
	"path",
	"filePath",
	"file_path",
	"code",
	"content",
	"secret",
	"token",
	"password",
	"key",
	"apiKey",
	"api_key",
]);

/**
 * Sanitize parameters for telemetry
 * Removes or redacts sensitive information
 */
function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(params)) {
		if (SENSITIVE_KEYS.has(key.toLowerCase())) {
			// Redact sensitive values but keep key for analytics
			sanitized[key] = "[redacted]";
		} else if (typeof value === "string" && value.length > 100) {
			// Truncate long strings
			sanitized[key] = `${value.slice(0, 50)}...[truncated]`;
		} else if (Array.isArray(value)) {
			// For arrays, just record count
			sanitized[key] = `[array:${value.length}]`;
		} else if (typeof value === "object" && value !== null) {
			// For nested objects, record structure
			sanitized[key] = `[object:${Object.keys(value).length} keys]`;
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * MCP Event Tracker class
 * Handles MCP-specific telemetry events
 */
export class McpEventTracker {
	constructor(private telemetry: TelemetrySink | null) {}

	/**
	 * Track tool call event
	 *
	 * Called after each tool execution in server.ts
	 *
	 * @param props - Tool call properties
	 */
	trackToolCalled(props: McpToolCalledProps): void {
		if (!this.telemetry) return;

		this.telemetry.log(MCP_EVENTS.TOOL_CALLED, {
			...props,
			parameters: sanitizeParams(props.parameters),
			timestamp: Date.now(),
		});
	}

	/**
	 * Track context provided event
	 *
	 * Called when context is gathered for AI agents
	 *
	 * @param props - Context provided properties
	 */
	trackContextProvided(props: McpContextProvidedProps): void {
		if (!this.telemetry) return;

		this.telemetry.log(MCP_EVENTS.CONTEXT_PROVIDED, {
			...props,
			timestamp: Date.now(),
		});
	}

	/**
	 * Track agent self-check event
	 *
	 * Called when agent runs validation checks
	 *
	 * @param props - Self-check properties
	 */
	trackAgentSelfCheck(props: McpAgentSelfCheckProps): void {
		if (!this.telemetry) return;

		this.telemetry.log(MCP_EVENTS.AGENT_SELF_CHECK, {
			...props,
			timestamp: Date.now(),
		});
	}
}

// Singleton instance
let mcpEventTrackerInstance: McpEventTracker | null = null;

/**
 * Initialize the MCP event tracker
 *
 * @param telemetry - Telemetry sink for sending events
 */
export function initializeMcpEventTracker(telemetry: TelemetrySink | null): void {
	mcpEventTrackerInstance = new McpEventTracker(telemetry);
}

/**
 * Get the MCP event tracker singleton
 *
 * @returns McpEventTracker instance or null if not initialized
 */
export function getMcpEventTracker(): McpEventTracker | null {
	return mcpEventTrackerInstance;
}

/**
 * Create a tool call tracking helper for use in server.ts
 *
 * Returns a function that wraps tool execution with timing and tracking
 */
export function createToolCallTracker(telemetry: TelemetrySink | null, clientType: McpToolCalledProps["client_type"]) {
	const tracker = new McpEventTracker(telemetry);

	return async function trackToolCall<T>(
		toolName: string,
		params: Record<string, unknown>,
		executor: () => Promise<T>,
	): Promise<T> {
		const startTime = Date.now();
		let wasSuccessful = true;
		let errorCode: string | undefined;

		try {
			const result = await executor();
			return result;
		} catch (error) {
			wasSuccessful = false;
			errorCode = error instanceof Error ? error.name : "UNKNOWN_ERROR";
			throw error;
		} finally {
			tracker.trackToolCalled({
				tool_name: toolName,
				client_type: clientType,
				parameters: params,
				execution_time_ms: Date.now() - startTime,
				was_successful: wasSuccessful,
				...(errorCode && { error_code: errorCode }),
			});
		}
	};
}
