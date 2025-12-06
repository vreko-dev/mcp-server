// TODO: Import AuthClientErrorCodes when available in better-auth types
import { getOAuthErrorMessage, isRecoverableOAuthError } from "../lib/oauth-error-handler";

// Temporary type definition until better-auth exports AuthClientErrorCodes
type AuthClientErrorCodes = Record<string, string>;

export function useAuthErrorMessages() {
	const authErrorMessages: Partial<AuthClientErrorCodes> = {
		INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
		USER_NOT_FOUND: "User not found",
		FAILED_TO_CREATE_USER: "Failed to create user",
		FAILED_TO_CREATE_SESSION: "Failed to create session",
		FAILED_TO_UPDATE_USER: "Failed to update user",
		FAILED_TO_GET_SESSION: "Failed to get session",
		INVALID_PASSWORD: "Invalid password",
		INVALID_EMAIL: "Invalid email",
		INVALID_TOKEN: "Invalid token",
		CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
		EMAIL_CAN_NOT_BE_UPDATED: "Email cannot be updated",
		EMAIL_NOT_VERIFIED: "Email not verified",
		FAILED_TO_GET_USER_INFO: "Failed to get user info",
		ID_TOKEN_NOT_SUPPORTED: "ID token not supported",
		PASSWORD_TOO_LONG: "Password too long",
		PASSWORD_TOO_SHORT: "Password too short",
		PROVIDER_NOT_FOUND: "Provider not found",
		SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account already linked",
		USER_EMAIL_NOT_FOUND: "User email not found",
		USER_ALREADY_EXISTS: "User already exists",
		INVALID_INVITATION: "Invalid invitation",
		SESSION_EXPIRED: "Session expired",
		FAILED_TO_UNLINK_LAST_ACCOUNT: "Failed to unlink last account",
		ACCOUNT_NOT_FOUND: "Account not found",
	};

	const getAuthErrorMessage = (errorCode: string | undefined) => {
		return authErrorMessages[errorCode as keyof typeof authErrorMessages] || "An unknown error occurred";
	};

	return {
		getAuthErrorMessage,
		getOAuthErrorMessage,
		isRecoverableOAuthError,
	};
}
