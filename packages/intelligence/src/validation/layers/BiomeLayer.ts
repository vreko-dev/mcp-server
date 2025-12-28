/**
 * BiomeLayer - Programmatic Biome Integration
 *
 * Runs Biome linter on code and returns structured issues.
 * Leverages the project's existing Biome configuration.
 *
 * This layer catches:
 * - Unused imports (noUnusedImports)
 * - Unused variables (noUnusedVariables)
 * - Style issues (noNonNullAssertion, etc.)
 * - A11y issues (noSvgWithoutTitle, etc.)
 *
 * @module validation/layers/BiomeLayer
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Issue, ValidationLayer } from "../../types/config.js";

interface BiomeDiagnostic {
	category?: string;
	severity?: string;
	message?: string;
	description?: string;
	path?: string;
	location?: {
		path?: { file?: string };
		span?: { start?: number; end?: number };
	};
}

interface BiomeOutput {
	diagnostics?: BiomeDiagnostic[];
}

/**
 * BiomeLayer - Validates code using Biome linter
 */
export class BiomeLayer implements ValidationLayer {
	name = "biome";

	constructor(private workspaceRoot: string) {}

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Handle empty code
		if (!code || code.trim() === "") {
			return { issues };
		}

		try {
			const result = await this.runBiome(code, filePath);
			return { issues: result };
		} catch {
			// Biome not available or failed - return empty issues
			// Don't fail validation just because biome isn't available
			return { issues };
		}
	}

	/**
	 * Run Biome on the provided code
	 */
	private async runBiome(code: string, filePath: string): Promise<Issue[]> {
		// Create a temp file with the code
		const tempDir = await mkdtemp(join(tmpdir(), "biome-validation-"));
		const tempFile = join(tempDir, filePath.replace(/^.*[\\/]/, ""));

		try {
			await writeFile(tempFile, code, "utf8");

			const result = await this.execBiome(tempFile);
			return this.parseBiomeOutput(result, code);
		} finally {
			// Cleanup temp directory
			await rm(tempDir, { recursive: true, force: true }).catch(() => {});
		}
	}

	/**
	 * Execute biome check command
	 */
	private execBiome(filePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";

			const proc = spawn("npx", ["biome", "check", "--reporter=json", filePath], {
				cwd: this.workspaceRoot,
				shell: true,
				stdio: ["pipe", "pipe", "pipe"],
			});

			const timeout = setTimeout(() => {
				proc.kill("SIGTERM");
				reject(new Error("Biome check timed out"));
			}, 15000);

			proc.stdout?.on("data", (data) => {
				stdout += data.toString();
			});

			proc.stderr?.on("data", (data) => {
				stderr += data.toString();
			});

			proc.on("close", (_code) => {
				clearTimeout(timeout);
				// Biome returns non-zero when there are issues, that's expected
				resolve(stdout || stderr);
			});

			proc.on("error", (err) => {
				clearTimeout(timeout);
				reject(err);
			});
		});
	}

	/**
	 * Parse Biome JSON output into Issue array
	 */
	private parseBiomeOutput(output: string, code: string): Issue[] {
		const issues: Issue[] = [];

		if (!output) {
			return issues;
		}

		try {
			// Try to parse as JSON
			const parsed = JSON.parse(output) as BiomeOutput;

			if (parsed.diagnostics && Array.isArray(parsed.diagnostics)) {
				for (const diag of parsed.diagnostics) {
					issues.push(this.diagnosticToIssue(diag, code));
				}
			}
		} catch {
			// Try to extract diagnostics from non-JSON output
			// Biome sometimes outputs line-by-line diagnostics
			const lines = output.split("\n").filter((l) => l.trim());
			for (const line of lines) {
				if (line.includes("error") || line.includes("warning")) {
					issues.push({
						severity: line.includes("error") ? "critical" : "warning",
						type: "BIOME_ISSUE",
						message: line.trim().slice(0, 200),
					});
				}
			}
		}

		return issues;
	}

	/**
	 * Convert Biome diagnostic to Issue format
	 */
	private diagnosticToIssue(diag: BiomeDiagnostic, code: string): Issue {
		const severity = this.mapSeverity(diag.severity);
		const type = diag.category || "BIOME_ISSUE";
		const message = diag.message || diag.description || "Unknown issue";

		// Try to find line number from span
		let line: number | undefined;
		if (diag.location?.span?.start !== undefined) {
			const offset = diag.location.span.start;
			const beforeOffset = code.slice(0, offset);
			line = (beforeOffset.match(/\n/g) || []).length + 1;
		}

		return {
			severity,
			type: this.normalizeType(type),
			message: message.slice(0, 300),
			line,
			fix: this.getSuggestedFix(type),
		};
	}

	/**
	 * Map Biome severity to Issue severity
	 */
	private mapSeverity(severity?: string): "critical" | "warning" | "info" {
		switch (severity?.toLowerCase()) {
			case "error":
				return "critical";
			case "warning":
				return "warning";
			default:
				return "info";
		}
	}

	/**
	 * Normalize Biome rule name to type
	 */
	private normalizeType(category: string): string {
		// Extract rule name from category like "lint/correctness/noUnusedVariables"
		const parts = category.split("/");
		return parts[parts.length - 1] || category;
	}

	/**
	 * Get suggested fix for common issues
	 */
	private getSuggestedFix(type: string): string | undefined {
		const fixes: Record<string, string> = {
			noUnusedImports: "Remove the unused import",
			noUnusedVariables: "Remove or use the variable",
			noNonNullAssertion: "Use proper null check instead of !",
			noExplicitAny: "Use a specific type instead of any",
			useBlockStatements: "Add braces around the statement",
			noConsole: "Use a logger instead of console",
		};
		return fixes[type];
	}
}
