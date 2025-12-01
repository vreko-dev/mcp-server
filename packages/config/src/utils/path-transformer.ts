/**
 * Utility functions for transforming paths between client and server formats
 * Handles the conversion of paths for different application contexts
 */

// Define the nested client prefix
const CLIENT_PREFIX = ".client";

// Define the application mappings
const APP_MAPPINGS = {
	WEB: {
		client: "web",
		server: "apps/web",
	},
	CLI: {
		client: "cli",
		server: "apps/cli",
	},
	VSCODE: {
		client: "vscode",
		server: "apps/vscode",
	},
	MCP: {
		client: "mcp",
		server: "apps/mcp-server",
	},
	API: {
		client: "api",
		server: "apps/api",
	},
	CORE: {
		client: "core",
		server: "packages/core",
	},
	STORAGE: {
		client: "storage",
		server: "packages/storage",
	},
	ANALYTICS: {
		client: "analytics",
		server: "packages/analytics",
	},
	AUTH: {
		client: "auth",
		server: "packages/auth",
	},
	MAIL: {
		client: "mail",
		server: "packages/mail",
	},
	DATABASE: {
		client: "database",
		server: "packages/database",
	},
	UTILS: {
		client: "utils",
		server: "packages/utils",
	},
	CONTRACTS: {
		client: "contracts",
		server: "packages/contracts",
	},
	LOGS: {
		client: "logs",
		server: "packages/logs",
	},
	CONFIG: {
		client: "config",
		server: "packages/config",
	},
	SDK: {
		client: "sdk",
		server: "packages/sdk",
	},
	PAYMENTS: {
		client: "payments",
		server: "packages/payments",
	},
	SUPABASE: {
		client: "supabase",
		server: "packages/supabase",
	},
	TELEMETRY: {
		client: "telemetry",
		server: "packages/telemetry",
	},
	FEATURE_FLAGS: {
		client: "feature-flags",
		server: "packages/feature-flags",
	},
} as const;

/**
 * Transform a server path to a client path
 * @param serverPath - The server path to transform
 * @returns The transformed client path
 */
export function transformServerToClientPath(serverPath: string): string {
	// Handle the nested client structure
	if (serverPath.startsWith("apps/")) {
		const parts = serverPath.split("/");
		if (parts.length >= 2) {
			// Insert the client prefix after the apps directory
			parts.splice(1, 0, CLIENT_PREFIX);
			return parts.join("/");
		}
	}

	// Handle package paths
	if (serverPath.startsWith("packages/")) {
		const parts = serverPath.split("/");
		if (parts.length >= 2) {
			// Insert the client prefix after the packages directory
			parts.splice(1, 0, CLIENT_PREFIX);
			return parts.join("/");
		}
	}

	return serverPath;
}

/**
 * Transform a client path to a server path
 * @param clientPath - The client path to transform
 * @returns The transformed server path
 */
export function transformClientToServerPath(clientPath: string): string {
	// Remove the client prefix from nested paths
	return clientPath.replace(`/${CLIENT_PREFIX}/`, "/");
}

/**
 * Get all application mappings
 * @returns Object containing all application mappings
 */
export function getAppMappings() {
	return APP_MAPPINGS;
}

/**
 * Get the server path for a given client application name
 * @param clientAppName - The client application name
 * @returns The server path or undefined if not found
 */
export function getServerPathForClientApp(clientAppName: string): string | undefined {
	const mapping = Object.values(APP_MAPPINGS).find((app) => app.client === clientAppName);
	return mapping?.server;
}
