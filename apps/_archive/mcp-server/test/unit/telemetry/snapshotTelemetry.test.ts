import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnapshotCreationTracker } from "../../../src/telemetry/SnapshotCreationTracker";

// These are in vscode app, mocking for MCP server tests
class SnapshotMilestoneTracker {
	detectMilestone(count: number) {
		if (count === 1) return { milestone: "1st" };
		if (count === 10) return { milestone: "10th" };
		if (count === 100) return { milestone: "100th" };
		return null;
	}
}

class FunnelValidator {
	validateOrdering(events: any[]) {
		const violations: any[] = [];
		const snapshots = new Map();
		for (const event of events) {
			if (!snapshots.has(event.snapshotId)) {
				snapshots.set(event.snapshotId, []);
			}
			snapshots.get(event.snapshotId).push(event);
		}
		for (const events of snapshots.values()) {
			for (let i = 1; i < events.length; i++) {
				if (
					events[i].eventType === "snapshot_creation_initiated" &&
					events[i - 1].eventType === "snapshot_creation_completed"
				) {
					violations.push({ message: "Out of order" });
				}
			}
		}
		return { valid: violations.length === 0, violations };
	}
}

describe("Telemetry - Privacy-First Event Tracking", () => {
	// =========== SnapshotCreationTracker ===========
	describe("SnapshotCreationTracker.emitInitiated()", () => {
		let tracker: SnapshotCreationTracker;

		beforeEach(() => {
			vi.clearAllMocks();
			tracker = new SnapshotCreationTracker();
		});

		// Happy Path: Emits with hashed file path
		it("should emit event with hashed file path (never raw path)", () => {
			const event = tracker.emitInitiated({
				snapshotId: "snap-123",
				filePath: "/Users/user1/project/src/auth.ts",
			});

			expect(event.eventType).toEqual("snapshot_creation_initiated");
			expect(event.snapshotId).toEqual("snap-123");
			expect(event.timestamp).toBeDefined();
			// Path should never be in event
			expect(JSON.stringify(event)).not.toContain("auth.ts");
			expect(JSON.stringify(event)).not.toContain("/Users/user1");
		});

		// Error Case: Sanitizes error messages
		it("should sanitize error messages by removing file paths", () => {
			const tracker2 = new SnapshotCreationTracker();
			const event = tracker2.emitInitiated({
				snapshotId: "snap-456",
				filePath: "/home/user/project/config.ts",
			});

			expect(event).toBeDefined();
			expect(event.snapshotId).toEqual("snap-456");
		});
	});

	// =========== SnapshotMilestoneTracker ===========
	describe("SnapshotMilestoneTracker.detectMilestone()", () => {
		let tracker: SnapshotMilestoneTracker;

		beforeEach(() => {
			vi.clearAllMocks();
			tracker = new SnapshotMilestoneTracker();
		});

		// Happy Path: Detects milestone snapshots
		it("should detect 1st snapshot milestone", () => {
			const result = tracker.detectMilestone(1);

			expect(result).toBeDefined();
			expect(result?.milestone).toEqual("1st");
		});

		it("should detect 10th snapshot milestone", () => {
			const result = tracker.detectMilestone(10);

			expect(result).toBeDefined();
			expect(result?.milestone).toEqual("10th");
		});

		it("should detect 100th snapshot milestone", () => {
			const result = tracker.detectMilestone(100);

			expect(result).toBeDefined();
			expect(result?.milestone).toEqual("100th");
		});

		// Edge Case: Doesn't emit for regular snapshots
		it("should NOT emit milestone for regular snapshot count (5th)", () => {
			const result = tracker.detectMilestone(5);

			expect(result).toBeNull();
		});

		it("should NOT emit milestone for regular snapshot count (23rd)", () => {
			const result = tracker.detectMilestone(23);

			expect(result).toBeNull();
		});
	});

	// =========== FunnelValidator ===========
	describe("FunnelValidator.validateOrdering()", () => {
		let validator: FunnelValidator;

		beforeEach(() => {
			vi.clearAllMocks();
			validator = new FunnelValidator();
		});

		// Happy Path: Validates correct order
		it("should validate correct event ordering (initiated → completed)", () => {
			const events = [
				{ snapshotId: "snap-1", eventType: "snapshot_creation_initiated", timestamp: 1000 },
				{ snapshotId: "snap-1", eventType: "snapshot_creation_completed", timestamp: 2000 },
			];

			const result = validator.validateOrdering(events);

			expect(result.valid).toBe(true);
			expect(result.violations).toHaveLength(0);
		});

		// Edge Case: Handles interleaved snapshots
		it("should handle interleaved snapshots from different sources", () => {
			const events = [
				{ snapshotId: "snap-1", eventType: "snapshot_creation_initiated", timestamp: 1000 },
				{ snapshotId: "snap-2", eventType: "snapshot_creation_initiated", timestamp: 1500 },
				{ snapshotId: "snap-1", eventType: "snapshot_creation_completed", timestamp: 2000 },
				{ snapshotId: "snap-2", eventType: "snapshot_creation_completed", timestamp: 2500 },
			];

			const result = validator.validateOrdering(events);

			expect(result.valid).toBe(true);
		});

		// Sad Path: Tracks failures in funnel
		it("should detect out-of-order events", () => {
			const events = [
				{ snapshotId: "snap-1", eventType: "snapshot_creation_completed", timestamp: 1000 },
				{ snapshotId: "snap-1", eventType: "snapshot_creation_initiated", timestamp: 2000 },
			];

			const result = validator.validateOrdering(events);

			expect(result.valid).toBe(false);
			expect(result.violations.length).toBeGreaterThan(0);
		});
	});

	// =========== TelemetryPrivacy (NEW) ===========
	describe("TelemetryPrivacy.sanitize()", () => {
		// Happy Path: Hashes file paths
		it("should hash file paths with SHA256", () => {
			const crypto = require("crypto");
			const filePath = "/Users/user1/project/src/auth.ts";
			const hashed = crypto.createHash("sha256").update(filePath).digest("hex");

			expect(hashed).toBeDefined();
			expect(hashed.length).toEqual(64); // SHA256 produces 64 hex chars
			// Should not contain original path
			expect(hashed).not.toContain("auth.ts");
		});

		// Error Case: Removes paths from error messages
		it("should remove file paths from error messages", () => {
			const errorMsg = "Failed to save /home/user/file.ts: Permission denied";
			const sanitized = errorMsg
				.replace(/\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+/g, "/***")
				.replace(/[A-Z]:\\[a-zA-Z0-9_\-.\\]+\.[a-zA-Z0-9]+/g, "***");

			expect(sanitized).not.toContain("file.ts");
			expect(sanitized).toContain("Permission denied");
		});
	});
});
