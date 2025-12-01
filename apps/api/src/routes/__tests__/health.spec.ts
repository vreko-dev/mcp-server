import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import healthRoute from "../health";

describe("GET /health", () => {
	it("should return health status", async () => {
		// Create a new Hono app and mount the health route
		const app = new Hono();
		app.route("/api/health", healthRoute);

		const req = new Request("http://localhost:3000/api/health", {
			method: "GET",
		});

		const res = await app.request(req);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(body.service).toBe("snapback-api");
		expect(body.timestamp).toBeDefined();
	});
});
