#!/usr/bin/env node

/**
 * Post-install script to rebuild better-sqlite3 for Node.js runtime
 *
 * This ensures better-sqlite3 works correctly in Node.js environment,
 * separate from the Electron binary used by apps/vscode.
 *
 * Context:
 * - apps/vscode needs Electron binaries (MODULE_VERSION 107)
 * - packages/sdk needs Node.js binaries (MODULE_VERSION 127)
 * - pnpm may share installations, so we force rebuild for Node.js
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors for output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
	try {
		log("🔧 SDK Post-install: Rebuilding better-sqlite3 for Node.js...", "blue");

		const sdkRoot = path.join(__dirname, "..");
		const betterSqlite3Path = path.join(sdkRoot, "node_modules", "better-sqlite3");

		if (!fs.existsSync(betterSqlite3Path)) {
			log("  ℹ better-sqlite3 not found in SDK package, skipping rebuild", "yellow");
			return;
		}

		log("  ✓ better-sqlite3 found", "green");

		try {
			// Force rebuild to ensure Node.js binary (not Electron)
			log("  🔧 Rebuilding for Node.js runtime...", "cyan");
			// Use pnpm rebuild without --force (deprecated in pnpm 10+)
			execSync("pnpm rebuild better-sqlite3", {
				stdio: "inherit",
				cwd: sdkRoot,
				encoding: "utf8",
			});

			log("  ✅ better-sqlite3 rebuilt successfully for Node.js!", "green");
		} catch (error) {
			log(`  ⚠️  Warning: Rebuild failed: ${error.message}`, "yellow");
			log("  ℹ SDK tests may fail with MODULE_VERSION mismatch errors", "yellow");
			log("  ℹ Run 'pnpm rebuild better-sqlite3' manually in packages/sdk", "yellow");
			// Don't fail postinstall - let it continue
		}

		log("✅ SDK post-install completed!", "green");
	} catch (error) {
		log(`❌ SDK post-install failed: ${error.message}`, "red");
		// Don't exit with error - allow install to continue
	}
}

main();
