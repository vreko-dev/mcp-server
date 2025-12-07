#!/usr/bin/env node

/**
 * Validate Exports Integrity
 *
 * This script ensures that filtered exports in publishConfig are not
 * unconditionally imported in source code, preventing module resolution
 * failures at build time.
 *
 * Runs as a Turbo task before build to catch cross-package import issues.
 */

import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

const WORKSPACE_ROOT = process.cwd();
const PACKAGES_DIR = path.join(WORKSPACE_ROOT, "packages");
const APPS_DIR = path.join(WORKSPACE_ROOT, "apps");

// Get all package.json files
const packageJsonFiles = [
	...globSync(path.join(PACKAGES_DIR, "*/package.json")),
	...globSync(path.join(APPS_DIR, "*/package.json")),
];

// Track packages and their filtered exports
// Map<packageName, {name, filteredExports[]}>
const publishedExports = new Map();

// Step 1: Build map of published exports (exports that exist in source but filtered out)
console.log("🔍 Scanning publishConfig for filtered exports...\n");

for (const pkgJsonPath of packageJsonFiles) {
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
	const pkgName = pkgJson.name;
	const _pkgDir = path.dirname(pkgJsonPath);

	if (!pkgJson.publishConfig?.exports) {
		continue;
	}

	const publishedPaths = Object.keys(pkgJson.publishConfig.exports);
	const allExports = pkgJson.exports ? Object.keys(pkgJson.exports) : [];

	// Find filtered exports (in regular exports but not in publishConfig)
	const filtered = allExports.filter((exp) => !publishedPaths.includes(exp));

	if (filtered.length > 0) {
		publishedExports.set(pkgName, {
			name: pkgName,
			filteredExports: filtered,
		});
	}
}

// Step 2: Find unconditional imports of filtered modules
console.log("🔎 Scanning source code for unconditional imports...\n");

const sourceFiles = [
	...globSync(path.join(PACKAGES_DIR, "**/src/**/*.{ts,tsx}")),
	...globSync(path.join(APPS_DIR, "/**/src/**/*.{ts,tsx}")),
].filter((file) => !file.includes("node_modules") && !file.includes(".next") && !file.includes("dist"));

const violations = [];

for (const filePath of sourceFiles) {
	const content = fs.readFileSync(filePath, "utf-8");

	for (const [pkgName, config] of publishedExports.entries()) {
		for (const filteredPath of config.filteredExports) {
			const importPath = `${pkgName}${filteredPath}`;

			// Look for unconditional imports
			const unconditionalPatterns = [
				// import { x } from '@pkg/filtered'
				new RegExp(
					`import\\s+[^;]*from\\s+['"]${pkgName.replace(/\//g, "\\/")}${
						filteredPath.replace(/\//g, "\\/")[0] === "/" ? filteredPath.replace(/\//g, "\\/") : ""
					}['"];`,
					"g",
				),
				// require('@pkg/filtered')
				new RegExp(
					`require\\s*\\(\\s*['"]${pkgName.replace(/\//g, "\\/")}${
						filteredPath.replace(/\//g, "\\/")[0] === "/" ? filteredPath.replace(/\//g, "\\/") : ""
					}['"]\\s*\\)`,
					"g",
				),
			];

			for (const pattern of unconditionalPatterns) {
				const matches = content.match(pattern);
				if (matches) {
					// Check if import is guarded
					const lines = content.split("\n");
					const lineIndex = lines.findIndex((line) => pattern.test(line));

					if (lineIndex > -1) {
						const line = lines[lineIndex];
						const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : "";

						// Check for guards: typeof window, if statement, try-catch
						const isGuarded =
							/typeof\s+window/.test(prevLine) ||
							/typeof\s+window/.test(line) ||
							/if\s*\(/.test(prevLine) ||
							/try\s*\{/.test(prevLine) ||
							/\/\/ @ts-ignore/.test(prevLine);

						if (!isGuarded) {
							violations.push({
								file: path.relative(WORKSPACE_ROOT, filePath),
								line: lineIndex + 1,
								importPath,
								message: `Unconditional import of filtered export "${filteredPath}" from "${pkgName}"`,
							});
						}
					}
				}
			}
		}
	}
}

// Step 3: Report results
if (violations.length > 0) {
	console.error(`\n❌ Found ${violations.length} violation(s):\n`);

	for (const violation of violations) {
		console.error(`  📍 ${violation.file}:${violation.line}\n     ${violation.message}\n`);
	}

	console.error("\n💡 Fix: Guard the import with environment checks:");
	console.error('   if (typeof window === "undefined") { require("@pkg/filtered") }');
	console.error("");

	process.exit(1);
} else {
	console.log(`✅ All ${publishedExports.size} filtered exports are properly guarded\n`);
	process.exit(0);
}
