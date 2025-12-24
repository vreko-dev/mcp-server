/**
 * MCP Config Writer Tests
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AIClientConfig } from "../types.js";
import { getSnapbackMCPConfig, removeSnapbackConfig, validateConfig, writeClientConfig } from "../write.js";

// Mock node:fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

describe("getSnapbackMCPConfig", () => {
	it("should generate basic npx config by default", () => {
		const config = getSnapbackMCPConfig({});

		expect(config.command).toBe("npx");
		expect(config.args).toEqual(["-y", "@snapback/mcp-server"]);
		expect(config.env).toBeUndefined();
	});

	it("should include API key in env when provided", () => {
		const config = getSnapbackMCPConfig({ apiKey: "sk_test_123" });

		expect(config.env).toEqual({ SNAPBACK_API_KEY: "sk_test_123" });
	});

	it("should use binary when useBinary is true", () => {
		const config = getSnapbackMCPConfig({ useBinary: true });

		expect(config.command).toBe("snapback-mcp");
		expect(config.args).toEqual([]);
	});

	it("should use custom command when provided", () => {
		const config = getSnapbackMCPConfig({ customCommand: "/usr/local/bin/snapback" });

		expect(config.command).toBe("/usr/local/bin/snapback");
		expect(config.args).toEqual([]);
	});

	it("should merge additional env variables", () => {
		const config = getSnapbackMCPConfig({
			apiKey: "sk_test",
			additionalEnv: { DEBUG: "true", CUSTOM_VAR: "value" },
		});

		expect(config.env).toEqual({
			DEBUG: "true",
			CUSTOM_VAR: "value",
			SNAPBACK_API_KEY: "sk_test",
		});
	});
});

describe("writeClientConfig", () => {
	const mockClient: AIClientConfig = {
		name: "cursor",
		displayName: "Cursor",
		configPath: "/Users/test/.cursor/mcp.json",
		exists: true,
		hasSnapback: false,
		format: "cursor",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should create config directory if it does not exist", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		writeClientConfig(mockClient, { command: "npx", args: [] });

		expect(mkdirSync).toHaveBeenCalledWith("/Users/test/.cursor", { recursive: true });
	});

	it("should merge with existing config", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: {
					other: { command: "other-command" },
				},
			}),
		);

		writeClientConfig(mockClient, { command: "npx", args: ["-y", "@snapback/mcp-server"] });

		expect(writeFileSync).toHaveBeenCalled();
		const writtenContent = JSON.parse(vi.mocked(writeFileSync).mock.calls[1][1] as string);
		expect(writtenContent.mcpServers.other).toBeDefined();
		expect(writtenContent.mcpServers.snapback).toBeDefined();
	});

	it("should create backup of existing config", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ existing: true }));

		const result = writeClientConfig(mockClient, { command: "npx" });

		expect(result.success).toBe(true);
		expect(result.backup).toMatch(/\.backup\.\d+$/);
		expect(writeFileSync).toHaveBeenCalledTimes(2); // Backup + new config
	});

	it("should not create backup for empty/new config", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const result = writeClientConfig(mockClient, { command: "npx" });

		expect(result.success).toBe(true);
		expect(result.backup).toBeUndefined();
	});

	it("should return error on write failure", () => {
		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(writeFileSync).mockImplementation(() => {
			throw new Error("Permission denied");
		});

		const result = writeClientConfig(mockClient, { command: "npx" });

		expect(result.success).toBe(false);
		expect(result.error).toBe("Permission denied");
	});

	it("should handle Continue format differently", () => {
		const continueClient: AIClientConfig = {
			...mockClient,
			name: "continue",
			format: "continue",
			configPath: "/Users/test/.continue/config.json",
		};

		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ experimental: {} }));

		writeClientConfig(continueClient, { command: "npx", args: [] });

		const writtenContent = JSON.parse(vi.mocked(writeFileSync).mock.calls[1][1] as string);
		expect(writtenContent.experimental.modelContextProtocolServers).toBeDefined();
		expect(writtenContent.experimental.modelContextProtocolServers[0].name).toBe("snapback");
	});
});

describe("removeSnapbackConfig", () => {
	const mockClient: AIClientConfig = {
		name: "cursor",
		displayName: "Cursor",
		configPath: "/Users/test/.cursor/mcp.json",
		exists: true,
		hasSnapback: true,
		format: "cursor",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should remove snapback from mcpServers", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: {
					snapback: { command: "npx" },
					other: { command: "other" },
				},
			}),
		);

		const result = removeSnapbackConfig(mockClient);

		expect(result.success).toBe(true);
		const writtenContent = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
		expect(writtenContent.mcpServers.snapback).toBeUndefined();
		expect(writtenContent.mcpServers.other).toBeDefined();
	});

	it("should succeed if config file does not exist", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const result = removeSnapbackConfig(mockClient);

		expect(result.success).toBe(true);
		expect(writeFileSync).not.toHaveBeenCalled();
	});

	it("should handle errors gracefully", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error("File read error");
		});

		const result = removeSnapbackConfig(mockClient);

		expect(result.success).toBe(false);
		expect(result.error).toBe("File read error");
	});
});

describe("validateConfig", () => {
	const mockClient: AIClientConfig = {
		name: "cursor",
		displayName: "Cursor",
		configPath: "/Users/test/.cursor/mcp.json",
		exists: true,
		hasSnapback: true,
		format: "cursor",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return true for valid config", () => {
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: {
					snapback: { command: "npx", args: ["-y", "@snapback/mcp-server"] },
				},
			}),
		);

		expect(validateConfig(mockClient)).toBe(true);
	});

	it("should return false if snapback is missing", () => {
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: {},
			}),
		);

		expect(validateConfig(mockClient)).toBe(false);
	});

	it("should return false if command is missing", () => {
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				mcpServers: {
					snapback: { args: [] },
				},
			}),
		);

		expect(validateConfig(mockClient)).toBe(false);
	});

	it("should return false on read error", () => {
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error("File not found");
		});

		expect(validateConfig(mockClient)).toBe(false);
	});
});
