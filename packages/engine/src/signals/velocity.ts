#!/usr/bin/env npx tsx

/**
 * Velocity Signal - Change Velocity Tracking
 *
 * SOURCE REFERENCE: packages/engine/src/signals/burst.ts
 *
 * Integrates with BurstDetector for accurate velocity metrics.
 * High velocity = agent making rapid changes = higher risk.
 *
 * INPUT: JSON via stdin
 * {
 *   "files": [{ "path": string, "charCount": number, "timestamp"?: number }]
 * }
 *
 * OUTPUT: JSON to stdout (SignalOutput schema)
 * {
 *   "signal": "velocity",
 *   "value": number,
 *   "metadata": { "burstDetected": boolean, "velocity": number, "charCount": number }
 * }
 */

import type { SignalOutput } from "../types.js";
import { BurstDetector } from "./burst.js";

/** File input type - exported for testing */
export interface FileInput {
	path: string;
	charCount?: number;
	timestamp?: number;
}

/** Velocity calculation result - exported for testing */
export interface VelocityResult {
	burstDetected: boolean;
	velocity: number;
	score: number;
	totalChars: number;
}

/** Calculate velocity from file inputs - exported for testing */
export function calculateVelocity(files: FileInput[], detector?: BurstDetector): VelocityResult {
	const MIN_BURST_CHARS = 50;
	const burstDetector = detector || new BurstDetector({ threshold: 30, windowMs: 100 });

	let totalChars = 0;
	let burstDetected = false;
	let maxVelocity = 0;

	for (const file of files || []) {
		const charCount = file.charCount || 0;
		totalChars += charCount;
		const burstEvent = burstDetector.processChange(file.path, charCount, file.timestamp || Date.now());
		if (burstEvent && charCount >= MIN_BURST_CHARS) {
			burstDetected = true;
			maxVelocity = Math.max(maxVelocity, burstEvent.velocity);
		}
	}

	const velocity = maxVelocity > 0 ? maxVelocity : totalChars > 0 ? totalChars / 100 : 0;
	const score = burstDetected ? 10 : Math.min(5, velocity / 2);

	return { burstDetected, velocity, score, totalChars };
}

async function readInput(): Promise<{ files: FileInput[] }> {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.on("data", (chunk) => (data += chunk));
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch (e) {
				reject(new Error(`Invalid JSON input: ${e}`));
			}
		});
	});
}

/**
 * Main CLI entry point for standalone velocity signal execution
 */
export async function mainVelocity(): Promise<void> {
	try {
		const input = await readInput();
		const detector = new BurstDetector({ threshold: 30, windowMs: 100 });
		const MIN_BURST_CHARS = 50;

		let totalChars = 0;
		let burstDetected = false;
		let maxVelocity = 0;

		for (const file of input.files || []) {
			const charCount = file.charCount || 0;
			totalChars += charCount;
			const burstEvent = detector.processChange(file.path, charCount, file.timestamp || Date.now());
			if (burstEvent && charCount >= MIN_BURST_CHARS) {
				burstDetected = true;
				maxVelocity = Math.max(maxVelocity, burstEvent.velocity);
			}
		}

		const velocity = maxVelocity > 0 ? maxVelocity : totalChars > 0 ? totalChars / 100 : 0;
		const score = burstDetected ? 10 : Math.min(5, velocity / 2);

		const output: SignalOutput = {
			signal: "velocity",
			value: Math.round(score * 10) / 10,
			metadata: { burstDetected, velocity: Math.round(velocity * 100) / 100, charCount: totalChars },
		};
		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (err) {
		console.log(
			JSON.stringify({
				signal: "velocity",
				value: 0,
				metadata: { error: err instanceof Error ? err.message : String(err) },
			}),
		);
		process.exit(1);
	}
}

