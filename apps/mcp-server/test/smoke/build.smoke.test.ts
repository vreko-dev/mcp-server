import { exec } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execAsync = promisify(exec);

/**
 * Build smoke tests - verify the package can actually build and run
 *
 * These tests catch:
 * 1. Missing dependencies in package.json
 * 2. TypeScript compilation errors
 * 3. Import/export issues
 * 4. Module resolution problems
 *
 * This would have caught the missing @snapback/events dependency!
 */
describe("Build Smoke Tests", () => {
	describe("TypeScript compilation", () => {
		it("should compile without errors", async () => {
			try {
				const { stdout, stderr } = await execAsync("pnpm build", {
					cwd: process.cwd(),
					timeout: 60000,
				});

				// Build should succeed (exit code 0)
				expect(stderr).not.toContain("error TS");
				expect(stdout || stderr).toContain("tsc");
			} catch (error: any) {
				// If build fails, show the error
				console.error("Build output:", error.stdout);
				console.error("Build errors:", error.stderr);
				throw new Error(`Build failed: ${error.message}`);
			}
		}, 60000);

		it("should typecheck without errors", async () => {
			try {
				await execAsync("pnpm typecheck", {
					cwd: process.cwd(),
					timeout: 60000,
				});
			} catch (error: any) {
				console.error("Typecheck output:", error.stdout);
				console.error("Typecheck errors:", error.stderr);
				throw new Error(`Typecheck failed: ${error.message}`);
			}
		}, 60000);
	});

	describe("Dependency validation", () => {
		it("should have all imported packages in dependencies", async () => {
			const pkg = await import("../../package.json");
			const indexFile = await import("node:fs/promises").then((fs) => fs.readFile("src/index.ts", "utf-8"));

			// Extract import statements
			const importRegex = /import\s+.*from\s+["'](@[\w-]+\/[\w-]+|[\w-]+)["']/g;
			const imports = [...indexFile.matchAll(importRegex)].map((match) => match[1]);

			// Filter to workspace/external packages only
			const externalImports = imports.filter((imp) => imp.startsWith("@snapback/") || !imp.startsWith("."));

			// Verify each import has a dependency entry
			const allDeps = {
				...pkg.dependencies,
				...pkg.devDependencies,
			};

			const missing: string[] = [];
			for (const imp of externalImports) {
				// Skip built-in node modules
				if (imp.startsWith("node:") || ["zod"].includes(imp)) {
					continue;
				}

				if (!allDeps[imp]) {
					missing.push(imp);
				}
			}

			if (missing.length > 0) {
				throw new Error(
					`Missing dependencies in package.json: ${missing.join(", ")}\n` +
						`Add them with: pnpm add ${missing.join(" ")}`,
				);
			}
		});
	});

	describe("Module resolution", () => {
		it("should be able to import the main module", async () => {
			// This will fail if there are missing dependencies
			try {
				await import("../../src/index.js");
			} catch (error: any) {
				if (error.message.includes("Cannot find module")) {
					throw new Error(
						`Module not found: ${error.message}\n` +
							"This usually means a missing dependency in package.json",
					);
				}
				throw error;
			}
		});

		it("should export startServer function", async () => {
			const module = await import("../../src/index.js");
			expect(module.startServer).toBeDefined();
			expect(typeof module.startServer).toBe("function");
		});
	});

	describe("Runtime validation", () => {
		it("should be able to create server instance", async () => {
			const { startServer } = await import("../../src/index.js");

			// Should not throw during server creation
			const { server, transport } = await startServer();

			expect(server).toBeDefined();
			expect(transport).toBeDefined();
		});
	});
});
