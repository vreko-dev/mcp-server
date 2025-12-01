#!/usr/bin/env tsx

/**
 * API Surface Change Detector for SnapBack Audit
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface ExportedItem {
	type: "function" | "class" | "interface" | "type" | "variable";
	name: string;
	file: string;
	line: number;
}

function _getGitBranch(): string {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
	} catch (_error) {
		return "HEAD";
	}
}

function getGitDiffFiles(baseRef = "origin/main"): string[] {
	try {
		const output = execSync(`git diff --name-only ${baseRef} HEAD`, { encoding: "utf-8" });
		return output.trim().split("\n").filter(Boolean);
	} catch (error) {
		console.warn("Could not get git diff:", error);
		return [];
	}
}

function findExportedItemsInFile(filePath: string): ExportedItem[] {
	const items: ExportedItem[] = [];

	try {
		if (!fs.existsSync(filePath)) {
			return items;
		}

		const content = fs.readFileSync(filePath, "utf-8");
		const _lines = content.split("\n");

		// Patterns for different export types
		const patterns = [
			{ regex: /export\s+function\s+(\w+)/g, type: "function" },
			{ regex: /export\s+class\s+(\w+)/g, type: "class" },
			{ regex: /export\s+interface\s+(\w+)/g, type: "interface" },
			{ regex: /export\s+type\s+(\w+)/g, type: "type" },
			{ regex: /export\s+(?:const|let|var)\s+(\w+)/g, type: "variable" },
			{ regex: /export\s+\{([^}]+)\}/g, type: "variable" }, // Named exports
		];

		patterns.forEach(({ regex, type }) => {
			let match;
			while ((match = regex.exec(content)) !== null) {
				const name = match[1].trim();
				if (name && !name.startsWith("_")) {
					// Skip private exports
					const lineNumber = content.substring(0, match.index).split("\n").length;
					items.push({ type, name, file: filePath, line: lineNumber });
				}
			}
		});
	} catch (error) {
		console.warn(`Error processing file ${filePath}:`, error);
	}

	return items;
}

function findSourceFiles(): string[] {
	const _sourcePaths = ["src/**/*.ts", "apps/*/src/**/*.ts", "packages/*/src/**/*.ts"];

	// For simplicity, we'll just return a few key paths
	// In a real implementation, we would glob these patterns
	return ["packages/core/src/index.ts", "packages/sdk/src/index.ts", "apps/vscode/src/extension.ts"].filter(
		fs.existsSync,
	);
}

function findTestFilesForAPI(apiName: string): string[] {
	try {
		// Look for test files that might test this API - updated to search correct monorepo paths
		const testFiles = execSync(
			`grep -R --include="*.{spec,test}.ts" -l "${apiName}" apps/*/test packages/*/test test || true`,
			{
				encoding: "utf-8",
				cwd: path.resolve(__dirname, "../../"),
			},
		);

		return testFiles.trim().split("\n").filter(Boolean);
	} catch (_error) {
		return [];
	}
}

async function checkAPISurfaceChanges() {
	console.log("🔍 Checking for API surface changes...\n");

	const baseRef = process.env.BASE_REF || "origin/main";
	console.log(`Comparing against ${baseRef}\n`);

	// Get changed files
	const changedFiles = getGitDiffFiles(baseRef);
	console.log(`Found ${changedFiles.length} changed files\n`);

	// Find source files (simplified)
	const sourceFiles = findSourceFiles();
	console.log(`Analyzing ${sourceFiles.length} source files\n`);

	// Find exported items in source files
	const allExports: ExportedItem[] = [];
	sourceFiles.forEach((file) => {
		const exports = findExportedItemsInFile(file);
		allExports.push(...exports);
	});

	console.log(`Found ${allExports.length} exported items\n`);

	if (allExports.length > 0) {
		console.log("Exported API items:");
		allExports.forEach((item) => {
			console.log(`  ${item.type} ${item.name} (${item.file}:${item.line})`);
		});

		// Check if new APIs have tests
		console.log("\nChecking test coverage for exported APIs...");
		let uncoveredAPIs = 0;

		for (const api of allExports) {
			const testFiles = findTestFilesForAPI(api.name);
			if (testFiles.length === 0) {
				console.log(`  ⚠️ No tests found for ${api.type} ${api.name}`);
				uncoveredAPIs++;
			} else {
				console.log(`  ✅ Found ${testFiles.length} test file(s) for ${api.type} ${api.name}`);
			}
		}

		if (uncoveredAPIs > 0) {
			console.log(`\n❌ ${uncoveredAPIs} exported APIs lack test coverage`);
			return { passed: false, uncoveredAPIs };
		}
		console.log("\n🎉 All exported APIs have test coverage!");
		return { passed: true, uncoveredAPIs: 0 };
	}
	console.log("No exported APIs found");
	return { passed: true, uncoveredAPIs: 0 };
}

// Run the API change checker
checkAPISurfaceChanges()
	.then((result) => {
		if (!result.passed) {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error("Error checking API surface changes:", error);
		process.exit(1);
	});
