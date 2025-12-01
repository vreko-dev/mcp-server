/**
 * Redaction utilities for telemetry events
 * Ensures no sensitive data (raw code, file contents, etc.) is sent in telemetry
 */

// Sensitive patterns that should be redacted
const SENSITIVE_PATTERNS = [
	// File paths
	/\/[^/\s]*\.(js|ts|jsx|tsx|py|java|cpp|c|h|cs|go|rb|php|swift|kt|rs|scala|sh|bash|sql|html|css|scss|sass|less|xml|json|yaml|yml|md|txt|log|env|config)(?=\s|$)/gi,
	// Email addresses
	/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
	// IP addresses
	/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
	// URLs
	/https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?/g,
	// UUIDs
	/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
];

// Sensitive keys that should be redacted from objects
const SENSITIVE_KEYS = [
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
];

/**
 * Redact sensitive data from a string
 */
export function redactString(str: string): string {
	let redacted = str;

	// Replace sensitive patterns with hashes
	for (const pattern of SENSITIVE_PATTERNS) {
		redacted = redacted.replace(pattern, (match) => {
			// Hash the sensitive data to preserve uniqueness while removing actual content
			return `REDACTED_${hashString(match)}`;
		});
	}

	return redacted;
}

/**
 * Redact sensitive data from an object
 */
export function redactObject<T extends Record<string, any>>(obj: T): T {
	if (!obj || typeof obj !== "object") {
		return obj;
	}

	// Create a deep copy to avoid mutating the original
	const redacted = structuredClone(obj) as T;

	// Recursively redact nested objects
	redactObjectRecursive(redacted);

	return redacted;
}

/**
 * Recursively redact sensitive data from an object
 */
function redactObjectRecursive(obj: any, parentKey = ""): void {
	if (!obj || typeof obj !== "object") {
		return;
	}

	if (Array.isArray(obj)) {
		obj.forEach((item) => redactObjectRecursive(item, parentKey));
		return;
	}

	for (const [key, value] of Object.entries(obj)) {
		const lowerKey = key.toLowerCase();

		// Check if the key is sensitive
		if (SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
			// Redact the value
			if (typeof value === "string") {
				obj[key] = `REDACTED_${hashString(value)}`;
			} else if (typeof value === "object" && value !== null) {
				obj[key] = `REDACTED_OBJECT_${hashString(JSON.stringify(value))}`;
			} else {
				obj[key] = "REDACTED_VALUE";
			}
		} else if (typeof value === "string") {
			// Redact sensitive data in string values, but be more careful about email fields
			// If the key is 'email', we don't redact email addresses in the value
			if (lowerKey === "email") {
				// For email fields, we only redact file paths, URLs, etc. but not the email itself
				let redactedValue = value;
				// Only redact non-email sensitive patterns
				const nonEmailPatterns = SENSITIVE_PATTERNS.filter(
					(pattern) => !pattern.toString().includes("email") && !pattern.toString().includes("@"),
				);
				for (const pattern of nonEmailPatterns) {
					redactedValue = redactedValue.replace(pattern, (match) => {
						return `REDACTED_${hashString(match)}`;
					});
				}
				obj[key] = redactedValue;
			} else {
				// Redact all sensitive patterns
				obj[key] = redactString(value);
			}
		} else if (typeof value === "object" && value !== null) {
			// Recursively redact nested objects
			redactObjectRecursive(value, key);
		}
	}
}

/**
 * Hash a string using a simple hash function
 * Note: This is not cryptographically secure, but sufficient for redaction purposes
 */
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(16);
}

/**
 * Redact event properties to ensure no sensitive data is sent
 */
export function redactEventProperties<T extends Record<string, any>>(properties: T): T {
	// Create a deep copy to avoid mutating the original
	const redacted = structuredClone(properties) as T;

	// Redact sensitive patterns in all string values
	redactObjectRecursive(redacted);

	// Additionally, for event properties, we want to redact any code snippets or file contents
	// that might be in the values, even if the key isn't explicitly sensitive
	for (const [key, value] of Object.entries(redacted)) {
		if (typeof value === "string") {
			// If this looks like code or file content, redact it completely
			if (isLikelyCodeOrFileContent(value)) {
				(redacted as Record<string, any>)[key] = `REDACTED_${hashString(value)}`;
			}
		}
	}

	return redacted;
}

/**
 * Check if a string is likely to be code or file content
 */
function isLikelyCodeOrFileContent(str: string): boolean {
	// Check for common code patterns
	const codePatterns = [
		/function\s+\w*\s*\([^)]*\)\s*\{/, // function declarations
		/=>\s*\{/, // arrow functions
		/^\s*[{[]/, // JSON-like structures
		/import\s+/, // import statements
		/export\s+/, // export statements
		/class\s+\w+/, // class declarations
		/if\s*\([^)]*\)\s*\{/, // if statements
		/for\s*\([^)]*\)\s*\{/, // for loops
		/while\s*\([^)]*\)\s*\{/, // while loops
		/console\.(log|error|warn)/, // console statements
	];

	return codePatterns.some((pattern) => new RegExp(pattern).test(str));
}
