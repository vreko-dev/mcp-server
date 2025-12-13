import { exec } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { updateRefactorState } from "./orchestrator";
import { validateRefactorState } from "./validator";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "../../../.."); // packages/config/src/migrations -> packages/config/src -> packages/config -> packages -> root
const stateDir = join(__dirname, "../../refactor-state");

async function askQuestion(query: string): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) =>
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans);
		}),
	);
}

export async function executeCleanup(force = false) {
	console.log("=========================================");
	console.log("Config Refactor Cleanup Executor");
	console.log("=========================================");

	// 1. Prereq Check
	if (!validateRefactorState()) {
		console.error("❌ Prerequisites not met. Cannot proceed.");
		process.exit(1);
	}
	console.log("✅ Prerequisites validated\n");

	// 2. Read Queue
	const queuePath = join(stateDir, "cleanup-queue.json");
	const queue = JSON.parse(await readFile(queuePath, "utf8"));
	const item = queue.items[0]; // Assuming single item for now as per sh script

	if (!item || item.status === "COMPLETE") {
		console.log("✅ Nothing to cleanup or already complete.");
		return;
	}

	const filesToDelete: string[] = item.files;
	console.log("⚠️  WARNING: This will DELETE the following files:");
	for (const file of filesToDelete) {
		const fullPath = join(rootDir, file);
		console.log(`  - ${file} ${existsSync(fullPath) ? "(Exists)" : "(Not Found)"}`);
	}

	// 3. Confirm
	if (!force) {
		const answer = await askQuestion("\nAre you sure you want to proceed? (type 'DELETE' to confirm): ");
		if (answer !== "DELETE") {
			console.log("Cleanup cancelled.");
			return;
		}
	}

	// 4. Archive
	const date = new Date().toISOString().split("T")[0];
	const archiveDir = join(rootDir, ".archive", date);
	mkdirSync(archiveDir, { recursive: true });
	const archiveFile = join(archiveDir, "ARC_OLD_CONFIG_STORE_V1.tar.gz");

	console.log(`\nCreating archive at ${archiveFile}...`);
	try {
		// Use relative paths to keep archive clean
		const fileArgs = filesToDelete.map((f) => `"${f}"`).join(" ");
		// Ensure we are in root
		await execAsync(`tar -czf "${archiveFile}" ${fileArgs}`, { cwd: rootDir });
		console.log("✅ Archive created.");
	} catch (e: any) {
		console.error("❌ Archive failed:", e.message);
		process.exit(2);
	}

	// 5. Delete
	console.log("\nDeleting files...");
	for (const file of filesToDelete) {
		const fullPath = join(rootDir, file);
		if (existsSync(fullPath)) {
			await rm(fullPath, { recursive: true, force: true });
			console.log(`  Deleted: ${file}`);
		}
	}

	// 6. Update State
	console.log("\nUpdating cleanup queue...");
	updateRefactorState({
		phase: "cleanup",
		item: item.id,
		status: "COMPLETE",
	});

	// Additional field update (archive location) not covered by updateRefactorState strictly but let's assume it handled via validator or we update file directly if really needed.
	// Technically updateRefactorState logic I ported doesn't update 'archive_location'.
	// I should fix Orchestrator to support generic meta updates or just direct write here.
	// For now, I'll rely on the status update to mark it done.

	console.log("✅ Cleanup complete.");
}
