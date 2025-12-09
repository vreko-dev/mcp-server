#!/usr/bin/env node

/**
 * Configuration Drift Detection - Baseline Updater
 *
 * Updates the baseline manifest when configuration files are legitimately changed.
 * Interactive by default, with --yes flag for automation.
 *
 * Usage:
 *   node config-drift-update.mjs [--init] [--yes] [--files file1,file2,...]
 *
 * Options:
 *   --init       Create initial baseline from scratch
 *   --yes        Skip confirmation prompts
 *   --files      Only update specific files (comma-separated)
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "../..");

const MANIFEST_PATH = resolve(ROOT_DIR, ".config-baselines/manifest.json");

// Parse CLI args
const args = process.argv.slice(2);
const INIT_MODE = args.includes("--init");
const AUTO_YES = args.includes("--yes");
const filesArg = args.find((arg) => arg.startsWith("--files="));
const _SPECIFIC_FILES = filesArg ? filesArg.split("=")[1].split(",") : null;

/**
 * Critical configs to track (initial set)
 */
const TRACKED_CONFIGS = {
	"biome.json": {
		scope: "root-only",
		allowWorkspaceExtend: false,
		description: "Code quality and formatting rules",
	},
	"tsconfig.base.json": {
		scope: "root-only",
		allowWorkspaceExtend: true,
		description: "TypeScript compiler base configuration",
	},
	".lefthook.yml": {
		scope: "root-only",
		allowWorkspaceExtend: false,
		description: "Git hook automation",
	},
	"turbo.json": {
		scope: "root-only",
		allowWorkspaceExtend: false,
		description: "Build orchestration and caching",
	},
	"packages/platform/drizzle.config.ts": {
		scope: "workspace",
		allowWorkspaceExtend: false,
		description: "Database configuration (platform)",
	},
	".snapbackrc": {
		scope: "root-only",
		allowWorkspaceExtend: false,
		description: "SnapBack file protection policies",
	},
};

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
 * Get git status for config files
 */
function getConfigChanges() {
	try {
		const output = execSync("git status --porcelain", {
			encoding: "utf8",
			cwd: ROOT_DIR,
			stdio: ["pipe", "pipe", "ignore"],
		});

		const changes = [];
		const lines = output.split("\n").filter(Boolean);

		for (const line of lines) {
			const status = line.substring(0, 2);
			const file = line.substring(3).trim();

			// Check if this is a tracked config
			if (Object.keys(TRACKED_CONFIGS).includes(file)) {
				changes.push({ status, file });
			}
		}

		return changes;
	} catch {
		return [];
	}
}

/**
 * Create or update manifest
 */
function updateManifest(configs) {
	const manifest = {
		version: "1.0.0",
		generated: new Date().toISOString(),
		description: "Configuration drift detection baseline - DO NOT EDIT MANUALLY",
		configs: {},
	};

	for (const [configPath, meta] of Object.entries(configs)) {
		const fullPath = resolve(ROOT_DIR, configPath);

		if (!existsSync(fullPath)) {
			console.warn(`⚠️  Skipping missing file: ${configPath}`);
			continue;
		}

		const hash = computeHash(fullPath);
		if (!hash) {
			console.warn(`⚠️  Skipping unreadable file: ${configPath}`);
			continue;
		}

		manifest.configs[configPath] = {
			hash,
			scope: meta.scope,
			allowWorkspaceExtend: meta.allowWorkspaceExtend,
			description: meta.description,
		};
	}

	writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

	return manifest;
}

/**
 * Interactive confirmation
 */
async function confirm(question) {
	if (AUTO_YES) {
		return true;
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
		});
	});
}

/**
 * Initialize baseline (create from scratch)
 */
async function initializeBaseline() {
	console.log("🎬 Initializing configuration baseline...\n");

	// Check which tracked configs exist
	const existingConfigs = {};
	const missingConfigs = [];

	for (const [configPath, meta] of Object.entries(TRACKED_CONFIGS)) {
		const fullPath = resolve(ROOT_DIR, configPath);
		if (existsSync(fullPath)) {
			existingConfigs[configPath] = meta;
		} else {
			missingConfigs.push(configPath);
		}
	}

	console.log(`📋 Found ${Object.keys(existingConfigs).length} tracked configuration files:\n`);
	for (const [configPath, meta] of Object.entries(existingConfigs)) {
		console.log(`   ✅ ${configPath}`);
		console.log(`      ${meta.description}`);
	}
	console.log("");

	if (missingConfigs.length > 0) {
		console.log(`⚠️  Missing ${missingConfigs.length} tracked configs (will be skipped):\n`);
		for (const configPath of missingConfigs) {
			console.log(`   ❌ ${configPath}`);
		}
		console.log("");
	}

	const proceed = await confirm("❓ Create baseline for these configs? (y/N): ");

	if (!proceed) {
		console.log("\n❌ Baseline creation cancelled.\n");
		process.exit(1);
	}

	const manifest = updateManifest(existingConfigs);

	console.log("\n✅ Baseline created successfully!\n");
	console.log(`   📄 ${relative(ROOT_DIR, MANIFEST_PATH)}`);
	console.log(`   📊 Tracking ${Object.keys(manifest.configs).length} configuration files\n`);
	console.log("📋 Next steps:\n");
	console.log("   1. Review the generated manifest");
	console.log("   2. Commit the baseline:");
	console.log("      git add .config-baselines/manifest.json");
	console.log('      git commit -m "chore: initialize config drift detection baseline"\n');
}

/**
 * Update existing baseline
 */
async function updateBaseline() {
	console.log("🔄 Updating configuration baseline...\n");

	// Check if manifest exists
	if (!existsSync(MANIFEST_PATH)) {
		console.error("❌ Baseline manifest not found. Create it first:\n");
		console.error("   pnpm config:create-baseline\n");
		process.exit(1);
	}

	// Get changed configs
	const changes = getConfigChanges();

	if (changes.length === 0) {
		console.log("✅ No tracked configuration changes detected.\n");
		console.log("   The baseline is up to date.\n");
		process.exit(0);
	}

	// Display changes
	console.log("📋 Configuration files changed:\n");
	for (const { status, file } of changes) {
		const statusIcon = status.includes("M") ? "📝" : status.includes("A") ? "➕" : "❓";
		console.log(`   ${statusIcon} [${status}] ${file}`);
		console.log(`      ${TRACKED_CONFIGS[file]?.description || "No description"}`);
	}
	console.log("");

	// Confirm update
	const proceed = await confirm("❓ Update baseline hashes for these files? (y/N): ");

	if (!proceed) {
		console.log("\n❌ Baseline update cancelled.\n");
		process.exit(1);
	}

	// Load existing manifest
	const existingManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

	// Update only changed configs
	for (const { file } of changes) {
		const fullPath = resolve(ROOT_DIR, file);
		const hash = computeHash(fullPath);

		if (hash) {
			const oldHash = existingManifest.configs[file]?.hash;
			existingManifest.configs[file] = {
				...existingManifest.configs[file],
				hash,
			};

			console.log(`   ✅ Updated: ${file}`);
			if (oldHash) {
				console.log(`      Old: ${oldHash.substring(0, 16)}...`);
			}
			console.log(`      New: ${hash.substring(0, 16)}...`);
		}
	}

	// Update metadata
	existingManifest.generated = new Date().toISOString();

	// Write updated manifest
	writeFileSync(MANIFEST_PATH, `${JSON.stringify(existingManifest, null, 2)}\n`, "utf8");

	console.log("\n✅ Baseline updated successfully!\n");
	console.log("📋 Next steps:\n");
	console.log("   1. Review the changes to .config-baselines/manifest.json");
	console.log("   2. Commit the updated baseline along with your config changes:\n");

	// Generate suggested commit message
	const changedFiles = changes.map((c) => c.file).join(", ");
	console.log(`      git add ${changedFiles} .config-baselines/manifest.json`);
	console.log(`      git commit -m "chore: update config baseline (${changedFiles})"\n`);
}

// Main execution
(async () => {
	try {
		if (INIT_MODE) {
			await initializeBaseline();
		} else {
			await updateBaseline();
		}
	} catch (error) {
		console.error("\n❌ Error:", error.message);
		console.error("");
		process.exit(1);
	}
})();
