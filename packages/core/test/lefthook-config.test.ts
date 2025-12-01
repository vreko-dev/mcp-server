import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("Lefthook Configuration", () => {
	it("should include detect-patterns command in pre-commit hooks", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check for the presence of the detect-patterns command
		expect(lefthookContent).toContain("detect-patterns:");
		expect(lefthookContent).toContain('glob: "*.{ts,tsx,js,jsx}"');
		expect(lefthookContent).toContain("run: pnpm run test -- packages/core/test/detection --passWithNoTests");
	});

	it("should include no-unsafe-regex rule in pre-commit hooks", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check for the presence of the no-unsafe-regex command
		expect(lefthookContent).toContain("no-unsafe-regex:");
		expect(lefthookContent).toContain('glob: "packages/core/src/detection/**/*.ts"');
		expect(lefthookContent).toContain("run: pnpm exec eslint {staged_files} --rule 'no-unsafe-regex:error'");
	});

	it("should have proper command structure", async () => {
		// Read the lefthook configuration file
		const lefthookPath = path.join(__dirname, "../../../.lefthook.yml");
		expect(fs.existsSync(lefthookPath)).toBe(true);

		const lefthookContent = fs.readFileSync(lefthookPath, "utf8");

		// Check for pre-commit section and parallel execution
		expect(lefthookContent).toContain("pre-commit:");
		expect(lefthookContent).toContain("parallel: true");

		// Verify that both commands exist with correct structure
		// Check that detect-patterns command has the right structure
		expect(lefthookContent).toMatch(/detect-patterns:\s+glob: "\*\.\{ts,tsx,js,jsx\}"/);
		expect(lefthookContent).toMatch(/run: pnpm run test -- packages\/core\/test\/detection --passWithNoTests/);

		// Check that no-unsafe-regex command has the right structure
		expect(lefthookContent).toMatch(/no-unsafe-regex:\s+glob: "packages\/core\/src\/detection\/\*\*\/\*\.ts"/);
		expect(lefthookContent).toMatch(/run: pnpm exec eslint \{staged_files\} --rule 'no-unsafe-regex:error'/);
	});
});
