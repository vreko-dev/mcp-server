#!/usr/bin/env npx tsx
/**
 * Velocity Signal - Change Velocity Tracking
 *
 * STATUS: 📝 TODO - Needs extraction from risk-analyzer.ts
 *
 * EXTRACTION SOURCE: packages/core/src/risk-analyzer.ts lines 68-100
 *
 * This script tracks how fast changes are happening (burst detection).
 * High velocity = agent making rapid changes = higher risk.
 *
 * EXTRACTION STEPS:
 * 1. Find change tracking logic in risk-analyzer.ts
 * 2. Extract burst detection algorithm
 * 3. Simplify to compute velocity metrics
 *
 * INPUTS (via --files or SNAPBACK_FILES env):
 * - Comma-separated list of file paths
 *
 * OUTPUTS (JSON to stdout):
 * {
 *   "status": "pass" | "fail",
 *   "score": number,
 *   "details": {
 *     "changesLast5Min": number,
 *     "burstDetected": boolean,
 *     "avgVelocity": number
 *   }
 * }
 *
 * TARGET: ~40 LOC
 */

// =============================================================================
// TYPES
// =============================================================================

interface ScriptResult {
	status: "pass" | "fail";
	score: number;
	reason?: string;
	details: {
		changesLast5Min: number;
		burstDetected: boolean;
		avgVelocity: number;
	};
}

// =============================================================================
// TODO: Extract from packages/core/src/risk-analyzer.ts
// The current implementation is a placeholder
// =============================================================================

// In-memory change tracking (reset on script restart)
// In production, this would read from session state
const CHANGE_HISTORY: number[] = [];

function recordChange(): void {
	CHANGE_HISTORY.push(Date.now());
	// Keep only last 5 minutes
	const fiveMinAgo = Date.now() - 5 * 60 * 1000;
	while (CHANGE_HISTORY.length > 0 && CHANGE_HISTORY[0]! < fiveMinAgo) {
		CHANGE_HISTORY.shift();
	}
}

function calculateVelocity(): {
	changesLast5Min: number;
	burstDetected: boolean;
	avgVelocity: number;
} {
	const fiveMinAgo = Date.now() - 5 * 60 * 1000;
	const recentChanges = CHANGE_HISTORY.filter((t) => t > fiveMinAgo);

	const changesLast5Min = recentChanges.length;
	const avgVelocity = changesLast5Min / 5; // changes per minute

	// Burst = more than 10 changes in last minute
	const oneMinAgo = Date.now() - 60 * 1000;
	const changesLastMin = recentChanges.filter((t) => t > oneMinAgo).length;
	const burstDetected = changesLastMin > 10;

	return { changesLast5Min, burstDetected, avgVelocity };
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

function parseArgs(): string[] {
	const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
	if (filesArg) {
		return filesArg.replace("--files=", "").split(",").filter(Boolean);
	}
	return (process.env.SNAPBACK_FILES ?? "").split(",").filter(Boolean);
}

function main(): void {
	const files = parseArgs();

	// Record changes for each file
	for (const _ of files) {
		recordChange();
	}

	const velocity = calculateVelocity();

	// Score: 5 points per burst, 1 point per 2 changes/min above 2
	let score = 0;
	if (velocity.burstDetected) {
		score += 10;
	}
	score += Math.max(0, (velocity.avgVelocity - 2) * 2);

	const result: ScriptResult = {
		status: velocity.burstDetected ? "fail" : "pass",
		score: Math.round(score),
		details: {
			changesLast5Min: velocity.changesLast5Min,
			burstDetected: velocity.burstDetected,
			avgVelocity: Math.round(velocity.avgVelocity * 10) / 10,
		},
	};

	if (velocity.burstDetected) {
		result.reason = "Burst detected: too many changes in short time";
	}

	console.log(JSON.stringify(result));
}

main();
