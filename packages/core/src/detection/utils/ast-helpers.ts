import * as eslintParser from "@typescript-eslint/parser";
import * as esprima from "esprima";
import { logger } from "../../utils/logger.js";

/**
 * Parse code with automatic TypeScript/JavaScript detection
 * Falls back gracefully on parse errors
 *
 * @param content - Code content to parse
 * @param filePath - File path for determining parser
 * @returns AST or null on parse failure
 */
export function parseCode(content: string, filePath?: string): any | null {
	try {
		// Detect .ts/.tsx/.js/.jsx from extension
		if (filePath && (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))) {
			// Try @typescript-eslint/parser first for TS
			return eslintParser.parse(content, {
				sourceType: "module",
				ecmaFeatures: {
					jsx: filePath.endsWith(".tsx"),
				},
			});
		}

		// Fall back to esprima for JS
		return esprima.parseScript(content, {
			tolerant: true,
			jsx: filePath ? filePath.endsWith(".jsx") : false,
		});
	} catch (error) {
		// Log parse failures for debugging
		logger.warn({ error, filePath }, "AST parsing failed");

		// Try alternative parser as fallback
		try {
			if (filePath && (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))) {
				return esprima.parseScript(content, {
					tolerant: true,
				});
			}

			return eslintParser.parse(content, {
				sourceType: "module",
			});
		} catch (fallbackError) {
			logger.warn({ fallbackError, filePath }, "Fallback AST parsing also failed");
			return null;
		}
	}
}

/**
 * Extract import specifiers from AST
 * Handles: import X from 'y'; import {A,B} from 'y'; import * as Y from 'y'
 *
 * @param ast - Parsed AST
 * @returns Array of import specifiers
 */
export function extractImports(ast: any): string[] {
	const imports: string[] = [];

	if (!ast || !ast.body) {
		return imports;
	}

	// Use visitor pattern to traverse AST
	function traverse(node: any) {
		if (!node) {
			return;
		}

		// Handle ImportDeclaration nodes
		if (node.type === "ImportDeclaration" && node.source && node.source.value) {
			imports.push(node.source.value);
		}

		// Handle dynamic imports
		if (node.type === "CallExpression" && node.callee && node.callee.type === "Import") {
			// For dynamic imports, we can't always extract the exact path
			// but we can mark that there's a dynamic import
			imports.push("<dynamic-import>");
		}

		// Handle require calls
		if (
			node.type === "CallExpression" &&
			node.callee &&
			node.callee.name === "require" &&
			node.arguments &&
			node.arguments.length > 0 &&
			node.arguments[0].type === "Literal"
		) {
			imports.push(node.arguments[0].value);
		}

		// Traverse child nodes
		for (const key in node) {
			if (Object.hasOwn(node, key)) {
				const child = node[key];
				if (typeof child === "object" && child !== null) {
					if (Array.isArray(child)) {
						child.forEach(traverse);
					} else {
						traverse(child);
					}
				}
			}
		}
	}

	// Start traversal
	traverse(ast);

	return imports;
}

/**
 * Detect test files by path patterns
 *
 * @param filePath - File path to check
 * @returns True if file is a test file
 */
export function isTestFile(filePath: string): boolean {
	if (!filePath) {
		return false;
	}

	// Match: __tests__/, *.test.*, *.spec.*, /tests/
	return (
		filePath.includes("__tests__") ||
		filePath.includes(".test.") ||
		filePath.includes(".spec.") ||
		filePath.includes("/test/") ||
		filePath.includes("\\test\\")
	);
}

/**
 * Check if a string is a high entropy string (potential secret)
 *
 * @param str - String to check
 * @returns True if string has high entropy
 */
export function isHighEntropyString(str: string): boolean {
	// Skip short strings
	if (str.length < 8) {
		return false;
	}

	// Skip common non-secret patterns
	const lowerStr = str.toLowerCase();
	if (
		lowerStr.includes("uuid") ||
		lowerStr.includes("guid") ||
		lowerStr.includes("id") ||
		lowerStr.includes("key") ||
		lowerStr.includes("placeholder") ||
		lowerStr.includes("example") ||
		lowerStr.includes("template")
	) {
		return false;
	}

	// Calculate entropy (importing the function would create circular dependency)
	// Simple inline entropy calculation for this specific use case
	const frequencyMap = new Map<string, number>();
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		frequencyMap.set(char, (frequencyMap.get(char) || 0) + 1);
	}

	let entropy = 0;
	const len = str.length;
	for (const [_, frequency] of frequencyMap) {
		const probability = frequency / len;
		entropy -= probability * Math.log2(probability);
	}

	// High entropy threshold (>4.5)
	return entropy > 4.5;
}
