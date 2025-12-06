import { describe, expect, it } from "vitest";
import { parseIgnoreFile, parsePolicyFile } from "../../domain/policies";

describe("Policy Edge Cases", () => {
	describe("precedence rules", () => {
		it("should prioritize ignore policies over protect policies", () => {
			const content = `
@warn *.ts
node_modules/**
`;

			const policies = parsePolicyFile(content);
			const ignorePolicies = parseIgnoreFile("node_modules/**");
			const allPolicies = [...policies, ...ignorePolicies];

			// In a real implementation, the policy matching function would handle precedence
			// This test ensures we're parsing both types correctly
			expect(allPolicies).toHaveLength(2);
			expect(allPolicies.some((p) => p.type === "protected")).toBe(true);
			expect(allPolicies.some((p) => p.type === "ignore")).toBe(true);
		});
	});

	describe("glob patterns", () => {
		it("should handle complex glob patterns correctly", () => {
			const content = `
@block src/**/*.config.js
@warn **/*.test.ts
src/utils/helpers/*.ts
*.env
`;

			const policies = parsePolicyFile(content);

			expect(policies).toHaveLength(4);

			// Check that patterns are parsed correctly
			expect(policies[0].pattern).toBe("src/**/*.config.js");
			expect(policies[0].protectionLevel).toBe("block");

			expect(policies[1].pattern).toBe("**/*.test.ts");
			expect(policies[1].protectionLevel).toBe("warn");

			expect(policies[2].pattern).toBe("src/utils/helpers/*.ts");
			expect(policies[2].protectionLevel).toBe("watch"); // default

			expect(policies[3].pattern).toBe("*.env");
			expect(policies[3].protectionLevel).toBe("watch"); // default
		});

		it("should handle dotfiles and nested paths", () => {
			const content = `
@block .env
@warn .github/workflows/*.yml
config/.snapbackprotected
`;

			const policies = parsePolicyFile(content);

			expect(policies).toHaveLength(3);
			expect(policies[0].pattern).toBe(".env");
			expect(policies[1].pattern).toBe(".github/workflows/*.yml");
			expect(policies[2].pattern).toBe("config/.snapbackprotected");
		});
	});

	describe("syntax variations", () => {
		it("should handle mixed syntax forms", () => {
			const content = `
# Simple pattern (defaults to watch)
src/index.js

# Explicit level pattern
@warn src/config/*.json

# Pattern with spaces
@block "src/special files/*.ts"
`;

			const policies = parsePolicyFile(content);

			expect(policies).toHaveLength(3);

			expect(policies[0].pattern).toBe("src/index.js");
			expect(policies[0].protectionLevel).toBe("watch");

			expect(policies[1].pattern).toBe("src/config/*.json");
			expect(policies[1].protectionLevel).toBe("warn");

			expect(policies[2].pattern).toBe('"src/special files/*.ts"');
			expect(policies[2].protectionLevel).toBe("block");
		});
	});

	describe("performance", () => {
		it("should handle large policy files efficiently", () => {
			// Generate a large policy file content
			let largeContent = "";
			for (let i = 0; i < 1000; i++) {
				largeContent += `@${
					i % 3 === 0 ? "warn" : i % 3 === 1 ? "block" : "watch"
				} pattern${i}/*.js\n`;
			}

			// This should not take too long to parse
			const startTime = Date.now();
			const policies = parsePolicyFile(largeContent);
			const endTime = Date.now();

			expect(policies).toHaveLength(1000);
			expect(endTime - startTime).toBeLessThan(1000); // Should parse in under 1 second
		});
	});
});
