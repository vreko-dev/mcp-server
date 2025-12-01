import { trackApiUsageProcedure } from "./procedures/track-api-usage.js";
import { verifyApiKeyProcedure } from "./procedures/verify-api-key.js";

export const authRouter = {
	verifyApiKey: verifyApiKeyProcedure,
	trackApiUsage: trackApiUsageProcedure,
};
