export declare class PrivacyValidator {
	/**
	 * Check that payload contains only metadata
	 */
	isMetadataOnly(data: any): boolean;
	/**
	 * Get all property names recursively
	 */
	private getAllProps;
	/**
	 * Get all string values recursively
	 */
	private getAllStrings;
	/**
	 * Heuristic to detect code-like strings
	 */
	private looksLikeCode;
}
//# sourceMappingURL=validator.d.ts.map
