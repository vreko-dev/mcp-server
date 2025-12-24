/**
 * AI Client Detection Tests
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { detectAIClients, getClient, getClientConfigPath, getConfiguredClients } from "../detect.js";

// Mock node:fs and node:os
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/Users/test"),
	platform: vi.fn(() => "darwin"),
}));

describe("detectAIClients", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should detect Claude Desktop when config exists on macOS", () => {
		vi.mocked(platform).mockReturnValue("darwin");
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes("Claude");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		expect(result.detected).toHaveLength(1);
		expect(result.detected[0].name).toBe("claude");
		expect(result.detected[0].displayName).toBe("Claude Desktop");
		expect(result.detected[0].hasSnapback).toBe(false);
	});

	it("should detect Cursor when config exists", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".cursor");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		expect(result.detected).toHaveLength(1);
		expect(result.detected[0].name).toBe("cursor");
		expect(result.detected[0].displayName).toBe("Cursor");
	});

	it("should detect existing SnapBack configuration", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockImplementation((path) => {
			// Continue uses different format
			if (path.toString().includes(".continue")) {
				return JSON.stringify({
					experimental: {
						modelContextProtocolServers: [{ name: "snapback", command: "npx" }],
					},
				});
			}
			// Standard mcpServers format for claude/cursor/windsurf
			return JSON.stringify({
				mcpServers: {
					snapback: { command: "npx", args: ["-y", "@snapback/mcp-server"] },
				},
			});
		});

		const result = detectAIClients();

		// All detected clients should have snapback configured
		expect(result.detected.every((c) => c.hasSnapback)).toBe(true);
		expect(result.needsSetup).toHaveLength(0);
	});

	it("should handle missing config files gracefully", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const result = detectAIClients();

		expect(result.detected).toHaveLength(0);
		expect(result.needsSetup).toHaveLength(0);
	});

	it("should handle invalid JSON gracefully", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("invalid json {{{");

		const result = detectAIClients();

		expect(result.detected).toHaveLength(4); // All 4 clients exist
		expect(result.detected.every((c) => !c.hasSnapback)).toBe(true);
	});

	it("should detect multiple AI clients", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		expect(result.detected).toHaveLength(4); // claude, cursor, windsurf, continue
		expect(result.clients.map((c) => c.name)).toContain("claude");
		expect(result.clients.map((c) => c.name)).toContain("cursor");
		expect(result.clients.map((c) => c.name)).toContain("windsurf");
		expect(result.clients.map((c) => c.name)).toContain("continue");
	});

	it("should correctly identify needsSetup clients", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			// Only Claude and Cursor exist
			return path.toString().includes("Claude") || path.toString().includes(".cursor");
		});
		vi.mocked(readFileSync).mockImplementation((path) => {
			// Only Claude has SnapBack configured
			if (path.toString().includes("Claude")) {
				return JSON.stringify({
					mcpServers: { snapback: { command: "npx" } },
				});
			}
			return "{}";
		});

		const result = detectAIClients();

		expect(result.detected).toHaveLength(2);
		expect(result.needsSetup).toHaveLength(1);
		expect(result.needsSetup[0].name).toBe("cursor");
	});
});

describe("getClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return client config when client exists", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".cursor");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const client = getClient("cursor");

		expect(client).toBeDefined();
		expect(client?.name).toBe("cursor");
	});

	it("should return undefined when client does not exist", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const client = getClient("cursor");

		expect(client).toBeUndefined();
	});
});

describe("getConfiguredClients", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return only clients with SnapBack configured", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockImplementation((path) => {
			if (path.toString().includes("Claude")) {
				return JSON.stringify({
					mcpServers: { snapback: { command: "npx" } },
				});
			}
			return "{}";
		});

		const configured = getConfiguredClients();

		expect(configured).toHaveLength(1);
		expect(configured[0].name).toBe("claude");
	});
});

describe("getClientConfigPath", () => {
	it("should return correct path for known clients", () => {
		vi.mocked(homedir).mockReturnValue("/Users/test");

		expect(getClientConfigPath("cursor")).toBe("/Users/test/.cursor/mcp.json");
		expect(getClientConfigPath("windsurf")).toBe("/Users/test/.codeium/windsurf/mcp_config.json");
	});

	it("should return undefined for unknown clients", () => {
		expect(getClientConfigPath("unknown-client")).toBeUndefined();
	});

	it("should return macOS path for Claude on darwin", () => {
		vi.mocked(platform).mockReturnValue("darwin");
		vi.mocked(homedir).mockReturnValue("/Users/test");

		const path = getClientConfigPath("claude");
		expect(path).toContain("Library/Application Support/Claude");
	});
});
