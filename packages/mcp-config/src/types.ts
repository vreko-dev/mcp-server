/**
 * MCP Config Types
 *
 * Shared types for AI client detection and MCP configuration.
 *
 * @packageDocumentation
 */

/**
 * Supported AI client config formats
 */
export type AIClientFormat =
	| "claude"
	| "cursor"
	| "windsurf"
	| "continue"
	| "vscode"
	| "zed"
	| "cline"
	| "gemini"
	| "aider"
	| "roo-code";

/**
 * Configuration for a detected AI client
 */
export interface AIClientConfig {
	/** Internal identifier */
	name: string;
	/** Display name for UI */
	displayName: string;
	/** Path to the config file */
	configPath: string;
	/** Whether the config file exists */
	exists: boolean;
	/** Whether SnapBack is already configured */
	hasSnapback: boolean;
	/** Config format type */
	format: AIClientFormat;
}

/**
 * Result of AI client detection
 */
export interface DetectionResult {
	/** All known clients with their status */
	clients: AIClientConfig[];
	/** Clients that exist (installed) */
	detected: AIClientConfig[];
	/** Clients that exist but don't have SnapBack configured */
	needsSetup: AIClientConfig[];
}

/**
 * MCP server configuration for a single server
 */
export interface MCPServerConfig {
	/** Command to run (e.g., "npx", "node") */
	command: string;
	/** Arguments to pass to the command */
	args?: string[];
	/** Environment variables */
	env?: Record<string, string>;
}

/**
 * Full MCP config structure (matches Claude/Cursor format)
 */
export interface MCPConfig {
	mcpServers: Record<string, MCPServerConfig>;
}

/**
 * SnapBack-specific MCP configuration
 */
export interface SnapbackMCPConfig extends MCPServerConfig {
	/** API key for Pro features */
	apiKey?: string;
}

/**
 * Options for generating SnapBack MCP config
 */
export interface SnapbackConfigOptions {
	/** API key for Pro features */
	apiKey?: string;
	/** Use installed binary instead of npx */
	useBinary?: boolean;
	/** Custom command override */
	customCommand?: string;
	/** Additional environment variables */
	additionalEnv?: Record<string, string>;
	/** Workspace root path (auto-inferred if not provided) */
	workspaceRoot?: string;
	/** Use local development mode (direct node execution) */
	useLocalDev?: boolean;
	/** Path to local CLI dist (for development) */
	localCliPath?: string;
}

/**
 * Result of writing config to a client
 */
export interface WriteResult {
	/** Whether the write succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Path to backup file if created */
	backup?: string;
}

/**
 * Result of removing SnapBack config
 */
export interface RemoveResult {
	/** Whether the removal succeeded */
	success: boolean;
	/** Error message if failed */
	error?: string;
}
