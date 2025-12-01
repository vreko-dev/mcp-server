/**
 * POST /api/auth/extension/exchange
 *
 * Exchange one-time link token for access/refresh token pair.
 *
 * STATUS: Feature paused - Implementation archived in /archive/extension-auth/
 * Can be re-enabled via ENABLE_EXTENSION_AUTH=true environment variable.
 *
 * @package apps/web
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Extension authentication exchange endpoint
 * Returns 501 Not Implemented when feature flag is disabled
 */
export async function POST() {
	// Extension authentication will be available in a future release
	// The full implementation is archived in /archive/extension-auth/exchange-route.ts
	// Track progress: https://github.com/Marcelle-Labs/snapback.dev/issues/TBD

	const featureFlagEnabled = process.env.ENABLE_EXTENSION_AUTH === 'true';

	if (!featureFlagEnabled) {
		return NextResponse.json(
			{
				error: "extension_auth_unavailable",
				message: "Extension authentication is coming soon. Please use the web dashboard for now.",
				documentation: "https://docs.snapback.dev/vscode-extension"
			},
			{ status: 501 }
		);
	}

	// Future implementation will go here when feature flag is enabled
	throw new Error("Extension auth exchange not yet implemented");
}

// CORS configuration
export async function OPTIONS(): Promise<NextResponse> {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*", // Extensions can call from anywhere
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
