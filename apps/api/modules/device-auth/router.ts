/**
 * Device Authorization Flow oRPC Router
 *
 * This is a wrapper/reference router for the Better Auth device authorization endpoints.
 * Better Auth v1.3.34 provides the device-authorization plugin which handles RFC 8628.
 *
 * Endpoints (provided by Better Auth, exposed here for consistency):
 * - POST /api/auth/device/code - Request device code
 * - POST /api/auth/device/token - Poll for access token
 * - POST /api/auth/device/approve - Approve device code
 * - POST /api/auth/device/deny - Deny device code
 *
 * RFC 8628: https://tools.ietf.org/html/rfc8628
 */

import type { RouterClient } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../orpc/procedures";

/**
 * Base procedure for device auth operations
 * Uses publicProcedure for consistent context handling
 */
const baseDeviceAuthProcedure = publicProcedure;

/**
 * Device Code Request Schema (RFC 8628 Section 3.1)
 * Used to request initial device code from authorization server
 */
export const deviceCodeRequestSchema = z.object({
	client_id: z.string().min(1).describe("Unique identifier of the client making the request"),
	scope: z.string().optional().describe("Space-separated list of requested scopes"),
});

/**
 * Device Code Response Schema (RFC 8628 Section 3.2)
 * Server returns device code, user code, and polling instructions
 */
export const deviceCodeResponseSchema = z.object({
	device_code: z.string().min(40).describe("Device code for polling requests"),
	user_code: z
		.string()
		.regex(/^[A-Z0-9]{4,8}$/)
		.describe("User-friendly code to display on verification page"),
	verification_uri: z.string().url().describe("URL where user enters the user code"),
	verification_uri_complete: z
		.string()
		.url()
		.optional()
		.describe("Optional: Pre-filled verification URI with user code"),
	expires_in: z.number().int().min(600).describe("Seconds until device code expires (minimum 600 = 10 minutes)"),
	interval: z.number().int().min(5).default(5).describe("Recommended polling interval in seconds (minimum 5)"),
});

/**
 * Device Token Poll Schema (RFC 8628 Section 3.3)
 * Client polls server to check if user has approved the request
 */
export const deviceTokenPollSchema = z.object({
	device_code: z.string().min(40).describe("Device code from initial request"),
	grant_type: z.literal("urn:ietf:params:oauth:grant-type:device_code").describe("RFC 8628 grant type (fixed value)"),
	client_id: z.string().optional().describe("Client ID (optional for some implementations)"),
});

/**
 * Device Token Response Schema
 * Returned when user approves the device code
 */
export const deviceTokenResponseSchema = z.object({
	access_token: z.string().describe("Bearer token for API access"),
	token_type: z.literal("Bearer").describe("Token authentication method"),
	expires_in: z.number().int().positive().optional().describe("Token expiration time in seconds"),
	refresh_token: z.string().optional().describe("Optional refresh token for obtaining new access tokens"),
	scope: z.string().optional().describe("Granted scopes (space-separated)"),
});

/**
 * Device Auth Router - Wrapper for Better Auth device authorization
 *
 * The actual endpoints are provided by Better Auth v1.3.34's
 * deviceAuthorization plugin and are available at:
 * - POST /api/auth/device/code - Request device code
 * - POST /api/auth/device/token - Poll for access token
 * - POST /api/auth/device/approve - Approve device code (admin)
 * - POST /api/auth/device/deny - Deny device code (admin)
 *
 * This router wraps these endpoints in oRPC procedures for consistency
 * with the rest of the API and provides proper schema validation.
 */
export const deviceAuthRouter = {
	/**
	 * Request Device Code (RFC 8628 Section 3.1)
	 *
	 * Called by VS Code extension to start device authorization flow.
	 * Returns device code, user code, and verification URI.
	 */
	requestCode: baseDeviceAuthProcedure
		.input(deviceCodeRequestSchema)
		.output(deviceCodeResponseSchema)
		.handler(async ({ input }) => {
			// Proxy to Better Auth /device/code endpoint
			// Better Auth handles RFC 8628 compliance internally
			const response = await fetch("http://localhost:3001/api/auth/device/code", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!response.ok) {
				throw new Error(`Device code request failed: ${response.statusText}`);
			}

			return response.json() as Promise<z.infer<typeof deviceCodeResponseSchema>>;
		}),

	/**
	 * Poll for Token (RFC 8628 Section 3.3)
	 *
	 * Called by VS Code extension to poll for access token.
	 * Returns authorization_pending until user approves the code.
	 */
	pollToken: baseDeviceAuthProcedure
		.input(deviceTokenPollSchema)
		.output(
			deviceTokenResponseSchema.or(
				z.object({
					error: z.enum(["authorization_pending", "slow_down", "expired_token", "invalid_request"]),
					error_description: z.string().optional(),
				}),
			),
		)
		.handler(async ({ input }) => {
			// Proxy to Better Auth /device/token endpoint
			const response = await fetch("http://localhost:3001/api/auth/device/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!response.ok) {
				throw new Error(`Token polling failed: ${response.statusText}`);
			}

			return response.json() as Promise<
				| z.infer<typeof deviceTokenResponseSchema>
				| {
						error: "authorization_pending" | "slow_down" | "expired_token" | "invalid_request";
						error_description?: string;
				  }
			>;
		}),
};

export type DeviceAuthRouterClient = RouterClient<typeof deviceAuthRouter>;
