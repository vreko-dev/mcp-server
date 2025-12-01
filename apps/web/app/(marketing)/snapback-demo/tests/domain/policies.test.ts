import { describe, expect, it } from "vitest";
import {
	combinePolicies,
	parseIgnoreFile,
	parsePolicyFile,
	parseSnapbackRc,
} from "../../domain/policies";

describe("Policies Domain Functions", () => {
	describe("parsePolicyFile", () => {
		it("should parse protected file patterns", () => {
			const content = `
# Protected files
@warn *.ts
@block src/config/*.json
src/database/migrations/*.sql
`;

			const policies = parsePolicyFile(content);

			expect(policies).toHaveLength(3);

			expect(policies[0]).toEqual({
				pattern: "*.ts",
				protectionLevel: "warn",
				type: "protected",
			});

			expect(policies[1]).toEqual({
				pattern: "src/config/*.json",
				protectionLevel: "block",
				type: "protected",
			});

			expect(policies[2]).toEqual({
				pattern: "src/database/migrations/*.sql",
				protectionLevel: "watch", // default level
				type: "protected",
			});
		});

		it("should skip comments and empty lines", () => {
			const content = `
# This is a comment

@warn *.ts

# Another comment
src/index.js
`;

			const policies = parsePolicyFile(content);

			expect(policies).toHaveLength(2);
			expect(policies[0].pattern).toBe("*.ts");
			expect(policies[1].pattern).toBe("src/index.js");
		});
	});

	describe("parseIgnoreFile", () => {
		it("should parse ignore patterns", () => {
			const content = `
# Ignored files
node_modules/
.git/
*.log
`;

			const policies = parseIgnoreFile(content);

			expect(policies).toHaveLength(3);

			expect(policies[0]).toEqual({
				pattern: "node_modules/",
				protectionLevel: "unprotected",
				type: "ignore",
			});

			expect(policies[1]).toEqual({
				pattern: ".git/",
				protectionLevel: "unprotected",
				type: "ignore",
			});

			expect(policies[2]).toEqual({
				pattern: "*.log",
				protectionLevel: "unprotected",
				type: "ignore",
			});
		});
	});

	describe("combinePolicies", () => {
		it("should combine multiple policy sets", () => {
			const policySet1 = [
				{
					pattern: "*.ts",
					protectionLevel: "warn",
					type: "protected",
				},
			];

			const policySet2 = [
				{
					pattern: "*.js",
					protectionLevel: "block",
					type: "protected",
				},
			];

			const combined = combinePolicies(policySet1, policySet2);

			expect(combined).toHaveLength(2);
			expect(combined[0].pattern).toBe("*.ts");
			expect(combined[1].pattern).toBe("*.js");
		});

		it("should override policies with the same pattern", () => {
			const policySet1 = [
				{
					pattern: "*.ts",
					protectionLevel: "warn",
					type: "protected",
				},
			];

			const policySet2 = [
				{
					pattern: "*.ts",
					protectionLevel: "block",
					type: "protected",
				},
			];

			const combined = combinePolicies(policySet1, policySet2);

			expect(combined).toHaveLength(1);
			expect(combined[0].protectionLevel).toBe("block");
		});
	});

	describe("parseSnapbackRc", () => {
		it("should parse hat sections into policies", () => {
			const content = `
# .snapbackrc
hats:
  critical:
    - "*.env*"
  protected:
    - "src/**/*.ts"
  watched:
    - "*.md"
`;

			const policies = parseSnapbackRc(content);
			expect(policies).toHaveLength(3);
			const criticalPolicy = policies.find((p) => p.pattern === "*.env*");
			const protectedPolicy = policies.find((p) => p.pattern === "src/**/*.ts");
			const watchedPolicy = policies.find((p) => p.pattern === "*.md");

			expect(criticalPolicy?.protectionLevel).toBe("block");
			expect(protectedPolicy?.protectionLevel).toBe("warn");
			expect(watchedPolicy?.protectionLevel).toBe("watch");
		});

		it("should parse rule entries with explicit hats", () => {
			const content = `
rules:
  - pattern: "migrations/*.sql"
    hat: critical
  - pattern: "docs/**/*.md"
    hat: watched
`;

			const policies = parseSnapbackRc(content);
			expect(policies).toHaveLength(2);
			expect(policies[0].pattern).toBe("migrations/*.sql");
			expect(policies[0].protectionLevel).toBe("block");
			expect(policies[1].protectionLevel).toBe("watch");
		});
	});
});
