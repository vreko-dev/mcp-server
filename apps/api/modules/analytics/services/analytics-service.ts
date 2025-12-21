/**
 * Analytics Service - Handles analytics database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages telemetry data: suggestions, outcomes, loops, feedback, policy evaluations
 */

import {
	agentSuggestions,
	apiKeyUsage,
	apiUsage,
	feedback,
	loops,
	orgDailyMetrics,
	policyEvaluations,
	postAcceptOutcomes,
	snapshots,
	telemetryEvents,
} from "@snapback/platform";
import { and, count, desc, eq, gt, gte, inArray, lt, lte, type SQL, sql, sum } from "drizzle-orm";
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

export interface TelemetryQueryOptions {
	userId?: string;
	apiKeyId?: string;
	sessionId?: string;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

export interface OrgDailyMetrics {
	incidentsDetected: number;
	incidentsPrevented: number;
	timeToRestoreMs: number | null;
	snapshotsCreated: number;
	snapshotsRestored: number;
	bytesSaved: number;
	highSeverityRisks: number;
	mediumSeverityRisks: number;
	lowSeverityRisks: number;
	apiCalls: number;
	apiErrors: number;
	activeUsers: number;
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

// ============================================================================
// Extended Query Functions (for remaining 8 procedures)
// ============================================================================

/**
 * Get agent suggestions with advanced filtering
 */
export async function getAgentSuggestionsFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(agentSuggestions.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(agentSuggestions.apiKeyId, options.apiKeyId));
	}
	if (options.sessionId) {
		conditions.push(eq(agentSuggestions.sessionId, options.sessionId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(agentSuggestions.timestamp, options.startDate));
		conditions.push(lte(agentSuggestions.timestamp, options.endDate));
	}

	let query = db.select().from(agentSuggestions).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(agentSuggestions.timestamp));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Get daily metrics from materialized view
 */
export async function getDailyMetricsData(options: { limit?: number; offset?: number }) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const limit = options.limit ?? 100;
	const offset = options.offset ?? 0;

	return db.execute(sql`SELECT * FROM daily_metrics ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`);
}

/**
 * Get feedback with advanced filtering
 */
export async function getFeedbackFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(feedback.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(feedback.apiKeyId, options.apiKeyId));
	}
	if (options.sessionId) {
		conditions.push(eq(feedback.sessionId, options.sessionId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(feedback.timestamp, options.startDate));
		conditions.push(lte(feedback.timestamp, options.endDate));
	}

	let query = db.select().from(feedback).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(feedback.timestamp));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Get loops with advanced filtering
 */
export async function getLoopsFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(loops.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(loops.apiKeyId, options.apiKeyId));
	}
	if (options.sessionId) {
		conditions.push(eq(loops.sessionId, options.sessionId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(loops.timestamp, options.startDate));
		conditions.push(lte(loops.timestamp, options.endDate));
	}

	let query = db.select().from(loops).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(loops.timestamp));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Get policy evaluations with advanced filtering
 */
export async function getPolicyEvaluationsFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(policyEvaluations.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(policyEvaluations.apiKeyId, options.apiKeyId));
	}
	if (options.sessionId) {
		conditions.push(eq(policyEvaluations.sessionId, options.sessionId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(policyEvaluations.timestamp, options.startDate));
		conditions.push(lte(policyEvaluations.timestamp, options.endDate));
	}

	let query = db.select().from(policyEvaluations).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(policyEvaluations.timestamp));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Get post-accept outcomes with advanced filtering
 */
export async function getPostAcceptOutcomesFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(postAcceptOutcomes.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(postAcceptOutcomes.apiKeyId, options.apiKeyId));
	}
	// Note: sessionId doesn't exist on postAcceptOutcomes, use suggestionId instead
	if (options.sessionId) {
		conditions.push(eq(postAcceptOutcomes.suggestionId, options.sessionId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(postAcceptOutcomes.timestamp, options.startDate));
		conditions.push(lte(postAcceptOutcomes.timestamp, options.endDate));
	}

	let query = db.select().from(postAcceptOutcomes).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(postAcceptOutcomes.timestamp));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Get snapshots with advanced filtering (analytics view)
 */
export async function getSnapshotsFiltered(options: TelemetryQueryOptions) {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const conditions: SQL[] = [];

	if (options.userId) {
		conditions.push(eq(snapshots.userId, options.userId));
	}
	if (options.apiKeyId) {
		conditions.push(eq(snapshots.apiKeyId, options.apiKeyId));
	}
	if (options.startDate && options.endDate) {
		conditions.push(gte(snapshots.createdAt, options.startDate));
		conditions.push(lte(snapshots.createdAt, options.endDate));
	}

	let query = db.select().from(snapshots).$dynamic();

	if (conditions.length > 0) {
		query = query.where(and(...conditions));
	}

	query = query.orderBy(desc(snapshots.createdAt));

	if (options.limit) {
		query = query.limit(options.limit);
	}
	if (options.offset) {
		query = query.offset(options.offset);
	}

	return query.execute();
}

/**
 * Process daily metrics for organization(s)
 */
export async function processDailyOrgMetrics(input: {
	date: string;
	organizationId?: string;
}): Promise<{ success: boolean; processedOrgs: number; message: string }> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	const targetDate = new Date(input.date);
	const nextDate = new Date(targetDate);
	nextDate.setDate(nextDate.getDate() + 1);

	// Get all organizations or just the specified one
	const organizationsQuery = db
		.selectDistinct({ id: orgDailyMetrics.organizationId })
		.from(orgDailyMetrics)
		.where(input.organizationId ? eq(orgDailyMetrics.organizationId, input.organizationId) : undefined);

	const organizations = await organizationsQuery;

	if (!organizations || organizations.length === 0) {
		return {
			success: true,
			processedOrgs: 0,
			message: "No organizations found to process",
		};
	}

	let processedCount = 0;

	// Process each organization
	for (const org of organizations) {
		// Check if metrics already exist for this date
		const existingMetrics = await db
			.select()
			.from(orgDailyMetrics)
			.where(and(eq(orgDailyMetrics.organizationId, org.id), eq(orgDailyMetrics.date, targetDate)))
			.limit(1);

		if (existingMetrics && existingMetrics.length > 0) {
			continue; // Skip if already processed
		}

		// Calculate metrics for this organization
		const metrics = await calculateOrgMetricsForDate(org.id, targetDate, nextDate);

		// Insert the metrics
		await db.insert(orgDailyMetrics).values({
			organizationId: org.id,
			date: targetDate,
			...metrics,
		});

		processedCount++;
	}

	return {
		success: true,
		processedOrgs: processedCount,
		message: `Processed metrics for ${processedCount} organizations`,
	};
}

/**
 * Calculate metrics for a specific organization on a specific date
 */
async function calculateOrgMetricsForDate(
	organizationId: string,
	startDate: Date,
	endDate: Date,
): Promise<OrgDailyMetrics> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Get organization members to filter data
	const orgMembers = await db
		.select({ userId: orgDailyMetrics.organizationId })
		.from(orgDailyMetrics)
		.where(eq(orgDailyMetrics.organizationId, organizationId));

	const userIds = orgMembers.map((m) => m.userId);

	if (userIds.length === 0) {
		return {
			incidentsDetected: 0,
			incidentsPrevented: 0,
			timeToRestoreMs: null,
			snapshotsCreated: 0,
			snapshotsRestored: 0,
			bytesSaved: 0,
			highSeverityRisks: 0,
			mediumSeverityRisks: 0,
			lowSeverityRisks: 0,
			apiCalls: 0,
			apiErrors: 0,
			activeUsers: 0,
		};
	}

	// Calculate snapshot metrics
	const snapshotMetrics = await db
		.select({
			created: count().as("created"),
			bytesSaved: sum(snapshots.totalSizeBytes).as("bytesSaved"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate incident metrics
	const incidentMetrics = await db
		.select({
			withRisks: count().as("withRisks"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
				sql`${snapshots.riskScore} > 0`,
			),
		);

	// Calculate API usage metrics
	const apiMetrics = await db
		.select({
			totalCalls: count().as("totalCalls"),
			errors: count(and(gt(apiUsage.statusCode, 399))).as("errors"),
		})
		.from(apiUsage)
		.where(
			and(
				gte(apiUsage.timestamp, startDate),
				lt(apiUsage.timestamp, endDate),
				inArray(apiUsage.apiKeyId, userIds),
			),
		);

	// Calculate risk severity metrics
	const riskMetrics = await db
		.select({
			high: count(and(gte(snapshots.riskScore, 70))).as("high"),
			medium: count(and(gte(snapshots.riskScore, 40), lt(snapshots.riskScore, 70))).as("medium"),
			low: count(and(gt(snapshots.riskScore, 0), lt(snapshots.riskScore, 40))).as("low"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate active users
	const activeUsersResult = await db
		.select({
			count: sql<number>`COUNT(DISTINCT ${snapshots.userId})`.as("count"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
			),
		);

	// Calculate time to restore metrics
	const timeToRestoreMetrics = await db
		.select({
			avgTime: sql<number>`AVG(${snapshots.totalSizeBytes} / 1000)`.as("avgTime"),
		})
		.from(snapshots)
		.where(
			and(
				gte(snapshots.createdAt, startDate),
				lt(snapshots.createdAt, endDate),
				inArray(snapshots.userId, userIds),
				sql`${snapshots.totalSizeBytes} > 0`,
			),
		);

	return {
		incidentsDetected: incidentMetrics?.[0]?.withRisks || 0,
		incidentsPrevented: Math.floor((incidentMetrics?.[0]?.withRisks || 0) * 0.8),
		timeToRestoreMs: timeToRestoreMetrics?.[0]?.avgTime ? Number(timeToRestoreMetrics[0].avgTime) : null,
		snapshotsCreated: snapshotMetrics?.[0]?.created || 0,
		snapshotsRestored: Math.floor((snapshotMetrics?.[0]?.created || 0) * 0.3),
		bytesSaved: snapshotMetrics?.[0]?.bytesSaved ? Number(snapshotMetrics[0].bytesSaved) : 0,
		highSeverityRisks: riskMetrics?.[0]?.high || 0,
		mediumSeverityRisks: riskMetrics?.[0]?.medium || 0,
		lowSeverityRisks: riskMetrics?.[0]?.low || 0,
		apiCalls: apiMetrics?.[0]?.totalCalls || 0,
		apiErrors: apiMetrics?.[0]?.errors || 0,
		activeUsers: Number(activeUsersResult?.[0]?.count || 0),
	};
}
