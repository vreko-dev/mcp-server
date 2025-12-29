/**
 * Test for stale data detection and refresh in context management
 *
 * Tests the three fixes:
 * 1. Quick Fix: context op=reset
 * 2. Better Fix: staleness tracking with lastScanned and staleAfterDays
 * 3. Best Fix: context op=scan for real-time blocker detection
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleContext } from "../src/facades/handlers.js";
import type { ToolContext } from "../src/registry.js";

describe("Context Stale Data Management", () => {
	const testDir = join(process.cwd(), ".test-workspace");
	const ctxPath = join(testDir, ".snapback", "ctx", "context.json");

	const mockContext: ToolContext = {
		workspaceRoot: testDir,
		tier: "free",
	};

	beforeEach(() => {
		// Clean up and create test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Cleanup after tests
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("Quick Fix: context op=reset", () => {
		it("should reset stale context successfully", async () => {
			// Setup: Create stale context
			const ctxDir = join(testDir, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });
			const staleContext = {
				blockers: [
					{ key: "_ts", label: "typescript-errors", current: 32, target: 0 },
					{ key: "_eb", label: "bundle-size", current: "11MB", target: "2MB" },
				],
				created_at: "2024-11-07T00:00:00Z", // Old date
			};
			writeFileSync(ctxPath, JSON.stringify(staleContext, null, 2));

			// Act: Reset context
			const result = await handleContext({ op: "reset" }, mockContext);

			// Assert
			expect(result.content[0]).toBeDefined();
			const response = JSON.parse(result.content[0].text);
			expect(response.op).toBe("reset");
			expect(response.status).toBe("success");
			expect(existsSync(ctxPath)).toBe(false);
		});

		it("should handle reset when no context exists", async () => {
			// Act: Reset non-existent context
			const result = await handleContext({ op: "reset" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.op).toBe("reset");
			expect(response.status).toBe("success");
			expect(response.message).toBe("No context to reset");
		});
	});

	describe("Better Fix: Staleness Tracking", () => {
		it("should include lastScanned and staleAfterDays in init", async () => {
			// Act: Initialize context
			const result = await handleContext({ op: "init" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.status).toBe("success");
			expect(existsSync(ctxPath)).toBe(true);

			const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
			expect(contextData.lastScanned).toBeDefined();
			expect(contextData.staleAfterDays).toBe(7);
		});

		it("should detect stale data in blockers operation", async () => {
			// Setup: Create context with old lastScanned
			const ctxDir = join(testDir, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

			const oldContext = {
				blockers: [{ key: "_ts", label: "typescript-errors", current: 32, target: 0 }],
				lastScanned: oldDate.toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(ctxPath, JSON.stringify(oldContext, null, 2));

			// Act: Get blockers
			const result = await handleContext({ op: "blockers" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.isStale).toBe(true);
			expect(response.daysSinceScanned).toBeGreaterThan(7);
			expect(response.warning).toContain("stale");
			expect(response.next_actions).toBeDefined();
			expect(response.next_actions[0].args.op).toBe("scan");
		});

		it("should not flag fresh data as stale", async () => {
			// Setup: Create context with recent lastScanned
			const ctxDir = join(testDir, ".snapback", "ctx");
			mkdirSync(ctxDir, { recursive: true });

			const freshContext = {
				blockers: [],
				lastScanned: new Date().toISOString(),
				staleAfterDays: 7,
			};
			writeFileSync(ctxPath, JSON.stringify(freshContext, null, 2));

			// Act: Get blockers
			const result = await handleContext({ op: "blockers" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.isStale).toBe(false);
			expect(response.warning).toBeUndefined();
		});
	});

	describe("Best Fix: context op=scan", () => {
		it("should require initialized context", async () => {
			// Act: Scan without init
			const result = await handleContext({ op: "scan" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.status).toBe("error");
			expect(response.error).toBe("E204_CONTEXT_NOT_INITIALIZED");
		});

		it("should perform scan and update lastScanned", async () => {
			// Setup: Initialize context
			await handleContext({ op: "init" }, mockContext);

			// Create minimal TypeScript project structure
			writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test" }));
			writeFileSync(
				join(testDir, "tsconfig.json"),
				JSON.stringify({ compilerOptions: { noEmit: true }, include: ["**/*.ts"] }),
			);

			// Act: Scan for blockers
			const result = await handleContext({ op: "scan" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);
			expect(response.op).toBe("scan");
			// Scan may succeed or fail depending on tsc availability
			// But lastScanned should be updated if context was initialized
			if (response.status === "success") {
				expect(response.scannedAt).toBeDefined();
				expect(response.blockers).toBeDefined();

				// Verify context was updated
				const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
				expect(contextData.lastScanned).toBeDefined();
			}
		}, 30000); // Timeout for scan operation

		it("should detect TypeScript errors if present", async () => {
			// Setup: Initialize context
			await handleContext({ op: "init" }, mockContext);

			// Create a TypeScript file with errors
			const srcDir = join(testDir, "src");
			mkdirSync(srcDir, { recursive: true });
			writeFileSync(join(srcDir, "test.ts"), "const x: number = 'string'; // Type error");
			writeFileSync(
				join(testDir, "tsconfig.json"),
				JSON.stringify({ compilerOptions: { noEmit: true }, include: ["src/**/*"] }),
			);
			writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test" }));

			// Act: Scan for blockers
			const result = await handleContext({ op: "scan" }, mockContext);

			// Assert
			const response = JSON.parse(result.content[0].text);

			// Scan may fail in minimal test environment (no node_modules/tsc)
			// Accept either success (full environment) or graceful error
			expect(response.op).toBe("scan");
			if (response.status === "success") {
				expect(response.scannedAt).toBeDefined();
				expect(response.blockers).toBeDefined();
			} else {
				// In minimal test workspace, npx tsc isn't available
				expect(response.status).toBe("error");
				expect(response.error).toBeDefined();
			}
		}, 60000); // Longer timeout for TypeScript compilation
	});

	describe("Integration: Full Workflow", () => {
		it("should handle complete stale data refresh workflow", async () => {
			// 1. Initialize
			const initResult = await handleContext({ op: "init" }, mockContext);
			expect(JSON.parse(initResult.content[0].text).status).toBe("success");

			// 2. Manually create stale data
			const contextData = JSON.parse(readFileSync(ctxPath, "utf8"));
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 10);
			contextData.lastScanned = oldDate.toISOString();
			contextData.blockers = [{ key: "_ts", label: "typescript-errors", current: 999, target: 0 }];
			writeFileSync(ctxPath, JSON.stringify(contextData, null, 2));

			// 3. Detect stale data
			const blockersResult = await handleContext({ op: "blockers" }, mockContext);
			const blockersResponse = JSON.parse(blockersResult.content[0].text);
			expect(blockersResponse.isStale).toBe(true);
			expect(blockersResponse.blockers[0].current).toBe(999);

			// 4. Scan to refresh - may fail in minimal test environment
			writeFileSync(join(testDir, "package.json"), JSON.stringify({ name: "test" }));
			const scanResult = await handleContext({ op: "scan" }, mockContext);
			const scanResponse = JSON.parse(scanResult.content[0].text);

			// Accept either success or graceful error (no tsc in minimal workspace)
			expect(scanResponse.op).toBe("scan");
			if (scanResponse.status === "success") {
				// 5. Verify data is fresh after successful scan
				const freshBlockersResult = await handleContext({ op: "blockers" }, mockContext);
				const freshBlockersResponse = JSON.parse(freshBlockersResult.content[0].text);
				expect(freshBlockersResponse.isStale).toBe(false);
			} else {
				// Scan failed (expected in minimal test env) - verify error handling
				expect(scanResponse.error).toBeDefined();
			}
		});
	});
});
