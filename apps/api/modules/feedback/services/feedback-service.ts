/**
 * Feedback Service - Handles feedback database operations
 *
 * Per C-002: All database queries go through service layer
 * Manages user feedback and NPS survey submissions
 */

import { feedback } from "@snapback/platform";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface SubmitFeedbackInput {
	userId: string;
	apiKeyId: string;
	sessionId?: string;
	category: "bug" | "feature" | "question" | "other";
	message: string;
	email?: string;
	userAgent?: string;
	url?: string;
	timestamp: Date;
}

export interface SubmitNPSInput {
	userId: string;
	apiKeyId: string;
	sessionId?: string;
	score: number;
	reason?: string;
	timestamp: Date;
}

export interface NPSResult {
	success: boolean;
	category: "promoter" | "passive" | "detractor";
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Submit user feedback to database
 */
export async function submitUserFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean }> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	await db.insert(feedback).values({
		userId: input.userId,
		apiKeyId: input.apiKeyId,
		sessionId: input.sessionId,
		feedbackType: input.category,
		feedbackText: input.message,
		metadata: {
			email: input.email,
			userAgent: input.userAgent,
			url: input.url,
		},
		timestamp: input.timestamp,
	});

	return { success: true };
}

/**
 * Submit NPS survey response
 */
export async function submitNPSSurvey(input: SubmitNPSInput): Promise<NPSResult> {
	const db = getDb();
	if (!db) throw new Error("Database not available");

	// Calculate NPS category
	const category = input.score >= 9 ? "promoter" : input.score >= 7 ? "passive" : "detractor";

	await db.insert(feedback).values({
		userId: input.userId,
		apiKeyId: input.apiKeyId,
		sessionId: input.sessionId,
		feedbackType: "nps",
		feedbackText: input.reason,
		rating: input.score,
		metadata: {
			category,
		},
		timestamp: input.timestamp,
	});

	return {
		success: true,
		category,
	};
}

/**
 * Send feedback to Slack webhook (notification only, not database)
 */
export async function sendFeedbackToSlack(params: {
	category: string;
	message: string;
	userEmail?: string;
	url?: string;
	userId?: string;
}): Promise<void> {
	if (!process.env.SLACK_FEEDBACK_WEBHOOK) {
		return; // Slack not configured
	}

	await fetch(process.env.SLACK_FEEDBACK_WEBHOOK, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: `New ${params.category} feedback from ${params.userEmail || "anonymous"}`,
			blocks: [
				{
					type: "section",
					text: {
						type: "mrkdwn",
						text: `*${params.category.toUpperCase()} Feedback*\n${params.message}`,
					},
				},
				{
					type: "context",
					elements: [
						{
							type: "mrkdwn",
							text: `User: ${params.userEmail || "N/A"} | URL: ${params.url || "N/A"}`,
						},
					],
				},
			],
		}),
	});
}
