/**
 * Session Test Fixtures
 *
 * Centralized test data generators for session-related tests
 * Ensures consistent session data across the test suite
 */

export interface SessionFixture {
	id: string;
	userId: string;
	startTime: number;
	endTime?: number;
	status: "active" | "completed" | "failed";
	snapshotIds: string[];
	metadata?: Record<string, unknown>;
}

/**
 * Create a minimal active session
 */
export function createSession(overrides?: Partial<SessionFixture>): SessionFixture {
	const id = overrides?.id ?? `sess-${Math.random().toString(36).slice(2)}`;
	const userId = overrides?.userId ?? "user-test";
	const startTime = overrides?.startTime ?? Date.now();
	const status = overrides?.status ?? "active";
	const snapshotIds = overrides?.snapshotIds ?? [];

	return {
		id,
		userId,
		startTime,
		status,
		snapshotIds,
		metadata: overrides?.metadata,
	};
}

/**
 * Create a completed session with end time
 */
export function createCompletedSession(overrides?: Partial<SessionFixture>): SessionFixture {
	const startTime = Date.now() - 60000; // Started 1 minute ago
	const endTime = Date.now();

	return {
		...createSession({
			status: "completed",
			startTime,
			snapshotIds: ["snap-1", "snap-2"],
			...overrides,
		}),
		endTime,
	};
}

/**
 * Create a failed session
 */
export function createFailedSession(overrides?: Partial<SessionFixture>): SessionFixture {
	const startTime = Date.now() - 30000; // Started 30 seconds ago
	const endTime = Date.now();

	return {
		...createSession({
			status: "failed",
			startTime,
			snapshotIds: ["snap-1"],
			metadata: {
				error: "Storage operation failed",
				errorCode: "STORAGE_ERROR",
			},
			...overrides,
		}),
		endTime,
	};
}

/**
 * Create a session with multiple snapshots
 */
export function createSessionWithSnapshots(snapshotCount = 5, overrides?: Partial<SessionFixture>): SessionFixture {
	const snapshotIds = Array.from({ length: snapshotCount }, (_, i) => `snap-${i}`);

	return createSession({
		snapshotIds,
		...overrides,
	});
}

/**
 * Create multiple sessions for batch operations
 */
export function createSessions(count: number, overrides?: Partial<SessionFixture>): SessionFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createSession({
			id: `sess-${i}`,
			userId: `user-${i}`,
			startTime: Date.now() - (count - i) * 60000,
			snapshotIds: [`snap-${i}-1`, `snap-${i}-2`],
			...overrides,
		}),
	);
}

/**
 * Create sessions with various statuses for testing
 */
export function createSessionVariants(): Record<string, SessionFixture> {
	return {
		active: createSession({ status: "active" }),
		completed: { ...createCompletedSession(), endTime: Date.now() },
		failed: { ...createFailedSession(), endTime: Date.now() },
		completedWithoutSnapshots: {
			...createCompletedSession({
				snapshotIds: [],
			}),
			endTime: Date.now(),
		},
		longRunningActive: createSession({
			startTime: Date.now() - 24 * 60 * 60 * 1000, // Started 24 hours ago
			status: "active",
		}),
	};
}

/**
 * Create a session timeline (multiple sessions in sequence)
 */
export function createSessionTimeline(count = 3): SessionFixture[] {
	return Array.from({ length: count }, (_, i) => {
		const startTime = Date.now() - (count - i) * 60 * 60 * 1000; // Each hour apart
		const endTime = startTime + 30 * 60 * 1000; // Each 30 minutes long

		return createSession({
			id: `sess-${i}`,
			startTime,
			endTime,
			status: "completed",
			snapshotIds: [`snap-${i}-1`, `snap-${i}-2`, `snap-${i}-3`],
		});
	});
}
