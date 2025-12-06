import type { AiSuggestion, ProtectionLevel } from "./types";

/**
 * Stubbed AI risk detection and suggestion heuristics
 * In a real implementation, this would use an actual AI model
 */
export function getAiSuggestions(context: {
	content: string;
	previousContent?: string;
	filePath: string;
	protectionLevel: ProtectionLevel;
}): AiSuggestion[] {
	const suggestions: AiSuggestion[] = [];
	const changes = context.previousContent
		? detectChanges(context.previousContent, context.content)
		: { added: context.content, removed: "" };

	// Simple heuristics for demo purposes
	const riskFactors = analyzeRiskFactors(
		context.content,
		changes,
		context.filePath,
	);

	// Calculate confidence based on risk factors
	const confidence = calculateConfidence(riskFactors);

	// If confidence is high enough, suggest actions
	if (confidence >= 0.8) {
		suggestions.push({
			confidence,
			requireCheckpoint: true,
			reason: "High-risk changes detected",
		});

		// Suggest upgrading protection level for very high confidence
		if (confidence >= 0.9 && context.protectionLevel !== "block") {
			suggestions.push({
				confidence,
				suggestLevelUpgrade: getNextProtectionLevel(context.protectionLevel),
				requireCheckpoint: false,
				reason:
					"Very high-risk changes detected, consider increasing protection",
			});
		}
	} else if (confidence >= 0.5) {
		// Medium confidence suggestions
		suggestions.push({
			confidence,
			requireCheckpoint: false,
			reason: "Medium-risk changes detected, consider manual review",
		});
	}

	return suggestions;
}

/**
 * Detects changes between two versions of content
 */
function detectChanges(
	oldContent: string,
	newContent: string,
): { added: string; removed: string } {
	// This is a simplified change detection for demo purposes
	// A real implementation would use a diffing algorithm

	const oldLines = oldContent.split("\n");
	const newLines = newContent.split("\n");

	const addedLines = newLines.filter((line) => !oldLines.includes(line));
	const removedLines = oldLines.filter((line) => !newLines.includes(line));

	return {
		added: addedLines.join("\n"),
		removed: removedLines.join("\n"),
	};
}

/**
 * Analyzes risk factors in code changes
 */
function analyzeRiskFactors(
	_content: string,
	changes: { added: string; removed: string },
	filePath: string,
): Record<string, number> {
	const riskFactors: Record<string, number> = {};

	// Check for potentially dangerous patterns
	if (changes.added.includes("rm -rf")) {
		riskFactors.destructiveCommand = 0.9;
	}

	if (changes.added.includes("process.exit")) {
		riskFactors.processExit = 0.7;
	}

	if (changes.added.includes("eval(")) {
		riskFactors.dynamicCodeExecution = 0.8;
	}

	if (changes.added.includes("exec(") || changes.added.includes("spawn(")) {
		riskFactors.commandExecution = 0.7;
	}

	// Check for credential patterns
	if (/(password|secret|key|token)/i.test(changes.added)) {
		riskFactors.credentialsExposed = 0.8;
	}

	// File type specific risks
	if (filePath.endsWith(".sh") || filePath.endsWith(".bash")) {
		riskFactors.shellScript = 0.6;
	}

	if (filePath.endsWith(".sql")) {
		riskFactors.sqlFile = 0.5;
	}

	return riskFactors;
}

/**
 * Calculates overall confidence based on risk factors
 */
function calculateConfidence(riskFactors: Record<string, number>): number {
	if (Object.keys(riskFactors).length === 0) {
		return 0;
	}

	// Simple weighted average for demo purposes
	const totalWeight = Object.values(riskFactors).reduce(
		(sum, weight) => sum + weight,
		0,
	);
	const maxPossibleWeight = Object.keys(riskFactors).length;

	return Math.min(1, totalWeight / maxPossibleWeight);
}

/**
 * Gets the next protection level in the cycle
 */
function getNextProtectionLevel(
	currentLevel: ProtectionLevel,
): ProtectionLevel {
	const levels: ProtectionLevel[] = ["watch", "warn", "block"];
	const currentIndex = levels.indexOf(currentLevel);

	if (currentIndex >= 0 && currentIndex < levels.length - 1) {
		const nextLevel = levels[currentIndex + 1];
		if (nextLevel !== undefined) {
			return nextLevel;
		}
	}

	// If not found or already at highest level, return the first level
	return "watch";
}
