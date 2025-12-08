import { ORPCError } from "@orpc/client";
import { getOrganizationById } from "@snapback/platform";
import { z } from "zod";
import { adminProcedure } from "@/orpc/procedures";

export const findOrganization = adminProcedure
	.route({
		method: "GET",
		path: "/admin/organizations/{id}",
		tags: ["Administration"],
		summary: "Find organization by ID",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input: { id } }) => {
		const organization = await getOrganizationById(id);

		if (!organization) {
			throw new ORPCError("NOT_FOUND");
		}

		return organization;
	});
