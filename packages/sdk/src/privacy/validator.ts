export class PrivacyValidator {
	/**
	 * Check that payload contains only metadata
	 */
	isMetadataOnly(data: any): boolean {
		// Forbidden properties
		const forbidden = [
			"content",
			"sourceCode",
			"fileContent",
			"code",
			"text",
			"body",
			"filePath", // Only hashed paths allowed
			"fullPath",
			"absolutePath",
		];

		// Check for forbidden properties
		const props = this.getAllProps(data);
		for (const prop of forbidden) {
			if (props.includes(prop)) {
				console.warn(`Privacy violation: forbidden property '${prop}' in request`);
				return false;
			}
		}

		// Check for suspiciously large strings
		const strings = this.getAllStrings(data);
		for (const str of strings) {
			if (str.length > 1000) {
				console.warn(`Privacy violation: string too large (${str.length} chars)`);
				return false;
			}

			// Check for code-like patterns
			if (this.looksLikeCode(str)) {
				console.warn("Privacy violation: string contains code-like patterns");
				return false;
			}
		}

		return true;
	}

	/**
	 * Get all property names recursively
	 */
	private getAllProps(obj: any, prefix = ""): string[] {
		let props: string[] = [];

		for (const [key, value] of Object.entries(obj)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			props.push(fullKey);

			if (typeof value === "object" && value !== null && !Array.isArray(value)) {
				props = props.concat(this.getAllProps(value, fullKey));
			}
		}

		return props;
	}

	/**
	 * Get all string values recursively
	 */
	private getAllStrings(obj: any): string[] {
		let strings: string[] = [];

		for (const value of Object.values(obj)) {
			if (typeof value === "string") {
				strings.push(value);
			} else if (typeof value === "object" && value !== null) {
				strings = strings.concat(this.getAllStrings(value));
			}
		}

		return strings;
	}

	/**
	 * Heuristic to detect code-like strings
	 */
	private looksLikeCode(str: string): boolean {
		const codePatterns = [
			/function\s+\w+/,
			/const\s+\w+\s*=/,
			/let\s+\w+\s*=/,
			/var\s+\w+\s*=/,
			/class\s+\w+/,
			/import\s+.*from/,
			/export\s+(default\s+)?/,
			/if\s*\(/,
			/for\s*\(/,
			/while\s*\(/,
		];

		return codePatterns.some((pattern) => pattern.test(str));
	}
}
