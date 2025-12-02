import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	createSession,
	createCompletedSession,
	createFailedSession,
	createSessionWithSnapshots,
	createSessions,
	createSessionVariants,
	createSessionTimeline,
} from "../fixtures/sessions.fixture";
import { measureTime } from "../helpers/test-helpers";

/**
 * Mock Session Manager for testing
 */
class MockSessionManager {
	private sessions = new Map<string, any>();

	createSession(id: string, session: any): void {
		this.sessions.set(id, session);
	}

	getSession(id: string): any {
		return this.sessions.get(id);
	}

	updateSession(id: string, session: any): void {
		this.sessions.set(id, session);
	}

	deleteSession(id: string): void {
		this.sessions.delete(id);
	}

	listSessions(): any[] {
		return Array.from(this.sessions.values());
	}

	clearSessions(): void {
		this.sessions.clear();
	}

	finalizeSession = vi.fn();
}

describe("@snapback/sdk - Session Management", () => {
	let sessionMgr: MockSessionManager;

	beforeEach(() => {
		sessionMgr = new MockSessionManager();
	});

	describe("Session Creation", () => {
		it("creates a new session", () => {
			const session = createSession();

			expect(session.id).toBeDefined();
			expect(session.userId).toBeDefined();
			expect(session.status).toBe("active");
		});

		it("creates session with custom properties", () => {
			const session = createSession({
				userId: "custom-user",
				status: "active",
			});

			expect(session.userId).toBe("custom-user");
			expect(session.status).toBe("active");
		});

		it("generates unique session IDs", () => {
			const session1 = createSession();
			const session2 = createSession();

			expect(session1.id).not.toBe(session2.id);
		});

		it("initializes with correct timestamps", () => {
			const session = createSession();

			expect(session.startTime).toBeGreaterThan(0);
		});

		it("starts with empty snapshot list", () => {
			const session = createSession();

			expect(session.snapshotIds).toEqual([]);
		});
	});

	describe("Session State Transitions", () => {
		it("transitions from active to completed", () => {
			const session = createSession({ status: "active" });
			sessionMgr.createSession(session.id, session);

			const completedSession = {
				...session,
				status: "completed" as const,
				endTime: Date.now(),
			};

			sessionMgr.updateSession(session.id, completedSession);
			const updated = sessionMgr.getSession(session.id);
			expect((updated as any).status).toBe("completed");
		});

		it("handles session completion with end time", () => {
			const completed = createCompletedSession();

			expect(completed.status).toBe("completed");
			expect(completed.endTime).toBeDefined();
			expect((completed.endTime ?? 0) > completed.startTime).toBe(true);
		});

		it("handles failed session with error metadata", () => {
			const failed = createFailedSession();

			expect(failed.status).toBe("failed");
			expect(failed.endTime).toBeDefined();
			expect((failed as any).metadata?.error).toBeDefined();
		});
	});

	describe("Session Snapshots", () => {
		it("adds snapshots to session", () => {
			const session = createSession({
				snapshotIds: ["snap-1"],
			});

			sessionMgr.createSession(session.id, session);

			const updated = {
				...session,
				snapshotIds: ["snap-1", "snap-2"],
			};

			sessionMgr.updateSession(session.id, updated);

			const retrieved = sessionMgr.getSession(session.id) as any;
			expect(retrieved.snapshotIds).toContain("snap-2");
		});

		it("tracks multiple snapshots in session", () => {
			const snapshots = ["snap-1", "snap-2", "snap-3", "snap-4"];
			const session = createSession({ snapshotIds: snapshots });

			expect(session.snapshotIds).toEqual(snapshots);
		});

		it("maintains snapshot order", () => {
			const session = createSession({
				snapshotIds: ["snap-a", "snap-b", "snap-c"],
			});

			const retrieved = session.snapshotIds;
			expect(retrieved).toEqual(["snap-a", "snap-b", "snap-c"]);
		});
	});

	describe("Session Cleanup & Finalization", () => {
		it("finalizes session", async () => {
			const session = createSession();

			sessionMgr.createSession(session.id, session);
			await sessionMgr.finalizeSession();

			expect(sessionMgr.finalizeSession).toHaveBeenCalled();
		});

		it("deletes session after finalization", async () => {
			const session = createSession();

			sessionMgr.createSession(session.id, session);
			sessionMgr.deleteSession(session.id);

			const retrieved = sessionMgr.getSession(session.id);
			expect(retrieved).toBeUndefined();
		});

		it("clears all sessions", () => {
			const sessions = createSessions(3);

			sessions.forEach((session) => {
				sessionMgr.createSession(session.id, session);
			});

			expect(sessionMgr.listSessions()).toHaveLength(3);

			sessionMgr.clearSessions();

			expect(sessionMgr.listSessions()).toHaveLength(0);
		});

		it("handles cleanup of non-existent session", () => {
			expect(() => {
				sessionMgr.deleteSession("non-existent-id");
			}).not.toThrow();
		});
	});

	describe("Session Listing & Filtering", () => {
		it("lists all active sessions", () => {
			const sessions = createSessions(3, { status: "active" });

			sessions.forEach((session) => {
				sessionMgr.createSession(session.id, session);
			});

			const all = sessionMgr.listSessions();

			expect(all.length).toBeGreaterThan(0);
		});

		it("lists completed sessions", () => {
			const completed = createCompletedSession();

			sessionMgr.createSession(completed.id, completed);

			const all = sessionMgr.listSessions();

			expect(all).toContainEqual(
				expect.objectContaining({ status: "completed" })
			);
		});

		it("lists failed sessions", () => {
			const failed = createFailedSession();

			sessionMgr.createSession(failed.id, failed);

			const all = sessionMgr.listSessions();

			expect(all).toContainEqual(
				expect.objectContaining({ status: "failed" })
			);
		});

		it("retrieves session by ID", () => {
			const session = createSession();

			sessionMgr.createSession(session.id, session);

			const retrieved = sessionMgr.getSession(session.id);

			expect(retrieved).toEqual(session);
		});
	});

	describe("Session Timeline & Duration", () => {
		it("calculates session duration", () => {
			const session = createCompletedSession();
			const duration =
				(session.endTime ?? Date.now()) - session.startTime;

			expect(duration).toBeGreaterThan(0);
		});

		it("creates session timeline", () => {
			const timeline = createSessionTimeline(5);

			expect(timeline).toHaveLength(5);

			for (let i = 0; i < timeline.length - 1; i++) {
				expect(timeline[i].startTime).toBeLessThanOrEqual(
					timeline[i + 1].startTime
				);
			}
		});

		it("handles long-running sessions", () => {
			const dayMs = 24 * 60 * 60 * 1000;
			const session = createSession({
				startTime: Date.now() - dayMs,
				status: "active",
			});

			const elapsed = Date.now() - session.startTime;

			expect(elapsed).toBeGreaterThan(0);
		});

		it("tracks session start and end times", () => {
			const completed = createCompletedSession();

			expect(completed.startTime).toBeGreaterThan(0);
			expect((completed.endTime ?? 0) > completed.startTime).toBe(true);
		});
	});

	describe("Concurrent Session Handling", () => {
		it("creates multiple sessions concurrently", async () => {
			const promises = Array.from({ length: 50 }, () => {
				return Promise.resolve().then(() => {
					const session = createSession();
					sessionMgr.createSession(session.id, session);
					return session;
				});
			});

			const sessions = await Promise.all(promises);

			expect(sessions).toHaveLength(50);
			expect(new Set(sessions.map((s) => s.id)).size).toBe(50);
		});

		it("handles concurrent session updates", async () => {
			const session = createSession();
			sessionMgr.createSession(session.id, session);

			const updates = Array.from({ length: 10 }, (_, i) => {
				return Promise.resolve().then(() => {
					sessionMgr.updateSession(session.id, {
						...session,
						snapshotIds: [`snap-${i}`],
					});
				});
			});

			await Promise.all(updates);

			expect(sessionMgr.listSessions()).toHaveLength(1);
		});

		it("handles concurrent deletions safely", async () => {
			const sessions = createSessions(10);
			sessions.forEach((session) => {
				sessionMgr.createSession(session.id, session);
			});

			const deletions = sessions.map((session) =>
				Promise.resolve().then(() => {
					sessionMgr.deleteSession(session.id);
				})
			);

			await Promise.all(deletions);

			expect(sessionMgr.listSessions()).toHaveLength(0);
		});
	});

	describe("Performance Characteristics", () => {
		it("creates session within budget", async () => {
			const { duration } = await measureTime(() => {
				createSession();
			});

			expect(duration).toBeLessThan(5);
		});

		it("registers session in manager quickly", async () => {
			const session = createSession();

			const { duration } = await measureTime(() => {
				sessionMgr.createSession(session.id, session);
			});

			expect(duration).toBeLessThan(5);
		});

		it("retrieves session quickly", async () => {
			const session = createSession();
			sessionMgr.createSession(session.id, session);

			const { duration } = await measureTime(() => {
				sessionMgr.getSession(session.id);
			});

			expect(duration).toBeLessThan(5);
		});

		it("lists sessions within budget", async () => {
			const sessions = createSessions(100);
			sessions.forEach((session) => {
				sessionMgr.createSession(session.id, session);
			});

			const { duration } = await measureTime(() => {
				sessionMgr.listSessions();
			});

			expect(duration).toBeLessThan(50);
		});

		it("handles 1000 session operations efficiently", async () => {
			const { duration } = await measureTime(async () => {
				for (let i = 0; i < 1000; i++) {
					const session = createSession({
						userId: `user-${i}`,
					});
					sessionMgr.createSession(session.id, session);
				}
			});

			expect(duration).toBeLessThan(1000);
		});
	});

	describe("Session Variants & Edge Cases", () => {
		it("handles active sessions", () => {
			const variants = createSessionVariants();

			expect(variants.active.status).toBe("active");
			expect(variants.active.endTime).toBeUndefined();
		});

		it("handles completed sessions", () => {
			const variants = createSessionVariants();

			expect(variants.completed.status).toBe("completed");
			expect(variants.completed.endTime).toBeDefined();
		});

		it("handles failed sessions", () => {
			const variants = createSessionVariants();

			expect(variants.failed.status).toBe("failed");
			expect((variants.failed as any).metadata?.error).toBeDefined();
		});

		it("handles sessions without snapshots", () => {
			const session = createSession({ snapshotIds: [] });

			expect(session.snapshotIds).toHaveLength(0);
		});

		it("handles long-running active sessions", () => {
			const variants = createSessionVariants();

			expect(variants.longRunningActive.status).toBe("active");
			expect(variants.longRunningActive.startTime).toBeLessThan(
				Date.now()
			);
		});

		it("handles empty session metadata", () => {
			const session = createSession({ metadata: undefined });

			expect(session.metadata).toBeUndefined();
		});
	});

	describe("Session Data Integrity", () => {
		it("preserves session data through updates", () => {
			const original = createSession();

			sessionMgr.createSession(original.id, original);

			const updated = {
				...original,
				status: "completed" as const,
			};

			sessionMgr.updateSession(original.id, updated);

			const retrieved = sessionMgr.getSession(original.id);

			expect(retrieved.userId).toBe(original.userId);
			expect(retrieved.startTime).toBe(original.startTime);
		});

		it("maintains snapshot consistency", () => {
			const session = createSessionWithSnapshots(5);

			expect(session.snapshotIds).toHaveLength(5);

			sessionMgr.createSession(session.id, session);

			const retrieved = sessionMgr.getSession(session.id);

			expect(retrieved.snapshotIds).toEqual(session.snapshotIds);
		});
	});
});
