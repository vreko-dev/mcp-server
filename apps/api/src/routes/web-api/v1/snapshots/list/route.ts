import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { db, snapshots } from "@snapback/platform";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/snapshots/list
 *
 * Lists snapshots for the authenticated user/device
 */

export async function GET(request: NextRequest) {
	try {
		// Extract auth context from request headers
		const authContextHeader = request.headers.get("x-auth-context");
		if (!authContextHeader) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const authContext = JSON.parse(authContextHeader);

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get("projectId") || undefined;
		const limit = Math.min(
			Number.parseInt(searchParams.get("limit") || "50", 10),
			100,
		); // Max 100
		const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

		if (authContext.type === "device") {
			// Handle device trial user
			return await handleDeviceTrialList(authContext, projectId, limit, offset);
		}
		// Handle authenticated user
		return await handleAuthenticatedUserList(
			authContext,
			projectId,
			limit,
			offset,
			request,
		);
	} catch (error) {
		logger.error("Snapshot listing error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function handleDeviceTrialList(
	authContext: any,
	projectId: string | undefined,
	limit: number,
	offset: number,
) {
	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		// Build query conditions
		let conditions = eq(snapshots.userId, `device_${authContext.deviceId}`);

		if (projectId) {
			conditions = and(conditions, eq(snapshots.projectPath, projectId)) as any;
		}

		// Use window function for count to combine queries
		const result = await db
			.select({
				snapshot: snapshots,
				totalCount: sql<number>`count(*) over()`.as("total_count"),
			})
			.from(snapshots)
			.where(conditions)
			.orderBy(desc(snapshots.createdAt))
			.limit(limit)
			.offset(offset);

		const snapshotList = result.map((r) => r.snapshot);
		const totalCount = result[0]?.totalCount || 0;

		// Transform to response format
		const snapshotsResponse = snapshotList.map((snapshot: any) => ({
			snapshotId: snapshot.id,
			name: snapshot.name || "",
			createdAt: snapshot.createdAt.toISOString(),
			projectId: snapshot.projectPath || "",
		}));

		return NextResponse.json({
			snapshots: snapshotsResponse,
			totalCount,
		});
	} catch (error) {
		logger.error("Device trial snapshot listing error", { error });
		return NextResponse.json(
			{ error: "Failed to list snapshots" },
			{ status: 500 },
		);
	}
}

async function handleAuthenticatedUserList(
	_authContext: any,
	projectId: string | undefined,
	limit: number,
	offset: number,
	request: NextRequest,
) {
	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		// Get user session
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Invalid authorization header" },
				{ status: 401 },
			);
		}

		const token = authHeader.substring(7);
		const session = await auth.api.getSession({
			headers: new Headers({
				Authorization: `Bearer ${token}`,
			}),
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// Build query conditions
		let conditions = eq(snapshots.userId, session.user.id);

		if (projectId) {
			conditions = and(conditions, eq(snapshots.projectPath, projectId)) as any;
		}

		// Use window function for count to combine queries
		const result = await db
			.select({
				snapshot: snapshots,
				totalCount: sql<number>`count(*) over()`.as("total_count"),
			})
			.from(snapshots)
			.where(conditions)
			.orderBy(desc(snapshots.createdAt))
			.limit(limit)
			.offset(offset);

		const snapshotList = result.map((r) => r.snapshot);
		const totalCount = result[0]?.totalCount || 0;

		// Transform to response format
		const snapshotsResponse = snapshotList.map((snapshot: any) => ({
			snapshotId: snapshot.id,
			name: snapshot.name || "",
			createdAt: snapshot.createdAt.toISOString(),
			projectId: snapshot.projectPath || "",
		}));

		return NextResponse.json({
			snapshots: snapshotsResponse,
			totalCount,
		});
	} catch (error) {
		logger.error("Authenticated user snapshot listing error", { error });
		return NextResponse.json(
			{ error: "Failed to list snapshots" },
			{ status: 500 },
		);
	}
}
