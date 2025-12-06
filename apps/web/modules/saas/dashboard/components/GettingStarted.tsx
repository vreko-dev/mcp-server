"use client";

import { AnalyticsEvents } from "@analytics";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { Download, Key, Play } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export function GettingStarted() {
	const trackGettingStartedAction = (step: string) => {
		if (typeof window !== "undefined" && posthog.__loaded) {
			posthog.capture(AnalyticsEvents.DASHBOARD_HELP_ACCESSED, {
				doc_page: `getting_started_${step}`,
				access_method: "getting_started_flow",
			});
		}
	};

	return (
		<Card className="border-[var(--snapback-green)]/30 bg-gradient-to-br from-[var(--snapback-green)]/5 to-transparent">
			<CardHeader>
				<CardTitle className="text-2xl">Getting Started</CardTitle>
				<CardDescription className="text-base">
					Follow these steps to start protecting your code
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--snapback-surface)] border border-[var(--snapback-border)]">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--snapback-green)]/10">
						<span className="text-sm font-bold text-[var(--snapback-green)]">1</span>
					</div>
					<div className="flex-1">
						<div className="font-medium text-white flex items-center gap-2">
							<Download className="h-4 w-4" />
							Install VS Code Extension
						</div>
						<div className="text-sm text-neutral-400 mt-1">
							Download and install the SnapBack extension for VS Code
						</div>
						<Button variant="outline" size="sm" className="mt-2" asChild>
							<Link
								href="/download/vscode"
								onClick={() => trackGettingStartedAction("install_extension")}
							>
								Download Extension
							</Link>
						</Button>
					</div>
				</div>

				<div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--snapback-surface)] border border-[var(--snapback-border)]">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--snapback-green)]/10">
						<span className="text-sm font-bold text-[var(--snapback-green)]">2</span>
					</div>
					<div className="flex-1">
						<div className="font-medium text-white flex items-center gap-2">
							<Key className="h-4 w-4" />
							Add Your API Key
						</div>
						<div className="text-sm text-neutral-400 mt-1">
							Create an API key and add it to your VS Code settings
						</div>
						<Button variant="outline" size="sm" className="mt-2" asChild>
							<Link href="/app/api-keys" onClick={() => trackGettingStartedAction("create_api_key")}>
								Create API Key
							</Link>
						</Button>
					</div>
				</div>

				<div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--snapback-surface)] border border-[var(--snapback-border)]">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--snapback-green)]/10">
						<span className="text-sm font-bold text-[var(--snapback-green)]">3</span>
					</div>
					<div className="flex-1">
						<div className="font-medium text-white flex items-center gap-2">
							<Play className="h-4 w-4" />
							Start Coding
						</div>
						<div className="text-sm text-neutral-400 mt-1">
							SnapBack will automatically protect your code as you work
						</div>
						<Button variant="outline" size="sm" className="mt-2" asChild>
							<a href="https://docs.snapback.dev" onClick={() => trackGettingStartedAction("view_docs")}>
								View Docs
							</a>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
