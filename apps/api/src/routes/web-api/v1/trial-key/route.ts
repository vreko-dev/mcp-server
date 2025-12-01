// TODO: Re-enable when @node-rs/argon2 build issue is resolved
// import { randomBytes } from "node:crypto";
// import { hash } from "@node-rs/argon2";
// import { logger } from "@snapback/infrastructure";
// import { db, snapbackSchema } from "@snapback/platform";
// import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

// // Generate a secure API key
// function generateApiKey(): string {
// 	return `sb_${nanoid()}${nanoid()}`;
// }

// // Generate a cryptographically secure signing secret
// function generateSigningSecret(): string {
// 	return randomBytes(32).toString("hex");
// }

export async function POST(_request: Request) {
	// Temporarily disabled due to @node-rs/argon2 build issue
	return NextResponse.json(
		{ success: false, error: "Trial key generation temporarily unavailable" },
		{ status: 501 },
	);
}

// CORS configuration with origin whitelist
export async function OPTIONS(request: Request) {
	const origin = request.headers.get("origin");
	const allowedOrigins = [
		process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev",
		"https://snapback.dev",
		"https://www.snapback.dev",
	];

	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	// Only allow specific origins
	if (origin && allowedOrigins.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
	}

	return NextResponse.json({}, { headers });
}
