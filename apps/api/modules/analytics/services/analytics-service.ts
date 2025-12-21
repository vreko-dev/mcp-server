/**
 * Analytics Service - Handles analytics database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages telemetry data: suggestions, outcomes, loops, feedback, policy evaluations
 */

import {
	agentSuggestions,
	apiKeyUsage,
	feedback,
	loops,
	policyEvaluations,
	postAcceptOutcomes,
	telemetryEvents,
} from "@snapback/platform";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface DateRangeFilter {
	startDate: Date;
	endDate: Date;
	userId?: string;
}

export interface ApiKeyUsageFilter {
	apiKeyId?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

export interface TelemetryEventInsert {
	eventType: string;
	userId: string;
	apiKeyId?: string;
	sessionId?: string;
	properties: Record<string, unknown>;
	timestamp: Date;
}

export interface AnalyticsMetricsResult {
	totalSuggestions: number;
	acceptedSuggestions: number;
	dismissedSuggestions: number;
	policyViolations: number;
	totalLoops: number;
	successfulLoops: number;
	feedbackCount: number;
	avgTimeToEditMs?: number;
	avgTimeToSubmitMs?: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get agent suggestions within date range
 */
export async function getSuggestions(filter: DateRangeFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [
		gte(agentSuggestions.timestamp, filter.startDate),
		lte(agentSuggestions.timestamp, filter.endDate),
	];

	if (filter.userId) {
		conditions.push(eq(agentSuggestions.userId, filter.userId));
	}

	return db
		.select()
		.from(agentSuggestions)
		.where(and(...conditions))
		.execute();
}

/**
 * Get post-accept outcomes within date range
 */
export async function getOutcomes(filter: DateRangeFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [
		gte(postAcceptOutcomes.timestamp, filter.startDate),
		lte(postAcceptOutcomes.timestamp, filter.endDate),
	];

	if (filter.userId) {
		conditions.push(eq(postAcceptOutcomes.userId, filter.userId));
	}

	return db
		.select()
		.from(postAcceptOutcomes)
		.where(and(...conditions))
		.execute();
}

/**
 * Get policy evaluations within date range
 */
export async function getPolicyEvaluations(filter: DateRangeFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [
		gte(policyEvaluations.timestamp, filter.startDate),
		lte(policyEvaluations.timestamp, filter.endDate),
	];

	if (filter.userId) {
		conditions.push(eq(policyEvaluations.userId, filter.userId));
	}

	return db
		.select()
		.from(policyEvaluations)
		.where(and(...conditions))
		.execute();
}

/**
 * Get loops within date range
 */
export async function getLoops(filter: DateRangeFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [gte(loops.timestamp, filter.startDate), lte(loops.timestamp, filter.endDate)];

	if (filter.userId) {
		conditions.push(eq(loops.userId, filter.userId));
	}

	return db
		.select()
		.from(loops)
		.where(and(...conditions))
		.execute();
}

/**
 * Get feedback within date range
 */
export async function getFeedback(filter: DateRangeFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [gte(feedback.timestamp, filter.startDate), lte(feedback.timestamp, filter.endDate)];

	if (filter.userId) {
		conditions.push(eq(feedback.userId, filter.userId));
	}

	return db
		.select()
		.from(feedback)
		.where(and(...conditions))
		.execute();
}

/**
 * Calculate aggregated analytics metrics
 */
export async function calculateAnalyticsMetrics(filter: DateRangeFilter): Promise<AnalyticsMetricsResult> {
	// Parallel fetch all data
	const [suggestions, outcomes, policies, loopData, feedbackData] = await Promise.all([
		getSuggestions(filter),
		getOutcomes(filter),
		getPolicyEvaluations(filter),
		getLoops(filter),
		getFeedback(filter),
	]);

	// Calculate metrics
	const totalSuggestions = suggestions.length;
	const acceptedSuggestions = suggestions.filter((s) => s.accepted === true).length;
	const dismissedSuggestions = suggestions.filter((s) => s.dismissed === true).length;
	const policyViolations = policies.filter((p) => p.evaluationResult === "fail").length;
	const totalLoops = loopData.length;
	const successfulLoops = loopData.filter((l) => l.success === true).length;
	const feedbackCount = feedbackData.length;

	// Calculate average times if we have outcomes data
	let avgTimeToEditMs: number | undefined;
	let avgTimeToSubmitMs: number | undefined;

	if (outcomes.length > 0) {
		const totalEditTime = outcomes.reduce(
			(sum: number, outcome: { timeToEditMs: number | null }) => sum + (outcome.timeToEditMs || 0),
			0,
		);
		const totalSubmitTime = outcomes.reduce(
			(sum: number, outcome: { timeToSubmitMs: number | null }) => sum + (outcome.timeToSubmitMs || 0),
			0,
		);
		avgTimeToEditMs = totalEditTime / outcomes.length;
		avgTimeToSubmitMs = totalSubmitTime / outcomes.length;
	}

	return {
		totalSuggestions,
		acceptedSuggestions,
		dismissedSuggestions,
		policyViolations,
		totalLoops,
		successfulLoops,
		feedbackCount,
		avgTimeToEditMs,
		avgTimeToSubmitMs,
	};
}

/**
 * Get API key usage with optional filtering
 */
export async function getApiKeyUsageData(filter: ApiKeyUsageFilter) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (filter.apiKeyId) {
		conditions.push(eq(apiKeyUsage.apiKeyId, filter.apiKeyId));
	}

	if (filter.startDate && filter.endDate) {
		conditions.push(gte(apiKeyUsage.timestamp, filter.startDate));
		conditions.push(lte(apiKeyUsage.timestamp, filter.endDate));
	}

	let query = db.select().from(apiKeyUsage).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(apiKeyUsage.timestamp));

	if (filter.limit) {
		query = query.limit(filter.limit);
	}

	if (filter.offset) {
		query = query.offset(filter.offset);
	}

	return query.execute();
}

/**
 * Insert telemetry events
 */
export async function insertTelemetryEvents(events: TelemetryEventInsert[]): Promise<{ id: string }[]> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	return db.insert(telemetryEvents).values(events).returning({ id: telemetryEvents.id });
}
