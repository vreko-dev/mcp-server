/**
 * Authentication Domain Bundle
 *
 * Patterns for validating authentication and authorization code.
 * Covers session management, token handling, password security,
 * and access control patterns.
 *
 * @module domain/bundles/auth
 */

import type { DomainBundle, DomainPattern } from "@snapback/core/analysis";

const patterns: DomainPattern[] = [
	{
		id: "auth-session-expiry",
		name: "Session Expiry Configuration",
		description: "Sessions should have explicit expiry times to prevent session hijacking",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "session && (maxAge || expires || expiresIn)",
			keywords: ["session", "maxAge", "expires", "expiresIn", "ttl"],
		},
		failureMessage: "Session created without explicit expiry time",
		fixSuggestion: "Add session expiry: { maxAge: 3600000 } or similar",
	},
	{
		id: "auth-password-hashing",
		name: "Password Hashing",
		description: "Passwords must be hashed using bcrypt, argon2, or scrypt",
		required: true,
		severity: "critical",
		detectWith: {
			astPattern: "password && (bcrypt || argon2 || scrypt)",
			keywords: ["bcrypt", "argon2", "scrypt", "hash", "password"],
		},
		failureMessage: "Password storage without proper hashing detected",
		fixSuggestion: "Use bcrypt.hash() or argon2.hash() for password storage",
	},
	{
		id: "auth-token-validation",
		name: "JWT Token Validation",
		description: "JWT tokens must be validated with signature verification",
		required: true,
		severity: "critical",
		detectWith: {
			astPattern: "jwt.verify || jsonwebtoken.verify",
			keywords: ["jwt", "verify", "jsonwebtoken", "token"],
		},
		failureMessage: "JWT used without proper verification",
		fixSuggestion: "Use jwt.verify(token, secret) with a strong secret",
	},
	{
		id: "auth-csrf-protection",
		name: "CSRF Protection",
		description: "State-changing endpoints should have CSRF protection",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "csrf || csrfToken || _csrf",
			keywords: ["csrf", "csrfToken", "xsrf", "csurf"],
		},
		failureMessage: "State-changing endpoint without CSRF protection",
		fixSuggestion: "Add CSRF token validation using csurf or similar middleware",
	},
	{
		id: "auth-rate-limiting",
		name: "Rate Limiting on Auth Endpoints",
		description: "Authentication endpoints should be rate-limited to prevent brute force",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "rateLimit || rateLimiter || express-rate-limit",
			keywords: ["rateLimit", "rateLimiter", "throttle", "brute"],
		},
		failureMessage: "Authentication endpoint without rate limiting",
		fixSuggestion: "Add rate limiting: app.use('/login', rateLimit({ max: 5, windowMs: 15*60*1000 }))",
	},
	{
		id: "auth-secure-cookies",
		name: "Secure Cookie Configuration",
		description: "Authentication cookies must have secure, httpOnly, and sameSite flags",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "cookie && (secure && httpOnly && sameSite)",
			keywords: ["secure", "httpOnly", "sameSite", "cookie"],
		},
		failureMessage: "Authentication cookie missing security flags",
		fixSuggestion: "Set cookie options: { secure: true, httpOnly: true, sameSite: 'strict' }",
	},
	{
		id: "auth-constant-time-compare",
		name: "Constant-Time Comparison",
		description: "Secret comparisons should use timing-safe comparison to prevent timing attacks",
		required: true,
		severity: "high",
		detectWith: {
			astPattern: "timingSafeEqual || crypto.timingSafeEqual",
			keywords: ["timingSafeEqual", "constantTimeCompare", "safeCompare"],
		},
		failureMessage: "Secret comparison using non-constant-time method (vulnerable to timing attacks)",
		fixSuggestion: "Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))",
	},
];

/**
 * Authentication domain pattern bundle
 */
export const authPatterns: DomainBundle = {
	id: "auth",
	name: "Authentication & Authorization",
	description: "Patterns for secure authentication and authorization implementation",
	patterns,
	applicableTo: ["auth", "login", "session", "jwt", "oauth", "passport"],
};
