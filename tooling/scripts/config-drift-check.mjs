#!/usr/bin/env node

/**
 * Configuration Drift Detection - Fast Hash Validator
 *
 * Validates that critical configuration files haven't drifted from their baselines.
 * Optimized for speed (<500ms) to minimize pre-commit hook friction.
 *
 * Usage:
 *   node config-drift-check.mjs [--warn-only] [--all]
 *
 * Options:
 *   --warn-only  Log warnings but don't fail (for gradual rollout)
 *   --all        Check all configs (not just staged files)
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "../..");

const MANIFEST_PATH = resolve(ROOT_DIR, ".config-baselines/manifest.json");
const ALLOWLIST_PATH = resolve(ROOT_DIR, "tooling/scripts/config-drift-allowlist.json");

// Parse CLI args
const args = process.argv.slice(2);
const WARN_ONLY = args.includes("--warn-only");
const CHECK_ALL = args.includes("--all");

// Performance tracking
const startTime = Date.now();

/**
 * Compute SHA-256 hash of file content
 */
function computeHash(filePath) {
	try {
		const content = readFileSync(filePath, "utf8");
		return `sha256:${createHash("sha256").update(content).digest("hex")}`;
	} catch (_error) {
		return null;
	}
}

/**
 * Simple glob pattern matcher (supports * wildcard)
 */
function matchesPattern(filePath, pattern) {
	const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, "[^/]*").replace(/\*\*/g, ".*");
	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(filePath);
}

/**
 * Check if file matches any allowlist pattern
 */
function isAllowlisted(filePath, allowlist) {
	// Check ignored paths first
	if (allowlist.ignoredPaths) {
		for (const pattern of allowlist.ignoredPaths) {
			if (matchesPattern(filePath, pattern)) {
				return { allowed: true, reason: "ignored path" };
			}
		}
	}

	// Check workspace config patterns
	if (allowlist.workspaceConfigs) {
		for (const [pattern, config] of Object.entries(allowlist.workspaceConfigs)) {
			if (matchesPattern(filePath, pattern)) {
				// If requiresExtends is null, allow any content
				if (config.requiresExtends === null) {
					return { allowed: true, reason: config.reason };
				}

				// Otherwise, validate that it extends the base config
				const extendsValid = validateExtends(filePath, config.requiresExtends);
				if (extendsValid) {
					return { allowed: true, reason: config.reason };
				}
				return {
					allowed: false,
					reason: `Workspace config must extend base config: ${config.requiresExtends}`,
				};
			}
		}
	}

	return { allowed: false, reason: null };
}

/**
 * Validate that a config file properly extends base config(s)
 */
function validateExtends(configPath, requiredExtends) {
	try {
		const content = readFileSync(resolve(ROOT_DIR, configPath), "utf8");

		// Try to parse as JSON
		let config;
		try {
			config = JSON.parse(content);
		} catch {
			// If not JSON, check for extends in raw content (e.g., comments)
			// For JSON configs, this means invalid syntax = fail validation
			return false;
		}

		if (!config.extends) {
			return false;
		}

		// Handle both string and array of required extends
		const required = Array.isArray(requiredExtends) ? requiredExtends : [requiredExtends];
		const actual = Array.isArray(config.extends) ? config.extends : [config.extends];

		// Check if any required extend is present
		return required.some((req) => actual.some((ext) => ext.includes(req)));
	} catch (_error) {
		return false;
	}
}

/**
 * Get list of staged files (for pre-commit hook performance)
 */
function getStagedFiles() {
	try {
		const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
			encoding: "utf8",
			cwd: ROOT_DIR,
			stdio: ["pipe", "pipe", "ignore"],
		});
		return output.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

/**
 * Main validation logic
 */
function validateConfigs() {
	// Load manifest
	if (!existsSync(MANIFEST_PATH)) {
		console.error("❌ Config baseline manifest not found!");
		console.error(`   Expected: ${relative(ROOT_DIR, MANIFEST_PATH)}`);
		console.error("\n💡 Generate initial baseline:");
		console.error("   pnpm config:create-baseline\n");
		return { failures: [{ error: "Manifest not found", critical: true }], checked: 0 };
	}

	const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	// Load allowlist
	const allowlist = existsSync(ALLOWLIST_PATH)
		? JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"))
		: { workspaceConfigs: {}, ignoredPaths: [] };

	// Determine which configs to check
	let configsToCheck = Object.keys(manifest.configs || {});

	if (!CHECK_ALL) {
		// Only check staged files for performance
		const stagedFiles = getStagedFiles();
		if (stagedFiles.length === 0) {
			// No staged files = nothing to check
			return { failures: [], checked: 0 };
		}

		configsToCheck = configsToCheck.filter((configPath) => stagedFiles.includes(configPath));

		if (configsToCheck.length === 0) {
			// No tracked configs in staged files
			return { failures: [], checked: 0 };
		}
	}

	// Validate each config
	const failures = [];
	for (const configPath of configsToCheck) {
		const configMeta = manifest.configs[configPath];
		const expectedHash = configMeta.hash;
		const fullPath = resolve(ROOT_DIR, configPath);

		// Check if file exists
		if (!existsSync(fullPath)) {
			failures.push({
				file: configPath,
				error: "File missing",
				expected: expectedHash,
				actual: null,
			});
			continue;
		}

		// Compute actual hash
		const actualHash = computeHash(fullPath);
		if (actualHash === null) {
			failures.push({
				file: configPath,
				error: "Failed to read file",
				expected: expectedHash,
				actual: null,
			});
			continue;
		}

		// Compare hashes
		if (actualHash !== expectedHash) {
			// Check if allowlisted
			const allowResult = isAllowlisted(configPath, allowlist);

			if (allowResult.allowed) {
				// Allowlisted - skip this file
				continue;
			}

			failures.push({
				file: configPath,
				error: allowResult.reason || "Hash mismatch (config drift detected)",
				expected: expectedHash,
				actual: actualHash,
			});
		}
	}

	return { failures, checked: configsToCheck.length };
}

/**
 * Format and display results
 */
function displayResults(result) {
	const { failures, checked } = result;
	const elapsed = Date.now() - startTime;

	if (failures.length === 0) {
		// Silent success - no output to avoid noise
		// Only show stats if explicitly requested
		if (process.env.VERBOSE) {
			console.log(`✅ Config drift check passed (${checked} configs, ${elapsed}ms)`);
		}
		return true;
	}

	// Display failures
	const icon = WARN_ONLY ? "⚠️" : "❌";
	const verb = WARN_ONLY ? "Warning" : "Error";

	console.error(`\n${icon} ${verb}: Configuration drift detected\n`);

	for (const failure of failures) {
		console.error(`   📄 ${failure.file}`);
		console.error(`      ${failure.error}`);
		if (failure.expected && failure.actual) {
			console.error(`      Expected: ${failure.expected.substring(0, 16)}...`);
			console.error(`      Actual:   ${failure.actual.substring(0, 16)}...`);
		}
		console.error("");
	}

	console.error("💡 If these changes are intentional, update the baseline:");
	console.error("   pnpm config:update-baseline\n");
	console.error("📖 Documentation:");
	console.error("   .config-baselines/README.md\n");
	console.error(`⏱️  Check completed in ${elapsed}ms\n`);

	return WARN_ONLY;
}

// Run validation
try {
	const result = validateConfigs();
	const success = displayResults(result);
	process.exit(success ? 0 : 1);
} catch (error) {
	console.error("❌ Config drift check failed with error:");
	console.error(`   ${error.message}`);
	console.error("");
	process.exit(1);
}
