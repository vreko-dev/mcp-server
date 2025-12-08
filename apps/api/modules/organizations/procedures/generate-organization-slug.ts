import { ORPCError } from "@orpc/client";
import { generateOrganizationSlug as generateOrganizationSlugQuery } from "@snapback/platform";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";

export const generateOrganizationSlug = publicProcedure
	.route({
		method: "GET",
		path: "/organizations/generate-slug",
		tags: ["Organizations"],
		summary: "Generate organization slug",
		description: "Generate a unique slug from an organization name",
	})
	.input(
		z.object({
			name: z.string(),
		}),
	)
	.handler(async ({ input: { name } }: { input: { name: string } }) => {
		try {
			const slug = await generateOrganizationSlugQuery(name);
			return { slug };
		} catch (_error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
