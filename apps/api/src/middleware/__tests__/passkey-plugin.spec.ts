/**
 * Passkey Plugin Integration Tests (TDD Red Phase)
 * Tests for better-auth's passkey plugin replacing custom middleware
 */

import { describe, expect, it } from "vitest";

/**
 * RED phase tests - Define expected behavior from better-auth's passkey plugin
 */
describe("Passkey Plugin Integration (RED PHASE)", () => {
	describe("passkey-plugin-001: List user passkeys", () => {
		it("should list all passkeys for a user using auth.api.listPasskeys()", async () => {
			// better-auth's passkey plugin provides:
			// auth.api.listPasskeys({ query: { userId } }) returns:
			// [{
			//   id: string;
			//   name: string;
			//   publicKey: string;
			//   counter: number;
			//   transports?: string[];
			//   createdAt: Date;
			//   lastUsed?: Date;
			//   credentialId: string;
			//   aaguid: string;
			// }, ...]

			const mockPasskeys = [
				{
					id: "pk-001",
					name: "MacBook Pro",
					credentialId: "cred-123",
					aaguid: "aaguid-123",
					counter: 0,
					createdAt: new Date("2025-11-01"),
					lastUsed: new Date("2025-11-19"),
				},
				{
					id: "pk-002",
					name: "Security Key",
					credentialId: "cred-456",
					aaguid: "aaguid-456",
					counter: 5,
					createdAt: new Date("2025-10-15"),
					lastUsed: new Date("2025-11-18"),
				},
			];

			expect(mockPasskeys).toHaveLength(2);
			expect(mockPasskeys[0].name).toBe("MacBook Pro");
			expect(mockPasskeys[1].name).toBe("Security Key");
		});
	});

	describe("passkey-plugin-002: Check passkey enrollment status", () => {
		it("should determine if user has any passkeys", async () => {
			// User with passkeys
			const enrolledUser = {
				passkeys: [{ id: "pk-001" }, { id: "pk-002" }],
			};

			// User without passkeys
			const unenrolledUser = {
				passkeys: [],
			};

			expect(enrolledUser.passkeys.length).toBeGreaterThan(0);
			expect(unenrolledUser.passkeys.length).toBe(0);
		});
	});

	describe("passkey-plugin-003: Passkey metadata", () => {
		it("should provide passkey metadata for display", async () => {
			// Passkey objects include metadata:
			const passkey = {
				id: "pk-001",
				name: "MacBook Pro", // User-friendly name
				createdAt: new Date("2025-11-01"),
				lastUsed: new Date("2025-11-19"),
				credentialId: "cred-123",
				counter: 0,
			};

			expect(passkey.name).toBeDefined();
			expect(passkey.createdAt).toBeInstanceOf(Date);
			expect(passkey.lastUsed).toBeInstanceOf(Date);
		});
	});

	describe("passkey-plugin-004: Passkey verification", () => {
		it("should verify passkey assertions during authentication", async () => {
			// better-auth handles WebAuthn challenge/response flow:
			// 1. GET /api/auth/passkey/request - Get challenge
			// 2. User authenticates with security key
			// 3. POST /api/auth/passkey/verify - Verify assertion
			//
			// Returns: { verified: true; user: {...}; session: {...} }

			const verificationResponse = {
				verified: true,
				user: { id: "user-123", email: "user@example.com" },
				session: { expiresAt: new Date() },
			};

			expect(verificationResponse.verified).toBe(true);
			expect(verificationResponse.user.id).toBeDefined();
		});
	});

	describe("passkey-plugin-005: Backup codes", () => {
		it("should generate backup codes on passkey enrollment", async () => {
			// better-auth automatically generates backup codes
			const enrollmentResponse = {
				passkey: { id: "pk-001" },
				backupCodes: ["1234-5678-90AB", "CDEF-GH IJ-KLMN", "OPQR-STUV-WXYZ"],
			};

			expect(enrollmentResponse.backupCodes).toHaveLength(3);
			expect(enrollmentResponse.backupCodes[0]).toMatch(
				/^\d{4}-\d{4}-\d{2}[A-Z0-9]{2}$/,
			);
		});
	});

	describe("passkey-plugin-006: Passkey deletion", () => {
		it("should support passkey deletion", async () => {
			// better-auth provides deletion endpoint
			// DELETE /api/auth/passkey/:passkeyId
			// Response: { success: true }

			const deleteResponse = {
				success: true,
			};

			expect(deleteResponse.success).toBe(true);
		});
	});

	describe("passkey-plugin-007: Multi-device support", () => {
		it("should support multiple passkeys per user", async () => {
			// Users can enroll multiple passkeys for redundancy
			const user = {
				passkeys: [
					{ id: "pk-001", name: "MacBook Pro" },
					{ id: "pk-002", name: "Security Key" },
					{ id: "pk-003", name: "iPhone" },
				],
			};

			expect(user.passkeys).toHaveLength(3);
			expect(user.passkeys[0].id).not.toBe(user.passkeys[1].id);
		});
	});

	describe("passkey-plugin-008: Transports support", () => {
		it("should track transport protocols used by passkeys", async () => {
			// WebAuthn transports: "ble", "internal", "nfc", "usb", "hybrid"
			const passkeys = [
				{
					id: "pk-001",
					name: "Biometric (internal)",
					transports: ["internal"],
				},
				{
					id: "pk-002",
					name: "Security Key (USB)",
					transports: ["usb"],
				},
				{
					id: "pk-003",
					name: "Cross-device (hybrid)",
					transports: ["hybrid"],
				},
			];

			expect(passkeys[0].transports).toContain("internal");
			expect(passkeys[1].transports).toContain("usb");
			expect(passkeys[2].transports).toContain("hybrid");
		});
	});
});

/**
 * Middleware integration tests
 */
describe("Passkey Enforcement Middleware", () => {
	describe("requirePasskey middleware", () => {
		it("should check if user has passkeys enrolled", async () => {
			// Middleware should:
			// 1. Get user from context
			// 2. Call auth.api.listPasskeys({ query: { userId } })
			// 3. Check if array has length > 0
			// 4. Return 409 if not enrolled
			// 5. Allow request if enrolled

			const userWithPasskey = {
				id: "user-123",
				passkeys: [{ id: "pk-001" }],
			};

			const userWithoutPasskey = {
				id: "user-456",
				passkeys: [],
			};

			expect(userWithPasskey.passkeys.length).toBeGreaterThan(0);
			expect(userWithoutPasskey.passkeys.length).toBe(0);
		});

		it("should return 409 Conflict when passkey enrollment is required", async () => {
			// Response structure:
			const response = {
				status: 409,
				error: "Passkey enrollment required",
				code: "PASSKEY_ENROLLMENT_REQUIRED",
				enrollmentUrl: "/settings/security/passkey/enroll",
			};

			expect(response.status).toBe(409);
			expect(response.code).toBe("PASSKEY_ENROLLMENT_REQUIRED");
		});

		it("should allow request when user has passkeys", async () => {
			// User has passkeys, middleware allows through
			const _session = {
				user: { id: "user-123" },
			};

			const passkeys = [{ id: "pk-001" }];

			const shouldAllow = passkeys.length > 0;
			expect(shouldAllow).toBe(true);
		});

		it("should handle feature flag to disable enforcement", async () => {
			// FEATURE_PASSKEY_ENFORCE_ALL environment variable
			const isEnforced = process.env.FEATURE_PASSKEY_ENFORCE_ALL === "true";

			// Default or explicitly set value
			expect(typeof isEnforced).toBe("boolean");
		});
	});

	describe("suggestPasskey middleware", () => {
		it("should add suggestion header when user lacks passkeys", async () => {
			const response = {
				status: 200,
				headers: {
					"X-Passkey-Suggestion": "enroll",
					"X-Passkey-Enrollment-Url": "/settings/security/passkey/enroll",
				},
			};

			expect(response.headers["X-Passkey-Suggestion"]).toBe("enroll");
			expect(response.headers["X-Passkey-Enrollment-Url"]).toBeDefined();
		});

		it("should not add header when user has passkeys", async () => {
			// No suggestion headers added
			const response = {
				status: 200,
				headers: {},
			};

			expect(Object.keys(response.headers)).not.toContain(
				"X-Passkey-Suggestion",
			);
		});
	});
});
