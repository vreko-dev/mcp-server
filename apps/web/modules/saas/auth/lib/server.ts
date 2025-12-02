import "server-only";
import { cache } from "react";

// STUB: @snapback/auth - requires backend API
// All auth operations are stubbed for frontend-only deployment

export const getSession = cache(async () => {
	console.warn("[Auth] getSession() is stubbed - requires backend API");
	return null;
});

export const getActiveOrganization = cache(async (_slug: string) => {
	console.warn("[Auth] getActiveOrganization() is stubbed - requires backend API");
	return null;
});

export const getOrganizationList = cache(async () => {
	console.warn("[Auth] getOrganizationList() is stubbed - requires backend API");
	return [];
});

export const getUserAccounts = cache(async () => {
	console.warn("[Auth] getUserAccounts() is stubbed - requires backend API");
	return [];
});

export const getUserPasskeys = cache(async () => {
	console.warn("[Auth] getUserPasskeys() is stubbed - requires backend API");
	return [];
});

export const getInvitation = cache(async (_id: string) => {
	console.warn("[Auth] getInvitation() is stubbed - requires backend API");
	return null;
});
