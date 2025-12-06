/**
 * VS Code Connect Flow (Client Component)
 *
 * Handles the client-side flow of creating a link token and
 * redirecting to the VS Code deep link.
 *
 * Flow:
 * 1. Component mounts
 * 2. Calls POST /api/auth/extension/link-token
 * 3. Receives link token
 * 4. Redirects to vscode://snapback.snapback/auth?token={token}
 * 5. Shows success/error message
 *
 * @package apps/web
 */

"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface VsCodeConnectFlowProps {
	user: {
		id: string;
		email: string;
		name?: string | null;
	};
}

type Status = "loading" | "success" | "error";

export function VsCodeConnectFlow({ user }: VsCodeConnectFlowProps) {
	const [status, setStatus] = useState<Status>("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function initiateLinking() {
			try {
				// 1. Create link token
				const response = await fetch("/api/auth/extension/link-token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include", // Send BetterAuth session cookie
					body: JSON.stringify({ client: "vscode" }),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Failed to create link token");
				}

				const { linkToken } = await response.json();

				// 2. Redirect to VS Code via deep link
				const deepLink = `vscode://snapback.snapback/auth?token=${linkToken}`;
				window.location.href = deepLink;

				// 3. Show success message
				setStatus("success");
			} catch (err) {
				setError((err as Error).message);
				setStatus("error");
			}
		}

		initiateLinking();
	}, []);

	return (
		<div className="w-full max-w-md mx-auto p-6">
			<div className="bg-card border border-border rounded-lg shadow-lg p-8">
				{status === "loading" && (
					<div className="text-center">
						<Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
						<h1 className="text-2xl font-bold mb-2">Connecting VS Code...</h1>
						<p className="text-muted-foreground mb-4">Preparing to redirect to VS Code extension...</p>
						<p className="text-sm text-muted-foreground">
							Logged in as <span className="font-medium">{user.email}</span>
						</p>
					</div>
				)}

				{status === "success" && (
					<div className="text-center">
						<CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
						<h1 className="text-2xl font-bold mb-2">Connection Initiated</h1>
						<p className="text-muted-foreground mb-4">Return to VS Code to complete the connection.</p>
						<div className="bg-muted rounded-lg p-4 mb-4">
							<p className="text-sm text-muted-foreground">If VS Code didn't open automatically:</p>
							<ol className="text-sm text-muted-foreground text-left mt-2 space-y-1">
								<li>1. Make sure you have the SnapBack extension installed</li>
								<li>2. Open VS Code manually</li>
								<li>3. Click the connection link in your browser</li>
							</ol>
						</div>
						<p className="text-sm text-muted-foreground">
							Linked to <span className="font-medium">{user.email}</span>
						</p>
					</div>
				)}

				{status === "error" && (
					<div className="text-center">
						<XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
						<h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
						<p className="text-destructive mb-4">{error}</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
						>
							Try Again
						</button>
					</div>
				)}
			</div>

			{/* Helpful information */}
			<div className="mt-6 text-center">
				<p className="text-sm text-muted-foreground">
					Need help?{" "}
					<a href="/docs/extension/setup" className="text-primary hover:underline">
						View setup guide
					</a>
				</p>
			</div>
		</div>
	);
}
