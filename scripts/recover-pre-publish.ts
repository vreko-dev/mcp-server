#!/usr/bin/env tsx

/**
 * Pre-Publish Recovery Tool
 *
 * Safely recovers from failed pre-publish runs
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const STATE_FILE = ".pre-publish-state.json";
const BACKUP_DIR = ".pre-publish-backup";

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

function exec(cmd: string) {
	execSync(cmd, { stdio: "inherit" });
}

async function main() {
	const args = process.argv.slice(2);
	const action = args[0];

	console.log("🔧 Pre-Publish Recovery Tool\n");

	// Check for state file
	if (!existsSync(STATE_FILE)) {
		console.log("✅ No incomplete runs detected");
		console.log("   System is clean");
		return;
	}

	const state: StateSnapshot = JSON.parse(readFileSync(STATE_FILE, "utf-8"));

	console.log("⚠️  Incomplete run detected:");
	console.log(`   Last step: ${state.step}`);
	console.log(`   Timestamp: ${new Date(state.timestamp).toLocaleString()}`);
	console.log(`   Branch: ${state.gitState.branch}`);
	console.log(`   Commit: ${state.gitState.commit.substring(0, 7)}`);

	if (state.gitState.staged.length > 0) {
		console.log(`   Staged files: ${state.gitState.staged.length}`);
	}

	console.log("");

	// Find backups
	let backups: string[] = [];
	if (existsSync(BACKUP_DIR)) {
		backups = readdirSync(BACKUP_DIR);
		if (backups.length > 0) {
			console.log(`📸 Found ${backups.length} backup(s):`);
			for (const backup of backups) {
				console.log(`   - ${backup}`);
			}
			console.log("");
		}
	}

	// Actions
	if (!action) {
		console.log("Available actions:");
		console.log("  1. resume  - Resume from last checkpoint");
		console.log("  2. reset   - Reset git state to last checkpoint");
		console.log("  3. clean   - Remove state and backups (dangerous!)");
		console.log("  4. info    - Show detailed state information");
		console.log("");
		console.log("Usage: pnpm recover [action]");
		return;
	}

	switch (action) {
		case "resume":
			console.log("🔄 Resuming pre-publish...");
			exec("pnpm pre-publish --resume");
			break;

		case "reset":
			console.log("🔄 Resetting git state...");
			console.log("   This will reset to commit:", state.gitState.commit);
			console.log("   Branch:", state.gitState.branch);
			console.log("");

			// Ask for confirmation
			if (!process.stdout.isTTY) {
				console.error("❌ Cannot confirm in non-interactive mode");
				console.error(`   Run manually: git reset --hard ${state.gitState.commit}`);
				process.exit(1);
			}

			console.log("⚠️  This will discard uncommitted changes!");
			console.log("   Press Ctrl+C to cancel, or Enter to continue...");

			await new Promise((resolve) => {
				process.stdin.once("data", resolve);
			});

			exec(`git reset --hard ${state.gitState.commit}`);
			exec("git clean -fd");
			console.log("✅ Git state reset");

			// Clean up state
			rmSync(STATE_FILE);
			console.log("✅ State cleared");
			break;

		case "clean":
			console.log("🗑️  Cleaning up...");

			if (existsSync(STATE_FILE)) {
				rmSync(STATE_FILE);
				console.log("   ✅ Removed state file");
			}

			if (existsSync(BACKUP_DIR)) {
				rmSync(BACKUP_DIR, { recursive: true, force: true });
				console.log("   ✅ Removed backups");
			}

			console.log("✅ Cleanup complete");
			break;

		case "info":
			console.log("📋 Detailed State Information:\n");
			console.log(JSON.stringify(state, null, 2));

			if (backups.length > 0) {
				console.log("\n📸 Backup Details:\n");
				for (const backup of backups) {
					const backupPath = join(BACKUP_DIR, backup);
					console.log(`Backup: ${backup}`);

					if (existsSync(join(backupPath, "package.json"))) {
						const pkg = JSON.parse(readFileSync(join(backupPath, "package.json"), "utf-8"));
						console.log(`  Root package: ${pkg.name}@${pkg.version}`);
					}

					console.log("");
				}
			}
			break;

		default:
			console.error(`❌ Unknown action: ${action}`);
			console.error("   Run without arguments to see available actions");
			process.exit(1);
	}
}

main().catch(console.error);
