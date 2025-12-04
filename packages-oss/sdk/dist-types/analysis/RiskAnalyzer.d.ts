/**
 * RiskAnalyzer - Platform-agnostic risk analysis for code security
 *
 * This module provides platform-agnostic risk analysis functionality,
 * detecting security issues in code through pattern matching and scoring.
 *
 * Key Features:
 * - Pattern-based security detection
 * - Risk scoring (0-10 scale)
 * - Severity classification (low/medium/high/critical)
 * - Configurable thresholds
 *
 * Thresholds are centralized in config/Thresholds.ts for consistency across
 * all platforms (VSCode, CLI, MCP, Web).
 *
 * @module RiskAnalyzer
 */
/**
 * Severity levels for risk analysis
 */
export type RiskSeverity = "low" | "medium" | "high" | "critical";
/**
 * Risk factor detected in analysis
 */
export interface RiskFactor {
    /** Type of risk detected */
    type: string;
    /** Human-readable message */
    message: string;
    /** Line number where issue was found (optional) */
    line?: number;
    /** Column number where issue was found (optional) */
    column?: number;
}
/**
 * Result of risk analysis
 */
export interface AnalysisResult {
    /** Risk score (0-10 scale, where 10 is most risky) */
    score: number;
    /** Severity classification */
    severity: RiskSeverity;
    /** Risk factors detected */
    factors: RiskFactor[];
    /** Recommendations for remediation */
    recommendations: string[];
}
/**
 * Configuration for risk analysis thresholds
 */
export interface RiskThresholds {
    /** Score threshold for blocking (default: 8.0) */
    blockingThreshold: number;
    /** Score threshold for critical severity (default: 7.0) */
    criticalThreshold: number;
    /** Score threshold for high severity (default: 5.0) */
    highThreshold: number;
    /** Score threshold for medium severity (default: 3.0) */
    mediumThreshold: number;
}
/**
 * Default risk thresholds based on SnapBack's security model
 *
 * These values are sourced from the centralized THRESHOLDS configuration
 * to ensure consistency across all platforms.
 */
export declare const DEFAULT_RISK_THRESHOLDS: RiskThresholds;
/**
 * Security pattern definition
 */
interface SecurityPattern {
    /** Pattern name */
    name: string;
    /** Regular expression to match */
    pattern: RegExp;
    /** Risk score contribution (0-10) */
    score: number;
    /** Human-readable message */
    message: string;
    /** Recommendation for remediation */
    recommendation: string;
}
/**
 * RiskAnalyzer - Analyzes code for security risks
 *
 * This class provides platform-agnostic risk analysis through pattern
 * matching and configurable thresholds. It's designed to work across
 * VSCode, CLI, MCP, and web environments.
 */
export declare class RiskAnalyzer {
    private thresholds;
    private customPatterns;
    /**
     * Creates a new RiskAnalyzer
     *
     * @param thresholds - Custom threshold configuration (optional)
     */
    constructor(thresholds?: Partial<RiskThresholds>);
    /**
     * Add a custom security pattern for detection
     *
     * @param pattern - Security pattern to add
     */
    addPattern(pattern: SecurityPattern): void;
    /**
     * Analyze content for security risks
     *
     * @param content - Code content to analyze
     * @param filePath - Path to the file (for context, optional)
     * @returns Analysis result with risk score and factors
     */
    analyze(content: string, _filePath?: string): AnalysisResult;
    /**
     * Check if a risk score should block a save operation
     *
     * @param score - Risk score to check
     * @returns True if score exceeds blocking threshold
     */
    shouldBlock(score: number): boolean;
    /**
     * Calculate severity based on risk score
     *
     * @param score - Risk score (0-10)
     * @returns Severity classification
     */
    private calculateSeverity;
    /**
     * Get line number from character index
     *
     * @param content - Full content string
     * @param index - Character index
     * @returns Line number (1-indexed)
     */
    private getLineNumber;
    /**
     * Get current thresholds
     *
     * @returns Current threshold configuration
     */
    getThresholds(): RiskThresholds;
    /**
     * Update thresholds
     *
     * @param thresholds - New threshold values
     */
    setThresholds(thresholds: Partial<RiskThresholds>): void;
}
export {};
//# sourceMappingURL=RiskAnalyzer.d.ts.map