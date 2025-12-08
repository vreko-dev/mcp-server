import { renderHook } from "@testing-library/react";
import posthog from "posthog-js";
import { type ReactNode, useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePostHogAuth } from "@/modules/saas/auth/hooks/use-posthog-auth";
import type { SessionContext } from "@/modules/saas/auth/lib/session-context";

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		init: vi.fn(),
		capture: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
	},
}));

describe("PostHog User Identification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key_12345";
	});

	afterEach(() => {
		delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
	});

	it("should identify user after login", () => {
		const _identifySpy = vi.spyOn(posthog, "identify");

		const mockUser = {
			id: "user123",
			email: "test@example.com",
			name: "Test User",
			createdAt: new Date("2024-01-01"),
		};

		const _wrapper = ({ children }: { children: ReactNode }) => (
			<SessionContext.Provider
				value={{
					session: { id: "session123" } as any,
					user: mockUser as any,
					loaded: true,
					reloadSession: vi.fn(),
				}}
			>
				{children}
			</SessionContext.Provider>
		);

		renderHook(() => usePostHogAuth(), { wrapper });

		expect(identifySpy).toHaveBeenCalledTimes(1);
		expect(identifySpy).toHaveBeenCalledWith("user123", {
			email: "test@example.com",
			name: "Test User",
			createdAt: mockUser.createdAt,
		});
	});

	it("should reset PostHog on logout", () => {
		const _resetSpy = vi.spyOn(posthog, "reset");

		const _wrapper = ({ children }: { children: ReactNode }) => (
			<SessionContext.Provider
				value={{
					session: null,
					user: null,
					loaded: true,
					reloadSession: vi.fn(),
				}}
			>
				{children}
			</SessionContext.Provider>
		);

		renderHook(() => usePostHogAuth(), { wrapper });

		expect(resetSpy).toHaveBeenCalledTimes(1);
	});

	it("should not identify when PostHog key is missing", () => {
		delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
		const _identifySpy = vi.spyOn(posthog, "identify");

		const mockUser = {
			id: "user123",
			email: "test@example.com",
			name: "Test User",
			createdAt: new Date(),
		};

		const _wrapper = ({ children }: { children: ReactNode }) => (
			<SessionContext.Provider
				value={{
					session: { id: "session123" } as any,
					user: mockUser as any,
					loaded: true,
					reloadSession: vi.fn(),
				}}
			>
				{children}
			</SessionContext.Provider>
		);

		renderHook(() => usePostHogAuth(), { wrapper });

		expect(identifySpy).not.toHaveBeenCalled();
	});

	it("should update identification when user changes", () => {
		const _identifySpy = vi.spyOn(posthog, "identify");

		const mockUser1 = {
			id: "user1",
			email: "user1@example.com",
			name: "User One",
			createdAt: new Date(),
		};

		const _mockUser2 = {
			id: "user2",
			email: "user2@example.com",
			name: "User Two",
			createdAt: new Date(),
		};

		const currentUser = mockUser1;

		const _TestWrapper = ({ children }: { children: ReactNode }) => {
			const [user, setUser] = useState(currentUser);

			useEffect(() => {
				setUser(currentUser);
			}, [currentUser]);

			return (
				<SessionContext.Provider
					value={{
						session: { id: "session123" } as any,
						user: user as any,
						loaded: true,
						reloadSession: vi.fn(),
					}}
				>children
				</SessionContext.Provider>
			);
		};

		const { rerender } = renderHook(() => usePostHogAuth(), {
			wrapper: TestWrapper,
		});

		expect(identifySpy).toHaveBeenCalledWith("user1", expect.any(Object));

		// Change user
		currentUser = mockUser2;
		rerender();

		expect(identifySpy).toHaveBeenCalledWith("user2", expect.any(Object));
		expect(identifySpy).toHaveBeenCalledTimes(2);
	});

	it("should transition from logged in to logged out", () => {
		const _identifySpy = vi.spyOn(posthog, "identify");
		const _resetSpy = vi.spyOn(posthog, "reset");

		const _mockUser = {
			id: "user123",
			email: "test@example.com",
			name: "Test User",
			createdAt: new Date(),
		};

		const _Wrapper = ({ children, user }: { children: ReactNode; user: any }) => (
			<SessionContext.Provider
				value={{
					session: user ? { id: "session123" } : null,
					user: user,
					loaded: true,
					reloadSession: vi.fn(),
				}}
			>
				{children}
			</SessionContext.Provider>
		);

		const { rerender } = renderHook(() => usePostHogAuth(), {
			wrapper: ({ children }) => <Wrapper user={mockUser}>{children}</Wrapper>,
		});

		expect(identifySpy).toHaveBeenCalledTimes(1);

		// Logout
		rerender();
		const WrapperLoggedOut = ({ children }: { children: ReactNode }) => (
			<Wrapper user={null}>{children}</Wrapper>
		);
		renderHook(() => usePostHogAuth(), { wrapper: WrapperLoggedOut });

		expect(resetSpy).toHaveBeenCalledTimes(1);
	});
});

// Import useState here to avoid hoisting issues
import { useState } from "react";
