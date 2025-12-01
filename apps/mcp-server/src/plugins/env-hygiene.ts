import type { AnalysisPlugin, AnalysisResult } from "@snapback/core";

/**
 * .env hygiene plugin
 * Detects potential security issues in .env files:
 * - Key-like entries that might be secrets
 * - Insecure configurations
 * - Missing required security settings
 */
export class EnvHygienePlugin implements AnalysisPlugin {
	name = "env-hygiene";

	/**
	 * Analyze .env file content for hygiene issues
	 * @param content The content of the .env file
	 * @param filePath The path of the file being analyzed
	 * @param metadata Additional metadata (including changedLines for diff-aware analysis)
	 * @returns Analysis result with score, factors, and recommendations
	 */
	async analyze(content: string, filePath?: string, metadata?: any): Promise<AnalysisResult> {
		const factors: string[] = [];
		const recommendations: string[] = [];
		let maxSeverity: "low" | "medium" | "high" = "low";

		// Severity levels for comparison
		const severityLevels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];

		// Check if this is a .env file (not .env.example or .env.sample)
		const isEnvFile =
			filePath &&
			(filePath.endsWith(".env") ||
				filePath.endsWith(".env.local") ||
				filePath.endsWith(".env.development") ||
				filePath.endsWith(".env.production"));

		const isEnvExample = filePath && (filePath.endsWith(".env.example") || filePath.endsWith(".env.sample"));

		// Skip analysis for .env.example files as they're meant to be templates
		if (isEnvExample) {
			return {
				score: 0,
				factors: [],
				recommendations: [],
			};
		}

		// Only analyze actual .env files
		if (!isEnvFile) {
			return {
				score: 0,
				factors: [],
				recommendations: [],
			};
		}

		// Get the lines that should be analyzed based on changedLines metadata
		const linesToAnalyze = this.getLinesToAnalyze(content, metadata);

		// Check for key-like entries that might be secrets
		const keyLikeEntries = this.detectKeyLikeEntries(linesToAnalyze);
		if (keyLikeEntries.length > 0) {
			factors.push(...keyLikeEntries.map((entry) => `Key-like entry detected: ${entry.key}`));
			const keySeverity = "high";
			if (severityLevels.indexOf(keySeverity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = keySeverity;
			}
		}

		// Check for common insecure configurations
		const insecureConfigs = this.detectInsecureConfigurations(linesToAnalyze);
		if (insecureConfigs.length > 0) {
			factors.push(...insecureConfigs.map((config) => `Insecure configuration: ${config}`));
			const configSeverity = "medium";
			if (severityLevels.indexOf(configSeverity) > severityLevels.indexOf(maxSeverity)) {
				maxSeverity = configSeverity;
			}
		}

		// Calculate score based on findings
		let score = 0;
		if (factors.length > 0) {
			// Higher score for high/medium findings
			if (maxSeverity === "high") {
				score = 0.8;
			} else if (maxSeverity === "medium") {
				score = 0.5;
			} else {
				score = 0.3;
			}
		}

		if (factors.length > 0) {
			recommendations.push("Move secrets to secure secret management systems");
			recommendations.push("Use .env.example as a template without actual values");
			recommendations.push("Review all key-like entries for sensitive data");
		}

		return {
			score,
			factors,
			recommendations,
			severity: maxSeverity,
		};
	}

	/**
	 * Get lines to analyze based on changedLines metadata for diff-aware analysis
	 * @param content File content
	 * @param metadata Metadata containing changedLines information
	 * @returns Array of lines to analyze
	 */
	private getLinesToAnalyze(content: string, metadata?: any): string[] {
		const lines = content.split("\n");

		// If no metadata or changedLines, analyze all lines
		if (!metadata || !metadata.changedLines) {
			return lines;
		}

		// Filter lines based on changedLines metadata
		return lines.filter((_, index) => metadata.changedLines.includes(index + 1));
	}

	/**
	 * Detect key-like entries that might be secrets
	 * @param lines Lines to analyze
	 * @returns Array of detected key-like entries
	 */
	private detectKeyLikeEntries(lines: string[]): { key: string; value: string }[] {
		const findings: { key: string; value: string }[] = [];
		const keyLikePatterns = [
			/(?:^|[^a-zA-Z0-9_])(?:api[_-]?key|secret|token|password|auth|access[_-]?key)[_=-]?\s*=\s*(.*)/i,
			/^([A-Z][A-Z0-9_]*(?:[-_][A-Z0-9]+)*)\s*=\s*(.+)$/,
		];

		for (const line of lines) {
			// Skip comments and empty lines
			if (line.trim().startsWith("#") || line.trim() === "") {
				continue;
			}

			// Check for key-like patterns
			for (const pattern of keyLikePatterns) {
				const match = line.match(pattern);
				if (match) {
					const key = match[1].trim();
					const value = match[2] ? match[2].trim() : "";

					// Skip if value is empty or looks like a placeholder
					if (
						!value ||
						value === "" ||
						value.includes("your") ||
						value.includes("example") ||
						value.includes("placeholder")
					) {
						continue;
					}

					// Skip if it looks like a variable reference
					if (value.startsWith("$") || value.includes("${")) {
						continue;
					}

					// Skip common non-sensitive keys
					const nonSensitiveKeys = ["node_env", "port", "host", "debug", "log_level"];
					if (nonSensitiveKeys.some((nsKey) => key.toLowerCase().includes(nsKey))) {
						continue;
					}

					findings.push({ key, value });
				}
			}
		}

		return findings;
	}

	/**
	 * Detect insecure configurations
	 * @param lines Lines to analyze
	 * @returns Array of detected insecure configurations
	 */
	private detectInsecureConfigurations(lines: string[]): string[] {
		const findings: string[] = [];
		const insecurePatterns = [
			{ pattern: /debug\s*=\s*(true|1|on)/i, message: "Debug mode enabled", severity: "medium" as const },
			{ pattern: /ssl\s*=\s*(false|0|off)/i, message: "SSL disabled", severity: "medium" as const },
			{
				pattern: /node_env\s*=\s*development/i,
				message: "Development environment in production",
				severity: "medium" as const,
			},
			{ pattern: /log_level\s*=\s*(debug|silly)/i, message: "Verbose logging level", severity: "low" as const },
		];

		for (const line of lines) {
			// Skip comments and empty lines
			if (line.trim().startsWith("#") || line.trim() === "") {
				continue;
			}

			// Check for insecure patterns
			for (const { pattern, message, severity } of insecurePatterns) {
				if (pattern.test(line)) {
					findings.push(message);
					// For this plugin, we'll keep the highest severity as 'medium' for insecure configs
				}
			}
		}

		return findings;
	}
}
