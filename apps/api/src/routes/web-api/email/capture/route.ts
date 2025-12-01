import { db, snapbackSchema } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PostHog } from "posthog-node";
import { z } from "zod";

const { waitlist: waitlistTable } = snapbackSchema;

// Initialize PostHog server-side client
const posthog = process.env.POSTHOG_API_KEY
	? new PostHog(process.env.POSTHOG_API_KEY, {
			host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
		})
	: null;

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per window

// Validation schema
const emailCaptureSchema = z.object({
	email: z.string().email("Invalid email address"),
	source: z
		.enum(["blog", "docs", "landing", "other"])
		.optional()
		.default("other"),
});

export async function POST(request: Request) {
	try {
		// Rate limiting check
		const clientIP = request.headers.get("x-forwarded-for") || "unknown";
		const now = Date.now();
		const rateLimitKey = `${clientIP}`;

		const rateLimitEntry = rateLimitStore.get(rateLimitKey);

		if (rateLimitEntry) {
			// Check if window has expired
			if (now > rateLimitEntry.resetTime) {
				// Reset window
				rateLimitEntry.count = 1;
				rateLimitEntry.resetTime = now + RATE_LIMIT_WINDOW_MS;
			} else if (rateLimitEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
				// Rate limit exceeded
				return NextResponse.json(
					{
						success: false,
						error: "Rate limit exceeded. Please try again later.",
					},
					{ status: 429 },
				);
			} else {
				// Increment count
				rateLimitEntry.count++;
			}
		} else {
			// Create new rate limit entry
			rateLimitStore.set(rateLimitKey, {
				count: 1,
				resetTime: now + RATE_LIMIT_WINDOW_MS,
			});
		}

		if (!db) {
			throw new Error("Database not configured");
		}

		const body = await request.json();

		// Validate request body
		const validatedData = emailCaptureSchema.parse(body);

		// Check if email already exists in waitlist
		const [existingEntry] = await db
			.select()
			.from(waitlistTable)
			.where(eq(waitlistTable.email, validatedData.email))
			.limit(1);

		if (existingEntry) {
			// Track event in PostHog for existing user
			if (posthog) {
				posthog.capture({
					distinctId: validatedData.email,
					event: "email_capture_duplicate",
					properties: {
						source: validatedData.source,
						timestamp: new Date().toISOString(),
					},
				});

				// Flush events to ensure they're sent
				await posthog.shutdownAsync();
			}

			return NextResponse.json({
				success: true,
				message: "Email already registered",
				queuePosition: existingEntry.queuePosition,
			});
		}

		// Get the current highest queue position
		const allEntries = await db
			.select({ queuePosition: waitlistTable.queuePosition })
			.from(waitlistTable);

		const maxPosition =
			allEntries.length > 0
				? Math.max(...allEntries.map((entry) => entry.queuePosition))
				: 0;

		const nextQueuePosition = maxPosition + 1;

		// Generate a referral code
		const referralCode = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

		// Insert email into waitlist
		const [newEntry] = await db
			.insert(waitlistTable)
			.values({
				email: validatedData.email,
				queuePosition: nextQueuePosition,
				referralCode: referralCode,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		// Track event in PostHog
		if (posthog) {
			posthog.capture({
				distinctId: validatedData.email,
				event: "email_capture",
				properties: {
					source: validatedData.source,
					queuePosition: nextQueuePosition,
					timestamp: new Date().toISOString(),
				},
			});

			// Flush events to ensure they're sent
			await posthog.shutdownAsync();
		}

		return NextResponse.json({
			success: true,
			message: "Email captured successfully",
			queuePosition: newEntry?.queuePosition,
		});
	} catch (error) {
		console.error("Email capture API error:", error);

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

// Cleanup rate limit store periodically (remove expired entries)
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (now > entry.resetTime) {
			rateLimitStore.delete(key);
		}
	}
}, 60 * 1000); // Run every minute
