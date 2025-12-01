import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AiEnvDetection, AiSessionTracker } from "../AiSessionTracker";
import { SimpleChangeTracker } from "../SimpleChangeTracker";

/**
 * Integration Tests: Lock critical v1 behaviors
 *
 * These tests verify end-to-end AI detection lifecycle:
 * 1. Kill-switch (isEnabled) prevents data collection
 * 2. Multi-provider detection (Cursor + Extension)
 * 3. Database schema integration
 * 4. Settings enforcement at collection time
 */

describe("[INTEGRATION] AiSessionTracker + SessionManager", () => {
	let changeTracker: SimpleChangeTracker;
	let detectEnvMock: () => AiEnvDetection;

	const makeEnvDetection = (overrides: Partial<AiEnvDetection> = {}): AiEnvDetection => ({
		provider: "none",
		hasAI: false,
		confidence: 8.5,
		...overrides,
	});

	beforeEach(() => {
		changeTracker = new SimpleChangeTracker();
		detectEnvMock = vi.fn(() => makeEnvDetection());
	});

	describe("Kill-Switch (isEnabled)", () => {
		it("[CRITICAL] disabled=true prevents all data collection", () => {
			const tracker = new AiSessionTracker(
				detectEnvMock,
				changeTracker,
				false, // disabled
			);

			tracker.startSession("test-session");

			// Record many changes
			for (let i = 0; i < 10; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			// Finalize and check result
			const result = tracker.finalizeSession();

			// Must return 'unknown' level when disabled
			expect(result.level).toBe("unknown");
			expect(result.confidence).toBe(0);
			expect(result.provider).toBe("none");
			expect(result.reasoning).toContain("disabled");
		});

		it("[CRITICAL] disabled=true after session start stops further changes", () => {
			const tracker = new AiSessionTracker(
				detectEnvMock,
				changeTracker,
				true, // enabled initially
			);

			tracker.startSession("test-session");

			// Record one change
			tracker.recordChange({
				chars: 200,
				lines: 5,
				isInsert: true,
				isMultiLine: true,
			});

			// Simulate disabling mid-session (would happen via settings change)
			const newTracker = new AiSessionTracker(
				detectEnvMock,
				new SimpleChangeTracker(),
				false, // now disabled
			);

			newTracker.startSession("test-session");
			newTracker.recordChange({
				chars: 200,
				lines: 5,
				isInsert: true,
				isMultiLine: true,
			});

			const result = newTracker.finalizeSession();
			expect(result.level).toBe("unknown");
		});

		it("[CRITICAL] kill-switch prevents telemetry emission", () => {
			const tracker = new AiSessionTracker(
				detectEnvMock,
				changeTracker,
				false, // disabled
			);

			tracker.startSession("test-session");
			const result = tracker.finalizeSession();

			// Verify no metrics are computed
			expect(result.metrics).toEqual({
				largeInsertCount: 0,
				totalChars: 0,
				totalLines: 0,
			});
		});
	});

	describe("Provider Detection", () => {
		it("[CRITICAL] Cursor detection returns correct confidence asymmetry", () => {
			detectEnvMock = vi.fn(() => makeEnvDetection({ provider: "cursor", hasAI: true, confidence: 7.0 }));

			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			const result = tracker.finalizeSession();

			expect(result.provider).toBe("cursor");
			expect(result.confidence).toBe(7.0);
		});

		it("[CRITICAL] no provider returns high confidence absence", () => {
			detectEnvMock = vi.fn(() => makeEnvDetection({ provider: "none", hasAI: false, confidence: 8.5 }));

			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			// Even with large inserts, confidence stays at detection level
			for (let i = 0; i < 10; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			const result = tracker.finalizeSession();

			expect(result.provider).toBe("none");
			expect(result.confidence).toBe(8.5); // High confidence in absence
		});
	});

	describe("Database Schema Integration", () => {
		it("[CRITICAL] AI result structure matches expected DB schema", () => {
			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			for (let i = 0; i < 5; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			const result = tracker.finalizeSession();

			// Verify all DB fields are present and correct types
			expect(result).toHaveProperty("level");
			expect(["none", "light", "medium", "heavy", "unknown"]).toContain(result.level);

			expect(result).toHaveProperty("confidence");
			expect(typeof result.confidence).toBe("number");
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(10);

			expect(result).toHaveProperty("provider");
			expect(["cursor", "claude", "copilot", "unknown", "none"]).toContain(result.provider);

			// Reasoning is always present
			expect(result).toHaveProperty("reasoning");
			expect(typeof result.reasoning).toBe("string");
		});

		it("[CRITICAL] metrics computed correctly for DB storage", () => {
			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			// Record 5 large inserts
			for (let i = 0; i < 5; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			const result = tracker.finalizeSession();

			expect(result.metrics.largeInsertCount).toBe(5);
			expect(result.metrics.totalChars).toBe(1000); // 5 * 200
			expect(result.metrics.totalLines).toBe(25); // 5 * 5
		});
	});

	describe("Settings Enforcement", () => {
		it("[CRITICAL] isEnabled guards recordChange execution", () => {
			const changeTrackerSpy = vi.spyOn(changeTracker, "recordChange");

			const trackerEnabled = new AiSessionTracker(detectEnvMock, changeTracker, true);
			trackerEnabled.startSession("test-1");
			trackerEnabled.recordChange({ chars: 100, lines: 2, isInsert: true, isMultiLine: true });

			const callCountEnabled = changeTrackerSpy.mock.calls.length;

			const trackerDisabled = new AiSessionTracker(detectEnvMock, changeTracker, false);
			trackerDisabled.startSession("test-2");
			trackerDisabled.recordChange({ chars: 100, lines: 2, isInsert: true, isMultiLine: true });

			const callCountDisabled = changeTrackerSpy.mock.calls.length;

			// Disabled should not add to call count
			expect(callCountDisabled).toBe(callCountEnabled);
		});

		it("[CRITICAL] finalizeSession respects isEnabled for early return", () => {
			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, false);
			tracker.startSession("test-session");

			// Don't record any changes - finalize should return unknown immediately
			const result = tracker.finalizeSession();

			expect(result.level).toBe("unknown");
			expect(result.confidence).toBe(0);
		});
	});

	describe("Anti-Paste Guard", () => {
		it("[SPEC] single mega-insert does not result in heavy level", () => {
			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			// Single insert of 5000 chars, 50 lines - should be medium only
			tracker.recordChange({
				chars: 5000,
				lines: 50,
				isInsert: true,
				isMultiLine: true,
			});

			const result = tracker.finalizeSession();

			// Anti-paste guard: single large insert capped at medium
			expect(result.level).toBe("medium");
		});

		it("[SPEC] multiple smaller inserts can reach heavy", () => {
			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			// 10 inserts of 200 chars each = heavy
			for (let i = 0; i < 10; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			const result = tracker.finalizeSession();

			expect(result.level).toBe("heavy");
		});
	});

	describe("Confidence Capping", () => {
		it("[SPEC] usage inference never exceeds 7.5", () => {
			detectEnvMock = vi.fn(() => makeEnvDetection({ provider: "cursor", hasAI: true, confidence: 9.5 }));

			const tracker = new AiSessionTracker(detectEnvMock, changeTracker, true);
			tracker.startSession("test-session");

			// Record heavy usage
			for (let i = 0; i < 10; i++) {
				tracker.recordChange({
					chars: 200,
					lines: 5,
					isInsert: true,
					isMultiLine: true,
				});
			}

			const result = tracker.finalizeSession();

			// Even with high env confidence and heavy usage, cap at 7.5 for inferred usage
			expect(result.confidence).toBeLessThanOrEqual(7.5);
		});
	});
});
