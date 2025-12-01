/**
 * Authentication Client Tests (TDD)
 *
 * Tests for Better Auth client integration with comprehensive error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getSession,
	sendPasswordResetEmail,
	signInWithEmail,
	signInWithGithub,
	signInWithGoogle,
	signOut,
	signUpWithEmail,
} from "@/lib/auth/helpers";

// Mock authClient
vi.mock("@snapback/auth/client", () => ({
	authClient: {
		signIn: {
			email: vi.fn(),
			social: vi.fn(),
		},
		signUp: {
			email: vi.fn(),
		},
		forgetPassword: vi.fn(),
		getSession: vi.fn(),
		signOut: vi.fn(),
	},
}));

describe("Authentication Client Helpers", () => {
	describe("signInWithEmail", () => {
		it("should successfully sign in with valid credentials", async () => {
			const mockUser = {
				id: "1",
				email: "test@example.com",
				name: "Test User",
			};

			vi.mocked(// authClient.signIn.email).mockResolvedValue({
				data: mockUser,
				error: null,
			} as any);

			const result = await signInWithEmail("test@example.com", "password123");

			expect(result.success).toBe(true);
			expect(result.user).toEqual(mockUser);
			expect(// authClient.signIn.email).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
			});
		});

		it("should return error for invalid credentials", async () => {

			vi.mocked(// authClient.signIn.email).mockResolvedValue({
				data: null,
				error: { message: "Invalid credentials" },
			} as any);

			const result = await signInWithEmail("test@example.com", "wrongpassword");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Invalid credentials");
		});

		it("should handle network errors gracefully", async () => {

			vi.mocked(// authClient.signIn.email).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await signInWithEmail("test@example.com", "password123");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});

		it("should reject empty email", async () => {
			const result = await signInWithEmail("", "password123");

			expect(result.success).toBe(false);
			expect(result.error).toContain("email");
		});

		it("should reject empty password", async () => {
			const result = await signInWithEmail("test@example.com", "");

			expect(result.success).toBe(false);
			expect(result.error).toContain("password");
		});

		it("should reject invalid email format", async () => {
			const result = await signInWithEmail("invalid-email", "password123");

			expect(result.success).toBe(false);
			expect(result.error).toContain("email");
		});
	});

	describe("signInWithGithub", () => {
		it("should initiate GitHub OAuth flow", async () => {

			vi.mocked(// authClient.signIn.social).mockResolvedValue({
				data: { url: "https://github.com/login/oauth/authorize" },
				error: null,
			} as any);

			const result = await signInWithGithub();

			expect(result.success).toBe(true);
			expect(// authClient.signIn.social).toHaveBeenCalledWith({
				provider: "github",
				callbackURL: expect.any(String),
			});
		});

		it("should handle OAuth initialization failure", async () => {

			vi.mocked(// authClient.signIn.social).mockRejectedValue(
				new Error("OAuth failed"),
			);

			const result = await signInWithGithub();

			expect(result.success).toBe(false);
			expect(result.error).toBe("OAuth failed");
		});
	});

	describe("signInWithGoogle", () => {
		it("should initiate Google OAuth flow", async () => {

			vi.mocked(// authClient.signIn.social).mockResolvedValue({
				data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
				error: null,
			} as any);

			const result = await signInWithGoogle();

			expect(result.success).toBe(true);
			expect(// authClient.signIn.social).toHaveBeenCalledWith({
				provider: "google",
				callbackURL: expect.any(String),
			});
		});
	});

	describe("signUpWithEmail", () => {
		it("should successfully create account with email and password", async () => {
			const mockUser = { id: "1", email: "new@example.com", name: "New User" };

			vi.mocked(// authClient.signUp.email).mockResolvedValue({
				data: mockUser,
				error: null,
			} as any);

			const result = await signUpWithEmail(
				"new@example.com",
				"password123",
				"New User",
			);

			expect(result.success).toBe(true);
			expect(result.user).toEqual(mockUser);
			expect(// authClient.signUp.email).toHaveBeenCalledWith({
				email: "new@example.com",
				password: "password123",
				name: "New User",
			});
		});

		it("should handle duplicate email error", async () => {

			vi.mocked(// authClient.signUp.email).mockResolvedValue({
				data: null,
				error: { message: "Email already exists" },
			} as any);

			const result = await signUpWithEmail(
				"existing@example.com",
				"password123",
			);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Email already exists");
		});

		it("should enforce minimum password length", async () => {
			const result = await signUpWithEmail("test@example.com", "short");

			expect(result.success).toBe(false);
			expect(result.error).toContain("8 characters");
		});
	});

	describe("sendPasswordResetEmail", () => {
		it("should successfully send reset email", async () => {

			vi.mocked(// authClient.forgetPassword).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await sendPasswordResetEmail("test@example.com");

			expect(result.success).toBe(true);
			expect(// authClient.forgetPassword).toHaveBeenCalledWith({
				email: "test@example.com",
				redirectTo: expect.stringContaining("/auth/reset-password"),
			});
		});

		it("should handle invalid email", async () => {
			const result = await sendPasswordResetEmail("invalid-email");

			expect(result.success).toBe(false);
			expect(result.error).toContain("email");
		});
	});

	describe("getSession", () => {
		it("should return session when authenticated", async () => {
			const mockSession = {
				user: { id: "1", email: "test@example.com" },
				session: { id: "session-1", expiresAt: new Date() },
			};

			vi.mocked(// authClient.getSession).mockResolvedValue({
				data: mockSession,
			} as any);

			const result = await getSession();

			expect(result).toEqual(mockSession);
		});

		it("should return null when not authenticated", async () => {

			vi.mocked(// authClient.getSession).mockResolvedValue({
				data: null,
			} as any);

			const result = await getSession();

			expect(result).toBeNull();
		});

		it("should handle session fetch errors", async () => {

			vi.mocked(// authClient.getSession).mockRejectedValue(
				new Error("Session fetch failed"),
			);

			const result = await getSession();

			expect(result).toBeNull();
		});
	});

	describe("signOut", () => {
		it("should successfully sign out", async () => {

			vi.mocked(// authClient.signOut).mockResolvedValue({
				data: { success: true },
				error: null,
			} as any);

			const result = await signOut();

			expect(result.success).toBe(true);
			expect(// authClient.signOut).toHaveBeenCalled();
		});

		it("should handle sign out errors", async () => {

			vi.mocked(// authClient.signOut).mockRejectedValue(
				new Error("Sign out failed"),
			);

			const result = await signOut();

			expect(result.success).toBe(false);
			expect(result.error).toBe("Sign out failed");
		});
	});
});
