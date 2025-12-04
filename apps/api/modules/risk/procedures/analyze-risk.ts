import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { trackUsage } from "../../../lib/usage.js";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

// Risk factor types
type RiskFactor = {
	type: string;
	severity: "low" | "medium" | "high";
	message: string;
	details?: Record<string, any>;
};

// Input validation
const analyzeRiskSchema = z.object({
	files: z.array(
		z.object({
			path: z.string(),
			changeType: z.enum(["added", "modified", "deleted"]).optional(),
			linesAdded: z.number().optional(),
			linesDeleted: z.number().optional(),
			totalLines: z.number().optional(),
			content: z.string().optional(),
		}),
	),
	customRules: z
		.array(
			z.object({
				name: z.string(),
				pattern: z.string(), // Regex pattern as string
				severity: z.enum(["low", "medium", "high"]),
				filePattern: z.string().optional(),
			}),
		)
		.optional(),
});

export const analyzeRisk = protectedProcedure
	.input(analyzeRiskSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Get user's API key to check permissions
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		const apiKeyResult = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.userId, user.id))
			.limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			throw new Error("No API key found");
		}

		const apiKey = apiKeyResult[0];

		const permissions = apiKey.permissions as {
			advancedDetection?: boolean;
			customRules?: boolean;
		};

		// Initialize risk analysis
		const riskFactors: RiskFactor[] = [];
		let riskScore = 0;

		// 1. Basic pattern detection (available to all tiers)
		for (const file of input.files) {
			// Detect large deletions
			if (file.linesDeleted && file.totalLines && file.linesDeleted > 100) {
				const percentage = (file.linesDeleted / file.totalLines) * 100;
				const severity: "low" | "medium" | "high" =
					percentage > 80 ? "high" : percentage > 50 ? "medium" : "low";

				riskFactors.push({
					type: "large_deletion",
					severity,
					message: `Deleted ${file.linesDeleted} lines in ${file.path}`,
					details: {
						linesDeleted: file.linesDeleted,
						percentage: Math.round(percentage),
					},
				});

				riskScore += severity === "high" ? 30 : severity === "medium" ? 20 : 10;
			}

			// Detect potential secret exposure (basic patterns)
			if (file.content) {
				const secretPatterns = [
					{ name: "api_key", pattern: /api[_-]?key/i, weight: 40 },
					{ name: "password", pattern: /password/i, weight: 40 },
					{ name: "secret", pattern: /secret/i, weight: 35 },
					{ name: "token", pattern: /token/i, weight: 35 },
					{
						name: "private_key",
						pattern: /private[_-]?key/i,
						weight: 45,
					},
				];

				for (const secretPattern of secretPatterns) {
					if (secretPattern.pattern.test(file.content)) {
						riskFactors.push({
							type: "secret_exposure",
							severity: "high",
							message: `Potential secrets found in ${file.path}`,
							details: {
								secretTypes: [secretPattern.name],
								confidence: 0.95,
							},
						});

						riskScore += secretPattern.weight;
						break; // Only count once per file
					}
				}
			}

			// Detect dependency changes
			if (
				file.path.includes("package.json") &&
				file.changeType === "modified"
			) {
				riskFactors.push({
					type: "dependency_change",
					severity: "medium",
					message: "Dependencies modified in package.json",
					details: {
						added: [], // Would parse from content in real implementation
						removed: [],
					},
				});

				riskScore += 20;
			}

			// Detect configuration file changes
			const configFiles = [
				"tsconfig.json",
				".env",
				"webpack.config",
				"next.config",
				".github/workflows",
				"docker",
				"nginx.conf",
			];

			if (configFiles.some((pattern) => file.path.includes(pattern))) {
				riskFactors.push({
					type: "config_change",
					severity: "medium",
					message: `Configuration file modified: ${file.path}`,
				});

				riskScore += 15;
			}
		}

		// 2. Advanced detection (Solo/Team plans only)
		let advancedAnalysis:
			| {
					codeComplexity: number;
					testCoverage: number;
					maintainabilityIndex: number;
			  }
			| undefined;

		if (permissions.advancedDetection) {
			// Detect major refactoring
			const totalChanges = input.files.reduce(
				(sum, f) => sum + (f.linesAdded || 0) + (f.linesDeleted || 0),
				0,
			);

			if (totalChanges > 300) {
				const churnRate =
					input.files.reduce((sum, f) => {
						if (!f.totalLines) {
							return sum;
						}
						const churn =
							((f.linesAdded || 0) + (f.linesDeleted || 0)) / f.totalLines;
						return sum + churn;
					}, 0) / input.files.length;

				if (churnRate > 0.5) {
					riskFactors.push({
						type: "major_refactoring",
						severity: "high",
						message: "Major refactoring detected in core module",
						details: {
							churnRate: Math.round(churnRate * 100) / 100,
							complexity: "high",
						},
					});

					riskScore += 25;
				}
			}

			// Advanced metrics (mock values - would integrate with real analysis tools)
			advancedAnalysis = {
				codeComplexity: Math.random() * 10, // Mock: would use cyclomatic complexity
				testCoverage: Math.random() * 100, // Mock: would integrate with coverage tools
				maintainabilityIndex: Math.random() * 100, // Mock: would calculate actual index
			};
		} else if (
			input.files.some((f) => (f.linesAdded || 0) + (f.linesDeleted || 0) > 300)
		) {
			// User needs advanced detection but doesn't have it
			throw new Error(
				JSON.stringify({
					error: "Advanced detection not available on free plan",
					upgradeUrl: "/pricing",
					feature: "advancedDetection",
				}),
			);
		}

		// 3. Custom rules (Team plan only)
		if (input.customRules && input.customRules.length > 0) {
			if (!permissions.customRules) {
				throw new Error(
					JSON.stringify({
						error: "Custom rules not available on your plan",
						upgradeUrl: "/pricing",
						feature: "customRules",
						requiredPlan: "team",
					}),
				);
			}

			// Apply custom rules
			for (const rule of input.customRules) {
				const pattern = new RegExp(rule.pattern);
				const filePattern = rule.filePattern
					? new RegExp(rule.filePattern)
					: null;

				for (const file of input.files) {
					// Check file pattern match
					if (filePattern && !filePattern.test(file.path)) {
						continue;
					}

					// Check content pattern match
					if (file.content && pattern.test(file.content)) {
						riskFactors.push({
							type: "custom_rule_violation",
							severity: rule.severity,
							message: `${rule.name} in ${file.path}`,
							details: {
								ruleName: rule.name,
							},
						});

						riskScore +=
							rule.severity === "high"
								? 25
								: rule.severity === "medium"
									? 15
									: 10;
					}
				}
			}
		}

		// 4. Calculate final risk score (capped at 100)
		const finalRiskScore = Math.min(100, riskScore);

		// 5. Determine risk level
		const riskLevel: "low" | "medium" | "high" =
			finalRiskScore < 30 ? "low" : finalRiskScore < 70 ? "medium" : "high";

		// 6. Generate recommendations
		const recommendations: string[] = [];

		if (riskFactors.some((f) => f.type === "large_deletion")) {
			recommendations.push("Review deleted code carefully");
			recommendations.push("Ensure test coverage for affected areas");
		}

		if (riskFactors.some((f) => f.type === "secret_exposure")) {
			recommendations.push("Scan for exposed secrets before committing");
			recommendations.push("Use environment variables for sensitive data");
		}

		if (riskFactors.some((f) => f.type === "dependency_change")) {
			recommendations.push("Review dependency security advisories");
			recommendations.push("Run security audit (npm audit / yarn audit)");
		}

		if (riskFactors.some((f) => f.type === "config_change")) {
			recommendations.push("Test configuration changes in staging first");
			recommendations.push("Document configuration changes");
		}

		// 7. Generate summary
		const summary = `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk: ${riskFactors.length} factor${
			riskFactors.length === 1 ? "" : "s"
		} detected`;

		// 8. Track usage
		const analysisId = crypto.randomUUID();

		trackUsage({
			requestId: crypto.randomUUID(),
			apiKeyId: apiKey.id,
			userId: user.id,
			endpoint: "/api/risk/analyze",
			method: "POST",
			tokensUsed: 0,
			responseTime: 0,
			responseStatus: 200,
			cached: false,
			metadata: {
				analysisId,
				riskScore: finalRiskScore,
				factorsDetected: riskFactors.length,
			},
		}).catch(console.error);

		// 9. Return analysis result
		return {
			analysisId,
			riskScore: finalRiskScore,
			riskLevel,
			riskFactors,
			summary,
			recommendations,
			advancedAnalysis,
			timestamp: new Date().toISOString(),
		};
	});
