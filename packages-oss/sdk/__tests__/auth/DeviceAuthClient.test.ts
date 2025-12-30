/**
 * Unit tests for DeviceAuthClient (RFC 8628)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDeviceAuthClient,
	type DeviceAuthCallbacks,
	DeviceAuthClient,
	type DeviceCodeResponse,
} from "../../src/auth/DeviceAuthClient";

// Mock ky
vi.mock("ky", () => {
	const mockPost = vi.fn();
	return {
		default: {
			create: vi.fn(() => ({
				post: mockPost,
			})),
		},
	};
});

describe("DeviceAuthClient", () => {
	let mockPost: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.useFakeTimers();
		const ky = await import("ky");
		mockPost = (ky.default.create() as { post: ReturnType<typeof vi.fn> }).post;
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("should create client with minimal config", () => {
			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			expect(client.getState()).toBe("idle");
		});

		it("should create client with custom scope", () => {
			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
				scope: "read write",
			});

			expect(client.getState()).toBe("idle");
		});
	});

	describe("createDeviceAuthClient factory", () => {
		it("should create client using factory function", () => {
			const client = createDeviceAuthClient("https://api.example.com", "test-client");

			expect(client).toBeInstanceOf(DeviceAuthClient);
			expect(client.getState()).toBe("idle");
		});

		it("should pass options to client", () => {
			const client = createDeviceAuthClient("https://api.example.com", "test-client", {
				scope: "read write",
			});

			expect(client.getState()).toBe("idle");
		});
	});

	describe("getState", () => {
		it("should return idle initially", () => {
			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			expect(client.getState()).toBe("idle");
		});
	});

	describe("cancel", () => {
		it("should set state to cancelled", () => {
			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			client.cancel();

			expect(client.getState()).toBe("cancelled");
		});
	});

	describe("authenticate", () => {
		const deviceCodeResponse: DeviceCodeResponse = {
			device_code: "device-123",
			user_code: "ABC-123",
			verification_uri: "https://example.com/device",
			verification_uri_complete: "https://example.com/device?user_code=ABC-123",
			expires_in: 300,
			interval: 5,
		};

		const tokenResponse = {
			access_token: "access-token-123",
			token_type: "Bearer" as const,
			expires_in: 3600,
			refresh_token: "refresh-token-123",
			scope: "read write",
		};

		it("should complete full authentication flow", async () => {
			// First call returns device code
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});

			// Second call returns authorization_pending
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ error: "authorization_pending" }),
			});

			// Third call returns token
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(tokenResponse),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const callbacks: DeviceAuthCallbacks = {
				onDeviceCode: vi.fn(),
				onPoll: vi.fn(),
				onApproved: vi.fn(),
			};

			const authPromise = client.authenticate(callbacks);

			// Wait for device code request
			await vi.advanceTimersByTimeAsync(0);
			expect(callbacks.onDeviceCode).toHaveBeenCalledWith(deviceCodeResponse);

			// Wait for first poll (5 seconds)
			await vi.advanceTimersByTimeAsync(5000);
			expect(callbacks.onPoll).toHaveBeenCalledWith(1, 5000);

			// Wait for second poll (5 more seconds)
			await vi.advanceTimersByTimeAsync(5000);
			expect(callbacks.onPoll).toHaveBeenCalledWith(2, 5000);

			const result = await authPromise;

			expect(result.access_token).toBe("access-token-123");
			expect(result.api_key).toBe("access-token-123");
			expect(callbacks.onApproved).toHaveBeenCalled();
			expect(client.getState()).toBe("approved");
		});

		it("should call onDeviceCode callback", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(tokenResponse),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onDeviceCode = vi.fn();

			const authPromise = client.authenticate({ onDeviceCode });

			await vi.advanceTimersByTimeAsync(0);
			expect(onDeviceCode).toHaveBeenCalledWith(deviceCodeResponse);

			await vi.advanceTimersByTimeAsync(5000);
			await authPromise;
		});

		it("should throw if authentication already in progress", async () => {
			mockPost.mockReturnValue({
				json: vi.fn().mockImplementation(
					() =>
						new Promise(() => {
							/* never resolves */
						}),
				),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			// Start first authentication
			client.authenticate();

			// Try to start second authentication
			await expect(client.authenticate()).rejects.toThrow("Authentication already in progress");
		});

		it("should handle slow_down response by increasing interval", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ error: "slow_down" }),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(tokenResponse),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onSlowDown = vi.fn();
			const authPromise = client.authenticate({ onSlowDown });

			// Wait for device code
			await vi.advanceTimersByTimeAsync(0);

			// First poll - should receive slow_down
			await vi.advanceTimersByTimeAsync(5000);
			expect(onSlowDown).toHaveBeenCalledWith(10000); // 5000 + 5000

			// Second poll with increased interval
			await vi.advanceTimersByTimeAsync(10000);

			await authPromise;
		});

		it("should throw on access_denied response", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ error: "access_denied" }),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onError = vi.fn();
			const authPromise = client.authenticate({ onError });

			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);

			await expect(authPromise).rejects.toThrow("Authorization denied by user");
			expect(onError).toHaveBeenCalled();
			expect(client.getState()).toBe("error");
		});

		it("should throw on expired_token response", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ error: "expired_token" }),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const authPromise = client.authenticate();

			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);

			await expect(authPromise).rejects.toThrow("Device code expired on server");
		});

		it("should throw on invalid_request response", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ error: "invalid_request" }),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const authPromise = client.authenticate();

			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);

			await expect(authPromise).rejects.toThrow("Invalid device code format");
		});

		it("should timeout when device code expires", async () => {
			// Use real timers for this test with very short intervals
			vi.useRealTimers();

			const shortExpiryResponse = {
				device_code: "device-123",
				user_code: "ABC-123",
				verification_uri: "https://example.com/device",
				expires_in: 0.05, // 50ms expiry
				interval: 0.01, // 10ms poll interval
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(shortExpiryResponse),
			});
			// Always return pending
			mockPost.mockReturnValue({
				json: vi.fn().mockResolvedValue({ error: "authorization_pending" }),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			await expect(client.authenticate()).rejects.toThrow("Device code expired");

			vi.useFakeTimers();
		}, 10000);

		it("should handle cancellation during polling", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValue({
				json: vi.fn().mockResolvedValue({ error: "authorization_pending" }),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onCancelled = vi.fn();
			const authPromise = client.authenticate({ onCancelled });

			// Wait for device code
			await vi.advanceTimersByTimeAsync(0);

			// Start polling but cancel before completion
			client.cancel();

			// Advance past the interval
			await vi.advanceTimersByTimeAsync(5000);

			await expect(authPromise).rejects.toThrow("cancelled");
			expect(onCancelled).toHaveBeenCalled();
			expect(client.getState()).toBe("cancelled");
		});

		it("should accept external AbortSignal in config", () => {
			// Verify external signal is accepted and merged with internal controller
			const abortController = new AbortController();
			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
				signal: abortController.signal,
			});

			expect(client.getState()).toBe("idle");
			// External abort should be mergeable - the signal merging is tested via HTTP calls
		});

		it("should throw if device code response is invalid", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ user_code: "ABC-123" }), // Missing device_code
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			await expect(client.authenticate()).rejects.toThrow("Invalid device code response");
		});

		it("should continue polling on network errors", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			// First poll - network error
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(new Error("Network error")),
			});
			// Second poll - success
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(tokenResponse),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const authPromise = client.authenticate();

			// Device code
			await vi.advanceTimersByTimeAsync(0);

			// First poll - fails with network error
			await vi.advanceTimersByTimeAsync(5000);

			// Second poll - succeeds
			await vi.advanceTimersByTimeAsync(5000);

			const result = await authPromise;
			expect(result.access_token).toBe("access-token-123");
		});

		it("should map token response to AuthResult correctly", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({
					access_token: "my-token",
					token_type: "Bearer",
					expires_in: 7200,
					refresh_token: "my-refresh",
				}),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const authPromise = client.authenticate();
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);

			const result = await authPromise;

			expect(result.api_key).toBe("my-token");
			expect(result.access_token).toBe("my-token");
			expect(result.refresh_token).toBe("my-refresh");
			expect(result.expires_in).toBe(7200);
			expect(result.user_id).toBe("user-from-token"); // Placeholder
			expect(result.tier).toBe("free"); // Placeholder
		});

		it("should use verification_uri_complete when available", async () => {
			const responseWithComplete = {
				...deviceCodeResponse,
				verification_uri_complete: "https://example.com/device?code=ABC-123",
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(responseWithComplete),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(tokenResponse),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onDeviceCode = vi.fn();
			const authPromise = client.authenticate({ onDeviceCode });

			await vi.advanceTimersByTimeAsync(0);
			expect(onDeviceCode).toHaveBeenCalledWith(
				expect.objectContaining({
					verification_uri_complete: "https://example.com/device?code=ABC-123",
				}),
			);

			await vi.advanceTimersByTimeAsync(5000);
			await authPromise;
		});
	});

	describe("state transitions", () => {
		it("should transition through states correctly on success", async () => {
			const deviceCodeResponse: DeviceCodeResponse = {
				device_code: "device-123",
				user_code: "ABC-123",
				verification_uri: "https://example.com/device",
				expires_in: 300,
				interval: 5,
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({
					access_token: "token",
					token_type: "Bearer",
				}),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			expect(client.getState()).toBe("idle");

			const authPromise = client.authenticate();

			// After starting, should be requesting_code
			await vi.advanceTimersByTimeAsync(0);
			expect(client.getState()).toBe("waiting_for_approval");

			await vi.advanceTimersByTimeAsync(5000);
			await authPromise;

			expect(client.getState()).toBe("approved");
		});

		it("should transition to error state on failure", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(new Error("Network error")),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			await expect(client.authenticate()).rejects.toThrow();

			expect(client.getState()).toBe("error");
		});
	});

	describe("RFC 8628 compliance", () => {
		it("should include grant_type in token request", async () => {
			const deviceCodeResponse: DeviceCodeResponse = {
				device_code: "device-123",
				user_code: "ABC-123",
				verification_uri: "https://example.com/device",
				expires_in: 300,
				interval: 5,
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({
					access_token: "token",
					token_type: "Bearer",
				}),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const authPromise = client.authenticate();
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);
			await authPromise;

			// Verify the second call (token request) includes correct grant_type
			expect(mockPost).toHaveBeenCalledWith(
				"deviceAuth/pollToken",
				expect.objectContaining({
					json: expect.objectContaining({
						grant_type: "urn:ietf:params:oauth:grant-type:device_code",
						device_code: "device-123",
						client_id: "test-client",
					}),
				}),
			);
		});

		it("should use server-provided polling interval", async () => {
			const deviceCodeResponse: DeviceCodeResponse = {
				device_code: "device-123",
				user_code: "ABC-123",
				verification_uri: "https://example.com/device",
				expires_in: 300,
				interval: 10, // 10 second interval
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({
					access_token: "token",
					token_type: "Bearer",
				}),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "test-client",
			});

			const onPoll = vi.fn();
			const authPromise = client.authenticate({ onPoll });

			await vi.advanceTimersByTimeAsync(0);

			// Should wait 10 seconds, not 5
			await vi.advanceTimersByTimeAsync(10000);

			await authPromise;

			expect(onPoll).toHaveBeenCalledWith(1, 10000);
		});

		it("should include client_id in device code request", async () => {
			const deviceCodeResponse: DeviceCodeResponse = {
				device_code: "device-123",
				user_code: "ABC-123",
				verification_uri: "https://example.com/device",
				expires_in: 300,
				interval: 5,
			};

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(deviceCodeResponse),
			});
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({
					access_token: "token",
					token_type: "Bearer",
				}),
			});

			const client = new DeviceAuthClient({
				baseUrl: "https://api.example.com",
				clientId: "my-test-client",
				scope: "read write",
			});

			const authPromise = client.authenticate();
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5000);
			await authPromise;

			// Verify first call (device code request) includes client_id and scope
			expect(mockPost).toHaveBeenCalledWith(
				"deviceAuth/requestCode",
				expect.objectContaining({
					json: expect.objectContaining({
						client_id: "my-test-client",
						scope: "read write",
					}),
				}),
			);
		});
	});
});
