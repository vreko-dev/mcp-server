// counters: incidents_prevented, overrides, time_to_restore

export interface Metrics {
	incidents_prevented: number;
	overrides: number;
	time_to_restore: number[]; // Array of restore times in milliseconds
	snapshots_created: number;
	snapshots_restored: number;
	ai_blocks: number;
	policy_violations: number;
}

export class AnalyticsMetrics {
	private metrics: Metrics = {
		incidents_prevented: 0,
		overrides: 0,
		time_to_restore: [],
		snapshots_created: 0,
		snapshots_restored: 0,
		ai_blocks: 0,
		policy_violations: 0,
	};

	// Increment incidents prevented counter
	incrementIncidentsPrevented(): void {
		this.metrics.incidents_prevented++;
	}

	// Increment overrides counter
	incrementOverrides(): void {
		this.metrics.overrides++;
	}

	// Add a restore time measurement
	addRestoreTime(milliseconds: number): void {
		this.metrics.time_to_restore.push(milliseconds);
	}

	// Increment snapshots created counter
	incrementSnapshotsCreated(): void {
		this.metrics.snapshots_created++;
	}

	// Increment snapshots restored counter
	incrementSnapshotsRestored(): void {
		this.metrics.snapshots_restored++;
	}

	// Increment AI blocks counter
	incrementAIBlocks(): void {
		this.metrics.ai_blocks++;
	}

	// Increment policy violations counter
	incrementPolicyViolations(): void {
		this.metrics.policy_violations++;
	}

	// Get current metrics
	getMetrics(): Metrics {
		return { ...this.metrics };
	}

	// Get average restore time
	getAverageRestoreTime(): number {
		if (this.metrics.time_to_restore.length === 0) {
			return 0;
		}

		const sum = this.metrics.time_to_restore.reduce((a, b) => a + b, 0);
		return sum / this.metrics.time_to_restore.length;
	}

	// Get restore time percentiles
	getRestoreTimePercentiles(): { p50: number; p95: number; p99: number } {
		if (this.metrics.time_to_restore.length === 0) {
			return { p50: 0, p95: 0, p99: 0 };
		}

		const sorted = [...this.metrics.time_to_restore].sort((a, b) => a - b);
		const len = sorted.length;

		return {
			p50: sorted[Math.floor(len * 0.5)],
			p95: sorted[Math.floor(len * 0.95)],
			p99: sorted[Math.floor(len * 0.99)],
		};
	}

	// Reset metrics (useful for testing)
	reset(): void {
		this.metrics = {
			incidents_prevented: 0,
			overrides: 0,
			time_to_restore: [],
			snapshots_created: 0,
			snapshots_restored: 0,
			ai_blocks: 0,
			policy_violations: 0,
		};
	}

	// Static method for testing
	static createTestMetrics(): AnalyticsMetrics {
		const metrics = new AnalyticsMetrics();
		metrics.incrementIncidentsPrevented();
		metrics.incrementOverrides();
		metrics.addRestoreTime(150);
		metrics.addRestoreTime(200);
		metrics.addRestoreTime(180);
		return metrics;
	}
}

// Export a singleton instance for easy use
let analyticsMetrics: AnalyticsMetrics | null = null;

export function getAnalyticsMetrics(): AnalyticsMetrics {
	if (!analyticsMetrics) {
		analyticsMetrics = new AnalyticsMetrics();
	}

	return analyticsMetrics;
}
