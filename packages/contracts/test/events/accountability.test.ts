/**
 * AccountabilityEffectSchema Tests
 *
 * TDD RED Phase: Tests for accountability tracking events
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Valid accountability events validate correctly
 * - Sad: Invalid perceived_help values rejected
 * - Edge: Boundary values for counts and durations
 * - Error: Missing required fields rejected
 */

import { describe, expect, it } from "vitest";
import {
	ACCOUNTABILITY_EVENTS,
	type AccountabilityEffectEvent,
	AccountabilityEffectSchema,
	getAccountabilityEventValidationError,
	validateAccountabilityEvent,
} from "../../src/events/accountability";

describe("AccountabilityEffectSchema", () => {
	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should validate a complete accountability effect event", () => {
			const event: AccountabilityEffectEvent = {
				event: "accountability_effect",
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_12345",
					session_duration_ms: 3600000, // 1 hour
					perceived_help: "significantly",
					actual_changes: {
						files_modified: 5,
						lines_added: 150,
						lines_removed: 30,
						snapshots_used: 2,
					},
					prevented_issues: {
						rollbacks_avoided: 1,
						pattern_violations_caught: 3,
						skipped_tests_flagged: 2,
					},
					tier: "solo",
				},
			};

			expect(validateAccountabilityEvent(event)).toBe(true);
			expect(AccountabilityEffectSchema.parse(event)).toEqual(event);
		});

		it("should validate all perceived_help values", () => {
			const helpValues = ["significantly", "somewhat", "not_really", "blocked"] as const;

			for (const perceived_help of helpValues) {
				const event = {
					event: "accountability_effect" as const,
					event_version: "1.0.0",
					timestamp: Date.now(),
					properties: {
						session_id: "sess_test",
						session_duration_ms: 1000,
						perceived_help,
						actual_changes: {
							files_modified: 1,
							lines_added: 10,
							lines_removed: 5,
							snapshots_used: 0,
						},
						prevented_issues: {
							rollbacks_avoided: 0,
							pattern_violations_caught: 0,
							skipped_tests_flagged: 0,
						},
						tier: "free" as const,
					},
				};

				expect(validateAccountabilityEvent(event)).toBe(true);
			}
		});

		it("should validate all tier values", () => {
			const tiers = ["free", "solo", "team", "enterprise"] as const;

			for (const tier of tiers) {
				const event = {
					event: "accountability_effect" as const,
					event_version: "1.0.0",
					timestamp: Date.now(),
					properties: {
						session_id: "sess_test",
						session_duration_ms: 1000,
						perceived_help: "somewhat" as const,
						actual_changes: {
							files_modified: 1,
							lines_added: 10,
							lines_removed: 5,
							snapshots_used: 0,
						},
						prevented_issues: {
							rollbacks_avoided: 0,
							pattern_violations_caught: 0,
							skipped_tests_flagged: 0,
						},
						tier,
					},
				};

				expect(validateAccountabilityEvent(event)).toBe(true);
			}
		});

		it("should auto-apply defaults for event_version and timestamp", () => {
			const event = {
				event: "accountability_effect" as const,
				properties: {
					session_id: "sess_test",
					session_duration_ms: 1000,
					perceived_help: "somewhat" as const,
					actual_changes: {
						files_modified: 1,
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			const parsed = AccountabilityEffectSchema.parse(event);
			expect(parsed.event_version).toBe("1.0.0");
			expect(parsed.timestamp).toBeDefined();
			expect(typeof parsed.timestamp).toBe("number");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should reject invalid perceived_help values", () => {
			const invalidEvent = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 1000,
					perceived_help: "amazing" as any, // Invalid value
					actual_changes: {
						files_modified: 1,
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
			expect(getAccountabilityEventValidationError(invalidEvent)).not.toBeNull();
		});

		it("should reject invalid tier values", () => {
			const invalidEvent = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 1000,
					perceived_help: "somewhat" as const,
					actual_changes: {
						files_modified: 1,
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "premium" as any, // Invalid value
				},
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
			expect(getAccountabilityEventValidationError(invalidEvent)).not.toBeNull();
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should accept zero values for all counts", () => {
			const event = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 0,
					perceived_help: "not_really" as const,
					actual_changes: {
						files_modified: 0,
						lines_added: 0,
						lines_removed: 0,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			expect(validateAccountabilityEvent(event)).toBe(true);
		});

		it("should accept large values for counts", () => {
			const event = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 86400000, // 24 hours
					perceived_help: "significantly" as const,
					actual_changes: {
						files_modified: 100,
						lines_added: 10000,
						lines_removed: 5000,
						snapshots_used: 50,
					},
					prevented_issues: {
						rollbacks_avoided: 10,
						pattern_violations_caught: 100,
						skipped_tests_flagged: 50,
					},
					tier: "enterprise" as const,
				},
			};

			expect(validateAccountabilityEvent(event)).toBe(true);
		});

		it("should reject negative values for counts", () => {
			const invalidEvent = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 1000,
					perceived_help: "somewhat" as const,
					actual_changes: {
						files_modified: -1, // Invalid
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should reject events with missing properties", () => {
			const invalidEvent = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				// Missing properties
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
		});

		it("should reject events with missing session_id", () => {
			const invalidEvent = {
				event: "accountability_effect" as const,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					// Missing session_id
					session_duration_ms: 1000,
					perceived_help: "somewhat" as const,
					actual_changes: {
						files_modified: 1,
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
		});

		it("should reject events with wrong event type", () => {
			const invalidEvent = {
				event: "wrong_event_type" as any,
				event_version: "1.0.0",
				timestamp: Date.now(),
				properties: {
					session_id: "sess_test",
					session_duration_ms: 1000,
					perceived_help: "somewhat" as const,
					actual_changes: {
						files_modified: 1,
						lines_added: 10,
						lines_removed: 5,
						snapshots_used: 0,
					},
					prevented_issues: {
						rollbacks_avoided: 0,
						pattern_violations_caught: 0,
						skipped_tests_flagged: 0,
					},
					tier: "free" as const,
				},
			};

			expect(validateAccountabilityEvent(invalidEvent)).toBe(false);
		});
	});

	// ============================================================================
	// EVENT CONSTANTS
	// ============================================================================

	describe("Event Constants", () => {
		it("should export correct event name constant", () => {
			expect(ACCOUNTABILITY_EVENTS.ACCOUNTABILITY_EFFECT).toBe("accountability_effect");
		});
	});
});
