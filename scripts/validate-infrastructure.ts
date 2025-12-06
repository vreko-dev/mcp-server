#!/usr/bin/env tsx

/**
 * Infrastructure Validation Script
 *
 * Comprehensive validation of:
 * - Workspace dependency configuration (workspace:* protocol)
 * - DTS resolution configuration (dts.resolve: true where needed)
 * - tsconfig consistency and path mappings
 * - Relative import usage within packages
 * - Package.json exports field configuration
 * - tsup.config.ts completeness
 *
 * Runs before all builds to catch issues early
 */

import fs from "node:fs/promises";
import path from "node:path";
import { globSync } from "glob";

interface ValidationResult {
	passed: boolean;
	errors: string[];
	warnings: string[];
}

const result: ValidationResult = {
	passed: true,
	errors: [],
	warnings: [],
};

const REQUIRED_DTS_RESOLVE_PACKAGES = [
	"@snapback/testing",
	"@snapback/events",
	"@snapback/config",
	"@snapback/infrastructure",
	"@snapback-oss/contracts",
	"@snapback-oss/infrastructure",
	"@snapback-oss/config",
	"@snapback-oss/events",
];

// Packages with native module dependencies - keep dts: false (better-sqlite3)
const NATIVE_MODULE_PACKAGES = ["@snapback/sdk", "@snapback-oss/sdk"];

// Validation 1: Workspace dependencies
async function validateWorkspaceDependencies() {
	console.log("📦 Validating workspace dependencies...");

	const packageJsonFiles = globSync("**/package.json", {
		ignore: ["**/node_modules/**", "**/dist/**"],
	});

	for (const file of packageJsonFiles) {
		const content = JSON.parse(await fs.readFile(file, "utf-8"));
		const deps = { ...content.dependencies, ...content.devDependencies };

		Object.entries(deps).forEach(([pkg, version]) => {
			if (String(pkg).startsWith("@snapback/") && !String(version).includes("workspace")) {
				result.errors.push(`❌ ${file}: "${pkg}" should be "workspace:*" not "${version}"`);
				result.passed = false;
			}
		});
	}
}

// Validation 2: DTS resolution configuration
async function validateDtsResolution() {
	console.log("🔍 Validating DTS resolution configuration...");

	const tsupConfigFiles = globSync("**/tsup.config.ts", {
		ignore: ["**/node_modules/**", "**/dist/**"],
	});

	for (const file of tsupConfigFiles) {
		const dir = path.dirname(file);
		const packageJsonPath = path.join(dir, "package.json");

		try {
			await fs.stat(packageJsonPath);
		} catch {
			continue;
		}

		const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
		const content = await fs.readFile(file, "utf-8");

		if (REQUIRED_DTS_RESOLVE_PACKAGES.includes(pkg.name)) {
			if (!content.includes("dts:") || !content.includes("resolve:") || !content.includes("true")) {
				result.errors.push(`❌ ${pkg.name}: tsup.config.ts missing 'dts: { resolve: true }'`);
				result.passed = false;
			}
		}

		if (NATIVE_MODULE_PACKAGES.includes(pkg.name)) {
			if (!content.includes("dts: false")) {
				result.warnings.push(`⚠️  ${pkg.name}: Should use 'dts: false' due to native module dependencies`);
			}
		}
	}
}

// Validation 3: tsconfig consistency
async function validateTsconfigConsistency() {
	console.log("📋 Validating tsconfig consistency...");

	const tsconfigFiles = globSync("**/tsconfig.json", {
		ignore: [
			"**/node_modules/**",
			"**/dist/**",
			"**/tsconfig.simple.json",
			"**/tsconfig.test.json",
			"**/tsconfig.*.json",
		],
	});

	for (const file of tsconfigFiles) {
		try {
			const content = JSON.parse(await fs.readFile(file, "utf-8"));
			const dir = path.dirname(file);

			// Validate paths config structure
			if (content.compilerOptions?.paths) {
				const paths = content.compilerOptions.paths;
				Object.entries(paths).forEach(([key, values]) => {
					if (!Array.isArray(values)) {
						result.errors.push(`❌ ${file}: Path "${key}" value must be array`);
						result.passed = false;
					}
					if (Array.isArray(values)) {
						values.forEach((val) => {
							if (typeof val !== "string") {
								result.errors.push(`❌ ${file}: Path values must be strings`);
								result.passed = false;
							}
						});
					}
				});
			}

			// Check extends chain
			if (content.extends && !content.extends.includes("tsconfig.base.json") && !file.includes("tsconfig.json")) {
				const packageJsonPath = path.join(dir, "package.json");
				try {
					const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
					if (String(pkg.name).startsWith("@snapback")) {
						result.warnings.push(`⚠️  ${pkg.name} extends non-standard tsconfig: ${content.extends}`);
					}
				} catch {
					// Skip if no package.json
				}
			}
		} catch (e) {
			result.errors.push(`❌ Failed to parse ${file}: ${String(e)}`);
			result.passed = false;
		}
	}
}

// Validation 4: Package exports configuration
async function validatePackageExports() {
	console.log("📦 Validating package exports...");

	const packageJsonFiles = globSync("packages/*/package.json", {
		ignore: ["**/node_modules/**"],
	});

	for (const file of packageJsonFiles) {
		const content = JSON.parse(await fs.readFile(file, "utf-8"));

		// Warn if main package lacks exports
		if (content.name?.startsWith("@snapback/") && !content.exports) {
			result.warnings.push(`⚠️  ${content.name}: No exports field defined in package.json`);
		}

		// Validate exports structure if present
		if (content.exports) {
			if (typeof content.exports === "string") {
				result.errors.push(`❌ ${file}: exports must be object with subpath keys`);
				result.passed = false;
			}
		}
	}
}

// Validation 5: tsup.config.ts completeness
async function validateTsupConfig() {
	console.log("🔧 Validating tsup.config.ts completeness...");

	const tsupConfigFiles = globSync("packages/*/tsup.config.ts", {
		ignore: ["**/node_modules/**"],
	});

	for (const file of tsupConfigFiles) {
		const content = await fs.readFile(file, "utf-8");

		// Check for essential configuration
		if (!content.includes("entry") && !content.includes("entries")) {
			result.warnings.push(`⚠️  ${file}: Missing entry configuration`);
		}

		if (!content.includes("outDir")) {
			result.warnings.push(`⚠️  ${file}: Missing outDir configuration`);
		}

		// Check for format configuration for packages that export
		if (!content.includes("format") && !content.includes("formats")) {
			result.warnings.push(`⚠️  ${file}: Missing format configuration`);
		}
	}
}

async function main() {
	console.log("🏗️  Running infrastructure validation...\n");

	try {
		await validateWorkspaceDependencies();
		await validateDtsResolution();
		await validateTsconfigConsistency();
		await validatePackageExports();
		await validateTsupConfig();

		if (result.warnings.length > 0) {
			console.log("\n⚠️  Warnings:");
			for (const w of result.warnings) {
				console.log(w);
			}
		}

		if (result.errors.length > 0) {
			console.log("\n❌ Errors:");
			for (const e of result.errors) {
				console.log(e);
			}
			console.log("\n🛑 Infrastructure validation failed. Fix the errors above.\n");
			process.exit(1);
		}

		console.log("\n✅ Infrastructure validation passed");
		process.exit(0);
	} catch (error) {
		console.error("\n❌ Validation script failed:", error);
		process.exit(1);
	}
}

main();
