import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AiEnvDetection, AiSessionTracker } from "../AiSessionTracker";
import { SimpleChangeTracker } from "../SimpleChangeTracker";

// Helper: mock env detection
const makeEnvDetection = (overrides: Partial<AiEnvDetection> = {}): AiEnvDetection => ({
	provider: "none",
	hasAI: false,
	confidence: 8.5,
	...overrides,
});

describe("[LOCKED] AiSessionTracker v1 Semantics", () => {
	let changeTracker: SimpleChangeTracker;
	let detectEnvMock: () => AiEnvDetection;

	const largeInsert = (chars: number, lines: number) => ({
		chars,
		lines,
		isInsert: true,
		isMultiLine: true,
	});

	beforeEach(() => {
		changeTracker = new SimpleChangeTracker();
		detectEnvMock = vi.fn(() => makeEnvDetection());
	});

	const makeTracker = (enabled = true) => {
		const tracker = new AiSessionTracker(detectEnvMock, changeTracker);
		if (!enabled) {
			// @ts-expect-error – testing private field to mock disabled state
			tracker.isEnabled = false;
		}
		return tracker;
	};

	it("classifies 1 large insert as light", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");

		tracker.recordChange(largeInsert(120, 6)); // >=100 chars, >=5 lines

		const result = tracker.finalizeSession();

		expect(result.level).toBe("light");
		expect(result.reasoning.toLowerCase()).toContain("inferred from change patterns");
		expect(result.reasoning.toLowerCase()).not.toContain("ai wrote");
	});

	it("classifies 5 large inserts as medium", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");

		for (let i = 0; i < 5; i++) {
			tracker.recordChange(largeInsert(150, 8));
		}

		const result = tracker.finalizeSession();

		expect(result.level).toBe("medium");
		expect(result.metrics.largeInsertCount).toBeGreaterThanOrEqual(3);
	});

	it("classifies 10 large inserts / ~2000 chars as heavy", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");

		for (let i = 0; i < 10; i++) {
			tracker.recordChange(largeInsert(200, 10));
		}

		const result = tracker.finalizeSession();

		expect(result.level).toBe("heavy");
		expect(result.metrics.totalChars).toBeGreaterThanOrEqual(1500);
	});

	it("never classifies single mega-paste as heavy (anti-paste guard)", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");

		tracker.recordChange(largeInsert(5000, 250)); // single huge insert

		const result = tracker.finalizeSession();

		expect(result.metrics.largeInsertCount).toBe(1);
		expect(result.level).not.toBe("heavy");
		expect(["light", "medium"]).toContain(result.level);
	});

	it("caps confidence at 7.5 for inferred usage, even with high env confidence", () => {
		detectEnvMock = vi.fn(() => makeEnvDetection({ provider: "cursor", hasAI: true, confidence: 9.5 }));
		const tracker = new AiSessionTracker(detectEnvMock, changeTracker);

		tracker.startSession("s1");
		tracker.recordChange(largeInsert(2000, 100));

		const result = tracker.finalizeSession();

		expect(result.level).not.toBe("none");
		expect(result.confidence).toBeLessThanOrEqual(7.5);
	});

	it("returns provider from env detection and still caps confidence for usage", () => {
		detectEnvMock = vi.fn(() => makeEnvDetection({ provider: "claude", hasAI: true, confidence: 7.0 }));
		const tracker = new AiSessionTracker(detectEnvMock, changeTracker);

		tracker.startSession("s1");
		tracker.recordChange(largeInsert(1000, 50));

		const result = tracker.finalizeSession();

		expect(result.provider).toBe("claude");
		expect(result.confidence).toBeLessThanOrEqual(7.0);
		expect(result.confidence).toBeLessThanOrEqual(7.5);
	});

	it("recordChange is a no-op and finalize returns unknown when disabled", () => {
		const tracker = makeTracker(false);
		tracker.startSession("s1");

		tracker.recordChange(largeInsert(500, 20)); // should be ignored

		const result = tracker.finalizeSession();

		expect(result.level).toBe("unknown");
		expect(result.confidence).toBe(0);
		expect(result.metrics.totalChars).toBe(0);
		expect(result.reasoning.toLowerCase()).toContain("disabled");
	});

	it("ignores changes after being disabled mid-session (if you support runtime toggle)", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");

		tracker.recordChange(largeInsert(100, 5)); // counted

		// emulate runtime disable: inject via method or direct prop depending on your impl
		// @ts-expect-error – test reaching into private for now
		tracker.isEnabled = false;

		tracker.recordChange(largeInsert(1000, 50)); // should be ignored

		const result = tracker.finalizeSession();

		expect(result.metrics.totalChars).toBeGreaterThanOrEqual(100);
		expect(result.metrics.totalChars).toBeLessThan(1100);
	});

	it("never uses over-claiming language in reasoning", () => {
		const tracker = makeTracker(true);
		tracker.startSession("s1");
		tracker.recordChange(largeInsert(1000, 50));

		const { reasoning } = tracker.finalizeSession();
		const lower = reasoning.toLowerCase();

		expect(lower).not.toContain("ai wrote");
		expect(lower).not.toContain("ai generated this code");
		expect(lower).toContain("inferred from change patterns");
	});
});
