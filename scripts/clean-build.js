#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

// List of packages and apps to clean
const packages = [
	"packages/analytics",
	"packages/auth",
	"packages/config",
	"packages/contracts",
	"packages/core",
	"packages/events",
	"packages/github-action",
	"packages/infrastructure",
	"packages/integrations",
	"packages/platform",
	"packages/policy-engine",
	"packages/sdk",
	"apps/cli",
	"apps/mcp-server",
];

// Function to delete a directory recursively
function deleteDirRecursive(dirPath) {
	if (fs.existsSync(dirPath)) {
		const files = fs.readdirSync(dirPath);
		for (const file of files) {
			const filePath = path.join(dirPath, file);
			if (fs.lstatSync(filePath).isDirectory()) {
				deleteDirRecursive(filePath);
			} else {
				fs.unlinkSync(filePath);
			}
		}
		fs.rmdirSync(dirPath);
		console.log(`Deleted directory: ${dirPath}`);
	}
}

// Function to delete tsbuildinfo files
function deleteTsBuildInfoFiles(dirPath) {
	if (fs.existsSync(dirPath)) {
		const files = fs.readdirSync(dirPath);
		for (const file of files) {
			const filePath = path.join(dirPath, file);
			if (fs.lstatSync(filePath).isDirectory()) {
				deleteTsBuildInfoFiles(filePath);
			} else if (file.endsWith(".tsbuildinfo")) {
				fs.unlinkSync(filePath);
				console.log(`Deleted tsbuildinfo file: ${filePath}`);
			}
		}
	}
}

for (const pkg of packages) {
	const distPath = path.join(__dirname, "..", pkg, "dist");
	const packagePath = path.join(__dirname, "..", pkg);

	console.log(`\nCleaning ${pkg}...`);

	// Delete dist directory
	deleteDirRecursive(distPath);

	// Delete tsbuildinfo files
	deleteTsBuildInfoFiles(packagePath);

	console.log(`✅ ${pkg} cleaned successfully`);
}

console.log("\n✅ All packages cleaned successfully!");
