/**
 * Any Type Usage Rule
 *
 * Advisory rule that detects explicit `any` type annotations in TypeScript
 * and suggests using `unknown` or proper typing instead.
 *
 * Part of Session Feedback Implementation spec - pattern detection.
 *
 * @module advisory/rules/AnyTypeRule
 */

import type { AdvisoryRule, ProactiveSuggestion } from "../../types/advisory.js";

/**
 * Check if a file is a TypeScript file
 */
function isTypeScriptFile(filePath: string): boolean {
	return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

/**
 * Check if a file is a type definition file (where any might be acceptable)
 */
function isTypeDefinitionFile(filePath: string): boolean {
	return filePath.endsWith(".d.ts");
}

/**
 * Check if file is test or fixture
 */
function isTestFile(filePath: string): boolean {
	return (
		filePath.includes(".test.") ||
		filePath.includes(".spec.") ||
		filePath.includes("__tests__") ||
		filePath.includes("__fixtures__")
	);
}

/**
 * Detect any type usage in TypeScript code
 */
function detectAnyTypes(
	code: string,
	_filePath: string,
): Array<{ line: number; context: string; isExplicit: boolean }> {
	const results: Array<{ line: number; context: string; isExplicit: boolean }> = [];
	const lines = code.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Skip comments
		const trimmed = line.trim();
		if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
			continue;
		}

		// Check if previous line has eslint-disable or ts-ignore
		const prevLine = i > 0 ? lines[i - 1].trim() : "";
		const hasDisableComment =
			prevLine.includes("eslint-disable") ||
			prevLine.includes("@ts-ignore") ||
			line.includes("eslint-disable") ||
			line.includes("@ts-ignore");

		if (hasDisableComment) {
			continue;
		}

		// Detect explicit any type annotations
		// Patterns: `: any`, `as any`, `<any>`, `: any[]`, `: any | `
		const anyPatterns = [
			/:\s*any\b/, // Type annotation
			/as\s+any\b/, // Type assertion
			/<any>/, // Generic with any
			/:\s*any\s*\[/, // Any array
			/:\s*any\s*\|/, // Any in union
			/\|\s*any\b/, // Any in union (other side)
		];

		for (const pattern of anyPatterns) {
			if (pattern.test(line)) {
				results.push({
					line: i + 1,
					context: trimmed.slice(0, 100),
					isExplicit: true,
				});
				break; // Only count once per line
			}
		}
	}

	return results;
}

/**
 * AnyTypeRule - Detects explicit any type annotations
 *
 * Triggers when any TypeScript file is analyzed.
 * Generates suggestions to use unknown or proper typing.
 */
export const AnyTypeRule: AdvisoryRule = {
	id: "any-type-usage",
	priority: 3,

	/**
	 * Trigger for TypeScript source files
	 */
	trigger: (ctx) => {
		return ctx.files.some((f) => isTypeScriptFile(f) && !isTypeDefinitionFile(f) && !isTestFile(f));
	},

	/**
	 * Generate suggestions for any type cleanup
	 */
	generate: (ctx) => {
		const suggestions: ProactiveSuggestion[] = [];
		const allDetected: Array<{ file: string; line: number }> = [];

		for (const file of ctx.files) {
			if (!isTypeScriptFile(file) || isTypeDefinitionFile(file) || isTestFile(file)) {
				continue;
			}

			const code = (ctx as { code?: string }).code;
			if (!code) {
				continue;
			}

			try {
				const detected = detectAnyTypes(code, file);
				for (const d of detected) {
					allDetected.push({ file, line: d.line });
				}
			} catch {}
		}

		if (allDetected.length === 0) {
			return { suggestions: [] };
		}

		const fileCount = new Set(allDetected.map((d) => d.file)).size;
		const totalCount = allDetected.length;

		// Higher priority if many any types found
		const priority = totalCount >= 10 ? 1 : totalCount >= 5 ? 2 : 3;

		suggestions.push({
			text: `Found ${totalCount} explicit \`any\` type${totalCount > 1 ? "s" : ""} in ${fileCount} file${fileCount > 1 ? "s" : ""}. Consider using \`unknown\` with type guards or proper type definitions for better type safety.`,
			priority,
			confidence: 0.9,
			category: "validation",
			files: [...new Set(allDetected.map((d) => d.file))],
		});

		return { suggestions };
	},
};
