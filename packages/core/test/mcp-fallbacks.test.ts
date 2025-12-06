import { describe, expect, it } from "vitest";
import { MCPFallbacks } from "../src/mcp-fallbacks";

describe("MCPFallbacks", () => {
	it("should provide fallback for docs MCP", () => {
		const result = MCPFallbacks.docsFallback("test query");
		expect(result).toContain("Local documentation search result for: test query");
	});

	it("should provide fallback for git MCP", () => {
		const result = MCPFallbacks.gitFallback("git diff");
		expect(result).toContain("Local git command result for: git diff");
	});

	it("should provide fallback for filesystem MCP", () => {
		const result = MCPFallbacks.fsFallback("read", "/path/to/file");
		expect(result).toContain("Local filesystem operation result for read on /path/to/file");
	});

	it("should provide fallback for search MCP", () => {
		const result = MCPFallbacks.searchFallback("function call");
		expect(result).toContain("Local code search result for: function call");
	});

	it("should provide fallback for registry MCP", () => {
		const result = MCPFallbacks.registryFallback("lodash");
		expect(result).toContain("Local registry info for package: lodash");
	});

	it("should provide fallback for CI MCP", () => {
		const result = MCPFallbacks.ciFallback("run tests");
		expect(result).toContain("Local CI operation result for: run tests");
	});

	it("should provide fallback for security MCP", () => {
		const result = MCPFallbacks.secFallback("src/");
		expect(result).toContain("Local security scan result for: src/");
	});

	it("should provide fallback for issue MCP", () => {
		const result = MCPFallbacks.issueFallback("create ticket");
		expect(result).toContain("Local issue tracking result for: create ticket");
	});
});
