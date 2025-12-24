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

	/**
	 * Built Artifact Validation
	 *
	 * These tests validate the BUILT dist/ output, not source files.
	 * This catches ESM issues that only appear after bundling:
	 * - ERR_MODULE_NOT_FOUND (missing .js extensions)
	 * - ERR_IMPORT_ATTRIBUTE_MISSING (JSON imports)
	 * - Missing JSON files not copied to dist
	 */
	describe("Built artifact validation (ESM)", () => {
		it("should start built MCP server without ESM errors", async () => {
			// This is the critical test - actually run the built output
			// This catches issues like:
			// - ERR_MODULE_NOT_FOUND: Missing .js extensions in ESM imports
			// - ERR_IMPORT_ATTRIBUTE_MISSING: JSON imports without type assertion
			try {
				const { stdout, stderr } = await execAsync("timeout 3 node dist/index.js 2>&1 || true", {
					cwd: process.cwd(),
					timeout: 10000,
				});

				const output = stdout + stderr;

				// Check for common ESM module resolution errors
				if (output.includes("ERR_MODULE_NOT_FOUND")) {
					const match = output.match(/Cannot find module '([^']+)'/);
					throw new Error(
						`ESM module not found: ${match?.[1] || "unknown"}\n` +
							"Fix: Run 'pnpm build' from root to apply ESM import fixes\n" +
							`Full output:\n${output}`,
					);
				}

				if (output.includes("ERR_IMPORT_ATTRIBUTE_MISSING")) {
					throw new Error(
						"JSON import missing type assertion.\n" +
							"Fix: Use createRequire pattern instead of ESM import for JSON files\n" +
							`Full output:\n${output}`,
					);
				}

				// Should see successful startup message
				expect(output).toContain("SnapBack MCP Server started");
			} catch (error: any) {
				if (error.message.includes("ESM module not found") || error.message.includes("JSON import missing")) {
					throw error;
				}
				// Re-throw with more context
				throw new Error(`Built server startup failed: ${error.message}`);
			}
		}, 15000);

		it("should have required JSON files in dist", async () => {
			const fs = await import("node:fs/promises");
			const path = await import("node:path");

			const requiredJsonFiles = ["dist/ctx/defaults.json", "dist/services/migration-patterns.json"];

			const missing: string[] = [];
			for (const file of requiredJsonFiles) {
				try {
					await fs.access(path.join(process.cwd(), file));
				} catch {
					missing.push(file);
				}
			}

			if (missing.length > 0) {
				throw new Error(
					`Missing JSON files in dist: ${missing.join(", ")}\n` +
						"Fix: Add files to tsup.config.ts onSuccess copy list",
				);
			}
		});

		it("should have .js extensions in all relative ESM imports", async () => {
			const fs = await import("node:fs/promises");
			const path = await import("node:path");
			const glob = await import("node:fs").then((m) => m.promises);

			// Check a sample of critical dist files for missing .js extensions
			const criticalFiles = ["dist/index.js", "dist/ctx/runtime.js", "dist/tools/ctx-tools.js"];

			const issues: string[] = [];
			for (const file of criticalFiles) {
				try {
					const content = await fs.readFile(path.join(process.cwd(), file), "utf-8");
					// Look for relative imports without .js extension
					// Pattern: from "./something" or from "../something" (without .js)
					const badImports = content.match(/from\s+["']\.\.?\/[^"']+(?<!\.js)["']/g);
					if (badImports) {
						issues.push(`${file}: ${badImports.join(", ")}`);
					}
				} catch {
					// File might not exist yet - that's caught by other tests
				}
			}

			if (issues.length > 0) {
				throw new Error(
					`Found relative imports without .js extensions:\n${issues.join("\n")}\n` +
						"Fix: Run 'node scripts/build-utils/add-js-extensions.mjs'",
				);
			}
		});
	});
});
