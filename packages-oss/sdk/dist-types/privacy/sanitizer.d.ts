import type { FileMetadata } from "@snapback-oss/contracts";
export declare class PrivacySanitizer {
	private config;
	constructor(config: {
		hashFilePaths: boolean;
		anonymizeWorkspace: boolean;
	});
	/**
	 * Sanitize file metadata to ensure privacy
	 * Removes any potentially sensitive data
	 */
	sanitize(metadata: FileMetadata): FileMetadata;
	/**
	 * Validate that metadata contains no sensitive data
	 */
	isPrivacySafe(metadata: any): boolean;
	/**
	 * Hash file path with workspace salt
	 */
	private hashFilePath;
	/**
	 * Sanitize string to remove specific identifiers
	 */
	private sanitizeString;
	/**
	 * Public method to sanitize individual risk factors
	 * @param factor - Risk factor string to sanitize
	 * @returns Sanitized risk factor string
	 */
	sanitizeFactor(factor: string): string;
}
//# sourceMappingURL=sanitizer.d.ts.map
