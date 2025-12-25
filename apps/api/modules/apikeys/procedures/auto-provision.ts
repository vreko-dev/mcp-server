/**
 * Auto-Provision API Key Procedure
 *
 * Endpoint for automatically provisioning an API key during onboarding.
 * Called by the frontend when a user completes signup/onboarding.
 *
 * This enables the "invisible auth" flow where users get their CLI
 * credentials without any manual steps.
 *
 * @module apikeys/procedures/auto-provision
 */

import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { autoProvisionApiKey, type ProvisionContext } from "../services/auto-provision";

export const autoProvision = protectedProcedure
	.input(
		z.object({
			source: z.enum(["onboarding", "dashboard", "cli", "extension"]).default("onboarding"),
		}),
	)
	.handler(async ({ input, context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		const provisionContext: ProvisionContext = {
			userId: user.id,
			email: user.email,
			source: input.source,
		};

		const result = await autoProvisionApiKey(provisionContext);

		if (result.error) {
			throw new Error(result.error);
		}

		// Return appropriate response based on whether key was provisioned or already existed
		if (result.provisioned && result.apiKey) {
			return {
				status: "provisioned",
				apiKey: {
					id: result.apiKey.id,
					name: result.apiKey.name,
					key: result.apiKey.key, // Full key - only time it's shown
					keyPreview: result.apiKey.keyPreview,
					createdAt: result.apiKey.createdAt,
				},
				message: "Your CLI access key has been created. Save it securely - you won't see it again.",
				cliCommand: `snap login --api-key ${result.apiKey.key}`,
			};
		}

		if (result.existingKey) {
			return {
				status: "existing",
				apiKey: {
					id: result.existingKey.id,
					name: result.existingKey.name,
					keyPreview: result.existingKey.keyPreview,
				},
				message: "You already have a CLI access key configured.",
			};
		}

		throw new Error("Failed to provision API key");
	});
