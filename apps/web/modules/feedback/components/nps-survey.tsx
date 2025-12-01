"use client";

import { useEffect, useState } from "react";
import { captureAnalyticsEvent } from "@/modules/analytics/client";
import { Button } from "@/modules/ui/components/button";

interface NPSSurveyProps {
	userId: string;
	onDismiss?: () => void;
}

export function NPSSurvey({ userId, onDismiss }: NPSSurveyProps) {
	const [score, setScore] = useState<number | null>(null);
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	useEffect(() => {
		// Track survey shown
		captureAnalyticsEvent({
			name: "nps_survey_shown",
			properties: {},
		});
	}, []);

	const handleScoreClick = (value: number) => {
		setScore(value);
		captureAnalyticsEvent({
			name: "nps_score_selected",
			properties: { score: value },
		});
	};

	const handleSubmit = async () => {
		if (score === null) return;

		setIsSubmitting(true);

		try {
			// Track NPS response
			captureAnalyticsEvent({
				name: "nps_survey_submitted",
				properties: {
					score,
					has_reason: !!reason,
				},
			});

			// Submit to API
			await fetch("/api/feedback/nps", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					score,
					reason: reason || undefined,
					timestamp: Date.now(),
				}),
			});

			setSubmitted(true);
			setTimeout(() => {
				onDismiss?.();
			}, 2000);
		} catch (error) {
			console.error("Failed to submit NPS:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDismiss = (action: "later" | "never") => {
		captureAnalyticsEvent({
			name: "nps_survey_dismissed",
			properties: { action },
		});

		// Store dismissal preference
		if (action === "never") {
			localStorage.setItem("snapback_nps_never", "true");
		} else {
			// Ask again in 7 days
			const nextAsk = Date.now() + 7 * 24 * 60 * 60 * 1000;
			localStorage.setItem("snapback_nps_next", nextAsk.toString());
		}

		onDismiss?.();
	};

	if (submitted) {
		return (
			<div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-96 max-w-[calc(100vw-3rem)]">
				<div className="text-center">
					<div className="text-4xl mb-3">🙏</div>
					<p className="text-emerald-400 font-medium">
						Thank you for your feedback!
					</p>
					<p className="text-slate-400 text-sm mt-1">
						Your input helps us improve SnapBack.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-96 max-w-[calc(100vw-3rem)]">
			{/* Header */}
			<div className="mb-4">
				<h3 className="font-semibold text-white mb-1">
					How likely are you to recommend SnapBack?
				</h3>
				<p className="text-sm text-slate-400">On a scale of 0 to 10</p>
			</div>

			{/* Score selector */}
			<div className="mb-4">
				<div className="flex justify-between gap-1 mb-2">
					{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
						<button
							key={value}
							onClick={() => handleScoreClick(value)}
							className={`flex-1 aspect-square flex items-center justify-center rounded border-2 transition-all ${
								score === value
									? "border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold"
									: "border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-700"
							}`}
						>
							{value}
						</button>
					))}
				</div>
				<div className="flex justify-between text-xs text-slate-500">
					<span>Not likely</span>
					<span>Very likely</span>
				</div>
			</div>

			{/* Reason (shown after score selected) */}
			{score !== null && (
				<div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
					<label className="block text-sm font-medium text-slate-300 mb-2">
						What's the main reason for your score? (optional)
					</label>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Tell us more..."
						rows={3}
						className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
					/>
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-2">
				{score !== null ? (
					<>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
						>
							{isSubmitting ? "Submitting..." : "Submit"}
						</Button>
						<Button onClick={() => setScore(null)} variant="outline">
							Back
						</Button>
					</>
				) : (
					<>
						<Button
							onClick={() => handleDismiss("later")}
							variant="outline"
							className="flex-1"
						>
							Ask me later
						</Button>
						<Button
							onClick={() => handleDismiss("never")}
							variant="ghost"
							className="text-slate-500 hover:text-slate-400"
						>
							Don't ask again
						</Button>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * Hook to determine if NPS survey should be shown
 */
export function useNPSSurveyTrigger(
	userId: string | null,
	snapshotCount: number,
): boolean {
	const [shouldShow, setShouldShow] = useState(false);

	useEffect(() => {
		if (!userId) {
			setShouldShow(false);
			return;
		}

		// Check if user opted out
		const neverAsk = localStorage.getItem("snapback_nps_never");
		if (neverAsk === "true") {
			setShouldShow(false);
			return;
		}

		// Check cooldown period
		const nextAsk = localStorage.getItem("snapback_nps_next");
		if (nextAsk && Date.now() < Number.parseInt(nextAsk, 10)) {
			setShouldShow(false);
			return;
		}

		// Check if user has been active enough (≥3 snapshots)
		if (snapshotCount < 3) {
			setShouldShow(false);
			return;
		}

		// Check account age (7+ days)
		// This would need to come from user data
		// For now, assume eligible if has snapshots

		setShouldShow(true);
	}, [userId, snapshotCount]);

	return shouldShow;
}
