import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "./api-keys-client";

/**
 * API Keys management page
 * Server Component - redirects unauthenticated users
 */
export default async function ApiKeysPage() {
	const session = await getSession();

	if (!(session as any)?.user) {
		redirect("/auth/login?returnTo=/app/api-keys");
	}

	// Client Component handles all data fetching
	return <ApiKeysClient />;
}
