#!/usr/bin/env node
/**
 * Monorepo Flattening Script
 *
 * This script flattens the nested monorepo structure by moving:
 * - clients/snapback-clients/apps/* -> apps/*
 * - clients/snapback-clients/packages/* -> packages/*
 */
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT_DIR = resolve(__dirname, "..");
const NESTED_ROOT = join(ROOT_DIR, "clients/snapback-clients");
const TARGET_APPS_DIR = join(ROOT_DIR, "apps");
const TARGET_PACKAGES_DIR = join(ROOT_DIR, "packages");
function ensureDirExists(dirPath) {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive: true });
		console.log(`Created directory: ${dirPath}`);
	}
}
function moveItems(sourceDir, targetDir, type) {
	let movedCount = 0;
	if (!existsSync(sourceDir)) {
		console.log(`Source directory does not exist: ${sourceDir}`);
		return movedCount;
	}
	const items = readdirSync(sourceDir);
	for (const item of items) {
		const sourcePath = join(sourceDir, item);
		const targetPath = join(targetDir, item);
		// Skip if not a directory
		if (!statSync(sourcePath).isDirectory()) {
			continue;
		}
		// Skip if target already exists
		if (existsSync(targetPath)) {
			console.warn(`Warning: ${type} ${item} already exists in target location, skipping`);
			continue;
		}
		// Move the item
		try {
			renameSync(sourcePath, targetPath);
			console.log(`Moved ${type} ${item} to ${targetDir}`);
			movedCount++;
		} catch (error) {
			console.error(`Error moving ${type} ${item}:`, error);
		}
	}
	return movedCount;
}
function main() {
	console.log("Starting monorepo flattening process...");
	// Check if nested structure exists
	if (!existsSync(NESTED_ROOT)) {
		console.log("Nested structure not found, nothing to flatten");
		return;
	}
	// Ensure target directories exist
	ensureDirExists(TARGET_APPS_DIR);
	ensureDirExists(TARGET_PACKAGES_DIR);
	// Move apps
	console.log("\nMoving apps...");
	const appsMoved = moveItems(join(NESTED_ROOT, "apps"), TARGET_APPS_DIR, "app");
	// Move packages
	console.log("\nMoving packages...");
	const packagesMoved = moveItems(join(NESTED_ROOT, "packages"), TARGET_PACKAGES_DIR, "package");
	console.log("\nFlattening complete!");
	console.log(`- Moved ${appsMoved} apps`);
	console.log(`- Moved ${packagesMoved} packages`);
	// Note about cleanup
	console.log("\nNote: The clients/snapback-clients directory can now be removed manually");
	console.log("after verifying that everything works correctly.");
}
if (require.main === module) {
	main();
}
