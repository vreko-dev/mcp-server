/**
 * Connect VS Code Page (Server Component)
 *
 * Landing page for VS Code extension linking flow.
 * NOTE: Requires BetterAuth authentication from backend API.
 *
 * @package apps/web
 */

import { redirect } from "next/navigation";

export const metadata = {
	title: "Connect VS Code Extension | SnapBack",
	description: "Link your VS Code extension to your SnapBack account",
};

export default async function ConnectVsCodePage() {
	// STUB: @snapback/auth - requires backend API
	// For frontend-only deployment, redirect to login
	console.warn("[ConnectVsCode] Stub - requires backend API for authentication");
	redirect("/auth/login?returnTo=/connect/vscode");
}
