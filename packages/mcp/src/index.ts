/**
 * @snapback/mcp - MCP Server Library
 *
 * Provides MCP server creation and transport for the SnapBack CLI.
 * This package contains no CLI concerns - it only knows how to create
 * and run an MCP server given configuration.
 *
 * @example
 * ```typescript
 * import { createMcpServer, runStdioMcpServer } from "@snapback/mcp";
 *
 * await runStdioMcpServer({
 *   workspaceRoot: "/path/to/workspace",
 *   config: loadedConfig,
 * });
 * ```
 *
 * @module @snapback/mcp
 */

// Analyze before apply (threat detection for code changes)
export {
	type AnalysisResult,
	analyzeBeforeApply,
	type DiffChange,
	formatAnalysisResult,
} from "./analyze_before_apply.js";
// Branding system (voice, messaging, and wire format helpers)
export {
	BRAND_PREFIX,
	buildCheckResponse,
	buildEndResponse,
	buildErrorResponse,
	buildLearnResponse,
	buildListResponse,
	buildRestoreResponse,
	buildStartResponse,
	buildViolationResponse,
	compress,
	formatMessage,
	formatToolResult,
	formatWire,
	getRelativeTime,
	getRelativeTimeHuman,
	messages,
	WIRE_PREFIX,
	type WireResponse,
} from "./branding/index.js";
// Bridge (extension communication)
export {
	BridgeReceiver,
	type BridgeReceiverConfig,
	type BridgeReceiverStatus,
	createPatternObservation,
	createProgressObservation,
	createRiskObservation,
	createSuggestionObservation,
	createWarningObservation,
	getBridgeReceiver,
	startBridgeReceiver,
	stopBridgeReceiver,
} from "./bridge/index.js";
// Client exports
export { type ApiClientConfig, SnapBackAPIClient } from "./client/api-client.js";
export { MCP_ROUTES, type McpRouteKey } from "./client/routes.js";
// Error utilities
export {
	CommonErrors,
	createRequestContext,
	type ErrorCode,
	ErrorCodes,
	type LogEntry,
	type LogLevel,
	log,
	logError,
	logSuccess,
	type RequestContext,
} from "./errors.js";
// Facade handlers
export { facadeHandlers } from "./facades/handlers.js";
// Intelligence facade (singleton per workspace)
export {
	disposeAllIntelligence,
	disposeIntelligence,
	getActiveInstanceCount,
	getIntelligence,
	initializeIntelligence,
} from "./facades/intelligence.js";
// Session health wrapper
export {
	type EnhancedToolResult,
	getRecommendedAction,
	getSessionHealth,
	isRiskyState,
	type SessionHealth,
	sessionAwareResult,
	wrapWithSessionHealth,
} from "./facades/session-health.js";
// Registry and tool types
export {
	FACADE_TOOLS,
	listFacadeTools,
	type SnapBackTool,
	type ToolContext,
	type ToolHandler,
	type ToolResult,
	tools,
} from "./registry.js";
// Main server exports
export { createMcpServer, type McpServerOptions } from "./server.js";
// Session state
export {
	type CurrentTask,
	drainPendingObservations,
	endTask,
	extractKeywords,
	type FileChange,
	formatDuration,
	generateTaskId,
	getCurrentTask,
	getSessionState,
	type MCPSessionState,
	type Observation,
	pushObservation,
	type RiskArea,
	recordFileChange,
	startTask,
	updateSessionState,
} from "./session/state.js";
// Transport
export { runStdioMcpServer } from "./transport/stdio.js";
