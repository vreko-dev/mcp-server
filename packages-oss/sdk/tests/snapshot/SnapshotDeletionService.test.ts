/**
 * SDK SnapshotDeletionService Tests
 *
 * Tests safe snapshot deletion including:
 * - Single snapshot deletion with confirmation
 * - Protected snapshot handling
 * - Bulk deletion by age
 * - Auto-cleanup with minimum preservation
 * - Error handling and recovery
 * - Performance budgets (<50ms single, <500ms bulk)
 *
 * @module tests/snapshot/SnapshotDeletionService.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ILogger } from "../../src/core/session/interfaces";
import {
	type AutoCleanupConfig,
	type DeletableSnapshot,
	type IConfirmationService,
	type ISnapshotManagerForDeletion,
	SnapshotDeletionService,
} from "../../src/snapshot/SnapshotDeletionService";

// Test logger that captures log calls
class TestLogger implements ILogger {
	public debugCalls: Array<{ message: string; data?: unknown }> = [];
	public infoCalls: Array<{ message: string; data?: unknown }> = [];
	public errorCalls: Array<{ message: string; error?: Error; data?: unknown }> = [];

	debug(message: string, data?: unknown): void {
		this.debugCalls.push({ message, data });
	}

	info(message: string, data?: unknown): void {
		this.infoCalls.push({ message, data });
	}

	error(message: string, error?: Error, data?: unknown): void {
		this.errorCalls.push({ message, error, data });
	}

	clear(): void {
		this.debugCalls = [];
		this.infoCalls = [];
		this.errorCalls = [];
	}
}

// Mock snapshot manager for testing
class MockSnapshotManager implements ISnapshotManagerForDeletion {
	public snapshots: Map<string, DeletableSnapshot> = new Map();
	public deleteCalls: string[] = [];
	public unprotectCalls: string[] = [];
	public deleteError: Error | null = null;

	async get(id: string): Promise<DeletableSnapshot | undefined> {
		return this.snapshots.get(id);
	}

	async getAll(): Promise<DeletableSnapshot[]> {
		return Array.from(this.snapshots.values());
	}

	async delete(id: string): Promise<void> {
		if (this.deleteError) {
			throw this.deleteError;
		}
		this.deleteCalls.push(id);
		this.snapshots.delete(id);
	}

	async unprotect(id: string): Promise<void> {
		this.unprotectCalls.push(id);
		const snapshot = this.snapshots.get(id);
		if (snapshot) {
			snapshot.isProtected = false;
		}
	}

	addSnapshot(snapshot: DeletableSnapshot): void {
		this.snapshots.set(snapshot.id, snapshot);
	}

	clear(): void {
		this.snapshots.clear();
		this.deleteCalls = [];
		this.unprotectCalls = [];
		this.deleteError = null;
	}
}

// Mock confirmation service for testing
class MockConfirmationService implements IConfirmationService {
	public confirmResult = true;
	public confirmCalls: Array<{ message: string; detail?: string }> = [];

	async confirm(message: string, detail?: string): Promise<boolean> {
		this.confirmCalls.push({ message, detail });
		return this.confirmResult;
	}

	setConfirmResult(result: boolean): void {
		this.confirmResult = result;
	}

	clear(): void {
		this.confirmCalls = [];
		this.confirmResult = true;
	}
}

// Helper to create test snapshots
function createTestSnapshot(overrides: Partial<DeletableSnapshot> = {}): DeletableSnapshot {
	return {
		id: `snap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		name: "Test Snapshot",
		timestamp: Date.now(),
		isProtected: false,
		...overrides,
	};
}

describe("SnapshotDeletionService", () => {
	let service: SnapshotDeletionService;
	let mockManager: MockSnapshotManager;
	let mockConfirmation: MockConfirmationService;
	let testLogger: TestLogger;

	beforeEach(() => {
		mockManager = new MockSnapshotManager();
		mockConfirmation = new MockConfirmationService();
		testLogger = new TestLogger();
		service = new SnapshotDeletionService(mockManager, mockConfirmation, { logger: testLogger });
	});

	afterEach(() => {
		mockManager.clear();
		mockConfirmation.clear();
		testLogger.clear();
	});

	describe("Constructor & Options", () => {
		it("should create service with default options", () => {
			const defaultService = new SnapshotDeletionService(mockManager, mockConfirmation);
			expect(defaultService).toBeDefined();
		});

		it("should accept custom logger", () => {
			const customLogger = new TestLogger();
			const customService = new SnapshotDeletionService(mockManager, mockConfirmation, { logger: customLogger });
			expect(customService).toBeDefined();
		});
	});

	describe("Single Snapshot Deletion", () => {
		describe("Basic Deletion", () => {
			it("should delete snapshot with confirmation", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1", name: "Test Snap" });
				mockManager.addSnapshot(snapshot);
				mockConfirmation.setConfirmResult(true);

				const result = await service.deleteSnapshot("snap-1");

				expect(result.success).toBe(true);
				expect(result.deletedCount).toBe(1);
				expect(mockManager.deleteCalls).toContain("snap-1");
				expect(mockConfirmation.confirmCalls.length).toBe(1);
			});

			it("should cancel deletion when user declines confirmation", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1" });
				mockManager.addSnapshot(snapshot);
				mockConfirmation.setConfirmResult(false);

				const result = await service.deleteSnapshot("snap-1");

				expect(result.success).toBe(false);
				expect(result.deletedCount).toBe(0);
				expect(result.error).toBe("User cancelled deletion");
				expect(mockManager.deleteCalls).not.toContain("snap-1");
			});

			it("should delete snapshot without confirmation when skipConfirmation is true", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1" });
				mockManager.addSnapshot(snapshot);

				const result = await service.deleteSnapshot("snap-1", { skipConfirmation: true });

				expect(result.success).toBe(true);
				expect(result.deletedCount).toBe(1);
				expect(mockConfirmation.confirmCalls.length).toBe(0);
			});
		});

		describe("Error Handling", () => {
			it("should throw error when snapshot not found", async () => {
				await expect(service.deleteSnapshot("nonexistent")).rejects.toThrow("Snapshot not found: nonexistent");
			});

			it("should throw error when trying to delete protected snapshot", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1", isProtected: true });
				mockManager.addSnapshot(snapshot);

				await expect(service.deleteSnapshot("snap-1")).rejects.toThrow(
					"Cannot delete protected snapshot. Set unprotectFirst=true to override.",
				);
			});
		});

		describe("Protected Snapshot Handling", () => {
			it("should unprotect and delete when unprotectFirst is true", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1", isProtected: true });
				mockManager.addSnapshot(snapshot);
				mockConfirmation.setConfirmResult(true);

				const result = await service.deleteSnapshot("snap-1", { unprotectFirst: true });

				expect(result.success).toBe(true);
				expect(result.deletedCount).toBe(1);
				expect(mockManager.unprotectCalls).toContain("snap-1");
				expect(mockManager.deleteCalls).toContain("snap-1");
			});

			it("should delete unprotected snapshot even with unprotectFirst flag", async () => {
				const snapshot = createTestSnapshot({ id: "snap-1", isProtected: false });
				mockManager.addSnapshot(snapshot);

				const result = await service.deleteSnapshot("snap-1", { unprotectFirst: true, skipConfirmation: true });

				expect(result.success).toBe(true);
				// Should not call unprotect since already unprotected
				expect(mockManager.unprotectCalls).not.toContain("snap-1");
			});
		});
	});

	describe("Bulk Deletion - deleteOlderThan", () => {
		const now = Date.now();
		const oneDay = 24 * 60 * 60 * 1000;

		beforeEach(() => {
			// Add snapshots with various ages
			mockManager.addSnapshot(createTestSnapshot({ id: "snap-old-1", timestamp: now - 10 * oneDay }));
			mockManager.addSnapshot(createTestSnapshot({ id: "snap-old-2", timestamp: now - 5 * oneDay }));
			mockManager.addSnapshot(createTestSnapshot({ id: "snap-new-1", timestamp: now - 1 * oneDay }));
			mockManager.addSnapshot(createTestSnapshot({ id: "snap-new-2", timestamp: now }));
		});

		it("should delete snapshots older than specified timestamp", async () => {
			const cutoff = now - 3 * oneDay;

			const result = await service.deleteOlderThan(cutoff);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(2);
			expect(mockManager.deleteCalls).toContain("snap-old-1");
			expect(mockManager.deleteCalls).toContain("snap-old-2");
			expect(mockManager.deleteCalls).not.toContain("snap-new-1");
			expect(mockManager.deleteCalls).not.toContain("snap-new-2");
		});

		it("should skip protected snapshots when keepProtected is true", async () => {
			// Make one old snapshot protected
			mockManager.snapshots.get("snap-old-1")!.isProtected = true;
			const cutoff = now - 3 * oneDay;

			const result = await service.deleteOlderThan(cutoff, true);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(1);
			expect(mockManager.deleteCalls).not.toContain("snap-old-1");
			expect(mockManager.deleteCalls).toContain("snap-old-2");
		});

		it("should delete protected snapshots when keepProtected is false", async () => {
			mockManager.snapshots.get("snap-old-1")!.isProtected = true;
			const cutoff = now - 3 * oneDay;

			const result = await service.deleteOlderThan(cutoff, false);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(2);
			expect(mockManager.unprotectCalls).toContain("snap-old-1");
			expect(mockManager.deleteCalls).toContain("snap-old-1");
		});

		it("should continue deleting when individual deletion fails", async () => {
			const cutoff = now - 3 * oneDay;

			// Make first deletion fail
			let callCount = 0;
			const originalDelete = mockManager.delete.bind(mockManager);
			mockManager.delete = async (id: string) => {
				callCount++;
				if (callCount === 1) {
					throw new Error("Simulated failure");
				}
				return originalDelete(id);
			};

			const result = await service.deleteOlderThan(cutoff);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(1);
			expect(testLogger.errorCalls.length).toBeGreaterThan(0);
		});

		it("should return success with 0 deletedCount when no snapshots match", async () => {
			const cutoff = now - 100 * oneDay; // Very old cutoff

			// All snapshots are newer than this cutoff
			mockManager.clear();
			mockManager.addSnapshot(createTestSnapshot({ id: "snap-1", timestamp: now }));

			const result = await service.deleteOlderThan(cutoff);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(0);
		});
	});

	describe("Auto Cleanup", () => {
		const now = Date.now();
		const oneDay = 24 * 60 * 60 * 1000;

		beforeEach(() => {
			// Add 15 snapshots with various ages
			for (let i = 0; i < 15; i++) {
				mockManager.addSnapshot(
					createTestSnapshot({
						id: `snap-${i}`,
						timestamp: now - i * oneDay,
						isProtected: i % 5 === 0, // Every 5th is protected
					}),
				);
			}
		});

		it("should not delete when disabled", async () => {
			const config: AutoCleanupConfig = {
				enabled: false,
				olderThanDays: 7,
				keepProtected: true,
				minimumSnapshots: 5,
			};

			const result = await service.autoCleanup(config);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(0);
			expect(mockManager.deleteCalls.length).toBe(0);
		});

		it("should not delete below minimum snapshot count", async () => {
			mockManager.clear();
			// Add only 5 snapshots
			for (let i = 0; i < 5; i++) {
				mockManager.addSnapshot(
					createTestSnapshot({
						id: `snap-${i}`,
						timestamp: now - 30 * oneDay, // All old
					}),
				);
			}

			const config: AutoCleanupConfig = {
				enabled: true,
				olderThanDays: 7,
				keepProtected: true,
				minimumSnapshots: 5,
			};

			const result = await service.autoCleanup(config);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(0);
		});

		it("should delete old snapshots while respecting minimum", async () => {
			const config: AutoCleanupConfig = {
				enabled: true,
				olderThanDays: 5,
				keepProtected: true,
				minimumSnapshots: 10,
			};

			const result = await service.autoCleanup(config);

			expect(result.success).toBe(true);
			// Should delete old snapshots but keep at least 10
			expect(result.deletedCount).toBeLessThanOrEqual(5);
			expect(mockManager.snapshots.size).toBeGreaterThanOrEqual(10);
		});

		it("should skip protected snapshots when keepProtected is true", async () => {
			const config: AutoCleanupConfig = {
				enabled: true,
				olderThanDays: 1,
				keepProtected: true,
				minimumSnapshots: 5,
			};

			const _result = await service.autoCleanup(config);

			// Protected snapshots should not be in unprotect calls if keepProtected is true
			const deletedProtected = mockManager.deleteCalls.filter((id) => {
				const num = Number.parseInt(id.split("-")[1], 10);
				return num % 5 === 0;
			});
			expect(deletedProtected.length).toBe(0);
		});

		it("should delete oldest snapshots first", async () => {
			mockManager.clear();
			// Add snapshots with specific timestamps
			mockManager.addSnapshot(createTestSnapshot({ id: "newest", timestamp: now }));
			mockManager.addSnapshot(createTestSnapshot({ id: "middle", timestamp: now - 10 * oneDay }));
			mockManager.addSnapshot(createTestSnapshot({ id: "oldest", timestamp: now - 20 * oneDay }));

			const config: AutoCleanupConfig = {
				enabled: true,
				olderThanDays: 5,
				keepProtected: true,
				minimumSnapshots: 2,
			};

			const result = await service.autoCleanup(config);

			expect(result.deletedCount).toBe(1);
			expect(mockManager.deleteCalls).toContain("oldest");
			expect(mockManager.deleteCalls).not.toContain("newest");
		});
	});

	describe("canDelete Helper", () => {
		it("should return true for unprotected snapshot", () => {
			const snapshot = createTestSnapshot({ isProtected: false });
			expect(service.canDelete(snapshot)).toBe(true);
		});

		it("should return false for protected snapshot", () => {
			const snapshot = createTestSnapshot({ isProtected: true });
			expect(service.canDelete(snapshot)).toBe(false);
		});
	});

	describe("Performance", () => {
		it("should complete single deletion in under 50ms", async () => {
			const snapshot = createTestSnapshot({ id: "snap-1" });
			mockManager.addSnapshot(snapshot);

			const start = performance.now();
			await service.deleteSnapshot("snap-1", { skipConfirmation: true });
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(50);
		});

		it("should complete bulk deletion of 100 snapshots in under 500ms", async () => {
			const now = Date.now();
			const oneDay = 24 * 60 * 60 * 1000;

			// Add 100 snapshots
			for (let i = 0; i < 100; i++) {
				mockManager.addSnapshot(
					createTestSnapshot({
						id: `snap-${i}`,
						timestamp: now - 30 * oneDay,
					}),
				);
			}

			const start = performance.now();
			await service.deleteOlderThan(now - oneDay);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(500);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty snapshot list for bulk deletion", async () => {
			mockManager.clear();

			const result = await service.deleteOlderThan(Date.now());

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(0);
		});

		it("should handle auto-cleanup with no eligible snapshots", async () => {
			mockManager.clear();
			// Add only new protected snapshots
			for (let i = 0; i < 10; i++) {
				mockManager.addSnapshot(
					createTestSnapshot({
						id: `snap-${i}`,
						timestamp: Date.now(),
						isProtected: true,
					}),
				);
			}

			const config: AutoCleanupConfig = {
				enabled: true,
				olderThanDays: 7,
				keepProtected: true,
				minimumSnapshots: 5,
			};

			const result = await service.autoCleanup(config);

			expect(result.success).toBe(true);
			expect(result.deletedCount).toBe(0);
		});
	});

	describe("Confirmation Dialog", () => {
		it("should pass snapshot name to confirmation dialog", async () => {
			const snapshot = createTestSnapshot({ id: "snap-1", name: "Important Snapshot" });
			mockManager.addSnapshot(snapshot);
			mockConfirmation.setConfirmResult(true);

			await service.deleteSnapshot("snap-1");

			expect(mockConfirmation.confirmCalls[0].message).toContain("Important Snapshot");
		});

		it("should pass detail to confirmation dialog", async () => {
			const snapshot = createTestSnapshot({ id: "snap-1" });
			mockManager.addSnapshot(snapshot);
			mockConfirmation.setConfirmResult(true);

			await service.deleteSnapshot("snap-1");

			expect(mockConfirmation.confirmCalls[0].detail).toBe("This action cannot be undone.");
		});
	});
});
