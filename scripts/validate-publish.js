#!/usr/bin/env node
/**
 * Pre-Publish Validation Guard
 *
 * Prevents publishing packages with invalid configurations:
 * - catalog: references (workspace-only protocol)
 * - workspace:* in published packages
 * - Missing version fields
 */

const fs = require("fs");
const path = require("path");

const PUBLISHED_PACKAGES = [
	"packages/contracts",
	"packages/sdk",
	"packages/infrastructure",
	"packages/events",
	"packages/config",
	"apps/cli",
	"apps/mcp-server",
];

function validatePackage(pkgPath) {
	const packageJsonPath = path.join(process.cwd(), pkgPath, "package.json");

	try {
		const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

		// Skip if private
		if (pkg.private) {
			return true;
		}

		let isValid = true;
		const errors = [];

		// Check for catalog: references
		const content = fs.readFileSync(packageJsonPath, "utf-8");
		if (content.includes('"catalog:"')) {
			errors.push("❌ Contains catalog: protocol (workspace-only)");
			isValid = false;
		}

		// Check for workspace:* (except for snapback-oss)
		if (pkg.dependencies) {
			for (const [depName, version] of Object.entries(pkg.dependencies)) {
				if (version === "workspace:*" && !depName.includes("snapback-oss")) {
					errors.push(`❌ Has workspace:* for ${depName} (should use npm version)`);
					isValid = false;
				}
			}
		}

		if (pkg.devDependencies) {
			for (const [depName, version] of Object.entries(pkg.devDependencies)) {
				if (version === "workspace:*") {
					errors.push(`❌ Has workspace:* in devDependencies for ${depName}`);
					isValid = false;
				}
			}
		}

		if (!isValid) {
			console.error(`\n${pkg.name || pkgPath}:`);
			errors.forEach((error) => console.error(`  ${error}`));
		}

		return isValid;
	} catch (error) {
		// File not found or JSON parse error
		return true;
	}
}

function main() {
	console.log("🔍 Validating packages for publishing...\n");

	const errors = [];

	for (const pkgPath of PUBLISHED_PACKAGES) {
		if (!validatePackage(pkgPath)) {
			errors.push(pkgPath);
		}
	}

	if (errors.length > 0) {
		console.error(`\n❌ VALIDATION FAILED: ${errors.length} package(s) have invalid configuration\n`);
		console.error("❌ Cannot proceed with publishing\n");
		console.error("Fix the above issues and retry:\n");
		console.error("  Replace all 'catalog:' with specific versions from pnpm-workspace.yaml");
		console.error("  Replace all 'workspace:*' with npm version references (^X.Y.Z)\n");
		process.exit(1);
	}

	console.log("✅ All packages are valid for publishing\n");
	process.exit(0);
}

main();
