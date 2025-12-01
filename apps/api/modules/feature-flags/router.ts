import { getUserFlags } from "./procedures/get-user-flags";

export const featureFlagsRouter = {
	getUserFlags,
};

// Export types
export type FeatureFlagsRouter = typeof featureFlagsRouter;
