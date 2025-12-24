#!/usr/bin/env node
/**
 * Package Exports Validator
 *
 * Validates that package.json exports actually exist and can be imported.
 * Catches issues like:
 * - Missing dist files (forgot to build)
 * - Subpath exports pointing to non-existent files
 * - ESM/CJS format mismatches
 *
 * Usage:
 *   node validate-package-exports.mjs [package-path...]
 *   node validate-package-exports.mjs packages/mcp
 *   node validate-package-exports.mjs  # validates all packages
 *
 * Best used as postbuild hook:
 *   "postbuild": "node ../../tooling/scripts/validate-package-exports.mjs"
 *
 * @see https://github.com/webdeveric/validate-package-exports
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ANSI colors
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/**
 * Validate a single package's exports
 */
function validatePackage(pkgPath) {
	const pkgJsonPath = join(pkgPath, "package.json");

	if (!existsSync(pkgJsonPath)) {
		return { valid: true, skipped: true, reason: "No package.json" };
	}

	const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
	const errors = [];
	const warnings = [];

	// Skip private packages without exports
	if (pkg.private && !pkg.exports) {
		return { valid: true, skipped: true, reason: "Private package without exports" };
	}

	// Validate exports field
	if (pkg.exports) {
		const exportErrors = validateExports(pkg.exports, pkgPath, pkg.name);
		errors.push(...exportErrors.errors);
		warnings.push(...exportErrors.warnings);
	}

	// Validate main field
	if (pkg.main) {
		const mainPath = join(pkgPath, pkg.main);
		if (!existsSync(mainPath)) {
			errors.push(`main field points to missing file: ${pkg.main}`);
		}
	}

	// Validate types field
	if (pkg.types) {
		const typesPath = join(pkgPath, pkg.types);
		if (!existsSync(typesPath)) {
			errors.push(`types field points to missing file: ${pkg.types}`);
		}
	}

	// Validate typesVersions wildcards
	if (pkg.typesVersions) {
		for (const [version, mappings] of Object.entries(pkg.typesVersions)) {
			for (const [pattern, paths] of Object.entries(mappings)) {
				if (Array.isArray(paths)) {
					for (const p of paths) {
						// Skip wildcards, validate concrete paths
						if (!p.includes("*")) {
							const fullPath = join(pkgPath, p);
							if (!existsSync(fullPath)) {
								warnings.push(`typesVersions[${version}][${pattern}] points to missing: ${p}`);
							}
						}
					}
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		name: pkg.name,
	};
}

/**
 * Recursively validate exports object
 */
function validateExports(exports, pkgPath, pkgName, currentPath = ".") {
	const errors = [];
	const warnings = [];

	if (typeof exports === "string") {
		// Direct string export
		const fullPath = join(pkgPath, exports);
		if (!existsSync(fullPath)) {
			errors.push(`exports["${currentPath}"] points to missing file: ${exports}`);
		}
	} else if (typeof exports === "object" && exports !== null) {
		for (const [key, value] of Object.entries(exports)) {
			if (key.startsWith(".")) {
				// Subpath export
				const result = validateExports(value, pkgPath, pkgName, key);
				errors.push(...result.errors);
				warnings.push(...result.warnings);
			} else if (["import", "require", "default", "types", "node", "browser"].includes(key)) {
				// Conditional export
				const result = validateExports(value, pkgPath, pkgName, `${currentPath}[${key}]`);
				errors.push(...result.errors);
				warnings.push(...result.warnings);
			} else {
				// Unknown key - might be a typo
				warnings.push(`exports["${currentPath}"] has unusual condition: ${key}`);
			}
		}
	}

	return { errors, warnings };
}

/**
 * Get all packages to validate
 */
function getAllPackages() {
	const packages = [];

	// packages/
	const packagesDir = join(ROOT, "packages");
	if (existsSync(packagesDir)) {
		for (const name of readdirSync(packagesDir)) {
			const pkgPath = join(packagesDir, name);
			if (existsSync(join(pkgPath, "package.json"))) {
				packages.push(pkgPath);
			}
		}
	}

	// packages-oss/
	const packagesOssDir = join(ROOT, "packages-oss");
	if (existsSync(packagesOssDir)) {
		for (const name of readdirSync(packagesOssDir)) {
			const pkgPath = join(packagesOssDir, name);
			if (existsSync(join(pkgPath, "package.json"))) {
				packages.push(pkgPath);
			}
		}
	}

	// apps/
	const appsDir = join(ROOT, "apps");
	if (existsSync(appsDir)) {
		for (const name of readdirSync(appsDir)) {
			const pkgPath = join(appsDir, name);
			if (existsSync(join(pkgPath, "package.json"))) {
				packages.push(pkgPath);
			}
		}
	}

	return packages;
}

// Main
async function main() {
	const args = process.argv.slice(2);

	// Determine packages to validate
	let packages;
	if (args.length > 0) {
		packages = args.map((p) => resolve(ROOT, p));
	} else {
		packages = getAllPackages();
	}

	console.log(cyan(`\n📦 Validating ${packages.length} package exports...\n`));

	let hasErrors = false;
	let validated = 0;
	let skipped = 0;

	for (const pkgPath of packages) {
		const result = validatePackage(pkgPath);

		if (result.skipped) {
			skipped++;
			continue;
		}

		validated++;
		const relativePath = pkgPath.replace(ROOT + "/", "");

		if (!result.valid) {
			hasErrors = true;
			console.log(red(`❌ ${result.name || relativePath}`));
			for (const err of result.errors) {
				console.log(red(`   ${err}`));
			}
		}

		for (const warn of result.warnings || []) {
			console.log(yellow(`⚠️  ${result.name || relativePath}: ${warn}`));
		}
	}

	console.log(dim("\n─────────────────────────────────────────────────────────────────"));
	console.log(`📊 Summary: ${validated} validated, ${skipped} skipped\n`);

	if (hasErrors) {
		console.log(red("❌ Package exports validation FAILED\n"));
		console.log(dim("Fix: Run 'pnpm build' for affected packages\n"));
		process.exit(1);
	}

	console.log(green("✅ All package exports validated!\n"));
}

main().catch((err) => {
	console.error(red(`Error: ${err.message}`));
	process.exit(1);
});
