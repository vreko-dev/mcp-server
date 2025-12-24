/**
 * Layer 2.2: AI Tool Risk Calculation
 *
 * Calculates risk based on AI tool × file category matrix with confidence scaling.
 */

import type { AIDetection, AITool, AIToolRiskResult, FileCategory } from "./types";
import { FileCategory as FileCategoryEnum } from "./types";

// =============================================================================
// AI TOOL × FILE CATEGORY RISK MATRIX
// =============================================================================

/**
 * Risk scores (0-100) for each AI tool × file category combination
 *
 * These are initial estimates based on observed patterns.
 * Layer 3 (personalization) will refine these from aggregate telemetry.
 */
const AI_TOOL_FILE_RISK: Record<AITool, Record<FileCategory, number>> = {
	cursor: {
		[FileCategoryEnum.ROOT_CONFIG]: 85,
		[FileCategoryEnum.BUILD_CONFIG]: 80,
		[FileCategoryEnum.ENV_CONFIG]: 75,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 75,
		[FileCategoryEnum.ENTRY_POINT]: 70,
		[FileCategoryEnum.SHARED_EXPORT]: 65,
		[FileCategoryEnum.TYPE_DEFINITION]: 60,
		[FileCategoryEnum.DOMAIN_LOGIC]: 55,
		[FileCategoryEnum.COMPONENT]: 50,
		[FileCategoryEnum.HOOK]: 55,
		[FileCategoryEnum.UTILITY]: 55,
		[FileCategoryEnum.TEST_FILE]: 35,
		[FileCategoryEnum.STYLE]: 40,
		[FileCategoryEnum.ASSET]: 20,
		[FileCategoryEnum.DOCUMENTATION]: 15,
	},

	copilot: {
		[FileCategoryEnum.ROOT_CONFIG]: 70,
		[FileCategoryEnum.BUILD_CONFIG]: 65,
		[FileCategoryEnum.ENV_CONFIG]: 70,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 65,
		[FileCategoryEnum.ENTRY_POINT]: 60,
		[FileCategoryEnum.SHARED_EXPORT]: 55,
		[FileCategoryEnum.TYPE_DEFINITION]: 50,
		[FileCategoryEnum.DOMAIN_LOGIC]: 45,
		[FileCategoryEnum.COMPONENT]: 40,
		[FileCategoryEnum.HOOK]: 45,
		[FileCategoryEnum.UTILITY]: 45,
		[FileCategoryEnum.TEST_FILE]: 30,
		[FileCategoryEnum.STYLE]: 35,
		[FileCategoryEnum.ASSET]: 15,
		[FileCategoryEnum.DOCUMENTATION]: 10,
	},

	claude: {
		[FileCategoryEnum.ROOT_CONFIG]: 60,
		[FileCategoryEnum.BUILD_CONFIG]: 55,
		[FileCategoryEnum.ENV_CONFIG]: 60,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 55,
		[FileCategoryEnum.ENTRY_POINT]: 55,
		[FileCategoryEnum.SHARED_EXPORT]: 50,
		[FileCategoryEnum.TYPE_DEFINITION]: 45,
		[FileCategoryEnum.DOMAIN_LOGIC]: 50,
		[FileCategoryEnum.COMPONENT]: 45,
		[FileCategoryEnum.HOOK]: 50,
		[FileCategoryEnum.UTILITY]: 50,
		[FileCategoryEnum.TEST_FILE]: 25,
		[FileCategoryEnum.STYLE]: 30,
		[FileCategoryEnum.ASSET]: 10,
		[FileCategoryEnum.DOCUMENTATION]: 10,
	},

	windsurf: {
		[FileCategoryEnum.ROOT_CONFIG]: 80,
		[FileCategoryEnum.BUILD_CONFIG]: 75,
		[FileCategoryEnum.ENV_CONFIG]: 75,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 70,
		[FileCategoryEnum.ENTRY_POINT]: 65,
		[FileCategoryEnum.SHARED_EXPORT]: 60,
		[FileCategoryEnum.TYPE_DEFINITION]: 55,
		[FileCategoryEnum.DOMAIN_LOGIC]: 55,
		[FileCategoryEnum.COMPONENT]: 50,
		[FileCategoryEnum.HOOK]: 55,
		[FileCategoryEnum.UTILITY]: 55,
		[FileCategoryEnum.TEST_FILE]: 30,
		[FileCategoryEnum.STYLE]: 35,
		[FileCategoryEnum.ASSET]: 15,
		[FileCategoryEnum.DOCUMENTATION]: 12,
	},

	aider: {
		[FileCategoryEnum.ROOT_CONFIG]: 75,
		[FileCategoryEnum.BUILD_CONFIG]: 70,
		[FileCategoryEnum.ENV_CONFIG]: 70,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 70,
		[FileCategoryEnum.ENTRY_POINT]: 65,
		[FileCategoryEnum.SHARED_EXPORT]: 60,
		[FileCategoryEnum.TYPE_DEFINITION]: 55,
		[FileCategoryEnum.DOMAIN_LOGIC]: 60,
		[FileCategoryEnum.COMPONENT]: 55,
		[FileCategoryEnum.HOOK]: 60,
		[FileCategoryEnum.UTILITY]: 60,
		[FileCategoryEnum.TEST_FILE]: 35,
		[FileCategoryEnum.STYLE]: 40,
		[FileCategoryEnum.ASSET]: 20,
		[FileCategoryEnum.DOCUMENTATION]: 15,
	},

	unknown: {
		[FileCategoryEnum.ROOT_CONFIG]: 80,
		[FileCategoryEnum.BUILD_CONFIG]: 75,
		[FileCategoryEnum.ENV_CONFIG]: 75,
		[FileCategoryEnum.WORKSPACE_CONFIG]: 70,
		[FileCategoryEnum.ENTRY_POINT]: 70,
		[FileCategoryEnum.SHARED_EXPORT]: 65,
		[FileCategoryEnum.TYPE_DEFINITION]: 60,
		[FileCategoryEnum.DOMAIN_LOGIC]: 60,
		[FileCategoryEnum.COMPONENT]: 55,
		[FileCategoryEnum.HOOK]: 60,
		[FileCategoryEnum.UTILITY]: 60,
		[FileCategoryEnum.TEST_FILE]: 35,
		[FileCategoryEnum.STYLE]: 40,
		[FileCategoryEnum.ASSET]: 20,
		[FileCategoryEnum.DOCUMENTATION]: 15,
	},
};

// =============================================================================
// EDIT TYPE MULTIPLIERS
// =============================================================================

/**
 * Risk multipliers based on edit type
 */
const EDIT_TYPE_MULTIPLIER: Record<string, number> = {
	completion: 0.8, // Single completions are lower risk
	chat: 1.0, // Chat-based edits are baseline
	agent: 1.3, // Agent mode (autonomous) is higher risk
	unknown: 1.0,
};

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate AI tool risk score (0-100)
 */
export function calculateAiToolRisk(aiDetection: AIDetection, fileCategory: FileCategory): AIToolRiskResult {
	const reasoning: string[] = [];

	// No AI detected
	if (!aiDetection.detected) {
		return {
			score: 0,
			reasoning: ["No AI tool detected - manual edit"],
		};
	}

	// Get base risk from matrix
	const toolRisks = AI_TOOL_FILE_RISK[aiDetection.tool] ?? AI_TOOL_FILE_RISK.unknown;
	const baseRisk = toolRisks[fileCategory] ?? 50;

	// Apply confidence scaling
	// Lower confidence in detection = higher risk (we're less sure it's AI)
	// But high confidence AI is still risky, so we don't reduce much
	const confidenceMultiplier =
		aiDetection.confidence > 0.9
			? 1.0 // Very confident detection
			: 1 + (1 - aiDetection.confidence) * 0.3; // Less confident = +30% risk

	// Apply edit type multiplier
	const editMultiplier = EDIT_TYPE_MULTIPLIER[aiDetection.editType] ?? 1.0;

	// Calculate final score
	const finalScore = Math.min(100, baseRisk * confidenceMultiplier * editMultiplier);

	// Build reasoning
	reasoning.push(`AI tool: ${aiDetection.tool} (${aiDetection.editType} mode)`);

	if (editMultiplier > 1) {
		reasoning.push(`Agent mode increases risk by ${((editMultiplier - 1) * 100).toFixed(0)}%`);
	}

	if (confidenceMultiplier > 1.1) {
		reasoning.push(
			`Low detection confidence (${(aiDetection.confidence * 100).toFixed(0)}%) adds ${((confidenceMultiplier - 1) * 100).toFixed(0)}% risk`,
		);
	}

	if (baseRisk >= 70) {
		reasoning.push(`${aiDetection.tool} has high risk profile for ${fileCategory}`);
	}

	return {
		score: finalScore,
		reasoning,
	};
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get AI tool risk profile for a specific tool
 */
export function getAiToolRiskProfile(tool: AITool): {
	avgRisk: number;
	highestRiskCategories: Array<{ category: FileCategory; risk: number }>;
	lowestRiskCategories: Array<{ category: FileCategory; risk: number }>;
} {
	const risks = AI_TOOL_FILE_RISK[tool] ?? AI_TOOL_FILE_RISK.unknown;
	const entries = Object.entries(risks) as Array<[FileCategory, number]>;

	// Calculate average
	const avgRisk = entries.reduce((sum, [_, risk]) => sum + risk, 0) / entries.length;

	// Sort by risk
	const sorted = [...entries].sort((a, b) => b[1] - a[1]);

	return {
		avgRisk,
		highestRiskCategories: sorted.slice(0, 3).map(([cat, risk]) => ({
			category: cat,
			risk,
		})),
		lowestRiskCategories: sorted.slice(-3).map(([cat, risk]) => ({
			category: cat,
			risk,
		})),
	};
}

/**
 * Compare risk profiles between two AI tools
 */
export function compareAiTools(
	tool1: AITool,
	tool2: AITool,
	fileCategory: FileCategory,
): {
	saferTool: AITool;
	riskDifference: number;
} {
	const risk1 = AI_TOOL_FILE_RISK[tool1]?.[fileCategory] ?? 50;
	const risk2 = AI_TOOL_FILE_RISK[tool2]?.[fileCategory] ?? 50;

	return {
		saferTool: risk1 < risk2 ? tool1 : tool2,
		riskDifference: Math.abs(risk1 - risk2),
	};
}

/**
 * Get default risk when AI detection fails
 */
export function getDefaultAiRisk(fileCategory: FileCategory): number {
	return AI_TOOL_FILE_RISK.unknown[fileCategory] ?? 50;
}
