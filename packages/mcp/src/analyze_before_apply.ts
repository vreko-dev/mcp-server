/**
 * Analyze Before Apply - V2 Engine Implementation
 *
 * Migrated from V1 Guardian to use V2 signal-based analysis.
 * Uses threat detection signals directly instead of plugin system.
 */
import { z } from "zod";

// Threat patterns (migrated from V2 engine)
const THREAT_PATTERNS = {
	critical: [
		{ pattern: /rm\s+-rf/gi, description: "destructive rm -rf command", severity: 10 },
		{ pattern: /DROP\s+TABLE/gi, description: "DROP TABLE statement", severity: 10 },
		{ pattern: /TRUNCATE\s+TABLE/gi, description: "TRUNCATE TABLE statement", severity: 10 },
	],
	high: [
		{ pattern: /password\s*[:=]\s*['"][^'"]+['"]/, description: "hardcoded password", severity: 8 },
		{ pattern: /AKIA[A-Z0-9]{16}/, description: "AWS access key", severity: 9 },
		{ pattern: /ghp_[a-zA-Z0-9]{36}/, description: "GitHub token", severity: 9 },
		{ pattern: /eval\(/, description: "eval() usage", severity: 8 },
	],
	medium: [
		{ pattern: /jest\.mock\(/, description: "jest.mock in production", severity: 5 },
		{ pattern: /vi\.mock\(/, description: "vitest mock in production", severity: 5 },
		{ pattern: /exec\(/, description: "exec() command execution", severity: 5 },
	],
};

// Define the structure for diff changes
interface DiffChange {
	added?: boolean;
	removed?: boolean;
	value: string;
	count?: number;
}

// Define the input schema for analyzeBeforeApply
const AnalyzeBeforeApplyInputSchema = z.object({
	changes: z.array(
		z.object({
			added: z.boolean().optional().default(false),
			removed: z.boolean().optional().default(false),
			value: z.string(),
			count: z.number().optional(),
		}),
	),
});

// Define the result structure
interface AnalysisResult {
	decision: "Apply" | "Review";
	riskScore: number;
	reasons: string[];
	recommendations: string[];
}

/**
 * Analyze code changes before applying them to determine if they should be applied automatically or require review
 *
 * @param changes - Array of diff changes to analyze
 * @returns Analysis result with decision and reasons
 */
export async function analyzeBeforeApply(changes: DiffChange[]): Promise<AnalysisResult> {
	// Validate input
	const parsed = AnalyzeBeforeApplyInputSchema.parse({ changes });

	// Convert changes to content for analysis
	const content = parsed.changes.map((change) => change.value).join("\n");

	try {
		// Run V2 threat detection directly
		const threats: Array<{ description: string; severity: number }> = [];

		for (const level of ["critical", "high", "medium"] as const) {
			for (const threat of THREAT_PATTERNS[level]) {
				// Reset lastIndex for global regexes
				threat.pattern.lastIndex = 0;
				if (threat.pattern.test(content)) {
					threats.push({ description: threat.description, severity: threat.severity });
				}
			}
		}

		// Calculate risk score (max severity found, or 0 if none)
		const riskScore = threats.length > 0 ? Math.max(...threats.map((t) => t.severity)) : 0;

		// Determine decision based on risk score
		const decision: "Apply" | "Review" = riskScore >= 5 ? "Review" : "Apply";

		return {
			decision,
			riskScore,
			reasons: threats.map((t) => t.description),
			recommendations:
				threats.length > 0 ? ["Review detected issues before applying", "Consider security implications"] : [],
		};
	} catch (error) {
		// In case of analysis error, default to requiring review
		return {
			decision: "Review",
			riskScore: 10, // High risk score to ensure review
			reasons: [`Analysis error: ${error instanceof Error ? error.message : "Unknown error"}`],
			recommendations: ["Review changes manually due to analysis failure"],
		};
	}
}

/**
 * Format the analysis result for display
 *
 * @param result - Analysis result to format
 * @returns Formatted string representation of the result
 */
export function formatAnalysisResult(result: AnalysisResult): string {
	const decisionText = result.decision === "Apply" ? "✅ Safe to Apply" : "⚠️  Review Required";

	let output = `${decisionText} (Risk Score: ${result.riskScore}/10)\n\n`;

	if (result.reasons.length > 0) {
		output += "Reasons:\n";
		for (const reason of result.reasons) {
			output += `  • ${reason}\n`;
		}
		output += "\n";
	}

	if (result.recommendations.length > 0) {
		output += "Recommendations:\n";
		for (const recommendation of result.recommendations) {
			output += `  • ${recommendation}\n`;
		}
		output += "\n";
	}

	return output;
}

// Export types for external use
export type { DiffChange, AnalysisResult };
