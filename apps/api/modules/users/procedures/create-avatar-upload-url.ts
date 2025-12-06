import { ORPCError } from "@orpc/server";
import { getPresignedUploadUrl, isS3Configured } from "../../../lib/s3-client";
import { protectedProcedure } from "../../../orpc/procedures";

export const createAvatarUploadUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/users/avatar-upload-url",
		tags: ["Users"],
		summary: "Create avatar upload URL",
		description:
			"Create a signed upload URL to upload an avatar image to the storage bucket",
	})
	.handler(async ({ context: { user } }) => {
		if (!isS3Configured()) {
			throw new ORPCError("SERVICE_UNAVAILABLE", {
				message: "Avatar uploads not configured - S3 credentials required",
			});
		}

		const path = `avatars/${user.id}.png`;

		const signedUploadUrl = await getPresignedUploadUrl(path, {
			contentType: "image/png",
			expiresIn: 300, // 5 minutes
		});

		return {
			signedUploadUrl,
			path,
			expiresAt: Date.now() + 300000, // 5 minutes from now
		};
	});
