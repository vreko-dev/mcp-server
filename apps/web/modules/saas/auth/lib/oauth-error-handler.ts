/**
 * Enhanced OAuth error handling
 * Provides user-friendly error messages for all OAuth failure scenarios
 */

export interface OAuthError {
	code?: string;
	message?: string;
	status?: number;
}

/**
 * Get a user-friendly error message for OAuth errors
 */
export function getOAuthErrorMessage(error: unknown): string {
	if (!error || typeof error !== "object") {
		return "An unexpected error occurred";
	}

	const err = error as OAuthError;

	const errorMessages: Record<string, string> = {
		// User-initiated cancellations
		oauth_cancelled: "Sign-in was cancelled. Please try again.",
		access_denied: "Sign-in was cancelled. Please try again.",

		// Security & validation errors
		oauth_state_mismatch: "Security validation failed. Please try again.",
		state_mismatch: "Security validation failed. Please try again.",
		invalid_state: "Security validation failed. Please try again.",

		// Token exchange failures
		token_exchange_failed:
			"Failed to complete sign-in with provider. Please try again.",
		invalid_code: "Invalid authorization code. Please try again.",
		code_expired: "Authorization code expired. Please try again.",

		// Email verification
		email_not_verified:
			"Please verify your email with the provider before signing in.",
		unverified_email:
			"Please verify your email with the provider before signing in.",

		// Private email (GitHub)
		private_email:
			"Your email is private. Please allow email access in your account settings.",
		email_not_public:
			"Your email is private. Please allow email access in your account settings.",

		// Account linking
		account_already_linked:
			"This account is already linked to another user. Please use a different account.",
		social_account_already_linked:
			"This account is already linked to another user. Please use a different account.",

		// Provider errors
		provider_error:
			"The authentication provider is temporarily unavailable. Please try again later.",
		provider_unavailable:
			"The authentication provider is temporarily unavailable. Please try again later.",
		server_error: "Authentication service error. Please try again later.",

		// Network errors
		network_error: "Network connection failed. Please check your connection.",
		timeout: "Authentication timed out. Please try again.",

		// Configuration errors
		provider_not_configured:
			"Authentication provider is not properly configured.",
		missing_credentials: "Missing provider credentials.",
	};

	// Try to match error code
	if (err.code && errorMessages[err.code]) {
		return (
			errorMessages[err.code] ?? "Authentication failed. Please try again."
		);
	}

	// Try to match error message
	if (err.message) {
		const lowerMessage = err.message.toLowerCase();

		if (lowerMessage.includes("cancel") || lowerMessage.includes("denied")) {
			return (
				errorMessages.oauth_cancelled ??
				"Sign-in was cancelled. Please try again."
			);
		}
		if (lowerMessage.includes("state")) {
			return (
				errorMessages.oauth_state_mismatch ??
				"Security validation failed. Please try again."
			);
		}
		if (lowerMessage.includes("token")) {
			return (
				errorMessages.token_exchange_failed ??
				"Failed to complete sign-in with provider. Please try again."
			);
		}
		if (lowerMessage.includes("email") && lowerMessage.includes("verify")) {
			return (
				errorMessages.email_not_verified ??
				"Please verify your email with the provider before signing in."
			);
		}
		if (lowerMessage.includes("private") || lowerMessage.includes("public")) {
			return (
				errorMessages.private_email ??
				"Your email is private. Please allow email access in your account settings."
			);
		}
		if (lowerMessage.includes("linked") || lowerMessage.includes("exists")) {
			return (
				errorMessages.account_already_linked ??
				"This account is already linked to another user. Please use a different account."
			);
		}
		if (
			lowerMessage.includes("network") ||
			lowerMessage.includes("connection")
		) {
			return (
				errorMessages.network_error ??
				"Network connection failed. Please check your connection."
			);
		}
		if (lowerMessage.includes("timeout")) {
			return (
				errorMessages.timeout ?? "Authentication timed out. Please try again."
			);
		}
	}

	// HTTP status code handling
	if (err.status) {
		if (err.status >= 500) {
			return (
				errorMessages.provider_error ??
				"Authentication service error. Please try again later."
			);
		}
		if (err.status === 401 || err.status === 403) {
			return (
				errorMessages.oauth_state_mismatch ??
				"Security validation failed. Please try again."
			);
		}
	}

	// Fallback to original message or generic error
	return err.message || "Authentication failed. Please try again.";
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableOAuthError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return true; // Assume unknown errors are recoverable
	}

	const err = error as OAuthError;

	// Non-recoverable errors
	const nonRecoverableCodes = [
		"account_already_linked",
		"social_account_already_linked",
		"provider_not_configured",
		"missing_credentials",
	];

	if (err.code && nonRecoverableCodes.includes(err.code)) {
		return false;
	}

	return true; // Most OAuth errors are recoverable
}
