"use client";

import { QueueTasksPreview } from "@marketing/components/ui/queue-tasks-preview";
import { TrustSignals } from "@marketing/components/ui/trust-signals";
import { Turnstile } from "@marsidev/react-turnstile";
import { useSession } from "@saas/auth/hooks/use-session";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/select";
import { ArrowRight, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fadeInUp } from "@/lib/animations";
import { useAnalytics } from "@/modules/analytics/provider/posthog";
import { ReferralFlow } from "./ReferralFlow";

type FormData = {
	email: string;
	githubUsername: string;
	editor: string;
	language: string;
	teamSize: string;
};

const INITIAL_FORM_DATA: FormData = {
	email: "",
	githubUsername: "",
	editor: "",
	language: "",
	teamSize: "",
};

const EDITOR_OPTIONS = ["VS Code", "Cursor", "Windsurf", "JetBrains IDEs", "Neovim", "Other"];

const LANGUAGE_OPTIONS = ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Other"];

const TEAM_SIZE_OPTIONS = ["Solo", "2-5", "6-20", "21-50", "51+"];

export function WaitlistFlow() {
	const { trackEvent } = useAnalytics();
	const { user } = useSession();
	const router = useRouter();
	const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [_queuePosition, setQueuePosition] = useState<number | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string>("");

	const [referralCode, setReferralCode] = useState<string>("");

	// Restore form data from localStorage if available (e.g. after login redirect)
	useEffect(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("waitlist_form_data");
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					setFormData(parsed);
					// Optional: Clear it after restoring? Or keep until success?
					// Keeping it until success is safer in case of errors.
				} catch (_e) {
					// Ignore invalid JSON
					localStorage.removeItem("waitlist_form_data");
				}
			}
		}
	}, []);

	// Clear storage on successful submission
	useEffect(() => {
		if (submitted && typeof window !== "undefined") {
			localStorage.removeItem("waitlist_form_data");
		}
	}, [submitted]);

	const handleChange = (field: keyof FormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Auth Gating: Redirect if not logged in
		if (!user) {
			if (typeof window !== "undefined") {
				localStorage.setItem("waitlist_form_data", JSON.stringify(formData));
			}
			router.push("/auth/login?redirect=/waitlist");
			return;
		}

		if (!turnstileToken) {
			alert("Please complete the security verification");
			return;
		}

		setLoading(true);

		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...formData,
					turnstileToken,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to join waitlist");
			}

			const data = await response.json();
			setQueuePosition(data.queuePosition);
			setReferralCode(data.referralCode);
			setSubmitted(true);

			// Track with PostHog (client-side UI interaction only)
			trackEvent("waitlist_form_submitted", {
				editor: formData.editor,
				language: formData.language,
				teamSize: formData.teamSize,
			});
		} catch (error) {
			console.error("Error joining waitlist:", error);
			alert(error instanceof Error ? error.message : "Failed to join waitlist. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto">
			<AnimatePresence mode="wait">
				{!submitted ? (
					<motion.div
						key="form-container"
						variants={fadeInUp as any}
						initial="initial"
						animate="animate"
						exit="exit"
						className="space-y-8"
					>
						<motion.form
							onSubmit={handleSubmit}
							className="space-y-8 rounded-lg border border-snapback-border bg-black/50 backdrop-blur-sm shadow-lg shadow-[#34D399]/5 p-8"
						>
							{/* Contact Information Section */}
							<div className="space-y-4">
								{/* Email */}
								<div className="space-y-2">
									<Label htmlFor="email">Email *</Label>
									<Input
										id="email"
										type="email"
										required
										value={formData.email}
										onChange={(e) => handleChange("email", e.target.value)}
										placeholder="your@email.com"
										className="bg-snapback-bg-primary border-snapback-border focus:border-[#34D399] transition-colors"
									/>
								</div>

								{/* GitHub Username */}
								<div className="space-y-2">
									<Label htmlFor="github">GitHub Username (Optional)</Label>
									<Input
										id="github"
										type="text"
										value={formData.githubUsername}
										onChange={(e) => handleChange("githubUsername", e.target.value)}
										placeholder="octocat"
										className="bg-snapback-bg-primary border-snapback-border focus:border-[#34D399] transition-colors"
									/>
								</div>
							</div>

							{/* Preferences Section */}
							<div className="space-y-4 pt-4 border-t border-snapback-border/50">
								{/* Editor */}
								<div className="space-y-2">
									<Label htmlFor="editor">Primary Editor *</Label>
									<Select
										value={formData.editor}
										onValueChange={(value) => handleChange("editor", value)}
										required
									>
										<SelectTrigger
											id="editor"
											className="bg-snapback-bg-primary border-snapback-border"
										>
											<SelectValue placeholder="Select your editor" />
										</SelectTrigger>
										<SelectContent>
											{EDITOR_OPTIONS.map((editor) => (
												<SelectItem key={editor} value={editor}>
													{editor}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Language */}
								<div className="space-y-2">
									<Label htmlFor="language">Primary Language *</Label>
									<Select
										value={formData.language}
										onValueChange={(value) => handleChange("language", value)}
										required
									>
										<SelectTrigger
											id="language"
											className="bg-snapback-bg-primary border-snapback-border"
										>
											<SelectValue placeholder="Select your language" />
										</SelectTrigger>
										<SelectContent>
											{LANGUAGE_OPTIONS.map((lang) => (
												<SelectItem key={lang} value={lang}>
													{lang}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Team Size */}
								<div className="space-y-2">
									<Label htmlFor="teamSize">Team Size *</Label>
									<Select
										value={formData.teamSize}
										onValueChange={(value) => handleChange("teamSize", value)}
										required
									>
										<SelectTrigger
											id="teamSize"
											className="bg-snapback-bg-primary border-snapback-border"
										>
											<SelectValue placeholder="Select team size" />
										</SelectTrigger>
										<SelectContent>
											{TEAM_SIZE_OPTIONS.map((size) => (
												<SelectItem key={size} value={size}>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Turnstile Security Verification */}
							{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
								<div className="space-y-2 pt-4 border-t border-snapback-border/50">
									<div className="flex items-center gap-2 text-sm text-snapback-text-secondary mb-3">
										<Shield className="w-4 h-4 text-[#34D399]" />
										<span>Security Verification</span>
									</div>
									<div className="flex justify-center">
										<Turnstile
											siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
											onSuccess={setTurnstileToken}
											onError={() => setTurnstileToken("")}
											onExpire={() => setTurnstileToken("")}
											options={{
												theme: "dark",
												size: "normal",
											}}
										/>
									</div>
								</div>
							)}

							{/* Submit Button */}
							<div className="space-y-4 pt-4">
								<Button
									type="submit"
									disabled={loading || !turnstileToken}
									className="w-full bg-[#34D399] hover:bg-[#34D399]/90 text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? (
										"Submitting..."
									) : (
										<span className="flex items-center justify-center gap-2">
											Request Alpha Access
											<ArrowRight className="w-4 h-4" />
										</span>
									)}
								</Button>

								{/* Trust Signals */}
								<TrustSignals />
							</div>
						</motion.form>

						{/* Queue Tasks Preview */}
						<QueueTasksPreview />
					</motion.div>
				) : (
					<ReferralFlow referralCode={referralCode} />
				)}
			</AnimatePresence>
		</div>
	);
}
