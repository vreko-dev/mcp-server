#!/usr/bin/env node

/**
 * Script to check that package.json files use catalog: references instead of direct version numbers
 * unless explicitly allowed.
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

// Directories to check
const _packageDirs = [".", "apps/*", "packages/*", "tooling/*", "config"];

// Dependencies that are allowed to have direct versions (workspace packages)
const allowedDirectVersions = ["@snapback/*", "@snapback/tsconfig"];

// Dependencies that must use catalog:
const catalogDependencies = new Set();

// Read the pnpm workspace catalog
function readCatalogDependencies() {
	try {
		const workspaceContent = fs.readFileSync("pnpm-workspace.yaml", "utf8");

		// Parse the YAML content
		const workspace = yaml.load(workspaceContent);

		// Check if catalogs exist
		if (workspace.catalogs?.default) {
			// Add all dependencies from the default catalog
			Object.keys(workspace.catalogs.default).forEach((dep) => {
				catalogDependencies.add(dep);
			});
		}
	} catch (error) {
		console.error("Error reading pnpm workspace catalog:", error.message);
	}
}

// Check if a dependency should use catalog
function shouldUseCatalog(dependency) {
	return catalogDependencies.has(dependency);
}

// Check if a version is a direct version number
function isDirectVersion(version) {
	if (typeof version !== "string") {
		return false;
	}

	// Allow workspace protocol, catalog references, and local file references
	if (
		version.startsWith("workspace:") ||
		version === "catalog:" ||
		version.startsWith("file:") ||
		version.startsWith("link:")
	) {
		return false;
	}

	// Check if it looks like a version number
	return (
		/^[\^~]?(\d+\.)*\d+/.test(version) ||
		/^\d+\.\d+\.\d+/.test(version) ||
		version.includes("beta") ||
		version.includes("alpha") ||
		version.includes("rc")
	);
}

// Check a single package.json file
function checkPackageFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const pkg = JSON.parse(content);

		const errors = [];

		// Check dependencies
		if (pkg.dependencies) {
			Object.entries(pkg.dependencies).forEach(([dep, version]) => {
				if (isDirectVersion(version) && shouldUseCatalog(dep)) {
					// Check if this is an allowed direct version
					const isAllowed = allowedDirectVersions.some((allowed) => {
						if (allowed.includes("*")) {
							const pattern = allowed.replace("*", ".*");
							return new RegExp(`^${pattern}$`).test(dep);
						}
						return allowed === dep;
					});

					if (!isAllowed) {
						errors.push({
							file: filePath,
							dependency: dep,
							version: version,
							message: `Dependency "${dep}" should use "catalog:" instead of "${version}"`,
						});
					}
				}
			});
		}

		// Check devDependencies
		if (pkg.devDependencies) {
			Object.entries(pkg.devDependencies).forEach(([dep, version]) => {
				if (isDirectVersion(version) && shouldUseCatalog(dep)) {
					// Check if this is an allowed direct version
					const isAllowed = allowedDirectVersions.some((allowed) => {
						if (allowed.includes("*")) {
							const pattern = allowed.replace("*", ".*");
							return new RegExp(`^${pattern}$`).test(dep);
						}
						return allowed === dep;
					});

					if (!isAllowed) {
						errors.push({
							file: filePath,
							dependency: dep,
							version: version,
							message: `Dev dependency "${dep}" should use "catalog:" instead of "${version}"`,
						});
					}
				}
			});
		}

		return errors;
	} catch (error) {
		console.error(`Error checking ${filePath}:`, error.message);
		return [];
	}
}

// Find all package.json files
function findPackageFiles() {
	const packageFiles = [];

	// Check root package.json
	if (fs.existsSync("package.json")) {
		packageFiles.push("package.json");
	}

	// Check apps, packages, tooling directories
	["apps", "packages", "tooling", "config"].forEach((dir) => {
		if (fs.existsSync(dir)) {
			const items = fs.readdirSync(dir);
			items.forEach((item) => {
				const itemPath = path.join(dir, item);
				const packagePath = path.join(itemPath, "package.json");
				if (fs.existsSync(packagePath)) {
					packageFiles.push(packagePath);
				}
			});
		}
	});

	return packageFiles;
}

// Main function
function main() {
	console.log("🔍 Checking package.json files for direct version numbers...");

	// Read catalog dependencies
	readCatalogDependencies();

	// Find all package.json files
	const packageFiles = findPackageFiles();

	// Check each file
	let totalErrors = 0;
	packageFiles.forEach((file) => {
		const errors = checkPackageFile(file);
		if (errors.length > 0) {
			console.log(`\n❌ Issues found in ${file}:`);
			errors.forEach((error) => {
				console.log(`  - ${error.message}`);
			});
			totalErrors += errors.length;
		}
	});

	if (totalErrors > 0) {
		console.log(
			`\n🚨 ${totalErrors} issues found. Please use "catalog:" for dependencies defined in pnpm workspace catalog.`,
		);
		console.log("\n💡 To fix:");
		console.log("  1. Check pnpm-workspace.yaml for available catalog entries");
		console.log('  2. Replace direct versions with "catalog:" for catalog dependencies');
		console.log('  3. Use "workspace:*" for local package dependencies');
		process.exit(1);
	} else {
		console.log("✅ All package.json files are using catalog references correctly!");
		process.exit(0);
	}
}

main();
