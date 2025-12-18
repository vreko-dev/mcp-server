"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useAnalytics } from "@/modules/analytics/provider/posthog";

interface PioneerEmailModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (email: string) => Promise<void>;
	defaultEmail?: string;
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function PioneerEmailModal({ isOpen, onClose, onSubmit, defaultEmail = "" }: PioneerEmailModalProps) {
	const { trackEvent } = useAnalytics();
	const [email, setEmail] = useState(defaultEmail);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!email.trim()) {
			setError("Please enter your email");
			return;
		}

		if (!isValidEmail(email)) {
			setError("Please enter a valid email address");
			return;
		}

		setLoading(true);

		try {
			await onSubmit(email);
			trackEvent("pioneer_email_captured", { source: "modal" });
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save email");
		} finally {
			setLoading(false);
		}
	};

	const handleSkip = () => {
		trackEvent("pioneer_email_skipped", { source: "modal" });
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5 text-primary" />
						Stay in the Loop
					</DialogTitle>
					<DialogDescription>
						Your GitHub email might not be your primary inbox. Share your preferred email so you never miss
						tier upgrades, rewards, or exclusive Pioneer updates.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="pioneer-email">Preferred Email</Label>
						<Input
							id="pioneer-email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading}
							className={error ? "border-destructive" : ""}
							autoFocus
						/>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>

					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={handleSkip}
							disabled={loading}
							className="w-full sm:w-auto"
						>
							Skip for now
						</Button>
						<Button type="submit" disabled={loading} className="w-full sm:w-auto">
							{loading ? "Saving..." : "Save Email"}
						</Button>
					</DialogFooter>
				</form>

				<p className="text-xs text-muted-foreground text-center">
					We only use this for Pioneer program updates. No spam, ever.
				</p>
			</DialogContent>
		</Dialog>
	);
}
