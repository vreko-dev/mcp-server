/**
 * Privacy Service - Handles GDPR/CCPA data operations
 *
 * Per C-002: All database queries go through service layer
 * Procedures delegate to this service for business logic
 */

import { apiKeys, snapshots, subscriptions } from "@snapback/platform";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/src/services/database";

export interface UserDataSummary {
	snapshotCount: number;
	apiKeyCount: number;
	hasSubscription: boolean;
}

export interface DeletionResult {
	success: boolean;
	deletedAt: string;
	itemsDeleted: {
		snapshots: number;
		apiKeys: number;
	};
	subscriptionCanceled: boolean;
	recoveryPeriod: null;
	message: string;
}

/**
 * Get summary of user's data for deletion confirmation
 */
export async function getUserDataSummary(userId: string): Promise<UserDataSummary> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const [snapshotsResult, apiKeysResult, subscriptionResult] = await Promise.all([
		db.select().from(snapshots).where(eq(snapshots.userId, userId)),
		db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
		db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
	]);

	return {
		snapshotCount: snapshotsResult?.length ?? 0,
		apiKeyCount: apiKeysResult?.length ?? 0,
		hasSubscription: (subscriptionResult?.length ?? 0) > 0,
	};
}

/**
 * Permanently delete all user data (GDPR Article 17 - Right to Erasure)
 */
export async function deleteAllUserData(userId: string): Promise<DeletionResult> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	// Get counts before deletion for confirmation
	const summary = await getUserDataSummary(userId);

	// Perform cascading deletion
	// Note: Database foreign keys with onDelete: 'cascade' will handle related data

	// Delete snapshots (cascades to snapshotFiles via FK)
	await db.delete(snapshots).where(eq(snapshots.userId, userId));

	// Delete API keys (cascades to apiUsage via FK)
	await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

	// Cancel subscription if exists
	let subscriptionCanceled = false;
	if (summary.hasSubscription) {
		await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
		subscriptionCanceled = true;
	}

	return {
		success: true,
		deletedAt: new Date().toISOString(),
		itemsDeleted: {
			snapshots: summary.snapshotCount,
			apiKeys: summary.apiKeyCount,
		},
		subscriptionCanceled,
		recoveryPeriod: null,
		message: "All your data has been permanently deleted. This action cannot be undone.",
	};
}

// ============================================================================
// Export Data Functions
// ============================================================================

export interface ExportedSnapshot {
	id: string;
	fileCount: number | null;
	fileHashes: unknown;
	cloudBackupEnabled: boolean | null;
	riskScore: number | null;
	createdAt: Date;
}

export interface ExportedApiKey {
	id: string;
	name: string | null;
	keyPreview: string;
	permissions: unknown;
	createdAt: Date;
	lastUsed: Date | null;
	expiresAt: Date | null;
}

export interface ExportedSubscription {
	plan: string | null;
	status: string | null;
	billingCycleStart: Date | null;
	billingCycleEnd: Date | null;
	startDate: Date;
}

export interface UserExportData {
	snapshots: ExportedSnapshot[];
	apiKeys: ExportedApiKey[];
	subscription: ExportedSubscription | null;
}

/**
 * Fetch all user data for export (GDPR Article 20 - Right to Data Portability)
 */
export async function getUserExportData(userId: string): Promise<UserExportData> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const [snapshotsResult, apiKeysResult, subscriptionResult] = await Promise.all([
		db.select().from(snapshots).where(eq(snapshots.userId, userId)),
		db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
		db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1),
	]);

	const userSnapshots = snapshotsResult || [];
	const userApiKeys = apiKeysResult || [];
	const userSubscription = subscriptionResult?.[0] ?? null;

	return {
		snapshots: userSnapshots.map((cp) => ({
			id: cp.id,
			fileCount: cp.fileCount,
			fileHashes: cp.fileHashes,
			cloudBackupEnabled: cp.cloudBackupEnabled,
			riskScore: cp.riskScore,
			createdAt: cp.createdAt,
		})),
		apiKeys: userApiKeys.map((key) => ({
			id: key.id,
			name: key.name,
			keyPreview: `${key.key.substring(0, 3)}...${key.key.slice(-3)}`,
			permissions: key.permissions,
			createdAt: key.createdAt,
			lastUsed: key.lastUsedAt,
			expiresAt: key.expiresAt,
		})),
		subscription: userSubscription
			? {
					plan: userSubscription.plan,
					status: userSubscription.status,
					billingCycleStart: userSubscription.currentPeriodStart,
					billingCycleEnd: userSubscription.currentPeriodEnd,
					startDate: userSubscription.createdAt,
				}
			: null,
	};
}

// ============================================================================
// Retention Info Functions
// ============================================================================

export interface SnapshotAgeData {
	newest: Date | null;
	oldest: Date | null;
	total: number;
}

/**
 * Get snapshot age data for retention info
 */
export async function getSnapshotAgeData(userId: string): Promise<SnapshotAgeData> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const userSnapshots = await db
		.select()
		.from(snapshots)
		.where(eq(snapshots.userId, userId))
		.orderBy(desc(snapshots.createdAt));

	const snapshotsList = userSnapshots || [];
	const oldestSnapshot = snapshotsList.length ? snapshotsList[snapshotsList.length - 1] : null;
	const newestSnapshot = snapshotsList.length ? snapshotsList[0] : null;

	return {
		newest: newestSnapshot?.createdAt || null,
		oldest: oldestSnapshot?.createdAt || null,
		total: snapshotsList.length,
	};
}

// ============================================================================
// Preferences Functions
// ============================================================================

export interface PrivacyPreferences {
	cloudBackupDefault: boolean;
	telemetryOptIn: boolean;
	analyticsOptIn: boolean;
	telemetryPreferences: {
		errorReporting: boolean;
		usageAnalytics: boolean;
		performanceMetrics: boolean;
	};
	updatedAt: string;
}

/**
 * Build privacy preferences (no DB update needed currently)
 */
export function buildPrivacyPreferences(input: {
	cloudBackupDefault?: boolean;
	telemetryOptIn?: boolean;
	analyticsOptIn?: boolean;
	telemetryPreferences?: {
		errorReporting?: boolean;
		usageAnalytics?: boolean;
		performanceMetrics?: boolean;
	};
}): PrivacyPreferences {
	return {
		cloudBackupDefault: input.cloudBackupDefault ?? false,
		telemetryOptIn: input.telemetryOptIn ?? true,
		analyticsOptIn: input.analyticsOptIn ?? false,
		telemetryPreferences: {
			errorReporting: input.telemetryPreferences?.errorReporting ?? true,
			usageAnalytics: input.telemetryPreferences?.usageAnalytics ?? false,
			performanceMetrics: input.telemetryPreferences?.performanceMetrics ?? true,
		},
		updatedAt: new Date().toISOString(),
	};
}

// ============================================================================
// Constants
// ============================================================================

export const RETENTION_POLICIES = {
	snapshots: {
		metadataRetention: "Indefinite (user-controlled)",
		contentRetention: "Only if cloudBackupEnabled = true",
		deletionPolicy: "Immediate upon user request",
	},
	telemetry: {
		retentionPeriod: "90 days",
		aggregatedData: "Indefinite (anonymized)",
		deletionPolicy: "Automatic after 90 days",
	},
	apiUsage: {
		retentionPeriod: "12 months for billing",
		deletionPolicy: "After subscription ends + 12 months",
	},
} as const;
