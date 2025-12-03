import { describe, expect, it } from "vitest";

describe("SDK Package Smoke Test", () => {
	it("should import the main SDK export", async () => {
		const sdk = await import("../src/index.js");
		expect(sdk).toBeDefined();
	});

	it("should have Snapback class available", async () => {
		const { Snapback } = await import("../src/index.js");
		expect(Snapback).toBeDefined();
		expect(typeof Snapback).toBe("function");
	});

	it("should have expected module structure", () => {
		// Verify core directories exist
		const fs = require("node:fs");
		const path = require("node:path");

		const coreDir = path.join(__dirname, "../src/core");
		expect(fs.existsSync(coreDir)).toBe(true);

		const requiredDirs = ["detection", "session", "risk", "analytics"];
		for (const dir of requiredDirs) {
			const dirPath = path.join(coreDir, dir);
			expect(fs.existsSync(dirPath)).toBe(true);
		}
	});
});
