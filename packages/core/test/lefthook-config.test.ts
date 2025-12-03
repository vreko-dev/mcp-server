import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("Lefthook Configuration", () => {
	it("should include detect-patterns command in pre-push hooks", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check for the presence of the detect-patterns command in pre-push
		expect(lefthookContent).toContain("detect-patterns:");
		expect(lefthookContent).toContain('glob: "packages/core/src/detection/**/*.ts"');
		expect(lefthookContent).toContain('pnpm run test -- "packages/core/test/detection/**/*.test.ts" --run');
	});

	it("should have no-unsafe-regex disabled (using Biome instead)", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check that no-unsafe-regex is commented out
		expect(lefthookContent).toContain("# no-unsafe-regex:");
		expect(lefthookContent).toContain("# Temporarily disabled: ESLint not configured in monorepo");
	});

	it("should have proper command structure for detection tests", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check for pre-push section
		expect(lefthookContent).toContain("pre-push:");
		expect(lefthookContent).toContain("parallel: true");

		// Verify that detect-patterns exists in pre-push with correct structure
		expect(lefthookContent).toMatch(/detect-patterns:\s+tags: \[detection, guardian, quality\]/);
		expect(lefthookContent).toMatch(/pnpm run test -- "packages\/core\/test\/detection\/\*\*\/\*\.test\.ts" --run/);
	});
});
