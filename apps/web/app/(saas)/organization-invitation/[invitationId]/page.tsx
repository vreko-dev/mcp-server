import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import { redirect } from "next/navigation";

// STUB: @snapback/auth - requires backend API
// This page requires authentication from the backend API
// In frontend-only mode, redirect to app dashboard

export default async function OrganizationInvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
	await params; // consume params to avoid unused variable warning

	// STUB: Cannot process invitation without backend auth
	// Redirect to dashboard
	console.warn("[OrganizationInvitation] Stub - requires backend API");
	redirect("/app");

	return (
		<AuthWrapper>
			<div className="flex items-center justify-center min-h-screen">
				<p>Organization invitation page requires backend API connection.</p>
			</div>
		</AuthWrapper>
	);
}
