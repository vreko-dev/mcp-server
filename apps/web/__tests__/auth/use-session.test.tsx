/**
 * useSession Hook Tests (TDD)
 *
 * Tests for session management hook with auth state changes
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/use-session";

// Mock authClient
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		getSession: vi.fn(),
		onAuthStateChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
	},
}));

describe("useSession Hook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return loading state initially", () => {
		const { result } = renderHook(() => useSession());

		expect(result.current.loading).toBe(true);
		expect(result.current.session).toBeNull();
	});

	it("should load session on mount", async () => {
		const mockSession = {
			user: { id: "1", email: "test@example.com", name: "Test User" },
			session: { id: "session-1", expiresAt: new Date() },
		};

		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: mockSession,
		} as any);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.session).toEqual(mockSession);
	});

	it("should handle no session (unauthenticated)", async () => {

		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: null,
		} as any);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.session).toBeNull();
	});

	it("should handle session loading errors gracefully", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(// authClient.getSession).mockRejectedValue(
			new Error("Session load failed"),
		);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.session).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith(
			"Failed to load session:",
			expect.any(Error),
		);

		consoleSpy.mockRestore();
	});

	it("should subscribe to auth state changes", async () => {
		let authStateCallback: ((session: any) => void) | null = null;

		vi.mocked(// authClient.onAuthStateChange).mockImplementation((callback) => {
			authStateCallback = callback;
			return vi.fn(); // unsubscribe function
		});

		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: null,
		} as any);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		// Simulate auth state change
		const newSession = {
			user: { id: "2", email: "new@example.com", name: "New User" },
			session: { id: "session-2", expiresAt: new Date() },
		};

		if (authStateCallback) {
			authStateCallback(newSession);
		}

		await waitFor(() => {
			expect(result.current.session).toEqual(newSession);
		});
	});

	it("should unsubscribe on unmount", async () => {
		const unsubscribeMock = vi.fn();

		vi.mocked(// authClient.onAuthStateChange).mockReturnValue(unsubscribeMock);
		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: null,
		} as any);

		const { unmount } = renderHook(() => useSession());

		await waitFor(() => {
			expect(// authClient.onAuthStateChange).toHaveBeenCalled();
		});

		unmount();

		expect(unsubscribeMock).toHaveBeenCalled();
	});

	it("should provide user information when authenticated", async () => {
		const mockSession = {
			user: {
				id: "123",
				email: "john@example.com",
				name: "John Doe",
				image: "https://example.com/avatar.jpg",
			},
			session: {
				id: "session-123",
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
			},
		};

		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: mockSession,
		} as any);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.session?.user.id).toBe("123");
		expect(result.current.session?.user.email).toBe("john@example.com");
		expect(result.current.session?.user.name).toBe("John Doe");
	});

	it("should handle session expiration", async () => {
		let authStateCallback: ((session: any) => void) | null = null;

		vi.mocked(// authClient.onAuthStateChange).mockImplementation((callback) => {
			authStateCallback = callback;
			return vi.fn();
		});

		const mockSession = {
			user: { id: "1", email: "test@example.com" },
			session: { id: "session-1", expiresAt: new Date() },
		};

		vi.mocked(// authClient.getSession).mockResolvedValue({
			data: mockSession,
		} as any);

		const { result } = renderHook(() => useSession());

		await waitFor(() => {
			expect(result.current.session).toEqual(mockSession);
		});

		// Simulate session expiration
		if (authStateCallback) {
			authStateCallback(null);
		}

		await waitFor(() => {
			expect(result.current.session).toBeNull();
		});
	});
});
