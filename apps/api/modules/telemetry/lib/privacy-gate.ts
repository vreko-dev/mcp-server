/**
 * Privacy Gate for Telemetry Events
 *
 * Filters out sensitive data and PII from telemetry events before sending to PostHog
 */

// Allow-listed property keys that are safe to send
const ALLOWED_PROPERTIES = new Set([
	// Event metadata
	"event",
	"timestamp",
	"distinctId",

	// User properties (non-PII)
	"user_id",
	"org_id",
	"plan",
	"environment",
	"version",
	"clientVersion",
	"ideVersion",
	"platform",

	// Feature usage
	"feature",
	"action",
	"success",
	"duration",
	"count",
	"size",

	// Navigation
	"page",
	"referrer",
	"path",

	// Performance
	"responseTime",
	"statusCode",
	"memoryUsage",

	// Extension
	"command",
	"extensionVersion",
	"vscodeVersion",

	// Billing
	"plan_selected",
	"billing_cycle",
	"price_usd",

	// AI features
	"confidence_score",
	"risk_score",
	"suggestion_type",

	// Dashboard
	"chart_type",
	"time_range",

	// Team
	"role",
	"team_size",

	// API
	"endpoint",
	"method",

	// Generic safe properties
	"type",
	"category",
	"source",
	"target",
	"status",
	"mode",
	"theme",
	"language",
]);

// Block-listed patterns that should never be sent
const BLOCKED_PATTERNS = [
	// Email patterns
	/@.*\.(com|org|net|edu|gov)/i,
	/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,

	// File paths
	/\/Users\/[^/]+\/.*/i,
	/\/home\/[^/]+\/.*/i,
	/C:\\Users\\[^\\]+\\.*/i,

	// IP addresses
	/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,

	// API keys and secrets
	/[a-zA-Z0-9]{32,}/, // Long alphanumeric strings (potential API keys)
	/^[A-Za-z0-9_]{20,}$/i, // Potential tokens
	/^(sk|pk)_[a-zA-Z0-9]{32,}/, // Stripe-like keys

	// Database credentials
	/(username|password|host|database|dbname|dbuser|dbpass)=/i,

	// URLs with sensitive info
	/https?:\/\/[^/]+:[^@]+@/, // URLs with credentials

	// SSH keys
	/-----BEGIN [A-Z ]+-----/,
];

// Block-listed property keys that should never be sent
const BLOCKED_KEYS = new Set([
	"email",
	"password",
	"token",
	"apiKey",
	"secret",
	"privateKey",
	"accessToken",
	"refreshToken",
	"authToken",
	"sessionId",
	"cookie",
	"filepath",
	"filename",
	"pathname",
	"directory",
	"home",
	"root",
	"key",
	"pass",
	"credential",
	"credentials",
	"certificate",
	"cert",
	"ssh_key",
	"db_password",
	"db_user",
	"connection_string",
]);

/**
 * Check if a property key is allowed
 */
function isAllowedKey(key: string): boolean {
	// Check exact match in allow list
	if (ALLOWED_PROPERTIES.has(key)) {
		return true;
	}

	// Check if key is in block list
	if (BLOCKED_KEYS.has(key.toLowerCase())) {
		return false;
	}

	// Check if key matches any blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(key)) {
			return false;
		}
	}

	// Default to allowed if not explicitly blocked
	return true;
}

/**
 * Check if a value contains sensitive data
 */
function containsSensitiveData(value: any): boolean {
	if (typeof value !== "string") {
		return false;
	}

	// Check if value matches any blocked patterns
	for (const pattern of BLOCKED_PATTERNS) {
		if (pattern.test(value)) {
			return true;
		}
	}

	return false;
}

/**
 * Filter properties through the privacy gate
 */
export function filterProperties(properties: Record<string, any> = {}): Record<string, any> {
	const filtered: Record<string, any> = {};

	for (const [key, value] of Object.entries(properties)) {
		// Skip if key is not allowed
		if (!isAllowedKey(key)) {
			continue;
		}

		// Skip if value contains sensitive data
		if (containsSensitiveData(value)) {
			continue;
		}

		// For nested objects, recursively filter
		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			filtered[key] = filterProperties(value);
		} else {
			// For arrays, filter each element if it's an object
			if (Array.isArray(value)) {
				filtered[key] = value.map((item) =>
					typeof item === "object" && item !== null ? filterProperties(item) : item,
				);
			} else {
				filtered[key] = value;
			}
		}
	}

	return filtered;
}

/**
 * Add required context to events
 */
export function addContext(
	properties: Record<string, any>,
	context: {
		userId?: string;
		orgId?: string;
		version?: string;
	},
): Record<string, any> {
	const enriched = { ...properties };

	// Add user context
	if (context.userId) {
		enriched.user_id = context.userId;
	}

	// Add organization context
	if (context.orgId) {
		enriched.org_id = context.orgId;
	}

	// Add version context
	if (context.version) {
		enriched.version = context.version;
	}

	return enriched;
}
