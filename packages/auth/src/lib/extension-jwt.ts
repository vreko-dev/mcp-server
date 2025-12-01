/**
 * Extension JWT Authentication
 *
 * JWT access token signing and verification for extension authentication.
 * Uses HS256 algorithm with shared secret (BETTER_AUTH_SECRET).
 *
 * Token Lifecycle:
 * - Access tokens: 15 minutes (900 seconds)
 * - Refresh tokens: 90 days (stored in extension_sessions table)
 *
 * Security:
 * - Audience: "snapback-extension"
 * - Issuer: APP_URL (https://console.snapback.dev)
 * - Session validation: Checks extension_sessions table for revocation
 *
 * @package @snapback/auth
 */

import { type JWTPayload, jwtVerify, SignJWT } from "jose";

/**
 * Extension Access Token Payload
 *
 * Compact JWT claims to minimize token size.
 */
export interface ExtensionAccessTokenPayload extends JWTPayload {
	/** User ID (subject) */
	sub: string;
	/** Workspace/Organization ID (optional) */
	w?: string;
	/** Client type (vscode, cli, mcp) */
	c: "vscode" | "cli" | "mcp";
	/** Extension session ID (for revocation checking) */
	esid: string;
}

/**
 * Extension Authentication Context
 *
 * Extracted from verified JWT, used in API middleware.
 */
export interface ExtensionAuthContext {
	userId: string;
	workspaceId?: string;
	client: "vscode" | "cli" | "mcp";
	sessionId: string;
}

/**
 * Sign Extension Access Token
 *
 * Creates a short-lived JWT access token for extension authentication.
 *
 * @param payload - Token payload with user, workspace, client, and session info
 * @param secret - Shared secret (BETTER_AUTH_SECRET)
 * @param issuer - Issuer claim (APP_URL, defaults to https://console.snapback.dev)
 * @returns Signed JWT string
 *
 * @example
 * ```ts
 * const accessToken = await signExtensionAccessToken(
 *   {
 *     sub: "user_123",
 *     w: "workspace_456",
 *     c: "vscode",
 *     esid: "session_789"
 *   },
 *   process.env.BETTER_AUTH_SECRET!,
 *   process.env.APP_URL
 * );
 * ```
 */
export async function signExtensionAccessToken(
	payload: Omit<ExtensionAccessTokenPayload, "iat" | "exp" | "aud" | "iss">,
	secret: string,
	issuer = "https://console.snapback.dev",
): Promise<string> {
	const secretKey = new TextEncoder().encode(secret);
	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + 900; // 15 minutes

	const tokenPayload: Record<string, string | undefined> = {
		sub: payload.sub as string,
		w: payload.w as string | undefined,
		c: payload.c as string,
		esid: payload.esid as string,
	};

	const jwt = await new SignJWT(tokenPayload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(iat)
		.setExpirationTime(exp)
		.setAudience("snapback-extension")
		.setIssuer(issuer)
		.sign(secretKey);

	return jwt;
}

/**
 * Verify Extension Access Token
 *
 * Validates JWT signature, expiration, audience, and issuer.
 * Does NOT check session revocation (that's done in middleware).
 *
 * @param token - JWT access token string
 * @param secret - Shared secret (BETTER_AUTH_SECRET)
 * @param issuer - Expected issuer (APP_URL, defaults to https://console.snapback.dev)
 * @returns Authenticated context with user, workspace, client, and session
 * @throws Error if token is invalid, expired, or claims mismatch
 *
 * @example
 * ```ts
 * try {
 *   const authContext = await verifyExtensionAccessToken(
 *     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     process.env.BETTER_AUTH_SECRET!,
 *     process.env.APP_URL
 *   );
 *   console.log("User:", authContext.userId);
 *   console.log("Workspace:", authContext.workspaceId);
 * } catch (error) {
 *   console.error("Invalid token:", error.message);
 * }
 * ```
 */
export async function verifyExtensionAccessToken(
	token: string,
	secret: string,
	issuer = "https://console.snapback.dev",
): Promise<ExtensionAuthContext> {
	const secretKey = new TextEncoder().encode(secret);

	try {
		const { payload } = await jwtVerify(token, secretKey, {
			audience: "snapback-extension",
			issuer,
		});

		// Type guard: Ensure required claims exist
		if (
			typeof payload.sub !== "string" ||
			typeof payload.c !== "string" ||
			typeof payload.esid !== "string"
		) {
			throw new Error("Missing required JWT claims");
		}

		return {
			userId: payload.sub,
			workspaceId: payload.w as string | undefined,
			client: payload.c as "vscode" | "cli" | "mcp",
			sessionId: payload.esid,
		};
	} catch (error) {
		// Map jose errors to user-friendly messages
		if (error instanceof Error) {
			if (error.message.includes("expired")) {
				throw new Error("Access token expired");
			}
			if (error.message.includes("audience")) {
				throw new Error("Invalid token audience");
			}
			if (error.message.includes("issuer")) {
				throw new Error("Invalid token issuer");
			}
			if (error.message.includes("signature")) {
				throw new Error("Invalid token signature");
			}
		}
		throw new Error("Invalid or expired access token");
	}
}

/**
 * Extract JWT Payload Without Verification
 *
 * Decodes JWT payload without verifying signature.
 * Useful for debugging or extracting claims before validation.
 *
 * WARNING: DO NOT use for authentication - always verify first!
 *
 * @param token - JWT access token string
 * @returns Decoded payload (unverified)
 *
 * @example
 * ```ts
 * const payload = decodeExtensionAccessToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
 * console.log("User ID:", payload.sub);
 * console.log("Expires at:", new Date(payload.exp! * 1000));
 * ```
 */
export function decodeExtensionAccessToken(
	token: string,
): ExtensionAccessTokenPayload {
	const [, payloadBase64] = token.split(".");
	if (!payloadBase64) {
		throw new Error("Invalid JWT format");
	}

	const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
	return JSON.parse(payloadJson) as ExtensionAccessTokenPayload;
}
