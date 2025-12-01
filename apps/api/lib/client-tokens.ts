import { hash, verify } from "@node-rs/argon2";
import { clientTokens } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "../src/services/database";

// Generate a new client token with sbt_ prefix
export function generateClientToken(): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const prefix = "sbt_";
	let result = prefix;
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Hash a client token for storage
export async function hashClientToken(token: string): Promise<string> {
	return await hash(token, {
		// recommended minimum parameters
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});
}

// Verify a client token against its hash
export async function verifyClientToken(token: string, tokenHash: string): Promise<boolean> {
	return await verify(tokenHash, token);
}

// Create a new client token in the database
export async function createClientToken(
	userId: string,
	name: string,
	permissions?: {
		maxSnapshots?: number;
		cloudBackup?: boolean;
		advancedDetection?: boolean;
		customRules?: boolean;
		teamSharing?: boolean;
	},
): Promise<{ id: string; token: string }> {
	const token = generateClientToken();
	const hashedToken = await hashClientToken(token);
	const tokenPreview = token.substring(0, 8);

	const result = await getDb()
		?.insert(clientTokens)
		.values({
			userId,
			name,
			token: hashedToken,
			tokenPreview,
			permissions: permissions || {},
		})
		.returning({ id: clientTokens.id });

	return {
		id: result?.[0]?.id || "",
		token,
	};
}

// Validate a client token
export async function validateClientToken(token: string): Promise<{
	valid: boolean;
	userId?: string;
	permissions?: Record<string, unknown>;
}> {
	const db = getDb();
	if (!db) {
		return { valid: false };
	}

	// Find client token in database (using token preview for initial lookup)
	const tokenPreview = token.substring(0, 8);
	const tokens = await getDb().select().from(clientTokens).where(eq(clientTokens.tokenPreview, tokenPreview));

	// Verify the full token using argon2
	let validToken = null;
	for (const t of tokens) {
		if (await verifyClientToken(token, t.token)) {
			validToken = t;
			break;
		}
	}

	if (!validToken) {
		return { valid: false };
	}

	// Check if token is expired or revoked
	const now = new Date();
	if (validToken.expiresAt && validToken.expiresAt < now) {
		return { valid: false };
	}
	if (validToken.revokedAt && validToken.revokedAt < now) {
		return { valid: false };
	}

	return {
		valid: true,
		userId: validToken.userId,
		permissions: validToken.permissions as Record<string, unknown>,
	};
}
