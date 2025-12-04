import crypto from "node:crypto";
import { logger } from "@snapback/infrastructure";
import { apiKeyMetadata, securityEvents } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "../src/services/database";

export async function verifyRequestSignature(
	apiKeyId: string,
	signature: string,
	payload: string,
): Promise<boolean> {
	try {
		const db = getDb();
		if (!db) {
			return false;
		}

		// Get API key metadata
		const result = await getDb()
			.select()
			.from(apiKeyMetadata)
			.where(eq(apiKeyMetadata.apiKeyId, apiKeyId));

		if (!result || result.length === 0 || !result[0]) {
			return false;
		}

		const metadata = result[0];
		if (!metadata.signingSecret) {
			logger.warn("API key missing signing secret", { apiKeyId });
			return false;
		}

		// Use the dedicated signing secret field for HMAC-SHA256 verification
		const signingSecret = metadata.signingSecret;

		// Calculate expected signature
		const expectedSignature = crypto
			.createHmac("sha256", signingSecret)
			.update(payload)
			.digest("hex");

		// Constant-time comparison
		return crypto.timingSafeEqual(
			Buffer.from(signature, "hex"),
			Buffer.from(expectedSignature, "hex"),
		);
	} catch (error) {
		logger.error("Error verifying request signature", { error });
		return false;
	}
}

export function generateSigningSecret(): string {
	return crypto.randomBytes(32).toString("hex");
}

export async function trackSecurityEvent(event: {
	userId?: string;
	apiKeyId?: string;
	eventType: string;
	severity: string;
	metadata?: any;
}) {
	try {
		const db = getDb();
		if (!db) {
			return;
		}

		await getDb()
			.insert(securityEvents)
			.values({
				id: Date.now(), // Use timestamp as ID for now
				userId: event.userId || undefined,
				apiKeyId: event.apiKeyId || undefined,
				eventType: event.eventType,
				severity: event.severity as
					| "debug"
					| "info"
					| "warning"
					| "error"
					| "critical",
				ipAddress: event.metadata?.ipAddress || undefined,
				userAgent: event.metadata?.userAgent || undefined,
				endpoint: event.metadata?.endpoint || undefined,
				detectionMethod: event.metadata?.detectionMethod || undefined,
				metadata: event.metadata || {},
				createdAt: new Date(),
			});
	} catch (error) {
		logger.error("Error tracking security event", { error });
	}
}
