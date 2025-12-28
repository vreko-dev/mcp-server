"use client";

import { authConfig } from "@saas/auth/config";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Progress } from "@ui/components/progress";
import { AlertTriangleIcon, CheckCircle2Icon, Loader2Icon, MailIcon, RefreshCwIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { registerIdeContext, useIdeContext } from "../hooks/useIdeContext";
import { IdeStatusIndicator } from "./BackToIdeButton";

/**
 * Verification states per wireframes.md
 */
type VerificationState =
	| "loading" // Initial token validation
	| "success" // Token verified, session created
	| "expired" // Token has expired
	| "invalid" // Token is invalid
	| "already_used" // Token was already consumed
	| "error"; // Generic error

interface MagicLinkVerifyFormProps {
	/** Custom redirect path after successful verification */
	redirectPath?: string;
}

/**
 * Magic Link Verification Form
 *
 * Per implementation.md and wireframes.md:
 * - Validates magic token from URL
 * - Creates authenticated session
 * - Detects IDE context and routes appropriately
 * - Shows loading state during verification
 * - Handles expired/invalid tokens with resend option
 */
export function MagicLinkVerifyForm({ redirectPath }: MagicLinkVerifyFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const ideContext = useIdeContext();

	const [state, setState] = useState<VerificationState>("loading");
	const [progress, setProgress] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);

	// Get URL parameters
	const token = searchParams.get("token");
	const extensionId = searchParams.get("extension_id");
	const ideContextParam = searchParams.get("ide_context");
	const customRedirect = searchParams.get("redirectTo") || redirectPath;

	/**
	 * Determine the appropriate redirect path based on context
	 * Per implementation.md: Context detection happens AFTER auth
	 */
	const getRedirectPath = useCallback(() => {
		// If extension_id is present, redirect to extension setup
		if (extensionId) {
			return `/onboarding?step=2&extension_id=${extensionId}`;
		}

		// If IDE is detected, use standard redirect (user can use "Back to IDE" button)
		// If no IDE, redirect to onboarding intro
		if (ideContext.isDetected) {
			return customRedirect || authConfig.redirectAfterSignIn;
		}
		// Clean browser - show intro tour
		return customRedirect || "/onboarding";
	}, [extensionId, ideContext.isDetected, customRedirect]);

	/**
	 * Verify the magic link token
	 */
	const verifyToken = useCallback(async () => {
		if (!token) {
			setState("invalid");
			setErrorMessage("No verification token provided.");
			return;
		}

		try {
			setState("loading");
			setProgress(20);

			// Call the Better Auth verification endpoint
			const response = await fetch("/api/auth/sign-in/magic-link/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ token }),
			});

			setProgress(60);

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));

				// Handle specific error cases per implementation.md
				if (response.status === 410 || data.code === "EXPIRED") {
					setState("expired");
					setErrorMessage("This link has expired. Links are valid for 24 hours.");
					setUserEmail(data.email || null);
					return;
				}

				if (response.status === 400 || data.code === "INVALID") {
					setState("invalid");
					setErrorMessage("This link is invalid or malformed.");
					return;
				}

				if (data.code === "ALREADY_USED") {
					setState("already_used");
					setErrorMessage("This link has already been used. Each link can only be used once.");
					setUserEmail(data.email || null);
					return;
				}

				setState("error");
				setErrorMessage(data.message || "Verification failed. Please try again.");
				return;
			}

			setProgress(80);

			const data = await response.json();

			// Store IDE context if provided in URL (for extension sync)
			if (ideContextParam) {
				try {
					const parsedContext = JSON.parse(decodeURIComponent(ideContextParam));
					registerIdeContext(parsedContext);
				} catch {
					// Ignore parse errors
				}
			}

			// Set localStorage flag for extension to detect auth success
			if (typeof window !== "undefined") {
				localStorage.setItem(
					"snapback_auth_success",
					JSON.stringify({
						timestamp: Date.now(),
						userId: data.user?.id,
						extensionId,
					}),
				);
			}

			setProgress(100);
			setState("success");

			// Wait a moment to show success state, then redirect
			setTimeout(() => {
				router.replace(getRedirectPath());
			}, 1500);
		} catch (error) {
			console.error("Verification error:", error);
			setState("error");
			setErrorMessage("An unexpected error occurred. Please try again.");
		}
	}, [token, extensionId, ideContextParam, router, getRedirectPath]);

	// Start verification on mount
	useEffect(() => {
		verifyToken();
	}, [verifyToken]);

	// Resend magic link handler
	const handleResend = async () => {
		if (!userEmail) {
			router.push("/auth/login");
			return;
		}

		try {
			const response = await fetch("/api/auth/sign-in/magic-link", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: userEmail,
					callbackURL: customRedirect || authConfig.redirectAfterSignIn,
				}),
			});

			if (response.ok) {
				// Redirect to check email page
				router.push(`/auth/login?email=${encodeURIComponent(userEmail)}&magicLinkSent=true`);
			} else {
				setErrorMessage("Failed to send new link. Please try again.");
			}
		} catch {
			setErrorMessage("Failed to send new link. Please try again.");
		}
	};

	// Loading state
	if (state === "loading") {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<Loader2Icon className="h-12 w-12 animate-spin text-primary" />
				<h1 className="mt-6 font-bold text-xl md:text-2xl">Setting up your account...</h1>
				<p className="mt-2 text-muted-foreground">This usually takes a few seconds.</p>
				<Progress value={progress} className="mt-6 w-full max-w-xs" />
			</div>
		);
	}

	// Success state
	if (state === "success") {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<div className="rounded-full bg-green-100 p-4 dark:bg-green-900">
					<CheckCircle2Icon className="h-12 w-12 text-green-600 dark:text-green-400" />
				</div>
				<h1 className="mt-6 font-bold text-xl md:text-2xl">You're all set!</h1>
				<p className="mt-2 text-muted-foreground">Redirecting you to your dashboard...</p>

				{ideContext.isDetected && (
					<div className="mt-6">
						<IdeStatusIndicator />
					</div>
				)}

				<Progress value={100} className="mt-6 w-full max-w-xs" />
			</div>
		);
	}

	// Expired state
	if (state === "expired") {
		return (
			<div className="flex flex-col items-center py-8">
				<Alert variant="warning" className="mb-6">
					<AlertTriangleIcon className="h-5 w-5" />
					<AlertTitle>That link has expired</AlertTitle>
					<AlertDescription>Links only last 24 hours for security.</AlertDescription>
				</Alert>

				<div className="flex flex-col gap-3 w-full">
					{userEmail ? (
						<Button onClick={handleResend} className="w-full">
							<RefreshCwIcon className="mr-2 h-4 w-4" />
							Send a new login link
						</Button>
					) : (
						<Button onClick={() => router.push("/auth/login")} className="w-full">
							<MailIcon className="mr-2 h-4 w-4" />
							Back to sign in
						</Button>
					)}

					<Button variant="ghost" onClick={() => router.push("/")} className="w-full">
						Back to landing page
					</Button>
				</div>
			</div>
		);
	}

	// Invalid or already used state
	if (state === "invalid" || state === "already_used") {
		return (
			<div className="flex flex-col items-center py-8">
				<Alert variant="error" className="mb-6">
					<AlertTriangleIcon className="h-5 w-5" />
					<AlertTitle>{state === "already_used" ? "Link already used" : "Invalid link"}</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>

				<div className="flex flex-col gap-3 w-full">
					{userEmail ? (
						<Button onClick={handleResend} className="w-full">
							<RefreshCwIcon className="mr-2 h-4 w-4" />
							Send a new login link
						</Button>
					) : (
						<Button onClick={() => router.push("/auth/login")} className="w-full">
							<MailIcon className="mr-2 h-4 w-4" />
							Back to sign in
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Generic error state
	return (
		<div className="flex flex-col items-center py-8">
			<Alert variant="error" className="mb-6">
				<AlertTriangleIcon className="h-5 w-5" />
				<AlertTitle>Something went wrong</AlertTitle>
				<AlertDescription>{errorMessage || "We couldn't verify your link. Please try again."}</AlertDescription>
			</Alert>

			<div className="flex flex-col gap-3 w-full">
				<Button onClick={verifyToken} className="w-full">
					<RefreshCwIcon className="mr-2 h-4 w-4" />
					Try again
				</Button>

				<Button variant="ghost" onClick={() => router.push("/auth/login")} className="w-full">
					Back to sign in
				</Button>
			</div>
		</div>
	);
}

/**
 * Magic Link Sent confirmation
 * Per wireframes.md Screen 2: Success Message
 */
export function MagicLinkSentConfirmation({
	email,
	onResend,
	isResending = false,
}: {
	email: string;
	onResend?: () => void;
	isResending?: boolean;
}) {
	return (
		<div className="flex flex-col items-center py-8 text-center">
			<div className="rounded-full bg-green-100 p-4 dark:bg-green-900">
				<MailIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
			</div>

			<h1 className="mt-6 font-bold text-xl md:text-2xl">Check Your Email</h1>

			<p className="mt-2 text-muted-foreground">We sent a login link to:</p>
			<p className="mt-1 font-medium text-foreground">{email}</p>

			<p className="mt-4 text-muted-foreground">
				Click the link in your email to get started.
				<br />
				It will only take a few seconds.
			</p>

			<div className="mt-6 rounded-lg border bg-muted/50 p-4 text-sm">
				<p className="text-muted-foreground">
					Didn't receive it?{" "}
					{onResend ? (
						<button
							onClick={onResend}
							disabled={isResending}
							className="text-primary underline hover:no-underline disabled:opacity-50"
						>
							{isResending ? "Sending..." : "Resend link"}
						</button>
					) : (
						"Check your spam folder"
					)}
				</p>
			</div>

			<p className="mt-4 text-xs text-muted-foreground">⏱️ Link expires in 24 hours</p>
		</div>
	);
}
