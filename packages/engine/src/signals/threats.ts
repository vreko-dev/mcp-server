#!/usr/bin/env npx tsx
/**
 * Threats Signal - Security Threat Detection
 *
 * SOURCE REFERENCE: packages/core/src/threat-detection.ts
 *
 * Detects security patterns in code (hardcoded secrets, dangerous operations).
 *
 * INPUT: JSON via stdin
 * { "files": [{ "path": string, "content": string }] }
 *
 * OUTPUT: JSON to stdout (SignalOutput schema)
 * { "signal": "threats", "value": number, "metadata": { threatCount, patterns, severity } }
 */

import type { SignalOutput } from "../types.js";

// Threat patterns extracted from threat-detection.ts + mock-replacement.ts + V1 Guardian plugins
/** Exported for direct testing and reuse */
export const THREAT_PATTERNS = {
	critical: [
		{ pattern: /rm\s+-rf/i, description: "rm -rf", severity: 1.0 },
		{ pattern: /DROP\s+TABLE/i, description: "DROP TABLE", severity: 1.0 },
		{ pattern: /eval\s*\(/i, description: "eval() usage", severity: 1.0 },
		{ pattern: /\bnew\s+Function\s*\(/i, description: "Function constructor usage", severity: 1.0 },
		{ pattern: /\bFunction\s*\(/i, description: "Function constructor usage", severity: 1.0 },
		// Secret patterns (from SecretDetectionPlugin)
		{ pattern: /AKIA[A-Z0-9]{16}/g, description: "AWS access key", severity: 1.0 },
		{ pattern: /ghp_[a-zA-Z0-9]{36}/g, description: "GitHub token", severity: 1.0 },
		{ pattern: /sk-[a-zA-Z0-9]{32,}/g, description: "OpenAI API key", severity: 1.0 },
		// JWT tokens (from AdvancedSecretsPlugin)
		{ pattern: /eyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*/g, description: "JWT token", severity: 1.0 },
	],
	high: [
		{ pattern: /password\s*[:=]\s*['"]/i, description: "hardcoded password", severity: 0.8 },
		{ pattern: /api_?key\s*[:=]\s*['"]/i, description: "exposed API key", severity: 0.8 },
		{ pattern: /secret\s*[:=]\s*['"]/i, description: "hardcoded secret", severity: 0.8 },
		// Mock patterns in production (from MockReplacementPlugin)
		{ pattern: /\bjest\.mock\b/g, description: "jest.mock() in production", severity: 0.8 },
		{ pattern: /\bvi\.mock\b/g, description: "vi.mock() in production", severity: 0.8 },
		{ pattern: /\bsinon\.(stub|mock|spy)\b/g, description: "sinon mock in production", severity: 0.7 },
		// Dangerous Node.js APIs (from DangerousAPIPlugin)
		{ pattern: /\bchild_process\.(exec|execSync)\s*\(/g, description: "child_process.exec() usage", severity: 0.8 },
		{ pattern: /\bvm\.runInThisContext\s*\(/g, description: "vm.runInThisContext() usage", severity: 0.8 },
		{ pattern: /\bvm\.runInNewContext\s*\(/g, description: "vm.runInNewContext() usage", severity: 0.8 },
	],
	medium: [
		{ pattern: /exec\s*\(/i, description: "exec() usage", severity: 0.5 },
		{ pattern: /dangerouslySetInnerHTML/i, description: "XSS risk", severity: 0.5 },
		// Testing library imports in production
		{ pattern: /from\s+["']@testing-library/g, description: "testing-library import", severity: 0.5 },
		{ pattern: /from\s+["']vitest["']/g, description: "vitest import in production", severity: 0.5 },
		// child_process.spawn is less dangerous but still notable
		{ pattern: /\bchild_process\.spawn\s*\(/g, description: "child_process.spawn() usage", severity: 0.5 },
		// .env hygiene issues (from EnvHygienePlugin)
		{ pattern: /^\s*DEBUG\s*=\s*(true|1|on)/im, description: ".env: debug mode enabled", severity: 0.5 },
		{ pattern: /^\s*SSL\s*=\s*(false|0|off)/im, description: ".env: SSL disabled", severity: 0.5 },
		{ pattern: /^\s*NODE_ENV\s*=\s*development/im, description: ".env: development environment", severity: 0.5 },
	],
};

interface FileInput {
	path: string;
	content: string;
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

/** Detect threats in content - exported for direct testing */
export function detectThreats(content: string): Array<{ description: string; severity: number }> {
	const threats: Array<{ description: string; severity: number }> = [];

	for (const level of ["critical", "high", "medium"] as const) {
		for (const threat of THREAT_PATTERNS[level]) {
			// Reset lastIndex for global regexes before each test
			threat.pattern.lastIndex = 0;
			if (threat.pattern.test(content)) {
				threats.push({ description: threat.description, severity: threat.severity });
			}
		}
	}

	return threats;
}

/**
 * Main CLI entry point for standalone threats signal execution
 */
export async function mainThreats(): Promise<void> {
	try {
		const input = await readInput();
		let totalScore = 0;
		let threatCount = 0;
		const detectedPatterns: string[] = [];

		for (const file of input.files || []) {
			const threats = detectThreats(file.content || "");
			for (const threat of threats) {
				totalScore += threat.severity * 10;
				threatCount++;
				if (!detectedPatterns.includes(threat.description)) {
					detectedPatterns.push(threat.description);
				}
			}
		}

		const fileCount = Math.max(1, input.files?.length || 1);
		const output: SignalOutput = {
			signal: "threats",
			value: Math.min(10, totalScore / fileCount),
			metadata: {
				threatCount,
				patterns: detectedPatterns,
				severity: threatCount > 0 ? "high" : "none",
			},
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (err) {
		console.log(
			JSON.stringify({
				signal: "threats",
				value: 0,
				metadata: { error: err instanceof Error ? err.message : String(err) },
			}),
		);
		process.exit(1);
	}
}
