"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center p-8 space-y-4">
			<AlertCircle className="h-12 w-12 text-destructive" />
			<h2 className="text-xl font-semibold">Something went wrong</h2>
			<p className="text-muted-foreground text-center max-w-md">
				{error.message || "Failed to load billing settings. Please try again."}
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
