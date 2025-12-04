import { createId as cuid } from "@paralleldrive/cuid2";
import {
	analysisEvents,
	apiKeys,
	ruleViolations,
	userSafetyProfiles,
} from "@snapback/platform";
import { SecretDetector } from "@snapback/policy-engine";
import { eq } from "drizzle-orm";
import { getDb } from "./database";

// Types for secret detection
export type FileChange = {
	path: string;
	content: string;
	changeType?: "added" | "modified" | "deleted";
	linesAdded?: number;
	linesDeleted?: number;
	totalLines?: number;
};

export type SecretDetectionRequest = {
	files: FileChange[];
	userId: string;
	apiKeyId: string;
	workspaceId?: string;
	commitMessage?: string;
	branchName?: string;
};

export type SecretFinding = {
	id: string;
	type: string;
	severity: "low" | "medium" | "high";
	message: string;
	filePath: string;
	lineNumber?: number;
	column?: number;
	match: string;
	confidence: number;
	remediation?: string;
};

export type SecretDetectionResult = {
	detectionId: string;
	findings: SecretFinding[];
	riskScore: number;
	riskLevel: "low" | "medium" | "high";
	summary: string;
	recommendations: string[];
	timestamp: string;
};

export class SecretDetectionService {
	private detector = new SecretDetector();

	/**
	 * Detect secrets in code changes using advanced algorithms
	 */
	async detectSecrets(
		request: SecretDetectionRequest,
	): Promise<SecretDetectionResult> {
		const detectionId = cuid();
		const startTime = Date.now();
		const db = getDb();

		try {
			// Get user's API key to check permissions
			const apiKeyResult = await db
				.select()
				.from(apiKeys)
				.where(eq(apiKeys.id, request.apiKeyId))
				.limit(1);

			if (!apiKeyResult || apiKeyResult.length === 0) {
				throw new Error("Invalid API key");
			}

			const apiKey = apiKeyResult[0];
			const permissions = apiKey.permissions as {
				advancedDetection?: boolean;
				secretDetection?: boolean;
			};

			// Check if secret detection is enabled for this API key
			if (!permissions.secretDetection) {
				throw new Error(
					JSON.stringify({
						error: "Secret detection not available on your plan",
						upgradeUrl: "/pricing",
						feature: "secretDetection",
						requiredPlan: "team",
					}),
				);
			}

			// Initialize detection results
			const findings: SecretFinding[] = [];
			let totalRiskScore = 0;

			// Use consolidated SecretDetector from policy-engine
			for (const file of request.files) {
				// Skip binary files and large files for performance
				if (this.isBinaryFile(file.path) || file.content.length > 1000000) {
					continue;
				}

				// Detect secrets using consolidated detector
				const detectionResult = this.detector.detect(file.content, file.path);

				// Convert policy-engine findings to API format
				for (const finding of detectionResult.findings) {
					const apiFinding: SecretFinding = {
						id: cuid(),
						type: finding.type,
						severity: this.mapSeverity(finding.severity),
						message: `Potential ${finding.type} found`,
						filePath: file.path,
						lineNumber: finding.line,
						column: finding.column,
						match: finding.snippet,
						confidence: this.calculateConfidence(
							finding.severity,
							finding.entropy,
						),
						remediation: this.getRemediation(finding.type),
					};
					findings.push(apiFinding);
					totalRiskScore += this.calculateRiskScoreForFinding(apiFinding);
				}

				// Add risk score from detector (0-10 scale) to total
				totalRiskScore += detectionResult.riskScore * 10; // Scale to 0-100
			}

			// Cap risk score at 100
			const finalRiskScore = Math.min(100, totalRiskScore);

			// Determine risk level
			const riskLevel: "low" | "medium" | "high" =
				finalRiskScore < 30 ? "low" : finalRiskScore < 70 ? "medium" : "high";

			// Generate recommendations
			const recommendations: string[] = [];
			if (findings.length > 0) {
				recommendations.push(
					"Review all detected secrets and rotate them immediately",
				);
				recommendations.push(
					"Use environment variables or secure vaults for sensitive data",
				);
				recommendations.push(
					"Implement pre-commit hooks to prevent secret exposure",
				);
			}

			// Generate summary
			const summary = `${findings.length} secret${findings.length === 1 ? "" : "s"} detected`;

			// Log findings to database
			for (const finding of findings) {
				await db.insert(ruleViolations).values({
					id: finding.id,
					userId: request.userId,
					apiKeyId: request.apiKeyId,
					ruleId: finding.type,
					ruleName: finding.type,
					ruleCategory: "secret_detection",
					filePath: finding.filePath,
					lineStart: finding.lineNumber,
					characterStart: finding.column,
					severity: finding.severity,
					confidence: Math.round(finding.confidence * 100),
					matchText: finding.match,
					description: finding.message,
					remediation: finding.remediation,
					metadata: {
						detectionType: "server_side",
						confidence: finding.confidence,
					},
					timestamp: new Date(),
					createdAt: new Date(),
				});
			}

			// Log detection event to database
			await db.insert(analysisEvents).values({
				id: detectionId,
				userId: request.userId,
				apiKeyId: request.apiKeyId,
				workspaceId: request.workspaceId,
				riskScore: finalRiskScore,
				riskLevel,
				riskFactors: findings.map((f) => ({
					type: f.type,
					severity: f.severity,
					message: f.message,
				})),
				detectedPatterns: findings.map((f) => ({
					patternId: f.id,
					type: f.type,
					match: f.match,
					line: f.lineNumber || 0,
					severity: f.severity,
				})),
				analysisTimeMs: Date.now() - startTime,
				clientType: "api",
				clientVersion: "1.0.0",
				gitBranch: request.branchName,
				projectId: request.workspaceId,
				requestId: detectionId,
				timestamp: new Date(),
				createdAt: new Date(),
			});

			// Update user safety profile
			await this.updateUserSafetyProfile(request.userId, finalRiskScore);

			// Return detection result
			return {
				detectionId,
				findings,
				riskScore: finalRiskScore,
				riskLevel,
				summary,
				recommendations,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			// Log error to database
			await db.insert(analysisEvents).values({
				id: detectionId,
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
				requestId: detectionId,
				timestamp: new Date(),
				createdAt: new Date(),
			});

			throw error;
		}
	}

	/**
	 * Map policy-engine severity to API severity
	 */
	private mapSeverity(
		severity: "low" | "medium" | "high" | "critical",
	): "low" | "medium" | "high" {
		if (severity === "critical") {
			return "high";
		}
		return severity;
	}

	/**
	 * Calculate confidence based on severity and entropy
	 */
	private calculateConfidence(
		severity: "low" | "medium" | "high" | "critical",
		entropy?: number,
	): number {
		const baseSeverityConfidence = {
			critical: 0.95,
			high: 0.9,
			medium: 0.7,
			low: 0.5,
		};

		let confidence = baseSeverityConfidence[severity];

		// Adjust confidence based on entropy if available
		if (entropy !== undefined && entropy > 4.5) {
			confidence = Math.min(0.95, confidence + 0.1);
		}

		return confidence;
	}

	/**
	 * Get remediation advice for a secret type
	 */
	private getRemediation(type: string): string {
		const remediationMap: Record<string, string> = {
			"AWS Access Key":
				"Rotate the AWS access key and use IAM roles instead when possible",
			"AWS Secret Key": "Rotate the AWS secret key immediately",
			"GitHub Token":
				"Revoke the GitHub token and generate a new one with minimal permissions",
			"Stripe API Key": "Rotate the Stripe API key immediately",
			"Generic API Key":
				"Verify if this is a real API key and rotate it if necessary",
			"Private Key Header":
				"Remove the private key and rotate the corresponding public key",
			"Bearer Token": "Rotate the bearer token immediately",
			"Password Assignment":
				"Use environment variables or secure configuration management instead",
			"OAuth Token": "Rotate the OAuth token and review OAuth scopes",
			"High-Entropy String":
				"Verify if this is a secret and rotate it if necessary",
		};

		return (
			remediationMap[type] ||
			"Review and rotate if this is a sensitive credential"
		);
	}

	/**
	 * Check if a file is likely binary
	 */
	private isBinaryFile(filePath: string): boolean {
		const binaryExtensions = [
			".png",
			".jpg",
			".jpeg",
			".gif",
			".bmp",
			".ico",
			".pdf",
			".zip",
			".tar",
			".gz",
			".exe",
			".dll",
			".so",
			".dylib",
			".class",
			".o",
			".obj",
			".bin",
		];

		return binaryExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
	}

	/**
	 * Calculate risk score for a finding
	 */
	private calculateRiskScoreForFinding(finding: SecretFinding): number {
		let score = 0;

		// Base score based on severity
		switch (finding.severity) {
			case "high":
				score += 40;
				break;
			case "medium":
				score += 20;
				break;
			case "low":
				score += 10;
				break;
		}

		// Adjust based on confidence
		score *= finding.confidence;

		return Math.round(score);
	}

	/**
	 * Update user safety profile based on detection results
	 */
	private async updateUserSafetyProfile(
		userId: string,
		riskScore: number,
	): Promise<void> {
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
			const totalRiskScore =
				(profile.averageRiskScore || 0) * profile.totalAnalyses + riskScore;
			const newAverageRiskScore = totalRiskScore / totalAnalyses;
			const highRiskAnalyses =
				riskScore >= 70 ? profile.totalBlocked + 1 : profile.totalBlocked;

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
	 * Get recent secret detection history for a user
	 */
	async getDetectionHistory(
		userId: string,
		limit = 10,
	): Promise<(typeof analysisEvents.$inferSelect)[]> {
		const db = getDb();
		return await db
			.select()
			.from(analysisEvents)
			.where(eq(analysisEvents.userId, userId))
			.orderBy(analysisEvents.timestamp)
			.limit(limit);
	}

	/**
	 * Get findings for a specific detection
	 */
	async getFindings(
		detectionId: string,
	): Promise<(typeof ruleViolations.$inferSelect)[]> {
		const db = getDb();
		return await db
			.select()
			.from(ruleViolations)
			.where(eq(ruleViolations.id, detectionId));
	}
}
