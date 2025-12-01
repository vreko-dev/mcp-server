import { snapbackAuth } from "@snapback/auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireStepUp, requireVerifiedEmail } from "../lib/auth/server";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

// Mock @snapback/auth
vi.mock("@snapback/auth", () => {
	const mockSnapbackAuth = {
		requireAuth: vi.fn(),
	};
	return {
		snapbackAuth: mockSnapbackAuth,
	};
});

// Mock next/headers
vi.mock("next/headers", () => ({
	headers: vi.fn().mockResolvedValue(new Headers()),
}));

describe("Next.js Auth Helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("requireVerifiedEmail", () => {
		it("should redirect when email is not verified", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				emailVerified: false, // Not verified
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			await requireVerifiedEmail();

			expect(redirect).toHaveBeenCalledWith("/auth/verify-email");
		});

		it("should return context when email is verified", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				emailVerified: true, // Verified
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			const result = await requireVerifiedEmail();

			expect(result).toEqual(mockContext);
			expect(redirect).not.toHaveBeenCalled();
		});
	});

	describe("requireStepUp", () => {
		it("should redirect when neither 2FA nor passkey is enabled", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				twoFactorEnabled: false,
				passkeyRegistered: false,
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			await requireStepUp();

			expect(redirect).toHaveBeenCalledWith("/auth/step-up");
		});

		it("should return context when 2FA is enabled", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				twoFactorEnabled: true, // 2FA enabled
				passkeyRegistered: false,
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			const result = await requireStepUp();

			expect(result).toEqual(mockContext);
			expect(redirect).not.toHaveBeenCalled();
		});

		it("should return context when passkey is registered", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				twoFactorEnabled: false,
				passkeyRegistered: true, // Passkey registered
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			const result = await requireStepUp();

			expect(result).toEqual(mockContext);
			expect(redirect).not.toHaveBeenCalled();
		});

		it("should redirect when passkey is required but not registered", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				twoFactorEnabled: false,
				passkeyRegistered: false,
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			await requireStepUp({ requirePasskey: true });

			expect(redirect).toHaveBeenCalledWith("/auth/step-up");
		});

		it("should return context when passkey is required and registered", async () => {
			const mockContext = {
				userId: "user-123",
				email: "test@example.com",
				role: "user",
				plan: "free",
				authenticatedVia: "session",
				twoFactorEnabled: false,
				passkeyRegistered: true, // Passkey registered
			};

			vi.mocked(snapbackAuth.requireAuth).mockResolvedValue(mockContext);

			const result = await requireStepUp({ requirePasskey: true });

			expect(result).toEqual(mockContext);
			expect(redirect).not.toHaveBeenCalled();
		});
	});
});
