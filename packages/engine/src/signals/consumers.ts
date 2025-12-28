#!/usr/bin/env npx tsx
/**
 * Consumers Signal - Import Fan-In Analysis
 *
 * SOURCE REFERENCE: apps/vscode/src/engine/graph/ImportAnalyzer.ts
 *
 * Counts how many files import each target file.
 * High fan-in = more impact when changed = higher risk.
 *
 * INPUT: JSON via stdin
 * { "files": ["path/to/file.ts"], "workspace"?: string }
 *
 * OUTPUT: JSON to stdout (SignalOutput schema)
 * { "signal": "consumers", "value": number, "metadata": { files, maxConsumers, avgConsumers } }
 */

import { execSync } from "node:child_process";
import { basename, extname } from "node:path";
import type { SignalOutput } from "../types.js";

/** Input type - exported for testing */
export interface ConsumersInput {
	files: string[];
	workspace?: string;
}

/** Count how many files import a given file - exported for testing */
export function countConsumers(filePath: string, workspace: string): number {
	try {
		const baseName = basename(filePath, extname(filePath));
		const result = execSync(
			`grep -r "from.*['""].*${baseName}['""]" --include="*.ts" --include="*.tsx" . 2>/dev/null | wc -l`,
			{ encoding: "utf8", timeout: 10000, cwd: workspace },
		);
		return Number.parseInt(result.trim(), 10) || 0;
	} catch {
		return 0;
	}
}

/** Consumer analysis result - exported for testing */
export interface ConsumerResult {
	fileConsumers: Array<{ file: string; consumers: number }>;
	maxConsumers: number;
	avgConsumers: number;
	score: number;
}

/** Analyze consumers for files - exported for testing */
export function analyzeConsumers(input: ConsumersInput): ConsumerResult {
	const workspace = input.workspace || process.cwd();
	const files = input.files || [];

	if (files.length === 0) {
		return { fileConsumers: [], maxConsumers: 0, avgConsumers: 0, score: 0 };
	}

	const fileConsumers = files.map((file) => ({
		file,
		consumers: countConsumers(file, workspace),
	}));

	const maxConsumers = Math.max(...fileConsumers.map((f) => f.consumers), 0);
	const avgConsumers = fileConsumers.reduce((sum, f) => sum + f.consumers, 0) / files.length;
	const score = Math.min(10, maxConsumers / 5);

	return { fileConsumers, maxConsumers, avgConsumers, score };
}

async function readInput(): Promise<ConsumersInput> {
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
 * Main CLI entry point for standalone consumers signal execution
 */
export async function mainConsumers(): Promise<void> {
	try {
		const input = await readInput();
		const result = analyzeConsumers(input);

		const output: SignalOutput = {
			signal: "consumers",
			value: Math.round(result.score * 10) / 10,
			metadata: {
				files: result.fileConsumers,
				maxConsumers: result.maxConsumers,
				avgConsumers: Math.round(result.avgConsumers * 10) / 10,
			},
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (err) {
		console.log(
			JSON.stringify({
				signal: "consumers",
				value: 0,
				metadata: { error: err instanceof Error ? err.message : String(err) },
			}),
		);
		process.exit(1);
	}
}
