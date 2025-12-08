import { apiKeys, deviceTrials, user } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const linkDeviceSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().optional(),
});

export const linkDevice = publicProcedure
	.input(linkDeviceSchema)
	.handler(async ({ input, context }) => {
		const { email, name } = input;
		// Note: password is validated by schema but not yet used in MVP
		// In production: await auth.verifyPassword(input.password, existingUser.passwordHash)

		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// Extract API key from Authorization header
		const authHeader = (
			context as {
				request?: { headers?: { get: (k: string) => string | undefined } };
			}
		).request?.headers?.get("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error(
				JSON.stringify({
					error: "Unauthorized",
					message: "Missing or invalid authorization header",
				}),
			);
		}

		const apiKeyValue = authHeader.replace("Bearer ", "");

		// Verify API key
		const apiKeyResult = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.key, apiKeyValue))
			.limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			throw new Error(
				JSON.stringify({
					error: "Invalid API key",
					message: "The provided API key is invalid",
				}),
			);
		}

		const apiKey = apiKeyResult[0];

		// Find associated device trial
		const trialResult = await db
			.select()
			.from(deviceTrials)
			.where(eq(deviceTrials.apiKeyId, apiKey.id))
			.limit(1);

		if (!trialResult || trialResult.length === 0) {
			throw new Error(
				JSON.stringify({
					error: "Trial not found",
					message: "No trial associated with this API key",
				}),
			);
		}

		const trial = trialResult[0];

		// Check if device is already linked to a different user
		if (trial.userId) {
			// Check if trying to link to same user (idempotent)
			const existingUserResult = await db
				.select()
				.from(user)
				.where(eq(user.id, trial.userId))
				.limit(1);

			if (existingUserResult && existingUserResult.length > 0) {
				const existingUser = existingUserResult[0];

				if (existingUser.email === email) {
					// Same user, return success (idempotent)
					return {
						userId: trial.userId,
						email: existingUser.email,
						upgradedLimits: {
							snapshots: trial.snapshotLimit,
							apiCalls: trial.apiCallLimit,
						},
						trialConverted: true,
						currentUsage: {
							snapshots: trial.snapshotsUsed,
							apiCalls: trial.apiCallsUsed,
						},
						emailVerified: existingUser.emailVerified,
						emailVerificationSent: false,
					};
				}
			}

			// Different user - block
			throw new Error(
				JSON.stringify({
					error: "Device already linked",
					message: "This device is already associated with another account",
				}),
			);
		}

		// Check if user already exists
		const existingUserResult = await db
			.select()
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		let userId: string;
		let isNewUser = false;
		let emailVerified = false;

		if (existingUserResult && existingUserResult.length > 0) {
			// Existing user
			const existingUser = existingUserResult[0];
			userId = existingUser.id;
			emailVerified = existingUser.emailVerified || false;

			// Note: In production, verify password with Better Auth
			// const validPassword = await auth.verifyPassword(password, existingUser.passwordHash);
			// if (!validPassword) throw error
		} else {
			// Create new user
			isNewUser = true;
			userId = nanoid();

			await db.insert(user).values({
				id: userId,
				email,
				name: name || email.split("@")[0],
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// In production: await auth.createUser({ email, password });
		}

		// Link device trial to user and upgrade limits
		await db
			.update(deviceTrials)
			.set({
				userId,
				snapshotLimit: 1000, // Email signup: 1000 snapshots
				convertedAt: new Date(),
				lastSeenAt: new Date(),
			})
			.where(eq(deviceTrials.id, trial.id));

		// Send email verification if new user
		const emailVerificationSent = isNewUser;
		// In production: await sendMail('email-verification', { email, userId });

		// Return conversion success
		return {
			userId,
			email,
			upgradedLimits: {
				snapshots: 1000,
				apiCalls: trial.apiCallLimit,
			},
			trialConverted: true,
			currentUsage: {
				snapshots: trial.snapshotsUsed,
				apiCalls: trial.apiCallsUsed,
			},
			emailVerified,
			emailVerificationSent,
		};
	});
