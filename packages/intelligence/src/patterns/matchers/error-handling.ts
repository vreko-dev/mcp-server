/**
 * Error Handling Pattern Matchers
 *
 * Detects error handling patterns in the codebase.
 *
 * @module patterns/matchers/error-handling
 */

import type { PatternMatch, PatternMatcher } from "../types.js";

/**
 * Create line-based match from regex match
 */
function createMatch(content: string, filePath: string, regexMatch: RegExpExecArray, confidence = 0.9): PatternMatch {
	const beforeMatch = content.slice(0, regexMatch.index);
	const line = (beforeMatch.match(/\n/g) || []).length + 1;

	// Get snippet (the matched line)
	const lines = content.split("\n");
	const snippet = lines[line - 1]?.trim() || regexMatch[0];

	return {
		file: filePath,
		line,
		snippet: snippet.slice(0, 100),
		confidence,
	};
}

/**
 * Matcher for React Error Boundaries
 */
export const errorBoundaryMatcher: PatternMatcher = {
	id: "error-boundary",
	name: "Error Boundary",
	category: "error-handling",
	files: ["**/*.{tsx,jsx}"],
	isPositive: true,
	importance: "critical",
	description: "React Error Boundary for graceful error handling",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		// Check for ErrorBoundary component usage
		const patterns = [
			/class\s+\w+\s+extends\s+\w*Error.*\{[\s\S]*?componentDidCatch/g,
			/ErrorBoundary/g,
			/react-error-boundary/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for try-catch blocks
 */
export const tryCatchMatcher: PatternMatcher = {
	id: "try-catch",
	name: "Try-Catch Error Handling",
	category: "error-handling",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "Proper try-catch error handling for async operations",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		// Look for try-catch blocks, especially with async
		const pattern = /try\s*\{[\s\S]*?\}\s*catch\s*\(/g;

		let match: RegExpExecArray | null;
		while ((match = pattern.exec(content)) !== null) {
			matches.push(createMatch(content, filePath, match, 0.85));
		}

		return matches;
	},
};

/**
 * Matcher for Express error middleware
 */
export const expressErrorMiddlewareMatcher: PatternMatcher = {
	id: "express-error-middleware",
	name: "Express Error Middleware",
	category: "error-handling",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "critical",
	description: "Centralized error handling middleware for Express",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		// Express error middleware signature: (err, req, res, next)
		const patterns = [
			/\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)/g,
			/\(\s*error\s*:\s*\w+\s*,\s*req\s*:\s*\w+\s*,\s*res\s*:\s*\w+\s*,\s*next\s*:\s*\w+\s*\)/g,
			/errorHandler|ErrorHandler/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for NestJS exception filters
 */
export const nestjsExceptionFilterMatcher: PatternMatcher = {
	id: "nestjs-exception-filter",
	name: "NestJS Exception Filter",
	category: "error-handling",
	files: ["**/*.ts"],
	isPositive: true,
	importance: "critical",
	description: "NestJS exception filters for error handling",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/@Catch\s*\(/g, /ExceptionFilter/g, /HttpException/g];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * Matcher for unhandled promise rejections (anti-pattern)
 */
export const unhandledPromiseMatcher: PatternMatcher = {
	id: "unhandled-promise",
	name: "Unhandled Promise",
	category: "error-handling",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: false, // This is an anti-pattern
	importance: "critical",
	description: "Promises without .catch() or try-catch (potential unhandled rejection)",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		// Look for .then() without .catch()
		// This is a simplified heuristic
		const thenPattern = /\.then\s*\([^)]+\)(?!\s*\.catch)/g;

		let match: RegExpExecArray | null;
		while ((match = thenPattern.exec(content)) !== null) {
			// Check if there's a .catch on the same line or next
			const afterMatch = content.slice(match.index);
			if (!afterMatch.slice(0, 200).includes(".catch")) {
				matches.push(createMatch(content, filePath, match, 0.6));
			}
		}

		return matches;
	},
};

/**
 * Matcher for global error handlers
 */
export const globalErrorHandlerMatcher: PatternMatcher = {
	id: "global-error-handler",
	name: "Global Error Handler",
	category: "error-handling",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "recommended",
	description: "Global error handler for uncaught exceptions",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/process\.on\s*\(\s*['"]uncaughtException['"]/g,
			/process\.on\s*\(\s*['"]unhandledRejection['"]/g,
			/window\.onerror/g,
			/window\.addEventListener\s*\(\s*['"]error['"]/g,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match));
			}
		}

		return matches;
	},
};

/**
 * All error handling matchers
 */
export const errorHandlingMatchers: PatternMatcher[] = [
	errorBoundaryMatcher,
	tryCatchMatcher,
	expressErrorMiddlewareMatcher,
	nestjsExceptionFilterMatcher,
	unhandledPromiseMatcher,
	globalErrorHandlerMatcher,
];
