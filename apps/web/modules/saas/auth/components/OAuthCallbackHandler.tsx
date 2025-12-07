"use client";

import { authClient } from "@snapback/auth/client";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOAuthErrorMessage } from "../lib/oauth-error-handler";

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

				// Use sanitized error message to prevent info leak
				const sanitizedMessage = getOAuthErrorMessage({ code: error, message: errorDescription || undefined });
				setErrorMessage(sanitizedMessage);

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
					// Validate that session was created successfully by Better Auth
					const session = await authClient.getSession();

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
