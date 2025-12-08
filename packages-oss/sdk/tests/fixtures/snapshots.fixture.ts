/**
 * Snapshot Test Fixtures
 *
 * Centralized test data generators for snapshot-related tests
 * Ensures consistent snapshot data across the test suite
 */

export interface SnapshotFixture {
	id: string;
	filePath: string;
	content: string;
	timestamp: number;
	hash: string;
	version: string;
	isValid?: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * Create a minimal valid snapshot
 */
export function createSnapshot(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	const id = overrides?.id ?? `snap-${Math.random().toString(36).slice(2)}`;
	const filePath = overrides?.filePath ?? "/test/file.ts";
	const content = overrides?.content ?? "console.log('test');";
	const timestamp = overrides?.timestamp ?? Date.now();
	const hash = overrides?.hash ?? `hash-${Math.random().toString(36).slice(2)}`;
	const version = overrides?.version ?? "1.0.0";

	return {
		id,
		filePath,
		content,
		timestamp,
		hash,
		version,
		isValid: overrides?.isValid ?? true,
		metadata: overrides?.metadata,
	};
}

/**
 * Create a corrupted snapshot
 */
export function createCorruptedSnapshot(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	return createSnapshot({
		isValid: false,
		content: "", // Empty content indicates corruption
		...overrides,
	});
}

/**
 * Create snapshots for a specific file
 */
export function createSnapshotsForFile(filePath: string, count = 3): SnapshotFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createSnapshot({
			id: `snap-${filePath.replace(/[^a-z0-9]/gi, "")}-${i}`,
			filePath,
			content: `// Snapshot ${i}\nconst version = ${i};`,
			timestamp: Date.now() - (count - i) * 1000,
		}),
	);
}

/**
 * Create snapshot timeline (multiple snapshots with realistic timestamps)
 */
export function createSnapshotTimeline(filePath: string, count = 5, intervalMs = 60000): SnapshotFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createSnapshot({
			id: `snap-${i}`,
			filePath,
			content: `// Revision ${i}\nlet revision = ${i};`,
			timestamp: Date.now() - (count - i - 1) * intervalMs,
		}),
	);
}

/**
 * Create multiple snapshot variants for edge case testing
 */
export function createSnapshotVariants(): Record<string, SnapshotFixture> {
	return {
		valid: createSnapshot(),
		corrupted: createCorruptedSnapshot(),
		empty: createSnapshot({ content: "" }),
		large: createLargeSnapshot(),
		oldTimestamp: createSnapshot({
			timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year old
		}),
		recentTimestamp: createSnapshot({
			timestamp: Date.now() - 1000, // 1 second old
		}),
	};
}

/**
 * Create a snapshot with secret content
 */
export function createSnapshotWithSecret(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	return createSnapshot({
		content: `const apiKey = "sk_test_abc123def456";
const dbPassword = "Password123!";
export default { apiKey, dbPassword };`,
		...overrides,
	});
}

/**
 * Create a snapshot with mock content
 */
export function createSnapshotWithMocks(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	return createSnapshot({
		content: `import { vi } from "vitest";
const mockFn = vi.fn(() => "mocked");
export { mockFn };`,
		...overrides,
	});
}

/**
 * Create a snapshot with phantom dependency
 */
export function createSnapshotWithPhantomDep(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	return createSnapshot({
		content: `import crypto from "crypto";
// crypto is a Node.js built-in, not in package.json
export { crypto };`,
		...overrides,
	});
}

/**
 * Create multiple snapshots for batch operations
 */
export function createSnapshots(count: number, overrides?: Partial<SnapshotFixture>): SnapshotFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createSnapshot({
			id: `snap-${i}`,
			filePath: `/test/file-${i}.ts`,
			content: `// File ${i}\nconsole.log('test-${i}');`,
			...overrides,
		}),
	);
}

/**
 * Create a large snapshot for performance testing
 */
export function createLargeSnapshot(sizeKb = 100, overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	// Generate content approximately sizeKb
	const targetSize = sizeKb * 1024;
	const lineTemplate = "// This is a test line for performance testing\n";
	const lineCount = Math.ceil(targetSize / lineTemplate.length);
	const content = Array(lineCount).fill(lineTemplate).join("");

	return createSnapshot({
		content,
		...overrides,
	});
}
