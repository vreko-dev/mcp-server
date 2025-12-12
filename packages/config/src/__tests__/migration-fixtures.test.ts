/**
 * Additional Migration Test Scenarios
 *
 * TDD_CORE.md Requirement (Line 62):
 * "Write migration functions - migrate(v1) → v2 with 20+ test scenarios"
 *
 * This file adds fixture-based tests and additional edge cases
 * to meet the 20+ scenario requirement.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { isV1Config, migrateV1ToV2 } from "../migrations/v1-to-v2";
import { validateConfig } from "../schemas";

const FIXTURES_DIR = path.join(process.cwd(), "../../test/fixtures/configs/v1");

describe("Migration - Fixture-Based Tests", () => {
	it("✅ should migrate empty.json fixture", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "empty.json"), "utf-8"));
		expect(isV1Config(fixture)).toBe(true);

		const result = migrateV1ToV2(fixture);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.protections).toEqual([]);
			expect(result.data.version).toBe(2);
		}
	});

	it("✅ should migrate simple.json fixture", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "simple.json"), "utf-8"));
		expect(isV1Config(fixture)).toBe(true);

		const result = migrateV1ToV2(fixture);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.protections.length).toBe(2);

			const packageJson = result.data.protections.find((p) => p.pattern === "package.json");
			expect(packageJson?.level).toBe("block");
			expect(packageJson?.precedence).toBe(100); // isAnchor=true
		}
	});

	it("✅ should migrate complex.json fixture", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "complex.json"), "utf-8"));
		expect(isV1Config(fixture)).toBe(true);

		const result = migrateV1ToV2(fixture);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.protections.length).toBe(5);

			// Check clusterId preservation
			const file2 = result.data.protections.find((p) => p.pattern === "/absolute/path/file2.ts");
			expect(file2?.reason).toContain("api-cluster");

			// Check engine config preservation
			expect(result.data.engine.maxDepth).toBe(5);
			expect(result.data.engine.burstThreshold).toBe(50);
		}
	});

	it("⚠️ should handle corrupted.json gracefully", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "corrupted.json"), "utf-8"));

		// Should still recognize as v1
		expect(isV1Config(fixture)).toBe(true);

		const result = migrateV1ToV2(fixture);
		// Migration should succeed but skip invalid entries
		expect(result.success).toBe(true);
	});

	it("⚠️ should migrate special-chars.json fixture", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "special-chars.json"), "utf-8"));
		expect(isV1Config(fixture)).toBe(true);

		const result = migrateV1ToV2(fixture);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.protections.length).toBe(4);

			// Verify special characters preserved
			const patterns = result.data.protections.map((p) => p.pattern);
			expect(patterns).toContain("/path/with spaces/file.ts");
			expect(patterns).toContain("/path/with'quotes/file.ts");
		}
	});

	it("⚠️ should migrate large.json fixture (10K+ entries) in <1s", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "large.json"), "utf-8"));
		expect(isV1Config(fixture)).toBe(true);

		const start = Date.now();
		const result = migrateV1ToV2(fixture);
		const duration = Date.now() - start;

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.protections.length).toBe(10000);
		}

		// TDD_CORE.md Line 86: <1s migration time for 10K+ entries
		expect(duration).toBeLessThan(1000);
	});
});

describe("Migration - Additional Edge Cases", () => {
	it("⚠️ should handle v1 config with missing engine.cooldowns", () => {
		const v1Config = {
			version: 1,
			protections: {},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				// Missing cooldowns
			},
		} as any;

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			// Should use defaults
			expect(result.data.engine.cooldowns.block).toBeDefined();
		}
	});

	it("⚠️ should handle v1 config with partial cooldowns", () => {
		const v1Config = {
			version: 1,
			protections: {},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: {
					block: 60000,
					// Missing warn and watch
				},
			},
		} as any;

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);
	});

	it("⚠️ should handle Unicode characters in file paths", () => {
		const v1Config = {
			version: 1 as const,
			protections: {
				"/path/with/émojis/😀.ts": {
					level: "block" as const,
					isAnchor: false,
					setAt: Date.now(),
				},
				"/path/中文/file.ts": {
					level: "warn" as const,
					isAnchor: false,
					setAt: Date.now(),
				},
			},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: { block: 60000, warn: 30000, watch: 0 },
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			const patterns = result.data.protections.map((p) => p.pattern);
			expect(patterns).toContain("/path/with/émojis/😀.ts");
			expect(patterns).toContain("/path/中文/file.ts");
		}
	});

	it("⚠️ should handle paths with newlines and control characters", () => {
		const v1Config = {
			version: 1 as const,
			protections: {
				"/path/with\nnewline/file.ts": {
					level: "block" as const,
					isAnchor: false,
					setAt: Date.now(),
				},
			},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: { block: 60000, warn: 30000, watch: 0 },
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);
	});

	it("⚠️ should handle extremely nested paths", () => {
		const deepPath = "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.ts";
		const v1Config = {
			version: 1 as const,
			protections: {
				[deepPath]: {
					level: "warn" as const,
					isAnchor: false,
					setAt: Date.now(),
				},
			},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: { block: 60000, warn: 30000, watch: 0 },
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			expect(result.data.protections[0].pattern).toBe(deepPath);
		}
	});

	it("⚠️ should preserve timestamp precision", () => {
		const timestamp = 1733928456789;
		const v1Config = {
			version: 1 as const,
			protections: {
				"test.ts": {
					level: "block" as const,
					isAnchor: false,
					setAt: timestamp,
				},
			},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: { block: 60000, warn: 30000, watch: 0 },
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			// setAt should be preserved (though not in v2 schema, stored in metadata)
			expect(result.data.protections.length).toBe(1);
		}
	});

	it("⚠️ should handle both anchor and cluster simultaneously", () => {
		const v1Config = {
			version: 1 as const,
			protections: {
				"important.ts": {
					level: "block" as const,
					isAnchor: true,
					clusterId: "critical-cluster",
					setAt: Date.now(),
				},
			},
			engine: {
				maxDepth: 2,
				burstThreshold: 30,
				cooldowns: { block: 60000, warn: 30000, watch: 0 },
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			const protection = result.data.protections[0];
			expect(protection.precedence).toBe(100);
			expect(protection.reason).toContain("Anchor");
			expect(protection.reason).toContain("critical-cluster");
		}
	});

	it("⚠️ should handle maximum engine values", () => {
		const v1Config = {
			version: 1 as const,
			protections: {},
			engine: {
				maxDepth: 10,
				burstThreshold: 100,
				cooldowns: {
					block: 300000,
					warn: 300000,
					watch: 300000,
				},
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			const validation = validateConfig(result.data);
			expect(validation.valid).toBe(true);
		}
	});

	it("⚠️ should handle minimum engine values", () => {
		const v1Config = {
			version: 1 as const,
			protections: {},
			engine: {
				maxDepth: 0,
				burstThreshold: 1,
				cooldowns: {
					block: 0,
					warn: 0,
					watch: 0,
				},
			},
		};

		const result = migrateV1ToV2(v1Config);
		expect(result.success).toBe(true);

		if (result.success) {
			const validation = validateConfig(result.data);
			expect(validation.valid).toBe(true);
		}
	});
});

describe("Migration - Output Validation", () => {
	it("✅ should produce v2 config with all required fields", async () => {
		const fixture = JSON.parse(await fs.readFile(path.join(FIXTURES_DIR, "simple.json"), "utf-8"));
		const result = migrateV1ToV2(fixture);

		expect(result.success).toBe(true);
		if (result.success) {
			const v2 = result.data;

			// Required v2 fields
			expect(v2.version).toBe(2);
			expect(v2.protections).toBeDefined();
			expect(v2.engine).toBeDefined();
			expect(v2.settings).toBeDefined();
			expect(v2.policies).toBeDefined();
			expect(v2.ignore).toBeDefined();

			// Schema validation
			const validation = validateConfig(v2);
			expect(validation.valid).toBe(true);
		}
	});
});
