/**
 * Tests for SnapBackRC Parser
 *
 * This test suite validates the platform-agnostic .snapbackrc file parsing
 * and validation functionality.
 */

import { describe, expect, it } from "vitest";
import { SnapBackRCParser } from "../../src/config/SnapBackRCParser.js";
import type { SnapBackRC } from "../../src/config/types.js";

describe("SnapBackRCParser", () => {
	describe("Parsing valid configurations", () => {
		it("should parse minimal valid configuration", () => {
			const config = `{
				"protection": [
					{
						"pattern": "package.json",
						"level": "Protected"
					}
				]
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(true);
			expect(result.config).toBeDefined();
			expect(result.config?.protection).toHaveLength(1);
			expect(result.config?.protection?.[0].pattern).toBe("package.json");
			expect(result.config?.protection?.[0].level).toBe("Protected");
		});

		it("should parse full configuration with all fields", () => {
			const config: SnapBackRC = {
				protection: [
					{
						pattern: "**/*.ts",
						level: "Watched",
						reason: "TypeScript files",
						autoSnapshot: true,
						debounce: 1000,
					},
				],
				ignore: ["node_modules/**", "dist/**"],
				settings: {
					maxSnapshots: 100,
					compressionEnabled: true,
					defaultProtectionLevel: "Watched",
				},
				policies: {
					requireSnapshotMessage: true,
					enforceProtectionLevels: true,
					allowOverrides: false,
				},
			};

			const parser = new SnapBackRCParser();
			const result = parser.parse(JSON.stringify(config, null, 2));

			expect(result.isValid).toBe(true);
			expect(result.config).toBeDefined();
			expect(result.config?.protection).toHaveLength(1);
			expect(result.config?.ignore).toHaveLength(2);
			expect(result.config?.settings?.maxSnapshots).toBe(100);
			expect(result.config?.policies?.requireSnapshotMessage).toBe(true);
		});

		it("should parse configuration with multiple protection rules", () => {
			const config = `{
				"protection": [
					{"pattern": "package.json", "level": "Protected"},
					{"pattern": "**/*.env", "level": "Protected"},
					{"pattern": "src/**/*.ts", "level": "Watched"}
				]
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(true);
			expect(result.config?.protection).toHaveLength(3);
		});

		it("should handle empty configuration", () => {
			const config = "{}";

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(true);
			expect(result.config).toBeDefined();
		});
	});

	describe("Validation errors", () => {
		it("should reject invalid JSON", () => {
			const config = "{ invalid json }";

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.[0]).toContain("JSON");
		});

		it("should reject protection rule without pattern", () => {
			const config = `{
				"protection": [
					{"level": "Protected"}
				]
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("pattern"))).toBe(true);
		});

		it("should reject protection rule without level", () => {
			const config = `{
				"protection": [
					{"pattern": "package.json"}
				]
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("level"))).toBe(true);
		});

		it("should reject invalid protection level", () => {
			const config = `{
				"protection": [
					{"pattern": "package.json", "level": "Invalid"}
				]
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("level"))).toBe(true);
		});

		it("should reject negative maxSnapshots", () => {
			const config = `{
				"settings": {
					"maxSnapshots": -1
				}
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("maxSnapshots"))).toBe(true);
		});

		it("should reject non-array protection rules", () => {
			const config = `{
				"protection": "not an array"
			}`;

			const parser = new SnapBackRCParser();
			const result = parser.parse(config);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
		});
	});

	describe("Merging configurations", () => {
		it("should merge two configurations with disjoint rules", () => {
			const base: SnapBackRC = {
				protection: [{ pattern: "package.json", level: "Protected" }],
			};

			const override: SnapBackRC = {
				protection: [{ pattern: "**/*.env", level: "Protected" }],
			};

			const parser = new SnapBackRCParser();
			const merged = parser.merge(base, override);

			expect(merged.protection).toHaveLength(2);
			expect(merged.protection?.some((r) => r.pattern === "package.json")).toBe(true);
			expect(merged.protection?.some((r) => r.pattern === "**/*.env")).toBe(true);
		});

		it("should override settings from base with override", () => {
			const base: SnapBackRC = {
				settings: {
					maxSnapshots: 50,
					compressionEnabled: false,
				},
			};

			const override: SnapBackRC = {
				settings: {
					maxSnapshots: 100,
				},
			};

			const parser = new SnapBackRCParser();
			const merged = parser.merge(base, override);

			expect(merged.settings?.maxSnapshots).toBe(100);
			expect(merged.settings?.compressionEnabled).toBe(false); // Should keep from base
		});

		it("should concatenate ignore patterns", () => {
			const base: SnapBackRC = {
				ignore: ["node_modules/**"],
			};

			const override: SnapBackRC = {
				ignore: ["dist/**", "build/**"],
			};

			const parser = new SnapBackRCParser();
			const merged = parser.merge(base, override);

			expect(merged.ignore).toHaveLength(3);
			expect(merged.ignore).toContain("node_modules/**");
			expect(merged.ignore).toContain("dist/**");
			expect(merged.ignore).toContain("build/**");
		});

		it("should track provenance when merging", () => {
			const base: SnapBackRC = {
				protection: [{ pattern: "package.json", level: "Protected" }],
			};

			const override: SnapBackRC = {
				protection: [{ pattern: "**/*.env", level: "Protected" }],
			};

			const parser = new SnapBackRCParser();
			const merged = parser.merge(base, override, {
				baseProvenance: "/workspace/.snapbackrc",
				overrideProvenance: "/home/.snapbackrc",
			});

			expect(merged.protection?.[0]._provenance).toBeDefined();
		});
	});

	describe("Filtering by pattern", () => {
		it("should filter protection rules by file pattern", () => {
			const config: SnapBackRC = {
				protection: [
					{ pattern: "package.json", level: "Protected" },
					{ pattern: "**/*.ts", level: "Watched" },
					{ pattern: "**/*.js", level: "Watched" },
				],
			};

			const parser = new SnapBackRCParser();
			const filtered = parser.filterByPattern(config, "**/*.ts");

			expect(filtered.protection).toHaveLength(1);
			expect(filtered.protection?.[0].pattern).toBe("**/*.ts");
		});
	});
});
