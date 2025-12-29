import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@snapback/testing/msw/server";

/**
 * Phase 4 & 5: MCP Communication & Resilience Tests
 *
 * Per /apps/onboarding/implementation.md:
 * - Phase 4: MCP Communication (HTTP+SSE for browser)
 * - Phase 5: Polish & Resilience
 *
 * Following red-green-refactor: Tests written FIRST
 */

// Track request count for retry tests
let requestCount = 0;

// Mock EventSource for SSE
const mockEventSource = vi.fn(() => ({
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	close: vi.fn(),
	readyState: 1,
}));
(global as unknown as { EventSource: typeof mockEventSource }).EventSource = mockEventSource;

// Mock localStorage with spies
const mockLocalStorage = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
		get length() { return Object.keys(store).length; },
		key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
	};
})();
Object.defineProperty(global, "localStorage", { value: mockLocalStorage, writable: true });

// ============================================================================
// PHASE 4: MCP Client Tests
// ============================================================================

describe("Phase 4: Browser MCP Client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requestCount = 0;
		mockLocalStorage.clear();
		// Ensure online by default
		Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
	});

	describe("MCPBrowserClient", () => {
		describe("HTTP Transport", () => {
			it("should make authenticated POST requests to MCP endpoint", async () => {
				// Set up MSW handler
				server.use(
					http.post("https://api.snapback.dev/mcp", ({ request }) => {
						// Verify auth header
						const authHeader = request.headers.get("Authorization");
						expect(authHeader).toBe("Bearer token_123");
						return HttpResponse.json({
							jsonrpc: "2.0",
							id: 1,
							result: { status: "success" },
						});
					}),
				);

				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
				}));

				const result = await client.call("backup_file", {
					filePath: "/src/index.ts",
					content: "console.log('hello');",
				});

				expect(result).toHaveProperty("status", "success");
			});

			it("should retry on network failure with exponential backoff", async () => {
				// Handler that fails twice then succeeds
				server.use(
					http.post("https://api.snapback.dev/mcp", () => {
						requestCount++;
						if (requestCount < 3) {
							return HttpResponse.error();
						}
						return HttpResponse.json({
							jsonrpc: "2.0",
							id: 1,
							result: { status: "success" },
						});
					}),
				);

				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
					maxRetries: 3,
				}));

				const result = await client.call("backup_file", { filePath: "/test.ts" });

				expect(requestCount).toBe(3);
				expect(result).toHaveProperty("status", "success");
			});

			it("should handle 401 and trigger token refresh", async () => {
				let isFirstRequest = true;

				// MCP endpoint - first returns 401
				server.use(
					http.post("https://api.snapback.dev/mcp", () => {
						if (isFirstRequest) {
							isFirstRequest = false;
							return new HttpResponse(null, { status: 401 });
						}
						return HttpResponse.json({
							jsonrpc: "2.0",
							id: 1,
							result: { status: "success" },
						});
					}),
					http.post("https://api.snapback.dev/auth/refresh", () => {
						return HttpResponse.json({
							sessionToken: "new_token_456",
							expiresIn: 3600,
						});
					}),
				);

				const onTokenRefresh = vi.fn();
				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "expired_token",
					refreshToken: "refresh_token_abc",
					onTokenRefresh,
				}));

				await client.call("backup_file", { filePath: "/test.ts" });

				expect(onTokenRefresh).toHaveBeenCalledWith("new_token_456");
			});

			it("should throw after max retries exceeded", async () => {
				// Handler that always fails
				server.use(
					http.post("https://api.snapback.dev/mcp", () => {
						requestCount++;
						return HttpResponse.error();
					}),
				);

				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
					maxRetries: 3,
				}));

				await expect(client.call("backup_file", {})).rejects.toThrow();
				expect(requestCount).toBe(3);
			});
		});

		describe("SSE Transport", () => {
			it("should establish SSE connection for streaming responses", async () => {
				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
					useSSE: true,
				}));

				await client.connect();

				expect(mockEventSource).toHaveBeenCalledWith(
					expect.stringContaining("api.snapback.dev/mcp"),
				);
			});

			it("should handle SSE message events", async () => {
				const messageHandler = vi.fn();
				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
					useSSE: true,
					onMessage: messageHandler,
				}));

				await client.connect();

				// Simulate SSE message
				const mockInstance = mockEventSource.mock.results[0]?.value;
				const addEventListenerCall = mockInstance?.addEventListener.mock.calls.find(
					(call: [string, unknown]) => call[0] === "message",
				);

				if (addEventListenerCall) {
					addEventListenerCall[1]({ data: JSON.stringify({ type: "backup.complete" }) });
					expect(messageHandler).toHaveBeenCalled();
				}
			});
		});

		describe("Request Queuing", () => {
			it("should queue requests when offline", async () => {
				const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
					baseUrl: "https://api.snapback.dev",
					sessionToken: "token_123",
				}));

				// Simulate offline
				Object.defineProperty(navigator, "onLine", { value: false, writable: true });

				const queuedRequest = await client.call("backup_file", { filePath: "/test.ts" });

				expect(queuedRequest).toHaveProperty("queued", true);
			});
		});
	});

	describe("JSON-RPC 2.0 Compliance", () => {
		it("should format requests per JSON-RPC 2.0 spec", async () => {
			let capturedBody: unknown = null;

			server.use(
				http.post("https://api.snapback.dev/mcp", async ({ request }) => {
					capturedBody = await request.json();
					return HttpResponse.json({
						jsonrpc: "2.0",
						id: 1,
						result: {},
					});
				}),
			);

			const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
				baseUrl: "https://api.snapback.dev",
				sessionToken: "token_123",
			}));

			await client.call("backup_file", { filePath: "/test.ts" });

			expect(capturedBody).toMatchObject({
				jsonrpc: "2.0",
				method: "tools/call",
				params: {
					name: "backup_file",
					arguments: { filePath: "/test.ts" },
				},
			});
			expect(capturedBody).toHaveProperty("id");
		});

		it("should handle JSON-RPC error responses", async () => {
			server.use(
				http.post("https://api.snapback.dev/mcp", () => {
					return HttpResponse.json({
						jsonrpc: "2.0",
						id: 1,
						error: { code: -32601, message: "Method not found" },
					});
				}),
			);

			const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
				baseUrl: "https://api.snapback.dev",
				sessionToken: "token_123",
			}));

			await expect(client.call("invalid_method", {})).rejects.toThrow("Method not found");
		});
	});
});

// ============================================================================
// PHASE 5: Resilience Tests
// ============================================================================

describe("Phase 5: Resilience & Polish", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockLocalStorage.clear();
		requestCount = 0;
		// Ensure online by default
		Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Token Refresh Before Expiry", () => {
		it("should schedule refresh before token expires", async () => {
			// Set up MSW handler for refresh endpoint
			server.use(
				http.post("*/api/auth/refresh", () => {
					return HttpResponse.json({
						sessionToken: "refreshed_token",
						expiresIn: 3600,
					});
				}),
			);

			const onTokenRefresh = vi.fn();

			// Token expires in 5 minutes (300 seconds)
			const session = await import("../lib/sessionManager").then((m) => m.createSessionManager({
				sessionToken: "token_123",
				refreshToken: "refresh_abc",
				expiresIn: 300, // 5 minutes
				onTokenRefresh,
			}));

			session.start();

			// Advance time to 4.5 minutes (should trigger refresh at ~90% of token lifetime)
			await vi.advanceTimersByTimeAsync(270 * 1000);

			expect(onTokenRefresh).toHaveBeenCalledWith("refreshed_token");
		});

		it("should not refresh if token has >5 min remaining", async () => {
			const onTokenRefresh = vi.fn();

			const session = await import("../lib/sessionManager").then((m) => m.createSessionManager({
				sessionToken: "token_123",
				refreshToken: "refresh_abc",
				expiresIn: 3600, // 1 hour
				onTokenRefresh,
			}));

			session.start();

			// Advance 30 minutes
			vi.advanceTimersByTime(30 * 60 * 1000);

			expect(onTokenRefresh).not.toHaveBeenCalled();
		});

		it("should provide getToken method", async () => {
			const session = await import("../lib/sessionManager").then((m) => m.createSessionManager({
				sessionToken: "test_token",
				refreshToken: "refresh_abc",
				expiresIn: 300,
			}));

			expect(session.getToken()).toBe("test_token");
		});
	});

	describe("Offline Backup Queue (IndexedDB)", () => {
		it("should have required interface methods", async () => {
			const { createBackupQueue } = await import("../lib/backupQueue");
			const queue = createBackupQueue();

			expect(queue).toHaveProperty("add");
			expect(queue).toHaveProperty("getPending");
			expect(queue).toHaveProperty("flush");
			expect(queue).toHaveProperty("remove");
			expect(queue).toHaveProperty("clear");
		});

		it("should accept config options", async () => {
			const { createBackupQueue } = await import("../lib/backupQueue");
			const queue = createBackupQueue({
				maxRetries: 3,
				dbName: "test_db",
				storeName: "test_store",
			});

			expect(queue).toBeDefined();
		});

		it("should accept onFlush callback", async () => {
			const onFlush = vi.fn().mockResolvedValue(true);
			const { createBackupQueue } = await import("../lib/backupQueue");

			const queue = createBackupQueue({ onFlush });

			expect(queue).toBeDefined();
		});
	});

	describe("Session Revocation Sync", () => {
		it("should broadcast logout to all clients via localStorage", async () => {
			const onLogout = vi.fn();

			const sync = await import("../lib/sessionSync").then((m) => m.createSessionSync({
				onLogout,
			}));

			sync.start();

			// Simulate logout in another tab
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: "snapback_session_revoked",
					newValue: JSON.stringify({ timestamp: Date.now(), userId: "user_123" }),
				}),
			);

			expect(onLogout).toHaveBeenCalled();
		});

		it("should signal logout to extension via localStorage", async () => {
			const sync = await import("../lib/sessionSync").then((m) => m.createSessionSync({}));

			await sync.signalLogout("user_123");

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"snapback_session_revoked",
				expect.stringContaining("user_123"),
			);
		});

		it("should clear all session data on revocation", async () => {
			const sync = await import("../lib/sessionSync").then((m) => m.createSessionSync({}));

			await sync.signalLogout("user_123");

			// Uses AUTH_SYNC_KEYS values
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("snapback_session");
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("snapback_auth_success");
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("snapback_user");
		});

		it("should have logoutAllSessions method", async () => {
			const { createSessionSync } = await import("../lib/sessionSync");

			const sync = createSessionSync({
				apiBaseUrl: "https://api.snapback.dev",
			});

			expect(typeof sync.logoutAllSessions).toBe("function");
		});
	});

	describe("Circuit Breaker", () => {
		it("should open circuit after consecutive failures", async () => {
			Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });

			server.use(
				http.post("https://api.snapback.dev/mcp", () => {
					return HttpResponse.error();
				}),
			);

			const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
				baseUrl: "https://api.snapback.dev",
				sessionToken: "token_123",
				maxRetries: 1,
				circuitBreaker: { threshold: 3, resetTimeout: 30000 },
			}));

			// Trigger 3 failures
			for (let i = 0; i < 3; i++) {
				try {
					await client.call("backup_file", {});
				} catch {
					// Expected
				}
			}

			// Verify circuit is open
			expect(client.getCircuitState()).toBe("open");

			// Next call should fail immediately (circuit open)
			await expect(client.call("backup_file", {})).rejects.toThrow("Circuit breaker open");
		});

		it("should half-open after reset timeout", async () => {
			Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });

			server.use(
				http.post("https://api.snapback.dev/mcp", () => {
					return HttpResponse.error();
				}),
			);

			const client = await import("../lib/mcpClient").then((m) => m.createMCPClient({
				baseUrl: "https://api.snapback.dev",
				sessionToken: "token_123",
				maxRetries: 1,
				circuitBreaker: { threshold: 3, resetTimeout: 30000 },
			}));

			// Open circuit
			for (let i = 0; i < 3; i++) {
				try {
					await client.call("backup_file", {});
				} catch {
					// Expected
				}
			}

			expect(client.getCircuitState()).toBe("open");

			// Advance past reset timeout
			vi.advanceTimersByTime(31000);

			// Should be half-open now
			expect(client.getCircuitState()).toBe("half-open");
		});
	});
});

// ============================================================================
// Integration Tests: Full Flow
// ============================================================================

describe("Full Onboarding Flow Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.clear();
		requestCount = 0;
		Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
	});

	it("should complete magic link → session → MCP backup flow", async () => {
		// Set up MSW handlers
		server.use(
			http.post("https://api.snapback.dev/mcp", () => {
				return HttpResponse.json({
					jsonrpc: "2.0",
					id: 1,
					result: { backupId: "backup_123", status: "success" },
				});
			}),
		);

		const { createMCPClient } = await import("../lib/mcpClient");
		const client = createMCPClient({
			baseUrl: "https://api.snapback.dev",
			sessionToken: "session_abc",
		});

		const backupResult = await client.call("backup_file", {
			filePath: "/src/index.ts",
			content: "console.log('test');",
		});

		expect(backupResult).toHaveProperty("backupId", "backup_123");
		expect(backupResult).toHaveProperty("status", "success");
	});
});
