"use client";

import { useEffect } from "react";
import { ExitIntentModal } from "../home/components/ExitIntentModal";
import { analytics } from "../lib/analytics";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		// Initialize analytics
		analytics.init();
	}, []);

	return (
		<>
			{children}
			<ExitIntentModal />
		</>
	);
}
