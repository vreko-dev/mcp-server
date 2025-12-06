import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router";
import { analyticsRouter } from "../modules/analytics/router";
import { apiKeysRouter } from "../modules/apikeys/router";
import { authRouter } from "../modules/auth/router";
import { contactRouter } from "../modules/contact/router";
import { cooldownsRouter } from "../modules/cooldowns/cooldowns-router";
import { dashboardRouter } from "../modules/dashboard/router";
import { deviceAuthRouter } from "../modules/device-auth/router";
import { extensionRouter } from "../modules/extension/router";
import { featureFlagsRouter } from "../modules/feature-flags/router";
import { feedbackRouter } from "../modules/feedback/router";
import { newsletterRouter } from "../modules/newsletter/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { privacyRouter } from "../modules/privacy/router";
import { riskRouter } from "../modules/risk/router";
import { rulesRouter } from "../modules/rules/router";
import { snapshotsRouter } from "../modules/snapshots/snapshots-router";
import { storageRouter } from "../modules/storage/router";
import { telemetryRouter } from "../modules/telemetry/router";
import { usersRouter } from "../modules/users/router";
import { waitlistRouter } from "../modules/waitlist/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure
	// Prefix for openapi
	.prefix("/api")
	.router({
		admin: adminRouter,
		analytics: analyticsRouter,
		newsletter: newsletterRouter,
		contact: contactRouter,
		organizations: organizationsRouter,
		users: usersRouter,
		payments: paymentsRouter,
		apiKeys: apiKeysRouter,
		auth: authRouter,
		deviceAuth: deviceAuthRouter,
		snapshots: snapshotsRouter,
		storage: storageRouter,
		dashboard: dashboardRouter,
		risk: riskRouter,
		rules: rulesRouter,
		telemetry: telemetryRouter,
		privacy: privacyRouter,
		cooldowns: cooldownsRouter,
		extension: extensionRouter,
		featureFlags: featureFlagsRouter,
		feedback: feedbackRouter,
		waitlist: waitlistRouter,
	});

export type ApiRouterClient = RouterClient<typeof router>;
