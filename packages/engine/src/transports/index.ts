/**
 * Transport Adapters
 *
 * This module exports transport adapters for different interfaces:
 * - MCP: Model Context Protocol for Claude Desktop and other MCP clients
 * - HTTP: REST API endpoints for web applications
 * - CLI: Command-line interface for local development
 */

// Shared utilities (risk thresholds, score classification)
export {
	getExitCode,
	HIGH_RISK_EXIT_THRESHOLD,
	isHighRisk,
	RISK_THRESHOLDS,
	type RiskLevel,
	scoreToRiskLevel,
} from "./shared.js";

// MCP Transport
export {
	type MCPChange,
	type MCPDependencyResult,
	MCPEngineAdapter,
	type MCPIssue,
	type MCPRiskResult,
} from "./mcp.js";

// HTTP Transport
export {
	HTTPEngineAdapter,
	type HTTPFileInput,
	type HTTPRiskFactor,
	type HTTPRiskResponse,
} from "./http.js";

// CLI Transport
export {
	CLIEngineAdapter,
	type CLIFileInput,
	type CLIInput,
	type CLIOutput,
} from "./cli.js";
