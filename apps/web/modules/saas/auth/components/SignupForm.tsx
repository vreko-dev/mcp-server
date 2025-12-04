"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { OrganizationInvitationAlert } from "@saas/organizations/components/OrganizationInvitationAlert";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
	MailboxIcon,
	ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";
import { authConfig } from "../config";
import {
	type OAuthProvider,
	oAuthProviders,
} from "../constants/oauth-providers";
import { SocialSigninButton } from "./SocialSigninButton";

const formSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1),
	password: z.string(),
});

interface AuthError {
	code?: string;
	message?: string;
	error?: string;
}

export function SignupForm({ prefillEmail }: { prefillEmail?: string }) {
	const router = useRouter();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();

	const [showPassword, setShowPassword] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
	const [showCaptcha, setShowCaptcha] = useState(false);
	const [isChallengeLoading, setIsChallengeLoading] = useState(false);
	const invitationId = searchParams.get("invitationId");
	const email = searchParams.get("email");
	const redirectTo = searchParams.get("redirectTo");

	const form = useForm({
		resolver: zodResolver(formSchema),
		values: {
			name: "",
			email: prefillEmail ?? email ?? "",
			password: "",
		},
	});

	const invitationOnlyMode = !authConfig.enableSignup && invitationId;

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? authConfig.redirectAfterSignIn);

	const onSubmit = form.handleSubmit(async ({ email, password, name }) => {
		try {
			// Send Turnstile token via header (not body) for security
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};
			if (turnstileToken) {
				headers["X-Turnstile-Token"] = turnstileToken;
			}

			const endpoint = authConfig.enablePasswordLogin
				? "/api/auth/sign-up/email"
				: "/api/auth/sign-in/magic-link";

			const body = authConfig.enablePasswordLogin
				? { email, password, name, callbackURL: redirectPath }
				: { email, name, callbackURL: redirectPath };

			const response = await fetch(endpoint, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify(body),
			});

			const data = (await response.json()) as AuthError;

			// Check if backend requires Turnstile challenge
			if (!response.ok && data.code === "CHALLENGE_REQUIRED") {
				setShowCaptcha(true);
				form.setError("root", {
					message:
						"Security verification required. Please complete the challenge below.",
				});
				return;
			}

			if (!response.ok) {
				throw new Error(data.message || data.error || "Sign up failed");
			}

			if (invitationOnlyMode) {
				try {
					// TODO: Replace with actual auth client when backend is ready
					// const { error } = await authClient.organization.acceptInvitation({ invitationId });
					const { error } = { error: null };

					if (error) {
						throw error;
					}

					router.push(authConfig.redirectAfterSignIn);
				} catch (e) {
					form.setError("root", {
						message: getAuthErrorMessage(
							e && typeof e === "object" && "code" in e
								? (e.code as string)
								: undefined,
						),
					});
				}
				router.push(authConfig.redirectAfterSignIn);
			}
		} catch (e) {
			form.setError("root", {
				message: getAuthErrorMessage(
					e && typeof e === "object" && "code" in e
						? (e.code as string)
						: undefined,
				),
			});
		}
	});

	return (
		<div>
			<h1 className="font-bold text-xl md:text-2xl">Create your account</h1>
			<p className="mt-1 mb-6 text-foreground/60">
				Get started with your free account today.
			</p>

			{form.formState.isSubmitSuccessful && !invitationOnlyMode ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Please verify your email</AlertTitle>
				</Alert>
			) : (
				<>
					{invitationId && <OrganizationInvitationAlert className="mb-6" />}

					<Form {...form}>
						<form
							className="flex flex-col items-stretch gap-4"
							onSubmit={onSubmit}
						>
							{form.formState.isSubmitted && form.formState.errors.root && (
								<Alert variant="error">
									<AlertTriangleIcon />
									<AlertDescription>
										{form.formState.errors.root.message}
									</AlertDescription>
								</Alert>
							)}

							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												{...field}
												autoComplete="email"
												readOnly={!!prefillEmail}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{authConfig.enablePasswordLogin && (
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Password</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showPassword ? "text" : "password"}
														className="pr-10"
														{...field}
														autoComplete="new-password"
													/>
													<button
														type="button"
														onClick={() => setShowPassword(!showPassword)}
														className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary text-xl"
													>
														{showPassword ? (
															<EyeOffIcon className="size-4" />
														) : (
															<EyeIcon className="size-4" />
														)}
													</button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{showCaptcha && (
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<ShieldAlertIcon className="size-4" />
										<span>Security verification required</span>
									</div>
									{isChallengeLoading && (
										<div className="flex items-center justify-center py-4">
											<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
										</div>
									)}
									<Turnstile
										siteKey={
											process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ||
											(process.env.NODE_ENV === "development"
												? "1x00000000000000000000AA"
												: (() => {
														throw new Error(
															"NEXT_PUBLIC_CAPTCHA_SITE_KEY is required in production",
														);
													})())
										}
										onBeforeInteractive={() => setIsChallengeLoading(true)}
										onAfterInteractive={() => setIsChallengeLoading(false)}
										onSuccess={(token: string) => {
											setTurnstileToken(token);
											setIsChallengeLoading(false);
										}}
										onError={() => {
											form.setError("root", {
												message:
													"Challenge verification failed. Please try again.",
											});
											setTurnstileToken(undefined);
											setIsChallengeLoading(false);
										}}
										onExpire={() => setTurnstileToken(undefined)}
										options={{
											theme: "light",
											size: "normal",
											retry: "auto",
											// "retry-interval": 8000, // TODO: Re-enable when Turnstile supports this option
											appearance: "interaction-only",
										}}
									/>
								</div>
							)}

							<Button
								loading={form.formState.isSubmitting}
								disabled={showCaptcha && !turnstileToken}
							>
								Create account
							</Button>
						</form>
					</Form>

					{authConfig.enableSignup && authConfig.enableSocialLogin && (
						<>
							<div className="relative my-6 h-4">
								<hr className="relative top-2" />
								<p className="-translate-x-1/2 absolute top-0 left-1/2 mx-auto inline-block h-4 bg-card px-2 text-center font-medium text-foreground/60 text-sm leading-tight">
									Or continue with
								</p>
							</div>

							<div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
								{Object.keys(oAuthProviders).map((providerId) => (
									<SocialSigninButton
										key={providerId}
										provider={providerId as OAuthProvider}
									/>
								))}
							</div>
						</>
					)}
				</>
			)}

			<div className="mt-6 text-center text-sm">
				<span className="text-foreground/60">Already have an account? </span>
				<Link
					href={withQuery(
						"/auth/login",
						Object.fromEntries(searchParams.entries()),
					)}
				>
					Sign in
					<ArrowRightIcon className="ml-1 inline size-4 align-middle" />
				</Link>
			</div>
		</div>
	);
}
