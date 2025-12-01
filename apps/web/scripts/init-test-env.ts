#!/usr/bin/env node

/**
 * Script to initialize the test environment
 * This script creates necessary directories and files for testing
 */

import * as fs from "node:fs";
import * as path from "node:path";

// Get the project root directory
const projectRoot = path.join(__dirname, "..");

// Create necessary directories
const directories = ["tests/test-files", "playwright/.auth", "test-results"];

console.log("Initializing test environment...");

// Create directories
for (const dir of directories) {
	const fullPath = path.join(projectRoot, dir);
	if (!fs.existsSync(fullPath)) {
		fs.mkdirSync(fullPath, { recursive: true });
		console.log(`Created directory: ${dir}`);
	} else {
		console.log(`Directory already exists: ${dir}`);
	}
}

// Create a placeholder file in the auth directory
const authPlaceholder = path.join(projectRoot, "playwright/.auth", ".gitkeep");
if (!fs.existsSync(authPlaceholder)) {
	fs.writeFileSync(authPlaceholder, "");
	console.log("Created placeholder file in auth directory");
}

console.log("Test environment initialized successfully!");
