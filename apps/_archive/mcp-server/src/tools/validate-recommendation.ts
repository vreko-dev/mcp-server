/**
 * AI Recommendation Validator Tool
 *
 * Validates AI-suggested package installations/upgrades using hybrid 3-layer approach:
 * - Layer 1: Dependency cascade detection (npm registry)
 * - Layer 2: Breaking change detection (GitHub API)
 * - Layer 3: Migration guidance (local/future)
 *
 * Replaces Context7 with free, self-hosted alternative.
 *
 * @module validate-recommendation
 */

import { logger } from "@snapback/infrastructure";
import type { StorageAdapter } from "@snapback/sdk";
import { HybridDocService } from "../services/HybridDocService.js";

export interface ValidateRecommendationInput {
	packageName: string;
	targetVersion: string;
	currentPackageJson: {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	context?: {
		aiAssistant?: string; // e.g., "Cursor", "GitHub Copilot"
		recommendationReason?: string;
	};
}

export interface ValidateRecommendationOutput {
	safe: boolean;
	risks: Array<{
		type: string;
		package: string;
		current: string;
		required: string;
		severity: "critical" | "high" | "medium" | "low";
		recommendation?: string;
	}>;
	breakingChanges: Array<{
		version: string;
		hasBreakingChanges: boolean;
		changelog: string;
		keywords: string[];
	}>;
	migrationGuidance: string | null;
	recommendation: "proceed" | "review-required" | "block";
	summary: string;
	layersExecuted: string[];
}

/**
 * Validate AI recommendation for package installation/upgrade
 */
export async function validateRecommendation(
	input: ValidateRecommendationInput,
	storage?: StorageAdapter,
): Promise<ValidateRecommendationOutput> {
	const startTime = Date.now();

	logger.info("Validating AI recommendation", {
		package: input.packageName,
		version: input.targetVersion,
		aiAssistant: input.context?.aiAssistant,
	});

	const hybridService = new HybridDocService(storage);

	// Combine all dependency types into single map
	const currentDependencies = {
		...input.currentPackageJson.dependencies,
		...input.currentPackageJson.devDependencies,
		...input.currentPackageJson.peerDependencies,
	};

	try {
		// Run validation through hybrid service
		const validationResult = await hybridService.validateRecommendation(
			input.packageName,
			input.targetVersion,
			currentDependencies,
		);

		// Determine recommendation level
		let recommendation: "proceed" | "review-required" | "block";
		let summary: string;

		if (validationResult.safe) {
			recommendation = "proceed";
			summary = `✅ Safe to install ${input.packageName}@${input.targetVersion}`;
		} else {
			const hasCritical = validationResult.risks.some((r) => r.severity === "critical");
			const hasHighRisk = validationResult.risks.some((r) => r.severity === "high");
			const hasBreaking = validationResult.breakingChanges.some((b) => b.hasBreakingChanges);

			if (hasCritical) {
				recommendation = "block";
				summary = `🛑 BLOCKED: Critical issues detected with ${input.packageName}@${input.targetVersion}`;
			} else if (hasHighRisk || hasBreaking) {
				recommendation = "review-required";
				summary = `⚠️ REVIEW REQUIRED: Potential breaking changes in ${input.packageName}@${input.targetVersion}`;
			} else {
				recommendation = "proceed";
				summary = `⚠️ Proceed with caution for ${input.packageName}@${input.targetVersion}`;
			}
		}

		const output: ValidateRecommendationOutput = {
			safe: validationResult.safe,
			risks: validationResult.risks,
			breakingChanges: validationResult.breakingChanges,
			migrationGuidance: validationResult.migrationGuidance,
			recommendation,
			summary,
			layersExecuted: validationResult.layersExecuted,
		};

		const duration = Date.now() - startTime;
		logger.info("Recommendation validation complete", {
			package: input.packageName,
			recommendation,
			layersExecuted: validationResult.layersExecuted.length,
			duration,
		});

		return output;
	} catch (error) {
		logger.error("Recommendation validation failed", {
			error: error instanceof Error ? error.message : String(error),
			package: input.packageName,
		});

		// Return conservative result on error
		return {
			safe: false,
			risks: [],
			breakingChanges: [],
			migrationGuidance: null,
			recommendation: "review-required",
			summary: `⚠️ Unable to validate ${input.packageName}@${input.targetVersion} - proceed with caution`,
			layersExecuted: [],
		};
	}
}

/**
 * Format output for AI consumption
 */
export function formatForAI(output: ValidateRecommendationOutput): string {
	const lines: string[] = [output.summary, ""];

	// Risk section
	if (output.risks.length > 0) {
		lines.push("🔍 **Dependency Issues:**");
		for (const risk of output.risks) {
			const emoji = risk.severity === "critical" ? "🔴" : risk.severity === "high" ? "🟡" : "🔵";
			lines.push(`${emoji} ${risk.type}: ${risk.package}`);
			lines.push(`   Current: ${risk.current}`);
			lines.push(`   Required: ${risk.required}`);
			if (risk.recommendation) {
				lines.push(`   Fix: ${risk.recommendation}`);
			}
			lines.push("");
		}
	}

	// Breaking changes section
	if (output.breakingChanges.length > 0) {
		const breakingVersions = output.breakingChanges.filter((b) => b.hasBreakingChanges);
		if (breakingVersions.length > 0) {
			lines.push("⚠️ **Breaking Changes Detected:**");
			for (const change of breakingVersions) {
				lines.push(`- Version ${change.version}`);
				if (change.keywords.length > 0) {
					lines.push(`  Keywords: ${change.keywords.join(", ")}`);
				}
			}
			lines.push("");
		}
	}

	// Migration guidance
	if (output.migrationGuidance) {
		lines.push("📖 **Migration Guidance:**");
		lines.push(output.migrationGuidance);
		lines.push("");
	}

	// Final recommendation
	lines.push("**Recommendation:**");
	if (output.recommendation === "proceed") {
		lines.push("✅ Safe to proceed with installation");
	} else if (output.recommendation === "review-required") {
		lines.push("⚠️ Review required before installation");
		lines.push("- Check changelog for breaking changes");
		lines.push("- Test in development environment");
		lines.push("- Update code if needed");
	} else {
		lines.push("🛑 Installation blocked");
		lines.push("- Critical issues must be resolved first");
		lines.push("- Consider alternative versions or packages");
	}

	return lines.join("\n");
}
