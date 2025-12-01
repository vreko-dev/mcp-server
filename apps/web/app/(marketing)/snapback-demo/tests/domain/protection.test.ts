import { describe, expect, it } from "vitest";
import {
	cycleProtectionLevel,
	debounce,
	getProtectionBadgeColor,
	getProtectionBadgeText,
	matchPolicy,
	shouldProtectFile,
} from "../../domain/protection";
import type { Policy } from "../../domain/types.js";

describe("Protection Domain Functions", () => {
	describe("cycleProtectionLevel", () => {
		it("should cycle through protection levels correctly", () => {
			expect(cycleProtectionLevel("unprotected")).toBe("watch");
			expect(cycleProtectionLevel("watch")).toBe("warn");
			expect(cycleProtectionLevel("warn")).toBe("block");
			expect(cycleProtectionLevel("block")).toBe("unprotected");
		});
	});

	describe("matchPolicy", () => {
		it("should match file paths against patterns", () => {
			const policy: Policy = {
				pattern: "*.ts",
				protectionLevel: "warn",
				type: "protected",
			};

			expect(matchPolicy("src/index.ts", policy)).toBe(true);
			expect(matchPolicy("src/index.js", policy)).toBe(false);
		});

		it("should handle ignore policies", () => {
			const ignorePolicy: Policy = {
				pattern: "node_modules/*",
				protectionLevel: "unprotected",
				type: "ignore",
			};

			expect(matchPolicy("node_modules/react/index.js", ignorePolicy)).toBe(
				true,
			);
			expect(matchPolicy("src/index.ts", ignorePolicy)).toBe(false);
		});
	});

	describe("shouldProtectFile", () => {
		it("should determine protection level based on policies", () => {
			const policies: Policy[] = [
				{
					pattern: "*.ts",
					protectionLevel: "warn",
					type: "protected",
				},
				{
					pattern: "node_modules/*",
					protectionLevel: "unprotected",
					type: "ignore",
				},
			];

			expect(shouldProtectFile("src/index.ts", policies)).toBe("warn");
			expect(
				shouldProtectFile("node_modules/react/index.js", policies),
			).toBeNull();
			expect(shouldProtectFile("README.md", policies)).toBeNull();
		});

		it("should prioritize ignore policies", () => {
			const policies: Policy[] = [
				{
					pattern: "*",
					protectionLevel: "warn",
					type: "protected",
				},
				{
					pattern: "*.log",
					protectionLevel: "unprotected",
					type: "ignore",
				},
			];

			expect(shouldProtectFile("app.log", policies)).toBeNull();
			expect(shouldProtectFile("src/index.ts", policies)).toBe("warn");
		});
	});

	describe("getProtectionBadgeText", () => {
		it("should return correct badge text for each level", () => {
			expect(getProtectionBadgeText("watch")).toBe("W");
			expect(getProtectionBadgeText("warn")).toBe("!");
			expect(getProtectionBadgeText("block")).toBe("B");
			expect(getProtectionBadgeText("unprotected")).toBe("");
		});
	});

	describe("getProtectionBadgeColor", () => {
		it("should return correct badge color for each level", () => {
			expect(getProtectionBadgeColor("watch")).toBe("blue");
			expect(getProtectionBadgeColor("warn")).toBe("yellow");
			expect(getProtectionBadgeColor("block")).toBe("red");
			expect(getProtectionBadgeColor("unprotected")).toBe("gray");
		});
	});

	describe("debounce", () => {
		it("should debounce function calls", async () => {
			let callCount = 0;
			const debouncedFn = debounce(() => {
				callCount++;
			}, 100);

			// Call the function multiple times rapidly
			debouncedFn();
			debouncedFn();
			debouncedFn();

			// Wait for the debounce delay
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should only have been called once
			expect(callCount).toBe(1);
		});
	});
});
