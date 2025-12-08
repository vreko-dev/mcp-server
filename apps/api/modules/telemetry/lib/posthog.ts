import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHog(): PostHog {
	if (!posthogClient) {
		const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
		if (!posthogKey) {
			throw new Error("PostHog API key not configured");
		}

		posthogClient = new PostHog(posthogKey, {
			host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
		});
	}
	return posthogClient;
}
