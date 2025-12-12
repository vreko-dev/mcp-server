// Removed circular dependency - redaction functions moved inline
// TODO: Move to @snapback/contracts/utils/redaction.ts for proper sharing

/**
 * Redact string values (simple placeholder)
 * Replace with actual implementation from @snapback/contracts
 */
function redactString(value: string): string {
	return value.replace(/./g, "*");
}

/**
 * Redact object values (simple placeholder)
 * Replace with actual implementation from @snapback/contracts
 */
function redactObject(obj: any): any {
	if (!obj || typeof obj !== "object") {
		return obj;
	}
	const redacted: any = Array.isArray(obj) ? [] : {};
	for (const key in obj) {
		if (typeof obj[key] === "string") {
			redacted[key] = redactString(obj[key]);
		} else if (typeof obj[key] === "object") {
			redacted[key] = redactObject(obj[key]);
		} else {
			redacted[key] = obj[key];
		}
	}
	return redacted;
}

import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { agentSuggestions } from "../schema/postgres";
import { feedback, loops, policyEvaluations, postAcceptOutcomes, quarantineEvents } from "../schema/snapback/index";

/**
 * Slow query threshold (200ms) for performance monitoring
 */
const SLOW_MS = 200;

export interface TelemetryEvent {
	requestId: string;
	userId: string;
	apiKeyId: string;
	sessionId?: string;
	timestamp: Date;
}

export interface AgentSuggestionEvent extends TelemetryEvent {
	suggestionId: string;
	suggestionText: string;
	suggestionType: string;
	filePath?: string;
	lineStart?: number;
	lineEnd?: number;
	characterStart?: number;
	characterEnd?: number;
	accepted: boolean;
	dismissed: boolean;
}

export interface PostAcceptOutcomeEvent extends TelemetryEvent {
	suggestionId: string;
	editsMade: any[];
	timeToEditMs?: number;
	timeToSubmitMs?: number;
	userFeedback?: string;
}

export interface PolicyEvaluationEvent extends TelemetryEvent {
	policyName: string;
	policyVersion?: string;
	evaluationResult: string;
	violations: any[];
	remediationSteps: any[];
}

export interface LoopEvent extends TelemetryEvent {
	loopType: string;
	iterationCount: number;
	durationMs?: number;
	success: boolean;
	errorMessage?: string;
}

export interface FeedbackEvent extends TelemetryEvent {
	feedbackType: string;
	feedbackText?: string;
	rating?: number;
	metadata: any;
}

/**
 * Apply redaction to event fields
 */
function applyRedaction(event: any): any {
	const redacted = { ...event };

	// Redact string fields
	for (const key of ["suggestionText", "filePath", "userFeedback", "errorMessage", "feedbackText"]) {
		if (key in redacted && redacted[key]) {
			redacted[key] = redactString(String(redacted[key]));
		}
	}

	// Deep redact object fields
	if ("violations" in redacted && redacted.violations) {
		redacted.violations = redactObject(redacted.violations);
	}
	if ("remediationSteps" in redacted && redacted.remediationSteps) {
		redacted.remediationSteps = redactObject(redacted.remediationSteps);
	}

	return redacted;
}

/**
 * Log slow query if duration exceeds threshold
 */
function logSlowQuery(operationName: string, durationMs: number): void {
	if (durationMs > SLOW_MS) {
		console.warn(`Slow query detected: ${operationName} took ${durationMs}ms (threshold: ${SLOW_MS}ms)`);
	}
}

export class TelemetrySinkDb {
	constructor(private db: NodePgDatabase<any>) {}

	/**
	 * Insert agent suggestion event with idempotency check
	 */
	async insertAgentSuggestion(event: AgentSuggestionEvent): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if event already exists (idempotency)
			const existing = await this.db
				.select()
				.from(agentSuggestions)
				.where(eq(agentSuggestions.requestId, event.requestId))
				.limit(1);

			if (existing.length > 0) {
				// Event already exists, no-op
				return;
			}

			// Apply redaction before insert
			const redacted = applyRedaction(event);

			// Insert new event
			await this.db.insert(agentSuggestions).values({
				id: crypto.randomUUID(),
				userId: redacted.userId,
				apiKeyId: redacted.apiKeyId,
				sessionId: redacted.sessionId,
				requestId: redacted.requestId,
				suggestionId: redacted.suggestionId,
				suggestionText: redacted.suggestionText,
				suggestionType: redacted.suggestionType,
				filePath: redacted.filePath,
				lineStart: redacted.lineStart,
				lineEnd: redacted.lineEnd,
				characterStart: redacted.characterStart,
				characterEnd: redacted.characterEnd,
				accepted: redacted.accepted,
				dismissed: redacted.dismissed,
				timestamp: redacted.timestamp,
				createdAt: new Date(),
			});

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery("insertAgentSuggestion", duration);
		} catch (error) {
			// Quarantine failed event
			await this.db.insert(quarantineEvents).values({
				id: crypto.randomUUID(),
				userId: event.userId,
				apiKeyId: event.apiKeyId,
				originalEvent: event as any,
				errorReason: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				attemptedAt: new Date(),
				createdAt: new Date(),
			});

			// Log the error
			console.error("Failed to insert agent suggestion", {
				requestId: event.requestId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - event was quarantined for later replay
		}
	}

	/**
	 * Insert post-accept outcome event with idempotency check
	 */
	async insertPostAcceptOutcome(event: PostAcceptOutcomeEvent): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if event already exists (idempotency)
			const existing = await this.db
				.select()
				.from(postAcceptOutcomes)
				.where(eq(postAcceptOutcomes.suggestionId, event.suggestionId))
				.limit(1);

			if (existing.length > 0) {
				// Event already exists, no-op
				return;
			}

			// Apply redaction before insert
			const redacted = applyRedaction(event);

			// Insert new event
			await this.db.insert(postAcceptOutcomes).values({
				id: crypto.randomUUID(),
				userId: redacted.userId,
				apiKeyId: redacted.apiKeyId,
				suggestionId: redacted.suggestionId,
				editsMade: redacted.editsMade,
				timeToEditMs: redacted.timeToEditMs,
				timeToSubmitMs: redacted.timeToSubmitMs,
				userFeedback: redacted.userFeedback,
				timestamp: redacted.timestamp,
				createdAt: new Date(),
			});

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery("insertPostAcceptOutcome", duration);
		} catch (error) {
			// Quarantine failed event
			await this.db.insert(quarantineEvents).values({
				id: crypto.randomUUID(),
				userId: event.userId,
				apiKeyId: event.apiKeyId,
				originalEvent: event as any,
				errorReason: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				attemptedAt: new Date(),
				createdAt: new Date(),
			});

			console.error("Failed to insert post-accept outcome", {
				suggestionId: event.suggestionId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - event was quarantined for later replay
		}
	}

	/**
	 * Insert policy evaluation event with idempotency check
	 */
	async insertPolicyEvaluation(event: PolicyEvaluationEvent): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if event already exists (idempotency)
			const existing = await this.db
				.select()
				.from(policyEvaluations)
				.where(eq(policyEvaluations.requestId, event.requestId))
				.limit(1);

			if (existing.length > 0) {
				// Event already exists, no-op
				return;
			}

			// Apply redaction before insert
			const redacted = applyRedaction(event);

			// Insert new event
			await this.db.insert(policyEvaluations).values({
				id: crypto.randomUUID(),
				userId: redacted.userId,
				apiKeyId: redacted.apiKeyId,
				sessionId: redacted.sessionId,
				requestId: redacted.requestId,
				policyName: redacted.policyName,
				policyVersion: redacted.policyVersion,
				evaluationResult: redacted.evaluationResult,
				violations: redacted.violations,
				remediationSteps: redacted.remediationSteps,
				timestamp: redacted.timestamp,
				createdAt: new Date(),
			});

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery("insertPolicyEvaluation", duration);
		} catch (error) {
			// Quarantine failed event
			await this.db.insert(quarantineEvents).values({
				id: crypto.randomUUID(),
				userId: event.userId,
				apiKeyId: event.apiKeyId,
				originalEvent: event as any,
				errorReason: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				attemptedAt: new Date(),
				createdAt: new Date(),
			});

			console.error("Failed to insert policy evaluation", {
				requestId: event.requestId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - event was quarantined for later replay
		}
	}

	/**
	 * Insert loop event with idempotency check
	 */
	async insertLoop(event: LoopEvent): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if event already exists (idempotency)
			const existing = await this.db.select().from(loops).where(eq(loops.requestId, event.requestId)).limit(1);

			if (existing.length > 0) {
				// Event already exists, no-op
				return;
			}

			// Apply redaction before insert
			const redacted = applyRedaction(event);

			// Insert new event
			await this.db.insert(loops).values({
				id: crypto.randomUUID(),
				userId: redacted.userId,
				apiKeyId: redacted.apiKeyId,
				sessionId: redacted.sessionId,
				requestId: redacted.requestId,
				loopType: redacted.loopType,
				iterationCount: redacted.iterationCount,
				durationMs: redacted.durationMs,
				success: redacted.success,
				errorMessage: redacted.errorMessage,
				timestamp: redacted.timestamp,
				createdAt: new Date(),
			});

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery("insertLoop", duration);
		} catch (error) {
			// Quarantine failed event
			await this.db.insert(quarantineEvents).values({
				id: crypto.randomUUID(),
				userId: event.userId,
				apiKeyId: event.apiKeyId,
				originalEvent: event as any,
				errorReason: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				attemptedAt: new Date(),
				createdAt: new Date(),
			});

			console.error("Failed to insert loop", {
				requestId: event.requestId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - event was quarantined for later replay
		}
	}

	/**
	 * Insert feedback event with idempotency check
	 */
	async insertFeedback(event: FeedbackEvent): Promise<void> {
		const startTime = Date.now();

		try {
			// Check if event already exists (idempotency)
			const existing = await this.db
				.select()
				.from(feedback)
				.where(eq(feedback.requestId, event.requestId))
				.limit(1);

			if (existing.length > 0) {
				// Event already exists, no-op
				return;
			}

			// Apply redaction before insert
			const redacted = applyRedaction(event);

			// Insert new event
			await this.db.insert(feedback).values({
				id: crypto.randomUUID(),
				userId: redacted.userId,
				apiKeyId: redacted.apiKeyId,
				sessionId: redacted.sessionId,
				requestId: redacted.requestId,
				feedbackType: redacted.feedbackType,
				feedbackText: redacted.feedbackText,
				rating: redacted.rating,
				metadata: redacted.metadata,
				timestamp: redacted.timestamp,
				createdAt: new Date(),
			});

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery("insertFeedback", duration);
		} catch (error) {
			// Quarantine failed event
			await this.db.insert(quarantineEvents).values({
				id: crypto.randomUUID(),
				userId: event.userId,
				apiKeyId: event.apiKeyId,
				originalEvent: event as any,
				errorReason: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				attemptedAt: new Date(),
				createdAt: new Date(),
			});

			console.error("Failed to insert feedback", {
				requestId: event.requestId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - event was quarantined for later replay
		}
	}

	/**
	 * Batch insert agent suggestions
	 */
	async batchInsertAgentSuggestions(events: AgentSuggestionEvent[]): Promise<void> {
		const startTime = Date.now();

		if (events.length === 0) {
			return;
		}

		try {
			const values = events.map((event) => {
				const redacted = applyRedaction(event);
				return {
					id: crypto.randomUUID(),
					userId: redacted.userId,
					apiKeyId: redacted.apiKeyId,
					sessionId: redacted.sessionId,
					requestId: redacted.requestId,
					suggestionId: redacted.suggestionId,
					suggestionText: redacted.suggestionText,
					suggestionType: redacted.suggestionType,
					filePath: redacted.filePath,
					lineStart: redacted.lineStart,
					lineEnd: redacted.lineEnd,
					characterStart: redacted.characterStart,
					characterEnd: redacted.characterEnd,
					accepted: redacted.accepted,
					dismissed: redacted.dismissed,
					timestamp: redacted.timestamp,
					createdAt: new Date(),
				};
			});

			await this.db.insert(agentSuggestions).values(values);

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery(`batchInsertAgentSuggestions(${events.length} items)`, duration);
		} catch (error) {
			// Quarantine all events that failed
			for (const event of events) {
				await this.db.insert(quarantineEvents).values({
					id: crypto.randomUUID(),
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					originalEvent: event as any,
					errorReason: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined,
					attemptedAt: new Date(),
					createdAt: new Date(),
				});
			}

			console.error("Failed to batch insert agent suggestions", {
				count: events.length,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - events were quarantined for later replay
		}
	}

	/**
	 * Batch insert policy evaluations
	 */
	async batchInsertPolicyEvaluations(events: PolicyEvaluationEvent[]): Promise<void> {
		const startTime = Date.now();

		if (events.length === 0) {
			return;
		}

		try {
			const values = events.map((event) => {
				const redacted = applyRedaction(event);
				return {
					id: crypto.randomUUID(),
					userId: redacted.userId,
					apiKeyId: redacted.apiKeyId,
					sessionId: redacted.sessionId,
					requestId: redacted.requestId,
					policyName: redacted.policyName,
					policyVersion: redacted.policyVersion,
					evaluationResult: redacted.evaluationResult,
					violations: redacted.violations,
					remediationSteps: redacted.remediationSteps,
					timestamp: redacted.timestamp,
					createdAt: new Date(),
				};
			});

			await this.db.insert(policyEvaluations).values(values);

			// Log slow query if applicable
			const duration = Date.now() - startTime;
			logSlowQuery(`batchInsertPolicyEvaluations(${events.length} items)`, duration);
		} catch (error) {
			// Quarantine all events that failed
			for (const event of events) {
				await this.db.insert(quarantineEvents).values({
					id: crypto.randomUUID(),
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					originalEvent: event as any,
					errorReason: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined,
					attemptedAt: new Date(),
					createdAt: new Date(),
				});
			}

			console.error("Failed to batch insert policy evaluations", {
				count: events.length,
				error: error instanceof Error ? error.message : String(error),
			});

			// Do not re-throw - events were quarantined for later replay
		}
	}
}
