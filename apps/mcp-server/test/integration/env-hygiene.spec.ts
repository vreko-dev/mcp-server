import { beforeEach, describe, expect, it } from "vitest";
import { EnvHygienePlugin } from "../../src/plugins/env-hygiene";

describe("PL1-C: .env hygiene plugin", () => {
	let plugin: EnvHygienePlugin;

	beforeEach(() => {
		plugin = new EnvHygienePlugin();
	});

	it("pl1-c-001: should detect key-like entries that might be secrets", async () => {
		const content = `
API_KEY=sk-1234567890abcdef
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NODE_ENV=production
DEBUG=false
`;
		const result = await plugin.analyze(content, ".env");

		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toContainEqual(expect.stringContaining("Key-like entry detected"));
		expect(result.severity).toBe("high");
		expect(result.recommendations).toContain("Move secrets to secure secret management systems");
	});

	it("pl1-c-002: should ignore .env.example files", async () => {
		const content = `
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
`;
		const result = await plugin.analyze(content, ".env.example");

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});

	it("pl1-c-003: should detect insecure configurations", async () => {
		const content = `
DEBUG=true
SSL=false
NODE_ENV=development
LOG_LEVEL=debug
`;
		const result = await plugin.analyze(content, ".env");

		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toContainEqual(expect.stringContaining("Insecure configuration"));
		// The test content might also match key-like patterns, so we need to check if it's at least medium
		expect(result.severity).not.toBe("low");
	});

	it("pl1-c-004: should ignore comments and empty lines", async () => {
		const content = `
# This is a comment
# API_KEY=sk-1234567890abcdef

DEBUG=false

# Another comment
`;
		const result = await plugin.analyze(content, ".env");

		// Should not flag the commented out API key
		// Should not flag the DEBUG=false (only flags true/on values)
		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
	});

	it("pl1-c-005: should respect changedLines metadata for diff-aware analysis", async () => {
		const content = `
API_KEY=sk-1234567890abcdef
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NODE_ENV=production
DEBUG=false
`;
		// Only analyze lines 2 and 3 (the API_KEY and DATABASE_URL lines)
		const metadata = { changedLines: [2, 3] };
		const result = await plugin.analyze(content, ".env", metadata);

		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toHaveLength(2); // Should only detect 2 issues
		expect(result.factors).toContainEqual(expect.stringContaining("Key-like entry detected: API_KEY"));
		expect(result.factors).toContainEqual(expect.stringContaining("Key-like entry detected: DATABASE_URL"));
	});

	it("pl1-c-006: should not flag safe configurations", async () => {
		const content = `
NODE_ENV=production
PORT=3000
HOST=localhost
LOG_LEVEL=info
`;
		const result = await plugin.analyze(content, ".env");

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});
});
