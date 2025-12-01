/**
 * JWT Helper for E2E Tests
 * Creates signed JWTs for testing tool authentication
 */

import { importPKCS8, SignJWT } from "jose";
import { TEST_JWT_PRIVATE_KEY } from "./jwt-keys";

export interface JWTPayload {
	sub: string; // user ID
	email?: string;
	org_id?: string;
	plan?: string;
}

/**
 * Generate a signed JWT for testing
 * Use this to test tool authentication (CLI, VSCode, MCP)
 */
export async function generateTestJWT(payload: JWTPayload): Promise<string> {
	// Import the test private key
	const privateKey = await importPKCS8(TEST_JWT_PRIVATE_KEY, "RS256");

	// Create and sign the JWT
	const jwt = await new SignJWT(payload)
		.setProtectedHeader({ alg: "RS256" })
		.setIssuer("https://api.snapback.dev")
		.setAudience(["vscode", "mcp", "cli"])
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(privateKey);

	return jwt;
}

/**
 * Generate an expired JWT for testing expiration handling
 */
export async function generateExpiredJWT(payload: JWTPayload): Promise<string> {
	const privateKey = await importPKCS8(TEST_JWT_PRIVATE_KEY, "RS256");

	const jwt = await new SignJWT(payload)
		.setProtectedHeader({ alg: "RS256" })
		.setIssuer("https://api.snapback.dev")
		.setAudience(["vscode", "mcp", "cli"])
		.setIssuedAt(Math.floor(Date.now() / 1000) - 1000) // 1000 seconds ago
		.setExpirationTime("-1s") // Already expired
		.sign(privateKey);

	return jwt;
}
