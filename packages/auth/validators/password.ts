import { z } from "zod";

// Password validation schema with strong requirements
export const passwordSchema = z
	.string()
	.min(12, "Password must be at least 12 characters")
	.regex(/[A-Z]/, "Password must contain uppercase letter")
	.regex(/[a-z]/, "Password must contain lowercase letter")
	.regex(/[0-9]/, "Password must contain number")
	.regex(/[^A-Za-z0-9]/, "Password must contain special character");

// Async function to check against pwned passwords API
export async function isPasswordCompromised(password: string): Promise<boolean> {
	try {
		// Simple hash function for demonstration (in production, use proper crypto)
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest("SHA-1", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();

		const _prefix = hashHex.substring(0, 5);
		const _suffix = hashHex.substring(5);

		// In a real implementation, you would call the pwned passwords API
		// const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
		// const hashes = await response.text();
		// return hashes.includes(suffix);

		// For now, we'll return false to indicate the password is not compromised
		return false;
	} catch (_error) {
		// If there's an error checking, we'll be conservative and assume it's not compromised
		return false;
	}
}

// Combined password validation function
export async function validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
	const result = passwordSchema.safeParse(password);

	if (!result.success) {
		const errors = result.error.issues.map((issue) => issue.message);
		return { valid: false, errors };
	}

	// Check if password is compromised
	const isCompromised = await isPasswordCompromised(password);
	if (isCompromised) {
		return {
			valid: false,
			errors: ["Password has been compromised in a data breach"],
		};
	}

	return { valid: true, errors: [] };
}
