import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import {
	createDeviceTrialRecord,
	createTrialApiKey,
	type DeviceTrial,
	findDeviceTrialByFingerprint,
	getApiKeyById,
	updateDeviceTrial,
} from "../services/device-trials-service";

const createDeviceTrialSchema = z.object({
	deviceFingerprint: z.string().min(10),
});

/**
 * Build response from trial and API key
 */
function buildTrialResponse(trial: DeviceTrial, apiKey: string, apiKeyPreview: string | null, installCount: number) {
	return {
		trialId: trial.id,
		apiKey,
		apiKeyPreview,
		snapshotLimit: trial.snapshotLimit,
		apiCallLimit: trial.apiCallLimit,
		snapshotsUsed: trial.snapshotsUsed,
		apiCallsUsed: trial.apiCallsUsed,
		trialStage: trial.userId ? "email" : "anonymous",
		installCount,
		createdAt: trial.createdAt,
	};
}

export const createDeviceTrial = publicProcedure.input(createDeviceTrialSchema).handler(async ({ input }) => {
	const { deviceFingerprint } = input;

	// Check if device trial already exists
	const existingTrial = await findDeviceTrialByFingerprint(deviceFingerprint);

	if (existingTrial) {
		// Check if device is blocked
		if (existingTrial.blockedUntil && existingTrial.blockedUntil.getTime() > Date.now()) {
			throw new Error(
				JSON.stringify({
					error: "Device blocked",
					message: "This device has been temporarily blocked",
					blockedUntil: existingTrial.blockedUntil.toISOString(),
				}),
			);
		}

		// Check if block has expired
		if (existingTrial.blockedUntil && existingTrial.blockedUntil.getTime() <= Date.now()) {
			// Reset block
			const updatedInstallCount = (existingTrial.installCount || 1) + 1;

			await updateDeviceTrial(existingTrial.id, {
				blockedUntil: null,
				installCount: updatedInstallCount,
				lastSeenAt: new Date(),
			});

			const apiKey = await getApiKeyById(existingTrial.apiKeyId);

			return buildTrialResponse(
				existingTrial,
				apiKey?.key ?? "",
				apiKey?.keyPreview ?? null,
				updatedInstallCount,
			);
		}

		// Increment install count
		const newInstallCount = (existingTrial.installCount || 1) + 1;

		// Check for abuse (more than 3 reinstalls)
		if (newInstallCount > 3) {
			// Check if within 24 hours of creation
			const hoursSinceCreation = (Date.now() - existingTrial.createdAt.getTime()) / (1000 * 60 * 60);

			if (hoursSinceCreation < 24) {
				// Block device for 24 hours
				const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await updateDeviceTrial(existingTrial.id, {
					installCount: newInstallCount,
					blockedUntil,
				});

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
		await updateDeviceTrial(existingTrial.id, {
			installCount: newInstallCount,
			lastSeenAt: new Date(),
		});

		const apiKey = await getApiKeyById(existingTrial.apiKeyId);

		return buildTrialResponse(existingTrial, apiKey?.key ?? "", apiKey?.keyPreview ?? null, newInstallCount);
	}

	// Create new API key for trial
	const newApiKey = await createTrialApiKey(deviceFingerprint);

	// Create device trial
	const trial = await createDeviceTrialRecord(deviceFingerprint, newApiKey.id);

	return buildTrialResponse(trial, newApiKey.key, newApiKey.keyPreview, trial.installCount ?? 1);
});
