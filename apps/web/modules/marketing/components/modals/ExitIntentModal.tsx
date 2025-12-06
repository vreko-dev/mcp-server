"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { modalBackdrop, modalContent } from "@/lib/animations";
import { snapbackColors } from "@/lib/design-system";

export function ExitIntentModal() {
	const [show, setShow] = useState(false);
	const [hasShown, setHasShown] = useState(false);
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Check if previously dismissed
		const isDismissed = localStorage.getItem("exit-intent-dismissed");
		if (isDismissed) {
			return;
		}

		// Check if user has already installed or submitted email
		const hasInstalled = localStorage.getItem("snapback-installed");
		const hasSubmittedEmail = localStorage.getItem("email-submitted");
		if (hasInstalled || hasSubmittedEmail) {
			return;
		}

		const handleMouseLeave = (e: MouseEvent) => {
			// Only trigger if mouse is leaving from the top
			if (e.clientY <= 0 && !hasShown && !show) {
				setShow(true);
				setHasShown(true);

				// Track with PostHog
				if (typeof window !== "undefined" && (window as any).posthog) {
					const timeOnPage = Math.floor((Date.now() - pageLoadTime) / 1000);
					const scrollDepth = Math.floor((window.scrollY / document.body.scrollHeight) * 100);

					(window as any).posthog.capture("exit_intent_shown", {
						time_on_page: timeOnPage,
						scroll_depth: scrollDepth,
					});
				}
			}
		};

		const pageLoadTime = Date.now();
		document.addEventListener("mouseleave", handleMouseLeave);
		return () => document.removeEventListener("mouseleave", handleMouseLeave);
	}, [hasShown, show]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				throw new Error("Failed to submit email");
			}

			setSubmitted(true);
			localStorage.setItem("email-submitted", "true");

			// Track with PostHog
			if (typeof window !== "undefined" && (window as any).posthog) {
				const timeToConvert = Math.floor((Date.now() - (window as any).pageLoadTime) / 1000);

				(window as any).posthog.capture("email_submit", {
					source: "exit_intent",
					time_to_convert: timeToConvert,
					email,
				});
			}

			setTimeout(() => {
				setShow(false);
				localStorage.setItem("exit-intent-dismissed", "true");
			}, 2000);
		} catch (error) {
			console.error("Error submitting email:", error);
			alert("Failed to submit email. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleDismiss = () => {
		setShow(false);
		localStorage.setItem("exit-intent-dismissed", "true");

		// Track with PostHog
		if (typeof window !== "undefined" && (window as any).posthog) {
			(window as any).posthog.capture("exit_intent_dismissed");
		}
	};

	return (
		<AnimatePresence>
			{show && (
				<>
					{/* Backdrop */}
					<motion.div
						variants={modalBackdrop}
						initial="initial"
						animate="animate"
						exit="exit"
						onClick={handleDismiss}
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
					/>

					{/* Modal */}
					<motion.div
						variants={modalContent as any}
						initial="initial"
						animate="animate"
						exit="exit"
						className="fixed inset-0 flex items-center justify-center z-50 p-4"
					>
						<div className="bg-snapback-bg-secondary border border-snapback-border-strong rounded-lg p-8 max-w-md w-full relative">
							{/* Close button */}
							<button
								onClick={handleDismiss}
								className="absolute top-4 right-4 text-snapback-text-secondary hover:text-snapback-text-primary transition-colors"
								aria-label="Close"
							>
								<X className="w-5 h-5" />
							</button>

							{!submitted ? (
								<>
									<h3 className="text-2xl font-bold mb-2 text-snapback-text-primary">
										Wait! Before you go...
									</h3>
									<p className="text-snapback-text-secondary mb-6">
										Get notified when we launch AI detection and cloud backup. Plus, early access to
										Pro features.
									</p>

									<form onSubmit={handleSubmit} className="space-y-4">
										<Input
											type="email"
											placeholder="your@email.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
											className="bg-snapback-bg-primary border-snapback-border"
										/>
										<Button
											type="submit"
											disabled={loading}
											className="w-full"
											style={{ backgroundColor: snapbackColors.green.DEFAULT }}
										>
											{loading ? "Submitting..." : "Keep Me Posted"}
										</Button>
									</form>

									<p className="text-xs text-snapback-text-tertiary mt-4 text-center">
										No spam. Unsubscribe anytime.
									</p>
								</>
							) : (
								<div className="text-center py-4">
									<div className="text-4xl mb-2" style={{ color: snapbackColors.green.DEFAULT }}>
										✓
									</div>
									<p className="text-lg font-semibold text-snapback-text-primary">
										You're on the list!
									</p>
									<p className="text-snapback-text-secondary text-sm mt-2">
										Check your email for confirmation.
									</p>
								</div>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
