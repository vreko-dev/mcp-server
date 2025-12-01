import { beforeEach, describe, expect, it } from "vitest";
import { type ChangeEvent, SimpleChangeTracker } from "../SimpleChangeTracker";

const change = (partial: Partial<ChangeEvent>): ChangeEvent => ({
	chars: 0,
	lines: 0,
	isInsert: true,
	isMultiLine: false,
	...partial,
});

describe("SimpleChangeTracker", () => {
	let tracker: SimpleChangeTracker;

	beforeEach(() => {
		tracker = new SimpleChangeTracker();
	});

	it("starts with zeroed metrics", () => {
		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(0);
		expect(snapshot.totalLines).toBe(0);
		expect(snapshot.largeInsertCount).toBe(0);
		expect(snapshot.multiLineInsertCount).toBe(0);
	});

	it("tracks small single-line edits without counting them as large inserts", () => {
		tracker.recordChange(change({ chars: 5, lines: 1 }));
		tracker.recordChange(change({ chars: 10, lines: 1 }));

		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(15);
		expect(snapshot.totalLines).toBe(2);
		expect(snapshot.largeInsertCount).toBe(0);
		expect(snapshot.multiLineInsertCount).toBe(0);
	});

	it("counts multi-line large inserts correctly", () => {
		tracker.recordChange(
			change({ chars: 300, lines: 15, isMultiLine: true }), // assumed "large"
		);

		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(300);
		expect(snapshot.totalLines).toBe(15);
		expect(snapshot.largeInsertCount).toBe(1);
		expect(snapshot.multiLineInsertCount).toBe(1);
	});

	it("supports mixed edits and aggregates metrics", () => {
		tracker.recordChange(change({ chars: 5, lines: 1 }));
		tracker.recordChange(change({ chars: 250, lines: 10, isMultiLine: true }));
		tracker.recordChange(change({ chars: 300, lines: 20, isMultiLine: true }));

		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(5 + 250 + 300);
		expect(snapshot.totalLines).toBe(1 + 10 + 20);
		expect(snapshot.largeInsertCount).toBeGreaterThanOrEqual(1);
		expect(snapshot.multiLineInsertCount).toBeGreaterThanOrEqual(1);
	});

	it("does not treat non-insert changes as large inserts", () => {
		tracker.recordChange(change({ chars: 500, lines: 30, isInsert: false, isMultiLine: true }));

		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(500);
		expect(snapshot.largeInsertCount).toBe(0);
	});

	it("reset clears all accumulated metrics", () => {
		tracker.recordChange(change({ chars: 123, lines: 7, isMultiLine: true }));
		expect(tracker.snapshot().totalChars).toBe(123);

		tracker.reset();
		const snapshot = tracker.snapshot();
		expect(snapshot.totalChars).toBe(0);
		expect(snapshot.totalLines).toBe(0);
		expect(snapshot.largeInsertCount).toBe(0);
		expect(snapshot.multiLineInsertCount).toBe(0);
	});

	it("snapshot is idempotent when no new changes arrive", () => {
		tracker.recordChange(change({ chars: 42, lines: 3 }));
		const snapshot1 = tracker.snapshot();
		const snapshot2 = tracker.snapshot();
		expect(snapshot2).toEqual(snapshot1);
	});
});
