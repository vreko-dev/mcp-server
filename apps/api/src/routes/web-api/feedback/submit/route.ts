import { logger } from "@snapback/infrastructure";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
	category: z.enum(["bug", "feature", "improvement", "other"]),
	message: z.string().min(1).max(5000),
	email: z.string().email().optional(),
	url: z.string().url().optional(),
	userAgent: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();

		// Validate input
		const validationResult = feedbackSchema.safeParse(body);

		if (!validationResult.success) {
			logger.warn("Invalid feedback submission", {
				errors: validationResult.error.issues,
				body,
			});

			return NextResponse.json(
				{
					success: false,
					error: "Invalid feedback data",
					details: validationResult.error.issues,
				},
				{ status: 400 },
			);
		}

		const feedback = validationResult.data;

		// Log feedback for infrastructure monitoring
		logger.info("Feedback submitted", {
			category: feedback.category,
			messageLength: feedback.message.length,
			hasEmail: !!feedback.email,
			url: feedback.url,
			userAgent: feedback.userAgent,
			timestamp: new Date().toISOString(),
		});

		// TODO: Integrate with feedback storage system (e.g., database, issue tracker)
		// For Alpha: Log-based collection is sufficient

		return NextResponse.json({
			success: true,
			message: "Thank you for your feedback!",
		});
	} catch (error) {
		logger.error("Feedback submission failed", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return NextResponse.json(
			{
				success: false,
				error: "Failed to submit feedback",
			},
			{ status: 500 },
		);
	}
}
