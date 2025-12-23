#!/usr/bin/env node
/**
 * Fix ESM imports across all packages after turbo build
 * Required for Node.js v22+ strict ESM compliance
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "../..");

// Packages that need ESM import fixing (use tsc without tsup handling it)
const packagesToFix = [
	"packages/contracts",
	"packages/infrastructure",
	"packages/config",
	"packages/core",
	"packages/engine",
	"packages/integrations",
	"packages/platform",
	"packages/sdk",
	"packages/auth",
	"packages-oss/contracts",
	"packages-oss/infrastructure",
	"packages-oss/config",
	"packages-oss/sdk",
	"packages-oss/events",
	"apps/mcp-server",
];

console.log(
	"[fix-all-esm-imports] Fixing ESM imports for Node.js v22+ compliance..."
);

for (const pkg of packagesToFix) {
	const distDir = join(rootDir, pkg, "dist");
	if (existsSync(distDir)) {
		try {
			// Run the fix script for this package
			execSync(`node ${join(__dirname, "add-js-extensions.mjs")}`, {
				cwd: join(rootDir, pkg),
				stdio: "inherit",
			});
		} catch (error) {
			console.error(
				`[fix-all-esm-imports] Failed to fix ${pkg}:`,
				error.message
			);
		}
	}
}

console.log("[fix-all-esm-imports] Done.");
