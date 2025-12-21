import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import type { SessionWithUser } from "@/types/session";
import { ApiKeysClient } from "./api-keys-client";

/**
 * API Keys management page
 * Server Component - redirects unauthenticated users
 */
export default async function ApiKeysPage() {
	const session = await getSession();

	if (!(session as SessionWithUser | null)?.user) {
		redirect("/auth/login?returnTo=/app/api-keys");
	}

	// Client Component handles all data fetching
	return <ApiKeysClient />;
}
