/**
 * Protection Snapshot Login
 *
 * Enhanced login experience with terminal-style animations,
 * security theming, and stage-based progress flow.
 *
 * Integrates OWASP 2025 password validation and Better Auth.
 */

"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Eye,
	EyeOff,
	Key,
	Loader2,
	Mail,
	Shield,
	XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	sendMagicLink,
	signInWithEmail,
	signInWithGithub,
	signInWithGoogle,
	signUpWithEmail,
} from "@/lib/auth/helpers";
import {
	getPasswordRequirements,
	validatePassword,
} from "@/lib/auth/password-validation";

/**
 * Inline media query hook for motion preferences
 */
function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		if (media.matches !== matches) {
			setMatches(media.matches);
		}
		const listener = () => setMatches(media.matches);
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}, [matches, query]);

	return matches;
}

/**
 * Stage progression for login flow
 */
type Stage =
	| "idle"
	| "email-input"
	| "processing"
	| "password-input"
	| "success"
	| "error"
	| "magic-link-sent";

/**
 * Authentication provider
 */
type Provider = "email" | "github" | "google" | "password";

/**
 * Authentication mode
 */
type Mode = "signin" | "signup" | "reset";

/**
 * Component state
 */
interface LoginState {
	stage: Stage;
	provider: Provider | null;
	mode: Mode;
	email: string;
	error: string | null;
}

/**
 * Terminal line for animated feedback
 */
interface TerminalLine {
	id: string;
	text: string;
	type: "info" | "success" | "error" | "warning";
}

/**
 * Protection Snapshot Login Component
 *
 * Features:
 * - Terminal-style animations
 * - Stage-based progress (idle → email → processing → password → success)
 * - Protection level theming (🟢 Watch / 🟡 Warn / 🔴 Block)
 * - OWASP 2025 password validation
 * - Enhanced accessibility (ARIA live regions)
 */
export default function ProtectionSnapshotLogin() {
	const router = useRouter();
	const prefersReducedMotion = useMediaQuery(
		"(prefers-reduced-motion: reduce)",
	);

	// State
	const [state, setState] = useState<LoginState>({
		stage: "idle",
		provider: null,
		mode: "signin",
		email: "",
		error: null,
	});

	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
	const [passwordStrength, setPasswordStrength] = useState<
		"weak" | "medium" | "strong" | null
	>(null);

	// Refs
	const politeAnnouncerRef = useRef<HTMLDivElement>(null);
	const assertiveAnnouncerRef = useRef<HTMLDivElement>(null);

	/**
	 * Accessibility announcer
	 */
	const announce = useCallback((message: string, assertive = false) => {
		const targetRef = assertive ? assertiveAnnouncerRef : politeAnnouncerRef;
		if (targetRef.current) {
			targetRef.current.textContent = "";
			requestAnimationFrame(() => {
				if (targetRef.current) {
					targetRef.current.textContent = message;
				}
			});
		}
	}, []);

	/**
	 * Add terminal line with animation
	 */
	const addTerminalLine = useCallback(
		async (text: string, type: TerminalLine["type"] = "info", delay = 0) => {
			if (delay > 0 && !prefersReducedMotion) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			const id = `line-${Date.now()}-${Math.random()}`;
			setTerminalLines((prev) => [...prev, { id, text, type }]);
		},
		[prefersReducedMotion],
	);

	// Note: Auto-focus handled via autoFocus prop on inputs

	/**
	 * Lock body/html scrolling on mount
	 */
	useEffect(() => {
		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = "";
			document.documentElement.style.overflow = "";
		};
	}, []);

	/**
	 * Password strength calculation
	 */
	useEffect(() => {
		if (password && state.mode === "signup") {
			const validation = validatePassword(password);
			setPasswordStrength(validation.strength || null);
		} else {
			setPasswordStrength(null);
		}
	}, [password, state.mode]);

	/**
	 * Handle OAuth provider selection
	 */
	const handleOAuthRedirect = async (provider: "github" | "google") => {
		setState((prev) => ({ ...prev, stage: "processing", provider }));
		setTerminalLines([]);
		await addTerminalLine(`Connecting to ${provider}...`, "info", 0);
		announce(`Redirecting to ${provider} for authorization. Please wait.`);

		try {
			const result =
				provider === "github"
					? await signInWithGithub()
					: await signInWithGoogle();

			if (result.success) {
				await addTerminalLine("✅ OAuth initialized", "success", 50);
				await addTerminalLine("🔄 Redirecting...", "info", 100);
				announce("OAuth successful. Redirecting to dashboard.", true);
				// OAuth redirect happens automatically
			} else {
				await addTerminalLine("❌ OAuth initialization failed", "error", 50);
				setState((prev) => ({
					...prev,
					stage: "error",
					error: result.error || "OAuth failed to initialize",
				}));
				announce(`Error: ${result.error || "OAuth failed"}`, true);
			}
		} catch (_error) {
			await addTerminalLine("❌ OAuth failed", "error", 50);
			setState((prev) => ({
				...prev,
				stage: "error",
				error: "Failed to connect to OAuth provider",
			}));
			announce("Error: Failed to connect to OAuth provider", true);
		}
	};

	/**
	 * Handle email submission
	 */
	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!state.email || !emailRegex.test(state.email)) {
			setState((prev) => ({
				...prev,
				error: "Please enter a valid email address",
			}));
			await addTerminalLine("❌ Invalid email format", "error", 0);
			announce("Error: Invalid email format", true);
			return;
		}

		setState((prev) => ({ ...prev, stage: "processing", error: null }));
		await addTerminalLine(`Validating ${state.email}...`, "info", 0);
		announce("Validating email address...");

		// For magic link mode
		if (state.provider === "email") {
			try {
				const result = await sendMagicLink(state.email);

				if (!result.success) {
					await addTerminalLine("❌ Failed to send magic link", "error", 50);
					setState((prev) => ({
						...prev,
						stage: "error",
						error: result.error || "Failed to send magic link",
					}));
					announce(`Error: ${result.error}`, true);
					return;
				}

				await addTerminalLine("✅ Magic link sent", "success", 50);
				await addTerminalLine("📧 Check your email", "info", 100);
				setState((prev) => ({ ...prev, stage: "magic-link-sent" }));
				announce("Success! Magic link sent to your email.", true);
			} catch (_error) {
				setState((prev) => ({
					...prev,
					stage: "error",
					error: "Failed to send magic link",
				}));
				announce("Error: Failed to send magic link", true);
			}
		} else {
			// Password flow - just validate email and move to password input
			await addTerminalLine("✅ Email valid", "success", 50);
			await addTerminalLine("🔑 Password required", "info", 100);
			setState((prev) => ({ ...prev, stage: "password-input" }));
			announce("Email valid. Please enter your password.");
		}
	};

	/**
	 * Handle password submission
	 */
	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!password || password.length < 8) {
			setState((prev) => ({
				...prev,
				error: "Password must be at least 8 characters",
			}));
			await addTerminalLine("❌ Invalid password", "error", 0);
			announce("Error: Password must be at least 8 characters", true);
			return;
		}

		// For signup, validate password strength
		if (state.mode === "signup") {
			const validation = validatePassword(password);
			if (!validation.valid) {
				setState((prev) => ({
					...prev,
					error: validation.error || "Invalid password",
				}));
				await addTerminalLine("❌ Password validation failed", "error", 0);
				announce(`Error: ${validation.error}`, true);
				return;
			}
		}

		setState((prev) => ({ ...prev, stage: "processing", error: null }));
		await addTerminalLine("Authenticating...", "info", 0);
		announce("Processing authentication...");

		await addTerminalLine("🔐 Verifying credentials...", "info", 100);
		await addTerminalLine("🛡️ Creating secure session...", "info", 200);

		try {
			let result;

			if (state.mode === "signin") {
				result = await signInWithEmail(state.email, password);
			} else if (state.mode === "signup") {
				// Extract name from email
				const name = state.email.split("@")[0];
				result = await signUpWithEmail(state.email, password, name);
			} else {
				// Reset mode (send password reset email)
				result = await sendMagicLink(state.email);
			}

			if (!result.success) {
				await addTerminalLine("❌ Authentication failed", "error", 50);
				setState((prev) => ({
					...prev,
					stage: "error",
					error: result.error || "Authentication failed",
				}));
				announce(`Error: ${result.error || "Authentication failed"}`, true);
				return;
			}

			await addTerminalLine("✅ Authentication successful", "success", 50);
			await addTerminalLine("🎉 Protection activated", "success", 300);

			setState((prev) => ({ ...prev, stage: "success" }));
			announce(
				"Success! Authentication complete. Redirecting to dashboard.",
				true,
			);

			// Redirect after success
			setTimeout(() => {
				router.push("/dashboard");
				router.refresh();
			}, 1500);
		} catch (error) {
			await addTerminalLine("❌ System error", "error", 50);
			setState((prev) => ({
				...prev,
				stage: "error",
				error: error instanceof Error ? error.message : "System error occurred",
			}));
			announce("Error: System error occurred. Please try again.", true);
		}
	};

	/**
	 * Reset to initial state
	 */
	const handleReset = () => {
		setState({
			stage: "idle",
			provider: null,
			mode: "signin",
			email: "",
			error: null,
		});
		setPassword("");
		setTerminalLines([]);
		setPasswordStrength(null);
		announce("Login form reset.");
	};

	return (
		<div className="h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
			{/* ARIA Live Regions */}
			<div
				ref={politeAnnouncerRef}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
			<div
				ref={assertiveAnnouncerRef}
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			/>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
				className="w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col"
			>
				{/* Protection Snapshot Header */}
				<div className="mb-4 text-center flex-shrink-0">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{
							delay: prefersReducedMotion ? 0 : 0.2,
							type: "spring",
							stiffness: 200,
						}}
						className="inline-block mb-3"
					>
						<Shield className="w-12 h-12 text-green-500" />
					</motion.div>
					<h1 className="text-2xl font-bold text-white mb-1">
						Protection Snapshot
					</h1>
					<p className="text-sm text-gray-400">
						{state.mode === "signin" && "Verify your identity to continue"}
						{state.mode === "signup" && "Create your protected account"}
						{state.mode === "reset" && "Reset your account password"}
					</p>
				</div>

				{/* Main Card */}
				<div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 shadow-2xl overflow-y-auto flex-1 min-h-0">
					<AnimatePresence mode="wait">
						{/* Idle Stage - Provider Selection */}
						{state.stage === "idle" && (
							<motion.div
								key="idle"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="space-y-4"
							>
								<form onSubmit={handleEmailSubmit} className="space-y-4">
									<div>
										<label
											htmlFor="email"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Email Address
										</label>
										<Input
											id="email"
											type="email"
											value={state.email}
											onChange={(e) =>
												setState((prev) => ({ ...prev, email: e.target.value }))
											}
											placeholder="you@example.com"
											className="w-full bg-gray-800 border-gray-700 text-white"
											autoFocus
											required
										/>
									</div>

									<div className="flex gap-2">
										<Button
											type="submit"
											onClick={() =>
												setState((prev) => ({ ...prev, provider: "password" }))
											}
											className="flex-1 bg-green-600 hover:bg-green-700"
										>
											<Key className="w-4 h-4 mr-2" />
											Continue with Password
										</Button>
										<Button
											type="submit"
											onClick={() =>
												setState((prev) => ({ ...prev, provider: "email" }))
											}
											variant="outline"
											className="flex-1"
										>
											<Mail className="w-4 h-4 mr-2" />
											Magic Link
										</Button>
									</div>
								</form>

								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-gray-700" />
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="px-2 bg-gray-900/50 text-gray-400">
											Or continue with
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<Button
										type="button"
										onClick={() => handleOAuthRedirect("github")}
										variant="outline"
										className="w-full"
									>
										<svg
											className="w-4 h-4 mr-2"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
										</svg>
										GitHub
									</Button>
									<Button
										type="button"
										onClick={() => handleOAuthRedirect("google")}
										variant="outline"
										className="w-full"
									>
										<svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
											<path
												fill="currentColor"
												d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											/>
											<path
												fill="currentColor"
												d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											/>
											<path
												fill="currentColor"
												d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
											/>
											<path
												fill="currentColor"
												d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											/>
										</svg>
										Google
									</Button>
								</div>

								<div className="text-center text-sm text-gray-400">
									{state.mode === "signin" ? (
										<>
											Don't have an account?{" "}
											<button
												type="button"
												onClick={() =>
													setState((prev) => ({ ...prev, mode: "signup" }))
												}
												className="text-green-500 hover:text-green-400"
											>
												Create one
											</button>
										</>
									) : (
										<>
											Already have an account?{" "}
											<button
												type="button"
												onClick={() =>
													setState((prev) => ({ ...prev, mode: "signin" }))
												}
												className="text-green-500 hover:text-green-400"
											>
												Sign in
											</button>
										</>
									)}
								</div>
							</motion.div>
						)}

						{/* Password Input Stage */}
						{state.stage === "password-input" && (
							<motion.div
								key="password"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								className="space-y-4"
							>
								<div className="mb-4">
									<div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
										<CheckCircle2 className="w-4 h-4 text-green-500" />
										<span>{state.email}</span>
									</div>
								</div>

								<form onSubmit={handlePasswordSubmit} className="space-y-4">
									<div>
										<label
											htmlFor="password"
											className="block text-sm font-medium text-gray-300 mb-2"
										>
											Password
										</label>
										<div className="relative">
											<Input
												id="password"
												type={showPassword ? "text" : "password"}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												placeholder="Enter your password"
												className="w-full bg-gray-800 border-gray-700 text-white pr-10"
												autoFocus
												required
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
											>
												{showPassword ? (
													<EyeOff className="w-4 h-4" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
										</div>

										{/* Password Strength Indicator (for signup) */}
										{state.mode === "signup" && password && (
											<div className="mt-2">
												<div className="flex gap-1 mb-1">
													<div
														className={`h-1 flex-1 rounded ${passwordStrength === "weak" ? "bg-red-500" : passwordStrength ? "bg-gray-700" : "bg-gray-800"}`}
													/>
													<div
														className={`h-1 flex-1 rounded ${passwordStrength === "medium" || passwordStrength === "strong" ? "bg-yellow-500" : "bg-gray-800"}`}
													/>
													<div
														className={`h-1 flex-1 rounded ${passwordStrength === "strong" ? "bg-green-500" : "bg-gray-800"}`}
													/>
												</div>
												<p className="text-xs text-gray-400">
													Strength: {passwordStrength || "Too weak"}
												</p>
											</div>
										)}

										{/* Password Requirements (for signup) */}
										{state.mode === "signup" && (
											<div className="mt-2 text-xs text-gray-400 space-y-1">
												<p className="font-medium">Password must contain:</p>
												<ul className="list-disc list-inside space-y-1">
													{getPasswordRequirements().map((req, i) => (
														<li key={i}>{req}</li>
													))}
												</ul>
											</div>
										)}
									</div>

									{state.error && (
										<div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
											<AlertCircle className="w-4 h-4" />
											<span>{state.error}</span>
										</div>
									)}

									<div className="flex gap-2">
										<Button
											type="button"
											onClick={handleReset}
											variant="outline"
											className="flex-1"
										>
											Back
										</Button>
										<Button
											type="submit"
											className="flex-1 bg-green-600 hover:bg-green-700"
										>
											{state.mode === "signin" && "Sign In"}
											{state.mode === "signup" && "Create Account"}
											{state.mode === "reset" && "Reset Password"}
											<ArrowRight className="w-4 h-4 ml-2" />
										</Button>
									</div>
								</form>

								{state.mode === "signin" && (
									<div className="text-center">
										<button
											type="button"
											onClick={() =>
												setState((prev) => ({ ...prev, mode: "reset" }))
											}
											className="text-sm text-gray-400 hover:text-gray-300"
										>
											Forgot password?
										</button>
									</div>
								)}
							</motion.div>
						)}

						{/* Processing Stage */}
						{state.stage === "processing" && (
							<motion.div
								key="processing"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="space-y-4"
							>
								<div className="flex items-center justify-center py-6">
									<Loader2 className="w-8 h-8 text-green-500 animate-spin" />
								</div>

								{/* Terminal Output */}
								<div className="bg-black/50 rounded p-3 font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
									{terminalLines.map((line, index) => (
										<motion.div
											key={line.id}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												delay: prefersReducedMotion ? 0 : index * 0.1,
											}}
											className={`
                        ${line.type === "success" && "text-green-400"}
                        ${line.type === "error" && "text-red-400"}
                        ${line.type === "warning" && "text-yellow-400"}
                        ${line.type === "info" && "text-gray-400"}
                      `}
										>
											{line.text}
										</motion.div>
									))}
								</div>
							</motion.div>
						)}

						{/* Success Stage */}
						{state.stage === "success" && (
							<motion.div
								key="success"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								className="text-center py-6"
							>
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 200 }}
									className="inline-block mb-3"
								>
									<CheckCircle2 className="w-12 h-12 text-green-500" />
								</motion.div>
								<h2 className="text-xl font-bold text-white mb-2">
									Authentication Successful
								</h2>
								<p className="text-sm text-gray-400">
									Protection activated. Redirecting to dashboard...
								</p>
							</motion.div>
						)}

						{/* Magic Link Sent */}
						{state.stage === "magic-link-sent" && (
							<motion.div
								key="magic-link"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								className="text-center py-6"
							>
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 200 }}
									className="inline-block mb-3"
								>
									<Mail className="w-12 h-12 text-blue-500" />
								</motion.div>
								<h2 className="text-xl font-bold text-white mb-2">
									Check Your Email
								</h2>
								<p className="text-sm text-gray-400 mb-4">
									We've sent a magic link to <strong>{state.email}</strong>
								</p>
								<Button
									type="button"
									onClick={handleReset}
									variant="outline"
									className="mx-auto"
								>
									Back to Login
								</Button>
							</motion.div>
						)}

						{/* Error Stage */}
						{state.stage === "error" && (
							<motion.div
								key="error"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="space-y-4"
							>
								<div className="flex items-center justify-center py-3">
									<XCircle className="w-12 h-12 text-red-500" />
								</div>
								<div className="text-center">
									<h2 className="text-lg font-bold text-white mb-2">
										Authentication Failed
									</h2>
									{state.error && (
										<p className="text-sm text-red-400 mb-4">{state.error}</p>
									)}
								</div>
								<Button type="button" onClick={handleReset} className="w-full">
									Try Again
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Footer */}
				<div className="mt-3 text-center text-xs text-gray-500 flex-shrink-0">
					<p>Protected by SnapBack Security</p>
				</div>
			</motion.div>
		</div>
	);
}
