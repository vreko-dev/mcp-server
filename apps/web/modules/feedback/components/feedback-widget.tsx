"use client";

import { useState } from "react";
import { captureAnalyticsEvent } from "@/modules/analytics/client";
import { Button } from "@/modules/ui/components/button";

interface FeedbackWidgetProps {
	position?: "bottom-right" | "bottom-left";
}

export function FeedbackWidget({ position = "bottom-right" }: FeedbackWidgetProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [category, setCategory] = useState<"bug" | "feature" | "question" | "other">("bug");
	const [message, setMessage] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!message.trim() || message.length > 1000) {
			return;
		}

		setIsSubmitting(true);

		try {
			// Track feedback submission
			captureAnalyticsEvent({
				name: "feedback_submitted",
				properties: {
					category,
					message_length: message.length,
					has_email: !!email,
				},
			});

			// Submit to API
			const response = await fetch("/api/feedback/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category,
					message,
					email: email || undefined,
					timestamp: Date.now(),
					userAgent: navigator.userAgent,
					url: window.location.href,
				}),
			});

			if (response.ok) {
				setSubmitted(true);
				setTimeout(() => {
					setIsOpen(false);
					setSubmitted(false);
					setMessage("");
					setEmail("");
				}, 2000);
			}
		} catch (error) {
			console.error("Failed to submit feedback:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const positionClass = position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6";

	return (
		<div className={`fixed ${positionClass} z-50`}>
			{/* Floating button */}
			{!isOpen && (
				<button
					onClick={() => {
						setIsOpen(true);
						captureAnalyticsEvent({
							name: "feedback_widget_opened",
							properties: {},
						});
					}}
					className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
					aria-label="Send Feedback"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				</button>
			)}

			{/* Feedback form */}
			{isOpen && (
				<div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-96 max-w-[calc(100vw-3rem)]">
					<div className="p-4 border-b border-slate-700 flex items-center justify-between">
						<h3 className="font-semibold text-white">Send Feedback</h3>
						<button
							onClick={() => setIsOpen(false)}
							className="text-slate-400 hover:text-white"
							aria-label="Close"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					</div>

					{submitted ? (
						<div className="p-6 text-center">
							<div className="text-4xl mb-3">✅</div>
							<p className="text-emerald-400 font-medium">Thank you!</p>
							<p className="text-slate-400 text-sm mt-1">Your feedback has been received.</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="p-4 space-y-4">
							{/* Category */}
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
								<select
									value={category}
									onChange={(e) => setCategory(e.target.value as any)}
									className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
								>
									<option value="bug">Bug Report</option>
									<option value="feature">Feature Request</option>
									<option value="question">Question</option>
									<option value="other">Other</option>
								</select>
							</div>

							{/* Message */}
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">Message *</label>
								<textarea
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									placeholder="Tell us what's on your mind..."
									required
									maxLength={1000}
									rows={4}
									className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
								/>
								<p className="text-xs text-slate-500 mt-1">{message.length}/1000 characters</p>
							</div>

							{/* Email (optional) */}
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">
									Email (optional)
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your@email.com"
									className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
								/>
							</div>

							{/* Submit button */}
							<div className="flex gap-2">
								<Button
									type="submit"
									disabled={isSubmitting || !message.trim()}
									className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting ? "Sending..." : "Send Feedback"}
								</Button>
								<Button type="button" onClick={() => setIsOpen(false)} variant="outline">
									Cancel
								</Button>
							</div>
						</form>
					)}
				</div>
			)}
		</div>
	);
}
