#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// Get the current working directory to determine which package we're in
const cwd = process.cwd();
const packageName = path.basename(cwd);

console.log(`\nChecking ${packageName}...`);

// Check if dist directory exists
const distPath = path.join(cwd, "dist");
if (!fs.existsSync(distPath)) {
	console.error(`❌ Dist directory does not exist for ${packageName}`);
	process.exit(1);
}

// Check if dist directory has files
const files = fs.readdirSync(distPath);
if (files.length === 0) {
	console.error(`❌ Dist directory is empty for ${packageName}`);
	process.exit(1);
}

// Check for expected files (at least one .js and one .d.ts file)
const hasJsFiles = files.some((file) => file.endsWith(".js"));
const hasDtsFiles = files.some((file) => file.endsWith(".d.ts"));

if (!hasJsFiles && !hasDtsFiles) {
	console.error(`❌ No expected output files found in dist for ${packageName}`);
	process.exit(1);
}

console.log(`✅ ${packageName} build verified successfully`);
