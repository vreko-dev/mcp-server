import "server-only";
import { auth } from "@snapback/auth";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Server-side auth helpers using Better Auth
 * These functions fetch auth data using request headers for SSR
 */

export const getSession = cache(async () => {
	const headersList = await headers();
	const session = await auth.api.getSession({
		headers: headersList,
	});
	return session;
});

export const getActiveOrganization = cache(async (slug: string) => {
	const session = await getSession();
	if (!session?.user?.id) {
		return null;
	}

	const org = await auth.api.getFullOrganization({
		headers: await headers(),
		query: { organizationSlug: slug },
	});
	return org;
});

export const getOrganizationList = cache(async () => {
	const session = await getSession();
	if (!session?.user?.id) {
		return [];
	}

	const orgs = await auth.api.listOrganizations({
		headers: await headers(),
	});
	return orgs?.organizations ?? [];
});

export const getUserAccounts = cache(async () => {
	const session = await getSession();
	if (!session?.user?.id) {
		return [];
	}

	const accounts = await auth.api.listAccounts({
		headers: await headers(),
	});
	return accounts ?? [];
});

export const getUserPasskeys = cache(async () => {
	const session = await getSession();
	if (!session?.user?.id) {
		return [];
	}

	const passkeys = await auth.api.listUserPasskeys({
		headers: await headers(),
	});
	return passkeys ?? [];
});

export const getInvitation = cache(async (id: string) => {
	const invitation = await auth.api.getInvitation({
		headers: await headers(),
		query: { invitationId: id },
	});
	return invitation;
});
