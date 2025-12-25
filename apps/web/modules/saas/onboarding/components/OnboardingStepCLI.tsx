"use client";

import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { ArrowRightIcon, CheckIcon, ClipboardIcon, KeyIcon, TerminalIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ApiKeyData {
	status: "provisioned" | "existing";
	apiKey: {
		id: string;
		name: string;
		key?: string; // Only present on first provision
		keyPreview: string;
	};
	cliCommand?: string;
}

interface OnboardingStepCLIProps {
	onCompleted: () => void;
	onSkip?: () => void;
}

export function OnboardingStepCLI({ onCompleted, onSkip }: OnboardingStepCLIProps) {
	const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copiedKey, setCopiedKey] = useState(false);
	const [copiedCommand, setCopiedCommand] = useState(false);

	// Auto-provision API key function (extracted for retry)
	const provisionKey = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const response = await fetch("/api/apikeys/auto-provision", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source: "onboarding" }),
			});

			if (!response.ok) {
				throw new Error("Failed to provision API key");
			}

			const data = await response.json();
			setApiKeyData(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-provision on mount
	useEffect(() => {
		provisionKey();
	}, []);

	const copyToClipboard = async (text: string, type: "key" | "command") => {
		try {
			await navigator.clipboard.writeText(text);
			if (type === "key") {
				setCopiedKey(true);
				setTimeout(() => setCopiedKey(false), 2000);
			} else {
				setCopiedCommand(true);
				setTimeout(() => setCopiedCommand(false), 2000);
			}
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement("textarea");
			textarea.value = text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				<p className="mt-4 text-muted-foreground">Setting up your CLI access...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<Alert variant="error">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<div className="flex gap-3">
					<Button variant="outline" onClick={onSkip}>
						Skip for now
					</Button>
					<Button onClick={provisionKey}>Try again</Button>
				</div>
			</div>
		);
	}

	const hasFullKey = apiKeyData?.status === "provisioned" && apiKeyData.apiKey.key;

	return (
		<div className="space-y-6">
			{/* Success message */}
			<div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
				<CheckIcon className="mt-0.5 h-5 w-5 text-green-600" />
				<div>
					<p className="font-medium text-green-800 dark:text-green-200">
						{hasFullKey ? "Your CLI access key is ready!" : "You already have CLI access configured"}
					</p>
					<p className="mt-1 text-sm text-green-700 dark:text-green-300">
						{hasFullKey
							? "Save this key securely - you won't see it again."
							: "Your existing key is still active."}
					</p>
				</div>
			</div>

			{/* API Key display (only for new provisions) */}
			{hasFullKey && (
				<div className="space-y-2">
					<label className="flex items-center gap-2 text-sm font-medium">
						<KeyIcon className="h-4 w-4" />
						Your API Key
					</label>
					<div className="flex items-center gap-2">
						<code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
							{apiKeyData.apiKey.key}
						</code>
						<Button
							variant="outline"
							size="icon"
							onClick={() => copyToClipboard(apiKeyData.apiKey.key!, "key")}
						>
							{copiedKey ? (
								<CheckIcon className="h-4 w-4 text-green-600" />
							) : (
								<ClipboardIcon className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			)}

			{/* Quick start command */}
			<div className="space-y-2">
				<label className="flex items-center gap-2 text-sm font-medium">
					<TerminalIcon className="h-4 w-4" />
					Quick Start
				</label>
				<p className="text-sm text-muted-foreground">Run this command in your terminal to connect the CLI:</p>
				<div className="flex items-center gap-2">
					<code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
						{hasFullKey ? `snap login --api-key ${apiKeyData.apiKey.key}` : "snap login"}
					</code>
					<Button
						variant="outline"
						size="icon"
						onClick={() =>
							copyToClipboard(
								hasFullKey ? `snap login --api-key ${apiKeyData.apiKey.key}` : "snap login",
								"command",
							)
						}
					>
						{copiedCommand ? (
							<CheckIcon className="h-4 w-4 text-green-600" />
						) : (
							<ClipboardIcon className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>

			{/* Alternative: Direct Key Login */}
			<div className="rounded-lg border bg-muted/50 p-4">
				<p className="text-sm font-medium">Alternative: Direct Key Login</p>
				<p className="mt-1 text-sm text-muted-foreground">
					On a remote server or without the key? Just run{" "}
					<code className="rounded bg-muted px-1">snap login</code> to authenticate via browser.
				</p>
			</div>

			{/* Install instructions */}
			<div className="space-y-2">
				<p className="text-sm font-medium">Don't have the CLI yet?</p>
				<code className="block rounded-md border bg-muted px-3 py-2 font-mono text-sm">
					npm install -g @snapback/cli
				</code>
			</div>

			{/* Actions */}
			<div className="flex gap-3 pt-4">
				{onSkip && (
					<Button variant="outline" onClick={onSkip}>
						Skip for now
					</Button>
				)}
				<Button onClick={onCompleted} className="flex-1">
					Continue to Dashboard
					<ArrowRightIcon className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
