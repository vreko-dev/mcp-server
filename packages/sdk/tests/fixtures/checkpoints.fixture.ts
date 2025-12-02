/**
 * Checkpoint Test Fixtures
 *
 * Centralized test data generators for checkpoint-related tests
 * Ensures consistent checkpoint data across the test suite
 */

export interface CheckpointFixture {
	id: string;
	filePath: string;
	content: string;
	timestamp: number;
	hash: string;
	version: string;
	isValid: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * Create a minimal valid checkpoint
 */
export function createCheckpoint(overrides?: Partial<CheckpointFixture>): CheckpointFixture {
	const id = overrides?.id ?? "cp-" + Math.random().toString(36).slice(2);
	const filePath = overrides?.filePath ?? "/test/file.ts";
	const content = overrides?.content ?? "// checkpoint content";
	const timestamp = overrides?.timestamp ?? Date.now();
	const hash = overrides?.hash ?? "hash-" + Math.random().toString(36).slice(2);
	const version = overrides?.version ?? "1.0.0";
	const isValid = overrides?.isValid ?? true;

	return {
		id,
		filePath,
		content,
		timestamp,
		hash,
		version,
		isValid,
		metadata: overrides?.metadata,
	};
}

/**
 * Create a corrupted checkpoint
 */
export function createCorruptedCheckpoint(overrides?: Partial<CheckpointFixture>): CheckpointFixture {
	return createCheckpoint({
		isValid: false,
		content: "", // Empty content indicates corruption
		...overrides,
	});
}

/**
 * Create checkpoints for a specific file
 */
export function createCheckpointsForFile(
	filePath: string,
	count: number = 3
): CheckpointFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createCheckpoint({
			id: `cp-${filePath.replace(/[^a-z0-9]/gi, "")}-${i}`,
			filePath,
			content: `// Checkpoint ${i}\nconst version = ${i};`,
			timestamp: Date.now() - (count - i) * 1000,
		})
	);
}

/**
 * Create checkpoint timeline (multiple checkpoints with realistic timestamps)
 */
export function createCheckpointTimeline(
	filePath: string,
	count: number = 5,
	intervalMs: number = 60000
): CheckpointFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createCheckpoint({
			id: `cp-${i}`,
			filePath,
			content: `// Revision ${i}\nlet revision = ${i};`,
			timestamp: Date.now() - (count - i - 1) * intervalMs,
		})
	);
}

/**
 * Create multiple checkpoint variants for edge case testing
 */
export function createCheckpointVariants(): Record<string, CheckpointFixture> {
	return {
		valid: createCheckpoint(),
		corrupted: createCorruptedCheckpoint(),
		empty: createCheckpoint({ content: "" }),
		large: createCheckpoint({
			content: "x".repeat(10000), // 10KB
		}),
		oldTimestamp: createCheckpoint({
			timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year old
		}),
		recentTimestamp: createCheckpoint({
			timestamp: Date.now() - 1000, // 1 second old
		}),
	};
}
