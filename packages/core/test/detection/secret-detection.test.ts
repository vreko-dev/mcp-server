import { describe, expect, it } from "vitest";
import { SecretDetectionPlugin } from "../../src/detection/plugins/secret-detection";

describe("SecretDetectionPlugin", () => {
	let plugin: SecretDetectionPlugin;

	beforeEach(() => {
		plugin = new SecretDetectionPlugin();
	});

	// Positive cases (should detect)
	it("should detect AWS access keys (AKIA...)", async () => {
		const code = `
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      const config = {
        accessKeyId: awsKey,
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      };
    `;

		const result = await plugin.analyze(code, "/src/config.ts");
		expect(result.score).toBeGreaterThan(0.7);
		expect(result.severity).toBe("critical");
		expect(result.factors.some((f: string) => f.includes("AWS access key"))).toBe(true);
	});

	it("should detect GitHub tokens (ghp_...)", async () => {
		const code = `
      const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      process.env.GITHUB_TOKEN = githubToken;
    `;

		const result = await plugin.analyze(code, "/src/auth.ts");
		expect(result.score).toBeGreaterThan(0.7);
		expect(result.severity).toBe("critical");
		expect(result.factors.some((f: string) => f.includes("GitHub token"))).toBe(true);
	});

	it("should detect OpenAI API keys (sk-...)", async () => {
		const code = `
      const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const openai = new OpenAI({ apiKey: openaiKey });
    `;

		const result = await plugin.analyze(code, "/src/ai.ts");
		expect(result.score).toBeGreaterThan(0.7);
		expect(result.severity).toBe("critical");
		expect(result.factors.some((f: string) => f.includes("OpenAI API key"))).toBe(true);
	});

	it("should detect JWT tokens", async () => {
		const code = `
      const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      headers.authorization = \`Bearer \${jwtToken}\`;
    `;

		const result = await plugin.analyze(code, "/src/auth.ts");
		expect(result.score).toBeGreaterThan(0.5);
		expect(result.factors.some((f: string) => f.includes("JWT token"))).toBe(true);
	});

	it("should detect private keys", async () => {
		const code = `
      const privateKey = \`-----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...
      -----END PRIVATE KEY-----\`;
    `;

		const result = await plugin.analyze(code, "/src/keys.ts");
		expect(result.score).toBeGreaterThan(0.8);
		expect(result.severity).toBe("critical");
		expect(result.factors.some((f: string) => f.includes("private key"))).toBe(true);
	});

	it("should detect database connection strings", async () => {
		const code = `
      const connectionString = "postgresql://user:password@localhost:5432/mydb";
      const mysqlUrl = "mysql://user:pass@host:3306/database";
    `;

		const result = await plugin.analyze(code, "/src/db.ts");
		expect(result.score).toBeGreaterThan(0.6);
		expect(result.factors.some((f: string) => f.includes("database connection"))).toBe(true);
	});

	it("should detect high entropy strings (>4.5)", async () => {
		const code = `
      const apiKey = "xvKj73nM9pQw2aL8sR5tY1zU6vB4cN3m";
      const secret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
    `;

		const result = await plugin.analyze(code, "/src/config.ts");
		expect(result.score).toBeGreaterThan(0.5);
		expect(result.factors.some((f: string) => f.includes("high entropy"))).toBe(true);
	});

	it("should detect secrets in multiline strings", async () => {
		const code = `
      const config = \`
        AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
        AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      \`;
    `;

		const result = await plugin.analyze(code, "/src/.env");
		expect(result.score).toBeGreaterThan(0.7);
		expect(result.severity).toBe("critical");
	});

	it("should detect secrets in template literals", async () => {
		const code = `
      const apiKey = \`sk-\${process.env.OPENAI_KEY_SUFFIX}\`;
    `;

		const result = await plugin.analyze(code, "/src/ai.ts");
		expect(result.score).toBeGreaterThan(0.3);
	});

	it("should detect concatenated strings", async () => {
		const code = `
      const key = "sk-" + process.env.OPENAI_KEY_PART;
    `;

		const result = await plugin.analyze(code, "/src/ai.ts");
		expect(result.score).toBeGreaterThan(0.3);
	});

	it("should detect base64 encoded secrets", async () => {
		const code = `
      const encodedKey = "c2stMTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=";
    `;

		const result = await plugin.analyze(code, "/src/config.ts");
		expect(result.score).toBeGreaterThan(0.4);
	});

	// Negative cases (should NOT flag)
	it("should NOT flag UUIDs", async () => {
		const code = `
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const requestId = "123e4567-e89b-12d3-a456-426614174000";
    `;

		const result = await plugin.analyze(code, "/src/models.ts");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag timestamps", async () => {
		const code = `
      const timestamp = "2023-01-01T00:00:00.000Z";
      const isoDate = "20230101T000000Z";
    `;

		const result = await plugin.analyze(code, "/src/utils.ts");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag .env.example files", async () => {
		const code = `
      # AWS credentials
      AWS_ACCESS_KEY_ID=your-access-key-id
      AWS_SECRET_ACCESS_KEY=your-secret-access-key
      
      # GitHub token
      GITHUB_TOKEN=your-github-token
    `;

		const result = await plugin.analyze(code, "/src/.env.example");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag test files", async () => {
		const code = `
      const mockApiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz";
      const testToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
    `;

		const result = await plugin.analyze(code, "/src/__tests__/auth.test.ts");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag commented-out secrets", async () => {
		const code = `
      // const awsKey = "AKIAIOSFODNN7EXAMPLE";
      // const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      /*
      const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      */
    `;

		const result = await plugin.analyze(code, "/src/config.ts");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag placeholder values", async () => {
		const code = `
      const awsKey = "<YOUR_AWS_KEY>";
      const githubToken = "YOUR_GITHUB_TOKEN";
      const openaiKey = "{{OPENAI_API_KEY}}";
    `;

		const result = await plugin.analyze(code, "/src/config.ts");
		expect(result.score).toBeLessThan(0.3);
	});

	it("should NOT flag Git-ignored files", async () => {
		const code = `
      const awsKey = "AKIAIOSFODNN7EXAMPLE";
      const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
    `;

		const result = await plugin.analyze(code, "/.env");
		expect(result.score).toBeLessThan(0.3);
	});

	// Edge cases
	it("should handle empty content", async () => {
		const code = "";
		const result = await plugin.analyze(code, "/src/empty.ts");
		expect(result.score).toBe(0);
	});

	it("should handle whitespace-only content", async () => {
		const code = "   \n\t  \n  ";
		const result = await plugin.analyze(code, "/src/whitespace.ts");
		expect(result.score).toBe(0);
	});

	it("should handle very large files efficiently", async () => {
		const code = "a".repeat(100000); // 100KB of 'a'

		const start = performance.now();
		const result = await plugin.analyze(code, "/src/large.ts");
		const duration = performance.now() - start;

		// Should complete within performance budget
		expect(duration).toBeLessThan(200); // P95 budget from spec
		expect(result).toBeDefined();
	});

	// Performance tests
	it("should analyze 1MB files without timeout", async () => {
		const code = "a".repeat(1000000); // 1MB of 'a'

		const start = performance.now();
		const result = await plugin.analyze(code, "/src/very-large.ts");
		const duration = performance.now() - start;

		// Should handle large files (may take longer but not timeout)
		expect(duration).toBeLessThan(1000); // 1 second max
		expect(result).toBeDefined();
	});

	it("should analyze files with multiple secrets efficiently", async () => {
		const code = `
			const awsKey1 = "AKIAIOSFODNN7EXAMPLE";
			const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
			const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			const privateKey = \`-----BEGIN PRIVATE KEY-----
			MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...
			-----END PRIVATE KEY-----\`;
			const connectionString = "postgresql://user:password@localhost:5432/mydb";
		`;

		const start = performance.now();
		const result = await plugin.analyze(code, "/src/multi-secret.ts");
		const duration = performance.now() - start;

		// Should detect multiple secrets efficiently
		expect(duration).toBeLessThan(100); // Fast detection
		expect(result.score).toBeGreaterThan(0.8); // High confidence with multiple secrets
		expect(result.severity).toBe("critical");
	});
});
