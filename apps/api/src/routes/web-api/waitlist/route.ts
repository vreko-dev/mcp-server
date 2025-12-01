import { Client as HubSpotClient } from "@hubspot/api-client";
import { db, snapbackSchema } from "@snapback/platform";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { WaitlistConfirmationEmail } from "../../../emails/waitlist-confirmation";

const { waitlist: waitlistTable } = snapbackSchema;

// Validation schema
const waitlistSchema = z.object({
	email: z.string().email("Invalid email address"),
	githubUsername: z.string().optional(),
	editor: z.string().optional(),
	language: z.string().optional(),
	teamSize: z.string().optional(),
});

type WaitlistData = z.infer<typeof waitlistSchema>;

// Initialize Resend and HubSpot clients
const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null;

const hubspot = process.env.HUBSPOT_ACCESS_TOKEN
	? new HubSpotClient({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN })
	: null;

// Helper function to send confirmation email with retry logic
async function sendConfirmationEmail(
	email: string,
	queuePosition: number,
	retries = 3,
): Promise<boolean> {
	if (!resend) {
		console.warn("Resend not configured, skipping email");
		return false;
	}

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await resend.emails.send({
				from: "SnapBack <hello@snapback.dev>",
				to: email,
				subject: `You're #${queuePosition} on the SnapBack waitlist!`,
				react: WaitlistConfirmationEmail({ queuePosition, email }),
				// Idempotency key to prevent duplicate sends
				headers: {
					"X-Entity-Ref-ID": `waitlist-${email}-${queuePosition}`,
				},
			});

			console.log(
				`✅ Confirmation email sent to ${email} (attempt ${attempt})`,
			);
			return true;
		} catch (error) {
			console.error(
				`❌ Failed to send email to ${email} (attempt ${attempt}/${retries}):`,
				error,
			);

			// Retry on transient errors (429, 5xx)
			if (attempt < retries) {
				const delay = 2 ** attempt * 1000; // Exponential backoff: 2s, 4s, 8s
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	return false;
}

// Helper function to sync with HubSpot with retry logic
async function syncToHubSpot(
	data: WaitlistData & { queuePosition: number },
	retries = 3,
): Promise<string | null> {
	if (!hubspot) {
		console.warn("HubSpot not configured, skipping sync");
		return null;
	}

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			// Check if contact already exists
			const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
				filterGroups: [
					{
						filters: [
							{
								propertyName: "email",
								// @ts-expect-error - FilterOperatorEnum type mismatch in HubSpot client
								operator: "EQ",
								value: data.email,
							},
						],
					},
				],
			});

			let contactId: string;

			if (searchResponse.results.length > 0 && searchResponse.results[0]) {
				// Update existing contact
				contactId = searchResponse.results[0].id;
				await hubspot.crm.contacts.basicApi.update(contactId, {
					properties: {
						email: data.email,
						editor: data.editor || "",
						language: data.language || "",
						team_size: data.teamSize || "",
						github_username: data.githubUsername || "",
						queue_position: data.queuePosition.toString(),
						waitlist_status: "pending",
					},
				});
				console.log(
					`✅ Updated existing HubSpot contact ${contactId} (attempt ${attempt})`,
				);
			} else {
				// Create new contact
				const response = await hubspot.crm.contacts.basicApi.create({
					properties: {
						email: data.email,
						editor: data.editor || "",
						language: data.language || "",
						team_size: data.teamSize || "",
						github_username: data.githubUsername || "",
						queue_position: data.queuePosition.toString(),
						waitlist_status: "pending",
					},
				});
				contactId = response.id;
				console.log(
					`✅ Created new HubSpot contact ${contactId} (attempt ${attempt})`,
				);
			}

			return contactId;
		} catch (error) {
			console.error(
				`❌ Failed to sync to HubSpot (attempt ${attempt}/${retries}):`,
				error,
			);

			// Retry on transient errors
			if (attempt < retries) {
				const delay = 2 ** attempt * 1000; // Exponential backoff: 2s, 4s, 8s
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	return null;
}

export async function POST(request: Request) {
	try {
		if (!db) {
			throw new Error("Database not configured");
		}

		const body = await request.json();

		// Validate request body
		const validatedData = waitlistSchema.parse(body);

		// Check if email already exists
		const existingEntry = await db
			.select()
			.from(waitlistTable)
			.where(eq(waitlistTable.email, validatedData.email))
			.limit(1);

		if (existingEntry.length > 0 && existingEntry[0]) {
			return NextResponse.json(
				{
					success: false,
					error: "Email already registered",
					queuePosition: existingEntry[0].queuePosition,
				},
				{ status: 400 },
			);
		}

		// Get current waitlist count to determine queue position
		const countResult = await db.select({ total: count() }).from(waitlistTable);
		const total =
			countResult.length > 0 && countResult[0] ? countResult[0].total : 0;

		const queuePosition = (total || 0) + 1;

		// Generate a referral code
		const referralCode = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

		// Insert into database
		const [entry] = await db
			.insert(waitlistTable)
			.values({
				email: validatedData.email,
				githubUsername: validatedData.githubUsername,
				editor: validatedData.editor,
				language: validatedData.language,
				teamSize: validatedData.teamSize,
				queuePosition,
				status: "pending",
				referralCode: referralCode,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		// Send confirmation email (non-blocking, best-effort)
		const emailSent = await sendConfirmationEmail(
			validatedData.email,
			queuePosition,
		);

		// Update email tracking fields if email was sent
		if (emailSent && entry) {
			await db
				.update(waitlistTable)
				.set({
					emailSent: new Date(),
					emailSentAt: new Date(),
				})
				.where(eq(waitlistTable.id, entry.id));
		}

		// Sync with HubSpot (non-blocking, best-effort)
		const hubspotContactId = await syncToHubSpot({
			...validatedData,
			queuePosition,
		});

		// Update HubSpot tracking fields if sync was successful
		if (hubspotContactId && entry) {
			await db
				.update(waitlistTable)
				.set({
					hubspotContactId,
					hubspotSyncedAt: new Date(),
				})
				.where(eq(waitlistTable.id, entry.id));
		}

		return NextResponse.json({
			success: true,
			queuePosition,
			message: "Successfully joined the waitlist",
		});
	} catch (error) {
		console.error("Waitlist API error:", error);

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

export async function GET() {
	try {
		if (!db) {
			return NextResponse.json({
				total: 0,
				message: "Waitlist API is operational (database not configured)",
			});
		}

		const countResult = await db.select({ total: count() }).from(waitlistTable);
		const total =
			countResult.length > 0 && countResult[0] ? countResult[0].total : 0;

		return NextResponse.json({
			total: total || 0,
			message: "Waitlist API is operational",
		});
	} catch (error) {
		console.error("Waitlist GET error:", error);
		return NextResponse.json({
			total: 0,
			message: "Waitlist API is operational",
		});
	}
}
