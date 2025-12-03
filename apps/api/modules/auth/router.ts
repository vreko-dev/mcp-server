import { z } from "zod";
import { procedure, router } from "@orpc/server";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { DeviceAuthHandler } from "../../services/device-auth-handler";
import { logger } from "@snapback/infrastructure";

/**
 * Device Auth Router
 * Implements RFC 8628 Device Authorization Grant Flow
 * Endpoints:
 * - POST /auth/device-code: Request device code for VS Code extension
 * - POST /auth/device-token: Poll for device token after user approves
 * - POST /auth/device-approve: User approves device auth in browser
 */
export function createDeviceAuthRouter(db: PgDatabase) {
	const handler = new DeviceAuthHandler(db);

	return router({
		/**
		 * Request device code
		 * Called by VS Code extension to initiate auth flow
		 * Returns device_code, user_code, and verification_uri
		 */
		requestDeviceCode: procedure
			.input(
				z.object({
					clientId: z.string().default("vscode-extension"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.object({
							device_code: z.string(),
							user_code: z.string(),
							verification_uri: z.string().url(),
							expires_in: z.number(),
							interval: z.number(),
						})
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.mutation(async ({ input }) => {
				try {
					const deviceCode = await handler.requestDeviceCode(input.clientId);

					logger.info("Device code requested", {
						clientId: input.clientId,
						userCode: deviceCode.user_code,
					});

					return {
						success: true,
						data: deviceCode,
						error: null,
					};
				} catch (error) {
					logger.error("Failed to request device code", {
						clientId: input.clientId,
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to request device code",
					};
				}
			}),

		/**
		 * Poll for device token
		 * Called by VS Code extension to check if user approved auth
		 * Returns api_key when approved, or authorization_pending while waiting
		 */
		pollDeviceToken: procedure
			.input(
				z.object({
					device_code: z.string().min(1, "Device code required"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.object({
							api_key: z.string().optional(),
							user_id: z.string().optional(),
							tier: z.string().optional(),
							error: z.enum(["authorization_pending"]).optional(),
						})
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.query(async ({ input }) => {
				try {
					const tokenResponse = await handler.pollDeviceToken(input.device_code);

					return {
						success: true,
						data: tokenResponse as Record<string, unknown>,
						error: null,
					};
				} catch (error) {
					logger.error("Failed to poll device token", {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to poll token",
					};
				}
			}),

		/**
		 * Approve device auth
		 * Called by browser after user authenticates and approves
		 * Links device_code to authenticated user
		 */
		approveDeviceAuth: procedure
			.input(
				z.object({
					user_code: z.string().min(1, "User code required"),
					userId: z.string().min(1, "User ID required"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					data: z
						.object({
							device_code: z.string(),
							approved: z.boolean(),
							approvedAt: z.date(),
						})
						.nullable(),
					error: z.string().nullable(),
				}),
			)
			.mutation(async ({ input }) => {
				try {
					// Validate user code format
					if (!handler.isValidUserCodeFormat(input.user_code)) {
						return {
							success: false,
							data: null,
							error: "Invalid user code format (expected XXXX-XXXX)",
						};
					}

					const result = await handler.approveDeviceAuth(input.user_code, input.userId);

					if (!result) {
						return {
							success: false,
							data: null,
							error: "User code not found or expired",
						};
					}

					logger.info("Device auth approved", {
						userId: input.userId,
						userCode: input.user_code,
					});

					return {
						success: true,
						data: {
							device_code: result.deviceCode,
							approved: result.approved === "true",
							approvedAt: result.approvedAt || new Date(),
						},
						error: null,
					};
				} catch (error) {
					logger.error("Failed to approve device auth", {
						userId: input.userId,
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						data: null,
						error: error instanceof Error ? error.message : "Failed to approve auth",
					};
				}
			}),

		/**
		 * Reject/cancel device auth
		 * Called by user to cancel device auth flow
		 */
		rejectDeviceAuth: procedure
			.input(
				z.object({
					user_code: z.string().min(1, "User code required"),
				}),
			)
			.output(
				z.object({
					success: z.boolean(),
					error: z.string().nullable(),
				}),
			)
			.mutation(async ({ input }) => {
				try {
					const rejected = await handler.rejectDeviceAuth(input.user_code);

					if (!rejected) {
						return {
							success: false,
							error: "User code not found",
						};
					}

					logger.info("Device auth rejected", { userCode: input.user_code });

					return {
						success: true,
						error: null,
					};
				} catch (error) {
					logger.error("Failed to reject device auth", {
						error: error instanceof Error ? error.message : String(error),
					});

					return {
						success: false,
						error: error instanceof Error ? error.message : "Failed to reject auth",
					};
				}
			}),
	});
}
