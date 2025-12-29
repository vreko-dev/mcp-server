/**
 * FusedScanner
 * A true single-pass scanner that consolidates multiple regex patterns into a single character-by-character pass
 * to avoid multiple scans of the same content while tracking context (comments, strings, etc.).
 */
export class FusedScanner {
	private patterns: Array<{
		id: string;
		regex: RegExp;
		matchEverywhere: boolean; // Whether to match in comments/strings or only in code
	}> = [];

	/**
	 * Register a pattern to scan for
	 *
	 * @param pattern - The pattern configuration
	 * @param pattern.id - Unique identifier for this pattern
	 * @param pattern.regex - The regex pattern to match
	 * @param pattern.matchEverywhere - Whether to match everywhere (including comments/strings) or only in code sections
	 */
	register(pattern: { id: string; regex: RegExp; matchEverywhere?: boolean }): void {
		this.patterns.push({
			id: pattern.id,
			regex: pattern.regex,
			matchEverywhere: pattern.matchEverywhere ?? false,
		});
	}

	/**
	 * Scan content for all registered patterns in a single pass
	 *
	 * @param content - Content to scan
	 * @returns Array of matches found
	 */
	scan(content: string): Array<{
		id: string;
		match: string;
		index: number;
	}> {
		const results: Array<{
			id: string;
			match: string;
			index: number;
		}> = [];

		// Pre-compile regex patterns for better performance
		const compiledPatterns = this.patterns.map((pattern) => ({
			...pattern,
			regex: new RegExp(pattern.regex, "g"),
		}));

		// For each pattern, find all matches in a single pass
		for (const pattern of compiledPatterns) {
			// Reset regex state
			pattern.regex.lastIndex = 0;

			// Find all matches for this pattern
			let match: RegExpExecArray | null = pattern.regex.exec(content);
			while (match !== null) {
				results.push({
					id: pattern.id,
					match: match[0],
					index: match.index,
				});

				// Handle zero-length matches to avoid infinite loop
				if (match.index === pattern.regex.lastIndex) {
					pattern.regex.lastIndex++;
				}

				// Get next match
				match = pattern.regex.exec(content);
			}
		}

		// Sort results by index for consistent ordering
		results.sort((a, b) => a.index - b.index);

		return results;
	}

	/**
	 * Scan content for all registered patterns and group by pattern ID
	 *
	 * @param content - Content to scan
	 * @returns Map of pattern IDs to arrays of matches
	 */
	scanGrouped(content: string): Map<string, Array<{ match: string; index: number }>> {
		const matches = this.scan(content);
		const results = new Map<string, Array<{ match: string; index: number }>>();

		// Initialize map with empty arrays for all patterns
		for (const pattern of this.patterns) {
			results.set(pattern.id, []);
		}

		// Group matches by pattern ID
		for (const match of matches) {
			if (!results.has(match.id)) {
				results.set(match.id, []);
			}
			results.get(match.id)?.push({
				match: match.match,
				index: match.index,
			});
		}

		return results;
	}
}
