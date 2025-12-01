import { beforeEach, describe, expect, test } from "vitest";
import { EncryptionService } from "../EncryptionService";

describe("EncryptionService", () => {
	let service: EncryptionService;

	beforeEach(() => {
		service = new EncryptionService();
	});

	test("encrypt and decrypt round-trip preserves data", async () => {
		const snapshot = {
			id: "123",
			files: ["file1.ts", "file2.ts"],
			meta: { author: "test" },
		};
		const secret = "test-secret-password";

		const encrypted = await service.encryptSnapshot(snapshot, secret);
		const decrypted = await service.decryptSnapshot(encrypted, secret);

		expect(decrypted).toEqual(snapshot);
	});

	test("wrong password fails decryption", async () => {
		const snapshot = { sensitive: "data" };
		const encrypted = await service.encryptSnapshot(snapshot, "correct-password");

		await expect(service.decryptSnapshot(encrypted, "wrong-password")).rejects.toThrow("Decryption failed");
	});

	test("tampered ciphertext fails decryption", async () => {
		const snapshot = { sensitive: "data" };
		const encrypted = await service.encryptSnapshot(snapshot, "password");

		// Tamper with ciphertext
		encrypted.ciphertext[0] = (encrypted.ciphertext[0] + 1) % 256;

		await expect(service.decryptSnapshot(encrypted, "password")).rejects.toThrow();
	});

	test("encryption uses unique salt and IV each time", async () => {
		const snapshot = { data: "same data" };
		const secret = "same-secret";

		const encrypted1 = await service.encryptSnapshot(snapshot, secret);
		const encrypted2 = await service.encryptSnapshot(snapshot, secret);

		expect(encrypted1.salt).not.toEqual(encrypted2.salt);
		expect(encrypted1.iv).not.toEqual(encrypted2.iv);
		expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
	});

	test("large snapshot (1MB) encrypts in < 500ms", async () => {
		const largeSnapshot = {
			files: Array(1000)
				.fill(null)
				.map((_, i) => ({
					path: `file${i}.ts`,
					content: "x".repeat(1000), // 1KB per file = 1MB total
				})),
		};
		const secret = "password";

		const start = Date.now();
		await service.encryptSnapshot(largeSnapshot, secret);
		const duration = Date.now() - start;

		expect(duration).toBeLessThan(500);
	});

	test("PBKDF2 uses 100,000 iterations", () => {
		// Access private property via reflection for testing
		const iterations = (service as any).PBKDF2_ITERATIONS;
		expect(iterations).toBe(100000);
	});

	// Legacy encrypt/decrypt tests
	test("legacy encrypt and decrypt round-trip preserves data", () => {
		const plaintext = "test data";
		const encrypted = service.encrypt(plaintext);
		const decrypted = service.decrypt(encrypted);

		expect(decrypted).toBe(plaintext);
	});

	test("legacy computeContentHash generates consistent hashes", () => {
		const content = "test content";
		const hash1 = service.computeContentHash(content);
		const hash2 = service.computeContentHash(content);

		expect(hash1).toBe(hash2);
		expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
	});
});
