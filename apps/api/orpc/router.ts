import type { RouterClient } from "@orpc/server";
import { adminRouter } from "../modules/admin/router.js";
import { analyticsRouter } from "../modules/analytics/router.js";
import { apiKeysRouter } from "../modules/apikeys/router.js";
import { authRouter } from "../modules/auth/router.js";
import { contactRouter } from "../modules/contact/router.js";
import { cooldownsRouter } from "../modules/cooldowns/cooldowns-router.js";
import { dashboardRouter } from "../modules/dashboard/router.js";
import { extensionRouter } from "../modules/extension/router.js";
import { featureFlagsRouter } from "../modules/feature-flags/router.js";
import { feedbackRouter } from "../modules/feedback/router.js";
import { newsletterRouter } from "../modules/newsletter/router.js";
import { organizationsRouter } from "../modules/organizations/router.js";
import { paymentsRouter } from "../modules/payments/router.js";
import { privacyRouter } from "../modules/privacy/router.js";
import { riskRouter } from "../modules/risk/router.js";
import { rulesRouter } from "../modules/rules/router.js";
import { snapshotsRouter } from "../modules/snapshots/snapshots-router.js";
import { storageRouter } from "../modules/storage/router.js";
import { telemetryRouter } from "../modules/telemetry/router.js";
import { usersRouter } from "../modules/users/router.js";
import { waitlistRouter } from "../modules/waitlist/router.js";
import { publicProcedure } from "./procedures.js";

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
