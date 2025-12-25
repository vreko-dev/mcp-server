/**
 * Security Pattern Matchers
 *
 * Detects security patterns and anti-patterns in the codebase.
 *
 * @module patterns/matchers/security
 */

import type { PatternMatch, PatternMatcher } from "../types.js";

/**
 * Create line-based match from regex match
 */
function createMatch(content: string, filePath: string, regexMatch: RegExpExecArray, confidence = 0.9): PatternMatch {
	const beforeMatch = content.slice(0, regexMatch.index);
	const line = (beforeMatch.match(/\n/g) || []).length + 1;
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
 * Matcher for Helmet security headers
 */
export const helmetMatcher: PatternMatcher = {
	id: "helmet-security",
	name: "Helmet Security Headers",
	category: "security",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "critical",
	description: "Security headers with Helmet middleware",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [/import.*helmet/g, /require\s*\(\s*['"]helmet['"]\s*\)/g, /app\.use\s*\(\s*helmet\s*\(/g];

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
 * Matcher for CORS configuration
 */
export const corsMatcher: PatternMatcher = {
	id: "cors-config",
	name: "CORS Configuration",
	category: "security",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "critical",
	description: "Cross-origin resource sharing configuration",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/import.*cors/g,
			/require\s*\(\s*['"]cors['"]\s*\)/g,
			/app\.use\s*\(\s*cors\s*\(/g,
			/Access-Control-Allow-Origin/g,
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
 * Matcher for rate limiting
 */
export const rateLimitMatcher: PatternMatcher = {
	id: "rate-limiting",
	name: "Rate Limiting",
	category: "security",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "critical",
	description: "Request rate limiting to prevent abuse",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/express-rate-limit/g,
			/rate-limiter-flexible/g,
			/rateLimit/g,
			/@nestjs\/throttler/g,
			/ThrottlerModule/g,
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
 * Matcher for SQL injection vulnerabilities (anti-pattern)
 */
export const sqlInjectionMatcher: PatternMatcher = {
	id: "sql-injection-risk",
	name: "SQL Injection Risk",
	category: "security",
	files: ["**/*.{ts,js}"],
	isPositive: false,
	importance: "critical",
	description: "Potential SQL injection vulnerability (string concatenation in queries)",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		// Look for string concatenation in SQL queries
		const patterns = [
			/query\s*\(\s*[`'"].*\$\{/g,
			/execute\s*\(\s*[`'"].*\+/g,
			/SELECT.*\+.*WHERE/gi,
			/INSERT.*\+.*VALUES/gi,
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match, 0.7));
			}
		}

		return matches;
	},
};

/**
 * Matcher for XSS vulnerabilities (anti-pattern)
 */
export const xssMatcher: PatternMatcher = {
	id: "xss-risk",
	name: "XSS Risk",
	category: "security",
	files: ["**/*.{tsx,jsx}"],
	isPositive: false,
	importance: "critical",
	description: "Potential XSS vulnerability (dangerouslySetInnerHTML usage)",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const pattern = /dangerouslySetInnerHTML/g;

		let match: RegExpExecArray | null;
		while ((match = pattern.exec(content)) !== null) {
			matches.push(createMatch(content, filePath, match, 0.8));
		}

		return matches;
	},
};

/**
 * Matcher for hardcoded secrets (anti-pattern)
 */
export const hardcodedSecretsMatcher: PatternMatcher = {
	id: "hardcoded-secrets",
	name: "Hardcoded Secrets",
	category: "security",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: false,
	importance: "critical",
	description: "Potential hardcoded secrets or API keys",
	match: (content, filePath) => {
		// Skip test files and fixtures
		if (filePath.includes("test") || filePath.includes("fixture") || filePath.includes("mock")) {
			return [];
		}

		const matches: PatternMatch[] = [];

		const patterns = [
			/(api_key|apiKey|API_KEY)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
			/(secret|SECRET)\s*[:=]\s*['"][^'"]{16,}['"]/gi,
			/(password|PASSWORD)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
			/sk-[a-zA-Z0-9]{24,}/g, // OpenAI keys
			/ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
		];

		for (const pattern of patterns) {
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				matches.push(createMatch(content, filePath, match, 0.75));
			}
		}

		return matches;
	},
};

/**
 * Matcher for input validation
 */
export const inputValidationMatcher: PatternMatcher = {
	id: "input-validation",
	name: "Input Validation",
	category: "security",
	files: ["**/*.{ts,js}"],
	isPositive: true,
	importance: "critical",
	description: "Request input validation with Zod, Yup, or similar",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/z\.(object|string|number|array)/g,
			/yup\.(object|string|number|array)/g,
			/@IsString|@IsNumber|@IsEmail/g,
			/Joi\.(object|string|number|array)/g,
			/express-validator/g,
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
 * Matcher for authentication guards
 */
export const authGuardMatcher: PatternMatcher = {
	id: "auth-guard",
	name: "Authentication Guard",
	category: "security",
	files: ["**/*.{ts,tsx,js,jsx}"],
	isPositive: true,
	importance: "critical",
	description: "Authentication middleware or guards for protected routes",
	match: (content, filePath) => {
		const matches: PatternMatch[] = [];

		const patterns = [
			/@UseGuards/g,
			/AuthGuard/g,
			/isAuthenticated/g,
			/requireAuth/g,
			/withAuth/g,
			/useAuth/g,
			/getServerSession/g,
			/getToken/g,
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
 * All security matchers
 */
export const securityMatchers: PatternMatcher[] = [
	helmetMatcher,
	corsMatcher,
	rateLimitMatcher,
	sqlInjectionMatcher,
	xssMatcher,
	hardcodedSecretsMatcher,
	inputValidationMatcher,
	authGuardMatcher,
];
