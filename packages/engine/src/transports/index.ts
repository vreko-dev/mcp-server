/**
 * Transport Adapters
 *
 * This module exports transport adapters for different interfaces:
 * - MCP: Model Context Protocol for Claude Desktop and other MCP clients
 * - HTTP: REST API endpoints for web applications
 * - CLI: Command-line interface for local development
 */

// MCP Transport
export {
	type MCPChange,
	type MCPDependencyResult,
	MCPEngineAdapter,
	type MCPIssue,
	type MCPRiskResult,
} from "./mcp.js";

// HTTP Transport (TODO: Week 5)
// export { HTTPEngineAdapter } from './http.js';

// CLI Transport (TODO: Week 5)
// export { CLIEngineAdapter } from './cli.js';
