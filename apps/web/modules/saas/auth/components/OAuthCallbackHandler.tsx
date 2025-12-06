"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * OAuth Callback Handler
 *
 * Validates session after OAuth redirect and handles errors.
 * Place this component on pages that receive OAuth redirects (e.g., /dashboard).
 *
 * Handles:
 * - OAuth callback errors from query parameters
 * - Session validation after OAuth
 * - Account linking conflicts
 * - Provider-specific errors
 */
export function OAuthCallbackHandler() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [validationState, setValidationState] = useState<"idle" | "validating" | "success" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const validateOAuthCallback = async () => {
			// Check for error in URL params (Better Auth redirects with error param on failure)
			const error = searchParams.get("error");
			const errorDescription = searchParams.get("error_description");

			if (error) {
				setValidationState("error");

				// Map common OAuth errors to user-friendly messages
				switch (error) {
					case "access_denied":
						setErrorMessage("You denied access to your account. Please try again and allow access.");
						break;
					case "account_linking_conflict":
						setErrorMessage(
							"This email is already associated with another account. Please sign in with your original method.",
						);
						break;
					case "invalid_request":
						setErrorMessage("Invalid OAuth request. Please try signing in again.");
						break;
					case "server_error":
						setErrorMessage("OAuth provider error. Please try again later or contact support.");
						break;
					default:
						setErrorMessage(errorDescription || `Authentication failed: ${error}. Please try again.`);
				}

				// Clean up URL parameters after displaying error
				const url = new URL(window.location.href);
				url.searchParams.delete("error");
				url.searchParams.delete("error_description");
				router.replace(url.pathname + url.search, { scroll: false });
				return;
			}

			// Check if we just came from an OAuth flow (has 'code' or 'state' param)
			const code = searchParams.get("code");
			const state = searchParams.get("state");

			if (code || state) {
				setValidationState("validating");

				try {
					// Validate that session was created successfully
					// TODO: Replace with actual auth client when backend is ready
					// const session = await authClient.getSession();
					const session = { data: null as any, error: null };

					if (session.data?.user) {
						setValidationState("success");

						// Clean up OAuth params from URL
						const url = new URL(window.location.href);
						url.searchParams.delete("code");
						url.searchParams.delete("state");
						url.searchParams.delete("scope");
						router.replace(url.pathname + url.search, { scroll: false });

						// Clear success message after 3 seconds
						setTimeout(() => {
							setValidationState("idle");
						}, 3000);
					} else {
						// OAuth callback completed but no session created
						setValidationState("error");
						setErrorMessage(
							"Authentication completed but session creation failed. Please try signing in again.",
						);

						// Redirect to login after 3 seconds
						setTimeout(() => {
							router.push("/auth/login");
						}, 3000);
					}
				} catch (e) {
					console.error("Session validation error:", e);
					setValidationState("error");
					setErrorMessage("Failed to validate session. Please try signing in again.");

					// Redirect to login after 3 seconds
					setTimeout(() => {
						router.push("/auth/login");
					}, 3000);
				}
			}
		};

		validateOAuthCallback();
	}, [searchParams, router]);

	// Don't render anything if idle
	if (validationState === "idle") {
		return null;
	}

	return (
		<div className="fixed top-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-top-2">
			{validationState === "validating" && (
				<Alert>
					<div className="flex items-center gap-2">
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						<AlertTitle>Completing sign in...</AlertTitle>
					</div>
				</Alert>
			)}

			{validationState === "success" && (
				<Alert variant="success">
					<CheckCircleIcon className="size-4" />
					<AlertTitle>Successfully signed in!</AlertTitle>
					<AlertDescription>Welcome back.</AlertDescription>
				</Alert>
			)}

			{validationState === "error" && errorMessage && (
				<Alert variant="error">
					<AlertTriangleIcon className="size-4" />
					<AlertTitle>Sign in failed</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
