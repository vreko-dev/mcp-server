import { ORPCError } from "@orpc/client";
import { member } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

export const getById = protectedProcedure
	.route({
		method: "GET",
		path: "/organizations/:id",
		tags: ["Organizations"],
		summary: "Get organization by ID",
		description: "Retrieve organization details by organization ID",
	})
	.input(
		z.object({
			id: z.string().describe("Organization ID"),
		}),
	)
	.handler(async ({ input: { id }, context: _context }) => {
		try {
			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Database not available",
				});
			}

			const organization = await getDb().query.organization.findFirst({
				where: (org, { eq }) => eq(org.id, id),
			});

			if (!organization) {
				throw new ORPCError("NOT_FOUND", {
					message: "Organization not found",
				});
			}

			// Authorization check: verify user has access to this organization
			const userId = _context.user?.id;
			if (!userId) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "User not authenticated",
				});
			}

			// Check if user is a member of the organization
			const membership = await getDb()
				.select()
				.from(member)
				.where(and(eq(member.organizationId, id), eq(member.userId, userId)))
				.limit(1);

			if (!membership || membership.length === 0) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have access to this organization",
				});
			}

			return organization;
		} catch (error) {
			if (error instanceof ORPCError) {
				throw error;
			}
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
