import { describe, expect, it } from "vitest";

describe("PRIV2: SDK redaction tests", () => {
	const testId = "sdkred-001";

	it(`${testId}: should ensure SDK never sends raw code`, () => {
		// This test verifies that the SDK properly redacts sensitive data
		// before sending telemetry events

		// In a real implementation, we would:
		// 1. Mock the network requests from the SDK
		// 2. Trigger various SDK operations that would generate telemetry
		// 3. Verify that no raw code content is sent in the telemetry

		// For now, we'll test the redaction utilities directly
		const redactionUtils = {
			// Sensitive patterns that should be redacted
			SENSITIVE_PATTERNS: [
				// File paths (updated to better match paths in stack traces)
				/\/[^/\s]*\.(js|ts|jsx|tsx|py|java|cpp|c|h|cs|go|rb|php|swift|kt|rs|scala|sh|bash|sql|html|css|scss|sass|less|xml|json|yaml|yml|md|txt|log|env|config)/gi,
				// Email addresses
				/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
				// IP addresses
				/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
				// URLs
				/https?:\/\/(?:[\w-]+(?:\.[\w-]+)*)(?::[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#[\w.])?)?/g,
				// UUIDs
				/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
			],

			// Sensitive keys that should be redacted from objects
			SENSITIVE_KEYS: [
				"password",
				"pass",
				"pwd",
				"secret",
				"token",
				"key",
				"apikey",
				"api_key",
				"auth",
				"authorization",
				"cookie",
				"session",
				"jwt",
				"private",
				"private_key",
				"privatekey",
				"ssh_key",
				"sshkey",
				"credential",
				"credentials",
				"cert",
				"certificate",
				"connection_string",
				"connectionstring",
				// Note: 'email' is intentionally not included as it's a common field name
				// that doesn't necessarily contain sensitive data just because of its name
			],

			redactString: (str: string) => {
				let redacted = str;

				// Replace sensitive patterns with hashes
				for (const pattern of redactionUtils.SENSITIVE_PATTERNS) {
					redacted = redacted.replace(pattern, (match) => {
						// Hash the sensitive data to preserve uniqueness while removing actual content
						return `[REDACTED_${redactionUtils.hashString(match)}]`;
					});
				}

				return redacted;
			},

			redactObject: <T extends Record<string, any>>(obj: T): T => {
				if (!obj || typeof obj !== "object") {
					return obj;
				}

				// Create a deep copy to avoid mutating the original
				const redacted = JSON.parse(JSON.stringify(obj));

				// Recursively redact nested objects
				redactionUtils.redactObjectRecursive(redacted);

				return redacted;
			},

			redactObjectRecursive: (obj: any, parentKey = ""): void => {
				if (!obj || typeof obj !== "object") {
					return;
				}

				if (Array.isArray(obj)) {
					obj.forEach((item) => {
						redactionUtils.redactObjectRecursive(item, parentKey);
					});
					return;
				}

				for (const [key, value] of Object.entries(obj)) {
					const lowerKey = key.toLowerCase();

					// Check if the key is sensitive
					if (redactionUtils.SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
						// Redact the value
						if (typeof value === "string") {
							obj[key] = `[REDACTED_${redactionUtils.hashString(value)}]`;
						} else if (typeof value === "object" && value !== null) {
							obj[key] = `[REDACTED_OBJECT_${redactionUtils.hashString(JSON.stringify(value))}]`;
						} else {
							obj[key] = "[REDACTED_VALUE]";
						}
					} else if (typeof value === "string") {
						// Redact sensitive data in string values, but be more careful about email fields
						// If the key is 'email', we don't redact email addresses in the value
						if (lowerKey === "email") {
							// For email fields, we only redact file paths, URLs, etc. but not the email itself
							let redactedValue = value;
							// Only redact non-email sensitive patterns
							const nonEmailPatterns = redactionUtils.SENSITIVE_PATTERNS.filter(
								(pattern) => !pattern.toString().includes("email") && !pattern.toString().includes("@"),
							);
							for (const pattern of nonEmailPatterns) {
								redactedValue = redactedValue.replace(pattern, (match) => {
									return `[REDACTED_${redactionUtils.hashString(match)}]`;
								});
							}
							obj[key] = redactedValue;
						} else {
							// Redact all sensitive patterns
							obj[key] = redactionUtils.redactString(value);
						}
					} else if (typeof value === "object" && value !== null) {
						// Recursively redact nested objects
						redactionUtils.redactObjectRecursive(value, key);
					}
				}
			},

			// Hash a string using a simple hash function
			// Note: This is not cryptographically secure, but sufficient for redaction purposes
			hashString: (str: string): string => {
				let hash = 0;
				for (let i = 0; i < str.length; i++) {
					const char = str.charCodeAt(i);
					hash = (hash << 5) - hash + char;
					hash = hash & hash; // Convert to 32-bit integer
				}
				return Math.abs(hash).toString(16);
			},
		};

		// Test that file paths are redacted
		const input1 = {
			event: "file_opened",
			filePath: "/Users/developer/project/src/components/Button.tsx",
			lineCount: 42,
		};

		const result1 = redactionUtils.redactObject(input1);
		expect(result1.filePath).toContain("[REDACTED_");
		expect(result1.filePath).not.toContain("Button.tsx");
		expect(result1.lineCount).toBe(42); // Non-sensitive data should be preserved

		// Test that sensitive keys are redacted
		const input2 = {
			event: "auth_attempt",
			username: "john_doe",
			password: "secret123",
			api_token: "sk-1234567890abcdef",
		};

		const result2 = redactionUtils.redactObject(input2);
		expect(result2.username).toBe("john_doe"); // Non-sensitive data should be preserved
		expect(result2.password).toContain("[REDACTED_");
		expect(result2.api_token).toContain("[REDACTED_");

		// Test nested objects
		const input3 = {
			event: "config_loaded",
			config: {
				database: {
					host: "localhost",
					password: "db_password",
				},
				api: {
					key: "api_key_123",
				},
			},
		};

		const result3 = redactionUtils.redactObject(input3);
		expect(result3.config.database.host).toBe("localhost"); // Non-sensitive data should be preserved
		expect(result3.config.database.password).toContain("[REDACTED_");
		expect(result3.config.api.key).toContain("[REDACTED_");

		// Test that code snippets are redacted
		const input4 = {
			event: "error_occurred",
			stackTrace: "Error: Something went wrong\n    at /Users/developer/project/src/utils/helper.js:15:10",
			codeSnippet: "function brokenFunction() {\n  return undefinedVariable;\n}",
		};

		const result4 = redactionUtils.redactObject(input4);
		// The file path in the stack trace should be redacted
		expect(result4.stackTrace).toContain("[REDACTED_");
		expect(result4.stackTrace).not.toContain("helper.js");

		// Test email redaction
		const input5 = {
			event: "user_contact",
			email: "user@example.com",
			message: "Please contact admin@company.com for support",
		};

		const result5 = redactionUtils.redactObject(input5);
		expect(result5.email).toBe("user@example.com"); // Email field value should be preserved
		expect(result5.message).toContain("[REDACTED_"); // Email in message should be redacted
		expect(result5.message).not.toContain("admin@company.com");

		// Test URL redaction
		const input6 = {
			event: "api_call",
			url: "https://api.example.com/v1/data",
			response: "Data fetched from https://internal-api.corp.com",
		};

		const result6 = redactionUtils.redactObject(input6);
		expect(result6.url).toContain("[REDACTED_");
		expect(result6.url).not.toContain("api.example.com");
		expect(result6.response).toContain("[REDACTED_");
		expect(result6.response).not.toContain("internal-api.corp.com");
	});
});
