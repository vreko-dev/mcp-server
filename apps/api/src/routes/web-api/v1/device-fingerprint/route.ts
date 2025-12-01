import { logger } from "@snapback/infrastructure";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Use Node.js runtime for crypto APIs
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const headersList = await headers();

	try {
		// Next.js 15 compatible fingerprinting
		const fingerprint = {
			// Network-based (available in route handlers)
			userAgent: headersList.get("user-agent"),
			acceptLanguage: headersList.get("accept-language"),
			acceptEncoding: headersList.get("accept-encoding"),

			// CloudFlare/Vercel headers (if deployed there)
			cfRay: headersList.get("cf-ray"),
			cfCountry: headersList.get("cf-ipcountry"),
			vercelId: headersList.get("x-vercel-id"),

			// Client-provided data (from request body)
			...(await request.json()),
		};

		// Hash using Web Crypto API (Next.js 15 compatible)
		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(fingerprint));
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const deviceId = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		return NextResponse.json({ deviceId });
	} catch (error) {
		logger.error("Device fingerprinting error:", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
