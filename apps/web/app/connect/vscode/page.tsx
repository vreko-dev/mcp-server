/**
 * Connect VS Code Page (Server Component)
 *
 * Landing page for VS Code extension linking flow.
 * Requires BetterAuth authentication.
 *
 * Flow:
 * 1. Extension opens browser to this page
 * 2. User authenticates (if needed)
 * 3. Client component creates link token
 * 4. Redirects to vscode://snapback.snapback/auth?token={token}
 *
 * @package apps/web
 */

import { auth } from "@snapback/auth";
import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { VsCodeConnectFlow } from "./_components/VsCodeConnectFlow";

export const metadata = {
	title: "Connect VS Code Extension | SnapBack",
	description: "Link your VS Code extension to your SnapBack account",
};

export default async function ConnectVsCodePage() {
	// Check if user is authenticated via BetterAuth
	const headers = await getHeaders();
	const session = await auth.api.getSession({ headers });

	if (!session?.user) {
		// Redirect to login, then back here
		redirect("/auth/login?returnTo=/connect/vscode");
	}

	// User is authenticated - show client component that handles linking
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<VsCodeConnectFlow user={session.user} />
		</div>
	);
}
