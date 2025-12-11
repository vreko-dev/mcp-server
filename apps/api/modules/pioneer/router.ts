/**
 * Pioneer Program API Router
 * Routes for user onboarding, profile management, and action tracking
 */

import { listActions } from "./procedures/actions/list";
import { submitAction } from "./procedures/actions/submit";
import { me } from "./procedures/me";
import { signup } from "./procedures/signup";

export const pioneerRouter = {
	signup,
	me,
	actions: {
		submit: submitAction,
		list: listActions,
	},
};
