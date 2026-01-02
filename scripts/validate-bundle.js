#!/usr/bin/env node
/**
 * Pre-deploy Bundle Validation Script
 *
 * Analyzes the tsup bundle to detect external imports and verifies
 * all required dependencies are available in node_modules.
 *
 * This prevents "Cannot find package X" errors in production.
 *
 * Usage: node scripts/validate-bundle.js [--fix]
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MONOREPO_ROOT = resolve(ROOT, "../..");

// ANSI colors for output
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/**
 * Extract all import statements from bundled JS
 */
function extractExternalImports(bundlePath) {
	const content = readFileSync(bundlePath, "utf-8");
	const imports = new Set();

	// Match various import patterns:
	// import X from "package"
	// import { X } from "package"
	// import "package"
	// await import("package")
	// require("package")
	const patterns = [
		/import\s+.*?\s+from\s+["']([^"'./][^"']*)["']/g,
		/import\s+["']([^"'./][^"']*)["']/g,
		/import\(["']([^"'./][^"']*)["']\)/g,
		/require\(["']([^"'./][^"']*)["']\)/g,
	];

	for (const pattern of patterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			// Extract package name (handle scoped packages)
			const importPath = match[1];
			let packageName;
			if (importPath.startsWith("@")) {
				// Scoped package: @scope/package or @scope/package/subpath
				const parts = importPath.split("/");
				packageName = `${parts[0]}/${parts[1]}`;
			} else {
				// Regular package: package or package/subpath
				packageName = importPath.split("/")[0];
			}

			// Skip Node.js built-ins
			if (packageName.startsWith("node:") || isNodeBuiltin(packageName)) {
				continue;
			}

			imports.add(packageName);
		}
	}

	return Array.from(imports).sort();
}

/**
 * Check if a module is a Node.js built-in
 */
function isNodeBuiltin(name) {
	const builtins = [
		"assert",
		"buffer",
		"child_process",
		"cluster",
		"console",
		"constants",
		"crypto",
		"dgram",
		"dns",
		"domain",
		"events",
		"fs",
		"http",
		"https",
		"module",
		"net",
		"os",
		"path",
		"perf_hooks",
		"process",
		"punycode",
		"querystring",
		"readline",
		"repl",
		"stream",
		"string_decoder",
		"sys",
		"timers",
		"tls",
		"tty",
		"url",
		"util",
		"v8",
		"vm",
		"worker_threads",
		"zlib",
	];
	return builtins.includes(name);
}

/**
 * Check if a package exists in node_modules (works with hoisted deps)
 */
function packageExists(packageName, nodeModulesPath) {
	// Check direct path
	const directPath = join(nodeModulesPath, packageName);
	if (existsSync(directPath)) {
		return { exists: true, path: directPath };
	}

	// Check in .pnpm (for non-hoisted)
	const pnpmPath = join(nodeModulesPath, ".pnpm");
	if (existsSync(pnpmPath)) {
		const pnpmDirs = readdirSync(pnpmPath);
		const normalizedName = packageName.replace("/", "+");
		const found = pnpmDirs.find((d) => d.startsWith(`${normalizedName}@`));
		if (found) {
			return { exists: true, path: join(pnpmPath, found), hoisted: false };
		}
	}

	return { exists: false };
}

/**
 * Main validation logic
 */
async function main() {
	const args = process.argv.slice(2);
	const fixMode = args.includes("--fix");
	const verbose = args.includes("--verbose") || args.includes("-v");

	console.log(`${BOLD}${CYAN}🔍 MCP Server Bundle Validation${RESET}\n`);

	// Check bundle exists
	const bundlePath = join(ROOT, "dist/index.js");
	if (!existsSync(bundlePath)) {
		console.log(`${YELLOW}⚠️  Bundle not found. Building...${RESET}`);
		const { execSync } = await import("node:child_process");
		execSync("pnpm build", { cwd: ROOT, stdio: "inherit" });
		console.log();
	}

	// Extract external imports
	console.log(`${CYAN}Analyzing bundle for external imports...${RESET}`);
	const externalImports = extractExternalImports(bundlePath);
	console.log(`Found ${externalImports.length} external dependencies\n`);

	if (verbose) {
		console.log(`${CYAN}External imports:${RESET}`);
		externalImports.forEach((pkg) => console.log(`  - ${pkg}`));
		console.log();
	}

	// Check each dependency
	const nodeModulesPath = join(MONOREPO_ROOT, "node_modules");
	const missing = [];
	const found = [];
	const notHoisted = [];

	for (const pkg of externalImports) {
		const result = packageExists(pkg, nodeModulesPath);
		if (!result.exists) {
			missing.push(pkg);
		} else if (result.hoisted === false) {
			notHoisted.push(pkg);
		} else {
			found.push(pkg);
		}
	}

	// Report results
	console.log(`${BOLD}Results:${RESET}`);
	console.log(`${GREEN}✅ Found (hoisted): ${found.length}${RESET}`);
	if (notHoisted.length > 0) {
		console.log(`${YELLOW}⚠️  Found (not hoisted): ${notHoisted.length}${RESET}`);
		notHoisted.forEach((pkg) => console.log(`   - ${pkg}`));
	}

	if (missing.length > 0) {
		console.log(`${RED}❌ Missing: ${missing.length}${RESET}`);
		missing.forEach((pkg) => console.log(`   - ${pkg}`));
		console.log();

		if (fixMode) {
			console.log(`${CYAN}Attempting to fix by adding missing dependencies...${RESET}`);
			const { execSync } = await import("node:child_process");
			for (const pkg of missing) {
				console.log(`  Adding ${pkg}...`);
				try {
					execSync(`pnpm add ${pkg}`, { cwd: ROOT, stdio: "pipe" });
					console.log(`  ${GREEN}✅ Added ${pkg}${RESET}`);
				} catch (_e) {
					console.log(`  ${RED}❌ Failed to add ${pkg}${RESET}`);
				}
			}
		} else {
			console.log(`${YELLOW}💡 Run with --fix to automatically add missing dependencies${RESET}`);
			console.log("   Or add them manually to apps/mcp-server/package.json");
		}

		process.exit(1);
	}

	console.log(`\n${GREEN}${BOLD}✅ All external dependencies are available!${RESET}`);
	console.log(`${CYAN}Bundle is ready for deployment.${RESET}\n`);

	// Docker simulation tip
	console.log(`${CYAN}💡 Tip: Test locally with Docker before deploying:${RESET}`);
	console.log("   pnpm --filter=snapback-mcp-server docker:test\n");
}

main().catch((err) => {
	console.error(`${RED}Error: ${err.message}${RESET}`);
	process.exit(1);
});
