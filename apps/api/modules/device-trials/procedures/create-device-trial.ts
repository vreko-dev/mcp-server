import { apiKeys, deviceTrials } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

const createDeviceTrialSchema = z.object({
	deviceFingerprint: z.string().min(10),
});

export const createDeviceTrial = publicProcedure.input(createDeviceTrialSchema).handler(async ({ input }) => {
	const { deviceFingerprint } = input;

	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	// Check if device trial already exists
	const existingTrial = await db
		.select()
		.from(deviceTrials)
		.where(eq(deviceTrials.deviceFingerprint, deviceFingerprint))
		.limit(1);

	if (existingTrial && existingTrial.length > 0) {
		const trial = existingTrial[0];

		// Check if device is blocked
		if (trial.blockedUntil && trial.blockedUntil.getTime() > Date.now()) {
			throw new Error(
				JSON.stringify({
					error: "Device blocked",
					message: "This device has been temporarily blocked",
					blockedUntil: trial.blockedUntil.toISOString(),
				}),
			);
		}

		// Check if block has expired
		if (trial.blockedUntil && trial.blockedUntil.getTime() <= Date.now()) {
			// Reset block
			const updatedInstallCount = (trial.installCount || 1) + 1;

			await db
				.update(deviceTrials)
				.set({
					blockedUntil: null,
					installCount: updatedInstallCount,
					lastSeenAt: new Date(),
				})
				.where(eq(deviceTrials.id, trial.id));

			// Get API key
			const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.id, trial.apiKeyId)).limit(1);

			const apiKey = apiKeyResult && apiKeyResult.length > 0 ? apiKeyResult[0] : undefined;

			return {
				trialId: trial.id,
				apiKey: apiKey?.key,
				apiKeyPreview: apiKey?.keyPreview,
				snapshotLimit: trial.snapshotLimit,
				apiCallLimit: trial.apiCallLimit,
				snapshotsUsed: trial.snapshotsUsed,
				apiCallsUsed: trial.apiCallsUsed,
				trialStage: trial.userId ? "email" : "anonymous",
				installCount: updatedInstallCount,
				createdAt: trial.createdAt,
			};
		}

		// Increment install count
		const newInstallCount = (trial.installCount || 1) + 1;

		// Check for abuse (more than 3 reinstalls)
		if (newInstallCount > 3) {
			// Check if within 24 hours of creation
			const hoursSinceCreation = (Date.now() - trial.createdAt.getTime()) / (1000 * 60 * 60);

			if (hoursSinceCreation < 24) {
				// Block device for 24 hours
				const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await db
					.update(deviceTrials)
					.set({
						installCount: newInstallCount,
						blockedUntil,
					})
					.where(eq(deviceTrials.id, trial.id));

				throw new Error(
					JSON.stringify({
						error: "Trial limit exceeded",
						message: "Too many reinstalls detected. Device temporarily blocked.",
						blockedUntil: blockedUntil.toISOString(),
					}),
				);
			}
		}

		// Update install count and last seen
		await db
			.update(deviceTrials)
			.set({
				installCount: newInstallCount,
				lastSeenAt: new Date(),
			})
			.where(eq(deviceTrials.id, trial.id));

		// Get API key
		const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.id, trial.apiKeyId)).limit(1);

		const apiKey = apiKeyResult && apiKeyResult.length > 0 ? apiKeyResult[0] : undefined;

		// Return existing trial
		return {
			trialId: trial.id,
			apiKey: apiKey?.key,
			apiKeyPreview: apiKey?.keyPreview,
			snapshotLimit: trial.snapshotLimit,
			apiCallLimit: trial.apiCallLimit,
			snapshotsUsed: trial.snapshotsUsed,
			apiCallsUsed: trial.apiCallsUsed,
			trialStage: trial.userId ? "email" : "anonymous",
			installCount: newInstallCount,
			createdAt: trial.createdAt,
		};
	}

	// Create new API key for trial
	const apiKeyValue = `snap_${nanoid(32)}`;
	const apiKeyPreview = `${apiKeyValue.slice(0, 12)}...`;

	// Create a temporary anonymous user for device trials
	const tempUserId = `device_${deviceFingerprint.slice(0, 16)}`;

	const apiKeyResult = await db
		.insert(apiKeys)
		.values({
			userId: tempUserId,
			key: apiKeyValue,
			keyPreview: apiKeyPreview,
			name: `Device Trial - ${deviceFingerprint.slice(0, 8)}`,
			expiresAt: null, // No expiration for trial keys
		})
		.returning();

	const newApiKey = apiKeyResult && apiKeyResult.length > 0 ? apiKeyResult[0] : undefined;

	if (!newApiKey) {
		throw new Error("Failed to create API key");
	}

	// Create device trial
	const trialResult = await db
		.insert(deviceTrials)
		.values({
			deviceFingerprint,
			apiKeyId: newApiKey.id,
			snapshotLimit: 50, // Anonymous trial limit
			apiCallLimit: 10000, // Anonymous API call limit
			snapshotsUsed: 0,
			apiCallsUsed: 0,
			userId: null, // Anonymous trial
			installCount: 1,
			createdAt: new Date(),
			lastSeenAt: new Date(),
		})
		.returning();
	const trial = trialResult && trialResult.length > 0 ? trialResult[0] : undefined;

	if (!trial) {
		throw new Error("Failed to create device trial");
	}

	// Return trial details with API key
	return {
		trialId: trial.id,
		apiKey: apiKeyValue,
		apiKeyPreview,
		snapshotLimit: trial.snapshotLimit,
		apiCallLimit: trial.apiCallLimit,
		snapshotsUsed: trial.snapshotsUsed,
		apiCallsUsed: trial.apiCallsUsed,
		trialStage: "anonymous",
		installCount: trial.installCount,
		createdAt: trial.createdAt,
	};
});
