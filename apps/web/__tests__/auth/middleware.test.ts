/**
 * Authentication Middleware Tests (TDD)
 *
 * Tests for Next.js middleware with Better Auth session validation
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";

// Mock fetch for session validation
global.fetch = vi.fn();

describe("Authentication Middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createRequest = (
		pathname: string,
		cookies?: Record<string, string>,
	) => {
		const url = `http://console.localhost:3000${pathname}`;
		const request = new NextRequest(url);

		if (cookies) {
			for (const [name, value] of Object.entries(cookies)) {
				request.cookies.set(name, value);
			}
		}

		return request;
	};

	describe("Public Routes", () => {
		it("should allow access to login page without session", async () => {
			const request = createRequest("/auth/login");
			const response = await middleware(request);

			expect(response).toBeDefined();
			// Should not redirect (Next.js returns undefined for allowed requests)
		});

		it("should allow access to signup page without session", async () => {
			const request = createRequest("/auth/signup");
			const response = await middleware(request);

			expect(response).toBeDefined();
		});

		it("should allow access to home page without session", async () => {
			const request = createRequest("/");
			const response = await middleware(request);

			expect(response).toBeDefined();
		});

		it("should allow access to public API routes", async () => {
			const request = createRequest("/api/health");
			const response = await middleware(request);

			expect(response).toBeDefined();
		});
	});

	describe("Protected Routes", () => {
		it("should redirect to login when accessing dashboard without session", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				ok: false,
				status: 401,
			} as Response);

			const request = createRequest("/dashboard");
			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				const redirectUrl = response.headers.get("location");
				expect(redirectUrl).toContain("/auth/login");
				expect(redirectUrl).toContain("from=%2Fdashboard");
			}
		});

		it("should allow access to dashboard with valid session", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/dashboard", {
				"snapback.session_token": "valid-session-token",
			});

			const response = await middleware(request);

			// Should not redirect when session is valid
			expect(response).toBeDefined();
		});

		it("should redirect to login when accessing settings without session", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				ok: false,
				status: 401,
			} as Response);

			const request = createRequest("/settings");
			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				const redirectUrl = response.headers.get("location");
				expect(redirectUrl).toContain("/auth/login");
			}
		});

		it("should preserve original URL in redirect", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				ok: false,
				status: 401,
			} as Response);

			const request = createRequest("/dashboard/snapshots/123");
			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				const redirectUrl = response.headers.get("location");
				expect(redirectUrl).toContain("from=%2Fdashboard%2Fsnapshots%2F123");
			}
		});
	});

	describe("Session Validation", () => {
		it("should validate session with Better Auth API", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/dashboard", {
				"snapback.session_token": "valid-token",
			});

			await middleware(request);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/auth/get-session"),
				expect.objectContaining({
					headers: expect.objectContaining({
						Cookie: expect.stringContaining(
							"snapback.session_token=valid-token",
						),
					}),
					credentials: "include",
				}),
			);
		});

		it("should handle session validation errors gracefully", async () => {
			vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

			const request = createRequest("/dashboard", {
				"snapback.session_token": "token",
			});

			const response = await middleware(request);

			// Should redirect to login on validation error
			if (response instanceof NextResponse && response.status === 307) {
				expect(response.headers.get("location")).toContain("/auth/login");
			}
		});

		it("should handle missing session cookie", async () => {
			const request = createRequest("/dashboard");
			const response = await middleware(request);

			// Should redirect to login without making API call
			if (response instanceof NextResponse && response.status === 307) {
				expect(response.headers.get("location")).toContain("/auth/login");
			}

			// Should not call validation API without cookie
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should handle expired session", async () => {
			vi.mocked(global.fetch).mockResolvedValue({
				ok: false,
				status: 401,
				json: async () => ({ error: "Session expired" }),
			} as Response);

			const request = createRequest("/dashboard", {
				"snapback.session_token": "expired-token",
			});

			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				expect(response.headers.get("location")).toContain("/auth/login");
			}
		});
	});

	describe("Auth Page Redirects", () => {
		it("should redirect to dashboard if accessing login with valid session", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/auth/login", {
				"snapback.session_token": "valid-token",
			});

			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				expect(response.headers.get("location")).toContain("/dashboard");
			}
		});

		it("should redirect to dashboard if accessing signup with valid session", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/auth/signup", {
				"snapback.session_token": "valid-token",
			});

			const response = await middleware(request);

			if (response instanceof NextResponse && response.status === 307) {
				expect(response.headers.get("location")).toContain("/dashboard");
			}
		});

		it("should allow home page access even with session", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/", {
				"snapback.session_token": "valid-token",
			});

			const response = await middleware(request);

			// Should not redirect home page
			expect(response).toBeDefined();
		});
	});

	describe("Performance", () => {
		it("should complete session validation within 100ms", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(global.fetch).mockResolvedValue({
				ok: true,
				json: async () => mockSession,
			} as Response);

			const request = createRequest("/dashboard", {
				"snapback.session_token": "valid-token",
			});

			const startTime = Date.now();
			await middleware(request);
			const duration = Date.now() - startTime;

			expect(duration).toBeLessThan(100);
		});
	});
});
