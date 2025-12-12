/**
 * Migration Tests - TDD RED PHASE
 *
 * Tests for v1 to v2 ConfigStore migration.
 * These tests define the required behavior BEFORE implementation.
 *
 * Coverage:
 * - Happy path: Valid v1 configs migrate correctly
 * - Sad path: Invalid/malformed configs handled gracefully
 * - Edge cases: Empty, large, special characters
 * - Error path: Corrupted data, missing fields
 */

import { describe, expect, it } from "vitest";
import { isV1Config, migrateV1ToV2, type V1ConfigSchema } from "../migrations/v1-to-v2";
import { type ConfigStoreV2, DEFAULT_CONFIG } from "../schemas";

describe("v1-to-v2 Migration - TDD RED PHASE", () => {
	describe("isV1Config - Type Guard", () => {
		it("✅ should return true for valid v1 config", () => {
			const v1Config = {
				version: 1,
				protections: {
					"/path/to/file.ts": {
						level: "block",
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

			expect(isV1Config(v1Config)).toBe(true);
		});

		it("✅ should return false for v2 config", () => {
			expect(isV1Config(DEFAULT_CONFIG)).toBe(false);
		});

		it("✅ should return false for null/undefined", () => {
			expect(isV1Config(null)).toBe(false);
			expect(isV1Config(undefined)).toBe(false);
		});

		it("✅ should return false for non-object values", () => {
			expect(isV1Config("string")).toBe(false);
			expect(isV1Config(123)).toBe(false);
			expect(isV1Config([])).toBe(false);
		});
	});

	describe("migrateV1ToV2 - Happy Path", () => {
		it("✅ should migrate basic v1 config to v2", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/path/to/file.ts": {
						level: "block",
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
				expect(result.data.version).toBe(2);
				expect(Array.isArray(result.data.protections)).toBe(true);
				expect(result.data.protections.length).toBe(1);
				expect(result.data.protections[0].pattern).toBe("/path/to/file.ts");
				expect(result.data.protections[0].level).toBe("block");
			}
		});

		it("✅ should migrate anchor files with precedence=100", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/anchor/file.ts": {
						level: "block",
						isAnchor: true,
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
				const anchorRule = result.data.protections[0];
				expect(anchorRule.precedence).toBe(100);
				expect(anchorRule.reason).toContain("Anchor");
			}
		});

		it("✅ should migrate clusterId to reason field", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/cluster/file.ts": {
						level: "warn",
						isAnchor: false,
						clusterId: "auth-cluster",
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
				const clusterRule = result.data.protections[0];
				expect(clusterRule.reason).toContain("auth-cluster");
			}
		});

		it("✅ should preserve engine configuration", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {},
				engine: {
					maxDepth: 5,
					burstThreshold: 50,
					cooldowns: { block: 120000, warn: 60000, watch: 1000 },
				},
			};

			const result = migrateV1ToV2(v1Config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.engine.maxDepth).toBe(5);
				expect(result.data.engine.burstThreshold).toBe(50);
				expect(result.data.engine.cooldowns.block).toBe(120000);
			}
		});

		it("✅ should add default v2 fields (settings, policies, ignore)", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {},
				engine: {
					maxDepth: 2,
					burstThreshold: 30,
					cooldowns: { block: 60000, warn: 30000, watch: 0 },
				},
			};

			const result = migrateV1ToV2(v1Config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.settings).toBeDefined();
				expect(result.data.policies).toBeDefined();
				expect(result.data.ignore).toBeDefined();
				expect(Array.isArray(result.data.ignore)).toBe(true);
			}
		});

		it("✅ should migrate multiple protections", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/file1.ts": { level: "block", isAnchor: true, setAt: Date.now() },
					"/file2.ts": { level: "warn", isAnchor: false, setAt: Date.now() },
					"/file3.ts": { level: "watch", isAnchor: false, clusterId: "test", setAt: Date.now() },
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
				expect(result.data.protections.length).toBe(3);
				const patterns = result.data.protections.map((p: { pattern: string }) => p.pattern);
				expect(patterns).toContain("/file1.ts");
				expect(patterns).toContain("/file2.ts");
				expect(patterns).toContain("/file3.ts");
			}
		});
	});

	describe("migrateV1ToV2 - Sad Path", () => {
		it("❌ should handle missing protections object", () => {
			const v1Config = {
				version: 1,
				engine: {
					maxDepth: 2,
					burstThreshold: 30,
					cooldowns: { block: 60000, warn: 30000, watch: 0 },
				},
			} as unknown as V1ConfigSchema;

			const result = migrateV1ToV2(v1Config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.protections).toEqual([]);
			}
		});

		it("❌ should handle missing engine object", () => {
			const v1Config = {
				version: 1,
				protections: {},
			} as unknown as V1ConfigSchema;

			const result = migrateV1ToV2(v1Config);

			expect(result.success).toBe(true);
			if (result.success) {
				// Should use default engine config
				expect(result.data.engine.maxDepth).toBe(2);
			}
		});

		it("❌ should handle invalid protection level gracefully", () => {
			const v1Config = {
				version: 1,
				protections: {
					"/file.ts": {
						level: "invalid-level" as any,
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

			const result = migrateV1ToV2(v1Config as V1ConfigSchema);

			// Should either skip invalid entries or default to "watch"
			expect(result.success).toBe(true);
		});
	});

	describe("migrateV1ToV2 - Edge Cases", () => {
		it("⚠️ should handle empty protections object", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {},
				engine: {
					maxDepth: 2,
					burstThreshold: 30,
					cooldowns: { block: 60000, warn: 30000, watch: 0 },
				},
			};

			const result = migrateV1ToV2(v1Config);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.protections).toEqual([]);
			}
		});

		it("⚠️ should handle very long file paths (>255 chars)", () => {
			const longPath = `/${"a".repeat(300)}.ts`;
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					[longPath]: {
						level: "block",
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
				expect(result.data.protections[0].pattern).toBe(longPath);
			}
		});

		it("⚠️ should handle special characters in paths", () => {
			const specialPath = "/path/with spaces/and'quotes/file.ts";
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					[specialPath]: {
						level: "warn",
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
				expect(result.data.protections[0].pattern).toBe(specialPath);
			}
		});

		it("⚠️ should handle large number of protections (1000+)", () => {
			const protections: V1ConfigSchema["protections"] = {};
			for (let i = 0; i < 1000; i++) {
				protections[`/file${i}.ts`] = {
					level: i % 3 === 0 ? "block" : i % 3 === 1 ? "warn" : "watch",
					isAnchor: i % 10 === 0,
					setAt: Date.now(),
				};
			}

			const v1Config: V1ConfigSchema = {
				version: 1,
				protections,
				engine: {
					maxDepth: 2,
					burstThreshold: 30,
					cooldowns: { block: 60000, warn: 30000, watch: 0 },
				},
			};

			const start = Date.now();
			const result = migrateV1ToV2(v1Config);
			const duration = Date.now() - start;

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.protections.length).toBe(1000);
			}
			// Should complete in under 100ms for 1000 entries
			expect(duration).toBeLessThan(100);
		});

		it("⚠️ should handle both isAnchor and clusterId together", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/anchor-cluster.ts": {
						level: "block",
						isAnchor: true,
						clusterId: "auth-cluster",
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
				const rule = result.data.protections[0];
				expect(rule.precedence).toBe(100);
				expect(rule.reason).toContain("Anchor");
				expect(rule.reason).toContain("auth-cluster");
			}
		});
	});

	describe("migrateV1ToV2 - Error Path", () => {
		it("❌ should return error for null input", () => {
			const result = migrateV1ToV2(null as any);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it("❌ should return error for undefined input", () => {
			const result = migrateV1ToV2(undefined as any);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeDefined();
			}
		});

		it("❌ should return error for non-object input", () => {
			const result = migrateV1ToV2("not an object" as any);

			expect(result.success).toBe(false);
		});
	});

	describe("Migration Output Validation", () => {
		it("✅ should produce valid v2 schema output", () => {
			const v1Config: V1ConfigSchema = {
				version: 1,
				protections: {
					"/file.ts": {
						level: "block",
						isAnchor: true,
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
				const v2: ConfigStoreV2 = result.data;
				// Verify required v2 fields exist
				expect(v2.version).toBe(2);
				expect(v2.protections).toBeDefined();
				expect(v2.engine).toBeDefined();
				expect(v2.settings).toBeDefined();
				expect(v2.policies).toBeDefined();
				expect(v2.ignore).toBeDefined();
			}
		});
	});
});
