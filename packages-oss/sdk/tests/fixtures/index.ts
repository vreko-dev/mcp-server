/**
 * Test Fixtures Index
 *
 * Central export point for all test fixtures
 * Enables convenient importing from test files
 */

export {
	createCorruptedSnapshot,
	createLargeSnapshot,
	createSnapshot,
	createSnapshots,
	createSnapshotsForFile,
	createSnapshotTimeline,
	createSnapshotVariants,
	createSnapshotWithMocks,
	createSnapshotWithPhantomDep,
	createSnapshotWithSecret,
	type SnapshotFixture,
} from "./snapshots.fixture";
