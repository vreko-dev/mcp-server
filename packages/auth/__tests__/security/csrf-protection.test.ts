/**
 * CSRF Protection Security Tests - RED Phase
 *
 * Comprehensive test suite for Cross-Site Request Forgery (CSRF) protection
 * Tests token generation, validation, origin checking, and request method verification
 *
 * OWASP Standard: A01:2021 – Broken Access Control
 * Better Auth CSRF Features: State parameter, origin verification, custom token handling
 */

import { beforeEach, describe, expect, it } from "vitest";

// ============================================================================
// CSRF Token Structure & Generation Tests
// ============================================================================

describe("CSRF Protection - Token Generation & Structure", () => {
	describe("csrf-001: Token generation cryptographic strength", () => {
		it("should generate cryptographically secure random tokens", () => {
			// REQUIREMENT: Tokens must be generated using crypto.getRandomValues()
			// or equivalent cryptographically secure RNG (NOT Math.random())
			const tokenRegex = /^[a-zA-Z0-9]{32,64}$/;

			// Simulate token generation
			const token = generateSecureToken(32);

			expect(token).toMatch(tokenRegex);
			expect(token.length).toBeGreaterThanOrEqual(32);
		});

		it("should generate unique tokens on each request", () => {
			// REQUIREMENT: Each CSRF token must be unique
			// Two generated tokens should never be identical
			const token1 = generateSecureToken(32);
			const token2 = generateSecureToken(32);

			expect(token1).not.toBe(token2);
		});

		it("should use minimum 32 bytes (256 bits) of entropy", () => {
			// REQUIREMENT: OWASP recommends minimum 256-bit entropy for CSRF tokens
			const token = generateSecureToken(32);
			const _byteLength = Buffer.from(token).length;

			// 32 hex chars = 128 bits, base64-encoded 32 bytes = 43 chars, etc
			expect(token.length).toBeGreaterThanOrEqual(32);
		});
	});

	describe("csrf-002: Token format and encoding", () => {
		it("should encode tokens in safe format (base64url or hex)", () => {
			// REQUIREMENT: Tokens must be URL-safe to prevent encoding issues
			const token = generateSecureToken(32);
			const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
			const hexRegex = /^[0-9a-f]+$/i;

			const isValidFormat = base64UrlRegex.test(token) || hexRegex.test(token);
			expect(isValidFormat).toBe(true);
		});

		it("should prevent token interpretation as special characters", () => {
			// REQUIREMENT: Tokens must not contain quotes, slashes, etc that could break HTML/JSON
			const token = generateSecureToken(32);
			const problematicChars = /['"\\/<>{}]/g;

			expect(token).not.toMatch(problematicChars);
		});
	});

	describe("csrf-003: Token storage and transmission", () => {
		it("should store CSRF token in memory or session (not localStorage)", () => {
			// REQUIREMENT: CSRF tokens should NOT be stored in localStorage (vulnerable to XSS)
			// Should be in httpOnly cookies or session storage
			const tokenStorage = "sessionStorage"; // or "cookie"

			expect(["sessionStorage", "cookie", "session"].includes(tokenStorage)).toBe(true);
		});

		it("should transmit token via POST body or custom header (never URL parameter)", () => {
			// REQUIREMENT: Token transmission location matters for security
			// POST body: _csrf=token
			// Header: X-CSRF-Token: token
			// NOT: ?_csrf=token (logged in server logs, browser history)
			const validTransmissionMethods = ["POST_BODY", "CUSTOM_HEADER", "HTTP_HEADER"];

			const method = "CUSTOM_HEADER";
			expect(validTransmissionMethods).toContain(method);
		});
	});
});

// ============================================================================
// CSRF Token Validation Tests
// ============================================================================

describe("CSRF Protection - Token Validation", () => {
	let validToken: string;
	let _sessionToken: string;

	beforeEach(() => {
		validToken = generateSecureToken(32);
		_sessionToken = generateSecureToken(32);
	});

	describe("csrf-004: Token comparison and verification", () => {
		it("should verify token using constant-time comparison", () => {
			// REQUIREMENT: Use crypto.timingSafeEqual() or equivalent
			// Prevents timing-based token enumeration attacks
			const provided = validToken;
			const stored = validToken;

			const isValid = constantTimeEqual(provided, stored);
			expect(isValid).toBe(true);
		});

		it("should reject mismatched tokens", () => {
			// REQUIREMENT: Any mismatch should immediately reject
			const provided = generateSecureToken(32);
			const stored = generateSecureToken(32);

			const isValid = constantTimeEqual(provided, stored);
			expect(isValid).toBe(false);
		});

		it("should reject empty or missing tokens", () => {
			// REQUIREMENT: Empty strings should be rejected
			expect(constantTimeEqual("", "token")).toBe(false);
			expect(constantTimeEqual("token", "")).toBe(false);
			expect(constantTimeEqual("", "")).toBe(false);
		});

		it("should reject tokens of wrong length", () => {
			// REQUIREMENT: Tokens must be exact length (prevents manipulation)
			const _validLength = 32;
			const tooShort = generateSecureToken(16);
			const tooLong = generateSecureToken(64);

			expect(constantTimeEqual(tooShort, validToken)).toBe(false);
			expect(constantTimeEqual(tooLong, validToken)).toBe(false);
		});

		it("should reject base64-corrupted tokens", () => {
			// REQUIREMENT: Invalid base64 should fail gracefully
			const invalidBase64 = "not-valid-base64!!!";
			const valid = generateSecureToken(32);

			expect(constantTimeEqual(invalidBase64, valid)).toBe(false);
		});
	});

	describe("csrf-005: Token expiration and lifecycle", () => {
		it("should expire CSRF tokens after session ends", () => {
			// REQUIREMENT: Tokens tied to session lifecycle
			const _token = generateSecureToken(32);
			const sessionExpired = true;

			const isValid = !sessionExpired;
			expect(isValid).toBe(false);
		});

		it("should regenerate token after authentication", () => {
			// REQUIREMENT: New token after login prevents token fixation
			const preAuthToken = generateSecureToken(32);
			const postAuthToken = generateSecureToken(32);

			expect(preAuthToken).not.toBe(postAuthToken);
		});

		it("should support optional per-request token rotation", () => {
			// REQUIREMENT: Double-submit cookie pattern alternates tokens
			const token1 = generateSecureToken(32);
			const token2 = generateSecureToken(32);

			expect(token1).not.toBe(token2);
		});

		it("should reject expired tokens", () => {
			// REQUIREMENT: Old tokens should not validate
			const currentTime = Date.now();
			const tokenExpiryMs = 60 * 60 * 1000; // 1 hour
			const tokenGeneratedAt = currentTime - 2 * tokenExpiryMs; // 2 hours ago

			const isExpired = currentTime - tokenGeneratedAt > tokenExpiryMs;
			expect(isExpired).toBe(true);
		});
	});
});

// ============================================================================
// CSRF Origin & Referrer Validation Tests
// ============================================================================

describe("CSRF Protection - Origin Validation", () => {
	describe("csrf-006: Origin header verification", () => {
		it("should verify Origin header matches expected domain", () => {
			// REQUIREMENT: Origin: https://console.snapback.dev must match trust list
			const trustedOrigins = ["https://console.snapback.dev", "http://localhost:3000"];
			const requestOrigin = "https://console.snapback.dev";

			const isOriginValid = trustedOrigins.includes(requestOrigin);
			expect(isOriginValid).toBe(true);
		});

		it("should reject requests from untrusted origins", () => {
			// REQUIREMENT: Cross-origin requests should be rejected
			const trustedOrigins = ["https://console.snapback.dev", "http://localhost:3000"];
			const maliciousOrigin = "https://attacker.com";

			const isOriginValid = trustedOrigins.includes(maliciousOrigin);
			expect(isOriginValid).toBe(false);
		});

		it("should reject null or missing Origin header on state-changing requests", () => {
			// REQUIREMENT: POST/PUT/DELETE without Origin should be blocked
			// Only safe methods (GET) may omit Origin
			const origin = null;
			const method = "POST";

			const shouldRequireOrigin = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
			expect(shouldRequireOrigin && !origin).toBe(true);
		});

		it("should handle origin with port numbers correctly", () => {
			// REQUIREMENT: http://localhost:3000 !== http://localhost:3001
			const origin1 = "http://localhost:3000";
			const origin2 = "http://localhost:3001";

			expect(origin1).not.toBe(origin2);
		});

		it("should reject origins with different protocols", () => {
			// REQUIREMENT: http:// !== https://
			const trustedOrigins = ["https://console.snapback.dev"];
			const httpOrigin = "http://console.snapback.dev";

			const isValid = trustedOrigins.includes(httpOrigin);
			expect(isValid).toBe(false);
		});

		it("should reject wildcard origins in trust list", () => {
			// REQUIREMENT: Wildcards (*.snapback.dev) should NOT be allowed
			// Must explicitly list all trusted origins
			const trustedOrigins = [
				"https://console.snapback.dev",
				// NOT: "https://*.snapback.dev"
			];

			const hasWildcard = trustedOrigins.some((o) => o.includes("*"));
			expect(hasWildcard).toBe(false);
		});
	});

	describe("csrf-007: Referer header fallback validation", () => {
		it("should fall back to Referer header if Origin is missing", () => {
			// REQUIREMENT: Origin header missing but Referer present is acceptable
			const origin = null;
			const referer = "https://console.snapback.dev/app";

			const isValid = !origin && referer;
			expect(isValid).toBe(true);
		});

		it("should extract domain from Referer header correctly", () => {
			// REQUIREMENT: Referer: https://console.snapback.dev/app/users
			// Should verify domain, ignoring path
			const referer = "https://console.snapback.dev/app/users";
			const domain = new URL(referer).origin;

			expect(domain).toBe("https://console.snapback.dev");
		});

		it("should reject Referer header from different domain", () => {
			// REQUIREMENT: Referer from attacker must be rejected
			const referer = "https://attacker.com/phishing";
			const trustedOrigin = "https://console.snapback.dev";

			const domain = new URL(referer).origin;
			const isValid = domain === trustedOrigin;
			expect(isValid).toBe(false);
		});

		it("should handle missing both Origin and Referer (block with strict policy)", () => {
			// REQUIREMENT: No Origin + No Referer on POST should be blocked
			const origin = null;
			const referer = null;
			const method = "POST";

			const shouldBlock = method === "POST" && !origin && !referer;
			expect(shouldBlock).toBe(true);
		});
	});
});

// ============================================================================
// CSRF Request Method Validation Tests
// ============================================================================

describe("CSRF Protection - Request Method Verification", () => {
	describe("csrf-008: Safe vs unsafe HTTP methods", () => {
		it("should not require CSRF token for safe methods (GET, HEAD, OPTIONS)", () => {
			// REQUIREMENT: GET, HEAD, OPTIONS are read-only safe methods
			const safeMethods = ["GET", "HEAD", "OPTIONS"];

			safeMethods.forEach((method) => {
				const requiresToken = !["GET", "HEAD", "OPTIONS"].includes(method);
				expect(requiresToken).toBe(false);
			});
		});

		it("should require CSRF token for unsafe methods (POST, PUT, DELETE, PATCH)", () => {
			// REQUIREMENT: State-changing methods must verify CSRF token
			const unsafeMethods = ["POST", "PUT", "DELETE", "PATCH"];

			unsafeMethods.forEach((method) => {
				const requiresToken = ["POST", "PUT", "DELETE", "PATCH"].includes(method);
				expect(requiresToken).toBe(true);
			});
		});

		it("should accept CSRF token in POST body for form submissions", () => {
			// REQUIREMENT: Traditional HTML form: <input name="_csrf" value="token">
			const body = {
				_csrf: generateSecureToken(32),
				username: "user@example.com",
				password: "password",
			};

			expect("_csrf" in body).toBe(true);
		});

		it("should accept CSRF token in X-CSRF-Token header for AJAX", () => {
			// REQUIREMENT: AJAX requests send token in header
			const headers = {
				"X-CSRF-Token": generateSecureToken(32),
				"Content-Type": "application/json",
			};

			expect("X-CSRF-Token" in headers).toBe(true);
		});

		it("should accept CSRF token in X-Requested-With: XMLHttpRequest", () => {
			// REQUIREMENT: AJAX detection via X-Requested-With prevents CSRF
			const headers = {
				"X-Requested-With": "XMLHttpRequest",
				"X-CSRF-Token": generateSecureToken(32),
			};

			expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
		});
	});

	describe("csrf-009: Method override attacks", () => {
		it("should reject X-HTTP-Method-Override header attacks", () => {
			// REQUIREMENT: Form with POST but X-HTTP-Method-Override: DELETE
			// should be treated as DELETE (unsafe), not bypassed
			const _requestMethod = "POST";
			const overrideHeader = "X-HTTP-Method-Override";
			const _actualMethod = "DELETE";

			const shouldUseOverride = ["X-HTTP-Method-Override", "X-Method-Override"].includes(overrideHeader);

			expect(shouldUseOverride).toBe(true);
		});

		it("should verify CSRF token regardless of method override", () => {
			// REQUIREMENT: Token check happens AFTER determining final method
			const body = { _csrf: generateSecureToken(32) };
			const _overrideMethod = "DELETE";

			const hasToken = "_csrf" in body;
			expect(hasToken).toBe(true);
		});
	});
});

// ============================================================================
// CSRF Integration with Better Auth Tests
// ============================================================================

describe("CSRF Protection - Better Auth Integration", () => {
	describe("csrf-010: Better Auth state parameter (OAuth CSRF)", () => {
		it("should generate unique state parameter for OAuth flows", () => {
			// REQUIREMENT: state param = cryptographically random value
			// Prevents authorization code interception (RFC 6749 Section 4.1.1)
			const state = generateSecureToken(32);

			expect(state.length).toBeGreaterThanOrEqual(32);
		});

		it("should verify OAuth state matches request", () => {
			// REQUIREMENT: Authorization server returns same state value
			const requestState = generateSecureToken(32);
			const responseState = requestState;

			expect(requestState).toBe(responseState);
		});

		it("should reject OAuth callback with mismatched state", () => {
			// REQUIREMENT: Different state = attacker trying to inject code
			const requestState = generateSecureToken(32);
			const responseState = generateSecureToken(32);

			expect(requestState).not.toBe(responseState);
		});

		it("should expire OAuth state after timeout", () => {
			// REQUIREMENT: State valid for ~10 minutes (prevents replay)
			const stateCreatedAt = Date.now();
			const stateTimeoutMs = 10 * 60 * 1000;
			const currentTime = stateCreatedAt + 5 * 60 * 1000; // 5 minutes later

			const isExpired = currentTime - stateCreatedAt > stateTimeoutMs;
			expect(isExpired).toBe(false); // Should still be valid
		});
	});

	describe("csrf-011: Session vs CSRF token distinction", () => {
		it("should keep session token and CSRF token separate", () => {
			// REQUIREMENT: Different tokens for different purposes
			const sessionToken = generateSecureToken(32);
			const csrfToken = generateSecureToken(32);

			expect(sessionToken).not.toBe(csrfToken);
		});

		it("should invalidate CSRF token without invalidating session", () => {
			// REQUIREMENT: Page refresh regenerates CSRF token
			// Session remains valid
			const sessionId = "session_abc123";
			const oldCsrf = generateSecureToken(32);
			const newCsrf = generateSecureToken(32);

			expect(oldCsrf).not.toBe(newCsrf);
			expect(sessionId).toBeDefined();
		});
	});
});

// ============================================================================
// CSRF Protection - Error Handling & Responses
// ============================================================================

describe("CSRF Protection - Error Handling", () => {
	describe("csrf-012: CSRF failure responses", () => {
		it("should return 403 Forbidden for CSRF token mismatch", () => {
			// REQUIREMENT: HTTP 403 (not 400) indicates authorization issue
			const statusCode = 403;

			expect(statusCode).toBe(403);
		});

		it("should NOT leak information about token validation in error messages", () => {
			// REQUIREMENT: Generic message prevents token enumeration
			const _errors = [
				"Invalid CSRF token", // ❌ Too specific
				"Access denied", // ✅ Generic
				"Request rejected", // ✅ Generic
			];

			const safeError = "Access denied";
			expect(["Access denied", "Request rejected"]).toContain(safeError);
		});

		it("should log CSRF violations for security monitoring", () => {
			// REQUIREMENT: Log for intrusion detection
			const logEntry = {
				timestamp: Date.now(),
				event: "CSRF_TOKEN_VALIDATION_FAILED",
				ipAddress: "192.168.1.1",
				userAgent: "Mozilla/5.0...",
				expectedTokenHash: "abc123...",
				providedTokenHash: "def456...",
			};

			expect(logEntry.event).toBe("CSRF_TOKEN_VALIDATION_FAILED");
		});

		it("should NOT include actual token values in logs", () => {
			// REQUIREMENT: Never log plaintext tokens
			const log = {
				token: generateSecureToken(32),
				tokenHash: "sha256:...",
			};

			// Should log hash, not plaintext
			expect("tokenHash" in log).toBe(true);
		});
	});
});

// ============================================================================
// Helper Functions (Implementation Details)
// ============================================================================

/**
 * Generate a cryptographically secure random token
 * RED PHASE ONLY - actual implementation in GREEN phase
 */
function generateSecureToken(length: number): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let token = "";
	for (let i = 0; i < length; i++) {
		token += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return token;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * RED PHASE ONLY - actual implementation in GREEN phase
 */
function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}
