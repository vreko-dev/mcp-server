"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { OrganizationInvitationAlert } from "@saas/organizations/components/OrganizationInvitationAlert";
import { useRouter } from "@shared/hooks/router";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import {
	AlertTriangleIcon,
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
	KeyIcon,
	MailboxIcon,
	ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";
import {
	type OAuthProvider,
	oAuthProviders,
} from "../constants/oauth-providers";
import { useSession } from "../hooks/use-session";
import { LoginModeSwitch } from "./LoginModeSwitch";
import { SocialSigninButton } from "./SocialSigninButton";
import { authConfig } from "../config";

const formSchema = z.union([
	z.object({
		mode: z.literal("magic-link"),
		email: z.string().email(),
	}),
	z.object({
		mode: z.literal("password"),
		email: z.string().email(),
		password: z.string().min(1),
	}),
]);

type FormValues = z.infer<typeof formSchema>;

interface AuthError {
	code?: string;
	message?: string;
	error?: string;
}

export function LoginForm() {
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const router = useRouter();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const { user, loaded: sessionLoaded } = useSession();

	const [showPassword, setShowPassword] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
	const [showCaptcha, setShowCaptcha] = useState(false);
	const [isChallengeLoading, setIsChallengeLoading] = useState(false);
	const invitationId = searchParams.get("invitationId");
	const email = searchParams.get("email");
	const redirectTo = searchParams.get("redirectTo");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: email ?? "",
			password: "",
			mode: authConfig.enablePasswordLogin ? "password" : "magic-link",
		},
	});

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? authConfig.redirectAfterSignIn);

	useEffect(() => {
		if (sessionLoaded && user) {
			router.replace(redirectPath);
		}
	}, [user, sessionLoaded]);

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		try {
			if (values.mode === "password") {
				// If we have a Turnstile token, send it via header (not body) for security
				const headers: HeadersInit = {
					"Content-Type": "application/json",
				};
				if (turnstileToken) {
					headers["X-Turnstile-Token"] = turnstileToken;
				}

				// Use fetch directly to control headers
				const response = await fetch("/api/auth/sign-in/email", {
					method: "POST",
					headers,
					credentials: "include",
					body: JSON.stringify({
						email: values.email,
						password: values.password,
					}),
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
					throw new Error(data.message || data.error || "Sign in failed");
				}

				// Check for 2FA redirect
				if (
					data &&
					typeof data === "object" &&
					"twoFactorRedirect" in data &&
					data.twoFactorRedirect
				) {
					router.replace(
						withQuery(
							"/auth/verify",
							Object.fromEntries(searchParams.entries()),
						),
					);
					return;
				}

				queryClient.invalidateQueries({
					queryKey: sessionQueryKey,
				});

				router.replace(redirectPath);
			} else {
				// Magic link mode
				const headers: HeadersInit = {
					"Content-Type": "application/json",
				};
				if (turnstileToken) {
					headers["X-Turnstile-Token"] = turnstileToken;
				}

				const response = await fetch("/api/auth/sign-in/magic-link", {
					method: "POST",
					headers,
					credentials: "include",
					body: JSON.stringify({
						email: values.email,
						callbackURL: redirectPath,
					}),
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
					throw new Error(data.message || data.error || "Sign in failed");
				}
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
	};

	const signinMode = form.watch("mode");

	const signInWithPasskey = async () => {
		// TODO: Implement passkey sign-in when backend is ready
		form.setError("root", {
			message: "Passkey sign-in is not yet available.",
		});
	};

	return (
		<div>
			<h1 className="font-bold text-xl md:text-2xl">Sign in to your account</h1>
			<p className="mt-1 mb-6 text-foreground/60">
				Welcome back! Please enter your details.
			</p>

			{form.formState.isSubmitSuccessful && signinMode === "magic-link" ? (
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>Check your email</AlertTitle>
					<AlertDescription>
						We've sent you a magic link to sign in.
					</AlertDescription>
				</Alert>
			) : (
				<>
					{invitationId && <OrganizationInvitationAlert className="mb-6" />}

					<Form {...form}>
						<form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
							{authConfig.enableMagicLink &&
								authConfig.enablePasswordLogin && (
									<LoginModeSwitch
										activeMode={signinMode}
										onChange={(mode) =>
											form.setValue("mode", mode as typeof signinMode)
										}
									/>
								)}

							{form.formState.isSubmitted &&
								form.formState.errors.root?.message && (
									<Alert variant="error">
										<AlertTriangleIcon />
										<AlertTitle>
											{form.formState.errors.root.message}
										</AlertTitle>
									</Alert>
								)}

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input {...field} autoComplete="email" />
										</FormControl>
									</FormItem>
								)}
							/>

							{authConfig.enablePasswordLogin && signinMode === "password" && (
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<div className="flex justify-between gap-4">
												<FormLabel>Password</FormLabel>

												<Link
													href="/auth/forgot-password"
													className="text-foreground/60 text-xs"
												>
													Forgot password?
												</Link>
											</div>
											<FormControl>
												<div className="relative">
													<Input
														type={showPassword ? "text" : "password"}
														className="pr-10"
														{...field}
														autoComplete="current-password"
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
								className="w-full"
								type="submit"
								variant="secondary"
								loading={form.formState.isSubmitting}
								disabled={showCaptcha && !turnstileToken}
							>
								{signinMode === "magic-link" ? "Send magic link" : "Sign in"}
							</Button>
						</form>
					</Form>

					{(authConfig.enablePasskeys ||
						(authConfig.enableSignup && authConfig.enableSocialLogin)) && (
						<>
							<div className="relative my-6 h-4">
								<hr className="relative top-2" />
								<p className="-translate-x-1/2 absolute top-0 left-1/2 mx-auto inline-block h-4 bg-card px-2 text-center font-medium text-foreground/60 text-sm leading-tight">
									Or continue with
								</p>
							</div>

							<div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
								{authConfig.enableSignup &&
									authConfig.enableSocialLogin &&
									Object.keys(oAuthProviders).map((providerId) => (
										<SocialSigninButton
											key={providerId}
											provider={providerId as OAuthProvider}
										/>
									))}

								{authConfig.enablePasskeys && (
									<Button
										variant="light"
										className="w-full sm:col-span-2"
										onClick={() => signInWithPasskey()}
									>
										<KeyIcon className="mr-1.5 size-4 text-primary" />
										Sign in with passkey
									</Button>
								)}
							</div>
						</>
					)}

					{authConfig.enableSignup && (
						<div className="mt-6 text-center text-sm">
							<span className="text-foreground/60">
								Don't have an account?{" "}
							</span>
							<Link
								href={withQuery(
									"/auth/signup",
									Object.fromEntries(searchParams.entries()),
								)}
							>
								Create an account
								<ArrowRightIcon className="ml-1 inline size-4 align-middle" />
							</Link>
						</div>
					)}
				</>
			)}
		</div>
	);
}
