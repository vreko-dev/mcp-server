import { submitFeedback } from "./procedures/submit-feedback";
import { submitNPS } from "./procedures/submit-nps";

export const feedbackRouter = {
	submitFeedback,
	submitNPS,
};

export type FeedbackRouter = typeof feedbackRouter;
