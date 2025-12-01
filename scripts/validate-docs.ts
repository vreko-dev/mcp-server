#!/usr/bin/env tsx

/**
 * Documentation Build Validation Script
 *
 * Validates that all required documentation build files exist before building.
 * This catches fumadocs-mdx generation failures early.
 *
 * Usage:
 *   - Add to package.json: "prebuild": "tsx scripts/validate-docs.ts"
 *   - Run manually: pnpm tsx scripts/validate-docs.ts
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

const APPS_WEB_DIR = join(process.cwd(), "apps/web");

const requiredFiles = [".source/index.ts", ".source/source.config.mjs"];

let hasError = false;

console.log("🔍 Validating documentation build files...\n");

for (const file of requiredFiles) {
	const filePath = join(APPS_WEB_DIR, file);
	if (!existsSync(filePath)) {
		console.error(`❌ Missing required file: ${file}`);
		console.error("   Run: pnpm -F @snapback/web postinstall");
		console.error("   Or: cd apps/web && pnpm fumadocs-mdx\n");
		hasError = true;
	} else {
		console.log(`✅ Found: ${file}`);
	}
}

if (hasError) {
	console.error("\n❌ Documentation validation failed");
	console.error("   Please run the fumadocs-mdx generator before building.\n");
	process.exit(1);
}

console.log("\n✅ Documentation build files validated successfully");
process.exit(0);
