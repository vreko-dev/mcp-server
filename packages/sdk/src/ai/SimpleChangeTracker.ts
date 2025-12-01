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

/**
 * Threshold for considering an insert "large"
 * - Must be multi-line (isMultiLine = true)
 * - AND must be an insert (isInsert = true)
 * - AND must meet minimum size: ≥100 chars OR ≥5 lines
 */
const LARGE_INSERT_THRESHOLD = {
	minChars: 100,
	minLines: 5,
} as const;

export class SimpleChangeTracker {
	private totalChars = 0;
	private totalLines = 0;
	private largeInsertCount = 0;
	private multiLineInsertCount = 0;

	/**
	 * Records a change event and updates aggregate metrics
	 */
	recordChange(event: ChangeEvent): void {
		this.totalChars += event.chars;
		this.totalLines += event.lines;

		// Count multi-line inserts
		if (event.isInsert && event.isMultiLine) {
			this.multiLineInsertCount++;
		}

		// Count large inserts: must be insert + multi-line + meet size threshold
		if (this.isLargeInsert(event)) {
			this.largeInsertCount++;
		}
	}

	/**
	 * Determines if a change qualifies as a "large insert"
	 */
	private isLargeInsert(event: ChangeEvent): boolean {
		if (!event.isInsert || !event.isMultiLine) {
			return false;
		}

		return event.chars >= LARGE_INSERT_THRESHOLD.minChars || event.lines >= LARGE_INSERT_THRESHOLD.minLines;
	}

	/**
	 * Returns current aggregate metrics snapshot
	 */
	snapshot(): ChangeMetrics {
		return {
			totalChars: this.totalChars,
			totalLines: this.totalLines,
			largeInsertCount: this.largeInsertCount,
			multiLineInsertCount: this.multiLineInsertCount,
		};
	}

	/**
	 * Clears all accumulated metrics
	 */
	reset(): void {
		this.totalChars = 0;
		this.totalLines = 0;
		this.largeInsertCount = 0;
		this.multiLineInsertCount = 0;
	}
}
