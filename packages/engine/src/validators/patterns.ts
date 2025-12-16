#!/usr/bin/env npx tsx
/**
 * Patterns Validator - Code style and pattern linting via Biome
 *
 * SOURCE: External tool (Biome)
 * VALIDATION GATE:
 * - Code style violations
 * - Common anti-patterns
 * - TypeScript best practices
 *
 * NOTE: This is NON-BLOCKING (lint warnings don't fail builds)
 *
 * CONTRACT:
 * - Input: --files=a.ts,b.ts or SNAPBACK_FILES env var
 * - Output: JSON to stdout
 * - Exit: Always 0 (warnings don't block)
 * - Timeout: 30s
 */

import { execSync } from "node:child_process";

export interface ValidatorResult {
	status: "pass" | "fail";
	reason?: string;
	suggestion?: string;
	errors?: string[];
	details?: {
		warnings: number;
		errors: number;
		fixable: number;
	};
}

/**
 * Run Biome check on files - exported for testing
 */
export function runBiomeCheck(files: string[]): ValidatorResult {
	try {
		// Run biome check (returns non-zero exit on errors, but we treat as warnings)
		const result = execSync(`pnpm biome check ${files.join(" ")} --reporter=json`, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 30000, // 30s timeout
		});

		// Parse JSON output
		const output = JSON.parse(result);
		const warnings = output.diagnostics?.length ?? 0;
		const errors = output.diagnostics?.filter((d: any) => d.severity === "error")?.length ?? 0;
		const fixable = output.diagnostics?.filter((d: any) => d.fixable)?.length ?? 0;

		if (warnings > 0) {
			return {
				status: "pass", // Non-blocking
				reason: `${warnings} lint warnings found (${fixable} auto-fixable)`,
				suggestion: "Run `pnpm biome check --write` to auto-fix issues",
				details: {
					warnings,
					errors,
					fixable,
				},
			};
		}

		return {
			status: "pass",
		};
	} catch (error) {
		// Biome check failed to run or returned errors
		// Still non-blocking, just report as warnings
		const errorMsg = error instanceof Error ? error.message : String(error);

		// Try to extract diagnostics count from stderr
		let warnings = 0;
		if (errorMsg.includes("Found")) {
			const match = errorMsg.match(/Found (\d+)/);
			if (match) {
				warnings = Number.parseInt(match[1], 10);
			}
		}

		return {
			status: "pass", // Non-blocking
			reason: warnings > 0 ? `${warnings} lint issues found` : "Biome check encountered warnings",
			suggestion: "Review lint output and fix issues if needed",
			errors: warnings > 0 ? [`Biome reported ${warnings} issues`] : undefined,
			details: {
				warnings,
				errors: 0,
				fixable: 0,
			},
		};
	}
}

/**
 * Parse command-line arguments or environment variable - exported for testing
 */
export function parseArgs(): string[] {
	const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
	const filesEnv = process.env.SNAPBACK_FILES;

	if (filesArg) {
		return filesArg.replace("--files=", "").split(",");
	}

	if (filesEnv) {
		return filesEnv.split(",");
	}

	throw new Error("No files provided. Use --files=a.ts,b.ts or SNAPBACK_FILES env variable");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	try {
		const files = parseArgs();
		const result = runBiomeCheck(files);

		console.log(JSON.stringify(result));
		process.exit(0); // Always exit 0 (non-blocking)
	} catch (error) {
		const result: ValidatorResult = {
			status: "pass", // Non-blocking even on failure
			reason: error instanceof Error ? error.message : String(error),
			errors: [error instanceof Error ? error.message : String(error)],
		};

		console.log(JSON.stringify(result));
		process.exit(0); // Always exit 0
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	void main();
}
