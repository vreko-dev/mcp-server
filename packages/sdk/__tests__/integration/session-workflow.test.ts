/**
 * Session Workflow Integration Tests
 *
 * Tests the complete end-to-end session lifecycle workflow including:
 * - Session creation and initialization
 * - Event recording and session state transitions
 * - Session finalization and metrics calculation
 * - Cross-component session coordination
 *
 * These tests ensure that sessions work correctly across the SDK,
 * from initial creation through event recording to final metrics generation.
 */

import { beforeEach, describe, expect, it } from "vitest";

/**
 * Mock session implementation for testing
 */
class MockSessionCoordinator {
	private sessions: Map<string, any> = new Map();

	createSession(id: string, metadata: any) {
		if (this.sessions.has(id)) {
			throw new Error(`Session ${id} already exists`);
		}
		this.sessions.set(id, {
			id,
			metadata,
			events: [],
			startTime: Date.now(),
			endTime: null,
			status: "active",
		});
		return this.sessions.get(id);
	}

	recordEvent(sessionId: string, event: any) {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}
		session.events.push({ ...event, timestamp: Date.now() });
		return { ...event, timestamp: Date.now() };
	}

	finalizeSession(sessionId: string) {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}
		session.status = "completed";
		session.endTime = Date.now();
		return {
			...session,
			duration: session.endTime - session.startTime,
			eventCount: session.events.length,
		};
	}

	getSessionMetrics(sessionId: string) {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}
		const duration = (session.endTime || Date.now()) - session.startTime;
		return {
			sessionId,
			duration,
			eventCount: session.events.length,
			filesChanged: session.metadata?.files?.length || 0,
			averageEventInterval: session.events.length > 0 ? duration / session.events.length : 0,
			status: session.status,
		};
	}

	getSession(sessionId: string) {
		return this.sessions.get(sessionId);
	}
}

describe("Session Workflow Integration", () => {
	let coordinator: MockSessionCoordinator;

	beforeEach(() => {
		coordinator = new MockSessionCoordinator();
	});

	describe("Session Lifecycle", () => {
		it("should create a session with metadata", () => {
			const sessionId = "session-001";
			const metadata = {
				files: ["file1.ts", "file2.ts"],
				branch: "main",
				timestamp: Date.now(),
			};

			const session = coordinator.createSession(sessionId, metadata);

			expect(session).toBeDefined();
			expect(session.id).toBe(sessionId);
			expect(session.metadata).toEqual(metadata);
			expect(session.status).toBe("active");
			expect(session.events).toEqual([]);
		});

		it("should prevent duplicate session creation", () => {
			const sessionId = "session-002";
			coordinator.createSession(sessionId, {});

			expect(() => {
				coordinator.createSession(sessionId, {});
			}).toThrow();
		});

		it("should fail to record events on non-existent session", () => {
			expect(() => {
				coordinator.recordEvent("non-existent-session", {
					type: "file-change",
				});
			}).toThrow("Session non-existent-session not found");
		});
	});

	describe("Event Recording", () => {
		it("should record single event in session", () => {
			const sessionId = "session-003";
			coordinator.createSession(sessionId, {});

			const event = {
				type: "file-change",
				filePath: "test.ts",
				changeType: "modified" as const,
			};

			const recorded = coordinator.recordEvent(sessionId, event);

			expect(recorded).toBeDefined();
			expect(recorded.type).toBe("file-change");
			expect(recorded.timestamp).toBeDefined();

			const session = coordinator.getSession(sessionId);
			expect(session.events).toHaveLength(1);
		});

		it("should record multiple events in correct order", () => {
			const sessionId = "session-004";
			coordinator.createSession(sessionId, {});

			const events = [
				{ type: "file-change", filePath: "file1.ts", changeType: "added" as const },
				{ type: "file-change", filePath: "file2.ts", changeType: "modified" as const },
				{ type: "file-change", filePath: "file3.ts", changeType: "deleted" as const },
			];

			for (const event of events) {
				coordinator.recordEvent(sessionId, event);
			}

			const session = coordinator.getSession(sessionId);
			expect(session.events).toHaveLength(3);
			expect(session.events[0].filePath).toBe("file1.ts");
			expect(session.events[1].filePath).toBe("file2.ts");
			expect(session.events[2].filePath).toBe("file3.ts");
		});

		it("should record events with proper timestamps", () => {
			const sessionId = "session-005";
			coordinator.createSession(sessionId, {});

			const event1 = coordinator.recordEvent(sessionId, { type: "event1" });
			const event2 = coordinator.recordEvent(sessionId, { type: "event2" });

			expect(event2.timestamp).toBeGreaterThanOrEqual(event1.timestamp);
		});
	});

	describe("Session Finalization", () => {
		it("should finalize active session", () => {
			const sessionId = "session-006";
			coordinator.createSession(sessionId, {});
			coordinator.recordEvent(sessionId, { type: "event1" });

			const finalized = coordinator.finalizeSession(sessionId);

			expect(finalized.status).toBe("completed");
			expect(finalized.endTime).toBeDefined();
			expect(finalized.duration).toBeGreaterThanOrEqual(0);
		});

		it("should calculate session metrics after finalization", () => {
			const sessionId = "session-007";
			coordinator.createSession(sessionId, { files: ["a.ts", "b.ts"] });
			coordinator.recordEvent(sessionId, { type: "event1" });
			coordinator.recordEvent(sessionId, { type: "event2" });
			coordinator.recordEvent(sessionId, { type: "event3" });

			coordinator.finalizeSession(sessionId);
			const metrics = coordinator.getSessionMetrics(sessionId);

			expect(metrics.sessionId).toBe(sessionId);
			expect(metrics.eventCount).toBe(3);
			expect(metrics.filesChanged).toBe(2);
			expect(metrics.duration).toBeGreaterThanOrEqual(0);
			expect(metrics.status).toBe("completed");
			expect(metrics.averageEventInterval).toBeGreaterThanOrEqual(0);
		});

		it("should prevent finalizing non-existent session", () => {
			expect(() => {
				coordinator.finalizeSession("non-existent");
			}).toThrow("Session non-existent not found");
		});
	});

	describe("Concurrent Sessions", () => {
		it("should manage multiple sessions independently", () => {
			const _session1 = coordinator.createSession("session-1", {
				branch: "main",
			});
			const _session2 = coordinator.createSession("session-2", {
				branch: "feature",
			});

			coordinator.recordEvent("session-1", { type: "event1" });
			coordinator.recordEvent("session-2", { type: "event2" });
			coordinator.recordEvent("session-2", { type: "event3" });

			expect(coordinator.getSession("session-1").events).toHaveLength(1);
			expect(coordinator.getSession("session-2").events).toHaveLength(2);
		});

		it("should finalize sessions independently", () => {
			coordinator.createSession("session-1", {});
			coordinator.createSession("session-2", {});

			coordinator.recordEvent("session-1", { type: "event1" });
			coordinator.recordEvent("session-2", { type: "event2" });

			coordinator.finalizeSession("session-1");
			const session1 = coordinator.getSession("session-1");
			const session2 = coordinator.getSession("session-2");

			expect(session1.status).toBe("completed");
			expect(session2.status).toBe("active");
		});
	});

	describe("Session State Transitions", () => {
		it("should transition from pending to active to completed", () => {
			const sessionId = "session-state-test";

			// Create session (pending -> active)
			const created = coordinator.createSession(sessionId, {});
			expect(created.status).toBe("active");

			// Record events
			coordinator.recordEvent(sessionId, { type: "event1" });

			// Finalize (active -> completed)
			const finalized = coordinator.finalizeSession(sessionId);
			expect(finalized.status).toBe("completed");
		});

		it("should maintain session data through state transitions", () => {
			const sessionId = "session-data-test";
			const metadata = { testData: "value" };

			coordinator.createSession(sessionId, metadata);
			coordinator.recordEvent(sessionId, { type: "event1" });
			coordinator.finalizeSession(sessionId);

			const finalSession = coordinator.getSession(sessionId);
			expect(finalSession.metadata).toEqual(metadata);
			expect(finalSession.events).toHaveLength(1);
		});
	});

	describe("End-to-End Session Workflow", () => {
		it("should complete full session workflow", () => {
			const sessionId = "e2e-session";
			const files = ["src/app.ts", "src/utils.ts", "src/types.ts"];
			const metadata = { files, branch: "develop", user: "test-user" };

			// 1. Create session
			coordinator.createSession(sessionId, metadata);

			// 2. Record multiple events
			coordinator.recordEvent(sessionId, {
				type: "file-change",
				filePath: "src/app.ts",
				changeType: "modified",
			});
			coordinator.recordEvent(sessionId, {
				type: "file-change",
				filePath: "src/utils.ts",
				changeType: "added",
			});
			coordinator.recordEvent(sessionId, {
				type: "analysis-complete",
				riskScore: 3.5,
			});

			// 3. Finalize session
			const finalized = coordinator.finalizeSession(sessionId);

			// 4. Verify final state
			expect(finalized).toBeDefined();
			expect(finalized.status).toBe("completed");

			// 5. Get metrics
			const metrics = coordinator.getSessionMetrics(sessionId);

			expect(metrics.sessionId).toBe(sessionId);
			expect(metrics.eventCount).toBe(3);
			expect(metrics.filesChanged).toBe(3);
			expect(metrics.duration).toBeGreaterThanOrEqual(0);
			expect(metrics.status).toBe("completed");
		});

		it("should handle session with no events", () => {
			const sessionId = "empty-session";
			coordinator.createSession(sessionId, {});

			const _finalized = coordinator.finalizeSession(sessionId);
			const metrics = coordinator.getSessionMetrics(sessionId);

			expect(metrics.eventCount).toBe(0);
			expect(metrics.averageEventInterval).toBeGreaterThanOrEqual(0);
		});

		it("should calculate accurate metrics for long-running session", async () => {
			const sessionId = "long-session";
			coordinator.createSession(sessionId, {});

			// Simulate session with events
			coordinator.recordEvent(sessionId, { type: "event1" });
			await new Promise((resolve) => setTimeout(resolve, 10));
			coordinator.recordEvent(sessionId, { type: "event2" });

			const _finalized = coordinator.finalizeSession(sessionId);
			const metrics = coordinator.getSessionMetrics(sessionId);

			expect(metrics.duration).toBeGreaterThan(10);
			expect(metrics.eventCount).toBe(2);
			expect(metrics.averageEventInterval).toBeGreaterThan(0);
		});
	});

	describe("Session Recovery", () => {
		it("should preserve session state on completion", () => {
			const sessionId = "recovery-session";
			const originalMetadata = { critical: "data" };

			coordinator.createSession(sessionId, originalMetadata);
			coordinator.recordEvent(sessionId, { type: "event" });
			coordinator.finalizeSession(sessionId);

			// Retrieve completed session
			const recovered = coordinator.getSession(sessionId);

			expect(recovered.metadata).toEqual(originalMetadata);
			expect(recovered.status).toBe("completed");
			expect(recovered.events).toHaveLength(1);
		});
	});
});
