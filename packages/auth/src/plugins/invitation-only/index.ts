// import { config } from "@snapback/config"; // TODO(REPO-001): Update when config export is available
import { getPendingInvitationByEmail } from "@snapback/platform/db/queries";
import type { BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import { createAuthMiddleware } from "better-auth/plugins";

// Temporary config until @snapback/config is fixed
const config = {
	auth: {
		enableSignup: process.env.ENABLE_SIGNUP !== "false",
	},
};

export const invitationOnlyPlugin = () =>
	({
		id: "invitationOnlyPlugin",
		hooks: {
			before: [
				{
					matcher: (context) => context.path.startsWith("/sign-up/email"),
					handler: createAuthMiddleware(async (ctx) => {
						if (config.auth.enableSignup) {
							return;
						}

						const { email } = ctx.body;

						// check if there is an invitation for the email
						const hasInvitation = await getPendingInvitationByEmail(email);

						if (!hasInvitation) {
							throw new APIError("BAD_REQUEST", {
								code: "INVALID_INVITATION",
								message: "No invitation found for this email",
							});
						}
					}),
				},
			],
		},
		$ERROR_CODES: {
			INVALID_INVITATION: "No invitation found for this email",
		},
	}) satisfies BetterAuthPlugin;
