"use client";

import { AnalyticsEvents, trackEvent } from "@analytics";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Check, Copy, Twitter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	linesRecovered: number;
}

export function ShareDialog({
	open,
	onOpenChange,
	linesRecovered,
}: ShareDialogProps) {
	const [copied, setCopied] = useState(false);

	const shareText = `Just recovered ${linesRecovered} lines of code with @SnapBackDev. \n\nIf you're using AI coding tools, you need this foundation. 🛡️\n\n#VSCode #AI #Coding`;

	// In a real app, this would be a dynamic link to the OG image page associated with a specific recovery ID
	// For now, we'll link to the homepage
	const shareUrl = "https://snapback.dev";

	const handleCopy = () => {
		navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
		setCopied(true);
		toast.success("Copied to clipboard");

		// Track share
		trackEvent(AnalyticsEvents.SAVE_STORY_SHARED, {
			lines_recovered: linesRecovered,
			method: "copy",
		});

		setTimeout(() => setCopied(false), 2000);
	};

	const handleTwitterShare = () => {
		const twitterUrl = new URL("https://twitter.com/intent/tweet");
		twitterUrl.searchParams.set("text", shareText);
		twitterUrl.searchParams.set("url", shareUrl);

		// Track share
		trackEvent(AnalyticsEvents.SAVE_STORY_SHARED, {
			lines_recovered: linesRecovered,
			method: "twitter",
		});

		window.open(twitterUrl.toString(), "_blank");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share your save</DialogTitle>
					<DialogDescription>
						Celebrate your recovery and let others know about SnapBack.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground italic">
						"{shareText}"
					</div>
				</div>

				<DialogFooter className="flex-col sm:justify-start gap-2">
					<Button
						variant="primary"
						className="w-full sm:w-auto"
						onClick={handleTwitterShare}
					>
						<Twitter className="mr-2 h-4 w-4" />
						Share on Twitter
					</Button>
					<Button
						variant="outline"
						className="w-full sm:w-auto"
						onClick={handleCopy}
					>
						{copied ? (
							<Check className="mr-2 h-4 w-4" />
						) : (
							<Copy className="mr-2 h-4 w-4" />
						)}
						{copied ? "Copied" : "Copy Text"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
