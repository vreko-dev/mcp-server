"use client";

import { authClient } from "@snapback/auth/client";
import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { AlertTriangleIcon, CheckCircleIcon, Loader2Icon, MailIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

interface ExtensionEmailInputProps {
	/** Extension ID to include in the magic link */
	extensionId?: string;
	/** IDE name for context */
	ideName?: string;
	/** Custom onSuccess callback */
	onSuccess?: (email: string) => void;
	/** Custom onError callback */
	onError?: (error: string) => void;
}

type InputState = "idle" | "loading" | "success" | "error";

/**
 * Extension Email Input Component
 *
 * Per /apps/onboarding/implementation.md Phase 3:
 * - Email input modal in extension sidebar
 * - Extension → Email service (direct link request)
 * - Encodes extension_id in magic link URL
 *
 * This component is designed to be rendered in the VS Code extension webview
 * or similar IDE extension contexts.
 */
export function ExtensionEmailInput({
	extensionId,
	ideName = "your IDE",
	onSuccess,
	onError,
}: ExtensionEmailInputProps) {
	const [email, setEmail] = useState("");
	const [state, setState] = useState<InputState>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate email
		const result = emailSchema.safeParse(email);
		if (!result.success) {
			setErrorMessage(result.error.errors[0]?.message || "Invalid email");
			setState("error");
			return;
		}

		setState("loading");
		setErrorMessage(null);

		try {
			// Build callback URL with extension context
			const callbackParams = new URLSearchParams();
			if (extensionId) {
				callbackParams.set("extension_id", extensionId);
			}
			const callbackURL = `/auth/verify?${callbackParams.toString()}`;

			// Use Better Auth client for magic link request
			const { error } = await authClient.signIn.magicLink({
				email: email.trim(),
				callbackURL,
				// For new users from extension, redirect to onboarding
				newUserCallbackURL: `/onboarding?extension_id=${extensionId || ""}`,
			});

			if (error) {
				throw new Error(error.message || "Failed to send magic link");
			}

			setState("success");
			onSuccess?.(email);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Something went wrong";
			setErrorMessage(message);
			setState("error");
			onError?.(message);
		}
	};

	// Success state
	if (state === "success") {
		return (
			<div className="flex flex-col items-center gap-4 p-4 text-center">
				<div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
					<CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
				</div>
				<div>
					<h3 className="font-semibold">Check your email</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						We sent a login link to <strong>{email}</strong>
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Click the link in your email to sign in to {ideName}
					</p>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setState("idle");
						setEmail("");
					}}
				>
					Use a different email
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="text-center">
				<h3 className="font-semibold">Protect your code from AI loss</h3>
				<p className="mt-1 text-sm text-muted-foreground">Enter your email to get started</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-3">
				{state === "error" && errorMessage && (
					<Alert variant="error" className="py-2">
						<AlertTriangleIcon className="h-4 w-4" />
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				)}

				<div className="relative">
					<MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="email"
						placeholder="you@company.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="pl-10"
						disabled={state === "loading"}
						autoComplete="email"
						autoFocus
					/>
				</div>

				<Button type="submit" disabled={state === "loading" || !email.trim()} className="w-full">
					{state === "loading" ? (
						<>
							<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
							Sending...
						</>
					) : (
						"Send login link"
					)}
				</Button>
			</form>

			<div className="text-center">
				<p className="text-xs text-muted-foreground">
					Or{" "}
					<a
						href="https://snapback.dev/auth/login"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline hover:no-underline"
					>
						sign up online
					</a>
				</p>
			</div>
		</div>
	);
}

/**
 * Compact email input for status bar or smaller contexts
 */
export function CompactEmailInput({ onSubmit }: { onSubmit: (email: string) => Promise<void> }) {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;

		setIsLoading(true);
		try {
			await onSubmit(email.trim());
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				type="email"
				placeholder="Email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				className="h-8 text-sm"
				disabled={isLoading}
			/>
			<Button type="submit" size="sm" disabled={isLoading || !email.trim()}>
				{isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Go"}
			</Button>
		</form>
	);
}
