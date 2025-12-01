import * as fs from "node:fs";
import * as path from "node:path";
import { LRUCache } from "lru-cache";
import { logger } from "../../utils/logger.js";
import type { PackageJson } from "../types.js";

// Cache for package.json results
export const cache = new LRUCache<string, any>({ max: 100 });

/**
 * Find nearest package.json by traversing up directory tree
 * Caches results by directory path
 *
 * @param filePath - File path to start searching from
 * @returns PackageJson or null if not found
 */
export function findPackageJson(filePath: string): PackageJson | null {
	try {
		// Extract directory from filePath
		const dir = path.dirname(filePath);

		// Check cache first
		if (cache.has(dir)) {
			return cache.get(dir) || null;
		}

		// Traverse up to root
		let currentDir = dir;
		const root = path.parse(currentDir).root;

		while (currentDir !== root) {
			const packagePath = path.join(currentDir, "package.json");

			if (fs.existsSync(packagePath)) {
				try {
					const packageContent = fs.readFileSync(packagePath, "utf8");
					const packageJson: PackageJson = JSON.parse(packageContent);

					// Cache valid results
					cache.set(dir, packageJson);
					return packageJson;
				} catch (parseError) {
					logger.warn({ packagePath, error: parseError }, "Failed to parse package.json");
					// Continue searching up the tree
				}
			}

			// Move up one directory
			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) {
				// Reached root
				break;
			}
			currentDir = parentDir;
		}

		// Cache undefined result to avoid repeated searches
		cache.set(dir, undefined);
		return null;
	} catch (error) {
		logger.warn({ filePath, error }, "Error finding package.json");
		return null;
	}
}

/**
 * Check if a dependency is declared in package.json
 *
 * @param packageName - Name of the package to check
 * @param packageJson - Parsed package.json
 * @returns True if dependency is declared
 */
export function isDependencyDeclared(packageName: string, packageJson: PackageJson): boolean {
	if (!packageJson) {
		return false;
	}

	return !!(
		packageJson.dependencies?.[packageName] ||
		packageJson.devDependencies?.[packageName] ||
		packageJson.peerDependencies?.[packageName] ||
		packageJson.optionalDependencies?.[packageName]
	);
}

/**
 * Get all declared dependencies from package.json
 *
 * @param packageJson - Parsed package.json
 * @returns Set of all declared dependency names
 */
export function getAllDeclaredDependencies(packageJson: PackageJson): Set<string> {
	const dependencies = new Set<string>();

	if (!packageJson) {
		return dependencies;
	}

	// Add all types of dependencies
	if (packageJson.dependencies) {
		for (const dep of Object.keys(packageJson.dependencies)) {
			dependencies.add(dep);
		}
	}

	if (packageJson.devDependencies) {
		for (const dep of Object.keys(packageJson.devDependencies)) {
			dependencies.add(dep);
		}
	}

	if (packageJson.peerDependencies) {
		for (const dep of Object.keys(packageJson.peerDependencies)) {
			dependencies.add(dep);
		}
	}

	if (packageJson.optionalDependencies) {
		for (const dep of Object.keys(packageJson.optionalDependencies)) {
			dependencies.add(dep);
		}
	}

	return dependencies;
}
