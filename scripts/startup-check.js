#!/usr/bin/env node
/**
 * Startup Dependency Check
 *
 * Runs before the main server starts to validate all required
 * dependencies can be loaded. Provides clear error messages
 * instead of cryptic Node.js module resolution errors.
 *
 * This script is designed to run in the production Docker container.
 */

const REQUIRED_PACKAGES = [
	// Core runtime dependencies (externalized by tsup)
	"drizzle-orm",
	"pg",
	"zod",
	"atomically",
	// Add more as needed
];

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

console.log(`${BOLD}${CYAN}🔍 MCP Server Startup Check${RESET}\n`);

const missing = [];
const found = [];

for (const pkg of REQUIRED_PACKAGES) {
	try {
		// Use dynamic import to check if package can be resolved
		require.resolve(pkg);
		found.push(pkg);
	} catch (e) {
		missing.push({ name: pkg, error: e.message });
	}
}

// Report found packages
if (found.length > 0) {
	console.log(`${GREEN}✅ Found ${found.length} required packages${RESET}`);
}

// Report missing packages
if (missing.length > 0) {
	console.log(`${RED}${BOLD}❌ Missing ${missing.length} required packages:${RESET}`);
	for (const { name } of missing) {
		console.log(`${RED}   - ${name}${RESET}`);
	}
	console.log();
	console.log(`${YELLOW}This usually means:${RESET}`);
	console.log("  1. The package is a transitive dependency not hoisted to root node_modules");
	console.log("  2. pnpm install was not run with --shamefully-hoist");
	console.log("  3. The package needs to be added explicitly to dependencies");
	console.log();
	console.log(`${CYAN}To fix:${RESET}`);
	console.log("  - Ensure Dockerfile uses: pnpm install --shamefully-hoist");
	console.log("  - Or add missing packages to apps/mcp-server/package.json");
	console.log();
	process.exit(1);
}

// Check environment variables
console.log(`${CYAN}Checking environment...${RESET}`);
const envChecks = [
	{ name: "PORT", required: false, default: "8080" },
	{ name: "NODE_ENV", required: false, default: "development" },
	{ name: "DATABASE_URL", required: false, sensitive: true },
];

for (const check of envChecks) {
	const value = process.env[check.name];
	if (value) {
		const displayValue = check.sensitive ? "[SET]" : value;
		console.log(`${GREEN}  ✓ ${check.name}=${displayValue}${RESET}`);
	} else if (check.required) {
		console.log(`${RED}  ✗ ${check.name} (required, not set)${RESET}`);
	} else {
		console.log(`${YELLOW}  - ${check.name} (using default: ${check.default})${RESET}`);
	}
}

console.log();
console.log(`${GREEN}${BOLD}✅ Startup checks passed!${RESET}`);
console.log(`${CYAN}Starting MCP server...${RESET}\n`);
