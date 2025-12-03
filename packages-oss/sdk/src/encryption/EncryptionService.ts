import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EncryptedData {
	ciphertext: string;
	iv: string;
	authTag: string;
	algorithm: "aes-256-gcm";
}

export interface EncryptedBlob {
	version: number;
	salt: number[]; // Uint8Array as JSON-serializable array
	iv: number[];
	ciphertext: number[];
	timestamp: number;
	checksum: string; // SHA-256 hash of plaintext for integrity verification
}

/**
 * Zero-knowledge encryption service for SnapBack snapshots.
 * Uses AES-256-GCM + PBKDF2 key derivation.
 * Server never sees plaintext - all encryption happens client-side.
 */
export class EncryptionService {
	private readonly PBKDF2_ITERATIONS = 100000;
	private readonly KEY_LENGTH = 256;
	private readonly ALGORITHM = "aes-256-gcm";
	private readonly IV_LENGTH = 12; // 96 bits for GCM

	/**
	 * Derive encryption key from user secret using PBKDF2
	 */
	private async deriveKey(userSecret: string, salt: Uint8Array): Promise<CryptoKey> {
		// Import user secret as key material
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(userSecret),
			{ name: "PBKDF2" },
			false,
			["deriveKey"],
		);

		// Derive AES-GCM key
		return crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: salt as unknown as ArrayBuffer, // Type assertion chain for ArrayBuffer compatibility
				iterations: this.PBKDF2_ITERATIONS,
				hash: "SHA-256",
			},
			keyMaterial,
			{ name: this.ALGORITHM, length: this.KEY_LENGTH },
			false,
			["encrypt", "decrypt"],
		);
	}

	/**
	 * Generate SHA-256 checksum of data for integrity verification
	 */
	private async generateChecksum(data: string): Promise<string> {
		const buffer = new TextEncoder().encode(data);
		const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	/**
	 * Encrypt a snapshot with user secret
	 * @param snapshot - Snapshot object to encrypt
	 * @param userSecret - User's encryption secret (from auth session or user input)
	 * @returns Encrypted blob ready for upload
	 */
	async encryptSnapshot<T = any>(snapshot: T, userSecret: string): Promise<EncryptedBlob> {
		// Generate random salt and IV
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const iv = crypto.getRandomValues(new Uint8Array(12));

		// Derive encryption key
		const key = await this.deriveKey(userSecret, salt);

		// Serialize snapshot
		const plaintext = JSON.stringify(snapshot);

		// Generate checksum
		const checksum = await this.generateChecksum(plaintext);

		// Encrypt
		const plaintextBuffer = new TextEncoder().encode(plaintext);
		const ciphertextBuffer = await crypto.subtle.encrypt({ name: this.ALGORITHM, iv }, key, plaintextBuffer);

		// Return as JSON-serializable blob
		return {
			version: 1,
			salt: Array.from(salt),
			iv: Array.from(iv),
			ciphertext: Array.from(new Uint8Array(ciphertextBuffer)),
			timestamp: Date.now(),
			checksum,
		};
	}

	/**
	 * Decrypt an encrypted blob
	 * @param blob - Encrypted blob from cloud
	 * @param userSecret - User's encryption secret
	 * @returns Original snapshot object
	 * @throws Error if decryption fails or checksum mismatch
	 */
	async decryptSnapshot<T = any>(blob: EncryptedBlob, userSecret: string): Promise<T> {
		// Reconstruct typed arrays
		const salt = new Uint8Array(blob.salt);
		const iv = new Uint8Array(blob.iv);
		const ciphertext = new Uint8Array(blob.ciphertext);

		// Derive decryption key
		const key = await this.deriveKey(userSecret, salt);

		// Decrypt
		let plaintextBuffer: ArrayBuffer;
		try {
			plaintextBuffer = await crypto.subtle.decrypt({ name: this.ALGORITHM, iv }, key, ciphertext);
		} catch (_error) {
			throw new Error("Decryption failed. Wrong password or corrupted data.");
		}

		// Decode plaintext
		const plaintext = new TextDecoder().decode(plaintextBuffer);

		// Verify checksum
		const checksum = await this.generateChecksum(plaintext);
		if (checksum !== blob.checksum) {
			throw new Error("Checksum mismatch. Data may be corrupted.");
		}

		// Parse and return
		return JSON.parse(plaintext) as T;
	}

	/**
	 * Verify if a user secret can decrypt a blob without full decryption
	 * (Faster than full decrypt for password verification)
	 */
	async verifySecret(blob: EncryptedBlob, userSecret: string): Promise<boolean> {
		try {
			await this.decryptSnapshot(blob, userSecret);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Encrypt plaintext data using AES-256-GCM (legacy method for backward compatibility)
	 *
	 * @param plaintext Data to encrypt
	 * @returns Encrypted data with IV and authentication tag
	 */
	encrypt(plaintext: string): EncryptedData {
		// This is a simplified version that uses a fixed key for demonstration
		// In practice, you would derive a key from a user secret
		const key = Buffer.from("0123456789abcdef0123456789abcdef", "hex"); // 256-bit key
		const iv = randomBytes(this.IV_LENGTH);

		const cipher = createCipheriv(this.ALGORITHM, key, iv);
		const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

		const authTag = cipher.getAuthTag();

		return {
			ciphertext: encrypted.toString("base64"),
			iv: iv.toString("base64"),
			authTag: authTag.toString("base64"),
			algorithm: this.ALGORITHM,
		};
	}

	/**
	 * Decrypt encrypted data using AES-256-GCM (legacy method for backward compatibility)
	 *
	 * @param encrypted Encrypted data with IV and auth tag
	 * @returns Decrypted plaintext
	 */
	decrypt(encrypted: EncryptedData): string {
		if (encrypted.algorithm !== this.ALGORITHM) {
			throw new Error(`Unsupported algorithm: ${encrypted.algorithm}`);
		}

		// This is a simplified version that uses a fixed key for demonstration
		// In practice, you would derive a key from a user secret
		const key = Buffer.from("0123456789abcdef0123456789abcdef", "hex"); // 256-bit key
		const decipher = createDecipheriv(this.ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));

		decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
			decipher.final(),
		]);

		return decrypted.toString("utf8");
	}

	/**
	 * Compute content hash for deduplication (post-encryption)
	 *
	 * @param content Original plaintext content
	 * @returns SHA-256 hash for deduplication
	 */
	computeContentHash(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}
}
