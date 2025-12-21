import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import {
	createDeviceUser,
	findApiKeyByValue,
	findDeviceTrialByApiKeyId,
	findUserByEmail,
	findUserById,
	linkDeviceTrialToUser,
} from "../services/device-trials-service";

const linkDeviceSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().optional(),
});

export const linkDevice = publicProcedure.input(linkDeviceSchema).handler(async ({ input, context }) => {
	const { email, name } = input;
	// Note: password is validated by schema but not yet used in MVP
	// In production: await auth.verifyPassword(input.password, existingUser.passwordHash)

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

	// Verify API key via service
	const apiKey = await findApiKeyByValue(apiKeyValue);

	if (!apiKey) {
		throw new Error(
			JSON.stringify({
				error: "Invalid API key",
				message: "The provided API key is invalid",
			}),
		);
	}

	// Find associated device trial via service
	const trial = await findDeviceTrialByApiKeyId(apiKey.id);

	if (!trial) {
		throw new Error(
			JSON.stringify({
				error: "Trial not found",
				message: "No trial associated with this API key",
			}),
		);
	}

	// Check if device is already linked to a different user
	if (trial.userId) {
		const existingUser = await findUserById(trial.userId);

		if (existingUser && existingUser.email === email) {
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

		// Different user - block
		throw new Error(
			JSON.stringify({
				error: "Device already linked",
				message: "This device is already associated with another account",
			}),
		);
	}

	// Check if user already exists via service
	const existingUser = await findUserByEmail(email);

	let userId: string;
	let isNewUser = false;
	let emailVerified = false;

	if (existingUser) {
		// Existing user
		userId = existingUser.id;
		emailVerified = existingUser.emailVerified;

		// Note: In production, verify password with Better Auth
		// const validPassword = await auth.verifyPassword(password, existingUser.passwordHash);
		// if (!validPassword) throw error
	} else {
		// Create new user via service
		isNewUser = true;
		const newUser = await createDeviceUser(email, name);
		userId = newUser.id;

		// In production: await auth.createUser({ email, password });
	}

	// Link device trial to user and upgrade limits via service
	await linkDeviceTrialToUser(trial.id, userId, 1000);

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
