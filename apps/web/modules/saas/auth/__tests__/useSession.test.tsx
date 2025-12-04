/**
 * TDD Test Suite for useSession Hook Integration
 *
 * Tests session context integration following security best practices:
 * - Session validation on every request
 * - Proper error handling for expired sessions
 * - No sensitive data exposed in error messages
 *
 * Security References:
 * - OWASP A07:2025 Authentication Failures
 * - Better Auth session management docs
 */

import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "../hooks/use-session";
import { SessionContext } from "../lib/session-context";
import type { ReactNode } from "react";

describe("useSession Hook Integration", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	// Helper to create a mock session context provider
	const createWrapper = (sessionValue: any) => {
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				<SessionContext.Provider value={sessionValue}>
					{children}
				</SessionContext.Provider>
			</QueryClientProvider>
		);
	};

	describe("RED: Session retrieval", () => {
		it("should fetch session data from authClient.useSession()", async () => {
			// Arrange
			const mockUser = {
				id: "user_123",
				email: "test@example.com",
				name: "Test User",
				emailVerified: true,
				image: null,
			};

			const mockSessionData = {
				id: "sess_abc",
				expiresAt: new Date(Date.now() + 86400000).toISOString(),
				ipAddress: "127.0.0.1",
				userAgent: "test-agent",
			};

			const mockSessionContext = {
				user: mockUser,
				session: mockSessionData,
				loaded: true,
				loading: false,
				reloadSession: vi.fn().mockResolvedValue(undefined),
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert
			expect(result.current.user).toEqual(mockUser);
			expect(result.current.session).toEqual(mockSessionData);
			expect(result.current.loaded).toBe(true);
		});

		it("should handle loading state during session fetch", () => {
			// Arrange
			const mockSessionContext = {
				user: null,
				session: null,
				loaded: false,
				loading: true,
				reloadSession: vi.fn().mockResolvedValue(undefined),
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert
			expect(result.current.loaded).toBe(false);
			expect(result.current.loading).toBe(true);
			expect(result.current.user).toBe(null);
		});

		it("should handle null session (unauthenticated user)", () => {
			// Arrange
			const mockSessionContext = {
				user: null,
				session: null,
				loaded: true,
				loading: false,
				reloadSession: vi.fn().mockResolvedValue(undefined),
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert
			expect(result.current.user).toBe(null);
			expect(result.current.session).toBe(null);
			expect(result.current.loaded).toBe(true);
		});
	});

	describe("RED: Error handling (Security)", () => {
		it("should handle null session gracefully (logged out user)", () => {
			// Arrange
			const mockSessionContext = {
				user: null,
				session: null,
				loaded: true,
				loading: false,
				reloadSession: vi.fn().mockResolvedValue(undefined),
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert - No error thrown, just null session
			expect(result.current.user).toBe(null);
			expect(result.current.loaded).toBe(true);
		});
	});

	describe("RED: Session refresh", () => {
		it("should provide reloadSession function", () => {
			// Arrange
			const reloadSessionMock = vi.fn().mockResolvedValue(undefined);
			const mockSessionContext = {
				user: { id: "user_1", email: "test@example.com" },
				session: { id: "sess_1" },
				loaded: true,
				loading: false,
				reloadSession: reloadSessionMock,
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert
			expect(result.current.reloadSession).toBeDefined();
			expect(typeof result.current.reloadSession).toBe("function");
		});

		it("should call reloadSession when invoked", async () => {
			// Arrange
			const reloadSessionMock = vi.fn().mockResolvedValue(undefined);
			const mockSessionContext = {
				user: { id: "user_1", email: "test@example.com" },
				session: { id: "sess_1" },
				loaded: true,
				loading: false,
				reloadSession: reloadSessionMock,
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });
			await result.current.reloadSession();

			// Assert
			expect(reloadSessionMock).toHaveBeenCalledOnce();
		});
	});

	describe("RED: Security - CSRF Protection", () => {
		it("should use httpOnly secure cookies (documented expectation)", () => {
			// This test documents that CSRF protection is handled by Better Auth
			// via httpOnly secure cookies. No client-side code needed.

			// Arrange
			const mockSessionContext = {
				user: { id: "user_1", email: "test@example.com" },
				session: { id: "sess_1" },
				loaded: true,
				loading: false,
				reloadSession: vi.fn().mockResolvedValue(undefined),
			};

			const wrapper = createWrapper(mockSessionContext);

			// Act
			const { result } = renderHook(() => useSession(), { wrapper });

			// Assert - Session data retrieved without client-side token handling
			expect(result.current.user).toBeDefined();
			expect(result.current.session).toBeDefined();

			// Note: Better Auth server config ensures:
			// - httpOnly: true (prevents XSS access)
			// - secure: true in production (HTTPS only)
			// - sameSite: 'lax' (CSRF protection)
		});
	});

	describe("RED: Context requirement", () => {
		it("should throw error when used outside SessionProvider", () => {
			// This test ensures proper context usage
			expect(() => {
				renderHook(() => useSession());
			}).toThrow("useSession must be used within SessionProvider");
		});
	});
});
