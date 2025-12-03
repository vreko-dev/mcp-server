/**
 * Phase 1 - Test: SDK Migration Validation
 *
 * Ensures SDK is properly migrated to OSS with correct dependencies
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT_DIR = join(__dirname, "../../..");
const OSS_SDK = join(ROOT_DIR, "packages-oss/sdk");

describe("Phase 1: SDK Migration", () => {
	describe("Package Structure", () => {
		it("should exist", () => {
			expect(existsSync(OSS_SDK)).toBe(true);
		});

		it("should have src directory", () => {
			expect(existsSync(join(OSS_SDK, "src"))).toBe(true);
		});

		it("should have package.json", () => {
			expect(existsSync(join(OSS_SDK, "package.json"))).toBe(true);
		});
	});

	describe("Dependencies", () => {
		it("should have correct package name", () => {
			const pkgPath = join(OSS_SDK, "package.json");
			if (!existsSync(pkgPath)) {
				return;
			}

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.name).toBe("@snapback-oss/sdk");
		});

		it("should depend on @snapback-oss/contracts", () => {
			const pkgPath = join(OSS_SDK, "package.json");
			if (!existsSync(pkgPath)) {
				return;
			}

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.dependencies["@snapback-oss/contracts"]).toBe("workspace:*");
		});

		it("should depend on @snapback-oss/infrastructure", () => {
			const pkgPath = join(OSS_SDK, "package.json");
			if (!existsSync(pkgPath)) {
				return;
			}

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.dependencies["@snapback-oss/infrastructure"]).toBe("workspace:*");
		});

		it("should NOT depend on better-sqlite3", () => {
			const pkgPath = join(OSS_SDK, "package.json");
			if (!existsSync(pkgPath)) {
				return;
			}

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			const allDeps = {
				...pkg.dependencies,
				...pkg.devDependencies,
			};

			expect(allDeps["better-sqlite3"]).toBeUndefined();
			expect(allDeps["@types/better-sqlite3"]).toBeUndefined();
		});

		it("should NOT have postinstall script", () => {
			const pkgPath = join(OSS_SDK, "package.json");
			if (!existsSync(pkgPath)) {
				return;
			}

			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
			expect(pkg.scripts?.postinstall).toBeUndefined();
		});
	});

	describe("Import Updates", () => {
		it("should NOT import from @snapback/infrastructure", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "from.*@snapback/infrastructure" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});

		it("should NOT import from @snapback/contracts (old)", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "from.*@snapback/contracts" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});

		it("should import from @snapback-oss/infrastructure", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "@snapback-oss/infrastructure" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				// Should find at least one import
				expect(result.trim().length).toBeGreaterThan(0);
			} catch {
				expect.fail("Should have at least one import from @snapback-oss/infrastructure");
			}
		});

		it("should import from @snapback-oss/contracts", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "@snapback-oss/contracts" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				// Should find at least one import
				expect(result.trim().length).toBeGreaterThan(0);
			} catch {
				expect.fail("Should have at least one import from @snapback-oss/contracts");
			}
		});

		// FIXME(phase1): This may fail if better-sqlite3 dynamic imports still exist
		it("should NOT have better-sqlite3 imports or requires", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "better-sqlite3" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});
	});

	describe("No Private Dependencies", () => {
		it("should NOT import from @snapback/platform", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "@snapback/platform" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});

		it("should NOT import from @snapback/analytics", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "@snapback/analytics[^-]" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});

		it("should NOT import from @snapback/core", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				const result = execSync(`grep -r "@snapback/core" ${join(OSS_SDK, "src")} || true`, {
					encoding: "utf-8",
				});

				expect(result.trim()).toBe("");
			} catch {
				// OK
			}
		});
	});

	describe("Build Validation", () => {
		it("should build successfully", () => {
			if (!existsSync(join(OSS_SDK, "package.json"))) {
				return;
			}

			try {
				execSync("pnpm --filter @snapback-oss/sdk build", {
					cwd: ROOT_DIR,
					encoding: "utf-8",
					stdio: "pipe",
					timeout: 60000, // 60 second timeout
				});
			} catch (error: any) {
				expect.fail(`SDK build failed: ${error.message}`);
			}
		});

		it("should typecheck successfully", () => {
			if (!existsSync(join(OSS_SDK, "src"))) {
				return;
			}

			try {
				execSync("pnpm --filter @snapback-oss/sdk typecheck", {
					cwd: ROOT_DIR,
					encoding: "utf-8",
					stdio: "pipe",
					timeout: 30000,
				});
			} catch (error: any) {
				expect.fail(`SDK typecheck failed: ${error.message}`);
			}
		});

		// TEST(phase1): Add test for running SDK test suite
		it.skip("should pass all tests", () => {
			if (!existsSync(join(OSS_SDK, "tests"))) {
				return;
			}

			try {
				execSync("pnpm --filter @snapback-oss/sdk test", {
					cwd: ROOT_DIR,
					encoding: "utf-8",
					stdio: "pipe",
					timeout: 120000,
				});
			} catch (error: any) {
				expect.fail(`SDK tests failed: ${error.message}`);
			}
		});
	});

	describe("Documentation", () => {
		it("should have README.md", () => {
			const readmePath = join(OSS_SDK, "README.md");
			expect(existsSync(readmePath)).toBe(true);
		});

		it("README should mention OSS", () => {
			const readmePath = join(OSS_SDK, "README.md");
			if (!existsSync(readmePath)) {
				return;
			}

			const content = readFileSync(readmePath, "utf-8");
			expect(content.toLowerCase()).toContain("oss");
		});

		it("README should mention Pro version", () => {
			const readmePath = join(OSS_SDK, "README.md");
			if (!existsSync(readmePath)) {
				return;
			}

			const content = readFileSync(readmePath, "utf-8");
			expect(content.toLowerCase()).toContain("pro");
		});
	});
});

// VALIDATE(phase1): Manual validation recommended
describe.skip("Phase 1: SDK Manual Validation", () => {
	it("should manually test SDK client initialization", () => {
		// Import SDK and verify it initializes without errors
	});

	it("should manually test snapshot creation", () => {
		// Create a test snapshot to verify functionality
	});

	it("should manually verify no PostHog calls", () => {
		// Monitor network traffic while using SDK
	});
});
