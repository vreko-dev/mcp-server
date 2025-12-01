"use client";

import { AnalyticsScript } from "@analytics/provider/posthog";
import { ProgressProvider } from "@bprogress/next/app";
import { ApiClientProvider } from "@shared/components/ApiClientProvider";
import { Toaster } from "@ui/components/toast";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// TODO: Replace with actual config from environment/app settings
const config = {
	ui: {
		defaultTheme: "dark",
		enabledThemes: ["light", "dark"],
	},
};

export function ClientProviders({ children }: PropsWithChildren) {
	return (
		<ApiClientProvider>
			<ProgressProvider
				height="4px"
				color="var(--color-primary)"
				options={{ showSpinner: false }}
				shallowRouting
				delay={250}
			>
				<ThemeProvider
					attribute="class"
					disableTransitionOnChange
					enableSystem
					defaultTheme={config.ui.defaultTheme}
					themes={config.ui.enabledThemes}
					{...({ children } as any)}
				>
					<AnalyticsScript />
					<ErrorBoundary>{children}</ErrorBoundary>

					<Toaster position="top-right" />
					{/* <ConsentBanner /> */}
				</ThemeProvider>
			</ProgressProvider>
		</ApiClientProvider>
	);
}
