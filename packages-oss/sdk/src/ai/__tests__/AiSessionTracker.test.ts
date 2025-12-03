import { beforeEach, describe, expect, it, vi } from "vitest";
import { type AiEnvDetection, AiSessionTracker, type ChangeEvent, SimpleChangeTracker } from "../AiSessionTracker";

const makeEnv = (overrides: Partial<AiEnvDetection> = {}): AiEnvDetection => ({
	provider: "none",
	hasAI: false,
	confidence: 9,
	...overrides,
});

const change = (partial: Partial<ChangeEvent>): ChangeEvent => ({
	chars: 0,
	lines: 0,
	isInsert: true,
	isMultiLine: false,
	...partial,
});

describe("AiSessionTracker", () => {
	let tracker: AiSessionTracker;
	let detectEnvMock: ReturnType<typeof vi.fn>;
	let changeTracker: SimpleChangeTracker;

	beforeEach(() => {
		detectEnvMock = vi.fn(() => makeEnv());
		changeTracker = new SimpleChangeTracker();
		tracker = new AiSessionTracker(detectEnvMock, changeTracker);
	});

	it("returns unknown when finalized without a session", () => {
		const result = tracker.finalizeSession();
		expect(result.level).toBe("unknown");
		expect(result.confidence).toBe(0);
		expect(result.reasoning.toLowerCase()).toContain("no session");
	});

	it("classifies as none when no provider and no large edits", () => {
		tracker.startSession("s1");
		tracker.recordChange(change({ chars: 5, lines: 1 })); // tiny

		const result = tracker.finalizeSession();
		expect(result.level).toBe("none");
		expect(result.confidence).toBeGreaterThanOrEqual(8);
		expect(result.provider).toBe("none");
		expect(result.reasoning.toLowerCase()).toContain("no ai provider");
	});

	it("classifies as none when provider present but no large edits", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));

		tracker.startSession("s1");
		tracker.recordChange(change({ chars: 10, lines: 1 }));
		tracker.recordChange(change({ chars: 12, lines: 1 }));

		const result = tracker.finalizeSession();
		expect(result.level).toBe("none");
		expect(result.provider).toBe("cursor");
		expect(result.confidence).toBeGreaterThanOrEqual(7);
		expect(result.reasoning.toLowerCase()).toContain("cursor detected");
		expect(result.reasoning.toLowerCase()).toContain("no large inserts");
	});

	it("classifies as light when provider present with small amount of large edits", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));
		tracker.startSession("s1");

		tracker.recordChange(
			change({ chars: 120, lines: 8, isMultiLine: true }), // just over light threshold
		);

		const result = tracker.finalizeSession();
		expect(result.level).toBe("light");
		expect(result.provider).toBe("cursor");
		expect(result.confidence).toBeLessThanOrEqual(7.5); // usage inference cap
		expect(result.reasoning.toLowerCase()).toContain("inferred from change patterns");
	});

	it("classifies as medium with multiple large inserts", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));
		tracker.startSession("s1");

		tracker.recordChange(change({ chars: 250, lines: 12, isMultiLine: true }));
		tracker.recordChange(change({ chars: 300, lines: 15, isMultiLine: true }));

		const result = tracker.finalizeSession();
		expect(["medium", "heavy"]).toContain(result.level);
		expect(result.metrics.largeInsertCount).toBeGreaterThanOrEqual(2);
		expect(result.confidence).toBeGreaterThanOrEqual(7);
		expect(result.reasoning.toLowerCase()).toContain("multiple large inserts");
	});

	it("does not classify single mega paste as heavy", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));
		tracker.startSession("s1");

		tracker.recordChange(
			change({
				chars: 4000,
				lines: 200,
				isMultiLine: true,
			}),
		);

		const result = tracker.finalizeSession();
		// Guard: anti "StackOverflow paste becomes heavy AI"
		expect(result.level).not.toBe("heavy");
		expect(["light", "medium"]).toContain(result.level);
		expect(result.reasoning.toLowerCase()).toContain("single large insert");
	});

	it("classifies as heavy only with multiple large inserts and high total chars", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));
		tracker.startSession("s1");

		// Three chunky inserts
		tracker.recordChange(change({ chars: 600, lines: 30, isMultiLine: true }));
		tracker.recordChange(change({ chars: 800, lines: 45, isMultiLine: true }));
		tracker.recordChange(change({ chars: 900, lines: 50, isMultiLine: true }));

		const result = tracker.finalizeSession();
		expect(result.level).toBe("heavy");
		expect(result.metrics.totalChars).toBeGreaterThanOrEqual(2000);
		expect(result.metrics.largeInsertCount).toBeGreaterThanOrEqual(3);
		expect(result.reasoning.toLowerCase()).toContain("heavy ai-like usage");
	});

	it("uses the detected provider at finalization time", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "claude", hasAI: true, confidence: 9 }));

		tracker.startSession("s1");
		tracker.recordChange(change({ chars: 500, lines: 20, isMultiLine: true }));

		const result = tracker.finalizeSession();
		expect(result.provider).toBe("claude");
		expect(result.reasoning.toLowerCase()).toContain("claude");
	});

	it("caps confidence when only change patterns imply AI (no provider)", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "unknown", hasAI: false, confidence: 5 }));
		tracker.startSession("s1");

		tracker.recordChange(change({ chars: 1000, lines: 50, isMultiLine: true }));
		tracker.recordChange(change({ chars: 900, lines: 40, isMultiLine: true }));

		const result = tracker.finalizeSession();
		expect(["light", "medium", "heavy"]).toContain(result.level);
		expect(result.provider).toBe("unknown");
		expect(result.confidence).toBeLessThanOrEqual(7.5);
		expect(result.reasoning.toLowerCase()).toContain("inferred from change patterns");
	});

	it("reset clears session state for next session", () => {
		detectEnvMock.mockReturnValue(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));

		tracker.startSession("s1");
		tracker.recordChange(change({ chars: 500, lines: 20, isMultiLine: true }));
		const first = tracker.finalizeSession();
		expect(first.level).not.toBe("none");

		tracker.reset();
		tracker.startSession("s2");
		const second = tracker.finalizeSession();
		expect(second.level).toBe("none"); // no edits this time
	});

	it("never uses over-claiming language in reasoning", () => {
		detectEnvMock.mockReturnValueOnce(makeEnv({ provider: "cursor", hasAI: true, confidence: 9 }));
		tracker.startSession("s1");
		tracker.recordChange(change({ chars: 800, lines: 40, isMultiLine: true }));

		const result = tracker.finalizeSession();
		const lower = result.reasoning.toLowerCase();
		expect(lower).not.toContain("ai wrote");
		expect(lower).not.toContain("ai generated this code");
	});
});
