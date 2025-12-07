/**
 * Semantic Conventions for SnapBack Instrumentation
 *
 * Standard attribute names for spans, metrics, and events.
 * Aligned with OpenTelemetry semantic conventions where applicable.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/
 */

/**
 * HTTP attributes (aligned with OTel)
 */
export const HttpAttributes = {
	/** HTTP request method (GET, POST, etc.) */
	METHOD: "http.method",
	/** HTTP response status code */
	STATUS_CODE: "http.status_code",
	/** HTTP route pattern */
	ROUTE: "http.route",
	/** HTTP target URL path */
	TARGET: "http.target",
	/** HTTP scheme (http, https) */
	SCHEME: "http.scheme",
	/** HTTP host header */
	HOST: "http.host",
	/** User agent string */
	USER_AGENT: "http.user_agent",
	/** Request content length */
	REQUEST_CONTENT_LENGTH: "http.request_content_length",
	/** Response content length */
	RESPONSE_CONTENT_LENGTH: "http.response_content_length",
} as const;

/**
 * Database attributes (aligned with OTel)
 */
export const DbAttributes = {
	/** Database system (sqlite, postgresql, etc.) */
	SYSTEM: "db.system",
	/** Database operation name (SELECT, INSERT, etc.) */
	OPERATION: "db.operation",
	/** Database statement/query */
	STATEMENT: "db.statement",
	/** Database name */
	NAME: "db.name",
	/** Table name */
	TABLE: "db.sql.table",
} as const;

/**
 * SnapBack-specific snapshot attributes
 */
export const SnapshotAttributes = {
	/** Snapshot unique identifier */
	ID: "snapback.snapshot.id",
	/** Number of files in snapshot */
	FILE_COUNT: "snapback.snapshot.file_count",
	/** Total size in bytes */
	SIZE_BYTES: "snapback.snapshot.size_bytes",
	/** Snapshot creation method (manual, auto, api) */
	METHOD: "snapback.snapshot.method",
	/** Snapshot trigger (command, watch, schedule) */
	TRIGGER: "snapback.snapshot.trigger",
	/** Snapshot protected status */
	PROTECTED: "snapback.snapshot.protected",
	/** Snapshot encryption enabled */
	ENCRYPTED: "snapback.snapshot.encrypted",
} as const;

/**
 * SnapBack-specific file protection attributes
 */
export const ProtectionAttributes = {
	/** Protection level (watch, warn, block) */
	LEVEL: "snapback.protection.level",
	/** File path (sanitized) */
	FILE_PATH: "snapback.file.path",
	/** File extension */
	FILE_EXTENSION: "snapback.file.extension",
	/** File size in bytes */
	FILE_SIZE: "snapback.file.size",
	/** Protection rule applied */
	RULE_ID: "snapback.protection.rule_id",
	/** Policy evaluation result */
	POLICY_RESULT: "snapback.protection.policy_result",
} as const;

/**
 * SnapBack-specific risk detection attributes
 */
export const RiskAttributes = {
	/** Risk level (low, medium, high, critical) */
	LEVEL: "snapback.risk.level",
	/** Risk factors detected */
	FACTORS: "snapback.risk.factors",
	/** Confidence score (0.0 - 1.0) */
	CONFIDENCE: "snapback.risk.confidence",
	/** Risk patterns matched */
	PATTERNS: "snapback.risk.patterns",
	/** AI-assisted change detected */
	AI_ASSISTED: "snapback.risk.ai_assisted",
} as const;

/**
 * User and authentication attributes
 */
export const UserAttributes = {
	/** User ID (sanitized) */
	ID: "snapback.user.id",
	/** User tier (free, pro, team) */
	TIER: "snapback.user.tier",
	/** Session ID */
	SESSION_ID: "snapback.session.id",
	/** API key ID (not the key itself) */
	API_KEY_ID: "snapback.api_key.id",
	/** Organization ID */
	ORGANIZATION_ID: "snapback.organization.id",
} as const;

/**
 * Network attributes
 */
export const NetworkAttributes = {
	/** Client IP address */
	PEER_IP: "net.peer.ip",
	/** Client port */
	PEER_PORT: "net.peer.port",
	/** Host IP address */
	HOST_IP: "net.host.ip",
	/** Host port */
	HOST_PORT: "net.host.port",
} as const;

/**
 * Service and infrastructure attributes
 */
export const ServiceAttributes = {
	/** Service name (api, vscode, mcp, cli) */
	NAME: "service.name",
	/** Service version */
	VERSION: "service.version",
	/** Service environment (dev, staging, production) */
	ENVIRONMENT: "service.environment",
	/** Service instance ID */
	INSTANCE_ID: "service.instance.id",
} as const;

/**
 * Error attributes
 */
export const ErrorAttributes = {
	/** Error type/name */
	TYPE: "error.type",
	/** Error message */
	MESSAGE: "error.message",
	/** Error stack trace (truncated) */
	STACK: "error.stack",
	/** Error code */
	CODE: "error.code",
} as const;

/**
 * Performance attributes
 */
export const PerformanceAttributes = {
	/** Operation duration in milliseconds */
	DURATION_MS: "snapback.performance.duration_ms",
	/** Cache hit/miss */
	CACHE_HIT: "snapback.performance.cache_hit",
	/** Retry count */
	RETRY_COUNT: "snapback.performance.retry_count",
	/** Queue depth */
	QUEUE_DEPTH: "snapback.performance.queue_depth",
} as const;

/**
 * All semantic conventions combined
 */
export const SemanticConventions = {
	Http: HttpAttributes,
	Network: NetworkAttributes,
	Db: DbAttributes,
	Snapshot: SnapshotAttributes,
	Protection: ProtectionAttributes,
	Risk: RiskAttributes,
	User: UserAttributes,
	Service: ServiceAttributes,
	Error: ErrorAttributes,
	Performance: PerformanceAttributes,
} as const;
