/**
 * @fileoverview SimpleChangeTracker - Metrics-only change tracking
 *
 * Tracks aggregate metrics for code changes without storing individual events.
 * Determines "large inserts" based on multi-line + size thresholds.
 */
export interface ChangeEvent {
    chars: number;
    lines: number;
    isInsert: boolean;
    isMultiLine: boolean;
}
export interface ChangeMetrics {
    totalChars: number;
    totalLines: number;
    largeInsertCount: number;
    multiLineInsertCount: number;
}
export declare class SimpleChangeTracker {
    private totalChars;
    private totalLines;
    private largeInsertCount;
    private multiLineInsertCount;
    /**
     * Records a change event and updates aggregate metrics
     */
    recordChange(event: ChangeEvent): void;
    /**
     * Determines if a change qualifies as a "large insert"
     */
    private isLargeInsert;
    /**
     * Returns current aggregate metrics snapshot
     */
    snapshot(): ChangeMetrics;
    /**
     * Clears all accumulated metrics
     */
    reset(): void;
}
//# sourceMappingURL=SimpleChangeTracker.d.ts.map