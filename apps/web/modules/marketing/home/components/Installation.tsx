"use client";

import { Tabs } from "@marketing/components/ui/tabs";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export function Installation() {
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

	const copyToClipboard = (text: string, index: number) => {
		navigator.clipboard.writeText(text);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2000);
	};

	const installationTabs = [
		{
			title: "VS Code Extension",
			value: "vscode",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">
							Install VS Code Extension
						</h3>
						<div className="space-y-4">
							<div>
								<h4 className="font-medium mb-2">
									Method 1: VS Code Marketplace
								</h4>
								<ol className="list-decimal list-inside space-y-2 text-sm">
									<li>Open Extensions (Cmd+Shift+X)</li>
									<li>Search "SnapBack"</li>
									<li>Click Install</li>
								</ol>
							</div>

							<div>
								<h4 className="font-medium mb-2">Method 2: Command Line</h4>
								<div className="relative">
									<div className="font-mono text-sm bg-muted p-3 rounded-lg">
										code --install-extension snapback
									</div>
									<button
										onClick={() =>
											copyToClipboard("code --install-extension snapback", 0)
										}
										className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
										aria-label="Copy command"
									>
										{copiedIndex === 0 ? (
											<CheckIcon className="h-4 w-4 text-green-500" />
										) : (
											<CopyIcon className="h-4 w-4" />
										)}
									</button>
								</div>
								{copiedIndex === 0 && (
									<div className="text-xs text-green-600 mt-1">
										Copied to clipboard!
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "CLI Tool",
			value: "cli",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">Install CLI Tool</h3>
						<div className="space-y-4">
							<div>
								<h4 className="font-medium mb-2">Using npm</h4>
								<div className="relative">
									<div className="font-mono text-sm bg-muted p-3 rounded-lg">
										npm install -g @snapback/cli
									</div>
									<button
										onClick={() =>
											copyToClipboard("npm install -g @snapback/cli", 1)
										}
										className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
										aria-label="Copy command"
									>
										{copiedIndex === 1 ? (
											<CheckIcon className="h-4 w-4 text-green-500" />
										) : (
											<CopyIcon className="h-4 w-4" />
										)}
									</button>
								</div>
								{copiedIndex === 1 && (
									<div className="text-xs text-green-600 mt-1">
										Copied to clipboard!
									</div>
								)}
							</div>

							<div>
								<h4 className="font-medium mb-2">Using pnpm</h4>
								<div className="relative">
									<div className="font-mono text-sm bg-muted p-3 rounded-lg">
										pnpm add -g @snapback/cli
									</div>
									<button
										onClick={() =>
											copyToClipboard("pnpm add -g @snapback/cli", 2)
										}
										className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
										aria-label="Copy command"
									>
										{copiedIndex === 2 ? (
											<CheckIcon className="h-4 w-4 text-green-500" />
										) : (
											<CopyIcon className="h-4 w-4" />
										)}
									</button>
								</div>
								{copiedIndex === 2 && (
									<div className="text-xs text-green-600 mt-1">
										Copied to clipboard!
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "From Source",
			value: "source",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">Build from Source</h3>
						<div className="space-y-4">
							<div className="relative">
								<div className="font-mono text-sm bg-muted p-3 rounded-lg">
									git clone https://github.com/snapback/snapback
								</div>
								<button
									onClick={() =>
										copyToClipboard(
											"git clone https://github.com/snapback/snapback",
											3,
										)
									}
									className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
									aria-label="Copy command"
								>
									{copiedIndex === 3 ? (
										<CheckIcon className="h-4 w-4 text-green-500" />
									) : (
										<CopyIcon className="h-4 w-4" />
									)}
								</button>
							</div>

							<div className="relative">
								<div className="font-mono text-sm bg-muted p-3 rounded-lg">
									cd snapback && pnpm install
								</div>
								<button
									onClick={() =>
										copyToClipboard("cd snapback && pnpm install", 4)
									}
									className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
									aria-label="Copy command"
								>
									{copiedIndex === 4 ? (
										<CheckIcon className="h-4 w-4 text-green-500" />
									) : (
										<CopyIcon className="h-4 w-4" />
									)}
								</button>
							</div>

							<div className="relative">
								<div className="font-mono text-sm bg-muted p-3 rounded-lg">
									pnpm build
								</div>
								<button
									onClick={() => copyToClipboard("pnpm build", 5)}
									className="absolute top-2 right-2 p-1 hover:bg-muted-foreground/10 rounded"
									aria-label="Copy command"
								>
									{copiedIndex === 5 ? (
										<CheckIcon className="h-4 w-4 text-green-500" />
									) : (
										<CopyIcon className="h-4 w-4" />
									)}
								</button>
							</div>

							{copiedIndex !== null && copiedIndex >= 3 && (
								<div className="text-xs text-green-600">
									Copied to clipboard!
								</div>
							)}
						</div>
					</div>
				</div>
			),
		},
	];

	return (
		<section className="py-16 bg-muted/50">
			<div className="container max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="font-bold text-3xl md:text-4xl">
						Get Protected in 60 Seconds
					</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Multiple installation methods for your development environment
					</p>
				</div>

				<Tabs tabs={installationTabs} />
			</div>
		</section>
	);
}
