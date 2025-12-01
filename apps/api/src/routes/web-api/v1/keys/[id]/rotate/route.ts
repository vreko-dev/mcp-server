// TODO: Re-enable when @node-rs/argon2 build issue is resolved
// import { hash } from "@node-rs/argon2";
// import { auth } from "@snapback/auth";
// import { logger } from "@snapback/infrastructure";
// import { db, snapbackSchema } from "@snapback/platform";
// import { eq } from "drizzle-orm";
// import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/v1/keys/:id/rotate
 *
 * Rotates an API key by:
 * 1. Revoking the old key
 * 2. Creating a new key with the same permissions
 * 3. Returning the new key (show once)
 *
 * Security:
 * - Only the key owner can rotate it
 * - Old key is revoked immediately
 * - New key is returned only once
 * - Both operations are atomic (transaction)
 */

export async function PATCH(
	_request: NextRequest,
	_context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
	// Temporarily disabled due to @node-rs/argon2 build issue
	return NextResponse.json(
		{ error: "API key rotation temporarily unavailable" },
		{ status: 501 },
	);
}
