import { auth } from "@snapback/auth/auth";
import { logger } from "@snapback/infrastructure";
import { type NextRequest, NextResponse } from "next/server";

// Import the existing API client
import { apiClient } from "@/lib/api-client";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Call YOUR existing API
		const result = await apiClient.apiKeys.list();
		return NextResponse.json(result);
	} catch (error) {
		logger.error("Error fetching API keys:", { error });
		return NextResponse.json(
			{ error: "Failed to fetch API keys" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const { name } = body;

	try {
		// Call YOUR existing API
		const result = await apiClient.apiKeys.create({
			name,
		});

		return NextResponse.json(result);
	} catch (error) {
		logger.error("Error creating API key:", { error });
		return NextResponse.json(
			{ error: "Failed to create API key" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const keyId = searchParams.get("id");

	if (!keyId) {
		return NextResponse.json({ error: "Key ID required" }, { status: 400 });
	}

	try {
		// Call YOUR existing API
		const result = await apiClient.apiKeys.revoke({ id: keyId });
		return NextResponse.json(result);
	} catch (error) {
		logger.error("Error revoking API key:", { error });
		return NextResponse.json(
			{ error: "Failed to revoke API key" },
			{ status: 500 },
		);
	}
}
