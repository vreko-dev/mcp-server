/**
 * Snapshots Service - Handles snapshot database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages snapshot CRUD operations, usage limits, and file metadata
 */

import { apiKeys, snapshotFiles, snapshots, subscriptions, usageLimits } from "@snapback/platform";
import { and, desc, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export type SnapshotRecord = typeof snapshots.$inferSelect;
export type SnapshotFileRecord = typeof snapshotFiles.$inferSelect;

export interface ListSnapshotsFilter {
	userId: string;
	projectPath?: string;
	workspaceId?: string;
	trigger?: "manual" | "auto" | "pre_command" | "risk_detection";
	page: number;
	pageSize: number;
}

export interface ListSnapshotsResult {
	snapshots: Partial<SnapshotRecord>[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get user's API key
 */
export async function getUserApiKey(userId: string) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
	return result && result.length > 0 ? result[0] : null;
}

/**
 * Count user's snapshots
 */
export async function countUserSnapshots(userId: string): Promise<number> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(snapshots)
		.where(eq(snapshots.userId, userId));

	return result[0]?.count || 0;
}

/**
 * Get user's subscription
 */
export async function getUserSubscription(userId: string) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
	return result && result.length > 0 ? result[0] : null;
}

/**
 * Get usage for subscription in current month
 */
export async function getMonthlyUsage(subscriptionId: string, monthStart: Date, monthEnd: Date) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db
		.select()
		.from(usageLimits)
		.where(
			and(
				eq(usageLimits.subscriptionId, subscriptionId),
				gte(usageLimits.month, monthStart),
				lte(usageLimits.month, monthEnd),
			),
		)
		.limit(1);

	return result && result.length > 0 ? result[0] : null;
}

/**
 * List user snapshots with pagination and filters
 */
export async function listUserSnapshots(filter: ListSnapshotsFilter): Promise<ListSnapshotsResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const { userId, projectPath, workspaceId, trigger, page, pageSize } = filter;
	const offset = (page - 1) * pageSize;

	// Build where conditions
	const whereConditions: SQL[] = [eq(snapshots.userId, userId)];

	if (projectPath) {
		whereConditions.push(eq(snapshots.projectPath, projectPath));
	}

	if (workspaceId) {
		whereConditions.push(eq(snapshots.workspaceId, workspaceId));
	}

	if (trigger) {
		whereConditions.push(eq(snapshots.trigger, trigger));
	}

	// Fetch snapshots (most recent first)
	const userSnapshots = await db
		.select({
			id: snapshots.id,
			name: snapshots.name,
			description: snapshots.description,
			trigger: snapshots.trigger,
			fileCount: snapshots.fileCount,
			totalSizeBytes: snapshots.totalSizeBytes,
			gitBranch: snapshots.gitBranch,
			gitCommit: snapshots.gitCommit,
			gitDirty: snapshots.gitDirty,
			riskScore: snapshots.riskScore,
			projectPath: snapshots.projectPath,
			workspaceId: snapshots.workspaceId,
			cloudBackupEnabled: snapshots.cloudBackupEnabled,
			createdAt: snapshots.createdAt,
		})
		.from(snapshots)
		.where(and(...whereConditions))
		.orderBy(desc(snapshots.createdAt))
		.limit(pageSize)
		.offset(offset);

	// Get total count for pagination
	const totalCountResult = await db
		.select({
			count: snapshots.id,
		})
		.from(snapshots)
		.where(and(...whereConditions));

	const totalCount = totalCountResult && totalCountResult.length > 0 ? totalCountResult[0] : null;
	const total = Number(totalCount?.count || 0);
	const totalPages = Math.ceil(total / pageSize);

	return {
		snapshots: userSnapshots,
		pagination: {
			page,
			pageSize,
			total,
			totalPages,
			hasMore: page < totalPages,
		},
	};
}

/**
 * Get snapshot by ID for a user
 */
export async function getSnapshotById(snapshotId: string, userId: string) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db
		.select()
		.from(snapshots)
		.where(and(eq(snapshots.id, snapshotId), eq(snapshots.userId, userId)))
		.limit(1);

	return result && result.length > 0 ? result[0] : null;
}

/**
 * Get snapshot files
 */
export async function getSnapshotFiles(snapshotId: string): Promise<SnapshotFileRecord[]> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	return db.select().from(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId));
}

/**
 * Delete snapshot and its files
 */
export async function deleteSnapshotAndFiles(snapshotId: string, userId: string): Promise<boolean> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Verify ownership
	const snapshot = await getSnapshotById(snapshotId, userId);
	if (!snapshot) {
		return false;
	}

	// Delete files first (foreign key)
	await db.delete(snapshotFiles).where(eq(snapshotFiles.snapshotId, snapshotId));

	// Delete snapshot
	await db.delete(snapshots).where(eq(snapshots.id, snapshotId));

	return true;
}

/**
 * Update usage limits
 */
export async function incrementSnapshotUsage(usageId: string, currentCount: number): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db
		.update(usageLimits)
		.set({
			snapshotsUsed: currentCount + 1,
		})
		.where(eq(usageLimits.id, usageId));
}

/**
 * Create initial usage record
 */
export async function createInitialUsage(
	subscriptionId: string,
	monthStart: Date,
	snapshotsLimit?: number,
): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db.insert(usageLimits).values({
		subscriptionId,
		month: monthStart,
		snapshotsUsed: 1,
		snapshotsLimit,
	});
}

/**
 * Decrement snapshot usage
 */
export async function decrementSnapshotUsage(usageId: string, currentCount: number): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db
		.update(usageLimits)
		.set({
			snapshotsUsed: Math.max(0, currentCount - 1),
		})
		.where(eq(usageLimits.id, usageId));
}
