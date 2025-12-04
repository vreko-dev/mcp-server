import { createHash } from "node:crypto";
import { logger } from "@snapback/infrastructure";
import {
	type NewWaitlistAuditLog,
	waitlistAuditLogs,
} from "@snapback/platform";
import { getDb } from "../../../src/services/database";

// Sanitize string input to prevent XSS
export function sanitizeString(
	input: string | undefined,
	maxLength = 200,
): string | undefined {
	if (!input) {
		return undefined;
	}
	// Strip HTML tags and limit length
	return input
		.replace(/<[^>]*>/g, "")
		.replace(/[<>'"]/g, "")
		.slice(0, maxLength)
		.trim();
}

// Sanitize metadata object
export function sanitizeMetadata(
	metadata: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
	if (!metadata) {
		return undefined;
	}
	const sanitized: Record<string, string> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (typeof value === "string") {
			const clean = sanitizeString(value, 500);
			if (clean) {
				sanitized[key] = clean;
			}
		}
	}
	return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

// Hash email for PII protection
export function hashEmail(email: string): string {
	return createHash("sha256")
		.update(email.toLowerCase())
		.digest("hex")
		.slice(0, 16);
}

// Verify Cloudflare Turnstile token
export async function verifyTurnstileToken(
	token: string,
	remoteIP?: string,
): Promise<boolean> {
	const secret = process.env.TURNSTILE_SECRET_KEY;

	if (!secret) {
		logger.warn(
			"Turnstile secret not configured - skipping verification in development",
		);
		return process.env.NODE_ENV === "development"; // Only allow in development
	}

	try {
		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					secret,
					response: token,
					remoteip: remoteIP,
				}),
			},
		);

		const data = (await response.json()) as {
			success: boolean;
			"error-codes"?: string[];
		};
		return data.success === true;
	} catch (error) {
		logger.error("Turnstile verification failed", { error });
		return false;
	}
}

// Helper function to create audit log
export async function createAuditLog(log: NewWaitlistAuditLog) {
	try {
		const db = getDb();
		if (!db) {
			logger.error("Database not available for audit log");
			return;
		}
		await getDb().insert(waitlistAuditLogs).values(log);
	} catch (error) {
		logger.error("Failed to create audit log", { error });
	}
}
