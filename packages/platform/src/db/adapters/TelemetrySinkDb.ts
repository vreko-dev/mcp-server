import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { agentSuggestions, feedback, loops, policyEvaluations, postAcceptOutcomes } from "../schema/snapback/index.js";

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

export class TelemetrySinkDb {
	constructor(private db: NodePgDatabase<any>) {}

	/**
	 * Insert agent suggestion event with idempotency check
	 */
	async insertAgentSuggestion(event: AgentSuggestionEvent): Promise<void> {
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

		// Insert new event
		await this.db.insert(agentSuggestions).values({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			suggestionId: event.suggestionId,
			suggestionText: event.suggestionText,
			suggestionType: event.suggestionType,
			filePath: event.filePath,
			lineStart: event.lineStart,
			lineEnd: event.lineEnd,
			characterStart: event.characterStart,
			characterEnd: event.characterEnd,
			accepted: event.accepted,
			dismissed: event.dismissed,
			timestamp: event.timestamp,
			createdAt: new Date(),
		});
	}

	/**
	 * Insert post-accept outcome event with idempotency check
	 */
	async insertPostAcceptOutcome(event: PostAcceptOutcomeEvent): Promise<void> {
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

		// Insert new event
		await this.db.insert(postAcceptOutcomes).values({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			suggestionId: event.suggestionId,
			editsMade: event.editsMade,
			timeToEditMs: event.timeToEditMs,
			timeToSubmitMs: event.timeToSubmitMs,
			userFeedback: event.userFeedback,
			timestamp: event.timestamp,
			createdAt: new Date(),
		});
	}

	/**
	 * Insert policy evaluation event with idempotency check
	 */
	async insertPolicyEvaluation(event: PolicyEvaluationEvent): Promise<void> {
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

		// Insert new event
		await this.db.insert(policyEvaluations).values({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			policyName: event.policyName,
			policyVersion: event.policyVersion,
			evaluationResult: event.evaluationResult,
			violations: event.violations,
			remediationSteps: event.remediationSteps,
			timestamp: event.timestamp,
			createdAt: new Date(),
		});
	}

	/**
	 * Insert loop event with idempotency check
	 */
	async insertLoop(event: LoopEvent): Promise<void> {
		// Check if event already exists (idempotency)
		const existing = await this.db.select().from(loops).where(eq(loops.requestId, event.requestId)).limit(1);

		if (existing.length > 0) {
			// Event already exists, no-op
			return;
		}

		// Insert new event
		await this.db.insert(loops).values({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			loopType: event.loopType,
			iterationCount: event.iterationCount,
			durationMs: event.durationMs,
			success: event.success,
			errorMessage: event.errorMessage,
			timestamp: event.timestamp,
			createdAt: new Date(),
		});
	}

	/**
	 * Insert feedback event with idempotency check
	 */
	async insertFeedback(event: FeedbackEvent): Promise<void> {
		// Check if event already exists (idempotency)
		const existing = await this.db.select().from(feedback).where(eq(feedback.requestId, event.requestId)).limit(1);

		if (existing.length > 0) {
			// Event already exists, no-op
			return;
		}

		// Insert new event
		await this.db.insert(feedback).values({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			feedbackType: event.feedbackType,
			feedbackText: event.feedbackText,
			rating: event.rating,
			metadata: event.metadata,
			timestamp: event.timestamp,
			createdAt: new Date(),
		});
	}

	/**
	 * Batch insert agent suggestions
	 */
	async batchInsertAgentSuggestions(events: AgentSuggestionEvent[]): Promise<void> {
		if (events.length === 0) {
			return;
		}

		const values = events.map((event) => ({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			suggestionId: event.suggestionId,
			suggestionText: event.suggestionText,
			suggestionType: event.suggestionType,
			filePath: event.filePath,
			lineStart: event.lineStart,
			lineEnd: event.lineEnd,
			characterStart: event.characterStart,
			characterEnd: event.characterEnd,
			accepted: event.accepted,
			dismissed: event.dismissed,
			timestamp: event.timestamp,
			createdAt: new Date(),
		}));

		await this.db.insert(agentSuggestions).values(values);
	}

	/**
	 * Batch insert policy evaluations
	 */
	async batchInsertPolicyEvaluations(events: PolicyEvaluationEvent[]): Promise<void> {
		if (events.length === 0) {
			return;
		}

		const values = events.map((event) => ({
			id: crypto.randomUUID(),
			userId: event.userId,
			apiKeyId: event.apiKeyId,
			sessionId: event.sessionId,
			requestId: event.requestId,
			policyName: event.policyName,
			policyVersion: event.policyVersion,
			evaluationResult: event.evaluationResult,
			violations: event.violations,
			remediationSteps: event.remediationSteps,
			timestamp: event.timestamp,
			createdAt: new Date(),
		}));

		await this.db.insert(policyEvaluations).values(values);
	}
}
