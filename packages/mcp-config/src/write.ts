/**
 * MCP Config Writer Module
 *
 * Writes SnapBack MCP configuration to AI client config files.
 * Handles backup creation, merging with existing config, and various formats.
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type {
	AIClientConfig,
	MCPConfig,
	MCPServerConfig,
	RemoveResult,
	SnapbackConfigOptions,
	WriteResult,
} from "./types.js";

// =============================================================================
// CONFIG GENERATION
// =============================================================================

/**
 * Generate SnapBack MCP server configuration
 *
 * @param options - Configuration options
 * @returns MCP server config for SnapBack
 *
 * @example
 * ```ts
 * // Basic config (uses npx)
 * const config = getSnapbackMCPConfig({});
 *
 * // With API key
 * const proConfig = getSnapbackMCPConfig({ apiKey: 'sk_...' });
 *
 * // Using binary instead of npx
 * const binaryConfig = getSnapbackMCPConfig({ useBinary: true });
 * ```
 */
export function getSnapbackMCPConfig(options: SnapbackConfigOptions = {}): MCPServerConfig {
	const { apiKey, useBinary = false, customCommand, additionalEnv } = options;

	// Build environment variables
	const env: Record<string, string> = { ...additionalEnv };
	if (apiKey) {
		env.SNAPBACK_API_KEY = apiKey;
	}

	// Determine command
	if (customCommand) {
		return {
			command: customCommand,
			args: [],
			...(Object.keys(env).length > 0 && { env }),
		};
	}

	if (useBinary) {
		return {
			command: "snapback-mcp",
			args: [],
			...(Object.keys(env).length > 0 && { env }),
		};
	}

	// Default: use npx for auto-updates
	return {
		command: "npx",
		args: ["-y", "@snapback/mcp-server"],
		...(Object.keys(env).length > 0 && { env }),
	};
}

// =============================================================================
// CONFIG WRITING
// =============================================================================

/**
 * Write SnapBack MCP config to an AI client's config file
 *
 * @param client - The AI client to configure
 * @param mcpConfig - The MCP server configuration
 * @returns Result of the write operation
 *
 * @example
 * ```ts
 * const client = getClient('cursor');
 * const mcpConfig = getSnapbackMCPConfig({ apiKey: 'sk_...' });
 *
 * const result = writeClientConfig(client, mcpConfig);
 * if (result.success) {
 *   console.log('Configured! Backup at:', result.backup);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export function writeClientConfig(client: AIClientConfig, mcpConfig: MCPServerConfig): WriteResult {
	try {
		// Ensure directory exists
		const configDir = dirname(client.configPath);
		mkdirSync(configDir, { recursive: true });

		// Read existing config or start fresh
		let existingConfig: MCPConfig = { mcpServers: {} };
		let hasExistingConfig = false;

		if (existsSync(client.configPath)) {
			try {
				const content = readFileSync(client.configPath, "utf-8");
				existingConfig = JSON.parse(content) as MCPConfig;
				hasExistingConfig = Object.keys(existingConfig).length > 0;
			} catch {
				// Invalid JSON, will overwrite
			}
		}

		// Create backup if there's existing content
		let backup: string | undefined;
		if (hasExistingConfig) {
			backup = `${client.configPath}.backup.${Date.now()}`;
			writeFileSync(backup, JSON.stringify(existingConfig, null, 2));
		}

		// Merge configs based on format
		const newConfig = mergeConfig(existingConfig, mcpConfig, client.format);

		// Write updated config
		writeFileSync(client.configPath, JSON.stringify(newConfig, null, 2));

		return { success: true, backup };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Remove SnapBack configuration from an AI client
 *
 * @param client - The AI client to remove config from
 * @returns Result of the removal operation
 */
export function removeSnapbackConfig(client: AIClientConfig): RemoveResult {
	try {
		if (!existsSync(client.configPath)) {
			return { success: true }; // Nothing to remove
		}

		const content = readFileSync(client.configPath, "utf-8");
		const config = JSON.parse(content) as MCPConfig;

		// Remove based on format
		switch (client.format) {
			case "claude":
			case "cursor":
			case "windsurf":
				if (config.mcpServers?.snapback) {
					delete config.mcpServers.snapback;
				}
				break;

			case "continue": {
				// Continue uses different structure
				const experimental = (config as unknown as Record<string, unknown>).experimental as
					| Record<string, unknown>
					| undefined;
				if (experimental?.modelContextProtocolServers) {
					const servers = experimental.modelContextProtocolServers as Array<{ name: string }>;
					experimental.modelContextProtocolServers = servers.filter((s) => s.name !== "snapback");
				}
				break;
			}
		}

		writeFileSync(client.configPath, JSON.stringify(config, null, 2));

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Merge SnapBack config into existing config based on format
 */
function mergeConfig(
	existing: MCPConfig,
	snapbackConfig: MCPServerConfig,
	format: AIClientConfig["format"],
): MCPConfig | Record<string, unknown> {
	switch (format) {
		case "claude":
		case "cursor":
		case "windsurf":
			// Standard mcpServers format
			return {
				...existing,
				mcpServers: {
					...(existing.mcpServers || {}),
					snapback: snapbackConfig,
				},
			};

		case "continue": {
			// Continue uses experimental.modelContextProtocolServers array
			const continueConfig = existing as unknown as Record<string, unknown>;
			const experimental = (continueConfig.experimental || {}) as Record<string, unknown>;
			const servers = (experimental.modelContextProtocolServers || []) as Array<Record<string, unknown>>;

			// Remove existing snapback if present
			const filteredServers = servers.filter((s) => s.name !== "snapback");

			// Add new snapback config
			filteredServers.push({
				name: "snapback",
				...snapbackConfig,
			});

			return {
				...continueConfig,
				experimental: {
					...experimental,
					modelContextProtocolServers: filteredServers,
				},
			};
		}

		default:
			// Fallback to standard format
			return {
				...existing,
				mcpServers: {
					...(existing.mcpServers || {}),
					snapback: snapbackConfig,
				},
			};
	}
}

/**
 * Validate that a config was written correctly
 *
 * @param client - Client to validate
 * @returns True if SnapBack is properly configured
 */
export function validateConfig(client: AIClientConfig): boolean {
	try {
		const content = readFileSync(client.configPath, "utf-8");
		const config = JSON.parse(content) as MCPConfig;

		switch (client.format) {
			case "claude":
			case "cursor":
			case "windsurf":
				return Boolean(config.mcpServers?.snapback?.command);

			case "continue": {
				const expCfg = (config as unknown as Record<string, unknown>).experimental as
					| Record<string, unknown>
					| undefined;
				const srvs = expCfg?.modelContextProtocolServers as
					| Array<{ name: string; command: string }>
					| undefined;
				return Boolean(srvs?.some((s) => s.name === "snapback" && s.command));
			}

			default:
				return false;
		}
	} catch {
		return false;
	}
}
