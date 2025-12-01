"use client";

import { AnalyticsEvents } from "@analytics";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Book, Download, Terminal } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export function QuickActions() {
	const trackQuickAction = (action: string) => {
		if (typeof window !== "undefined" && posthog.__loaded) {
			posthog.capture(AnalyticsEvents.DASHBOARD_HELP_ACCESSED, {
				doc_page: action,
				access_method: "quick_action",
			});
		}
	};

	const handleCliInstall = () => {
		trackQuickAction("cli_install");
		// In a real implementation, this would trigger the CLI installation
		console.log("CLI install clicked");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
				<CardDescription>Get started with SnapBack protection</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Link
					href="/download/vscode"
					onClick={() => trackQuickAction("vscode_extension")}
					className="flex items-center gap-4 p-4 rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] hover:border-[var(--snapback-green)]/50 hover:bg-[var(--snapback-surface)]/80 transition-all group"
				>
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--snapback-green)]/10 group-hover:bg-[var(--snapback-green)]/20 transition-colors">
						<Download className="h-6 w-6 text-[var(--snapback-green)]" />
					</div>
					<div className="flex-1">
						<div className="font-medium text-white">
							Download VS Code Extension
						</div>
						<div className="text-sm text-neutral-400">
							Get protected in your editor
						</div>
					</div>
					<Button variant="outline" size="sm" asChild>
						<span>Download</span>
					</Button>
				</Link>

				<button
					type="button"
					onClick={handleCliInstall}
					className="flex items-center gap-4 p-4 rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] hover:border-[var(--snapback-green)]/50 hover:bg-[var(--snapback-surface)]/80 transition-all group w-full text-left"
				>
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
						<Terminal className="h-6 w-6 text-blue-500" />
					</div>
					<div className="flex-1">
						<div className="font-medium text-white">Install CLI Tool</div>
						<div className="text-sm text-neutral-400 font-mono">
							npm install -g @snapback/cli
						</div>
					</div>
					<Button variant="outline" size="sm">
						Install
					</Button>
				</button>

				<a
					href="https://docs.snapback.dev"
					onClick={() => trackQuickAction("documentation")}
					className="flex items-center gap-4 p-4 rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] hover:border-[var(--snapback-green)]/50 hover:bg-[var(--snapback-surface)]/80 transition-all group"
				>
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
						<Book className="h-6 w-6 text-purple-500" />
					</div>
					<div className="flex-1">
						<div className="font-medium text-white">Documentation</div>
						<div className="text-sm text-neutral-400">
							Learn advanced features
						</div>
					</div>
					<Button variant="outline" size="sm" asChild>
						<span>Docs</span>
					</Button>
				</a>
			</CardContent>
		</Card>
	);
}
