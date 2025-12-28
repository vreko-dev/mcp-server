#!/usr/bin/env node
/**
 * MCP Tool Name Validator
 *
 * Validates that all MCP tool names comply with the MCP specification:
 * - Pattern: ^[a-zA-Z0-9_-]{1,64}$
 * - Only alphanumeric, underscore, and hyphen allowed
 * - No dots, question marks, or special characters
 *
 * @see https://modelcontextprotocol.io/docs/specification
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MCP_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const CONSOLIDATED_TOOLS_DIR = "packages/mcp/src/tools/consolidated";

/**
 * Extract tool name from a TypeScript tool definition file
 */
function extractToolName(filePath) {
	const content = readFileSync(filePath, "utf-8");

	// Match: name: "tool_name" or name: 'tool_name'
	const matches = content.match(/name:\s*["']([^"']+)["']/g);

	if (!matches) return [];

	return matches
		.map((m) => {
			const nameMatch = m.match(/["']([^"']+)["']/);
			return nameMatch ? nameMatch[1] : null;
		})
		.filter(Boolean);
}

/**
 * Validate tool names against MCP spec
 */
function validateToolNames() {
	const errors = [];
	const valid = [];

	if (!existsSync(CONSOLIDATED_TOOLS_DIR)) {
		console.log(
			"⚠️  Consolidated tools directory not found, skipping validation"
		);
		return { errors: [], valid: [] };
	}

	const files = readdirSync(CONSOLIDATED_TOOLS_DIR).filter(
		(f) => f.endsWith(".ts") && f !== "index.ts" && f !== "registry.ts"
	);

	for (const file of files) {
		const filePath = join(CONSOLIDATED_TOOLS_DIR, file);
		const names = extractToolName(filePath);

		for (const name of names) {
			if (MCP_NAME_PATTERN.test(name)) {
				valid.push({ name, file });
			} else {
				errors.push({
					name,
					file,
					reason: getInvalidReason(name),
				});
			}
		}
	}

	return { errors, valid };
}

/**
 * Get reason why name is invalid
 */
function getInvalidReason(name) {
	if (name.includes(".")) return "dots not allowed (use underscores)";
	if (name.includes("?")) return "question marks not allowed";
	if (name.includes(" ")) return "spaces not allowed";
	if (name.length > 64) return "exceeds 64 character limit";
	if (!/^[a-zA-Z0-9_-]+$/.test(name)) return "contains invalid characters";
	return "unknown";
}

// Main execution
const { errors, valid } = validateToolNames();

if (valid.length > 0) {
	console.log(`✅ ${valid.length} MCP tool names valid`);
	for (const { name } of valid) {
		console.log(`   ✓ ${name}`);
	}
}

if (errors.length > 0) {
	console.error(`\n❌ ${errors.length} MCP tool name(s) invalid:`);
	console.error("   Pattern required: ^[a-zA-Z0-9_-]{1,64}$\n");

	for (const { name, file, reason } of errors) {
		console.error(`   ✗ "${name}" in ${file}`);
		console.error(`     → ${reason}`);
	}

	console.error(
		"\n💡 Fix: Use underscores instead of dots (e.g., snap_end not snap.end)"
	);
	process.exit(1);
}

console.log("\n✅ All MCP tool names comply with specification");
