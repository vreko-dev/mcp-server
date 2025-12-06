/**
 * Phase 1 - Test: Validate OSS Directory Structure
 *
 * Ensures packages-oss/ is set up correctly before proceeding with migration
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = join(__dirname, "../../..");
const OSS_DIR = join(ROOT_DIR, "packages-oss");

describe("Phase 1: OSS Directory Structure", () => {
	describe("Directory Existence", () => {
		it("should have packages-oss/ directory", () => {
			expect(existsSync(OSS_DIR)).toBe(true);
		});

		it("should have infrastructure package directory", () => {
			expect(existsSync(join(OSS_DIR, "infrastructure"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "infrastructure/src"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "infrastructure/test"))).toBe(true);
		});

		it("should have contracts package directory", () => {
			expect(existsSync(join(OSS_DIR, "contracts"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "contracts/src"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "contracts/test"))).toBe(true);
		});

		it("should have sdk package directory", () => {
			expect(existsSync(join(OSS_DIR, "sdk"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "sdk/src"))).toBe(true);
			expect(existsSync(join(OSS_DIR, "sdk/test"))).toBe(true);
		});

		// TODO(phase1): Add tests for config and events packages when created
	});

	describe("Package Configuration", () => {
		it("should have valid package.json for infrastructure", () => {
			const pkgPath = join(OSS_DIR, "infrastructure/package.json");
			expect(existsSync(pkgPath)).toBe(true);

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.name).toBe("@snapback-oss/infrastructure");
			expect(pkg.version).toBeDefined();
			expect(pkg.main).toBe("dist/index.js");
			expect(pkg.types).toBe("dist/index.d.ts");
		});

		it("infrastructure should NOT have posthog dependency", () => {
			const pkgPath = join(OSS_DIR, "infrastructure/package.json");
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

			const allDeps = {
				...pkg.dependencies,
				...pkg.devDependencies,
				...pkg.peerDependencies,
			};

			expect(allDeps["posthog-node"]).toBeUndefined();
			expect(allDeps["posthog-js"]).toBeUndefined();
		});

		it("should have valid package.json for contracts", () => {
			const pkgPath = join(OSS_DIR, "contracts/package.json");
			expect(existsSync(pkgPath)).toBe(true);

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.name).toBe("@snapback-oss/contracts");
			expect(pkg.dependencies.zod).toBeDefined();
		});

		it("should have valid package.json for sdk", () => {
			const pkgPath = join(OSS_DIR, "sdk/package.json");
			expect(existsSync(pkgPath)).toBe(true);

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.name).toBe("@snapback-oss/sdk");
			expect(pkg.dependencies["@snapback-oss/contracts"]).toBe("workspace:*");
			expect(pkg.dependencies["@snapback-oss/infrastructure"]).toBe("workspace:*");
		});

		// TEST(phase1): Add test to verify sdk does NOT have better-sqlite3 in dependencies
		it("sdk should NOT have better-sqlite3 dependency", () => {
			const pkgPath = join(OSS_DIR, "sdk/package.json");

			if (existsSync(pkgPath)) {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
				const allDeps = {
					...pkg.dependencies,
					...pkg.devDependencies,
				};

				expect(allDeps["better-sqlite3"]).toBeUndefined();
				expect(allDeps["@types/better-sqlite3"]).toBeUndefined();
			}
		});
	});

	describe("Workspace Configuration", () => {
		it("pnpm-workspace.yaml should include packages-oss", () => {
			const workspacePath = join(ROOT_DIR, "pnpm-workspace.yaml");
			expect(existsSync(workspacePath)).toBe(true);

			const content = readFileSync(workspacePath, "utf-8");

			// Should include packages-oss/* or packages-oss/**
			const hasOssPackages =
				content.includes("packages-oss/*") ||
				content.includes("packages-oss/**") ||
				content.includes("'packages-oss/*'") ||
				content.includes('"packages-oss/*"');

			expect(hasOssPackages).toBe(true);
		});

		// TODO(phase1): Add test for turbo.json once updated
		it.skip("turbo.json should include packages-oss in pipeline", () => {
			const turboPath = join(ROOT_DIR, "turbo.json");
			const content = readFileSync(turboPath, "utf-8");

			// Verify packages-oss is referenced in pipeline
			expect(content).toContain("packages-oss");
		});
	});

	describe("TypeScript Configuration", () => {
		it("should have tsconfig.base.json in packages-oss", () => {
			const tsconfigPath = join(OSS_DIR, "tsconfig.base.json");
			expect(existsSync(tsconfigPath)).toBe(true);

			const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
			expect(tsconfig.extends).toBe("../tsconfig.base.json");
			expect(tsconfig.compilerOptions).toBeDefined();
		});
	});

	describe("Documentation", () => {
		it("should have README.md in packages-oss", () => {
			const readmePath = join(OSS_DIR, "README.md");
			expect(existsSync(readmePath)).toBe(true);

			const content = readFileSync(readmePath, "utf-8");
			expect(content).toContain("SnapBack OSS Packages");
			expect(content).toContain("Never add");
		});
	});

	describe("IP Protection Validation", () => {
		it("should NOT contain any private package references", () => {
			// TODO(phase1): Implement grep-based check for private package imports
			// Search for: @snapback/platform, @snapback/analytics, @snapback/core
			// Should find ZERO matches in packages-oss/
		});

		// VALIDATE(phase1): Manual check for sensitive files
		it.skip("should NOT contain tier/subscription logic", () => {
			// This will be tested after contracts filtering
		});
	});
});

describe("Phase 1: Rollback Safety", () => {
	it("should have rollback script", () => {
		const _rollbackPath = join(ROOT_DIR, "scripts/oss-migration/migration-rollback.sh");
		// TODO(phase1): Create rollback script
		// expect(existsSync(rollbackPath)).toBe(true);
	});
});
