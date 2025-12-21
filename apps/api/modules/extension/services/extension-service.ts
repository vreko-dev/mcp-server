/**
 * Extension Service - Handles extension session database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages extension sessions and API key validation for VS Code extension
 */

import { apiKeys, extensionSessions } from "@snapback/platform";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface ExtensionSessionInput {
	id: string;
	userId: string;
	sessionStart: Date;
	sessionEnd: Date;
	extensionVersion: string;
	vscodeVersion: string;
	platform: string;
	requestsCount: number;
	workspaceHash?: string;
	highestSeverity?: "low" | "medium" | "high" | "critical";
	aiPresent?: boolean;
	issuesByType?: Record<string, number>;
	bytesSaved?: number;
}

export interface ExtensionSessionUpdate {
	sessionEnd: Date;
	requestsCount: number;
	highestSeverity?: "low" | "medium" | "high" | "critical";
	aiPresent?: boolean;
	issuesByType?: Record<string, number>;
	bytesSaved?: number;
}

export type ApiKeyRecord = typeof apiKeys.$inferSelect;

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find an existing extension session by ID and user
 */
export async function findExtensionSession(sessionId: string, userId: string) {
	const db = getDb();
	if (!db) return null;

	return db.query.extensionSessions.findFirst({
		where: and(eq(extensionSessions.id, sessionId), eq(extensionSessions.userId, userId)),
	});
}

/**
 * Update an existing extension session
 */
export async function updateExtensionSession(sessionId: string, data: ExtensionSessionUpdate): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db
		.update(extensionSessions)
		.set({
			sessionEnd: data.sessionEnd,
			requestsCount: data.requestsCount,
			highestSeverity: data.highestSeverity,
			aiPresent: data.aiPresent,
			issuesByType: data.issuesByType,
			bytesSaved: data.bytesSaved,
		})
		.where(eq(extensionSessions.id, sessionId));
}

/**
 * Create a new extension session
 */
export async function createExtensionSessionRecord(data: ExtensionSessionInput): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db.insert(extensionSessions).values({
		id: data.id,
		userId: data.userId,
		apiKeyId: null, // Will be set when API key system is integrated
		sessionStart: data.sessionStart,
		sessionEnd: data.sessionEnd,
		extensionVersion: data.extensionVersion,
		vscodeVersion: data.vscodeVersion,
		platform: data.platform,
		requestsCount: data.requestsCount,
		workspaceHash: data.workspaceHash,
		highestSeverity: data.highestSeverity,
		aiPresent: data.aiPresent,
		issuesByType: data.issuesByType,
		bytesSaved: data.bytesSaved,
	});
}

/**
 * Get all non-revoked API keys for validation
 */
export async function getAllActiveApiKeys(): Promise<ApiKeyRecord[]> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const result = await db.select().from(apiKeys).where(sql`${apiKeys.revokedAt} IS NULL`);
	return result || [];
}

/**
 * Update API key last used timestamp
 */
export async function updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKeyId));
}
