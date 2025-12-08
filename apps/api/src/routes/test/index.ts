/**
 * Test-Only API Routes
 * These endpoints are ONLY available when NODE_ENV=test
 * Used by E2E tests to control server state
 */

import { Hono } from "hono";
import { fastForward, getTimeOffset, resetTime } from "../../test-utils/time-control";

const testRoutes = new Hono();

// Guard: Only allow in test environment
testRoutes.use("*", async (c, next) => {
	if (process.env.NODE_ENV !== "test") {
		return c.json({ error: "Test endpoints are only available in test mode" }, 404);
	}
	await next();
});

/**
 * POST /api/test/time/fast-forward
 * Fast-forward server time by specified milliseconds
 *
 * Body: { ms: number }
 */
testRoutes.post("/time/fast-forward", async (c) => {
	const { ms } = await c.req.json();

	if (typeof ms !== "number" || ms < 0) {
		return c.json({ error: "Invalid ms parameter" }, 400);
	}

	fastForward(ms);

	return c.json({
		success: true,
		newOffset: getTimeOffset(),
		message: `Time advanced by ${ms}ms`,
	});
});

/**
 * POST /api/test/time/reset
 * Reset server time offset to 0
 */
testRoutes.post("/time/reset", async (c) => {
	resetTime();

	return c.json({
		success: true,
		offset: getTimeOffset(),
		message: "Time offset reset to 0",
	});
});

/**
 * GET /api/test/time/offset
 * Get current time offset for debugging
 */
testRoutes.get("/time/offset", async (c) => {
	return c.json({
		offset: getTimeOffset(),
		serverTime: Date.now(),
		testableTime: Date.now() + getTimeOffset(),
	});
});

export { testRoutes };
