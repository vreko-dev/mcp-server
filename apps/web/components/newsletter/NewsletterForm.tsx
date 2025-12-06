"use client";

import { useState } from "react";

interface NewsletterFormProps {
	variant?: "default" | "compact";
	onSuccess?: () => void;
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function NewsletterForm({ variant = "default", onSuccess }: NewsletterFormProps) {
	const [email, setEmail] = useState("");
	const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage("");

		// Validation
		if (!email.trim()) {
			setErrorMessage("Please enter your email");
			return;
		}

		if (!isValidEmail(email)) {
			setErrorMessage("Please enter a valid email");
			return;
		}

		setFormState("loading");

		try {
			// Replace with your actual API endpoint
			const response = await fetch("/api/newsletter/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				throw new Error("Failed to subscribe");
			}

			setFormState("success");
			setEmail("");
			onSuccess?.();

			// Reset to idle after 5 seconds
			setTimeout(() => {
				setFormState("idle");
			}, 5000);
		} catch (_err) {
			setFormState("error");
			setErrorMessage("Something went wrong. Please try again.");
		}
	};

	if (variant === "compact") {
		return (
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<div className="flex gap-2">
					<input
						type="email"
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={formState === "loading"}
						aria-invalid={!!errorMessage}
						aria-describedby={errorMessage ? "email-error" : undefined}
						className={`
              flex-1 px-3 py-2 rounded-lg border text-sm
              bg-[#0A0A0A] text-[#FAFAFA]
              placeholder-[#71717A]
              transition-all duration-200
              ${
					errorMessage
						? "border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
						: "border-[#262626] focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
				}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
					/>
					<button
						type="submit"
						disabled={formState === "loading"}
						className={`
              px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200
              ${
					formState === "success"
						? "bg-[#10B981] text-black"
						: formState === "error"
							? "bg-[#EF4444] text-white"
							: "bg-[#10B981] text-black hover:bg-[#34D399]"
				}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
					>
						{formState === "loading" && "..."}
						{formState === "success" && "✓"}
						{formState === "error" && "✗"}
						{formState === "idle" && "Subscribe"}
					</button>
				</div>
				{errorMessage && (
					<p id="email-error" className="text-xs text-[#EF4444]">
						{errorMessage}
					</p>
				)}
			</form>
		);
	}

	// Default variant
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-semibold text-white mb-2">Stay Updated</h3>
				<p className="text-sm text-[#A0A0A0]">
					No spam. Just monthly build updates and early access announcements.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-3">
				<div>
					<input
						type="email"
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={formState === "loading"}
						aria-invalid={!!errorMessage}
						aria-describedby={errorMessage ? "email-error" : undefined}
						className={`
              w-full px-4 py-3 rounded-lg border
              bg-[#0A0A0A] text-[#FAFAFA]
              placeholder-[#71717A]
              transition-all duration-200
              ${
					errorMessage
						? "border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]"
						: "border-[#262626] focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]"
				}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
					/>
					{errorMessage && (
						<p id="email-error" className="text-xs text-[#EF4444] mt-1">
							{errorMessage}
						</p>
					)}
				</div>

				<button
					type="submit"
					disabled={formState === "loading"}
					className={`
            w-full px-4 py-3 rounded-lg font-medium
            transition-all duration-200
            ${
				formState === "success"
					? "bg-[#10B981] text-black"
					: formState === "error"
						? "bg-[#EF4444] text-white"
						: "bg-[#10B981] text-black hover:bg-[#34D399]"
			}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
				>
					{formState === "loading" && "Subscribing..."}
					{formState === "success" && "✓ Successfully subscribed!"}
					{formState === "error" && "✗ Something went wrong"}
					{formState === "idle" && "Subscribe"}
				</button>

				{formState === "success" && (
					<p className="text-sm text-[#10B981] text-center">Check your inbox to confirm your subscription.</p>
				)}
			</form>

			<p className="text-xs text-[#71717A] text-center">No spam. Unsubscribe anytime.</p>
		</div>
	);
}
