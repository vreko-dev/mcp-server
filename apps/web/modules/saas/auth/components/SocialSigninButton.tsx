"use client";

import { authClient } from "@snapback/auth/client";
import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { oAuthProviders } from "../constants/oauth-providers";

export function SocialSigninButton({
	provider,
	className,
}: {
	provider: keyof typeof oAuthProviders;
	className?: string;
}) {
	// const [invitationId] = useQueryState("invitationId", parseAsString);
	const providerData = oAuthProviders[provider];
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// const redirectPath = invitationId
	// 	? `/organization-invitation/${invitationId}`
	// 	: authConfig.redirectAfterSignIn;

	const onSignin = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Use Better Auth client for OAuth sign-in
			// This triggers a redirect to the OAuth provider
			await authClient.signIn.social({
				provider,
				callbackURL: window.location.origin + "/dashboard",
			});

			// If we reach here without redirect, something went wrong
			// (Normal flow redirects to OAuth provider immediately)
		} catch (e) {
			console.error("OAuth signin error:", e);

			let errorMessage = "Failed to sign in. Please try again.";

			// Handle specific error cases
			if (e instanceof Error) {
				// Network errors
				if (e.message.includes("fetch") || e.message.includes("network")) {
					errorMessage = "Network error. Please check your connection and try again.";
				}
				// Configuration errors
				else if (e.message.includes("client") || e.message.includes("config")) {
					errorMessage = "OAuth configuration error. Please contact support.";
				}
				// Popup blocked
				else if (e.message.includes("popup") || e.message.includes("blocked")) {
					errorMessage = "Popup blocked. Please allow popups for this site.";
				}
				// Sanitize error messages to prevent info leak
				else if (e.message && (e.message.includes("database") || e.message.includes("password") || e.message.includes("pg://") || e.message.includes("Internal server"))) {
					// Don't expose database errors or sensitive info
					errorMessage = "An error occurred. Please try again or contact support.";
				}
				// Generic error with message
				else if (e.message) {
					errorMessage = e.message;
				}
			}

			setError(errorMessage);
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-2">
			{error && (
				<Alert variant="error" className="text-sm">
					<AlertTriangleIcon className="size-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<Button
				onClick={() => onSignin()}
				variant="light"
				type="button"
				className={className}
				loading={isLoading}
				disabled={isLoading}
			>
				{providerData.icon && (
					<i className="mr-2 text-primary">
						<providerData.icon className="size-4" />
					</i>
				)}
				{providerData.name}
			</Button>
		</div>
	);
}
