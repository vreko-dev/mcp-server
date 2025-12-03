import crypto from "node:crypto";
import { logger } from "@snapback-oss/infrastructure";
import type { Envelope, SnapbackClient } from "./client";

/**
 * Helper functions for the Snapback SDK
 * Provides high-level interfaces for analyze, evaluatePolicy, and ingestTelemetry
 */

export interface AnalyzeRequest {
	content: string;
	filePath: string;
	language?: string;
}

export interface AnalyzeResponse {
	decision: "allow" | "review" | "block";
	confidence: number;
	rules_hit: string[];
	metadata?: Record<string, any>;
}

export interface PolicyEvaluationRequest {
	policyId?: string;
	context: Record<string, any>;
}

export interface PolicyEvaluationResponse {
	decision: "allow" | "review" | "block";
	confidence: number;
	rules_hit: string[];
	policyVersion: string;
}

export interface TelemetryData {
	eventType: string;
	payload: Record<string, any>;
	timestamp: number;
}

export interface TelemetryResponse {
	id: string;
	received: boolean;
}

/**
 * Analyze code using the Snapback API
 * @param client The Snapback client instance
 * @param envelope The request envelope
 * @param request The analysis request
 * @returns The analysis response
 */
export async function analyze(
	client: SnapbackClient,
	envelope: Envelope,
	request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
	// Ensure request has a valid request_id
	const idempotentEnvelope = ensureIdempotentRequestId(envelope);

	try {
		const response = await client
			.getHttpClient()
			.post("v1/analyze", {
				json: {
					...request,
					envelope: idempotentEnvelope,
				},
				timeout: 30000,
			})
			.json<AnalyzeResponse>();

		return response;
	} catch (error) {
		logger.error("Analysis failed", { error: error as Error });
		throw new Error(`Analysis failed: ${(error as Error).message}`);
	}
}

/**
 * Evaluate policy using the Snapback API
 * @param client The Snapback client instance
 * @param envelope The request envelope
 * @param request The policy evaluation request
 * @returns The policy evaluation response
 */
export async function evaluatePolicy(
	client: SnapbackClient,
	envelope: Envelope,
	request: PolicyEvaluationRequest,
): Promise<PolicyEvaluationResponse> {
	// Ensure request has a valid request_id
	const idempotentEnvelope = ensureIdempotentRequestId(envelope);

	try {
		const response = await client
			.getHttpClient()
			.post("v1/policy/evaluate", {
				json: {
					...request,
					envelope: idempotentEnvelope,
				},
				timeout: 30000,
			})
			.json<PolicyEvaluationResponse>();

		return response;
	} catch (error) {
		logger.error("Policy evaluation failed", { error: error as Error });
		throw new Error(`Policy evaluation failed: ${(error as Error).message}`);
	}
}

/**
 * Ingest telemetry data using the Snapback API
 * @param client The Snapback client instance
 * @param envelope The request envelope
 * @param data The telemetry data
 * @returns The telemetry response
 */
export async function ingestTelemetry(
	client: SnapbackClient,
	envelope: Envelope,
	data: TelemetryData,
): Promise<TelemetryResponse> {
	// Ensure request has a valid request_id
	const idempotentEnvelope = ensureIdempotentRequestId(envelope);

	try {
		const response = await client
			.getHttpClient()
			.post("v1/telemetry", {
				json: {
					...data,
					envelope: idempotentEnvelope,
				},
				timeout: 30000,
			})
			.json<TelemetryResponse>();

		return response;
	} catch (error) {
		logger.error("Telemetry ingestion failed", { error: error as Error });
		throw new Error(`Telemetry ingestion failed: ${(error as Error).message}`);
	}
}

/**
 * Ensure request_id is idempotent
 * @param envelope The request envelope
 * @returns Envelope with guaranteed unique request_id
 */
export function ensureIdempotentRequestId(envelope: Envelope): Envelope {
	// If request_id is not provided, generate one
	if (!envelope.request_id) {
		return {
			...envelope,
			request_id: generateRequestId(),
		};
	}

	// Otherwise return as-is
	return envelope;
}

/**
 * Generate a unique request ID
 * @returns Unique request ID
 */
function generateRequestId(): string {
	return `${Date.now()}-${crypto.randomUUID().substring(0, 10)}`;
}
