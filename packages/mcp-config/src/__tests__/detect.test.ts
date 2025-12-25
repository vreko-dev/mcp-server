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

		// Cursor may appear multiple times (project + global level)
		const cursorClients = result.detected.filter((c) => c.name === "cursor");
		expect(cursorClients.length).toBeGreaterThanOrEqual(1);
		expect(cursorClients[0].displayName).toBe("Cursor");
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

		// All clients exist (10+ now), none should have snapback configured
		expect(result.detected.length).toBeGreaterThanOrEqual(10);
		expect(result.detected.every((c) => !c.hasSnapback)).toBe(true);
	});

	it("should detect multiple AI clients", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		// Should detect 10+ clients now (claude, cursor, windsurf, continue, vscode, zed, cline, gemini, aider, roo-code)
		expect(result.detected.length).toBeGreaterThanOrEqual(10);
		expect(result.clients.map((c) => c.name)).toContain("claude");
		expect(result.clients.map((c) => c.name)).toContain("cursor");
		expect(result.clients.map((c) => c.name)).toContain("windsurf");
		expect(result.clients.map((c) => c.name)).toContain("continue");
		expect(result.clients.map((c) => c.name)).toContain("gemini");
		expect(result.clients.map((c) => c.name)).toContain("vscode");
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

		// Claude detected + Cursor may have project + global paths
		expect(result.detected.length).toBeGreaterThanOrEqual(2);
		// Cursor entries need setup (not claude)
		expect(result.needsSetup.every((c) => c.name === "cursor")).toBe(true);
	});

	// =========================================================================
	// NEW TESTS: Coverage for new clients
	// =========================================================================

	it("should detect Gemini/Antigravity when config exists", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".gemini");
		});
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ mcpServers: {} }));

		const result = detectAIClients();

		const geminiClients = result.detected.filter((c) => c.name === "gemini");
		expect(geminiClients.length).toBe(1);
		expect(geminiClients[0].displayName).toBe("Gemini/Antigravity");
	});

	it("should detect VS Code project-level config", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".vscode/mcp.json");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients({ cwd: "/test/project" });

		const vscodeClients = result.detected.filter((c) => c.name === "vscode");
		expect(vscodeClients.length).toBeGreaterThanOrEqual(1);
		expect(vscodeClients[0].configPath).toContain(".vscode/mcp.json");
	});

	it("should detect Aider YAML config with snapback", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".aider");
		});
		vi.mocked(readFileSync).mockReturnValue("servers:\n  - name: snapback\n    command: npx");

		const result = detectAIClients();

		const aiderClients = result.detected.filter((c) => c.name === "aider");
		expect(aiderClients.length).toBe(1);
		expect(aiderClients[0].hasSnapback).toBe(true);
	});

	it("should detect Aider YAML config without snapback", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".aider");
		});
		vi.mocked(readFileSync).mockReturnValue("servers:\n  - name: other\n    command: npx");

		const result = detectAIClients();

		const aiderClients = result.detected.filter((c) => c.name === "aider");
		expect(aiderClients.length).toBe(1);
		expect(aiderClients[0].hasSnapback).toBe(false);
	});

	it("should detect Zed config", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".config/zed");
		});
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: { snapback: { command: "npx" } },
			}),
		);

		const result = detectAIClients();

		const zedClients = result.detected.filter((c) => c.name === "zed");
		expect(zedClients.length).toBe(1);
		expect(zedClients[0].hasSnapback).toBe(true);
	});

	it("should detect Cline config", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".cline");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		const clineClients = result.detected.filter((c) => c.name === "cline");
		expect(clineClients.length).toBe(1);
		expect(clineClients[0].displayName).toBe("Cline");
	});

	it("should detect Roo Code config", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".roo-code");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		const rooClients = result.detected.filter((c) => c.name === "roo-code");
		expect(rooClients.length).toBe(1);
		expect(rooClients[0].displayName).toBe("Roo Code");
	});

	// =========================================================================
	// EDGE CASES
	// =========================================================================

	it("should handle file read permission errors gracefully", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error("EACCES: permission denied");
		});

		const result = detectAIClients();

		// Clients should exist but not be detected as having snapback
		expect(result.detected.length).toBeGreaterThan(0);
		expect(result.detected.every((c) => !c.hasSnapback)).toBe(true);
	});

	it("should handle empty JSON config files", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		expect(result.detected.every((c) => !c.hasSnapback)).toBe(true);
	});

	it("should handle null mcpServers gracefully", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ mcpServers: null }));

		const result = detectAIClients();

		expect(result.detected.every((c) => !c.hasSnapback)).toBe(true);
	});

	it("should use custom cwd for project-level paths", () => {
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes("/custom/workspace/.cursor");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients({ cwd: "/custom/workspace" });

		const cursorProject = result.detected.find((c) => c.configPath.includes("/custom/workspace/.cursor"));
		expect(cursorProject).toBeDefined();
	});

	it("should detect Claude on Windows platform", () => {
		vi.mocked(platform).mockReturnValue("win32");
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes("Claude");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		const claudeClients = result.detected.filter((c) => c.name === "claude");
		expect(claudeClients.length).toBe(1);
	});

	it("should detect Claude on Linux platform", () => {
		vi.mocked(platform).mockReturnValue("linux");
		vi.mocked(existsSync).mockImplementation((path) => {
			return path.toString().includes(".config/Claude");
		});
		vi.mocked(readFileSync).mockReturnValue("{}");

		const result = detectAIClients();

		const claudeClients = result.detected.filter((c) => c.name === "claude");
		expect(claudeClients.length).toBe(1);
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
