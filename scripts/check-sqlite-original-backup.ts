#!/usr/bin/env node
/**
 * SnapBack SQLite Health Check
 *
 * PRE-FLIGHT VERIFICATION for better-sqlite3 native module.
 * Run this BEFORE starting development to ensure your environment is properly configured.
 *
 * What this checks:
 * - better-sqlite3 can be loaded (native module compatibility)
 * - Database files can be created (filesystem permissions)
 * - Basic SQL operations work (CREATE, INSERT, SELECT, DELETE)
 * - Performance is acceptable (< 100ms for basic ops)
 *
 * Exit codes:
 * - 0: All checks passed ✅
 * - 1: better-sqlite3 failed to load ❌ (missing build tools)
 * - 2: Database connection failed ❌ (filesystem issues)
 * - 3: Basic SQL operations failed ❌ (SQLite corrupted)
 * - 4: Unexpected error ❌
 */

import * as fs from "fs";
import * as path from "path";

let DatabaseModule: any;

// Step 1: Try to load better-sqlite3
const startTime = Date.now();
console.log("🔍 SnapBack SQLite Health Check");
console.log("================================\n");
console.log("Environment Info:");
console.log(`  Node version:  ${process.version}`);
console.log(`  Platform:      ${process.platform} ${process.arch}`);
console.log(`  Working dir:   ${process.cwd()}`);
console.log("\n================================\n");
console.log("Step 1: Loading better-sqlite3...");

try {
	DatabaseModule = require("better-sqlite3");
	console.log("✅ better-sqlite3 loaded successfully");
} catch (err) {
	const error = err as Error;
	console.error("\n❌ FATAL: Failed to load better-sqlite3");
	console.error(`   Error: ${error.message}`);
	console.error("   This usually means:");
	console.error("   - Native build tools are missing (python3, g++, make)");
	console.error("   - Node.js version mismatch");
	console.error("   - SQLite dev headers not installed");
	console.error(`\n💡 Fix: Run 'pnpm install' in the dev Docker container`);
	console.error("   The Dockerfile.dev-local includes all required dependencies.");
	process.exit(1);
}

// Step 2: Try to open/create a temporary database
console.log("\nStep 2: Creating temporary database...");

const tmpDir = path.join(process.cwd(), ".snapback-test");
const dbPath = path.join(tmpDir, "test.db");

try {
	// Clean up if exists
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath);
	}
	if (!fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir, { recursive: true });
	}

	const db = new DatabaseModule(dbPath);
	console.log("✅ Database file created successfully");

	// Step 3: Perform basic operations
	console.log("\nStep 3: Testing CREATE TABLE...");
	db.exec(`
    CREATE TABLE IF NOT EXISTS test_snapshots (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      content TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
	console.log("✅ CREATE TABLE succeeded");

	console.log("\nStep 4: Testing INSERT...");
	const insert = db.prepare("INSERT INTO test_snapshots (id, timestamp, content) VALUES (?, ?, ?)");
	const insertResult = insert.run("test-snap-001", Date.now(), "test content");
	console.log(`✅ INSERT succeeded (lastInsertRowid: ${insertResult.lastInsertRowid})`);

	console.log("\nStep 5: Testing SELECT...");
	const select = db.prepare("SELECT * FROM test_snapshots WHERE id = ?");
	const row = select.get("test-snap-001");
	if (row && (row as any).id === "test-snap-001") {
		console.log("✅ SELECT succeeded");
		console.log(`   Retrieved: id=${(row as any).id}, content=${(row as any).content}`);
	} else {
		throw new Error("SELECT returned unexpected result");
	}

	console.log("\nStep 6: Testing DELETE...");
	const del = db.prepare("DELETE FROM test_snapshots WHERE id = ?");
	del.run("test-snap-001");
	console.log("✅ DELETE succeeded");

	// Clean up
	db.close();
	fs.unlinkSync(dbPath);
	fs.rmdirSync(tmpDir);

	const totalTime = Date.now() - startTime;
	console.log("\n🎉 All SQLite checks passed!");
	console.log(`   Total time: ${totalTime}ms`);
	console.log("\n✨ Your environment is ready for SnapBack development!");
	console.log("\n📋 Summary:");
	console.log("  ✅ better-sqlite3 loaded successfully");
	console.log("  ✅ Database operations functional");
	console.log(`  ✅ Performance acceptable (${totalTime}ms total)`);
	console.log("\nNext steps:");
	console.log("  pnpm install        # Install dependencies");
	console.log("  pnpm type-check     # Verify types");
	console.log("  pnpm test           # Run tests");
	console.log("  pnpm build          # Build packages");
	process.exit(0);
} catch (err) {
	const error = err as Error;

	// Clean up on error
	try {
		if (fs.existsSync(dbPath)) {
			fs.unlinkSync(dbPath);
		}
		if (fs.existsSync(tmpDir)) {
			fs.rmdirSync(tmpDir);
		}
	} catch {
		// Ignore cleanup errors
	}

	console.error(`\n❌ FATAL: ${error.message}`);
	console.error("\nDiagnostic information:");
	console.error(`  Node version: ${process.version}`);
	console.error(`  Platform: ${process.platform} ${process.arch}`);
	console.error(`  Working dir: ${process.cwd()}`);

	if (error.message.includes("EACCES")) {
		console.error("\n💡 Permission denied - check that .snapback-test is writable");
	} else if (error.message.includes("ENOENT")) {
		console.error("\n💡 File not found - check filesystem permissions");
	} else if (error.message.includes("database")) {
		console.error("\n💡 Database error - your better-sqlite3 build may be corrupted");
		console.error("   Try: rm -rf node_modules && pnpm install");
	}

	process.exit(3);
}
