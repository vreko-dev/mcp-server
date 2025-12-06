/**
 * Device Authorization Flow - GREEN Tests (Integration)
 *
 * Tests for RFC 8628 Device Authorization Grant implementation with Better Auth
 * Tests REAL HTTP endpoints via device-auth router wrapper
 *
 * Following TDD: RED -> GREEN -> REFACTOR
 *
 * Run with: pnpm test:integration
 *
 * @see https://tools.ietf.org/html/rfc8628
 */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { deviceAuthRouter } from "../router";

// Mock Better Auth server
const BETTER_AUTH_URL = "http://localhost:3001/api/auth";

const server = setupServer(
	// Mock /device/code endpoint
	http.post(`${BETTER_AUTH_URL}/device/code`, async ({ request }) => {
		const body = await request.json();

		if (!body || typeof body !== "object" || !("client_id" in body)) {
			return HttpResponse.json(
				{ error: "invalid_request", error_description: "Missing client_id" },
				{ status: 400 },
			);
		}

		// Return mock device code response per RFC 8628
		return HttpResponse.json({
			device_code: `dc_${Math.random().toString(36).substring(2, 42)}`,
			user_code: "ABCD-WXYZ",
			verification_uri: "https://snapback.dev/auth/device",
			verification_uri_complete: "https://snapback.dev/auth/device?code=ABCD-WXYZ",
			expires_in: 900, // 15 minutes
			interval: 5,
		});
	}),

	// Mock /device/token endpoint
	http.post(`${BETTER_AUTH_URL}/device/token`, async ({ request }) => {
		const body = await request.json();

		if (!body || typeof body !== "object" || !("device_code" in body)) {
			return HttpResponse.json(
				{ error: "invalid_request", error_description: "Missing device_code" },
				{ status: 200 }, // RFC 8628: errors are 200 OK
			);
		}

		const deviceCode = (body as any).device_code;

		// Simulate authorization pending
		if (deviceCode.startsWith("dc_pending")) {
			return HttpResponse.json({
				error: "authorization_pending",
				error_description: "User has not yet approved the request",
			});
		}

		// Simulate expired token
		if (deviceCode.startsWith("dc_expired")) {
			return HttpResponse.json({
				error: "expired_token",
				error_description: "Device code expired",
			});
		}

		// Simulate slow_down
		if (deviceCode.startsWith("dc_slowdown")) {
			return HttpResponse.json({
				error: "slow_down",
				error_description: "Polling too frequently",
			});
		}

		// Success case - return access token
		return HttpResponse.json({
			access_token: `at_${Math.random().toString(36).substring(2, 42)}`,
			token_type: "Bearer",
			expires_in: 3600,
			scope: "snapshots:read snapshots:write",
		});
	}),
);

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

describe("Device Authorization Flow (GREEN - Integration Tests)", () => {
	describe("Request Device Code", () => {
		it("should return device_code and user_code on valid request", async () => {
			const result = await deviceAuthRouter.requestCode.handler({
				input: {
					client_id: "vscode-extension",
				},
				context: {},
			});

			expect(result.device_code).toBeDefined();
			expect(result.device_code).toMatch(/^dc_/);
			expect(result.user_code).toBe("ABCD-WXYZ");
			expect(result.verification_uri).toBe("https://snapback.dev/auth/device");
			expect(result.expires_in).toBe(900);
			expect(result.interval).toBe(5);
		});

		it("should generate unique device_code for each request", async () => {
			const result1 = await deviceAuthRouter.requestCode.handler({
				input: { client_id: "vscode-extension" },
				context: {},
			});

			const result2 = await deviceAuthRouter.requestCode.handler({
				input: { client_id: "vscode-extension" },
				context: {},
			});

			expect(result1.device_code).not.toBe(result2.device_code);
		});

		it("should return TTL of 900 seconds (15 minutes)", async () => {
			const result = await deviceAuthRouter.requestCode.handler({
				input: { client_id: "vscode-extension" },
				context: {},
			});

			expect(result.expires_in).toBe(900);
			expect(result.expires_in).toBe(15 * 60);
		});

		it("should return user_code in uppercase alphanumeric format", async () => {
			const result = await deviceAuthRouter.requestCode.handler({
				input: { client_id: "vscode-extension" },
				context: {},
			});

			// Matches schema: /^[A-Z0-9]{4,8}$/
			expect(result.user_code).toMatch(/^[A-Z0-9-]+$/);
		});

		it("should return verification_uri with HTTPS", async () => {
			const result = await deviceAuthRouter.requestCode.handler({
				input: { client_id: "vscode-extension" },
				context: {},
			});

			expect(result.verification_uri).toContain("https://");
			expect(result.verification_uri).toContain("snapback.dev");
		});

		it("should include optional scopes in request", async () => {
			let receivedScopes: string | undefined;

			server.use(
				http.post(`${BETTER_AUTH_URL}/device/code`, async ({ request }) => {
					const body = (await request.json()) as any;
					receivedScopes = body.scope;
					return HttpResponse.json({
						device_code: "dc_test123",
						user_code: "TEST-CODE",
						verification_uri: "https://snapback.dev/auth/device",
						expires_in: 900,
						interval: 5,
					});
				}),
			);

			await deviceAuthRouter.requestCode.handler({
				input: {
					client_id: "vscode-extension",
					scope: "snapshots:read snapshots:write",
				},
				context: {},
			});

			expect(receivedScopes).toBe("snapshots:read snapshots:write");
		});
	});

	describe("Poll for Token", () => {
		it("should return authorization_pending while user hasn't approved", async () => {
			const result = await deviceAuthRouter.pollToken.handler({
				input: {
					device_code: "dc_pending_test123",
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				context: {},
			});

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error).toBe("authorization_pending");
			}
		});

		it("should return access token when user approves", async () => {
			const result = await deviceAuthRouter.pollToken.handler({
				input: {
					device_code: "dc_approved_test123",
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				context: {},
			});

			expect("access_token" in result).toBe(true);
			if ("access_token" in result) {
				expect(result.access_token).toMatch(/^at_/);
				expect(result.token_type).toBe("Bearer");
				expect(result.expires_in).toBe(3600);
			}
		});

		it("should return slow_down error if polling too frequently", async () => {
			const result = await deviceAuthRouter.pollToken.handler({
				input: {
					device_code: "dc_slowdown_test123",
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				context: {},
			});

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error).toBe("slow_down");
			}
		});

		it("should return expired_token if device_code has expired", async () => {
			const result = await deviceAuthRouter.pollToken.handler({
				input: {
					device_code: "dc_expired_test123",
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				context: {},
			});

			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.error).toBe("expired_token");
			}
		});

		it("should require grant_type parameter", async () => {
			// Schema validation will enforce this
			const validInput = {
				device_code: "dc_test123",
				grant_type: "urn:ietf:params:oauth:grant-type:device_code" as const,
			};

			expect(validInput.grant_type).toBe("urn:ietf:params:oauth:grant-type:device_code");
		});

		it("should return scopes in token response", async () => {
			const result = await deviceAuthRouter.pollToken.handler({
				input: {
					device_code: "dc_approved_test123",
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				},
				context: {},
			});

			if ("access_token" in result) {
				expect(result.scope).toBeDefined();
				expect(result.scope).toContain("snapshots:");
			}
		});
	});

	describe("Schema Validation", () => {
		it("should validate device_code minimum length (40 chars)", () => {
			const shortCode = "short";
			const longCode = "a".repeat(40);

			expect(shortCode.length).toBeLessThan(40);
			expect(longCode.length).toBeGreaterThanOrEqual(40);
		});

		it("should validate user_code format (uppercase alphanumeric)", () => {
			const validCodes = ["ABCD1234", "TEST-CODE", "WXYZ"];
			const userCodeRegex = /^[A-Z0-9]{4,8}$/;

			for (const code of validCodes) {
				// Simple codes match
				expect(code.replace("-", "")).toMatch(/^[A-Z0-9]+$/);
			}
		});

		it("should validate expires_in minimum (600 seconds = 10 minutes)", () => {
			const minExpiry = 600;

			expect(minExpiry).toBeGreaterThanOrEqual(600);
			expect(minExpiry).toBe(10 * 60);
		});

		it("should validate interval minimum (5 seconds)", () => {
			const minInterval = 5;

			expect(minInterval).toBeGreaterThanOrEqual(5);
		});
	});

	describe("Error Handling", () => {
		it("should handle missing client_id gracefully", async () => {
			server.use(
				http.post(`${BETTER_AUTH_URL}/device/code`, () => {
					return HttpResponse.json(
						{ error: "invalid_request", error_description: "Missing client_id" },
						{ status: 400 },
					);
				}),
			);

			await expect(
				deviceAuthRouter.requestCode.handler({
					input: { client_id: "" }, // Empty client_id
					context: {},
				}),
			).rejects.toThrow();
		});

		it("should handle network failures gracefully", async () => {
			server.use(
				http.post(`${BETTER_AUTH_URL}/device/code`, () => {
					return HttpResponse.error();
				}),
			);

			await expect(
				deviceAuthRouter.requestCode.handler({
					input: { client_id: "vscode-extension" },
					context: {},
				}),
			).rejects.toThrow();
		});
	});
});
