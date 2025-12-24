/**
 * MCP Server ConfigStore Integration
 *
 * Initializes and manages ConfigStore v2 for the MCP server.
 * Handles configuration precedence: .snapbackrc → ~/.snapbackrc → env vars → defaults
 *
 * @package @snapback/mcp-server
 */

import console from "node:console";
import { type ConfigStoreV2, getConfigStore, type MCPSettings } from "@snapback/config/server";

/**
 * Check if running in MCP quiet mode (suppress all non-error output for MCP stdio)
 */
const MCP_QUIET = process.env.MCP_QUIET === "1" || process.env.MCP_QUIET === "true";

/** Log to stderr only if not in quiet mode */
function mcpConfigLog(message: string, ...args: unknown[]): void {
	if (!MCP_QUIET) {
		console.error(message, ...args);
	}
}

/**
 * MCP Configuration Manager
 *
 * Singleton pattern for managing MCP configuration from ConfigStore.
 * Supports hot-reload via onChange() callbacks.
 */
export class MCPConfigManager {
	private static instance: MCPConfigManager | null = null;
	private config: MCPSettings | null = null;
	private listeners: Set<(config: MCPSettings) => void> = new Set();
	private unsubscribe: (() => void) | null = null;

	/**
	 * Get or create the singleton instance
	 */
	static async getInstance(): Promise<MCPConfigManager> {
		if (!MCPConfigManager.instance) {
			MCPConfigManager.instance = new MCPConfigManager();
			await MCPConfigManager.instance.initialize();
		}
		return MCPConfigManager.instance;
	}

	/**
	 * Initialize the config manager
	 * Loads config from ConfigStore and sets up hot-reload listener
	 */
	private async initialize(): Promise<void> {
		try {
			const store = await getConfigStore({
				workspaceRoot: process.cwd(),
			});

			// Load initial MCP config
			const fullConfig = store.getConfig();
			this.config = fullConfig.settings?.mcp || {};
			mcpConfigLog("[MCP Config] Initialized from ConfigStore");

			// Wire hot-reload listener
			this.unsubscribe = store.onChange((updatedConfig: ConfigStoreV2) => {
				const newMcpConfig = updatedConfig.settings?.mcp || {};

				// Only notify if MCP config actually changed
				if (JSON.stringify(this.config) !== JSON.stringify(newMcpConfig)) {
					this.config = newMcpConfig;
					mcpConfigLog("[MCP Config] Configuration changed via hot-reload");

					// Notify all listeners
					for (const listener of this.listeners) {
						try {
							listener(this.config);
						} catch (error) {
							console.error("[MCP Config] Error in listener", error); // Always log errors
						}
					}
				}
			});

			mcpConfigLog("[MCP Config] Hot-reload watcher initialized");
		} catch (error) {
			console.error("[MCP Config] Failed to initialize", error); // Always log errors
			// Fallback to defaults - don't crash MCP startup
			this.config = {
				performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
				context7: { apiUrl: "https://context7.com/api", cacheTtlSearch: 3600, cacheTtlDocs: 86400 },
				api: { baseUrl: "https://api.snapback.dev" },
				http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
			};
		}
	}

	/**
	 * Get current MCP configuration
	 */
	getConfig(): MCPSettings {
		if (!this.config) {
			throw new Error("MCP Config not initialized");
		}
		return this.config;
	}

	/**
	 * Subscribe to configuration changes
	 */
	onChange(listener: (config: MCPSettings) => void): () => void {
		this.listeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Cleanup resources
	 */
	dispose(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		this.listeners.clear();
	}
}

/**
 * Get MCP config (convenience function)
 */
export async function getMCPConfig(): Promise<MCPSettings> {
	const manager = await MCPConfigManager.getInstance();
	return manager.getConfig();
}

/**
 * Subscribe to MCP config changes (convenience function)
 */
export async function onMCPConfigChange(listener: (config: MCPSettings) => void): Promise<() => void> {
	const manager = await MCPConfigManager.getInstance();
	return manager.onChange(listener);
}
