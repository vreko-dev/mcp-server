import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export class MonorepoFlattener {
	private sourceRoot: string;
	private targetRoot: string;

	constructor(sourceRoot: string, targetRoot: string) {
		this.sourceRoot = resolve(sourceRoot);
		this.targetRoot = resolve(targetRoot);
	}

	/**
	 * Check if the nested monorepo structure exists
	 */
	hasNestedStructure(): boolean {
		const nestedPath = join(this.sourceRoot, "clients/snapback-clients");
		return existsSync(nestedPath);
	}

	/**
	 * Get all apps from the nested structure
	 */
	getNestedApps(): string[] {
		const nestedAppsPath = join(this.sourceRoot, "clients/snapback-clients/apps");
		if (!existsSync(nestedAppsPath)) {
			return [];
		}

		return readdirSync(nestedAppsPath).filter((item) => statSync(join(nestedAppsPath, item)).isDirectory());
	}

	/**
	 * Get all packages from the nested structure
	 */
	getNestedPackages(): string[] {
		const nestedPackagesPath = join(this.sourceRoot, "clients/snapback-clients/packages");
		if (!existsSync(nestedPackagesPath)) {
			return [];
		}

		return readdirSync(nestedPackagesPath).filter((item) => statSync(join(nestedPackagesPath, item)).isDirectory());
	}

	/**
	 * Move apps from nested structure to main apps directory
	 */
	flattenApps(): { success: boolean; moved: string[]; errors: string[] } {
		const result = {
			success: true,
			moved: [] as string[],
			errors: [] as string[],
		};

		if (!this.hasNestedStructure()) {
			result.errors.push("No nested structure found");
			result.success = false;
			return result;
		}

		const nestedAppsPath = join(this.sourceRoot, "clients/snapback-clients/apps");
		const targetAppsPath = join(this.targetRoot, "apps");

		// Ensure target directory exists
		if (!existsSync(targetAppsPath)) {
			mkdirSync(targetAppsPath, { recursive: true });
		}

		const apps = this.getNestedApps();

		for (const app of apps) {
			try {
				const sourcePath = join(nestedAppsPath, app);
				const targetPath = join(targetAppsPath, app);

				// Check if target already exists
				if (existsSync(targetPath)) {
					result.errors.push(`Target app ${app} already exists`);
					continue;
				}

				// Move the app
				renameSync(sourcePath, targetPath);
				result.moved.push(app);
			} catch (error) {
				result.errors.push(
					`Failed to move app ${app}: ${error instanceof Error ? error.message : String(error)}`,
				);
				result.success = false;
			}
		}

		return result;
	}

	/**
	 * Move packages from nested structure to main packages directory
	 */
	flattenPackages(): { success: boolean; moved: string[]; errors: string[] } {
		const result = {
			success: true,
			moved: [] as string[],
			errors: [] as string[],
		};

		if (!this.hasNestedStructure()) {
			result.errors.push("No nested structure found");
			result.success = false;
			return result;
		}

		const nestedPackagesPath = join(this.sourceRoot, "clients/snapback-clients/packages");
		const targetPackagesPath = join(this.targetRoot, "packages");

		// Ensure target directory exists
		if (!existsSync(targetPackagesPath)) {
			mkdirSync(targetPackagesPath, { recursive: true });
		}

		const packages = this.getNestedPackages();

		for (const pkg of packages) {
			try {
				const sourcePath = join(nestedPackagesPath, pkg);
				const targetPath = join(targetPackagesPath, pkg);

				// Check if target already exists
				if (existsSync(targetPath)) {
					result.errors.push(`Target package ${pkg} already exists`);
					continue;
				}

				// Move the package
				renameSync(sourcePath, targetPath);
				result.moved.push(pkg);
			} catch (error) {
				result.errors.push(
					`Failed to move package ${pkg}: ${error instanceof Error ? error.message : String(error)}`,
				);
				result.success = false;
			}
		}

		return result;
	}

	/**
	 * Complete flattening process
	 */
	flatten(): {
		success: boolean;
		apps: string[];
		packages: string[];
		errors: string[];
	} {
		const result = {
			success: true,
			apps: [] as string[],
			packages: [] as string[],
			errors: [] as string[],
		};

		// Flatten apps
		const appsResult = this.flattenApps();
		result.apps = appsResult.moved;
		result.errors.push(...appsResult.errors);

		if (!appsResult.success) {
			result.success = false;
		}

		// Flatten packages
		const packagesResult = this.flattenPackages();
		result.packages = packagesResult.moved;
		result.errors.push(...packagesResult.errors);

		if (!packagesResult.success) {
			result.success = false;
		}

		return result;
	}
}
