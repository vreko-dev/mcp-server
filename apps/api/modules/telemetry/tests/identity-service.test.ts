import { describe, expect, it, vi, beforeEach } from "vitest";
import { linkUserIdentity } from "../lib/identity-service";

// Mock PostHog client
const mockIdentify = vi.fn();
const mockAlias = vi.fn();
const mockShutdown = vi.fn();

vi.mock("../lib/posthog", () => ({
	getPostHog: () => ({
		identify: mockIdentify,
		alias: mockAlias,
		shutdown: mockShutdown,
	}),
}));

// Mock logger
vi.mock("@snapback/infrastructure", () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

describe("Identity Service (Unit)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should identify a user without calling alias if no anonymousId provided", async () => {
		// GIVEN: distinctId only
		const distinctId = "user_123";
		const props = { plan: "pro" };

		// WHEN: Linking identity
		await linkUserIdentity(distinctId, undefined, props);

		// THEN: Should call posthog.identify but NOT alias
		expect(mockIdentify).toHaveBeenCalledWith({
			distinctId,
			properties: props,
		});
		expect(mockAlias).not.toHaveBeenCalled();
	});

	it("should call alias when anonymousId is present", async () => {
		// GIVEN: Auth ID + Previous Anon ID
		const distinctId = "user_123";
		const anonymousId = "anon_abc";

		// WHEN: Linking identity
		await linkUserIdentity(distinctId, anonymousId);

		// THEN: Should call posthog.alias(auth, anon)
		expect(mockAlias).toHaveBeenCalledWith({
			distinctId,
			alias: anonymousId,
		});
	});

	it("should NOT call alias if distinctId === anonymousId", async () => {
		// GIVEN: Same ID passed
		await linkUserIdentity("user_123", "user_123");

		// THEN: Should skip alias
		expect(mockAlias).not.toHaveBeenCalled();
	});

	it("should throw if PostHog fails", async () => {
		// GIVEN: PostHog throws
		mockIdentify.mockImplementationOnce(() => {
			throw new Error("PostHog Down");
		});

		// WHEN: Linking identity
		// THEN: Should throw
		await expect(linkUserIdentity("user_1")).rejects.toThrow("Failed to link user identity");
	});
});
