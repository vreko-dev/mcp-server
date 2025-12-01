#!/usr/bin/env node
// tools/capture-baseline.mjs - Capture baseline files for MCP server bring-up

import fs from "node:fs";
import path from "node:path";

// Files to capture
const filesToCapture = [
	"pnpm-workspace.yaml",
	"package.json",
	"apps/mcp-server/package.json",
	"apps/mcp-server/tsup.config.ts",
	"apps/mcp-server/src/index.ts",
	"apps/mcp-server/DEPLOYMENT.md",
];

// Additional patterns to capture
const patternsToCapture = ["packages/*/package.json", "apps/*/package.json", "apps/mcp-server/*"];

// Function to get all files matching a pattern
function getFilesFromPattern(pattern) {
	const results = [];
	const parts = pattern.split("/");

	if (parts.length === 2 && parts[0] === "packages" && parts[1] === "*") {
		// Handle packages/* pattern
		const packagesDir = "packages";
		if (fs.existsSync(packagesDir)) {
			const dirs = fs
				.readdirSync(packagesDir)
				.filter((dir) => fs.statSync(path.join(packagesDir, dir)).isDirectory());
			dirs.forEach((dir) => {
				const packageJson = path.join(packagesDir, dir, "package.json");
				if (fs.existsSync(packageJson)) {
					results.push(packageJson);
				}
			});
		}
	} else if (parts.length === 2 && parts[0] === "apps" && parts[1] === "*") {
		// Handle apps/* pattern
		const appsDir = "apps";
		if (fs.existsSync(appsDir)) {
			const dirs = fs.readdirSync(appsDir).filter((dir) => fs.statSync(path.join(appsDir, dir)).isDirectory());
			dirs.forEach((dir) => {
				const packageJson = path.join(appsDir, dir, "package.json");
				if (fs.existsSync(packageJson)) {
					results.push(packageJson);
				}
			});
		}
	} else if (parts.length === 3 && parts[0] === "apps" && parts[1] === "mcp-server" && parts[2] === "*") {
		// Handle apps/mcp-server/* pattern
		const mcpServerDir = "apps/mcp-server";
		if (fs.existsSync(mcpServerDir)) {
			const files = fs.readdirSync(mcpServerDir);
			files.forEach((file) => {
				// Skip directories, only include files
				const fullPath = path.join(mcpServerDir, file);
				if (fs.statSync(fullPath).isFile()) {
					results.push(fullPath);
				}
			});
		}
	}

	return results;
}

// Capture file contents
const baseline = {};

// Capture specific files
for (const file of filesToCapture) {
	if (fs.existsSync(file)) {
		try {
			baseline[file] = fs.readFileSync(file, "utf8");
		} catch (err) {
			console.error(`Error reading file ${file}:`, err.message);
		}
	} else {
		console.warn(`File not found: ${file}`);
	}
}

// Capture files from patterns
for (const pattern of patternsToCapture) {
	const files = getFilesFromPattern(pattern);
	for (const file of files) {
		if (fs.existsSync(file)) {
			try {
				baseline[file] = fs.readFileSync(file, "utf8");
			} catch (err) {
				console.error(`Error reading file ${file}:`, err.message);
			}
		}
	}
}

// Create output directory if it doesn't exist
const outputDir = "reports/mcp-up";
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Write baseline to file
const outputPath = path.join(outputDir, "baseline.json");
fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2));

console.log(`Baseline captured with ${Object.keys(baseline).length} files`);
console.log(`Output written to ${outputPath}`);
