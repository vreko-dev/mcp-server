import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getPostHog } from "../lib/posthog";
import { addContext, filterProperties } from "../lib/privacy-gate";

// Input validation schema
const proxyEventSchema = z.object({
	event: z.string().min(1),
	properties: z.record(z.string(), z.unknown()).optional(),
	distinctId: z.string().optional(),
	timestamp: z.number().optional(),
	userId: z.string().optional(),
	orgId: z.string().optional(),
	version: z.string().optional(),
});

export const proxyEvent = publicProcedure.input(proxyEventSchema).handler(async ({ input }) => {
	try {
		const posthog = getPostHog();

		// Add context to properties
		const propertiesWithContext = addContext(input.properties || {}, {
			userId: input.userId,
			orgId: input.orgId,
			version: input.version,
		});

		// Filter properties through privacy gate
		const filteredProperties = filterProperties(propertiesWithContext);

		// Capture the event
		await posthog.capture({
			distinctId: input.distinctId || input.userId || "anonymous",
			event: input.event,
			properties: filteredProperties,
			timestamp: input.timestamp ? new Date(input.timestamp) : undefined,
		});

		return {
			success: true,
			message: "Event proxied successfully",
		};
	} catch (error) {
		logger.error("Failed to proxy event to PostHog", { error, input });
		throw new Error("Failed to proxy event");
	}
});
