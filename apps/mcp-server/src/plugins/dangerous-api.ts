import type { AnalysisPlugin, AnalysisResult } from "@snapback/core";

/**
 * Dangerous API detection plugin
 * Detects dangerous JavaScript/TypeScript APIs like eval(), Function constructor,
 * and child_process.exec() that can execute arbitrary code
 */
export class DangerousAPIPlugin implements AnalysisPlugin {
	name = "dangerous-api";

	async analyze(content: string, _filePath?: string, metadata?: any): Promise<AnalysisResult> {
		const factors: string[] = [];
		const recommendations: string[] = [];
		let maxSeverity: "low" | "medium" | "high" = "low";

		// Severity levels for comparison
		const severityLevels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];

		// Get the lines that should be analyzed based on changedLines metadata
		const linesToAnalyze = this.getLinesToAnalyze(content, metadata);

		// Check for dangerous APIs
		const dangerousAPIFindings = this.detectDangerousAPIs(linesToAnalyze);
		if (dangerousAPIFindings.length > 0) {
			factors.push(...dangerousAPIFindings.map((f) => `Dangerous API detected: ${f}`));
			const apiSeverity = "high";
			if (severityLevels.indexOf(apiSeverity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = apiSeverity;
			}
		}

		// Calculate score based on findings
		let score = 0;
		if (factors.length > 0) {
			// Higher score for high findings
			if (maxSeverity === "high") {
				score = 0.8;
			} else {
				score = 0.5;
			}
		}

		if (factors.length > 0) {
			recommendations.push("Avoid using dangerous APIs that can execute arbitrary code");
			recommendations.push("Use safer alternatives or properly sanitize inputs");
		}

		return {
			score,
			factors,
			recommendations,
			severity: maxSeverity,
		};
	}

	/**
	 * Get lines that should be analyzed based on changedLines metadata
	 * If no metadata or changedLines, analyze all lines
	 */
	private getLinesToAnalyze(content: string, metadata?: any): string[] {
		const allLines = content.split("\n");

		// If no metadata or changedLines, analyze all lines
		if (!metadata || !metadata.changedLines) {
			return allLines;
		}

		// Filter lines based on changedLines metadata (+/- halo)
		const changedLineNumbers = new Set(metadata.changedLines);
		return allLines.filter((_, index) => changedLineNumbers.has(index + 1));
	}

	/**
	 * Detect dangerous APIs in JavaScript/TypeScript code
	 */
	private detectDangerousAPIs(lines: string[]): string[] {
		const findings: string[] = [];

		for (const line of lines) {
			// Skip comments
			if (this.isComment(line)) {
				continue;
			}

			// Check for eval() usage
			if (/\beval\s*\(/.test(line)) {
				findings.push("eval() usage detected");
			}

			// Check for Function constructor usage
			if (/\bnew\s+Function\s*\(/.test(line) || /\bFunction\s*\(/.test(line)) {
				findings.push("Function constructor usage detected");
			}

			// Check for child_process.exec() usage
			if (/\bchild_process\.exec\s*\(/.test(line) || /\bexec\s*\(/.test(line)) {
				findings.push("child_process.exec() usage detected");
			}

			// Check for child_process.execSync() usage
			if (/\bchild_process\.execSync\s*\(/.test(line)) {
				findings.push("child_process.execSync() usage detected");
			}

			// Check for child_process.spawn() usage
			if (/\bchild_process\.spawn\s*\(/.test(line)) {
				findings.push("child_process.spawn() usage detected");
			}

			// Check for vm.runInThisContext() usage
			if (/\bvm\.runInThisContext\s*\(/.test(line)) {
				findings.push("vm.runInThisContext() usage detected");
			}

			// Check for vm.runInNewContext() usage
			if (/\bvm\.runInNewContext\s*\(/.test(line)) {
				findings.push("vm.runInNewContext() usage detected");
			}
		}

		return findings;
	}

	/**
	 * Check if a line is a comment
	 */
	private isComment(line: string): boolean {
		// Trim whitespace
		const trimmed = line.trim();

		// Check for comments
		if (
			trimmed.startsWith("//") ||
			trimmed.startsWith("#") ||
			trimmed.startsWith("/*") ||
			trimmed.startsWith("*")
		) {
			return true;
		}

		return false;
	}
}
