import { getPosition } from "./procedures/get-position";
import { getRecentActivity } from "./procedures/get-recent-activity";
import { getReferrals } from "./procedures/get-referrals";
import { joinWaitlist } from "./procedures/join-waitlist";

export const waitlistRouter = {
	join: joinWaitlist,
	getPosition,
	getReferrals,
	getRecentActivity,
};

// Export types
export type WaitlistRouter = typeof waitlistRouter;
