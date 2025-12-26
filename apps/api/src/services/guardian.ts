import { analysisEvents, apiKeys, ruleViolations, userSafetyProfiles } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { nanoid as cuid } from "nanoid";
import { getDb } from "./database";

// Types for our analysis
export type FileChange = {
	path: string;
	content: string;
	changeType?: "added" | "modified" | "deleted";
	linesAdded?: number;
	linesDeleted?: number;
	totalLines?: number;
};

export type CustomRule = {
	name: string;
	pattern: string; // Regex pattern as string
	severity: "low" | "medium" | "high";
	filePattern?: string;
};

export type AnalysisRequest = {
	files: FileChange[];
	customRules?: CustomRule[];
	userId: string;
	apiKeyId: string;
	workspaceId?: string;
	commitMessage?: string;
	branchName?: string;
};

export type RiskFactor = {
	type: string;
	severity: "low" | "medium" | "high";
	message: string;
	details?: Record<string, unknown>;
};

export type AnalysisResult = {
	analysisId: string;
	riskScore: number;
	riskLevel: "low" | "medium" | "high";
	riskFactors: RiskFactor[];
	summary: string;
	recommendations: string[];
	violations: {
		ruleId: string;
		filePath: string;
		lineNumber?: number;
		severity: "low" | "medium" | "high";
		message: string;
	}[];
	timestamp: string;
};

export class GuardianService {
	/**
	 * Analyze code changes for security and safety risks
	 */
	async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
		const analysisId = cuid();
		const startTime = Date.now();
		const db = getDb();

		try {
			// Get user's API key to check permissions
			const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.id, request.apiKeyId)).limit(1);

			if (!apiKeyResult || apiKeyResult.length === 0) {
				throw new Error("Invalid API key");
			}

			const apiKey = apiKeyResult[0];
			const permissions = apiKey.permissions as {
				advancedDetection?: boolean;
				customRules?: boolean;
			};

			// Initialize analysis results
			const riskFactors: RiskFactor[] = [];
			const violations: AnalysisResult["violations"] = [];
			let riskScore = 0;

			// 1. Basic pattern detection (available to all tiers)
			for (const file of request.files) {
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

							// Log violation to database
							const violationId = cuid();
							await db.insert(ruleViolations).values({
								id: violationId,
								userId: request.userId,
								apiKeyId: request.apiKeyId,
								ruleId: violationId,
								ruleName: secretPattern.name,
								ruleCategory: "secret_detection",
								filePath: file.path,
								severity: "high",
								description: `Secret detected: ${secretPattern.name}`,
								metadata: {
									secretType: secretPattern.name,
									confidence: 0.95,
								},
								timestamp: new Date(),
								createdAt: new Date(),
							});

							violations.push({
								ruleId: violationId,
								filePath: file.path,
								severity: "high",
								message: `Secret detected: ${secretPattern.name}`,
							});

							riskScore += secretPattern.weight;
							break; // Only count once per file
						}
					}
				}

				// Detect dependency changes
				if (file.path.includes("package.json") && file.changeType === "modified") {
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
			if (permissions.advancedDetection) {
				// Detect major refactoring
				const totalChanges = request.files.reduce(
					(sum, f) => sum + (f.linesAdded || 0) + (f.linesDeleted || 0),
					0,
				);

				if (totalChanges > 300) {
					const churnRate =
						request.files.reduce((sum, f) => {
							if (!f.totalLines) {
								return sum;
							}
							const churn = ((f.linesAdded || 0) + (f.linesDeleted || 0)) / f.totalLines;
							return sum + churn;
						}, 0) / request.files.length;

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
			}

			// 3. Custom rules (Team plan only)
			if (request.customRules && request.customRules.length > 0) {
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
				for (const rule of request.customRules) {
					const pattern = new RegExp(rule.pattern);
					const filePattern = rule.filePattern ? new RegExp(rule.filePattern) : null;

					for (const file of request.files) {
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

							// Log violation to database
							const violationId = cuid();
							await db.insert(ruleViolations).values({
								id: violationId,
								userId: request.userId,
								apiKeyId: request.apiKeyId,
								ruleId: violationId,
								ruleName: rule.name,
								ruleCategory: "custom_rule",
								filePath: file.path,
								severity: rule.severity,
								description: `${rule.name} violation`,
								metadata: {
									ruleName: rule.name,
								},
								timestamp: new Date(),
								createdAt: new Date(),
							});

							violations.push({
								ruleId: violationId,
								filePath: file.path,
								severity: rule.severity,
								message: `${rule.name} violation`,
							});

							riskScore += rule.severity === "high" ? 25 : rule.severity === "medium" ? 15 : 10;
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
			const summary = `${
				riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)
			} risk: ${riskFactors.length} factor${riskFactors.length === 1 ? "" : "s"} detected`;

			// 8. Log analysis event to database
			await db.insert(analysisEvents).values({
				id: analysisId,
				userId: request.userId,
				apiKeyId: request.apiKeyId,
				workspaceId: request.workspaceId,
				riskScore: finalRiskScore,
				riskLevel,
				riskFactors: riskFactors,
				detectedPatterns: [],
				analysisTimeMs: Date.now() - startTime,
				clientType: "api",
				clientVersion: "1.0.0",
				gitBranch: request.branchName,
				projectId: request.workspaceId,
				requestId: analysisId,
				timestamp: new Date(),
				createdAt: new Date(),
			});

			// 9. Update user safety profile
			await this.updateUserSafetyProfile(request.userId, finalRiskScore);

			// 10. Return analysis result
			return {
				analysisId,
				riskScore: finalRiskScore,
				riskLevel,
				riskFactors,
				summary,
				recommendations,
				violations,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			// Log error to database
			await db.insert(analysisEvents).values({
				id: analysisId,
				userId: request.userId,
				apiKeyId: request.apiKeyId,
				workspaceId: request.workspaceId,
				riskScore: 0,
				riskLevel: "low",
				riskFactors: [],
				detectedPatterns: [],
				analysisTimeMs: Date.now() - startTime,
				clientType: "api",
				clientVersion: "1.0.0",
				gitBranch: request.branchName,
				projectId: request.workspaceId,
				requestId: analysisId,
				timestamp: new Date(),
				createdAt: new Date(),
			});

			throw error;
		}
	}

	/**
	 * Update user safety profile based on analysis results
	 */
	private async updateUserSafetyProfile(userId: string, riskScore: number): Promise<void> {
		const db = getDb();
		// Get existing profile or create new one
		const existingProfile = await db
			.select()
			.from(userSafetyProfiles)
			.where(eq(userSafetyProfiles.userId, userId))
			.limit(1);

		if (existingProfile.length > 0) {
			// Update existing profile
			const profile = existingProfile[0];
			const totalAnalyses = profile.totalAnalyses + 1;
			const totalRiskScore = (profile.averageRiskScore || 0) * profile.totalAnalyses + riskScore;
			const newAverageRiskScore = totalRiskScore / totalAnalyses;
			const highRiskAnalyses = riskScore >= 70 ? profile.totalBlocked + 1 : profile.totalBlocked;

			await db
				.update(userSafetyProfiles)
				.set({
					totalAnalyses,
					averageRiskScore: Math.round(newAverageRiskScore),
					totalBlocked: highRiskAnalyses,
					updatedAt: new Date(),
				})
				.where(eq(userSafetyProfiles.userId, userId));
		} else {
			// Create new profile
			await db.insert(userSafetyProfiles).values({
				id: cuid(),
				userId,
				totalAnalyses: 1,
				averageRiskScore: riskScore,
				totalBlocked: riskScore >= 70 ? 1 : 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	}

	/**
	 * Get recent analysis history for a user
	 */
	async getAnalysisHistory(userId: string, limit = 10): Promise<(typeof analysisEvents.$inferSelect)[]> {
		const db = getDb();
		return await db
			.select()
			.from(analysisEvents)
			.where(eq(analysisEvents.userId, userId))
			.orderBy(analysisEvents.timestamp)
			.limit(limit);
	}

	/**
	 * Get violations for a specific analysis
	 */
	async getViolations(analysisId: string): Promise<(typeof ruleViolations.$inferSelect)[]> {
		const db = getDb();
		return await db.select().from(ruleViolations).where(eq(ruleViolations.id, analysisId));
	}

	/**
	 * Get user safety profile
	 */
	async getUserSafetyProfile(userId: string): Promise<typeof userSafetyProfiles.$inferSelect | null> {
		const db = getDb();
		const result = await db.select().from(userSafetyProfiles).where(eq(userSafetyProfiles.userId, userId)).limit(1);

		return result.length > 0 ? result[0] : null;
	}
}
