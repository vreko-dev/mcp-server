/**
 * AI Client Detection Module
 *
 * Detects installed AI assistants (Claude Desktop, Cursor, Windsurf, Continue)
 * and checks their MCP configuration status.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import type { AIClientConfig, AIClientFormat, DetectionResult, MCPConfig } from "./types.js";

// =============================================================================
// CLIENT PATH CONFIGURATION
// =============================================================================

/**
 * Platform-specific config path resolvers for each AI client
 * Note: User preference is project-level configs where supported
 */
const CLIENT_CONFIGS: Record<string, (home: string, cwd?: string) => string[]> = {
	claude: (home) => {
		switch (platform()) {
			case "darwin":
				return [join(home, "Library/Application Support/Claude/claude_desktop_config.json")];
			case "win32":
				return [join(process.env.APPDATA || "", "Claude/claude_desktop_config.json")];
			default:
				return [join(home, ".config/Claude/claude_desktop_config.json")];
		}
	},
	// Project-level first (user preference), then global fallback
	cursor: (_home, cwd) => [...(cwd ? [join(cwd, ".cursor/mcp.json")] : []), join(_home, ".cursor/mcp.json")],
	windsurf: (home) => [join(home, ".codeium/windsurf/mcp_config.json")],
	continue: (home) => [join(home, ".continue/config.json")],
	// New clients
	vscode: (_home, cwd) => [...(cwd ? [join(cwd, ".vscode/mcp.json")] : [])],
	zed: (home) => [join(home, ".config/zed/settings.json")],
	cline: (home) => [join(home, ".cline/mcp.json")],
	gemini: (home) => [join(home, ".gemini/settings.json")],
	aider: (home) => [join(home, ".aider/mcp.yaml")],
	"roo-code": (home) => [join(home, ".roo-code/mcp.json")],
};

/**
 * Display names for AI clients
 */
const CLIENT_DISPLAY_NAMES: Record<string, string> = {
	claude: "Claude Desktop",
	cursor: "Cursor",
	windsurf: "Windsurf",
	continue: "Continue",
	vscode: "VS Code",
	zed: "Zed",
	cline: "Cline",
	gemini: "Gemini/Antigravity",
	aider: "Aider",
	"roo-code": "Roo Code",
};

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect all AI clients and their configuration status
 *
 * @param options - Detection options
 * @param options.cwd - Current working directory for project-level configs
 * @returns Detection result with all clients, detected clients, and clients needing setup
 *
 * @example
 * ```ts
 * const result = detectAIClients();
 * console.log(`Found ${result.detected.length} AI assistants`);
 *
 * for (const client of result.needsSetup) {
 *   console.log(`${client.displayName} needs SnapBack configuration`);
 * }
 * ```
 */
export function detectAIClients(options: { cwd?: string } = {}): DetectionResult {
	const home = homedir();
	const cwd = options.cwd || process.cwd();
	const clients: AIClientConfig[] = [];
	const seenPaths = new Set<string>();

	for (const [name, getPaths] of Object.entries(CLIENT_CONFIGS)) {
		const paths = getPaths(home, cwd);

		for (const configPath of paths) {
			// Avoid duplicate entries for same path
			if (seenPaths.has(configPath)) continue;
			seenPaths.add(configPath);

			const exists = existsSync(configPath);
			let hasSnapback = false;

			if (exists) {
				try {
					const content = readFileSync(configPath, "utf-8");
					// Handle YAML for aider
					if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
						hasSnapback = content.includes("snapback");
					} else {
						const parsed = JSON.parse(content) as unknown;
						hasSnapback = checkForSnapback(parsed, name as AIClientFormat);
					}
				} catch {
					// Invalid JSON/YAML or read error - treat as no snapback
				}
			}

			clients.push({
				name,
				displayName: CLIENT_DISPLAY_NAMES[name] || name,
				configPath,
				exists,
				hasSnapback,
				format: name as AIClientFormat,
			});
		}
	}

	const detected = clients.filter((c) => c.exists);
	const needsSetup = detected.filter((c) => !c.hasSnapback);

	return { clients, detected, needsSetup };
}

/**
 * Check if a specific AI client is installed
 *
 * @param clientName - Name of the client to check (claude, cursor, windsurf, continue)
 * @returns The client config if found, undefined otherwise
 */
export function getClient(clientName: string): AIClientConfig | undefined {
	const result = detectAIClients();
	return result.clients.find((c) => c.name === clientName && c.exists);
}

/**
 * Get all clients that have SnapBack configured
 *
 * @returns Array of configured clients
 */
export function getConfiguredClients(): AIClientConfig[] {
	const result = detectAIClients();
	return result.detected.filter((c) => c.hasSnapback);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if SnapBack is configured in a config object
 */
function checkForSnapback(config: unknown, format: AIClientFormat): boolean {
	if (!config || typeof config !== "object") return false;

	const configObj = config as Record<string, unknown>;

	switch (format) {
		case "claude":
		case "cursor":
		case "windsurf":
		case "vscode":
		case "cline":
		case "roo-code":
			// These use mcpServers.snapback format
			if (
				"mcpServers" in configObj &&
				typeof configObj.mcpServers === "object" &&
				configObj.mcpServers !== null
			) {
				const servers = configObj.mcpServers as Record<string, unknown>;
				return "snapback" in servers;
			}
			return false;

		case "gemini":
		case "zed":
			// These embed mcpServers inside a settings object
			// Check both top-level and nested mcpServers
			if (
				"mcpServers" in configObj &&
				typeof configObj.mcpServers === "object" &&
				configObj.mcpServers !== null
			) {
				const servers = configObj.mcpServers as Record<string, unknown>;
				return "snapback" in servers;
			}
			return false;

		case "continue":
			// Continue uses a different structure - check for experimental.modelContextProtocolServers
			if (
				"experimental" in configObj &&
				typeof configObj.experimental === "object" &&
				configObj.experimental !== null
			) {
				const experimental = configObj.experimental as Record<string, unknown>;
				if (
					"modelContextProtocolServers" in experimental &&
					Array.isArray(experimental.modelContextProtocolServers)
				) {
					return experimental.modelContextProtocolServers.some(
						(server: unknown) =>
							typeof server === "object" &&
							server !== null &&
							(server as Record<string, unknown>).name === "snapback",
					);
				}
			}
			return false;

		case "aider":
			// Aider uses YAML - handled separately in detectAIClients
			return false;

		default:
			return false;
	}
}

/**
 * Get the expected config path for a client on the current platform
 *
 * @param clientName - Name of the client
 * @returns The config path or undefined if unknown client
 */
export function getClientConfigPath(clientName: string): string | undefined {
	const getPaths = CLIENT_CONFIGS[clientName];
	if (!getPaths) return undefined;

	const paths = getPaths(homedir());
	return paths[0];
}

/**
 * Read and parse a client's MCP config file
 *
 * @param client - The client to read config for
 * @returns Parsed config or undefined if not found/invalid
 */
export function readClientConfig(client: AIClientConfig): MCPConfig | undefined {
	try {
		const content = readFileSync(client.configPath, "utf-8");
		return JSON.parse(content) as MCPConfig;
	} catch {
		return undefined;
	}
}
