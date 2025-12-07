/**
 * @fileoverview AiSessionTracker - Session-level AI usage classification
 *
 * Classifies AI assistance level based on:
 * - Environment detection (provider presence)
 * - Change patterns (large inserts, total volume)
 *
 * Key principles:
 * - Truth-first: never claims "AI wrote this code"
 * - Confidence capping: inference-only scenarios capped at 7.5
 * - Anti-paste guard: single huge insert ≠ heavy AI usage
 */
import type { SimpleChangeTracker } from "./SimpleChangeTracker";
export type { ChangeEvent, ChangeMetrics } from "./SimpleChangeTracker";
export { SimpleChangeTracker } from "./SimpleChangeTracker";
export type AiAssistLevel = "none" | "light" | "medium" | "heavy" | "unknown";
export interface AiEnvDetection {
    provider: "cursor" | "claude" | "none" | "unknown";
    hasAI: boolean;
    confidence: number;
}
export interface AiSessionResult {
    level: AiAssistLevel;
    confidence: number;
    provider: AiEnvDetection["provider"];
    reasoning: string;
    metrics: ReturnType<SimpleChangeTracker["snapshot"]>;
}
export declare class AiSessionTracker {
    private readonly detectEnv;
    private readonly changeTracker;
    private isEnabled;
    private sessionId;
    constructor(detectEnv: () => AiEnvDetection, changeTracker: SimpleChangeTracker, isEnabled?: boolean);
    /**
     * Starts a new session
     */
    startSession(sessionId: string): void;
    /**
     * Records a change event
     */
    recordChange(event: import("./SimpleChangeTracker").ChangeEvent): void;
    /**
     * Finalizes the session and returns classification result
     */
    finalizeSession(): AiSessionResult;
    /**
     * Resets session state
     */
    reset(): void;
    private classifyLevel;
    /**
     * Calculates confidence score based on signals available
     */
    private calculateConfidence;
    /**
     * Generates human-readable reasoning
     */
    private generateReasoning;
}
//# sourceMappingURL=AiSessionTracker.d.ts.map