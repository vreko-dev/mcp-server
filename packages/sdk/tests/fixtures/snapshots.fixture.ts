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
	metadata?: Record<string, unknown>;
}

/**
 * Create a minimal valid snapshot
 */
export function createSnapshot(overrides?: Partial<SnapshotFixture>): SnapshotFixture {
	const id = overrides?.id ?? "snap-" + Math.random().toString(36).slice(2);
	const filePath = overrides?.filePath ?? "/test/file.ts";
	const content = overrides?.content ?? "console.log('test');";
	const timestamp = overrides?.timestamp ?? Date.now();
	const hash = overrides?.hash ?? "hash-" + Math.random().toString(36).slice(2);
	const version = overrides?.version ?? "1.0.0";

	return {
		id,
		filePath,
		content,
		timestamp,
		hash,
		version,
		metadata: overrides?.metadata,
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
export function createSnapshots(
	count: number,
	overrides?: Partial<SnapshotFixture>
): SnapshotFixture[] {
	return Array.from({ length: count }, (_, i) =>
		createSnapshot({
			id: `snap-${i}`,
			filePath: `/test/file-${i}.ts`,
			content: `// File ${i}\nconsole.log('test-${i}');`,
			...overrides,
		})
	);
}

/**
 * Create a large snapshot for performance testing
 */
export function createLargeSnapshot(
	sizeKb: number = 100,
	overrides?: Partial<SnapshotFixture>
): SnapshotFixture {
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
