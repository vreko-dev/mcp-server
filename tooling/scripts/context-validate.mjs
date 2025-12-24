#!/usr/bin/env node
/**
 * context-validate.mjs
 *
 * Validates that .ctx is in sync with context.json
 * Used in pre-commit hook alongside config-drift-check
 *
 * Usage:
 *   node tooling/scripts/context-validate.mjs
 *   node tooling/scripts/context-validate.mjs --fix  # Regenerate if stale
 *
 * @see .config-baselines/CONTEXT-GUIDE.md
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");

const CONTEXT_PATH = join(ROOT, ".config-baselines", "context.json");
const CTX_PATH = join(ROOT, ".ctx");

// Parse CLI args
const args = process.argv.slice(2);
const FIX_MODE = args.includes("--fix");
const WARN_ONLY = args.includes("--warn-only");

function getHash(content) {
	return createHash("sha256").update(content).digest("hex");
}

/**
 * Extract embedded hash from .ctx file header
 */
function extractCtxHash(ctxContent) {
	const match = ctxContent.match(/^# hash:([a-f0-9]+)/m);
	return match ? match[1] : null;
}

/**
 * Compute expected hash from context.json
 */
function computeExpectedHash() {
	const content = readFileSync(CONTEXT_PATH, "utf8");
	return getHash(content).substring(0, 16);
}

function validate() {
	// Check files exist
	if (!existsSync(CONTEXT_PATH)) {
		console.error("Missing: .config-baselines/context.json");
		console.error("   Run: pnpm context:init");
		process.exit(1);
	}

	if (!existsSync(CTX_PATH)) {
		console.error("Missing: .ctx (run: pnpm context:build)");

		if (FIX_MODE) {
			console.log("Auto-fixing...");
			execSync("node tooling/scripts/context-build.mjs", {
				cwd: ROOT,
				stdio: "inherit",
			});
			console.log(".ctx generated");
			process.exit(0);
		}

		process.exit(WARN_ONLY ? 0 : 1);
	}

	// Read both files
	const ctxContent = readFileSync(CTX_PATH, "utf8");
	const embeddedHash = extractCtxHash(ctxContent);
	const expectedHash = computeExpectedHash();

	// Compare hashes
	if (embeddedHash !== expectedHash) {
		const icon = WARN_ONLY ? "Warning" : "Error";
		console.error(`${icon}: .ctx is stale (context.json modified)`);
		console.error(`   Expected hash: ${expectedHash}`);
		console.error(`   Embedded hash: ${embeddedHash || "none"}`);
		console.error("   Run: pnpm context:build");

		if (FIX_MODE) {
			console.log("Auto-fixing...");
			execSync("node tooling/scripts/context-build.mjs", {
				cwd: ROOT,
				stdio: "inherit",
			});
			console.log(".ctx regenerated");
			process.exit(0);
		}

		process.exit(WARN_ONLY ? 0 : 1);
	}

	// Also check modification times as secondary validation
	const contextMtime = statSync(CONTEXT_PATH).mtimeMs;
	const ctxMtime = statSync(CTX_PATH).mtimeMs;

	if (contextMtime > ctxMtime) {
		const icon = WARN_ONLY ? "Warning" : "Error";
		console.error(`${icon}: .ctx older than context.json`);
		console.error("   Run: pnpm context:build");

		if (FIX_MODE) {
			console.log("Auto-fixing...");
			execSync("node tooling/scripts/context-build.mjs", {
				cwd: ROOT,
				stdio: "inherit",
			});
			console.log(".ctx regenerated");
			process.exit(0);
		}

		process.exit(WARN_ONLY ? 0 : 1);
	}

	// Validate schema (basic check)
	try {
		const context = JSON.parse(readFileSync(CONTEXT_PATH, "utf8"));
		if (!context.version || !context.meta || !context.constraints) {
			console.error("Error: context.json missing required fields");
			process.exit(1);
		}
	} catch (error) {
		console.error(`Error: Invalid context.json - ${error.message}`);
		process.exit(1);
	}

	// Success - silent by default
	if (process.env.VERBOSE) {
		console.log(`.ctx is in sync (hash: ${expectedHash})`);
	}
}

try {
	validate();
} catch (error) {
	console.error(`Context validation failed: ${error.message}`);
	process.exit(1);
}
