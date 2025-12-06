"use client";

import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Confetti } from "@ui/components/magic/confetti";
import { AlertTriangle, Check, Copy, Key, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CreateApiKeyModalProps {
	onKeyCreated?: () => void;
	trigger?: React.ReactNode;
}

export function CreateApiKeyModal({ onKeyCreated, trigger }: CreateApiKeyModalProps) {
	const [open, setOpen] = useState(false);
	const [keyName, setKeyName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const [isPending, startTransition] = useTransition();

	const handleCreate = () => {
		setError(null);

		// Validation
		if (!keyName.trim()) {
			setError("Name is required");
			return;
		}

		if (keyName.trim().length < 3) {
			setError("Name must be at least 3 characters");
			return;
		}

		startTransition(async () => {
			try {
				// TODO: Replace with actual API call
				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Generate mock API key
				const newKey = `sb_${Math.random()
					.toString(36)
					.substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
				setCreatedKey(newKey);
				setShowConfetti(true);

				// Hide confetti after 3 seconds
				setTimeout(() => setShowConfetti(false), 3000);

				toast.success("API key created successfully");
			} catch (_err) {
				setError("Failed to create API key. Please try again.");
				toast.error("Failed to create API key");
			}
		});
	};

	const handleCopy = async () => {
		if (createdKey) {
			await navigator.clipboard.writeText(createdKey);
			setCopied(true);
			toast.success("Copied to clipboard");

			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleClose = () => {
		setOpen(false);
		setKeyName("");
		setCreatedKey(null);
		setError(null);
		setCopied(false);
		if (onKeyCreated && createdKey) {
			onKeyCreated();
		}
	};

	return (
		<>
			{showConfetti && <Confetti />}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					{trigger || (
						<Button className="bg-[var(--snapback-green)] hover:bg-[var(--snapback-green)]/90">
							<Key className="h-4 w-4 mr-2" />
							Create API Key
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Create API Key</DialogTitle>
						<DialogDescription>
							This key will be used to authenticate your SnapBack tools and extensions
						</DialogDescription>
					</DialogHeader>

					{!createdKey ? (
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="keyName">Key Name</Label>
								<Input
									id="keyName"
									name="keyName"
									placeholder="e.g., VS Code Key"
									value={keyName}
									onChange={(e) => setKeyName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											handleCreate();
										}
									}}
									autoFocus
								/>
							</div>

							{error && (
								<Alert variant="error">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<Button
								onClick={handleCreate}
								disabled={isPending}
								className="w-full bg-[var(--snapback-green)] hover:bg-[var(--snapback-green)]/90"
							>
								{isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" data-testid="loading-spinner" />
										Creating...
									</>
								) : (
									"Create"
								)}
							</Button>
						</div>
					) : (
						<div className="space-y-4 py-4">
							<Alert className="bg-[var(--snapback-green)]/10 border-[var(--snapback-green)]/30">
								<AlertDescription className="text-white">
									API key created successfully!
								</AlertDescription>
							</Alert>

							<div className="space-y-2">
								<Label>Your API Key</Label>
								<div className="flex items-center gap-2">
									<code
										className="flex-1 px-3 py-2 rounded-md bg-[var(--snapback-surface)] border border-[var(--snapback-border)] font-mono text-sm text-white break-all"
										data-testid="api-key-display"
									>
										{createdKey}
									</code>
									<Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
										{copied ? (
											<>
												<Check className="h-4 w-4 mr-1" />
												Copied!
											</>
										) : (
											<>
												<Copy className="h-4 w-4 mr-1" />
												Copy
											</>
										)}
									</Button>
								</div>
							</div>

							<Alert
								variant="error"
								className="bg-[var(--snapback-danger)]/10 border-[var(--snapback-danger)]/30"
							>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									<div className="font-medium mb-1">Save this key securely!</div>
									<div className="text-sm">
										You won't be able to see it again. Store it in a safe place like your password
										manager.
									</div>
								</AlertDescription>
							</Alert>

							<Button onClick={handleClose} className="w-full">
								Done
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
