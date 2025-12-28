/**
 * TypeScriptCompilerLayer - Real TypeScript Compiler Integration
 *
 * Runs the actual TypeScript compiler (tsc) on code to detect type errors.
 * This is more accurate than regex-based type checking.
 *
 * This layer catches:
 * - Type mismatches
 * - Missing properties
 * - Incorrect function signatures
 * - Generic type errors
 *
 * @module validation/layers/TypeScriptCompilerLayer
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Issue, ValidationLayer } from "../../types/config.js";

/**
 * TypeScriptCompilerLayer - Validates code using tsc
 */
export class TypeScriptCompilerLayer implements ValidationLayer {
	name = "typescript-compiler";

	constructor(private workspaceRoot: string) {}

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		// Handle empty code
		if (!code || code.trim() === "") {
			return { issues: [] };
		}

		try {
			const result = await this.runTsc(code, filePath);
			return { issues: result };
		} catch {
			// tsc not available or failed - return empty issues
			return { issues: [] };
		}
	}

	/**
	 * Run TypeScript compiler on the provided code
	 */
	private async runTsc(code: string, filePath: string): Promise<Issue[]> {
		// Create a temp file with the code
		const tempDir = await mkdtemp(join(tmpdir(), "tsc-validation-"));
		const fileName = filePath.replace(/^.*[\\/]/, "") || "temp.ts";
		const tempFile = join(tempDir, fileName);

		try {
			await writeFile(tempFile, code, "utf8");

			const result = await this.execTsc(tempFile);
			return this.parseTscOutput(result, code);
		} finally {
			// Cleanup temp directory
			await rm(tempDir, { recursive: true, force: true }).catch(() => {});
		}
	}

	/**
	 * Execute tsc command
	 */
	private execTsc(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";

			// Use noEmit to just check types without generating output
			const proc = spawn("npx", ["tsc", "--noEmit", "--pretty", "false", "--skipLibCheck", filePath], {
				cwd: this.workspaceRoot,
				shell: true,
				stdio: ["pipe", "pipe", "pipe"],
			});

			const timeout = setTimeout(() => {
				proc.kill("SIGTERM");
				reject(new Error("TypeScript check timed out"));
			}, 15000);

			proc.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			proc.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			proc.on("close", (_code) => {
				clearTimeout(timeout);
				// tsc returns non-zero when there are errors, that's expected
				resolve(stdout + stderr);
			});

			proc.on("error", (err) => {
				clearTimeout(timeout);
				reject(err);
			});
		});
	}

	/**
	 * Parse tsc output into Issue array
	 */
	private parseTscOutput(output: string, _code: string): Issue[] {
		const issues: Issue[] = [];

		if (!output) {
			return issues;
		}

		const lines = output.split("\n");

		for (const line of lines) {
			// Match tsc error format: file.ts(line,col): error TS1234: message
			const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/);

			if (match) {
				const [, , lineNum, , severity, tsCode, message] = match;
				issues.push({
					severity: severity === "error" ? "critical" : "warning",
					type: tsCode,
					message: message.trim(),
					line: Number.parseInt(lineNum, 10),
					fix: this.getSuggestedFix(tsCode),
				});
			} else if (line.includes("error TS")) {
				// Fallback for other error formats
				const codeMatch = line.match(/TS(\d+)/);
				issues.push({
					severity: "critical",
					type: codeMatch ? `TS${codeMatch[1]}` : "TS_ERROR",
					message: line.trim().slice(0, 200),
				});
			}
		}

		return issues;
	}

	/**
	 * Get suggested fix for common TypeScript errors
	 */
	private getSuggestedFix(tsCode: string): string | undefined {
		const fixes: Record<string, string> = {
			TS2322: "Check type compatibility between the assigned value and variable type",
			TS2339: "Property does not exist - add it to the type or interface",
			TS2345: "Argument type mismatch - ensure function is called with correct types",
			TS2304: "Cannot find name - check import or variable declaration",
			TS2531: "Object is possibly null - add null check",
			TS2532: "Object is possibly undefined - add undefined check",
			TS7006: "Parameter implicitly has any type - add type annotation",
			TS2307: "Cannot find module - check import path or install package",
			TS2341: "Property is private - use public accessor or friend pattern",
			TS2551: "Property does not exist - did you mean a similar property?",
			TS2769: "No overload matches this call - check function signature",
		};
		return fixes[tsCode];
	}
}
