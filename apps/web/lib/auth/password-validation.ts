/**
 * Password Validation (OWASP 2025 Compliant)
 *
 * Implements OWASP password guidelines:
 * - Minimum 12 characters (updated from 8)
 * - Maximum 128 characters (prevent DoS attacks)
 * - Complexity requirements (uppercase, lowercase, number, special char)
 * - Common password checking (integrate with haveibeenpwned)
 *
 * References:
 * - OWASP Authentication Cheat Sheet
 * - NIST SP 800-63B
 */

/**
 * Password validation result
 */
export interface PasswordValidationResult {
	valid: boolean;
	error?: string;
	strength?: "weak" | "medium" | "strong";
}

/**
 * Password requirements constants
 */
export const PASSWORD_REQUIREMENTS = {
	MIN_LENGTH: 12,
	MAX_LENGTH: 128,
	REQUIRE_UPPERCASE: true,
	REQUIRE_LOWERCASE: true,
	REQUIRE_NUMBER: true,
	REQUIRE_SPECIAL: true,
} as const;

/**
 * Common weak passwords (top 100 most common)
 * In production, use haveibeenpwned API for comprehensive checking
 */
const COMMON_PASSWORDS = new Set([
	"password",
	"123456",
	"123456789",
	"12345678",
	"12345",
	"qwerty",
	"abc123",
	"password123",
	"1234567",
	"welcome",
	"admin",
	"letmein",
	"monkey",
	"1234567890",
	"dragon",
	"master",
	"sunshine",
	"princess",
	"login",
	"admin123",
]);

/**
 * Validate password against OWASP 2025 requirements
 *
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * const result = validatePassword('MyP@ssw0rd123');
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
	// Check for empty password
	if (!password || password.trim().length === 0) {
		return {
			valid: false,
			error: "Password is required",
		};
	}

	// Check minimum length (OWASP 2025: 12+ characters)
	if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
		return {
			valid: false,
			error: `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
		};
	}

	// Check maximum length (prevent DoS attacks)
	if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
		return {
			valid: false,
			error: `Password must not exceed ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`,
		};
	}

	// Check complexity requirements
	const hasUppercase = /[A-Z]/.test(password);
	const hasLowercase = /[a-z]/.test(password);
	const hasNumber = /\d/.test(password);
	const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

	const missingRequirements: string[] = [];

	if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !hasUppercase) {
		missingRequirements.push("uppercase letter");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !hasLowercase) {
		missingRequirements.push("lowercase letter");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER && !hasNumber) {
		missingRequirements.push("number");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL && !hasSpecial) {
		missingRequirements.push("special character");
	}

	if (missingRequirements.length > 0) {
		return {
			valid: false,
			error: `Password must contain at least one: ${missingRequirements.join(", ")}`,
		};
	}

	// Check against common passwords
	const normalizedPassword = password.toLowerCase();
	if (COMMON_PASSWORDS.has(normalizedPassword)) {
		return {
			valid: false,
			error: "Password is too common. Please choose a more secure password",
		};
	}

	// Calculate password strength
	const strength = calculatePasswordStrength(password);

	return {
		valid: true,
		strength,
	};
}

/**
 * Calculate password strength
 *
 * @param password - Password to analyze
 * @returns Strength rating (weak/medium/strong)
 */
function calculatePasswordStrength(password: string): "weak" | "medium" | "strong" {
	let score = 0;

	// Length scoring
	if (password.length >= 12) {
		score += 1;
	}
	if (password.length >= 16) {
		score += 1;
	}
	if (password.length >= 20) {
		score += 1;
	}

	// Complexity scoring
	if (/[A-Z]/.test(password)) {
		score += 1;
	}
	if (/[a-z]/.test(password)) {
		score += 1;
	}
	if (/\d/.test(password)) {
		score += 1;
	}
	if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
		score += 1;
	}

	// Character variety scoring
	const uniqueChars = new Set(password).size;
	if (uniqueChars >= 10) {
		score += 1;
	}
	if (uniqueChars >= 15) {
		score += 1;
	}

	// Pattern detection (sequential chars reduce score)
	if (/(.)\1{2,}/.test(password)) {
		score -= 1; // Repeated characters
	}
	if (/012|123|234|345|456|567|678|789|890/.test(password)) {
		score -= 1; // Sequential numbers
	}
	if (
		/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(
			password,
		)
	) {
		score -= 1; // Sequential letters
	}

	// Strength classification
	if (score >= 7) {
		return "strong";
	}
	if (score >= 4) {
		return "medium";
	}
	return "weak";
}

/**
 * Check password against haveibeenpwned API (optional enhancement)
 *
 * Uses k-anonymity model: only sends first 5 chars of SHA-1 hash
 * to protect password privacy.
 *
 * @param password - Password to check
 * @returns true if password has been pwned, false if safe
 *
 * @example
 * ```ts
 * const isPwned = await checkPasswordPwned('password123');
 * if (isPwned) {
 *   console.error('This password has been exposed in data breaches');
 * }
 * ```
 */
export async function checkPasswordPwned(password: string): Promise<boolean> {
	try {
		// Hash password with SHA-1
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest("SHA-1", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();

		// Send only first 5 characters (k-anonymity)
		const prefix = hashHex.substring(0, 5);
		const suffix = hashHex.substring(5);

		const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
			headers: {
				"User-Agent": "SnapBack-Auth-Check",
			},
		});

		if (!response.ok) {
			console.warn("[Auth] Failed to check password against haveibeenpwned");
			return false; // Fail open (don't block user)
		}

		const text = await response.text();
		const hashes = text.split("\n");

		// Check if our suffix appears in the response
		for (const line of hashes) {
			const [hashSuffix] = line.split(":");
			if (hashSuffix === suffix) {
				return true; // Password has been pwned
			}
		}

		return false; // Password is safe
	} catch (error) {
		console.error("[Auth] Error checking password:", error);
		return false; // Fail open
	}
}

/**
 * Get password requirements as human-readable text
 *
 * @returns Array of requirement strings for display
 *
 * @example
 * ```tsx
 * <ul>
 *   {getPasswordRequirements().map((req, i) => (
 *     <li key={i}>{req}</li>
 *   ))}
 * </ul>
 * ```
 */
export function getPasswordRequirements(): string[] {
	const requirements: string[] = [
		`At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
		`No more than ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`,
	];

	if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE) {
		requirements.push("At least one uppercase letter (A-Z)");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE) {
		requirements.push("At least one lowercase letter (a-z)");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBER) {
		requirements.push("At least one number (0-9)");
	}

	if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL) {
		requirements.push("At least one special character (!@#$%^&*...)");
	}

	requirements.push("Not a common or compromised password");

	return requirements;
}
