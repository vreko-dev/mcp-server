import { Guardian, MockReplacementPlugin, PhantomDependencyPlugin, SecretDetectionPlugin } from "@snapback/core";
import { z } from "zod";

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

	// Initialize Guardian with all plugins
	const guardian = new Guardian();
	guardian.addPlugin(new SecretDetectionPlugin());
	guardian.addPlugin(new MockReplacementPlugin());
	guardian.addPlugin(new PhantomDependencyPlugin());

	// Convert changes to a format Guardian can analyze
	// For now, we'll join all the changed lines into a single string for analysis
	const content = parsed.changes.map((change) => change.value).join("\n");

	try {
		// Run Guardian analysis
		const result = await guardian.analyze(content, "mcp-diff");

		// Determine decision based on risk score
		let decision: "Apply" | "Review" = "Apply";
		if (result.score >= 8) {
			decision = "Review";
		} else if (result.score >= 5) {
			decision = "Review";
		}

		return {
			decision,
			riskScore: result.score,
			reasons: result.factors,
			recommendations: result.recommendations || [],
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
