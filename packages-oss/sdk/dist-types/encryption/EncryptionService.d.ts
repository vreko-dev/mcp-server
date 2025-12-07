export interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
    algorithm: "aes-256-gcm";
}
export interface EncryptedBlob {
    version: number;
    salt: number[];
    iv: number[];
    ciphertext: number[];
    timestamp: number;
    checksum: string;
}
/**
 * Zero-knowledge encryption service for SnapBack snapshots.
 * Uses AES-256-GCM + PBKDF2 key derivation.
 * Server never sees plaintext - all encryption happens client-side.
 */
export declare class EncryptionService {
    private readonly PBKDF2_ITERATIONS;
    private readonly KEY_LENGTH;
    private readonly ALGORITHM;
    private readonly IV_LENGTH;
    /**
     * Derive encryption key from user secret using PBKDF2
     */
    private deriveKey;
    /**
     * Generate SHA-256 checksum of data for integrity verification
     */
    private generateChecksum;
    /**
     * Encrypt a snapshot with user secret
     * @param snapshot - Snapshot object to encrypt
     * @param userSecret - User's encryption secret (from auth session or user input)
     * @returns Encrypted blob ready for upload
     */
    encryptSnapshot<T = any>(snapshot: T, userSecret: string): Promise<EncryptedBlob>;
    /**
     * Decrypt an encrypted blob
     * @param blob - Encrypted blob from cloud
     * @param userSecret - User's encryption secret
     * @returns Original snapshot object
     * @throws Error if decryption fails or checksum mismatch
     */
    decryptSnapshot<T = any>(blob: EncryptedBlob, userSecret: string): Promise<T>;
    /**
     * Verify if a user secret can decrypt a blob without full decryption
     * (Faster than full decrypt for password verification)
     */
    verifySecret(blob: EncryptedBlob, userSecret: string): Promise<boolean>;
    /**
     * Encrypt plaintext data using AES-256-GCM (legacy method for backward compatibility)
     *
     * @param plaintext Data to encrypt
     * @returns Encrypted data with IV and authentication tag
     */
    encrypt(plaintext: string): EncryptedData;
    /**
     * Decrypt encrypted data using AES-256-GCM (legacy method for backward compatibility)
     *
     * @param encrypted Encrypted data with IV and auth tag
     * @returns Decrypted plaintext
     */
    decrypt(encrypted: EncryptedData): string;
    /**
     * Compute content hash for deduplication (post-encryption)
     *
     * @param content Original plaintext content
     * @returns SHA-256 hash for deduplication
     */
    computeContentHash(content: string): string;
}
//# sourceMappingURL=EncryptionService.d.ts.map