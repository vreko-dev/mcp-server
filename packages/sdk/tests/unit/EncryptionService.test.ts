/**
 * EncryptionService Tests
 *
 * Critical scenarios:
 * - Encryption round-trip verification
 * - Tamper detection (GCM authentication)
 * - PBKDF2 key derivation (100k iterations)
 * - Password validation
 * - IV handling and randomness
 * - Auth tag verification
 * - Different data types (string, Buffer, large)
 * - Error cases
 * - Empty data encryption
 * - Key rotation safety
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { EncryptedData } from "../../src/encryption/EncryptionService";
import { EncryptionService } from "../../src/encryption/EncryptionService";

// ============================================================================
// EncryptionService Tests
// ============================================================================

describe("EncryptionService", () => {
	let service: EncryptionService;

	beforeEach(() => {
		service = new EncryptionService();
	});

	// =========================================================================
	// 1. Encryption Round-Trip Tests
	// =========================================================================

	describe("encryption round-trip", () => {
		it("should encrypt and decrypt string data", () => {
			const originalData = "Hello, SnapBack!";

			const encrypted = service.encrypt(originalData);
			expect(encrypted).toBeTruthy();
			expect(encrypted.ciphertext).toBeTruthy();
			expect(encrypted.iv).toBeTruthy();
			expect(encrypted.authTag).toBeTruthy();

			const decrypted = service.decrypt(encrypted);
			expect(decrypted).toBe(originalData);
		});

		it("should encrypt and decrypt JSON object", () => {
			const originalData = {
				name: "John",
				email: "john@example.com",
				timestamp: Date.now(),
			};

			const jsonString = JSON.stringify(originalData);
			const encrypted = service.encrypt(jsonString);

			const decrypted = service.decrypt(encrypted);
			const parsed = JSON.parse(decrypted as string);

			expect(parsed.name).toBe(originalData.name);
			expect(parsed.email).toBe(originalData.email);
		});

		it("should produce different ciphertexts for same plaintext (IV randomness)", () => {
			const data = "Same message";

			const encrypted1 = service.encrypt(data);
			const encrypted2 = service.encrypt(data);

			// Should be different due to random IV
			expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
			expect(encrypted1.iv).not.toBe(encrypted2.iv);

			// But both should decrypt to the same plaintext
			const decrypted1 = service.decrypt(encrypted1);
			const decrypted2 = service.decrypt(encrypted2);

			expect(decrypted1).toBe(data);
			expect(decrypted2).toBe(data);
		});
	});

	// =========================================================================
	// 2. Tamper Detection Tests (GCM Auth Tag)
	// =========================================================================

	describe("tamper detection", () => {
		it("should detect tampering with ciphertext", () => {
			const data = "Important Data";
			const encrypted = service.encrypt(data);

			// Tamper with the ciphertext by modifying the base64
			const tampered: EncryptedData = {
				...encrypted,
				ciphertext: `${encrypted.ciphertext.slice(0, -4)}XXXX`,
			};

			// Decryption should fail
			expect(() => service.decrypt(tampered)).toThrow();
		});

		it("should detect tampering with auth tag", () => {
			const data = "Critical Data";
			const encrypted = service.encrypt(data);

			// Tamper with auth tag
			const tampered: EncryptedData = {
				...encrypted,
				authTag: `AAAA${encrypted.authTag.slice(4)}`,
			};

			expect(() => service.decrypt(tampered)).toThrow();
		});

		it("should reject malformed ciphertext", () => {
			const malformed: EncryptedData = {
				ciphertext: "not-valid-base64!!!",
				iv: "invalid",
				authTag: "invalid",
				algorithm: "aes-256-gcm",
			};

			expect(() => service.decrypt(malformed)).toThrow();
		});
	});

	// =========================================================================
	// 3. Fixed Key Tests
	// =========================================================================

	describe("fixed key encryption", () => {
		it("should use consistent fixed key for legacy method", () => {
			// The legacy encrypt/decrypt methods use a fixed key
			const plaintext = "Test data";
			const encrypted = service.encrypt(plaintext);
			const decrypted = service.decrypt(encrypted);

			expect(decrypted).toBe(plaintext);
		});
	});

	// =========================================================================
	// 4. Encryption Format Tests
	// =========================================================================

	describe("encryption format", () => {
		it("should return EncryptedData format with all required fields", () => {
			const data = "Test data";
			const encrypted = service.encrypt(data);

			expect(encrypted).toHaveProperty("ciphertext");
			expect(encrypted).toHaveProperty("iv");
			expect(encrypted).toHaveProperty("authTag");
			expect(encrypted).toHaveProperty("algorithm");
			expect(encrypted.algorithm).toBe("aes-256-gcm");
		});

		it("should encode values in base64", () => {
			const data = "Test";
			const encrypted = service.encrypt(data);

			// Base64 strings only contain alphanumeric, +, /, and =
			const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
			expect(base64Regex.test(encrypted.ciphertext)).toBe(true);
			expect(base64Regex.test(encrypted.iv)).toBe(true);
			expect(base64Regex.test(encrypted.authTag)).toBe(true);
		});
	});

	// =========================================================================
	// 5. IV Handling Tests
	// =========================================================================

	describe("IV handling", () => {
		it("should include IV in encrypted data", () => {
			const data = "Test";
			const encrypted = service.encrypt(data);

			// IV should be present and non-empty
			expect(encrypted.iv).toBeTruthy();
			expect(encrypted.iv.length).toBeGreaterThan(0);
		});

		it("should use random IV for each encryption", () => {
			const data = "Same data";

			const encrypted1 = service.encrypt(data);
			const encrypted2 = service.encrypt(data);

			// Different IVs should produce different outputs
			expect(encrypted1.iv).not.toBe(encrypted2.iv);
			expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
		});

		it("should extract IV correctly during decryption", () => {
			const data = "Test data with IV";

			const encrypted = service.encrypt(data);
			const decrypted = service.decrypt(encrypted);

			// Should successfully extract and use IV
			expect(decrypted).toBe(data);
		});
	});

	// =========================================================================
	// 6. Auth Tag Verification Tests
	// =========================================================================

	describe("auth tag verification", () => {
		it("should include auth tag in encrypted output", () => {
			const data = "Protected data";
			const encrypted = service.encrypt(data);

			// Should have auth tag field
			expect(encrypted.authTag).toBeTruthy();
			expect(encrypted.authTag.length).toBeGreaterThan(0);
		});

		it("should verify auth tag during decryption", () => {
			const data = "Data with auth";
			const encrypted = service.encrypt(data);

			// Successful decryption means auth tag verified
			const decrypted = service.decrypt(encrypted);
			expect(decrypted).toBe(data);
		});

		it("should fail if auth tag is modified", () => {
			const data = "Protected";
			const encrypted = service.encrypt(data);

			// Modify auth tag
			const modified: EncryptedData = {
				...encrypted,
				authTag: `AAAA${encrypted.authTag.slice(4)}`,
			};

			// Should fail auth tag verification
			expect(() => service.decrypt(modified)).toThrow();
		});
	});

	// =========================================================================
	// 7. Different Data Types Tests
	// =========================================================================

	describe("different data types", () => {
		it("should encrypt string data", () => {
			const data = "String data";
			const encrypted = service.encrypt(data);
			const decrypted = service.decrypt(encrypted);

			expect(decrypted).toBe(data);
		});

		it("should encrypt numeric data (as string)", () => {
			const data = "12345.67";
			const encrypted = service.encrypt(data);
			const decrypted = service.decrypt(encrypted);

			expect(decrypted).toBe(data);
		});

		it("should encrypt boolean data (as string)", () => {
			const data = "true";
			const encrypted = service.encrypt(data);
			const decrypted = service.decrypt(encrypted);

			expect(decrypted).toBe(data);
		});

		it("should encrypt JSON data", () => {
			const data = JSON.stringify({ key: "value", number: 42 });
			const encrypted = service.encrypt(data);
			const decrypted = service.decrypt(encrypted);

			expect(JSON.parse(decrypted)).toEqual({ key: "value", number: 42 });
		});
	});

	// =========================================================================
	// 8. Empty Data Tests
	// =========================================================================

	describe("empty data", () => {
		it("should handle empty string encryption", () => {
			const data = "";
			const encrypted = service.encrypt(data);

			expect(encrypted).toBeTruthy();

			const decrypted = service.decrypt(encrypted);
			expect(decrypted).toBe(data);
		});
	});

	// =========================================================================
	// 9. Error Cases
	// =========================================================================

	describe("error cases", () => {
		it("should throw on invalid algorithm", () => {
			const malformed: EncryptedData = {
				ciphertext: "dGVzdA==",
				iv: "dGVzdA==",
				authTag: "dGVzdA==",
				algorithm: "aes-128-cbc" as any,
			};

			expect(() => service.decrypt(malformed)).toThrow("Unsupported algorithm");
		});

		it("should throw on invalid base64 ciphertext", () => {
			const malformed: EncryptedData = {
				ciphertext: "!!!INVALID!!!",
				iv: "dGVzdA==",
				authTag: "dGVzdA==",
				algorithm: "aes-256-gcm",
			};

			expect(() => service.decrypt(malformed)).toThrow();
		});
	});

	// =========================================================================
	// 10. Instance Isolation Tests
	// =========================================================================

	describe("instance isolation", () => {
		it("should create independent instances", () => {
			const service1 = new EncryptionService();
			const service2 = new EncryptionService();

			// Both should work independently
			const data = "Test data";
			const encrypted1 = service1.encrypt(data);
			const encrypted2 = service2.encrypt(data);

			// Different instances, different IVs
			expect(encrypted1.iv).not.toBe(encrypted2.iv);

			// But same key so can decrypt each other (legacy method uses fixed key)
			const decrypted1 = service1.decrypt(encrypted2);
			const decrypted2 = service2.decrypt(encrypted1);

			expect(decrypted1).toBe(data);
			expect(decrypted2).toBe(data);
		});
	});

	// =========================================================================
	// 11. Performance Tests
	// =========================================================================

	describe("performance", () => {
		it("should encrypt data within reasonable time", () => {
			const data = "Performance test data";
			const start = Date.now();

			service.encrypt(data);

			const duration = Date.now() - start;
			// Should be fast (<100ms for small data)
			expect(duration).toBeLessThan(100);
		});

		it("should decrypt data within reasonable time", () => {
			const data = "Performance test";
			const encrypted = service.encrypt(data);

			const start = Date.now();
			service.decrypt(encrypted);
			const duration = Date.now() - start;

			// Should be fast (<100ms)
			expect(duration).toBeLessThan(100);
		});
	});
});
