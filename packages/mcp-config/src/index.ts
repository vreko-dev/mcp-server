/**
 * @snapback/mcp-config
 *
 * AI client detection and MCP configuration for SnapBack.
 * Shared module used by both VS Code extension and CLI.
 *
 * @packageDocumentation
 */

// Detection
export {
	detectAIClients,
	getClient,
	getClientConfigPath,
	getConfiguredClients,
	readClientConfig,
} from "./detect.js";
// Types
export type {
	AIClientConfig,
	AIClientFormat,
	DetectionResult,
	MCPConfig,
	MCPServerConfig,
	RemoveResult,
	SnapbackConfigOptions,
	SnapbackMCPConfig,
	WriteResult,
} from "./types.js";

// Writing
export {
	getSnapbackMCPConfig,
	removeSnapbackConfig,
	validateConfig,
	writeClientConfig,
} from "./write.js";
