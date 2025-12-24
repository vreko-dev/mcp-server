/**
 * BehaviorTracker - Collects behavioral metadata during dev sessions
 *
 * Phase 2 enhancement: Tracks developer workflow patterns
 * - Session duration
 * - AI acceptance rate
 * - Code churn
 * - Test pass rate
 */

import type { BehavioralMetadata } from "../types/vitals.js";

interface EditEvent {
	timestamp: number;
	linesAdded: number;
	linesDeleted: number;
}

interface TestEvent {
	timestamp: number;
	passed: boolean;
}

interface AISuggestionEvent {
	timestamp: number;
	accepted: boolean;
}

export class BehaviorTracker {
	private sessionStart: number;
	private edits: EditEvent[] = [];
	private tests: TestEvent[] = [];
	private aiSuggestions: AISuggestionEvent[] = [];
	private fileSaves = 0;
	private lastSnapshotTime: number;

	constructor(initialTime: number = Date.now()) {
		this.sessionStart = initialTime;
		this.lastSnapshotTime = initialTime;
	}

	/**
	 * Record a file edit event
	 */
	recordEdit(linesAdded: number, linesDeleted: number, timestamp: number = Date.now()): void {
		this.edits.push({ timestamp, linesAdded, linesDeleted });
	}

	/**
	 * Record a file save
	 */
	recordFileSave(): void {
		this.fileSaves++;
	}

	/**
	 * Record a test execution result
	 */
	recordTest(passed: boolean, timestamp: number = Date.now()): void {
		this.tests.push({ timestamp, passed });
	}

	/**
	 * Record an AI suggestion event
	 */
	recordAISuggestion(accepted: boolean, timestamp: number = Date.now()): void {
		this.aiSuggestions.push({ timestamp, accepted });
	}

	/**
	 * Record a snapshot creation (resets session)
	 */
	recordSnapshot(timestamp: number = Date.now()): void {
		this.lastSnapshotTime = timestamp;
		this.sessionStart = timestamp;
		// Don't clear metrics - preserve for analytics
	}

	/**
	 * Get current behavioral metadata
	 */
	getMetadata(now: number = Date.now()): BehavioralMetadata {
		const sessionDuration = now - this.sessionStart;

		// Calculate AI acceptance rate
		const totalSuggestions = this.aiSuggestions.length;
		const acceptedSuggestions = this.aiSuggestions.filter((s) => s.accepted).length;
		const rejectedSuggestions = totalSuggestions - acceptedSuggestions;
		const aiAcceptanceRate = totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;

		// Calculate code churn rate (lines per minute)
		const totalLinesChanged = this.edits.reduce((sum, e) => sum + e.linesAdded + e.linesDeleted, 0);
		const sessionMinutes = sessionDuration / (60 * 1000);
		const churnRate = sessionMinutes > 0 ? totalLinesChanged / sessionMinutes : 0;

		// Calculate test pass rate
		const totalTests = this.tests.length;
		const passedTests = this.tests.filter((t) => t.passed).length;
		const testPassRate = totalTests > 0 ? passedTests / totalTests : 1.0; // Default to 100% if no tests

		// Calculate average time between edits
		let avgTimeBetweenEdits = 0;
		if (this.edits.length > 1) {
			const intervals: number[] = [];
			for (let i = 1; i < this.edits.length; i++) {
				intervals.push(this.edits[i].timestamp - this.edits[i - 1].timestamp);
			}
			avgTimeBetweenEdits = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
		}

		return {
			sessionDuration,
			aiAcceptanceRate,
			churnRate,
			testPassRate,
			fileSaveCount: this.fileSaves,
			aiSuggestionsShown: totalSuggestions,
			aiSuggestionsAccepted: acceptedSuggestions,
			aiSuggestionsRejected: rejectedSuggestions,
			avgTimeBetweenEdits,
		};
	}

	/**
	 * Reset all tracking data
	 */
	reset(timestamp: number = Date.now()): void {
		this.sessionStart = timestamp;
		this.lastSnapshotTime = timestamp;
		this.edits = [];
		this.tests = [];
		this.aiSuggestions = [];
		this.fileSaves = 0;
	}

	/**
	 * Get raw metrics for testing
	 */
	getRawCounts(): {
		edits: number;
		tests: number;
		suggestions: number;
		saves: number;
	} {
		return {
			edits: this.edits.length,
			tests: this.tests.length,
			suggestions: this.aiSuggestions.length,
			saves: this.fileSaves,
		};
	}
}
