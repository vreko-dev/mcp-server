import { describe, expect, it } from "vitest";
import { redactEventProperties, redactObject, redactString } from "../src/redaction";

describe("TEL1: Event shapes & redaction", () => {
	const testId1 = "pii-001";
	const testId2 = "pii-002";

	it(`${testId1}: should redact sensitive strings`, () => {
		// Test file paths
		const input1 = "User opened file /Users/john/project/src/index.js";
		const result1 = redactString(input1);
		expect(result1).toContain("REDACTED_");
		expect(result1).not.toContain("/Users/john/project/src/index.js");

		// Test email addresses
		const input2 = "Contact admin@example.com for support";
		const result2 = redactString(input2);
		expect(result2).toContain("REDACTED_");
		expect(result2).not.toContain("admin@example.com");

		// Test URLs
		const input3 = "API call to https://api.example.com/v1/data";
		const result3 = redactString(input3);
		expect(result3).toContain("REDACTED_");
		expect(result3).not.toContain("https://api.example.com/v1/data");

		// Test UUIDs
		const input4 = "Session ID: 550e8400-e29b-41d4-a716-446655440000";
		const result4 = redactString(input4);
		expect(result4).toContain("REDACTED_");
		expect(result4).not.toContain("550e8400-e29b-41d4-a716-446655440000");
	});

	it(`${testId2}: should redact sensitive keys in objects`, () => {
		// Test object with sensitive keys
		const input = {
			event: "user_action",
			password: "secret123",
			api_key: "sk-1234567890abcdef",
			email: "user@example.com",
			data: {
				token: "jwt.token.here",
				nested: {
					secret: "top_secret",
				},
			},
			normal_field: "normal_value",
		};

		const result = redactObject(input);

		// Should preserve non-sensitive fields
		expect(result.event).toBe("user_action");
		expect(result.normal_field).toBe("normal_value");
		expect(result.email).toBe("user@example.com"); // Email in value is not redacted, only email patterns in strings

		// Should redact sensitive keys
		expect(result.password).toContain("REDACTED_");
		expect(result.password).not.toBe("secret123");
		expect(result.api_key).toContain("REDACTED_");
		expect(result.api_key).not.toBe("sk-1234567890abcdef");
		expect(result.data.token).toContain("REDACTED_");
		expect(result.data.token).not.toBe("jwt.token.here");
		expect(result.data.nested.secret).toContain("REDACTED_");
		expect(result.data.nested.secret).not.toBe("top_secret");

		// Should not mutate original object
		expect(input.password).toBe("secret123");
		expect(input.api_key).toBe("sk-1234567890abcdef");
	});

	it("should redact event properties with no raw code", () => {
		// Test event properties that should not contain raw code
		const eventProperties = {
			filePath: "/Users/developer/project/src/components/Button.tsx",
			lineCount: 42,
			functionName: "handleClick",
			codeSnippet: "function handleClick() { console.log('Hello World'); }",
			timestamp: new Date().toISOString(),
		};

		const result = redactEventProperties(eventProperties);

		// Should preserve numeric and safe string values
		expect(result.lineCount).toBe(42);
		expect(result.functionName).toBe("handleClick");

		// Should redact file paths and code snippets
		expect(result.filePath).toContain("REDACTED_");
		expect(result.filePath).not.toBe("/Users/developer/project/src/components/Button.tsx");
		expect(result.codeSnippet).toContain("REDACTED_");
		expect(result.codeSnippet).not.toBe("function handleClick() { console.log('Hello World'); }");
	});
});
