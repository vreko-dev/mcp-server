/**
 * Environment loader - must be imported FIRST before any other modules
 *
 * This loads .env.local synchronously before ESM imports resolve.
 *
 * Note: We use override: true to ensure .env.local values take precedence
 * over shell environment variables. This is important because MCP clients
 * often run with NODE_ENV=production in the shell, but we need development
 * mode for local testing.
 *
 * If you're using Infisical or another secrets manager, their injected
 * values should be set AFTER this loader runs, or you can set specific
 * variables in .env.local to override them.
 *
 * We use a custom .env parser instead of dotenv because dotenv v17+
 * outputs debug info to stdout which breaks MCP JSON-RPC communication.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of this file
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Simple .env parser that doesn't output to stdout
 * dotenv v17+ outputs debug info to stdout which breaks MCP JSON-RPC
 */
function loadEnvFile(filePath: string, override: boolean): void {
	if (!existsSync(filePath)) return;

	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	for (const line of lines) {
		// Skip comments and empty lines
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		// Parse KEY=value
		const match = trimmed.match(/^([^=]+)=(.*)$/);
		if (match) {
			const key = match[1].trim();
			let value = match[2].trim();

			// Remove surrounding quotes
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}

			// Only set if not already set (unless override)
			if (override || process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
	}
}

// Try to load .env.local from the app directory
// Use override: true to ensure .env.local values take precedence over shell environment
// This is needed because MCP clients may set NODE_ENV=production in shell
// Note: We suppress startup logs because some MCP clients treat stderr output as errors
const envPath = resolve(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
	loadEnvFile(envPath, true);
} else {
	// Fallback: try from current working directory
	const cwdEnvPath = resolve(process.cwd(), ".env.local");
	if (existsSync(cwdEnvPath)) {
		loadEnvFile(cwdEnvPath, true);
	}
	// Silently continue if no .env.local - environment may come from .mcp.json env block
}
