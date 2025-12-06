"use client";

/**
 * Better Auth Client for SnapBack
 *
 * This creates the client-side auth client that can be used in React components.
 */

import { getBaseUrl } from "@snapback/config";
import {
	adminClient,
	apiKeyClient,
	magicLinkClient,
	organizationClient,
	passkeyClient,
	twoFactorClient,
	usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

// Use NEXT_PUBLIC_ env vars directly (Next.js 15 best practice)
// These are inlined at build time and safe for client-side code
const appUrl = process.env.NEXT_PUBLIC_APP_URL || getBaseUrl();

// Create the auth client with all plugins
export const authClient = createAuthClient({
	baseURL: appUrl,
	plugins: [
		adminClient(),
		apiKeyClient(),
		magicLinkClient(),
		organizationClient(),
		passkeyClient(),
		twoFactorClient(),
		usernameClient(),
	],
});

export type { Session } from "better-auth/types";

// Export the inferred type from the auth instance
export type AuthClient = typeof authClient;
export type Auth = typeof auth;
