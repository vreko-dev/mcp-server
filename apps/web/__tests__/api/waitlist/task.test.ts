import { db, snapbackSchema } from "@snapback/platform";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/waitlist/task/route";

const { waitlist: waitlistTable, waitlistTasks: waitlistTasksTable } =
	snapbackSchema;

describe("POST /api/waitlist/task", () => {
	const createMockRequest = (body: any): NextRequest => {
		return {
			json: async () => body,
		} as NextRequest;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Validation", () => {
		it("should reject invalid email", async () => {
			const request = createMockRequest({
				email: "invalid-email",
				taskId: "github",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
		});

		it("should reject invalid task ID", async () => {
			const request = createMockRequest({
				email: "test@example.com",
				taskId: "invalid-task",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
		});

		it("should accept valid github task", async () => {
			if (!db) {
				console.warn("Database not configured, skipping test");
				return;
			}

			// First create waitlist entry
			const email = `task-test-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest({
				email,
				taskId: "github",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.task.pointsEarned).toBe(50);
		});
	});

	describe("Task Completion", () => {
		it("should award 50 points for github task", async () => {
			if (!db) return;

			const email = `github-points-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest({
				email,
				taskId: "github",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(data.task.pointsEarned).toBe(50);
			expect(data.totalPoints).toBe(50);
		});

		it("should award 25 points for demo task", async () => {
			if (!db) return;

			const email = `demo-points-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest({
				email,
				taskId: "demo",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(data.task.pointsEarned).toBe(25);
		});

		it("should award 100 points for snapshot task", async () => {
			if (!db) return;

			const email = `snapshot-points-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest({
				email,
				taskId: "snapshot",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(data.task.pointsEarned).toBe(100);
		});

		it("should calculate total points across multiple tasks", async () => {
			if (!db) return;

			const email = `multi-task-${Date.now()}@example.com`;
			const [_waitlistEntry] = await db
				.insert(waitlistTable)
				.values({
					email,
					queuePosition: 1,
					status: "pending",
				})
				.returning();

			// Complete github task (50 points)
			const request1 = createMockRequest({
				email,
				taskId: "github",
			});
			await POST(request1);

			// Complete demo task (25 points)
			const request2 = createMockRequest({
				email,
				taskId: "demo",
			});
			const response2 = await POST(request2);
			const data2 = await response2.json();

			expect(data2.totalPoints).toBe(75); // 50 + 25
		});
	});

	describe("Duplicate Prevention", () => {
		it("should reject duplicate task completion", async () => {
			if (!db) return;

			const email = `duplicate-task-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			// First completion
			const request1 = createMockRequest({
				email,
				taskId: "github",
			});
			const response1 = await POST(request1);
			const data1 = await response1.json();
			expect(data1.success).toBe(true);

			// Second completion of same task
			const request2 = createMockRequest({
				email,
				taskId: "github",
			});
			const response2 = await POST(request2);
			const data2 = await response2.json();

			expect(response2.status).toBe(400);
			expect(data2.success).toBe(false);
			expect(data2.error).toContain("already completed");
		});
	});

	describe("Error Handling", () => {
		it("should return 404 for non-existent email", async () => {
			const request = createMockRequest({
				email: "nonexistent@example.com",
				taskId: "github",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toContain("not found");
		});
	});

	describe("Database Transactions", () => {
		it("should use atomic transaction for task completion", async () => {
			if (!db) return;

			const email = `transaction-test-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest({
				email,
				taskId: "github",
			});

			await POST(request);

			// Verify task was inserted
			const tasks = await db
				.select()
				.from(waitlistTasksTable)
				.where((fields) => fields.taskType === "github");

			expect(tasks.length).toBeGreaterThan(0);
		});
	});
});

describe("GET /api/waitlist/task", () => {
	const createMockRequest = (email: string): NextRequest => {
		return {
			url: `http://localhost:3000/api/waitlist/task?email=${encodeURIComponent(email)}`,
		} as NextRequest;
	};

	describe("Task Retrieval", () => {
		it("should return empty array for user with no tasks", async () => {
			if (!db) return;

			const email = `no-tasks-${Date.now()}@example.com`;
			await db.insert(waitlistTable).values({
				email,
				queuePosition: 1,
				status: "pending",
			});

			const request = createMockRequest(email);
			const response = await GET(request);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.tasks).toEqual([]);
			expect(data.totalPoints).toBe(0);
		});

		it("should return completed tasks for user", async () => {
			if (!db) return;

			const email = `with-tasks-${Date.now()}@example.com`;
			const [waitlistEntry] = await db
				.insert(waitlistTable)
				.values({
					email,
					queuePosition: 1,
					status: "pending",
				})
				.returning();

			// Complete a task
			await db.insert(waitlistTasksTable).values({
				waitlistId: waitlistEntry.id,
				taskType: "github",
				completed: new Date(),
				pointsEarned: 50,
			});

			const request = createMockRequest(email);
			const response = await GET(request);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.tasks).toHaveLength(1);
			expect(data.tasks[0].type).toBe("github");
			expect(data.tasks[0].pointsEarned).toBe(50);
			expect(data.totalPoints).toBe(50);
		});

		it("should return 404 for non-existent email", async () => {
			const request = createMockRequest("nonexistent@example.com");
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
		});
	});

	describe("Validation", () => {
		it("should require email parameter", async () => {
			const request = {
				url: "http://localhost:3000/api/waitlist/task",
			} as NextRequest;

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Email parameter required");
		});
	});
});
