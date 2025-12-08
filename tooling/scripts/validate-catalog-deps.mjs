#!/usr/bin/env node
/**
 * Catalog Dependency Validator
 *
 * Prevents AI agents and developers from:
 * 1. Adding dependencies not in the pnpm-workspace.yaml catalog
 * 2. Adding forbidden/conflicting packages (e.g., tRPC when using oRPC)
 * 3. Using non-catalog version specifiers for cataloged packages
 *
 * Run: node tooling/scripts/validate-catalog-deps.mjs [package.json files...]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../..");

// ═══════════════════════════════════════════════════════════════════════════
// FORBIDDEN PACKAGES - These should NEVER be added
// ═══════════════════════════════════════════════════════════════════════════
const FORBIDDEN_PACKAGES = new Map([
	// Framework conflicts
	["@angular/core", "Angular is incompatible with this React-based monorepo"],
	[
		"@angular/common",
		"Angular is incompatible with this React-based monorepo",
	],
	["vue", "Vue is incompatible with this React-based monorepo"],
	["svelte", "Svelte is incompatible with this React-based monorepo"],

	// RPC conflicts - we use oRPC, not tRPC
	["@trpc/client", "Use @orpc/client instead - this monorepo uses oRPC"],
	["@trpc/server", "Use @orpc/server instead - this monorepo uses oRPC"],
	[
		"@trpc/next",
		"Use @orpc/tanstack-query instead - this monorepo uses oRPC",
	],
	[
		"@trpc/react-query",
		"Use @orpc/tanstack-query instead - this monorepo uses oRPC",
	],

	// Replaced by Biome
	["prettier", "Use Biome for formatting - run 'pnpm format'"],
	["eslint", "Use Biome for linting - run 'pnpm lint'"],
	["@typescript-eslint/eslint-plugin", "Use Biome - ESLint is not used"],

	// Animation conflicts - use motion (framer-motion successor)
	["framer-motion", "Use 'motion' package instead (framer-motion successor)"],

	// Test runner conflicts - Vitest for unit, Playwright for E2E
	["jest", "Use Vitest for unit tests - run 'pnpm test'"],
	["@jest/core", "Use Vitest for unit tests"],
	["ts-jest", "Use Vitest for unit tests"],
]);

// ═══════════════════════════════════════════════════════════════════════════
// PREFERRED PACKAGES - Suggest alternatives when wrong package is used
// ═══════════════════════════════════════════════════════════════════════════
const PACKAGE_ALTERNATIVES = new Map([
	["axios", "Use 'ky' for HTTP requests - already in catalog"],
	["moment", "Use 'date-fns' for dates - already in catalog"],
	["lodash", "Use 'es-toolkit' for utilities - already in catalog"],
	["underscore", "Use 'es-toolkit' for utilities - already in catalog"],
	["node-fetch", "Use native fetch - Node 18+ supports it"],
	["isomorphic-fetch", "Use native fetch - Node 18+ supports it"],
]);

// ═══════════════════════════════════════════════════════════════════════════
// Load catalog from pnpm-workspace.yaml
// ═══════════════════════════════════════════════════════════════════════════
function loadCatalog() {
	const workspaceFile = path.join(workspaceRoot, "pnpm-workspace.yaml");

	if (!fs.existsSync(workspaceFile)) {
		console.error("❌ pnpm-workspace.yaml not found");
		process.exit(1);
	}

	const content = fs.readFileSync(workspaceFile, "utf-8");

	// Simple YAML parsing for catalog section
	const catalogPackages = new Set();
	const lines = content.split("\n");
	let inCatalog = false;

	for (const line of lines) {
		if (line.trim() === "catalogs:" || line.trim() === "default:") {
			inCatalog = true;
			continue;
		}

		if (inCatalog && line.match(/^\s{4}'?(@?[\w\-/]+)'?:\s/)) {
			const match = line.match(/'?(@?[\w\-/.]+)'?:/);
			if (match) {
				catalogPackages.add(match[1]);
			}
		}

		// Exit catalog section
		if (inCatalog && line.match(/^[a-z]/i) && !line.startsWith(" ")) {
			inCatalog = false;
		}
	}

	return catalogPackages;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validate package.json files
// ═══════════════════════════════════════════════════════════════════════════
function validatePackageJson(filePath, catalogPackages) {
	const errors = [];
	const warnings = [];

	if (!fs.existsSync(filePath)) {
		return { errors: [], warnings: [] };
	}

	const content = fs.readFileSync(filePath, "utf-8");
	let pkg;

	try {
		pkg = JSON.parse(content);
	} catch {
		errors.push(`Invalid JSON in ${filePath}`);
		return { errors, warnings };
	}

	const depTypes = [
		"dependencies",
		"devDependencies",
		"peerDependencies",
		"optionalDependencies",
	];

	for (const depType of depTypes) {
		const deps = pkg[depType];
		if (!deps) continue;

		for (const [pkgName, version] of Object.entries(deps)) {
			// Check forbidden packages
			if (FORBIDDEN_PACKAGES.has(pkgName)) {
				errors.push(
					`🚫 FORBIDDEN: ${pkgName} in ${depType}\n` +
						`   Reason: ${FORBIDDEN_PACKAGES.get(pkgName)}\n` +
						`   File: ${filePath}`
				);
				continue;
			}

			// Check for alternatives
			if (PACKAGE_ALTERNATIVES.has(pkgName)) {
				warnings.push(
					`⚠️  ALTERNATIVE: ${pkgName} in ${depType}\n` +
						`   Suggestion: ${PACKAGE_ALTERNATIVES.get(
							pkgName
						)}\n` +
						`   File: ${filePath}`
				);
			}

			// Skip workspace dependencies
			if (version.startsWith("workspace:")) {
				continue;
			}

			// Check if package is in catalog but not using catalog: protocol
			if (
				catalogPackages.has(pkgName) &&
				!version.startsWith("catalog:")
			) {
				errors.push(
					`📦 USE CATALOG: ${pkgName}@${version} in ${depType}\n` +
						`   This package is in the catalog. Use "catalog:" protocol.\n` +
						`   Change: "${pkgName}": "${version}" → "${pkgName}": "catalog:"\n` +
						`   File: ${filePath}`
				);
			}
		}
	}

	return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main execution
// ═══════════════════════════════════════════════════════════════════════════
let files = process.argv.slice(2).filter((f) => f.endsWith("package.json"));

if (files.length === 0) {
	console.log(
		"Usage: node validate-catalog-deps.mjs [package.json files...]"
	);
	console.log("No files provided, scanning all package.json files...\n");

	// Find all package.json files using simple recursion
	function findPackageJsonFiles(dir, results = []) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (
					entry.name !== "node_modules" &&
					entry.name !== ".git" &&
					entry.name !== "dist"
				) {
					findPackageJsonFiles(fullPath, results);
				}
			} else if (entry.name === "package.json") {
				results.push(fullPath);
			}
		}
		return results;
	}

	files = findPackageJsonFiles(workspaceRoot);
}

const catalogPackages = loadCatalog();
console.log(`📚 Loaded ${catalogPackages.size} packages from catalog\n`);

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
	const absPath = path.isAbsolute(file) ? file : path.resolve(file);
	const { errors, warnings } = validatePackageJson(absPath, catalogPackages);

	totalErrors += errors.length;
	totalWarnings += warnings.length;

	for (const error of errors) {
		console.error(error);
		console.log();
	}

	for (const warning of warnings) {
		console.warn(warning);
		console.log();
	}
}

console.log("─".repeat(60));
console.log(`\n📊 Summary: ${totalErrors} errors, ${totalWarnings} warnings\n`);

if (totalErrors > 0) {
	console.error("❌ Validation failed. Fix errors above before committing.");
	process.exit(1);
}

if (totalWarnings > 0) {
	console.warn(
		"⚠️  Validation passed with warnings. Consider addressing them."
	);
}

console.log("✅ All dependency validations passed!");
process.exit(0);
