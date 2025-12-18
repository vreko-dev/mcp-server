/**
 * Pioneer Program API Router
 * Routes for user onboarding, profile management, and action tracking
 */

import { listActions } from "./procedures/actions/list";
import { submitAction } from "./procedures/actions/submit";
import { leaderboard } from "./procedures/leaderboard";
import { me } from "./procedures/me";
import { signup } from "./procedures/signup";
import { updateEmail } from "./procedures/update-email";

export const pioneerRouter = {
	signup,
	me,
	updateEmail,
	leaderboard,
	actions: {
		submit: submitAction,
		list: listActions,
	},
};
