import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { linkUserIdentity } from "../lib/identity-service";

const identifySchema = z.object({
	distinctId: z
		.string()
		.describe("The authenticated user ID (e.g. from database)"),
	anonymousId: z
		.string()
		.optional()
		.describe("The previous anonymous ID (e.g. from cookies) to alias against"),
	properties: z
		.record(z.string(), z.unknown())
		.optional()
		.describe("Additional user traits/properties to set"),
});

export const identify = publicProcedure
	.input(identifySchema)
	.output(
		z.object({
			success: z
				.boolean()
				.describe("Whether the identification request was accepted"),
			error: z
				.string()
				.optional()
				.describe("Error message if identification failed silently"),
		}),
	)
	.handler(async ({ input }) => {
		try {
			await linkUserIdentity(
				input.distinctId,
				input.anonymousId,
				input.properties,
			);
			return { success: true };
		} catch (_error) {
			// Don't fail the request if analytics fail, just log it (logged in service)
			return { success: false, error: "Failed to identify user" };
		}
	});
