# SnapBack Security Implementation Plan

**Status**: Ready for Implementation
**Total Estimated Effort**: 18 days
**Priority**: P0 (Critical Security Gaps)

## Executive Summary

This document provides a comprehensive implementation plan to address all security and architectural gaps identified in the SnapBack security audit. The plan covers 7 priority-ranked PRs with specific library recommendations, complete code examples, and integration guidance.

**Critical Context**: All implementations must treat IP (thresholds, weights, proprietary detection logic) as sensitive and never expose in client code or telemetry.

---

## PR #1: Rule Bundle Signature Verification [P0 - 3 days]

### Current Vulnerability

**File**: `apps/vscode/src/rules/RulesManager.ts:110-119`

```typescript
public async validateRulesBundle(bundle: string): Promise<any> {
  // CRITICAL: No cryptographic verification!
  return JSON.parse(atob(bundle.split(".")[1])); // Accepts tampered bundles
}
```

**Risk**: Accepts unsigned/tampered rule bundles, allowing malicious actors to inject arbitrary detection rules.

### Solution: Ed25519 Signature Verification

**Library Selection**: `@noble/ed25519` v2.0.0

-   **Why**: RFC8032 compliant, 5KB bundle size, Trust Score 9.2/10, 13 code snippets in Context7
-   **Alternative Considered**: `tweetnacl` (audit mentioned, but @noble/ed25519 is more modern)

**Installation**:

```bash
pnpm add @noble/ed25519@^2.0.0
```

**Complete Implementation**:

```typescript
// apps/vscode/src/rules/RulesManager.ts
import * as ed25519 from "@noble/ed25519";
import { validate as validateSchema } from "../schema/rulesBundle.schema";
import semver from "semver";

interface PolicyBundle {
	version: string;
	minClientVersion: string;
	rules: PolicyRule[];
	metadata: {
		timestamp: number;
		schemaVersion: string;
	};
}

export class RulesManager {
	// Hardcoded Ed25519 public key (32 bytes)
	// In production: Load from secure config or environment variable
	private readonly PUBLIC_KEY = new Uint8Array([
		// Replace with actual production public key
		0x7d, 0x4d, 0x0e, 0x7f, 0x61, 0x53, 0xa6, 0x9b, 0x62, 0x42, 0xb5, 0x22, 0xab,
		0xbe, 0xe6, 0x85, 0xfd, 0xa4, 0x42, 0x0f, 0x88, 0x34, 0xb1, 0x08, 0xc3, 0xbd,
		0xae, 0x36, 0x9e, 0xf5, 0x49, 0xfa,
	]);

	/**
	 * Validate JWS-signed rules bundle with Ed25519 signature verification
	 * @param bundle JWS format: header.payload.signature (all base64url)
	 * @returns Validated and parsed policy bundle
	 * @throws Error if signature invalid, version incompatible, or schema invalid
	 */
	public async validateRulesBundle(bundle: string): Promise<PolicyBundle> {
		try {
			// 1. Parse JWS structure
			const parts = bundle.split(".");
			if (parts.length !== 3) {
				throw new Error(
					"Invalid JWS format: expected 3 parts (header.payload.signature)"
				);
			}

			const [headerB64, payloadB64, signatureB64] = parts;

			// 2. Verify Ed25519 signature
			const message = new TextEncoder().encode(
				`${headerB64}.${payloadB64}`
			);
			const signature = this.base64UrlDecode(signatureB64);

			const isValid = await ed25519.verify(
				signature,
				message,
				this.PUBLIC_KEY
			);

			if (!isValid) {
				logger.error("Rule bundle signature verification failed");
				throw new Error("Invalid signature: bundle may be tampered");
			}

			logger.info("Rule bundle signature verified successfully");

			// 3. Parse and validate payload
			const payloadJson = new TextDecoder().decode(
				this.base64UrlDecode(payloadB64)
			);
			const payload = JSON.parse(payloadJson) as PolicyBundle;

			// 4. Validate schema structure
			const schemaValid = validateSchema(payload);
			if (!schemaValid) {
				logger.error("Rule bundle schema validation failed", {
					errors: validateSchema.errors,
				});
				throw new Error("Invalid bundle schema");
			}

			// 5. Verify minClientVersion compatibility
			const currentVersion = this.getExtensionVersion();
			if (semver.lt(currentVersion, payload.minClientVersion)) {
				logger.warn("Client version too old for bundle", {
					current: currentVersion,
					required: payload.minClientVersion,
				});
				throw new Error(
					`Extension update required: min version ${payload.minClientVersion}`
				);
			}

			// 6. Verify bundle freshness (not older than 7 days)
			const bundleAge = Date.now() - payload.metadata.timestamp;
			const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

			if (bundleAge > MAX_AGE_MS) {
				logger.warn("Rule bundle is stale", {
					age: bundleAge / 1000 / 60 / 60 / 24,
				});
				// Don't reject, but log for monitoring
			}

			return payload;
		} catch (error) {
			logger.error("Failed to validate rules bundle", error as Error);
			throw error;
		}
	}

	/**
	 * Decode base64url to Uint8Array
	 */
	private base64UrlDecode(input: string): Uint8Array {
		// Convert base64url to base64
		const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "===".slice((base64.length + 3) % 4);

		// Decode base64 to binary
		const binary = atob(padded);
		const bytes = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}

		return bytes;
	}

	/**
	 * Get current extension version from package.json
	 */
	private getExtensionVersion(): string {
		return this.context.extension.packageJSON.version;
	}
}
```

**Schema Definition** (create new file):

```typescript
// apps/vscode/src/schema/rulesBundle.schema.ts
import Ajv, { JSONSchemaType } from "ajv";

const ajv = new Ajv();

export const rulesBundleSchema: JSONSchemaType<PolicyBundle> = {
	type: "object",
	required: ["version", "minClientVersion", "rules", "metadata"],
	properties: {
		version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
		minClientVersion: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
		rules: {
			type: "array",
			items: {
				type: "object",
				required: ["pattern", "level"],
				properties: {
					pattern: { type: "string" },
					level: { type: "string", enum: ["watch", "warn", "block"] },
					reason: { type: "string", nullable: true },
					autoSnapshot: { type: "boolean", nullable: true },
					debounce: { type: "number", nullable: true },
				},
			},
		},
		metadata: {
			type: "object",
			required: ["timestamp", "schemaVersion"],
			properties: {
				timestamp: { type: "number" },
				schemaVersion: { type: "string" },
			},
		},
	},
};

export const validate = ajv.compile(rulesBundleSchema);
```

**Testing Strategy**:

```typescript
// apps/vscode/test/rules/RulesManager.test.ts
import { describe, it, expect } from "vitest";
import { RulesManager } from "../../src/rules/RulesManager";
import * as ed25519 from "@noble/ed25519";

describe("RulesManager - Signature Verification", () => {
	it("should reject unsigned bundles", async () => {
		const manager = new RulesManager();
		const unsignedBundle = "header.payload.invalid_signature";

		await expect(
			manager.validateRulesBundle(unsignedBundle)
		).rejects.toThrow("Invalid signature");
	});

	it("should reject tampered bundles", async () => {
		const manager = new RulesManager();

		// Create valid bundle then tamper with payload
		const validBundle = await createSignedBundle({
			/* ... */
		});
		const [header, payload, signature] = validBundle.split(".");
		const tamperedPayload = btoa(JSON.stringify({ malicious: true }));
		const tamperedBundle = `${header}.${tamperedPayload}.${signature}`;

		await expect(
			manager.validateRulesBundle(tamperedBundle)
		).rejects.toThrow("Invalid signature");
	});

	it("should enforce minClientVersion", async () => {
		const manager = new RulesManager();

		const futureVersionBundle = await createSignedBundle({
			minClientVersion: "999.0.0", // Far future version
		});

		await expect(
			manager.validateRulesBundle(futureVersionBundle)
		).rejects.toThrow("Extension update required");
	});

	it("should accept valid signed bundles", async () => {
		const manager = new RulesManager();
		const validBundle = await createSignedBundle({
			version: "1.0.0",
			minClientVersion: "0.1.0",
			rules: [{ pattern: "*.env", level: "block" }],
		});

		const result = await manager.validateRulesBundle(validBundle);
		expect(result.rules).toHaveLength(1);
	});
});
```

**Integration Points**:

1. Update `RulesManager.fetchRules()` at line 58-89 to use new `validateRulesBundle()`
2. Add error handling for signature failures (notify user, use cached rules)
3. Update telemetry to track signature verification success/failure rates

**Rollout Plan**:

-   Phase 1: Deploy with signature verification in "warn" mode (log failures, don't reject)
-   Phase 2: Monitor failure rates for 1 week
-   Phase 3: Enable strict enforcement (reject invalid signatures)

---

## PR #2: Telemetry Proxy Enforcement [P0 - 2 days]

### Current Vulnerability

**File**: `packages/infrastructure/src/tracing/telemetry-client.ts:27`

```typescript
this.posthog = new PostHog(apiKey, { host }); // Direct connection bypasses proxy claim
```

**Risk**: Client IP exposed to PostHog cloud, contradicts privacy-first architecture claim.

### Solution: Custom Transport Layer

**Library**: None required (use Node.js built-in `fetch`)

**Architecture**:

```
VS Code Extension → Custom Transport → Proxy Endpoint → PostHog Cloud
                                      ↓
                               Schema Validation
                               Property Stripping
                               IP Scrubbing
```

**Implementation Part 1: Custom Transport**:

```typescript
// packages/infrastructure/src/tracing/telemetry-client.ts
import { PostHog } from "posthog-node";
import type { PostHogEvent } from "./types";

export class TelemetryClient {
	private posthog: PostHog | null = null;
	private proxyUrl: string;
	private eventQueue: PostHogEvent[] = [];
	private flushInterval: NodeJS.Timeout | null = null;

	constructor(
		private apiKey: string,
		proxyHost: string,
		private platform: "vscode" | "cli" | "web"
	) {
		this.proxyUrl = `${proxyHost}/api/telemetry/events`;
	}

	async initialize() {
		// DO NOT initialize PostHog SDK with direct host
		// Instead, implement custom transport layer

		this.posthog = new PostHog(this.apiKey, {
			host: "", // Disable direct connection
			transport: this.customTransport.bind(this), // Force proxy routing
			flushAt: 20, // Batch size
			flushInterval: 10000, // 10 seconds
		});

		// Set up periodic flush
		this.flushInterval = setInterval(() => this.flush(), 10000);
	}

	/**
	 * Custom transport layer - routes all events through proxy
	 */
	private async customTransport(batch: PostHogEvent[]): Promise<void> {
		try {
			const response = await fetch(this.proxyUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-SnapBack-Platform": this.platform,
					"X-SnapBack-Version": this.getVersion(),
				},
				body: JSON.stringify({
					events: batch.map((event) => ({
						event: event.event,
						properties: this.sanitizeProperties(event.properties),
						timestamp: event.timestamp,
					})),
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				logger.warn("Telemetry proxy rejected events", {
					status: response.status,
					error,
				});
			}
		} catch (error) {
			logger.error(
				"Failed to send telemetry through proxy",
				error as Error
			);
			// Fail silently - never block user operations for telemetry
		}
	}

	/**
	 * Sanitize properties to remove PII before sending
	 */
	private sanitizeProperties(
		properties: Record<string, unknown>
	): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {};

		// Allowlist of safe properties
		const allowedProps = [
			"version",
			"platform",
			"duration",
			"success",
			"filesCount",
			"method",
			"trigger",
			"feature",
			"viewId",
			"command",
		];

		for (const key of allowedProps) {
			if (key in properties) {
				sanitized[key] = properties[key];
			}
		}

		return sanitized;
	}

	async flush(): Promise<void> {
		if (this.posthog) {
			await this.posthog.flush();
		}
	}

	async shutdown(): Promise<void> {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
		}
		await this.flush();
	}
}
```

**Implementation Part 2: Proxy Endpoint**:

```typescript
// packages/api/modules/telemetry/procedures/ingest-events.ts
import { z } from "zod";
import { t } from "../../../orpc/router";
import { PostHog } from "posthog-node";

// Event name allowlist - enum enforcement
const ALLOWED_EVENTS = [
	"extension.activated",
	"extension.deactivated",
	"command.execution",
	"snapshot.created",
	"snapback.used",
	"risk.detected",
	"view.activated",
	"notification.shown",
	"feature.used",
	"error",
	"walkthrough.step.completed",
	"onboarding.protection.assigned",
	"onboarding.phase.progressed",
	"onboarding.contextualPrompt.shown",
] as const;

const eventSchema = z.object({
	event: z.enum(ALLOWED_EVENTS), // Strict allowlist
	properties: z.record(z.unknown()).transform(stripSensitiveProperties),
	timestamp: z.number().optional(),
});

const ingestEventsSchema = z.object({
	events: z.array(eventSchema),
});

/**
 * Strip sensitive properties before forwarding to PostHog
 */
function stripSensitiveProperties(
	props: Record<string, unknown>
): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	// Remove any properties that could contain PII
	const blocklist = ["path", "filePath", "fileName", "email", "user", "ip"];

	for (const [key, value] of Object.entries(props)) {
		if (!blocklist.some((blocked) => key.toLowerCase().includes(blocked))) {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Telemetry ingestion endpoint with schema validation and IP scrubbing
 */
export const ingestEvents = t
	.input(ingestEventsSchema)
	.handler(async ({ input, context }) => {
		try {
			const posthog = new PostHog(process.env.POSTHOG_PROJECT_KEY!, {
				host: process.env.POSTHOG_API_HOST || "https://app.posthog.com",
			});

			// Forward validated events to PostHog
			for (const event of input.events) {
				posthog.capture({
					distinctId: "anonymous", // Never forward user IDs
					event: event.event,
					properties: {
						...event.properties,
						// Server-side properties (not client-provided)
						$ip: null, // Explicitly scrub IP
						server_timestamp: Date.now(),
					},
					timestamp: event.timestamp
						? new Date(event.timestamp)
						: undefined,
				});
			}

			await posthog.flush();
			await posthog.shutdown();

			return { success: true, processed: input.events.length };
		} catch (error) {
			logger.error("Telemetry ingestion failed", error as Error);
			throw error;
		}
	});
```

**Router Integration**:

```typescript
// packages/api/modules/telemetry/router.ts
import { t } from "../../orpc/router";
import { ingestEvents } from "./procedures/ingest-events";

export const telemetryRouter = t.router({
	ingestEvents,
});
```

**Testing Strategy**:

```typescript
// packages/infrastructure/test/telemetry-client.test.ts
import { describe, it, expect, vi } from "vitest";
import { TelemetryClient } from "../src/tracing/telemetry-client";

describe("TelemetryClient - Proxy Enforcement", () => {
	it("should route all events through proxy", async () => {
		const fetchSpy = vi.spyOn(global, "fetch");

		const client = new TelemetryClient(
			"test-key",
			"https://proxy.test",
			"vscode"
		);
		await client.initialize();

		client.track("test.event", { data: "value" });
		await client.flush();

		expect(fetchSpy).toHaveBeenCalledWith(
			"https://proxy.test/api/telemetry/events",
			expect.objectContaining({ method: "POST" })
		);
	});

	it("should never connect directly to PostHog", async () => {
		const fetchSpy = vi.spyOn(global, "fetch");

		const client = new TelemetryClient(
			"test-key",
			"https://proxy.test",
			"vscode"
		);
		await client.initialize();

		client.track("test.event", {});
		await client.flush();

		// Ensure no calls to posthog.com
		expect(fetchSpy).not.toHaveBeenCalledWith(
			expect.stringContaining("posthog.com"),
			expect.anything()
		);
	});

	it("should strip PII from properties", async () => {
		const client = new TelemetryClient(
			"test-key",
			"https://proxy.test",
			"vscode"
		);
		const sanitized = (client as any).sanitizeProperties({
			version: "1.0.0",
			filePath: "/secret/path", // Should be removed
			email: "user@example.com", // Should be removed
			duration: 100, // Should be kept
		});

		expect(sanitized).toEqual({
			version: "1.0.0",
			duration: 100,
		});
		expect(sanitized).not.toHaveProperty("filePath");
		expect(sanitized).not.toHaveProperty("email");
	});
});
```

**Integration Points**:

1. Update all `TelemetryClient` instantiations to use proxy URL from config
2. Add VS Code setting: `"snapback.telemetryProxy": "https://telemetry.snapback.dev"`
3. Update telemetry.ts:24-42 to read proxy URL from configuration

**Rollout Plan**:

-   Phase 1: Deploy proxy endpoint with monitoring
-   Phase 2: Update extension to use proxy (with fallback to direct for compatibility)
-   Phase 3: Remove direct connection fallback after 2 weeks

---

## PR #3: Snapshot Encryption [P1 - 5 days]

### Current Vulnerability

**File**: `apps/vscode/src/snapshot/SnapshotManager.ts:164`

```typescript
hash: createHash("sha256").update(file.content).digest("hex"), // SHA256 for dedup only
// MISSING: No encryption - snapshots stored in plaintext
```

**Risk**: Snapshot files contain sensitive code/data in plaintext on disk.

### Solution: AES-256-GCM Encryption with Device Key Derivation

**Library**: `node-machine-id` v1.0.1

-   **Why**: Stable machine identifier for device-specific encryption keys
-   **Alternatives**: Hardware UUID (less portable), random key (requires key management)

**Installation**:

```bash
pnpm add node-machine-id@^1.0.1
```

**Implementation Part 1: Encryption Service**:

```typescript
// apps/vscode/src/snapshot/EncryptionService.ts
import { machineIdSync } from "node-machine-id";
import {
	createCipheriv,
	createDecipheriv,
	pbkdf2Sync,
	randomBytes,
	createHash,
} from "crypto";
import { logger } from "../utils/logger";

export interface EncryptedData {
	ciphertext: string;
	iv: string;
	authTag: string;
	algorithm: "aes-256-gcm";
}

/**
 * Encryption service for snapshot data using device-specific keys
 *
 * Key Derivation: Machine ID → PBKDF2 (100k iterations) → AES-256 Key
 * Encryption: AES-256-GCM with random IV per snapshot
 */
export class EncryptionService {
	private deviceKey: Buffer;
	private readonly ALGORITHM = "aes-256-gcm";
	private readonly KEY_LENGTH = 32; // 256 bits
	private readonly IV_LENGTH = 16; // 128 bits
	private readonly PBKDF2_ITERATIONS = 100000; // As recommended in audit
	private readonly SALT = Buffer.from("snapback-v1-salt"); // Version-specific salt

	constructor() {
		try {
			// Derive device-specific encryption key
			const machineId = machineIdSync({ original: true });

			// PBKDF2 with 100,000 iterations for key stretching
			this.deviceKey = pbkdf2Sync(
				machineId,
				this.SALT,
				this.PBKDF2_ITERATIONS,
				this.KEY_LENGTH,
				"sha256"
			);

			logger.info("Encryption service initialized", {
				algorithm: this.ALGORITHM,
				keyLength: this.KEY_LENGTH * 8,
				iterations: this.PBKDF2_ITERATIONS,
			});
		} catch (error) {
			logger.error(
				"Failed to initialize encryption service",
				error as Error
			);
			throw new Error("Encryption initialization failed");
		}
	}

	/**
	 * Encrypt plaintext data using AES-256-GCM
	 *
	 * @param plaintext Data to encrypt (typically JSON stringified snapshot)
	 * @returns Encrypted data with IV and authentication tag
	 */
	encrypt(plaintext: string): EncryptedData {
		try {
			// Generate random IV for this encryption operation
			const iv = randomBytes(this.IV_LENGTH);

			// Create cipher with device key and IV
			const cipher = createCipheriv(this.ALGORITHM, this.deviceKey, iv);

			// Encrypt data
			const encrypted = Buffer.concat([
				cipher.update(plaintext, "utf8"),
				cipher.final(),
			]);

			// Get authentication tag (GCM mode provides authenticity)
			const authTag = cipher.getAuthTag();

			return {
				ciphertext: encrypted.toString("base64"),
				iv: iv.toString("base64"),
				authTag: authTag.toString("base64"),
				algorithm: this.ALGORITHM,
			};
		} catch (error) {
			logger.error("Encryption failed", error as Error);
			throw new Error("Failed to encrypt snapshot data");
		}
	}

	/**
	 * Decrypt encrypted data using AES-256-GCM
	 *
	 * @param encrypted Encrypted data with IV and auth tag
	 * @returns Decrypted plaintext
	 * @throws Error if authentication fails (tampered data)
	 */
	decrypt(encrypted: EncryptedData): string {
		try {
			// Validate algorithm
			if (encrypted.algorithm !== this.ALGORITHM) {
				throw new Error(
					`Unsupported algorithm: ${encrypted.algorithm}`
				);
			}

			// Create decipher with device key and stored IV
			const decipher = createDecipheriv(
				this.ALGORITHM,
				this.deviceKey,
				Buffer.from(encrypted.iv, "base64")
			);

			// Set authentication tag for GCM verification
			decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

			// Decrypt data
			const decrypted = Buffer.concat([
				decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
				decipher.final(), // Will throw if authentication fails
			]);

			return decrypted.toString("utf8");
		} catch (error) {
			if (
				(error as Error).message.includes(
					"Unsupported state or unable to authenticate"
				)
			) {
				logger.error(
					"Decryption failed: authentication error (tampered data?)"
				);
				throw new Error(
					"Snapshot authentication failed - data may be tampered"
				);
			}

			logger.error("Decryption failed", error as Error);
			throw new Error("Failed to decrypt snapshot data");
		}
	}

	/**
	 * Compute content hash for deduplication (post-encryption)
	 *
	 * @param content Original plaintext content
	 * @returns SHA-256 hash for deduplication
	 */
	computeContentHash(content: string): string {
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Test encryption/decryption roundtrip
	 */
	async testRoundtrip(): Promise<boolean> {
		try {
			const testData = "SnapBack encryption test";
			const encrypted = this.encrypt(testData);
			const decrypted = this.decrypt(encrypted);

			return testData === decrypted;
		} catch {
			return false;
		}
	}
}
```

**Implementation Part 2: SnapshotManager Integration**:

```typescript
// apps/vscode/src/snapshot/SnapshotManager.ts (modifications)
import { EncryptionService } from "./EncryptionService";

export class SnapshotManager {
	private encryptionService: EncryptionService;

	constructor(
		private workspaceRoot: string,
		private context: vscode.ExtensionContext,
		private protectedFileRegistry: ProtectedFileRegistry
	) {
		this.snapshotsDir = path.join(workspaceRoot, ".snapback", "snapshots");

		// Initialize encryption service
		this.encryptionService = new EncryptionService();

		// Test encryption on startup
		this.encryptionService.testRoundtrip().then((success) => {
			if (!success) {
				logger.error("Encryption roundtrip test failed");
			}
		});
	}

	async createSnapshot(
		message: string,
		options: CreateSnapshotOptions = {}
	): Promise<Snapshot> {
		// ... existing code ...

		const files: SnapshotFile[] = [];

		for (const filePath of filesToSnapshot) {
			try {
				const content = await fs.readFile(filePath, "utf8");

				// Compute hash BEFORE encryption (for deduplication)
				const contentHash =
					this.encryptionService.computeContentHash(content);

				// Encrypt file content
				const encrypted = this.encryptionService.encrypt(content);

				files.push({
					path: relativePath,
					hash: contentHash, // Plaintext hash for dedup
					encrypted: encrypted, // Store encrypted data
					size: content.length,
					mtime: stat.mtimeMs,
				});
			} catch (error) {
				logger.error(
					`Failed to process file ${filePath}`,
					error as Error
				);
			}
		}

		const snapshot: Snapshot = {
			id: snapshotId,
			message,
			timestamp: Date.now(),
			files,
			protection: protectionType,
			trigger: options.trigger || "manual",
		};

		// Save encrypted snapshot to disk
		await this.saveSnapshot(snapshot);

		return snapshot;
	}

	async restoreSnapshot(
		snapshotId: string,
		options: RestoreOptions = {}
	): Promise<void> {
		const snapshot = await this.loadSnapshot(snapshotId);

		for (const file of snapshot.files) {
			try {
				// Decrypt file content before restoring
				const decryptedContent = this.encryptionService.decrypt(
					file.encrypted
				);

				const fullPath = path.join(this.workspaceRoot, file.path);
				await fs.mkdir(path.dirname(fullPath), { recursive: true });
				await fs.writeFile(fullPath, decryptedContent, "utf8");

				logger.info("Restored file", { path: file.path });
			} catch (error) {
				logger.error(
					`Failed to restore file ${file.path}`,
					error as Error
				);
				throw error;
			}
		}
	}
}
```

**Schema Update**:

```typescript
// apps/vscode/src/types/snapshot.types.ts
import type { EncryptedData } from "../snapshot/EncryptionService";

export interface SnapshotFile {
	path: string;
	hash: string; // Plaintext hash for deduplication
	encrypted: EncryptedData; // Encrypted content with IV and auth tag
	size: number;
	mtime: number;
}

export interface Snapshot {
	id: string;
	message: string;
	timestamp: number;
	files: SnapshotFile[];
	protection: ProtectionType;
	trigger: "manual" | "auto" | "pre-commit" | "scheduled";
}
```

**Testing Strategy**:

```typescript
// apps/vscode/test/snapshot/EncryptionService.test.ts
import { describe, it, expect } from "vitest";
import { EncryptionService } from "../../src/snapshot/EncryptionService";

describe("EncryptionService", () => {
	it("should encrypt and decrypt data successfully", () => {
		const service = new EncryptionService();
		const plaintext = "sensitive code content";

		const encrypted = service.encrypt(plaintext);
		const decrypted = service.decrypt(encrypted);

		expect(decrypted).toBe(plaintext);
	});

	it("should generate unique IVs for each encryption", () => {
		const service = new EncryptionService();
		const plaintext = "same content";

		const encrypted1 = service.encrypt(plaintext);
		const encrypted2 = service.encrypt(plaintext);

		// Same plaintext should produce different ciphertexts (different IVs)
		expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
		expect(encrypted1.iv).not.toBe(encrypted2.iv);
	});

	it("should detect tampered data", () => {
		const service = new EncryptionService();
		const plaintext = "original content";

		const encrypted = service.encrypt(plaintext);

		// Tamper with ciphertext
		const tampered = {
			...encrypted,
			ciphertext: encrypted.ciphertext.slice(0, -5) + "XXXXX",
		};

		expect(() => service.decrypt(tampered)).toThrow(
			"authentication failed"
		);
	});

	it("should use device-specific keys", () => {
		const service1 = new EncryptionService();
		const service2 = new EncryptionService();

		const plaintext = "test content";
		const encrypted = service1.encrypt(plaintext);

		// Same device should decrypt successfully
		expect(() => service2.decrypt(encrypted)).not.toThrow();
	});

	it("should compute consistent content hashes", () => {
		const service = new EncryptionService();
		const content = "file content";

		const hash1 = service.computeContentHash(content);
		const hash2 = service.computeContentHash(content);

		expect(hash1).toBe(hash2);
		expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
	});
});
```

**Migration Strategy** for existing plaintext snapshots:

```typescript
// apps/vscode/src/snapshot/migration/encrypt-existing-snapshots.ts
import { EncryptionService } from "../EncryptionService";
import { logger } from "../../utils/logger";

/**
 * One-time migration: Encrypt existing plaintext snapshots
 * Run automatically on first launch after update
 */
export async function migrateExistingSnapshots(
	snapshotsDir: string
): Promise<void> {
	const migrationFlag = path.join(snapshotsDir, ".migration-v1-encrypted");

	// Check if migration already completed
	if (await fs.pathExists(migrationFlag)) {
		logger.info("Snapshot encryption migration already completed");
		return;
	}

	logger.info("Starting snapshot encryption migration");
	const encryptionService = new EncryptionService();
	let migrated = 0;
	let failed = 0;

	try {
		const snapshotFiles = await fs.readdir(snapshotsDir);

		for (const file of snapshotFiles) {
			if (!file.endsWith(".json")) continue;

			try {
				const snapshotPath = path.join(snapshotsDir, file);
				const snapshot = await fs.readJSON(snapshotPath);

				// Check if already encrypted (has 'encrypted' field)
				if (snapshot.files[0]?.encrypted) {
					continue; // Skip already encrypted
				}

				// Encrypt each file in snapshot
				for (const snapshotFile of snapshot.files) {
					if (snapshotFile.content) {
						// Old format: plaintext content
						const encrypted = encryptionService.encrypt(
							snapshotFile.content
						);
						snapshotFile.encrypted = encrypted;
						delete snapshotFile.content; // Remove plaintext
					}
				}

				// Save encrypted version
				await fs.writeJSON(snapshotPath, snapshot, { spaces: 2 });
				migrated++;
			} catch (error) {
				logger.error(
					`Failed to migrate snapshot ${file}`,
					error as Error
				);
				failed++;
			}
		}

		// Mark migration as complete
		await fs.writeFile(migrationFlag, Date.now().toString());

		logger.info("Snapshot encryption migration completed", {
			migrated,
			failed,
		});
	} catch (error) {
		logger.error("Snapshot encryption migration failed", error as Error);
		throw error;
	}
}
```

**Integration Points**:

1. Call `migrateExistingSnapshots()` in SnapshotManager initialization
2. Update all snapshot read/write operations to use encryption
3. Add telemetry for encryption errors (but never log keys/content)

**Rollout Plan**:

-   Phase 1: Deploy with migration script (auto-encrypts existing snapshots)
-   Phase 2: Monitor for decryption failures (indicates device change or corruption)
-   Phase 3: After 30 days, remove plaintext fallback support

---

## PR #4: Config Merge Determinism [P2 - 2 days]

### Current Issue

**File**: `apps/vscode/src/config/configurationManager.ts:156`

```typescript
for (const configFile of configFiles.reverse()) {
	mergedConfig = this.mergeConfigs(mergedConfig, parsed);
}
// Issue: reverse() + shallow merge = last-write-wins instead of nearest-up-wins
```

**Risk**: Nested .snapbackrc files don't override root configs predictably.

### Solution: Depth-First Sorting + Deep Merge

**No new libraries required** - algorithm improvement only

**Implementation**:

```typescript
// apps/vscode/src/config/configurationManager.ts
private async loadSnapBackRC(): Promise<SnapBackRC | null> {
  try {
    const configFiles = await glob('**/.snapbackrc', {
      cwd: this.workspaceRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    });

    if (configFiles.length === 0) {
      return null;
    }

    // FIXED: Sort by depth (deepest first) for nearest-up-wins precedence
    const sortedConfigs = configFiles
      .map(file => ({
        path: file,
        depth: file.split(path.sep).length
      }))
      .sort((a, b) => b.depth - a.depth); // Deepest first

    let mergedConfig: SnapBackRC = {};

    // Process from deepest to root (nearest-up wins)
    for (const { path: configFile } of sortedConfigs) {
      try {
        const content = await fs.readFile(configFile, 'utf8');
        const parsed = JSON5.parse(content);

        const isValid = this.validate(parsed);
        if (!isValid) {
          // ... validation error handling ...
          continue;
        }

        // FIXED: Deep merge with provenance tracking
        mergedConfig = this.deepMergeConfigs(mergedConfig, parsed, configFile);

      } catch (fileError) {
        // ... error handling ...
      }
    }

    return this.mergeWithDefaults(mergedConfig);

  } catch (error) {
    logger.error('Error loading .snapbackrc configurations:', error);
    return null;
  }
}

/**
 * Deep merge configuration with nearest-up-wins precedence
 *
 * @param base Lower-priority config (root)
 * @param override Higher-priority config (nested)
 * @param source Path of override config (for provenance)
 * @returns Merged configuration with provenance metadata
 */
private deepMergeConfigs(
  base: SnapBackRC,
  override: SnapBackRC,
  source: string
): SnapBackRC {
  const merged: SnapBackRC = {};

  // Arrays: override completely replaces base (no concatenation)
  if (override.protection !== undefined) {
    merged.protection = override.protection;
    logger.debug('Config override: protection', { source });
  } else {
    merged.protection = base.protection;
  }

  if (override.ignore !== undefined) {
    merged.ignore = override.ignore;
    logger.debug('Config override: ignore', { source });
  } else {
    merged.ignore = base.ignore;
  }

  if (override.templates !== undefined) {
    merged.templates = override.templates;
    logger.debug('Config override: templates', { source });
  } else {
    merged.templates = base.templates;
  }

  // Objects: deep merge with property-level override
  merged.settings = this.deepMergeObject(
    base.settings || {},
    override.settings || {},
    source,
    'settings'
  );

  merged.policies = this.deepMergeObject(
    base.policies || {},
    override.policies || {},
    source,
    'policies'
  );

  merged.hooks = this.deepMergeObject(
    base.hooks || {},
    override.hooks || {},
    source,
    'hooks'
  );

  return merged;
}

/**
 * Deep merge objects with property-level precedence
 */
private deepMergeObject<T extends Record<string, unknown>>(
  base: T,
  override: T,
  source: string,
  objectName: string
): T {
  const merged: T = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      merged[key as keyof T] = value as T[keyof T];
      logger.debug(`Config override: ${objectName}.${key}`, { source });
    }
  }

  return merged;
}
```

**Testing Strategy**:

```typescript
// apps/vscode/test/config/configurationManager.test.ts
import { describe, it, expect } from "vitest";
import { ConfigurationManager } from "../../src/config/configurationManager";

describe("ConfigurationManager - Merge Determinism", () => {
	it("should apply nearest-up-wins precedence", async () => {
		// Setup: workspace/.snapbackrc and workspace/foo/.snapbackrc
		const workspaceConfig = {
			protection: [{ pattern: "*.env", level: "block" }],
			settings: { defaultProtectionLevel: "watch" },
		};

		const nestedConfig = {
			protection: [{ pattern: "*.key", level: "block" }],
			settings: { defaultProtectionLevel: "warn" }, // Should override
		};

		// Mock file system
		mockReadFile(".snapbackrc", workspaceConfig);
		mockReadFile("foo/.snapbackrc", nestedConfig);

		const manager = new ConfigurationManager("/workspace");
		const merged = await manager.load();

		// Nested config should win for overlapping properties
		expect(merged.protection).toEqual(nestedConfig.protection);
		expect(merged.settings?.defaultProtectionLevel).toBe("warn");
	});

	it("should process configs depth-first", async () => {
		const configs = [
			{ path: "/workspace/.snapbackrc", depth: 2 },
			{ path: "/workspace/foo/.snapbackrc", depth: 3 },
			{ path: "/workspace/foo/bar/.snapbackrc", depth: 4 },
		];

		// Deepest should be processed first
		const sorted = configs.sort((a, b) => b.depth - a.depth);

		expect(sorted[0].path).toContain("foo/bar");
		expect(sorted[2].path).toBe("/workspace/.snapbackrc");
	});

	it("should preserve base properties when override is undefined", async () => {
		const base = {
			protection: [{ pattern: "*.env", level: "block" }],
			ignore: ["node_modules/**"],
			settings: { defaultProtectionLevel: "watch" },
		};

		const override = {
			settings: { maxSnapshots: 50 }, // Only override maxSnapshots
		};

		const manager = new ConfigurationManager("/workspace");
		const merged = (manager as any).deepMergeConfigs(
			base,
			override,
			"test"
		);

		expect(merged.protection).toEqual(base.protection); // Preserved
		expect(merged.ignore).toEqual(base.ignore); // Preserved
		expect(merged.settings?.defaultProtectionLevel).toBe("watch"); // Preserved
		expect(merged.settings?.maxSnapshots).toBe(50); // Overridden
	});
});
```

**Integration Points**:

1. Update `loadSnapBackRC()` with new merge logic
2. Add debug logging for config precedence visualization
3. Update documentation to explain nearest-up-wins behavior

---

## PR #5: Offline Mode [P2 - 2 days]

### Current Issue

No offline mode support - extension makes network calls even when offline operation is desired.

### Solution: Feature Flag with Network Gating

**No new libraries required** - configuration and conditional logic only

**Implementation Part 1: VS Code Configuration**:

```json
// apps/vscode/package.json (contributes.configuration)
{
	"contributes": {
		"configuration": {
			"title": "SnapBack",
			"properties": {
				"snapback.offlineMode": {
					"type": "boolean",
					"default": false,
					"description": "Enable offline mode (disables rule updates and telemetry)"
				}
			}
		}
	}
}
```

**Implementation Part 2: RulesManager Gating**:

```typescript
// apps/vscode/src/rules/RulesManager.ts
export class RulesManager {
	private isOfflineMode(): boolean {
		const config = vscode.workspace.getConfiguration("snapback");
		return config.get<boolean>("offlineMode", false);
	}

	/**
	 * Start polling for rules updates (respects offline mode)
	 */
	public startPolling(): void {
		if (this.isOfflineMode()) {
			logger.info("Offline mode enabled, skipping rules polling");
			return;
		}

		// Initial fetch
		this.fetchRules().catch((error) => {
			logger.error("Failed to fetch initial rules", error);
		});

		// Set up periodic polling
		this.pollingInterval = setInterval(() => {
			if (this.isOfflineMode()) {
				logger.debug("Offline mode enabled, skipping scheduled fetch");
				return;
			}

			this.fetchRules().catch((error) => {
				logger.error("Failed to fetch rules during polling", error);
			});
		}, this.POLLING_INTERVAL_MS);

		logger.info("RulesManager polling started (offline mode: disabled)");
	}

	/**
	 * Fetch rules from API with offline mode check
	 */
	private async fetchRules(): Promise<void> {
		if (this.isOfflineMode()) {
			logger.info("Offline mode enabled, using cached rules");
			return;
		}

		try {
			const api = SnapbackAPI.getInstance();
			const response = await api.getRulesBundle(this.etag || undefined);

			// ... existing fetch logic ...
		} catch (error) {
			logger.error("Failed to fetch rules", error as Error);

			// Fallback to cached rules if available
			if (this.currentRules) {
				logger.info("Using cached rules due to network error");
			} else {
				throw error;
			}
		}
	}
}
```

**Implementation Part 3: TelemetryClient Gating**:

```typescript
// packages/infrastructure/src/tracing/telemetry-client.ts
export class TelemetryClient {
	private isOfflineMode(): boolean {
		// For VS Code platform
		if (this.platform === "vscode") {
			try {
				const vscode = require("vscode");
				const config = vscode.workspace.getConfiguration("snapback");
				return config.get<boolean>("offlineMode", false);
			} catch {
				return false;
			}
		}

		// For other platforms, check environment variable
		return process.env.SNAPBACK_OFFLINE_MODE === "true";
	}

	/**
	 * Track event with offline mode check
	 */
	track(event: string, properties?: Record<string, unknown>): void {
		if (this.isOfflineMode()) {
			logger.debug("Offline mode enabled, skipping telemetry event", {
				event,
			});
			return;
		}

		if (!this.posthog) {
			logger.warn("PostHog not initialized, skipping event", { event });
			return;
		}

		try {
			this.posthog.capture({
				distinctId: this.getDistinctId(),
				event,
				properties: {
					...properties,
					platform: this.platform,
				},
			});
		} catch (error) {
			logger.error("Failed to track event", error as Error);
			// Fail silently - never block for telemetry
		}
	}

	/**
	 * Flush events with offline mode check
	 */
	async flush(): Promise<void> {
		if (this.isOfflineMode()) {
			logger.debug("Offline mode enabled, skipping telemetry flush");
			return;
		}

		if (this.posthog) {
			await this.posthog.flush();
		}
	}
}
```

**Implementation Part 4: User-Facing Toggle**:

```typescript
// apps/vscode/src/commands/toggleOfflineMode.ts
import * as vscode from "vscode";
import { logger } from "../utils/logger";

/**
 * Command: snapback.toggleOfflineMode
 * Toggles offline mode on/off with user feedback
 */
export async function toggleOfflineMode(): Promise<void> {
	const config = vscode.workspace.getConfiguration("snapback");
	const currentMode = config.get<boolean>("offlineMode", false);

	const newMode = !currentMode;
	await config.update(
		"offlineMode",
		newMode,
		vscode.ConfigurationTarget.Global
	);

	const message = newMode
		? "🔒 Offline mode enabled - Network features disabled"
		: "🌐 Offline mode disabled - Network features enabled";

	vscode.window.showInformationMessage(message);

	logger.info("Offline mode toggled", {
		previous: currentMode,
		current: newMode,
	});
}
```

**Testing Strategy**:

```typescript
// apps/vscode/test/rules/RulesManager.offline.test.ts
import { describe, it, expect, vi } from "vitest";
import { RulesManager } from "../../src/rules/RulesManager";
import * as vscode from "vscode";

describe("RulesManager - Offline Mode", () => {
	it("should skip polling when offline mode enabled", () => {
		vi.spyOn(vscode.workspace, "getConfiguration").mockReturnValue({
			get: (key: string) => (key === "offlineMode" ? true : false),
		} as any);

		const manager = RulesManager.getInstance();
		const fetchSpy = vi.spyOn(manager as any, "fetchRules");

		manager.startPolling();

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("should allow polling when offline mode disabled", () => {
		vi.spyOn(vscode.workspace, "getConfiguration").mockReturnValue({
			get: (key: string) => (key === "offlineMode" ? false : false),
		} as any);

		const manager = RulesManager.getInstance();
		const fetchSpy = vi.spyOn(manager as any, "fetchRules");

		manager.startPolling();

		expect(fetchSpy).toHaveBeenCalled();
	});

	it("should use cached rules in offline mode", async () => {
		const manager = RulesManager.getInstance();
		manager["currentRules"] = { version: "1.0.0", rules: [] };

		vi.spyOn(manager as any, "isOfflineMode").mockReturnValue(true);

		await (manager as any).fetchRules();

		// Should not throw, should use cached rules
		expect(manager.getCurrentRules()).toBeDefined();
	});
});
```

**Integration Points**:

1. Register `toggleOfflineMode` command in extension.ts
2. Add status bar item showing offline mode status
3. Update documentation with offline mode use cases

---

## PR #6: MCP Path Validation Fix [P2 - 1 day]

### Current Issue

**File**: `apps/mcp-server/src/utils/security.ts:34-36`

```typescript
if (path.isAbsolute(normalized)) {
	throw new SecurityError("Absolute paths not allowed");
}
// Issue: VS Code always provides absolute paths, breaking all operations
```

**Risk**: MCP server unusable in VS Code context.

### Solution: Workspace Boundary Check

**No new libraries required** - use Node.js `fs.realpathSync` for symlink resolution

**Implementation**:

```typescript
// apps/mcp-server/src/utils/security.ts
import * as fs from "fs";
import * as path from "path";

export class SecurityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SecurityError";
	}
}

/**
 * Validate file path is within workspace boundaries
 *
 * Security checks:
 * 1. Resolve symlinks to detect symlink attacks
 * 2. Ensure path is within workspace root
 * 3. Reject path traversal attempts (../)
 *
 * @param filePath Path to validate (absolute or relative)
 * @param workspaceRoot Workspace root directory
 * @returns Validated absolute path
 * @throws SecurityError if path is outside workspace or invalid
 */
export function validatePath(filePath: string, workspaceRoot: string): string {
	try {
		// Normalize path (resolve . and ..)
		const normalized = path.normalize(filePath);

		// Convert to absolute if relative
		const absolutePath = path.isAbsolute(normalized)
			? normalized
			: path.join(workspaceRoot, normalized);

		// SECURITY: Resolve symlinks to prevent symlink attacks
		let realPath: string;
		try {
			realPath = fs.realpathSync(absolutePath);
		} catch (error) {
			// File doesn't exist - validate parent directory instead
			const parentDir = path.dirname(absolutePath);

			if (!fs.existsSync(parentDir)) {
				throw new SecurityError(
					`Parent directory does not exist: ${parentDir}`
				);
			}

			try {
				const realParent = fs.realpathSync(parentDir);
				const fileName = path.basename(absolutePath);
				realPath = path.join(realParent, fileName);
			} catch {
				throw new SecurityError(
					`Cannot resolve parent directory: ${parentDir}`
				);
			}
		}

		// FIXED: Workspace boundary check instead of absolute path rejection
		const workspaceRealPath = fs.realpathSync(workspaceRoot);

		if (
			!realPath.startsWith(workspaceRealPath + path.sep) &&
			realPath !== workspaceRealPath
		) {
			throw new SecurityError(
				`Path outside workspace: ${realPath} not in ${workspaceRealPath}`
			);
		}

		// Additional check: reject null bytes (path injection)
		if (realPath.includes("\0")) {
			throw new SecurityError("Path contains null bytes");
		}

		return realPath;
	} catch (error) {
		if (error instanceof SecurityError) {
			throw error;
		}
		throw new SecurityError(
			`Path validation failed: ${(error as Error).message}`
		);
	}
}

/**
 * Validate multiple paths in batch
 */
export function validatePaths(
	paths: string[],
	workspaceRoot: string
): string[] {
	return paths.map((p) => validatePath(p, workspaceRoot));
}

/**
 * Check if path is within workspace (without throwing)
 */
export function isWithinWorkspace(
	filePath: string,
	workspaceRoot: string
): boolean {
	try {
		validatePath(filePath, workspaceRoot);
		return true;
	} catch {
		return false;
	}
}
```

**Testing Strategy**:

```typescript
// apps/mcp-server/test/utils/security.test.ts
import { describe, it, expect } from "vitest";
import { validatePath, SecurityError } from "../../src/utils/security";
import * as path from "path";
import * as fs from "fs";

describe("Path Validation - Workspace Boundary Check", () => {
	const workspaceRoot = "/workspace";

	it("should accept absolute paths within workspace", () => {
		const validPath = "/workspace/src/index.ts";

		expect(() => validatePath(validPath, workspaceRoot)).not.toThrow();
	});

	it("should accept relative paths", () => {
		const relativePath = "src/index.ts";

		const result = validatePath(relativePath, workspaceRoot);
		expect(result).toBe(path.join(workspaceRoot, relativePath));
	});

	it("should reject paths outside workspace", () => {
		const outsidePath = "/etc/passwd";

		expect(() => validatePath(outsidePath, workspaceRoot)).toThrow(
			"Path outside workspace"
		);
	});

	it("should reject path traversal attempts", () => {
		const traversalPath = "/workspace/src/../../etc/passwd";

		expect(() => validatePath(traversalPath, workspaceRoot)).toThrow(
			"Path outside workspace"
		);
	});

	it("should reject symlinks pointing outside workspace", () => {
		// Create symlink: /workspace/evil -> /etc
		const symlinkPath = "/workspace/evil";
		fs.symlinkSync("/etc", symlinkPath);

		expect(() => validatePath(symlinkPath, workspaceRoot)).toThrow(
			"Path outside workspace"
		);

		fs.unlinkSync(symlinkPath);
	});

	it("should reject null byte injection", () => {
		const injectionPath = "/workspace/file\0.txt";

		expect(() => validatePath(injectionPath, workspaceRoot)).toThrow(
			"null bytes"
		);
	});

	it("should handle non-existent files within workspace", () => {
		const newFilePath = "/workspace/new-file.ts";

		// Should validate parent directory instead
		expect(() => validatePath(newFilePath, workspaceRoot)).not.toThrow();
	});

	it("should accept VS Code absolute paths", () => {
		// VS Code always provides absolute paths like:
		const vscodePath = "/Users/user/project/src/index.ts";
		const workspaceRoot = "/Users/user/project";

		expect(() => validatePath(vscodePath, workspaceRoot)).not.toThrow();
	});
});
```

**Integration Points**:

1. Update all MCP tool handlers to use new `validatePath()`
2. Update documentation to clarify workspace boundary concept
3. Add telemetry for security violations (path traversal attempts)

---

## PR #7: Override Rationale & TTLs [P2 - 3 days]

### Current Gap

No mechanism for temporary policy overrides with rationale and expiration.

### Solution: Override Schema with Rationale Enum and TTL Enforcement

**No new libraries required** - extend existing PolicyManager

**Implementation Part 1: Schema Extension**:

```typescript
// apps/vscode/src/types/policy.types.ts (additions)

export type OverrideRationale =
	| "testing" // Temporary testing override
	| "temporary_fix" // Short-term workaround for bug
	| "legacy_compat" // Legacy system compatibility
	| "performance"; // Performance optimization

export interface PolicyOverride {
	/**
	 * Glob pattern to match files
	 */
	pattern: string;

	/**
	 * Overridden protection level
	 */
	level: "watch" | "warn" | "block" | "unprotected";

	/**
	 * Required rationale for override
	 */
	rationale: OverrideRationale;

	/**
	 * Optional description providing context
	 */
	description?: string;

	/**
	 * TTL as Unix timestamp (milliseconds)
	 * If not provided, override never expires
	 */
	ttl?: number;

	/**
	 * Metadata for tracking
	 */
	metadata?: {
		createdBy?: string;
		createdAt: number;
		ticket?: string; // Link to issue tracker
	};
}

export interface PolicyConfig {
	version: "1.0";
	rules: PolicyRule[];

	/**
	 * Temporary overrides with expiration
	 */
	overrides?: PolicyOverride[];

	ignore?: string[];
	settings?: {
		defaultProtectionLevel?: "watch" | "warn" | "block" | "unprotected";
		requireSnapshotMessage?: boolean;
		maxSnapshots?: number;

		/**
		 * Warning threshold before override expires (in days)
		 */
		overrideExpirationWarningDays?: number;
	};
}
```

**Implementation Part 2: PolicyManager Extension**:

```typescript
// apps/vscode/src/policy/PolicyManager.ts (additions)
export class PolicyManager {
	private expirationCheckInterval: NodeJS.Timeout | null = null;

	async initialize(): Promise<void> {
		await this.loadPolicy();
		this.setupWatcher();

		// Check for expired overrides daily
		this.startExpirationChecks();
	}

	/**
	 * Get protection level with override precedence
	 *
	 * Precedence: Overrides > Rules > Default
	 */
	getProtectionLevel(filePath: string): ProtectionLevel | null {
		if (!this.policy) {
			return null;
		}

		const relativePath = path.relative(this.workspaceRoot, filePath);

		// Check ignore patterns first
		if (this.shouldIgnore(filePath)) {
			return null;
		}

		// Check overrides (highest precedence)
		if (this.policy.overrides) {
			for (const override of this.policy.overrides) {
				if (minimatch(relativePath, override.pattern, { dot: true })) {
					// Check if override has expired
					if (override.ttl && Date.now() > override.ttl) {
						logger.warn("Override expired, falling back to rule", {
							pattern: override.pattern,
							expired: new Date(override.ttl).toISOString(),
						});
						continue; // Skip expired override
					}

					return this.convertPolicyLevel(override.level);
				}
			}
		}

		// Check regular rules
		for (const rule of this.policy.rules) {
			if (minimatch(relativePath, rule.pattern, { dot: true })) {
				return this.convertPolicyLevel(rule.level);
			}
		}

		// Return default if specified
		if (this.policy.settings?.defaultProtectionLevel) {
			return this.convertPolicyLevel(
				this.policy.settings.defaultProtectionLevel
			);
		}

		return null;
	}

	/**
	 * Check for expiring overrides and notify user
	 */
	private async checkExpiringOverrides(): Promise<void> {
		if (!this.policy?.overrides) {
			return;
		}

		const warningDays =
			this.policy.settings?.overrideExpirationWarningDays || 7;
		const warningThreshold = Date.now() + warningDays * 24 * 60 * 60 * 1000;

		for (const override of this.policy.overrides) {
			if (!override.ttl) {
				continue; // No expiration
			}

			const now = Date.now();

			// Already expired
			if (now > override.ttl) {
				await this.notifyExpiredOverride(override);
				continue;
			}

			// Expiring soon
			if (override.ttl < warningThreshold) {
				const daysRemaining = Math.ceil(
					(override.ttl - now) / (24 * 60 * 60 * 1000)
				);
				await this.notifyExpiringOverride(override, daysRemaining);
			}
		}
	}

	/**
	 * Notify user of expired override
	 */
	private async notifyExpiredOverride(
		override: PolicyOverride
	): Promise<void> {
		const message =
			`Policy override expired for "${override.pattern}". ` +
			`Original protection rules now apply.`;

		const action = await vscode.window.showWarningMessage(
			message,
			"Renew Override",
			"Remove Override",
			"Dismiss"
		);

		if (action === "Renew Override") {
			await this.renewOverride(override);
		} else if (action === "Remove Override") {
			await this.removeOverride(override.pattern);
		}
	}

	/**
	 * Notify user of expiring override
	 */
	private async notifyExpiringOverride(
		override: PolicyOverride,
		daysRemaining: number
	): Promise<void> {
		const message =
			`Policy override for "${override.pattern}" expires in ${daysRemaining} day(s). ` +
			`Rationale: ${override.rationale}`;

		const action = await vscode.window.showInformationMessage(
			message,
			"Extend TTL",
			"Remove Override",
			"Dismiss"
		);

		if (action === "Extend TTL") {
			await this.extendOverrideTTL(override);
		} else if (action === "Remove Override") {
			await this.removeOverride(override.pattern);
		}
	}

	/**
	 * Renew expired override with new TTL
	 */
	private async renewOverride(override: PolicyOverride): Promise<void> {
		const ttlDays = await vscode.window.showInputBox({
			prompt: "Enter TTL in days",
			value: "30",
			validateInput: (value) => {
				const days = Number.parseInt(value);
				return isNaN(days) || days <= 0
					? "Must be a positive number"
					: null;
			},
		});

		if (!ttlDays) {
			return;
		}

		const newTTL =
			Date.now() + Number.parseInt(ttlDays) * 24 * 60 * 60 * 1000;

		// Update policy file
		await this.updateOverrideTTL(override.pattern, newTTL);

		vscode.window.showInformationMessage(
			`Override renewed for ${ttlDays} days`
		);
	}

	/**
	 * Extend TTL for expiring override
	 */
	private async extendOverrideTTL(override: PolicyOverride): Promise<void> {
		const extensionDays = await vscode.window.showQuickPick(
			["7", "14", "30", "60", "90"],
			{ placeHolder: "Extend by how many days?" }
		);

		if (!extensionDays) {
			return;
		}

		const currentTTL = override.ttl || Date.now();
		const newTTL =
			currentTTL + Number.parseInt(extensionDays) * 24 * 60 * 60 * 1000;

		await this.updateOverrideTTL(override.pattern, newTTL);

		vscode.window.showInformationMessage(
			`Override extended by ${extensionDays} days`
		);
	}

	/**
	 * Update override TTL in policy file
	 */
	private async updateOverrideTTL(
		pattern: string,
		newTTL: number
	): Promise<void> {
		if (!this.policy?.overrides) {
			return;
		}

		// Find and update override
		const override = this.policy.overrides.find(
			(o) => o.pattern === pattern
		);
		if (override) {
			override.ttl = newTTL;
		}

		// Write updated policy to disk
		await fs.writeFile(
			this.policyPath,
			JSON.stringify(this.policy, null, 2),
			"utf8"
		);

		logger.info("Override TTL updated", {
			pattern,
			newTTL: new Date(newTTL).toISOString(),
		});
	}

	/**
	 * Remove override from policy
	 */
	private async removeOverride(pattern: string): Promise<void> {
		if (!this.policy?.overrides) {
			return;
		}

		this.policy.overrides = this.policy.overrides.filter(
			(o) => o.pattern !== pattern
		);

		await fs.writeFile(
			this.policyPath,
			JSON.stringify(this.policy, null, 2),
			"utf8"
		);

		logger.info("Override removed", { pattern });
	}

	/**
	 * Start periodic expiration checks
	 */
	private startExpirationChecks(): void {
		// Check immediately
		this.checkExpiringOverrides().catch((error) => {
			logger.error("Failed to check expiring overrides", error);
		});

		// Check daily
		this.expirationCheckInterval = setInterval(() => {
			this.checkExpiringOverrides().catch((error) => {
				logger.error("Failed to check expiring overrides", error);
			});
		}, 24 * 60 * 60 * 1000); // 24 hours
	}

	/**
	 * Convert policy level to protection level
	 */
	private convertPolicyLevel(level: string): ProtectionLevel | null {
		switch (level) {
			case "block":
				return "Protected";
			case "warn":
				return "Warning";
			case "watch":
				return "Watched";
			case "unprotected":
				return null;
			default:
				return "Watched";
		}
	}

	dispose(): void {
		if (this.watcher) {
			this.watcher.dispose();
			this.watcher = null;
		}

		if (this.expirationCheckInterval) {
			clearInterval(this.expirationCheckInterval);
			this.expirationCheckInterval = null;
		}
	}
}
```

**Implementation Part 3: User Command for Creating Overrides**:

```typescript
// apps/vscode/src/commands/createPolicyOverride.ts
import * as vscode from "vscode";
import { logger } from "../utils/logger";
import type { PolicyOverride, OverrideRationale } from "../types/policy.types";

/**
 * Command: snapback.createPolicyOverride
 * Interactive wizard for creating temporary policy overrides
 */
export async function createPolicyOverride(filePath?: string): Promise<void> {
	try {
		// Step 1: Get file pattern
		const pattern = await vscode.window.showInputBox({
			prompt: 'Enter glob pattern for override (e.g., "*.test.ts")',
			value: filePath ? `**/${path.basename(filePath)}` : "",
			placeHolder: "**/*.test.ts",
		});

		if (!pattern) return;

		// Step 2: Select protection level
		const level = await vscode.window.showQuickPick(
			[
				{ label: "Unprotected", value: "unprotected" },
				{ label: "Watch", value: "watch" },
				{ label: "Warn", value: "warn" },
				{ label: "Block", value: "block" },
			],
			{ placeHolder: "Select override protection level" }
		);

		if (!level) return;

		// Step 3: Select rationale
		const rationale = await vscode.window.showQuickPick(
			[
				{
					label: "Testing",
					value: "testing",
					description: "Temporary override for testing purposes",
				},
				{
					label: "Temporary Fix",
					value: "temporary_fix",
					description: "Short-term workaround for a bug",
				},
				{
					label: "Legacy Compatibility",
					value: "legacy_compat",
					description: "Required for legacy system integration",
				},
				{
					label: "Performance",
					value: "performance",
					description: "Performance optimization override",
				},
			],
			{ placeHolder: "Select rationale for override" }
		);

		if (!rationale) return;

		// Step 4: Set TTL
		const ttlDays = await vscode.window.showQuickPick(
			["7", "14", "30", "60", "90", "No expiration"],
			{ placeHolder: "Select override TTL (in days)" }
		);

		if (!ttlDays) return;

		const ttl =
			ttlDays === "No expiration"
				? undefined
				: Date.now() + Number.parseInt(ttlDays) * 24 * 60 * 60 * 1000;

		// Step 5: Optional description
		const description = await vscode.window.showInputBox({
			prompt: "Optional: Provide additional context",
			placeHolder:
				"e.g., Required for integration testing with legacy API",
		});

		// Create override object
		const override: PolicyOverride = {
			pattern,
			level: level.value as any,
			rationale: rationale.value as OverrideRationale,
			description,
			ttl,
			metadata: {
				createdAt: Date.now(),
				createdBy: await getGitUser(),
			},
		};

		// Add to policy file
		await addOverrideToPolicy(override);

		const expirationMsg = ttl
			? `Expires: ${new Date(ttl).toLocaleDateString()}`
			: "No expiration";

		vscode.window.showInformationMessage(
			`Policy override created for "${pattern}". ${expirationMsg}`
		);

		logger.info("Policy override created", override);
	} catch (error) {
		logger.error("Failed to create policy override", error as Error);
		vscode.window.showErrorMessage("Failed to create policy override");
	}
}

async function getGitUser(): Promise<string | undefined> {
	try {
		const { execSync } = require("child_process");
		const username = execSync("git config user.name", {
			encoding: "utf8",
		}).trim();
		return username || undefined;
	} catch {
		return undefined;
	}
}

async function addOverrideToPolicy(override: PolicyOverride): Promise<void> {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) {
		throw new Error("No workspace open");
	}

	const policyPath = path.join(workspaceRoot, ".snapback", "policy.json");

	// Load existing policy
	const policyContent = await fs.readFile(policyPath, "utf8");
	const policy = JSON.parse(policyContent);

	// Add override
	policy.overrides = policy.overrides || [];
	policy.overrides.push(override);

	// Write back
	await fs.writeFile(policyPath, JSON.stringify(policy, null, 2), "utf8");
}
```

**Example Policy File with Overrides**:

```json
{
	"version": "1.0",
	"rules": [
		{
			"pattern": "**/*.env*",
			"level": "block",
			"reason": "Environment files contain sensitive credentials"
		}
	],
	"overrides": [
		{
			"pattern": "**/*.test.ts",
			"level": "unprotected",
			"rationale": "testing",
			"description": "Test files don't need protection during development",
			"ttl": 1735689600000,
			"metadata": {
				"createdBy": "john@example.com",
				"createdAt": 1704067200000,
				"ticket": "SNAP-123"
			}
		},
		{
			"pattern": "legacy/**/*.js",
			"level": "watch",
			"rationale": "legacy_compat",
			"description": "Legacy code integration - reduce protection temporarily",
			"ttl": 1736899200000,
			"metadata": {
				"createdBy": "jane@example.com",
				"createdAt": 1704153600000
			}
		}
	],
	"ignore": ["node_modules/**", ".git/**"],
	"settings": {
		"defaultProtectionLevel": "watch",
		"overrideExpirationWarningDays": 7
	}
}
```

**Testing Strategy**:

```typescript
// apps/vscode/test/policy/PolicyManager.overrides.test.ts
import { describe, it, expect, vi } from "vitest";
import { PolicyManager } from "../../src/policy/PolicyManager";

describe("PolicyManager - Overrides with TTL", () => {
	it("should apply override over rule", () => {
		const policy = {
			version: "1.0",
			rules: [{ pattern: "*.env", level: "block" }],
			overrides: [
				{ pattern: "*.env", level: "watch", rationale: "testing" },
			],
		};

		const manager = new PolicyManager("/workspace");
		(manager as any).policy = policy;

		const level = manager.getProtectionLevel("/workspace/.env");
		expect(level).toBe("Watched"); // Override wins
	});

	it("should skip expired overrides", () => {
		const policy = {
			version: "1.0",
			rules: [{ pattern: "*.env", level: "block" }],
			overrides: [
				{
					pattern: "*.env",
					level: "watch",
					rationale: "testing",
					ttl: Date.now() - 1000, // Expired 1 second ago
				},
			],
		};

		const manager = new PolicyManager("/workspace");
		(manager as any).policy = policy;

		const level = manager.getProtectionLevel("/workspace/.env");
		expect(level).toBe("Protected"); // Falls back to rule
	});

	it("should notify for expiring overrides", async () => {
		const showInfoSpy = vi.spyOn(vscode.window, "showInformationMessage");

		const policy = {
			version: "1.0",
			settings: { overrideExpirationWarningDays: 7 },
			overrides: [
				{
					pattern: "*.test.ts",
					level: "unprotected",
					rationale: "testing",
					ttl: Date.now() + 3 * 24 * 60 * 60 * 1000, // Expires in 3 days
				},
			],
		};

		const manager = new PolicyManager("/workspace");
		(manager as any).policy = policy;

		await (manager as any).checkExpiringOverrides();

		expect(showInfoSpy).toHaveBeenCalledWith(
			expect.stringContaining("expires in 3 day(s)"),
			expect.anything(),
			expect.anything(),
			expect.anything()
		);
	});
});
```

**Integration Points**:

1. Register `createPolicyOverride` command in extension.ts
2. Add context menu item "Create Policy Override" in file explorer
3. Show override status in file decorations (if file matches override)

---

## Appendix A: Dependency Installation Summary

```bash
# PR #1: Ed25519 Signature Verification
pnpm add @noble/ed25519@^2.0.0

# PR #3: Snapshot Encryption
pnpm add node-machine-id@^1.0.1

# No additional dependencies needed for:
# - PR #2: Telemetry Proxy (use built-in fetch)
# - PR #4: Config Merge Determinism (algorithm only)
# - PR #5: Offline Mode (feature flag only)
# - PR #6: MCP Path Validation (use built-in fs.realpathSync)
# - PR #7: Override Rationale & TTLs (schema extension only)
```

---

## Appendix B: Testing Checklist

### PR #1 Testing

-   [ ] Valid signature acceptance
-   [ ] Invalid signature rejection
-   [ ] Tampered bundle rejection
-   [ ] minClientVersion enforcement
-   [ ] Stale bundle handling

### PR #2 Testing

-   [ ] Zero direct PostHog connections
-   [ ] All events route through proxy
-   [ ] Event allowlist enforcement
-   [ ] PII property stripping
-   [ ] IP scrubbing verification

### PR #3 Testing

-   [ ] Encryption/decryption roundtrip
-   [ ] Tamper detection
-   [ ] Device-specific key derivation
-   [ ] Migration of existing snapshots
-   [ ] Performance impact measurement

### PR #4 Testing

-   [ ] Nearest-up-wins precedence
-   [ ] Depth-first processing
-   [ ] Deep merge correctness
-   [ ] Property preservation

### PR #5 Testing

-   [ ] No network calls in offline mode
-   [ ] Cached rules usage
-   [ ] Graceful fallback
-   [ ] Toggle command functionality

### PR #6 Testing

-   [ ] VS Code absolute path acceptance
-   [ ] Workspace boundary enforcement
-   [ ] Path traversal rejection
-   [ ] Symlink attack prevention

### PR #7 Testing

-   [ ] Override precedence over rules
-   [ ] TTL expiration enforcement
-   [ ] Expiration notifications
-   [ ] TTL extension workflow

---

## Appendix C: Rollout Timeline

| Week   | PRs                 | Focus                              |
| ------ | ------------------- | ---------------------------------- |
| Week 1 | PR #1, PR #2        | Critical security (P0)             |
| Week 2 | PR #3, PR #6        | Encryption + MCP fix               |
| Week 3 | PR #4, PR #5, PR #7 | Config + offline + overrides       |
| Week 4 | -                   | Testing, monitoring, documentation |

---

## Appendix D: Success Metrics

**Security Improvements**:

-   Rule bundle tampering: 0 accepted invalid signatures
-   Telemetry IP exposure: 0% (100% proxy routing)
-   Snapshot plaintext storage: 0% (100% encrypted)

**Functionality Improvements**:

-   MCP path validation failures: Reduced from 100% to <1%
-   Config merge determinism: 100% nearest-up-wins compliance
-   Offline mode adoption: Track usage via telemetry

**Quality Metrics**:

-   Test coverage: >80% for all new code
-   Performance impact: <10ms overhead for encryption
-   Zero breaking changes to existing workflows

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Status**: Ready for Implementation
**Estimated Completion**: 18 days with full testing
