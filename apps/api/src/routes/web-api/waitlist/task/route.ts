import { db, snapbackSchema } from "@snapback/platform";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PostHog } from "posthog-node";
import { z } from "zod";

const { waitlist: waitlistTable, waitlistTasks: waitlistTasksTable } =
	snapbackSchema;

// Initialize PostHog server-side client
const posthog = process.env.POSTHOG_API_KEY
	? new PostHog(process.env.POSTHOG_API_KEY, {
			host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
		})
	: null;

// Validation schema
const taskCompletionSchema = z.object({
	email: z.string().email("Invalid email address"),
	taskId: z.enum(["github", "demo", "snapshot"]),
});

// Task points mapping
const TASK_POINTS = {
	github: 50,
	demo: 25,
	snapshot: 100,
} as const;

export async function POST(request: Request) {
	try {
		if (!db) {
			throw new Error("Database not configured");
		}

		const body = await request.json();

		// Validate request body
		const validatedData = taskCompletionSchema.parse(body);

		// Find waitlist entry by email
		const [waitlistEntry] = await db
			.select()
			.from(waitlistTable)
			.where(eq(waitlistTable.email, validatedData.email))
			.limit(1);

		if (!waitlistEntry) {
			return NextResponse.json(
				{
					success: false,
					error: "Email not found in waitlist",
				},
				{ status: 404 },
			);
		}

		// Check if task already completed
		const [existingTask] = await db
			.select()
			.from(waitlistTasksTable)
			.where(
				and(
					eq(waitlistTasksTable.waitlistId, waitlistEntry.id),
					eq(waitlistTasksTable.taskType, validatedData.taskId),
				),
			)
			.limit(1);

		if (existingTask) {
			return NextResponse.json(
				{
					success: false,
					error: "Task already completed",
					queuePosition: waitlistEntry.queuePosition,
					task: {
						id: existingTask.id,
						type: existingTask.taskType,
						pointsEarned: existingTask.pointsEarned,
						completedAt: existingTask.completed,
					},
				},
				{ status: 400 },
			);
		}

		// Start transaction to insert task and potentially update queue position
		const result = await db.transaction(async (tx) => {
			// Insert task completion
			const [newTask] = await tx
				.insert(waitlistTasksTable)
				.values({
					waitlistId: waitlistEntry.id,
					taskType: validatedData.taskId,
					completed: new Date(),
					pointsEarned: TASK_POINTS[validatedData.taskId],
					metadata:
						validatedData.taskId === "github"
							? { githubStarred: true }
							: validatedData.taskId === "demo"
								? { demoWatched: true }
								: { snapshotCreated: true },
				})
				.returning();

			// Calculate total points for this user
			const [pointsResult] = await tx
				.select({
					totalPoints: sql<number>`COALESCE(SUM(${waitlistTasksTable.pointsEarned}), 0)`,
				})
				.from(waitlistTasksTable)
				.where(eq(waitlistTasksTable.waitlistId, waitlistEntry.id));

			const totalPoints = pointsResult?.totalPoints || 0;

			// Recalculate queue position based on points
			// Users with more points should have lower queue positions (move up)
			// For now, we'll keep the current position but return the points
			// A background job could periodically reorder based on points

			return {
				task: newTask,
				totalPoints,
				currentPosition: waitlistEntry.queuePosition,
			};
		});

		// Track event in PostHog
		if (posthog) {
			posthog.capture({
				distinctId: validatedData.email,
				event: "queue_jump_task_completed",
				properties: {
					taskId: validatedData.taskId,
					email: validatedData.email,
					pointsEarned: TASK_POINTS[validatedData.taskId],
					totalPoints: result.totalPoints,
				},
			});

			// Flush events to ensure they're sent
			await posthog.shutdownAsync();
		}

		return NextResponse.json({
			success: true,
			queuePosition: result.currentPosition,
			task: result.task
				? {
						id: result.task.id,
						type: result.task.taskType,
						pointsEarned: result.task.pointsEarned,
						completedAt: result.task.completed,
					}
				: undefined,
			totalPoints: result.totalPoints,
			message: `Task completed! Earned ${TASK_POINTS[validatedData.taskId]} points`,
		});
	} catch (error) {
		console.error("Task completion API error:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request data",
					details: error.issues,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}

// GET endpoint to fetch completed tasks for a user
export async function GET(request: Request) {
	try {
		if (!db) {
			throw new Error("Database not configured");
		}

		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email");

		if (!email) {
			return NextResponse.json(
				{
					success: false,
					error: "Email parameter required",
				},
				{ status: 400 },
			);
		}

		// Find waitlist entry
		const [waitlistEntry] = await db
			.select()
			.from(waitlistTable)
			.where(eq(waitlistTable.email, email))
			.limit(1);

		if (!waitlistEntry) {
			return NextResponse.json(
				{
					success: false,
					error: "Email not found in waitlist",
				},
				{ status: 404 },
			);
		}

		// Get all completed tasks
		const tasks = await db
			.select()
			.from(waitlistTasksTable)
			.where(eq(waitlistTasksTable.waitlistId, waitlistEntry.id));

		// Calculate total points
		const totalPoints = tasks.reduce((sum, task) => sum + task.pointsEarned, 0);

		return NextResponse.json({
			success: true,
			tasks: tasks.map((task) => ({
				id: task.id,
				type: task.taskType,
				pointsEarned: task.pointsEarned,
				completedAt: task.completed,
			})),
			totalPoints,
			queuePosition: waitlistEntry.queuePosition,
		});
	} catch (error) {
		console.error("Task fetch API error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
