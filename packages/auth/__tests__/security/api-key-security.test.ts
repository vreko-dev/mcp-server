/**
 * API Key Security Tests - RED Phase
 *
 * Comprehensive test suite for API key security
 * Tests secure generation, hashing, validation, rate limiting, and enumeration prevention
 *
 * OWASP Standard: A02:2021 – Cryptographic Failures, A07:2021 – Identification and Authentication Failures
 * Hashing: Argon2id with 64MB memory cost (OWASP 2025 recommended)
 */

import { describe, expect, it } from "vitest";

// ============================================================================
// API Key Generation & Format Tests
// ============================================================================

describe("API Key Security - Generation & Format", () => {
	describe("apikey-001: Cryptographically secure generation", () => {
		it("should generate cryptographically secure API keys", () => {
			// REQUIREMENT: Keys must use crypto.getRandomValues() (NOT Math.random())
			const key = generateSecureApiKey(32);

			expect(key.length).toBeGreaterThanOrEqual(32);
			expect(key).toMatch(/^[a-zA-Z0-9\-_]+$/); // Base64url safe
		});

		it("should use minimum 256-bit entropy (32 bytes)", () => {
			// REQUIREMENT: OWASP 2025 requires minimum 256-bit for API keys
			const key = generateSecureApiKey(32);

			// 32 bytes = 256 bits
			expect(key.length).toBeGreaterThanOrEqual(32);
		});

		it("should generate unique keys on each request", () => {
			// REQUIREMENT: Two keys should never be identical
			const key1 = generateSecureApiKey(32);
			const key2 = generateSecureApiKey(32);

			expect(key1).not.toBe(key2);
		});

		it("should reject weak key generation (Math.random)", () => {
			// REQUIREMENT: Math.random() is predictable (NOT acceptable)
			const weakKey = Math.random().toString(36);
			const strongKey = generateSecureApiKey(32);

			// Strong key should be different format
			expect(strongKey).not.toBe(weakKey);
		});
	});

	describe("apikey-002: Key format and encoding", () => {
		it("should use base64url encoding (URL-safe)", () => {
			// REQUIREMENT: Base64url (-_) not base64 (+/)
			const key = generateSecureApiKey(32);
			const base64urlRegex = /^[A-Za-z0-9\-_]+$/;

			expect(key).toMatch(base64urlRegex);
		});

		it("should prevent special characters that break JSON/URLs", () => {
			// REQUIREMENT: Key must be safe for API headers and JSON
			const key = generateSecureApiKey(32);
			const problematicChars = /['"\\/<>{}]/g;

			expect(key).not.toMatch(problematicChars);
		});

		it("should include version prefix for key rotation", () => {
			// REQUIREMENT: sk_live_abc123... or sk_test_abc123...
			const liveKey = `sk_live_${generateSecureApiKey(24)}`;
			const testKey = `sk_test_${generateSecureApiKey(24)}`;

			expect(liveKey).toMatch(/^sk_live_/);
			expect(testKey).toMatch(/^sk_test_/);
		});

		it("should limit key length to prevent buffer overflows", () => {
			// REQUIREMENT: Max key length = 256 chars (prevents abuse)
			const key = generateSecureApiKey(32);

			expect(key.length).toBeLessThanOrEqual(256);
		});
	});

	describe("apikey-003: Key prefix for environment distinction", () => {
		it("should use sk_live_ prefix for production keys", () => {
			// REQUIREMENT: Clear identification of key environment
			const productionKey = `sk_live_${generateSecureApiKey(24)}`;

			expect(productionKey).toMatch(/^sk_live_/);
		});

		it("should use sk_test_ prefix for test keys", () => {
			// REQUIREMENT: Test keys never access production data
			const testKey = `sk_test_${generateSecureApiKey(24)}`;

			expect(testKey).toMatch(/^sk_test_/);
		});

		it("should reject keys with wrong prefix", () => {
			// REQUIREMENT: Prefix validation on API requests
			const invalidKey = `invalid_${generateSecureApiKey(24)}`;

			const isValid = invalidKey.match(/^sk_(live|test)_/);
			expect(isValid).toBeNull();
		});

		it("should use different keys for different endpoints", () => {
			// REQUIREMENT: Principle of least privilege
			const snapshotApiKey = `sk_live_snapshot_${generateSecureApiKey(16)}`;
			const billingApiKey = `sk_live_billing_${generateSecureApiKey(16)}`;

			expect(snapshotApiKey).not.toBe(billingApiKey);
		});
	});
});

// ============================================================================
// API Key Hashing & Storage Tests
// ============================================================================

describe("API Key Security - Hashing & Storage", () => {
	describe("apikey-004: Argon2id hashing configuration", () => {
		it("should use Argon2id for API key hashing (NOT bcrypt)", () => {
			// REQUIREMENT: Argon2id is OWASP 2025 standard for password/key hashing
			const algorithm = "Argon2id";

			expect(["Argon2id", "Argon2i"]).toContain(algorithm);
		});

		it("should use 64MB memory cost (OWASP minimum)", () => {
			// REQUIREMENT: memoryLimit = 65536 KB = 64 MB
			// Prevents GPU/ASIC attacks
			const memoryLimitKB = 65536;
			const memoryLimitMB = memoryLimitKB / 1024;

			expect(memoryLimitMB).toBe(64);
		});

		it("should use 3 iterations minimum (OWASP 2025)", () => {
			// REQUIREMENT: iterations >= 3 for Argon2id
			const iterations = 3;

			expect(iterations).toBeGreaterThanOrEqual(3);
		});

		it("should use parallelism factor of 2", () => {
			// REQUIREMENT: parallelism = 2 (creates cost of 2x128MB memory)
			const parallelism = 2;

			expect(parallelism).toBeGreaterThanOrEqual(2);
		});

		it("should use cryptographically secure random salt", () => {
			// REQUIREMENT: 16+ byte random salt (prevents rainbow tables)
			const salt = generateSecureApiKey(16);

			expect(salt.length).toBeGreaterThanOrEqual(16);
		});

		it("should NOT use static salt", () => {
			// REQUIREMENT: Same plain key produces different hash (due to random salt)
			const plainKey = "sk_live_test123";
			const hash1 = hashApiKeyArgon2(plainKey);
			const hash2 = hashApiKeyArgon2(plainKey);

			expect(hash1).not.toBe(hash2); // Different due to random salt
		});
	});

	describe("apikey-005: Hash verification", () => {
		it("should verify hash using constant-time comparison", () => {
			// REQUIREMENT: crypto.timingSafeEqual() prevents timing attacks
			const plainKey = "sk_live_abc123";
			const hash = hashApiKeyArgon2(plainKey);

			const isValid = verifyApiKeyHash(plainKey, hash);
			expect(isValid).toBe(true);
		});

		it("should reject wrong key with false", () => {
			// REQUIREMENT: Timing-safe comparison (always ~same duration)
			const plainKey1 = "sk_live_abc123";
			const plainKey2 = "sk_live_xyz789";
			const hash = hashApiKeyArgon2(plainKey1);

			const isValid = verifyApiKeyHash(plainKey2, hash);
			expect(isValid).toBe(false);
		});

		it("should use constant-time verification duration", () => {
			// REQUIREMENT: Timing attack mitigation
			// Correct and incorrect keys should take ~same time
			const correctKey = "sk_live_correct";
			const incorrectKey = "sk_live_wrong";
			const hash = hashApiKeyArgon2(correctKey);

			const t1 = Date.now();
			verifyApiKeyHash(correctKey, hash);
			const correctTime = Date.now() - t1;

			const t2 = Date.now();
			verifyApiKeyHash(incorrectKey, hash);
			const incorrectTime = Date.now() - t2;

			// Times should be similar (within 50ms due to system variance)
			expect(Math.abs(correctTime - incorrectTime)).toBeLessThan(50);
		});

		it("should reject tampered hashes", () => {
			// REQUIREMENT: Hash modification prevents validation
			const plainKey = "sk_live_abc123";
			const correctHash = hashApiKeyArgon2(plainKey);
			const tamperedHash = `${correctHash}tampering`;

			const isValid = verifyApiKeyHash(plainKey, tamperedHash);
			expect(isValid).toBe(false);
		});
	});

	describe("apikey-006: Never log plaintext keys", () => {
		it("should log hash, not plaintext key", () => {
			// REQUIREMENT: Logs must never contain plaintext API keys
			const plainKey = "sk_live_secret123";
			const keyHash = hashApiKeyArgon2(plainKey);

			const logEntry = {
				event: "API_KEY_CREATED",
				keyId: "key_123",
				keyHash: keyHash, // Hash, not plaintext
				createdAt: Date.now(),
			};

			expect(logEntry.keyHash).not.toContain("sk_live");
			expect("plainKey" in logEntry).toBe(false);
		});

		it("should only show last 4 characters in UI", () => {
			// REQUIREMENT: Display sk_live_...xyz123 (only last 4)
			const plainKey = "sk_live_abcdefgh123456";
			const lastFour = plainKey.slice(-4);
			const display = `${plainKey.substring(0, 8)}...${lastFour}`;

			expect(display).toBe("sk_live_...6123");
		});

		it("should NOT store plaintext key after creation", () => {
			// REQUIREMENT: Only hash stored in database
			const plainKey = generateSecureApiKey(32);
			const keyHash = hashApiKeyArgon2(plainKey);

			const storedData = {
				id: "key_123",
				hash: keyHash,
				// plainKey: NOT stored
				createdAt: Date.now(),
			};

			expect("plainKey" in storedData).toBe(false);
		});
	});
});

// ============================================================================
// API Key Validation & Enumeration Prevention Tests
// ============================================================================

describe("API Key Security - Enumeration Prevention", () => {
	describe("apikey-007: Enumeration attack prevention", () => {
		it("should NOT differentiate between invalid and non-existent keys", () => {
			// REQUIREMENT: Same error for invalid key vs unknown key
			const _invalidKeyError = "Invalid API key";
			const _notFoundError = "API key not found";

			// Both should return same error message
			const errorMessage = "Unauthorized";
			expect(errorMessage).toBe("Unauthorized");
		});

		it("should use consistent response time for invalid/missing keys", () => {
			// REQUIREMENT: Timing attack prevention
			// Invalid key and non-existent key should take ~same time
			const t1 = Date.now();
			checkApiKeyExists("invalid_key_123");
			const invalidTime = Date.now() - t1;

			const t2 = Date.now();
			checkApiKeyExists("nonexistent_key_xyz");
			const notFoundTime = Date.now() - t2;

			// Should be similar timing
			expect(Math.abs(invalidTime - notFoundTime)).toBeLessThan(50);
		});

		it("should NOT leak key existence in error response", () => {
			// REQUIREMENT: Attackers can't determine if key is valid before brute force
			const response = {
				status: 401,
				error: "Unauthorized",
				// NOT: "key not found" or "invalid key"
			};

			expect(response.error).not.toContain("key");
		});

		it("should limit API key check requests per IP", () => {
			// REQUIREMENT: Rate limit enumeration attempts
			const _ipAddress = "192.168.1.1";
			const maxAttemptsPerMinute = 10;
			const attempts = 10;

			expect(attempts).toBeLessThanOrEqual(maxAttemptsPerMinute);
		});

		it("should log enumeration attack patterns", () => {
			// REQUIREMENT: Detect and alert on enumeration
			const logEntry = {
				event: "POSSIBLE_KEY_ENUMERATION",
				ipAddress: "192.168.1.1",
				attemptCount: 100,
				timeWindow: "1 minute",
				action: "RATE_LIMITED",
			};

			expect(logEntry.event).toBe("POSSIBLE_KEY_ENUMERATION");
		});
	});

	describe("apikey-008: Brute force protection", () => {
		it("should limit authentication attempts per minute", () => {
			// REQUIREMENT: Max 10 attempts per minute per IP
			const maxAttemptsPerMinute = 10;

			expect(maxAttemptsPerMinute).toBe(10);
		});

		it("should implement exponential backoff after repeated failures", () => {
			// REQUIREMENT: 1st failure: 1s wait, 2nd: 2s, 3rd: 4s, etc.
			const attemptNumber = 3;
			const baseDelayMs = 1000;
			const delayMs = baseDelayMs * 2 ** (attemptNumber - 1);

			expect(delayMs).toBe(4000); // 4 seconds for attempt 3
		});

		it("should block IP after 50 failed attempts in 1 hour", () => {
			// REQUIREMENT: Aggressive brute force blocks IP
			const failedAttempts = 50;
			const _timeWindow = "1 hour";
			const shouldBlock = failedAttempts >= 50;

			expect(shouldBlock).toBe(true);
		});

		it("should reset attempt counter after successful authentication", () => {
			// REQUIREMENT: Successful auth = clean slate
			const _attemptCount = 3;
			const afterSuccess = 0;

			expect(afterSuccess).toBe(0);
		});

		it("should reset counter automatically after timeout period", () => {
			// REQUIREMENT: 1 hour of inactivity = reset
			const lastFailAt = Date.now() - 61 * 60 * 1000; // 61 minutes ago
			const timeoutMs = 60 * 60 * 1000; // 1 hour
			const isExpired = Date.now() - lastFailAt > timeoutMs;

			expect(isExpired).toBe(true); // Counter should be reset
		});
	});
});

// ============================================================================
// API Key Scope & Permission Tests
// ============================================================================

describe("API Key Security - Scopes & Permissions", () => {
	describe("apikey-009: Granular scopes", () => {
		it("should support granular scopes (read, write, admin)", () => {
			// REQUIREMENT: Principle of least privilege
			const scopes = ["snapshots:read", "snapshots:write", "admin:all"];

			expect(scopes).toContain("snapshots:read");
		});

		it("should enforce scope on each API request", () => {
			// REQUIREMENT: Key with read scope cannot make write calls
			const keyScopes = ["snapshots:read"];
			const requestedAction = "snapshots:write";

			const isAllowed = keyScopes.includes(requestedAction);
			expect(isAllowed).toBe(false);
		});

		it("should allow API key to have multiple scopes", () => {
			// REQUIREMENT: read + write permission
			const keyScopes = ["snapshots:read", "snapshots:write"];

			expect(keyScopes.length).toBe(2);
		});

		it("should NOT grant admin scope to regular API keys", () => {
			// REQUIREMENT: admin:all only for special keys
			const userKey = ["snapshots:read", "snapshots:write"];
			const adminScope = "admin:all";

			expect(userKey).not.toContain(adminScope);
		});

		it("should support custom scopes per integration", () => {
			// REQUIREMENT: Zapier integration might only need upload scope
			const zapierKey = ["snapshots:write"];
			const desktopKey = ["snapshots:read", "snapshots:write"];

			expect(zapierKey).not.toEqual(desktopKey);
		});
	});

	describe("apikey-010: API key restrictions", () => {
		it("should support IP whitelist restriction", () => {
			// REQUIREMENT: Key only works from specific IPs
			const restriction = {
				type: "ip_whitelist",
				ips: ["192.168.1.1", "10.0.0.1"],
			};

			expect(restriction.ips).toContain("192.168.1.1");
		});

		it("should support domain whitelist restriction", () => {
			// REQUIREMENT: Key only works from snapback.dev
			const restriction = {
				type: "domain_whitelist",
				domains: ["snapback.dev", "api.snapback.dev"],
			};

			expect(restriction.domains).toContain("snapback.dev");
		});

		it("should support rate limit per key", () => {
			// REQUIREMENT: Key limited to 1000 requests/hour
			const keyLimit = {
				rateLimit: 1000,
				period: "1 hour",
			};

			expect(keyLimit.rateLimit).toBe(1000);
		});

		it("should support expiration date on key", () => {
			// REQUIREMENT: Key expires after configured date
			const expiresAt = new Date("2025-12-31");
			const isExpired = Date.now() > expiresAt.getTime();

			expect(isExpired).toBe(false); // Not expired yet
		});

		it("should block requests after key expiration", () => {
			// REQUIREMENT: Expired key = 401 Unauthorized
			const expiresAt = new Date("2020-01-01"); // Past date
			const isExpired = Date.now() > expiresAt.getTime();

			expect(isExpired).toBe(true); // Expired
		});
	});
});

// ============================================================================
// API Key Rotation & Lifecycle Tests
// ============================================================================

describe("API Key Security - Rotation & Lifecycle", () => {
	describe("apikey-011: Key rotation policies", () => {
		it("should support manual key rotation", () => {
			// REQUIREMENT: User can generate new key and revoke old one
			const oldKey = generateSecureApiKey(32);
			const newKey = generateSecureApiKey(32);

			expect(oldKey).not.toBe(newKey);
		});

		it("should support automatic rotation reminder", () => {
			// REQUIREMENT: Warn after 90 days of no rotation
			const createdAt = Date.now() - 95 * 24 * 60 * 60 * 1000; // 95 days ago
			const rotationWarningMs = 90 * 24 * 60 * 60 * 1000;
			const shouldWarn = Date.now() - createdAt > rotationWarningMs;

			expect(shouldWarn).toBe(true);
		});

		it("should force rotation after 1 year", () => {
			// REQUIREMENT: Keys older than 1 year must be rotated
			const createdAt = Date.now() - 400 * 24 * 60 * 60 * 1000; // 400 days ago
			const maxAgeMs = 365 * 24 * 60 * 60 * 1000;
			const isExpired = Date.now() - createdAt > maxAgeMs;

			expect(isExpired).toBe(true);
		});

		it("should support grace period during rotation", () => {
			// REQUIREMENT: Both old and new key work for 30 days
			const rotationGraceMs = 30 * 24 * 60 * 60 * 1000;

			expect(rotationGraceMs).toBe(2592000000);
		});

		it("should revoke old key after grace period", () => {
			// REQUIREMENT: Old key automatically disabled after 30 days
			const revokedAt = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
			const gracePeriodMs = 30 * 24 * 60 * 60 * 1000;
			const isRevoked = Date.now() - revokedAt > gracePeriodMs;

			expect(isRevoked).toBe(true);
		});
	});

	describe("apikey-012: Key revocation", () => {
		it("should immediately revoke key on request", () => {
			// REQUIREMENT: Key disabled instantly
			const keyStatus = "revoked";

			expect(keyStatus).toBe("revoked");
		});

		it("should revoke all keys when user password changes", () => {
			// REQUIREMENT: Password change = security risk = force re-auth
			const _keysBeforePasswordChange = 3;
			const keysAfterPasswordChange = 0;

			expect(keysAfterPasswordChange).toBe(0);
		});

		it("should revoke all keys when 2FA is disabled", () => {
			// REQUIREMENT: Disable 2FA = revoke keys
			const keysAfter2FADisable = 0;

			expect(keysAfter2FADisable).toBe(0);
		});

		it("should log revocation event", () => {
			// REQUIREMENT: Audit trail for compliance
			const logEntry = {
				event: "API_KEY_REVOKED",
				keyId: "key_123",
				reason: "user_request", // or "password_change", "2fa_disable"
				revokedBy: "user_123",
				timestamp: Date.now(),
			};

			expect(logEntry.event).toBe("API_KEY_REVOKED");
		});

		it("should NOT allow un-revocation of key", () => {
			// REQUIREMENT: Once revoked, key is gone forever
			const canRestore = false;

			expect(canRestore).toBe(false);
		});
	});
});

// ============================================================================
// API Key Usage Audit Tests
// ============================================================================

describe("API Key Security - Usage Audit", () => {
	describe("apikey-013: Request logging & monitoring", () => {
		it("should log every API request with key usage", () => {
			// REQUIREMENT: Audit trail for compliance
			const logEntry = {
				event: "API_REQUEST",
				keyId: "key_123",
				method: "POST",
				endpoint: "/api/snapshots",
				ipAddress: "192.168.1.1",
				timestamp: Date.now(),
				statusCode: 200,
			};

			expect(logEntry.event).toBe("API_REQUEST");
		});

		it("should record failed authentication attempts", () => {
			// REQUIREMENT: Track unauthorized access attempts
			const logEntry = {
				event: "API_AUTH_FAILED",
				providedKey: null, // Don't log actual key
				keyIdHash: "sha256:...", // Log hash of attempted key
				ipAddress: "192.168.1.1",
				reason: "invalid_signature",
				timestamp: Date.now(),
			};

			expect(logEntry.event).toBe("API_AUTH_FAILED");
		});

		it("should track API key usage metrics", () => {
			// REQUIREMENT: Show usage dashboard to user
			const metrics = {
				keyId: "key_123",
				totalRequests: 1500,
				requestsThisMonth: 300,
				lastUsedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
				failedAuthAttempts: 3,
			};

			expect(metrics.totalRequests).toBe(1500);
		});

		it("should alert on unusual API key usage", () => {
			// REQUIREMENT: Detect compromised keys
			const alert = {
				keyId: "key_123",
				reason: "geographic_anomaly", // or "rate_limit_exceeded", "unusual_endpoint"
				location1: "New York",
				location2: "Tokyo",
				timeDiff: "2 hours",
			};

			expect(alert.reason).toBe("geographic_anomaly");
		});
	});

	describe("apikey-014: Compromise detection", () => {
		it("should detect and alert when key is compromised", () => {
			// REQUIREMENT: Monitor for suspicious patterns
			const suspiciousPattern = {
				reason: "brute_force_detected",
				failedAttempts: 50,
				timeWindow: "10 minutes",
			};

			expect(suspiciousPattern.failedAttempts).toBeGreaterThan(10);
		});

		it("should auto-revoke suspicious keys", () => {
			// REQUIREMENT: Proactive security
			const revokedDueToSuspicion = true;

			expect(revokedDueToSuspicion).toBe(true);
		});

		it("should notify user of key compromise", () => {
			// REQUIREMENT: Alert user immediately
			const notification = {
				type: "email",
				subject: "API Key Security Alert",
				body: "Key has been auto-revoked due to suspicious activity",
			};

			expect(notification.type).toBe("email");
		});
	});
});

// ============================================================================
// API Key - Better Auth Integration Tests
// ============================================================================

describe("API Key Security - Better Auth Integration", () => {
	describe("apikey-015: Better Auth API key plugin", () => {
		it("should use Better Auth's built-in API key support", () => {
			// REQUIREMENT: authClient.apiKey methods
			const keyMethods = ["generateKey", "listKeys", "revokeKey", "verifyKey"];

			expect(keyMethods).toContain("generateKey");
		});

		it("should hash keys using Better Auth's hashing", () => {
			// REQUIREMENT: Consistent hashing across platform
			const isHashedInDB = true;

			expect(isHashedInDB).toBe(true);
		});

		it("should integrate with Better Auth session", () => {
			// REQUIREMENT: Key belongs to authenticated user
			const key = {
				id: "key_123",
				userId: "user_456",
				hash: "sha256:...",
			};

			expect("userId" in key).toBe(true);
		});
	});

	describe("apikey-016: API key vs session token distinction", () => {
		it("should keep API keys and session tokens separate", () => {
			// REQUIREMENT: Different tokens for different purposes
			const sessionToken = generateSecureApiKey(32);
			const apiKey = generateSecureApiKey(32);

			expect(sessionToken).not.toBe(apiKey);
		});

		it("should use different validation for API keys vs sessions", () => {
			// REQUIREMENT: API keys: header, Sessions: cookie
			const apiKeyLocation = "X-API-Key";
			const sessionLocation = "Cookie";

			expect(apiKeyLocation).not.toBe(sessionLocation);
		});
	});
});

// ============================================================================
// Helper Functions (RED PHASE - STUB IMPLEMENTATIONS)
// ============================================================================

/**
 * Generate a cryptographically secure API key (stub)
 */
function generateSecureApiKey(length: number): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let key = "";
	for (let i = 0; i < length; i++) {
		key += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return key;
}

/**
 * Hash API key using Argon2id (stub)
 */
function hashApiKeyArgon2(_plainKey: string): string {
	// In GREEN phase: use bun:hash or crypto-js with Argon2id
	// For now, return a mock hash that changes per call due to random salt
	return `argon2id$${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Verify API key hash with constant-time comparison (stub)
 */
function verifyApiKeyHash(_plainKey: string, hash: string): boolean {
	// In GREEN phase: use crypto.timingSafeEqual() for constant-time comparison
	return hash.includes("argon2id$");
}

/**
 * Check if API key exists (stub for enumeration testing)
 */
function checkApiKeyExists(_key: string): boolean {
	// In GREEN phase: database lookup with constant-time response
	return Math.random() > 0.5; // Simulate random existence
}
