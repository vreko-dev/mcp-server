import { logger } from "@snapback/infrastructure";

("use client");

import { Button } from "@ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { useEffect, useState } from "react";

// Add tracking function
const trackEvent = (event: string, category: string, label: string) => {
	logger.debug("Analytics event:", { event, category, label });
	// In a real implementation, this would connect to your analytics service
};

export function ExitIntentModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [hasShown, setHasShown] = useState(false);

	useEffect(() => {
		const handleMouseLeave = (e: MouseEvent) => {
			if (e.clientY <= 0 && !hasShown) {
				setIsOpen(true);
				setHasShown(true);
				trackEvent("exit_intent_shown", "engagement", "modal_display");
			}
		};

		document.addEventListener("mouseleave", handleMouseLeave);
		return () => document.removeEventListener("mouseleave", handleMouseLeave);
	}, [hasShown]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Wait! Your code isn't protected yet 🛡️</DialogTitle>
				</DialogHeader>
				<p>Visual protection for every file. AI-aware checkpoints. Instant recovery.</p>
				<div className="space-y-2 mt-4">
					<Input type="email" placeholder="Enter your email for exclusive early access" className="w-full" />
					<Button
						className="w-full bg-green-600 hover:bg-green-700"
						onClick={() => {
							// Submit to HubSpot
							trackEvent("email_submitted", "conversion", "exit_intent_modal");
							setIsOpen(false);
						}}
					>
						Get 50% Off Launch Week Pricing
					</Button>
				</div>
				<p className="text-xs text-gray-500 mt-2">No spam. Unsubscribe anytime.</p>
			</DialogContent>
		</Dialog>
	);
}
