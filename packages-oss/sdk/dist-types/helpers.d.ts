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
export declare function analyze(client: SnapbackClient, envelope: Envelope, request: AnalyzeRequest): Promise<AnalyzeResponse>;
/**
 * Evaluate policy using the Snapback API
 * @param client The Snapback client instance
 * @param envelope The request envelope
 * @param request The policy evaluation request
 * @returns The policy evaluation response
 */
export declare function evaluatePolicy(client: SnapbackClient, envelope: Envelope, request: PolicyEvaluationRequest): Promise<PolicyEvaluationResponse>;
/**
 * Ingest telemetry data using the Snapback API
 * @param client The Snapback client instance
 * @param envelope The request envelope
 * @param data The telemetry data
 * @returns The telemetry response
 */
export declare function ingestTelemetry(client: SnapbackClient, envelope: Envelope, data: TelemetryData): Promise<TelemetryResponse>;
/**
 * Ensure request_id is idempotent
 * @param envelope The request envelope
 * @returns Envelope with guaranteed unique request_id
 */
export declare function ensureIdempotentRequestId(envelope: Envelope): Envelope;
//# sourceMappingURL=helpers.d.ts.map