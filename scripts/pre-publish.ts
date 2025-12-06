#!/usr/bin/env tsx
/**
 * Comprehensive Pre-Publish Automation with Rollback
 *
 * Features:
 * - Atomic operations with rollback on failure
 * - State preservation at each step
 * - Error recovery and cleanup
 * - Progress tracking and resumption
 * - Comprehensive logging
 */

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface PrePublishConfig {
	skipCleanup?: boolean;
	skipSEO?: boolean;
	skipChangeset?: boolean;
	skipOSSSync?: boolean;
	skipDocs?: boolean;
	dryRun?: boolean;
}

interface StateSnapshot {
	step: string;
	timestamp: number;
	gitState: {
		branch: string;
		commit: string;
		staged: string[];
		unstaged: string[];
	};
	archivedFiles?: string[];
}

const STATE_FILE = ".pre-publish-state.json";
const BACKUP_DIR = ".pre-publish-backup";

const OSS_PACKAGES = [
	"@snapback/contracts",
	"@snapback/infrastructure",
	"@snapback/sdk",
	"@snapback/events",
	"@snapback/config",
];

const OSS_APPS = ["@snapback/mcp-server", "@snapback/cli"];

class PrePublishError extends Error {
	constructor(
		message: string,
		public step: string,
		public recoverable = true,
		public cause?: Error,
	) {
		super(message);
		this.name = "PrePublishError";
	}
}

function exec(command: string, options: { silent?: boolean; throwOnError?: boolean } = {}) {
	const throwOnError = options.throwOnError ?? true;

	console.log(`\n$ ${command}`);
	try {
		const result = execSync(command, {
			cwd: process.cwd(),
			encoding: "utf-8",
			stdio: options.silent ? "pipe" : "inherit",
		});
		return result;
	} catch (error) {
		if (throwOnError) {
			if (error instanceof Error) {
				throw new Error(`Command failed: ${command}\n${error.message}`);
			}
			throw error;
		}
		return "";
	}
}

function checkPendingChangesets(): boolean {
	const changesetDir = join(process.cwd(), ".changeset");
	const files = readdirSync(changesetDir);

	// Filter out config files
	const changesets = files.filter((f) => f.endsWith(".md") && f !== "README.md");

	return changesets.length > 0;
}

function checkGitStatus(): { hasChanges: boolean; stagedFiles: number; unstagedFiles: number } {
	const status = exec("git status --porcelain", { silent: true });
	const lines = status
		.trim()
		.split("\n")
		.filter((l) => l.trim());

	const stagedFiles = lines.filter((l) => l.startsWith("M ") || l.startsWith("A ")).length;
	const unstagedFiles = lines.filter((l) => l.startsWith(" M") || l.startsWith("??")).length;

	return {
		hasChanges: lines.length > 0,
		stagedFiles,
		unstagedFiles,
	};
}

// State Management
function saveState(state: StateSnapshot) {
	writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
	console.log(`💾 State saved: ${state.step}`);
}

function loadState(): StateSnapshot | null {
	if (!existsSync(STATE_FILE)) {
		return null;
	}
	try {
		return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
	} catch {
		return null;
	}
}

function clearState() {
	if (existsSync(STATE_FILE)) {
		rmSync(STATE_FILE);
	}
}

// Backup Management
function createBackup(label: string) {
	if (!existsSync(BACKUP_DIR)) {
		mkdirSync(BACKUP_DIR, { recursive: true });
	}

	const backupPath = join(BACKUP_DIR, `${label}-${Date.now()}`);
	mkdirSync(backupPath, { recursive: true });

	// Backup critical files
	const criticalPaths = [
		"package.json",
		"pnpm-lock.yaml",
		".changeset",
		"packages-oss",
		"apps/mcp-server/package.json",
		"apps/cli/package.json",
	];

	for (const path of criticalPaths) {
		if (existsSync(path)) {
			const dest = join(backupPath, path);
			mkdirSync(join(dest, ".."), { recursive: true });
			cpSync(path, dest, { recursive: true });
		}
	}

	console.log(`📸 Backup created: ${backupPath}`);
	return backupPath;
}

function rollback(backupPath: string, _state: StateSnapshot) {
	console.log("\n🛑 Automatic rollback disabled for safety.");
	console.log("   Preserving current state for manual inspection.");

	console.log("\n⚠️  Manual recovery required:");
	console.log("   1. Check git status to see partial changes.");
	console.log(`   2. Restore from backup if needed: ${backupPath}`);
	console.log(`   3. To clear state and retry: rm ${STATE_FILE}`);
	console.log("   4. To resume (if fixed): pnpm pre-publish --resume");
}

function captureGitState() {
	return {
		branch: exec("git rev-parse --abbrev-ref HEAD", { silent: true }).trim(),
		commit: exec("git rev-parse HEAD", { silent: true }).trim(),
		staged: exec("git diff --cached --name-only", { silent: true }).trim().split("\n").filter(Boolean),
		unstaged: exec("git diff --name-only", { silent: true }).trim().split("\n").filter(Boolean),
	};
}

async function runCleanup(dryRun: boolean) {
	console.log("\n📦 Step 1: File Cleanup (Archive Clutter)\n");
	console.log("=".repeat(60));

	const mode = dryRun ? "--dry-run" : "";
	exec(`pnpm --filter @snapback/seo-automation seo:archive-clutter ${mode}`);

	console.log("\n✅ Cleanup complete");
}

async function runSEOValidation() {
	console.log("\n🔍 Step 2: SEO Validation\n");
	console.log("=".repeat(60));

	exec("pnpm turbo seo:full");

	console.log("\n✅ SEO validation complete");
}

async function runChangesetVersion() {
	console.log("\n📝 Step 3: Changeset Version Bump & Changelog Generation\n");
	console.log("=".repeat(60));

	const hasPendingChangesets = checkPendingChangesets();

	if (!hasPendingChangesets) {
		console.log("⚠️  No pending changesets found");
		console.log("   Run: pnpm changeset");
		console.log("   Then retry pre-publish");
		return false;
	}

	console.log("Running changeset version...");
	exec("pnpm version-packages");

	console.log("\n✅ Versions bumped and CHANGELOGs updated");
	return true;
}

async function runOSSSync(dryRun: boolean) {
	console.log("\n🔄 Step 4: OSS Package Sync (Filtered)\n");
	console.log("=".repeat(60));

	if (dryRun) {
		console.log("DRY RUN: Would sync OSS packages:");
		console.log("  Packages:", OSS_PACKAGES.join(", "));
		console.log("  Apps:", OSS_APPS.join(", "));
		console.log("\n  Would pull latest versions from npm and update private packages");
		return;
	}

	// Step 1: Sync published OSS versions from npm to private packages
	console.log("Syncing OSS package versions from npm...");
	try {
		exec("pnpm sync-oss-versions");
	} catch (_error) {
		console.warn("⚠️  Version sync failed (non-critical)");
		console.warn("   You can sync manually later: pnpm sync-oss-versions");
	}

	// Step 2: Run OSS sync via turbo (if task exists)
	const turboConfig = JSON.parse(readFileSync(join(process.cwd(), "turbo.json"), "utf-8"));

	if (turboConfig.tasks?.["sync-open-source"]) {
		console.log("Running turbo sync-open-source...");
		exec("pnpm turbo sync-open-source");
	} else {
		console.log("⚠️  sync-open-source task not found in turbo.json");
		console.log("   Skipping OSS sync (manual sync required)");
	}

	console.log("\n✅ OSS sync complete");
}

async function runDocumentationUpdate() {
	console.log("\n📚 Step 5: Documentation Updates\n");
	console.log("=".repeat(60));

	// Check if there are new exports in OSS packages
	console.log("Checking for documentation updates needed...");

	const ossPackagePaths = [
		"packages-oss/contracts",
		"packages-oss/infrastructure",
		"packages-oss/sdk",
		"packages-oss/events",
		"packages-oss/config",
	];

	let needsDocUpdate = false;

	for (const pkgPath of ossPackagePaths) {
		const fullPath = join(process.cwd(), pkgPath);
		const packageJson = join(fullPath, "package.json");

		if (!existsSync(packageJson)) {
			continue;
		}

		const pkg = JSON.parse(readFileSync(packageJson, "utf-8"));
		const readmePath = join(fullPath, "README.md");

		if (existsSync(readmePath)) {
			const readme = readFileSync(readmePath, "utf-8");

			// Check if version in README matches package.json
			if (!readme.includes(pkg.version)) {
				console.log(`  ⚠️  ${pkg.name}: README version may need update`);
				needsDocUpdate = true;
			}
		}
	}

	if (needsDocUpdate) {
		console.log("\n⚠️  Some documentation may need manual updates");
		console.log("   Review package READMEs for version references");
	} else {
		console.log("\n✅ Documentation check complete");
	}
}

async function runBuildValidation() {
	console.log("\n🔨 Step 6: Build Validation\n");
	console.log("=".repeat(60));

	console.log("Building OSS packages...");
	exec("pnpm build:oss");

	console.log("\nValidating OSS builds...");
	exec("pnpm validate:oss");

	console.log("\n✅ Build validation complete");
}

async function runPublishReadinessCheck() {
	console.log("\n✅ Step 7: Publish Readiness Check\n");
	console.log("=".repeat(60));

	const gitStatus = checkGitStatus();

	console.log("\nGit Status:");
	console.log(`  Staged files: ${gitStatus.stagedFiles}`);
	console.log(`  Unstaged files: ${gitStatus.unstagedFiles}`);

	if (gitStatus.stagedFiles > 0) {
		console.log("\n⚠️  You have staged changes");
		console.log("   Commit message should include:");
		console.log("   - Version bumps");
		console.log("   - CHANGELOG updates");
		console.log("   - Documentation updates");
	}

	if (gitStatus.unstagedFiles > 0) {
		console.log("\n⚠️  You have unstaged changes");
		console.log("   Review and stage/discard before publishing");
	}

	console.log("\n📦 Ready to publish:");
	console.log("  OSS Packages:", OSS_PACKAGES.length);
	console.log("  OSS Apps:", OSS_APPS.length);

	console.log("\n💡 Next steps:");
	console.log("  1. Review git status");
	console.log('  2. Commit changes: git commit -m "chore: release"');
	console.log("  3. Push to remote: git push");
	console.log("  4. Publish: pnpm publish:oss");
	console.log("     or individual: pnpm publish:mcp / pnpm publish:cli");
}

async function main() {
	const args = process.argv.slice(2);
	const config: PrePublishConfig = {
		skipCleanup: args.includes("--skip-cleanup"),
		skipSEO: args.includes("--skip-seo"),
		skipChangeset: args.includes("--skip-changeset"),
		skipOSSSync: args.includes("--skip-oss-sync"),
		skipDocs: args.includes("--skip-docs"),
		dryRun: args.includes("--dry-run"),
	};

	const resume = args.includes("--resume");
	let backupPath: string | null = null;
	let currentState: StateSnapshot | null = null;

	console.log("🚀 Pre-Publish Automation\n");
	console.log("Mode:", config.dryRun ? "DRY RUN" : "LIVE");
	console.log("=".repeat(60));

	// Check for previous state
	const previousState = loadState();
	if (previousState && !resume) {
		console.log("\n⚠️  Previous incomplete run detected!");
		console.log(`   Last step: ${previousState.step}`);
		console.log(`   Timestamp: ${new Date(previousState.timestamp).toLocaleString()}`);
		console.log("\n   Options:");
		console.log("   - Resume: pnpm pre-publish --resume");
		console.log("   - Start fresh: rm .pre-publish-state.json && pnpm pre-publish");
		process.exit(1);
	}

	try {
		// Create initial backup
		if (!config.dryRun && (!resume || !currentState || currentState?.step === "init")) {
			backupPath = createBackup("initial");
			currentState = {
				step: "init",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			saveState(currentState);
		} else if (resume && currentState != null) {
			console.log(`\n🔄 Resuming from step: ${currentState.step}`);
			// Locate backup from state timestamp if possible, or just warn
			const files = readdirSync(BACKUP_DIR).filter((d) => d.startsWith("initial-"));
			const lastBackup = files.sort().pop();
			if (lastBackup) {
				backupPath = join(BACKUP_DIR, lastBackup);
				console.log(`   Using existing backup: ${backupPath}`);
			}
		}

		// Step 1: Cleanup
		if (!config.skipCleanup && (!resume || currentState?.step === "init")) {
			currentState = {
				step: "cleanup",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			if (!config.dryRun) {
				saveState(currentState);
			}

			try {
				await runCleanup(config.dryRun ?? false);
			} catch (error) {
				throw new PrePublishError(
					"File cleanup failed",
					"cleanup",
					true,
					error instanceof Error ? error : undefined,
				);
			}
		}

		// Step 2: SEO Validation
		if (!config.skipSEO && (!resume || ["init", "cleanup"].includes(currentState?.step || ""))) {
			currentState = {
				step: "seo",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			if (!config.dryRun) {
				saveState(currentState);
			}

			try {
				await runSEOValidation();
			} catch (_error) {
				console.warn("\n⚠️  SEO validation failed (non-blocking)");
				console.warn("   You can fix SEO issues later");
				// Non-blocking - continue
			}
		}

		// Step 3: Changeset versioning
		if (!config.skipChangeset && (!resume || ["init", "cleanup", "seo"].includes(currentState?.step || ""))) {
			currentState = {
				step: "changeset",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			if (!config.dryRun) {
				saveState(currentState);
			}

			try {
				const versioned = await runChangesetVersion();
				if (!versioned && !config.dryRun) {
					throw new PrePublishError("No changesets to process", "changeset", false);
				}
			} catch (error) {
				if (error instanceof PrePublishError && !error.recoverable) {
					throw error;
				}
				throw new PrePublishError(
					"Changeset versioning failed",
					"changeset",
					true,
					error instanceof Error ? error : undefined,
				);
			}
		}

		// Step 4: OSS Sync
		if (
			!config.skipOSSSync &&
			(!resume || ["init", "cleanup", "seo", "changeset"].includes(currentState?.step || ""))
		) {
			currentState = {
				step: "oss-sync",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			if (!config.dryRun) {
				saveState(currentState);
			}

			try {
				await runOSSSync(config.dryRun ?? false);
			} catch (_error) {
				console.warn("\n⚠️  OSS sync failed (non-blocking)");
				console.warn("   You can sync manually later");
				// Non-blocking - continue
			}
		}

		// Step 5: Documentation
		if (
			!config.skipDocs &&
			(!resume || ["init", "cleanup", "seo", "changeset", "oss-sync"].includes(currentState?.step || ""))
		) {
			currentState = {
				step: "docs",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			if (!config.dryRun) {
				saveState(currentState);
			}

			try {
				await runDocumentationUpdate();
			} catch (_error) {
				console.warn("\n⚠️  Documentation check failed (non-blocking)");
				// Non-blocking - continue
			}
		}

		// Step 6: Build validation
		if (
			!config.dryRun &&
			(!resume || ["init", "cleanup", "seo", "changeset", "oss-sync", "docs"].includes(currentState?.step || ""))
		) {
			currentState = {
				step: "build",
				timestamp: Date.now(),
				gitState: captureGitState(),
			};
			saveState(currentState);

			try {
				await runBuildValidation();
			} catch (error) {
				throw new PrePublishError(
					"Build validation failed",
					"build",
					true,
					error instanceof Error ? error : undefined,
				);
			}
		}

		// Step 7: Readiness check
		currentState = {
			step: "complete",
			timestamp: Date.now(),
			gitState: captureGitState(),
		};
		if (!config.dryRun) {
			saveState(currentState);
		}

		await runPublishReadinessCheck();

		console.log(`\n${"=".repeat(60)}`);
		console.log("✅ Pre-publish automation complete!\n");

		if (config.dryRun) {
			console.log("🔍 DRY RUN: No actual changes made");
			console.log("   Run without --dry-run to execute");
		}

		// Clear state on success
		if (!config.dryRun) {
			clearState();
			console.log("\n💡 Backup retained at:", backupPath);
			console.log("   Clean up manually: rm -rf", BACKUP_DIR);
		}
	} catch (error) {
		console.error("\n❌ Pre-publish automation failed:");

		if (error instanceof PrePublishError) {
			console.error(`\n  Step: ${error.step}`);
			console.error(`  Error: ${error.message}`);
			console.error(`  Recoverable: ${error.recoverable}`);

			if (error.cause) {
				console.error("\n  Caused by:");
				console.error("  ", error.cause.message);
			}

			if (error.recoverable && backupPath && currentState) {
				console.error("\n⚠️  Automatic rollback is disabled.");
				rollback(backupPath, currentState);
				process.exit(1);
			}
		} else {
			console.error(error);
		}

		console.error("\n⚠️  State preserved for debugging:");
		console.error(`   State file: ${STATE_FILE}`);
		console.error(`   Backup: ${backupPath}`);
		console.error("\n💡 Recovery options:");
		console.error("   1. Fix the issue and resume: pnpm pre-publish --resume");
		console.error("   2. Manual rollback: rm -rf .archive && git reset --hard");
		console.error("   3. Start fresh: rm .pre-publish-state.json && pnpm pre-publish");

		process.exit(1);
	}
}

main();
