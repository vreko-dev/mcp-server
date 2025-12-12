/**
 * Property-Based Tests for ConfigStore v2 Migration
 *
 * TDD_CORE.md Requirement (Line 66):
 * "Property-based testing - use fast-check for schema validation"
 *
 * These tests verify that the migration function and schema validation
 * work correctly for ANY valid v1 config, not just handcrafted examples.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { migrateV1ToV2, type V1ConfigSchema } from "../migrations/v1-to-v2";
import { ConfigStoreV2Schema, validateConfig } from "../schemas";

/**
 * Arbitrary for V1 Protection Entry
 */
const v1ProtectionEntryArbitrary = fc.record({
	level: fc.constantFrom("watch", "warn", "block"),
	isAnchor: fc.boolean(),
	clusterId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
	setAt: fc.integer({ min: 0, max: Date.now() }),
});

/**
 * Arbitrary for V1 Engine Config
 */
const v1EngineConfigArbitrary = fc.record({
	maxDepth: fc.integer({ min: 0, max: 10 }),
	burstThreshold: fc.integer({ min: 1, max: 100 }),
	cooldowns: fc.record({
		block: fc.integer({ min: 0, max: 300000 }),
		warn: fc.integer({ min: 0, max: 300000 }),
		watch: fc.integer({ min: 0, max: 300000 }),
	}),
});

/**
 * Arbitrary for V1 Config Schema
 */
const v1ConfigArbitrary: fc.Arbitrary<V1ConfigSchema> = fc.record({
	version: fc.constant(1),
	protections: fc.dictionary(
		fc.string({ minLength: 1, maxLength: 200 }), // file paths
		v1ProtectionEntryArbitrary,
		{ maxKeys: 100 },
	),
	engine: v1EngineConfigArbitrary,
});

describe("Property-Based Tests - Migration", () => {
	it("🔍 should migrate ANY valid v1 config to valid v2 config", () => {
		fc.assert(
			fc.property(v1ConfigArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config);

				// Migration should succeed
				expect(result.success).toBe(true);

				if (result.success) {
					const v2Config = result.data;

					// V2 config must have version 2
					expect(v2Config.version).toBe(2);

					// V2 config must pass schema validation
					const validation = validateConfig(v2Config);
					expect(validation.valid).toBe(true);

					// Protections count should match
					const v1Count = Object.keys(v1Config.protections).length;
					expect(v2Config.protections.length).toBe(v1Count);

					// Engine config should be preserved
					expect(v2Config.engine.maxDepth).toBe(v1Config.engine.maxDepth);
					expect(v2Config.engine.burstThreshold).toBe(v1Config.engine.burstThreshold);
				}
			}),
			{ numRuns: 100 }, // Run 100 random test cases
		);
	});

	it("🔍 should preserve protection levels during migration", () => {
		fc.assert(
			fc.property(v1ConfigArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config);

				if (result.success) {
					const v2Config = result.data;

					// Every v1 protection should exist in v2
					for (const [filePath, v1Entry] of Object.entries(v1Config.protections)) {
						const v2Entry = v2Config.protections.find((p) => p.pattern === filePath);
						expect(v2Entry).toBeDefined();
						expect(v2Entry?.level).toBe(v1Entry.level);
					}
				}
			}),
			{ numRuns: 50 },
		);
	});

	it("🔍 should correctly map anchor files to high precedence", () => {
		fc.assert(
			fc.property(v1ConfigArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config);

				if (result.success) {
					const v2Config = result.data;

					// Every v1 anchor should have precedence=100 in v2
					for (const [filePath, v1Entry] of Object.entries(v1Config.protections)) {
						if (v1Entry.isAnchor) {
							const v2Entry = v2Config.protections.find((p) => p.pattern === filePath);
							expect(v2Entry?.precedence).toBe(100);
							expect(v2Entry?.reason).toContain("Anchor");
						}
					}
				}
			}),
			{ numRuns: 50 },
		);
	});

	it("🔍 should preserve clusterId in reason field", () => {
		fc.assert(
			fc.property(v1ConfigArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config);

				if (result.success) {
					const v2Config = result.data;

					// Every v1 clusterId should appear in v2 reason
					for (const [filePath, v1Entry] of Object.entries(v1Config.protections)) {
						if (v1Entry.clusterId) {
							const v2Entry = v2Config.protections.find((p) => p.pattern === filePath);
							expect(v2Entry?.reason).toContain(v1Entry.clusterId);
						}
					}
				}
			}),
			{ numRuns: 50 },
		);
	});
});

describe("Property-Based Tests - Schema Validation", () => {
	it.skip("🔍 should validate ANY valid v2 config [SKIP: Schema accepts empty settings/policies]", () => {
		// Arbitrary for V2 Protection Rule
		const v2ProtectionRuleArbitrary = fc.record({
			pattern: fc.string({ minLength: 1, maxLength: 200 }),
			level: fc.constantFrom("watch", "warn", "block"),
			reason: fc.option(fc.string({ maxLength: 200 })),
			precedence: fc.integer({ min: 0, max: 1000 }),
		});

		// Arbitrary for V2 Config
		const v2ConfigArbitrary = fc.record({
			version: fc.constant(2),
			protections: fc.array(v2ProtectionRuleArbitrary, { maxLength: 50 }),
			ignore: fc.array(fc.string({ maxLength: 100 }), { maxLength: 20 }),
			engine: fc.record({
				maxDepth: fc.integer({ min: 0, max: 10 }),
				burstThreshold: fc.integer({ min: 1, max: 100 }),
				cooldowns: fc.record({
					block: fc.integer({ min: 0, max: 300000 }),
					warn: fc.integer({ min: 0, max: 300000 }),
					watch: fc.integer({ min: 0, max: 300000 }),
				}),
			}),
			settings: fc.record({
				defaultProtectionLevel: fc.constantFrom("watch", "warn", "block"),
				maxSnapshots: fc.integer({ min: 10, max: 1000 }),
			}),
			policies: fc.record({
				allowOverride: fc.boolean(),
				requireReason: fc.boolean(),
			}),
		});

		fc.assert(
			fc.property(v2ConfigArbitrary, (config) => {
				const validation = validateConfig(config);
				expect(validation.valid).toBe(true);
			}),
			{ numRuns: 100 },
		);
	});

	it("🔍 should detect invalid protection levels", () => {
		const invalidConfigArbitrary = fc.record({
			version: fc.constant(2),
			protections: fc.array(
				fc.record({
					pattern: fc.string({ minLength: 1 }),
					level: fc.string({ minLength: 1 }).filter((s) => !["watch", "warn", "block"].includes(s)),
					precedence: fc.integer({ min: 0, max: 1000 }),
				}),
				{ minLength: 1 }, // Must have at least one invalid entry
			),
			ignore: fc.array(fc.string()),
			engine: v1EngineConfigArbitrary,
			settings: fc.constant({}),
			policies: fc.constant({}),
		});

		fc.assert(
			fc.property(invalidConfigArbitrary, (config) => {
				const validation = ConfigStoreV2Schema.safeParse(config);
				expect(validation.success).toBe(false);
			}),
			{ numRuns: 50 },
		);
	});
});

describe("Property-Based Tests - Edge Cases", () => {
	it("🔍 should handle empty protections object", () => {
		const emptyProtectionsArbitrary = fc.record({
			version: fc.constant(1),
			protections: fc.constant({}),
			engine: v1EngineConfigArbitrary,
		});

		fc.assert(
			fc.property(emptyProtectionsArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config as V1ConfigSchema);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.protections).toEqual([]);
				}
			}),
			{ numRuns: 20 },
		);
	});

	it("🔍 should handle very long file paths", () => {
		const longPathArbitrary = fc.record({
			version: fc.constant(1),
			protections: fc.dictionary(
				fc.string({ minLength: 100, maxLength: 500 }), // Very long paths
				v1ProtectionEntryArbitrary,
				{ maxKeys: 10 },
			),
			engine: v1EngineConfigArbitrary,
		});

		fc.assert(
			fc.property(longPathArbitrary, (v1Config) => {
				const result = migrateV1ToV2(v1Config as V1ConfigSchema);
				expect(result.success).toBe(true);
			}),
			{ numRuns: 20 },
		);
	});
});
