import { ORPCError } from "@orpc/server";
import { getOrganizationById } from "@snapback/platform";
import { z } from "zod";
import { getPresignedUploadUrl, isS3Configured } from "@/lib/s3-client";
import { protectedProcedure } from "@/orpc/procedures";
import { verifyOrganizationMembership } from "../lib/membership";

export const createLogoUploadUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/organizations/logo-upload-url",
		tags: ["Organizations"],
		summary: "Create logo upload URL",
		description:
			"Create a signed upload URL to upload an logo image to the storage bucket",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(
		async ({
			context: { user: sessionUser },
			input: { organizationId },
		}: {
			context: { user: { id: string; email: string; name?: string } };
			input: { organizationId: string };
		}) => {
			const organization = await getOrganizationById(organizationId);

			if (!organization) {
				throw new ORPCError("BAD_REQUEST");
			}

			const membership = await verifyOrganizationMembership(
				organizationId,
				sessionUser.id,
			);

			if (!membership) {
				throw new ORPCError("FORBIDDEN");
			}

			if (!isS3Configured()) {
				throw new ORPCError("SERVICE_UNAVAILABLE", {
					message: "Logo uploads not configured - S3 credentials required",
				});
			}

			const path = `logos/${organizationId}.png`;

			const signedUploadUrl = await getPresignedUploadUrl(path, {
				contentType: "image/png",
				expiresIn: 300, // 5 minutes
			});

			return {
				signedUploadUrl,
				path,
				expiresAt: Date.now() + 300000, // 5 minutes from now
			};
		},
	);
