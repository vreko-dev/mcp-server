import { beforeEach, describe, expect, it } from "vitest";
import { DepsHygienePlugin } from "../../src/plugins/deps-hygiene";

describe("PL1-D: Dependency hygiene (offline OSV)", () => {
	let plugin: DepsHygienePlugin;

	beforeEach(() => {
		plugin = new DepsHygienePlugin();
		// Set environment to no_network mode for offline testing
		process.env.SNAPBACK_NO_NETWORK = "true";
	});

	it("pl1-d-001: should detect known vulnerable dependency versions", async () => {
		const content = JSON.stringify({
			name: "test-app",
			version: "1.0.0",
			dependencies: {
				lodash: "4.17.20",
				moment: "2.29.1",
			},
		});

		const result = await plugin.analyze(content, "package.json");

		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toContainEqual(expect.stringContaining("Vulnerable dependency: lodash@4.17.20"));
		expect(result.factors).toContainEqual(expect.stringContaining("Vulnerable dependency: moment@2.29.1"));
		expect(result.severity).toBe("high");
		expect(result.recommendations).toContain("Update vulnerable dependencies to patched versions");
	});

	it("pl1-d-002: should not flag non-package.json files", async () => {
		const content = JSON.stringify({
			dependencies: {
				lodash: "4.17.20",
			},
		});

		const result = await plugin.analyze(content, "config.json");

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});

	it("pl1-d-003: should not flag safe dependency versions", async () => {
		const content = JSON.stringify({
			name: "test-app",
			version: "1.0.0",
			dependencies: {
				lodash: "4.17.21",
				moment: "2.29.2",
			},
		});

		const result = await plugin.analyze(content, "package.json");

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});

	it("pl1-d-004: should reject network calls (offline only)", async () => {
		// Unset the no_network mode to simulate network access
		delete process.env.SNAPBACK_NO_NETWORK;

		const content = JSON.stringify({
			name: "test-app",
			version: "1.0.0",
			dependencies: {
				lodash: "4.17.20",
			},
		});

		const result = await plugin.analyze(content, "package.json");

		// Should return empty result when network is required but not available
		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});

	it("pl1-d-005: should handle malformed package.json gracefully", async () => {
		const content = "{ invalid json }";

		const result = await plugin.analyze(content, "package.json");

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.recommendations).toHaveLength(0);
	});

	it("pl1-d-006: should check both dependencies and devDependencies", async () => {
		const content = JSON.stringify({
			name: "test-app",
			version: "1.0.0",
			dependencies: {
				lodash: "4.17.21",
			},
			devDependencies: {
				moment: "2.29.1",
			},
		});

		const result = await plugin.analyze(content, "package.json");

		expect(result.score).toBeGreaterThan(0);
		expect(result.factors).toContainEqual(expect.stringContaining("Vulnerable dependency: moment@2.29.1"));
		expect(result.severity).toBe("high");
	});
});
