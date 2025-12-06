// Import crypto for better ETag generation
import { createHash } from "node:crypto";
// Import environment variables
import { env } from "@snapback/config";
import { apiKeys, subscriptions } from "@snapback/platform";
import { eq } from "drizzle-orm";
// Using jose for JWS signing since it's available in the project
import { SignJWT } from "jose";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

// Temporarily define the types here
const FEATURE_FLAGS = {
	// Core protection features
	"protection.enabled": true,
	"protection.auto_snapshot": true,
	"protection.pre_save_hook": true,

	// Risk analysis
	"risk.guardian_v2": false,
	"risk.dependency_analysis": true,
	"risk.deep_analysis": false,
	"risk.ai_detection": true,

	// Storage
	"storage.compression": true,
	"storage.deduplication": false,
	"storage.encryption": false,

	// UI/UX
	"ui.chat_participant": true,
	"ui.status_bar": true,
	"ui.timeline_view": true,

	// Telemetry
	"telemetry.detailed_events": false,
	"telemetry.performance_metrics": true,
	"telemetry.sampling_rate": 1.0,

	// Experimental
	"experimental.mcp_tools": false,
	"experimental.recovery_mode": false,

	// A/B Testing - DeepScan
	"deepscan.v2_algorithm": false,
	"deepscan.enhanced_analysis": false,
	"deepscan.real_time_processing": false,
} as const;

type FeatureFlag = keyof typeof FEATURE_FLAGS;

class FeatureManager {
	private static instance: FeatureManager;
	private flags: Map<FeatureFlag, boolean | number> = new Map();

	private constructor() {
		// Initialize with default values
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key as FeatureFlag, value as boolean | number);
		}

		// Override with environment variables
		this.loadEnvironmentOverrides();
	}

	static getInstance(): FeatureManager {
		if (!FeatureManager.instance) {
			FeatureManager.instance = new FeatureManager();
		}
		return FeatureManager.instance;
	}

	isEnabled(flag: FeatureFlag): boolean {
		const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
		// For sampling rate flags, compare with random value
		if (flag === "telemetry.sampling_rate" && typeof value === "number") {
			return Math.random() < value;
		}
		return Boolean(value);
	}

	getValue<T>(flag: FeatureFlag): T | undefined {
		return this.flags.get(flag) as T | undefined;
	}

	setFlag(flag: FeatureFlag, value: boolean | number): void {
		this.flags.set(flag, value);
	}

	private loadEnvironmentOverrides(): void {
		// Check for environment variable overrides
		for (const flag of Object.keys(FEATURE_FLAGS)) {
			const envVar = `SNAPBACK_${flag.replace(/\./g, "_").toUpperCase()}`;
			const envValue = process.env[envVar];

			if (envValue !== undefined) {
				// Parse boolean values
				if (envValue === "true" || envValue === "false") {
					this.flags.set(flag as FeatureFlag, envValue === "true");
				}
				// Parse numeric values
				else if (!Number.isNaN(Number(envValue))) {
					this.flags.set(flag as FeatureFlag, Number(envValue));
				}
				// Keep as string for other values (though we don't expect string flags)
			}
		}
	}

	reset(): void {
		this.flags.clear();
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key as FeatureFlag, value as boolean | number);
		}
		this.loadEnvironmentOverrides();
	}
}

// Input validation schema
const getRulesBundleSchema = z.object({
	// Optional ETag for conditional requests
	etag: z.string().optional(),
});

// Rule thresholds and tier mappings
const RULE_THRESHOLDS = {
	free: {
		riskThreshold: 0.3,
		maxSnapshots: 100,
		cloudBackup: false,
		advancedDetection: false,
		customRules: false,
	},
	solo: {
		riskThreshold: 0.2,
		maxSnapshots: 1000,
		cloudBackup: true,
		advancedDetection: true,
		customRules: true,
	},
	team: {
		riskThreshold: 0.1,
		maxSnapshots: 10000,
		cloudBackup: true,
		advancedDetection: true,
		customRules: true,
	},
	enterprise: {
		riskThreshold: 0.05,
		maxSnapshots: 100000,
		cloudBackup: true,
		advancedDetection: true,
		customRules: true,
	},
};

// Default rules configuration
const DEFAULT_RULES = {
	// Risk analysis thresholds
	riskThresholds: {
		low: 0.3,
		medium: 0.6,
		high: 0.8,
	},

	// File protection patterns
	protectionPatterns: [
		{
			pattern: "**/*.env",
			protectionLevel: "block",
			reason: "Environment files contain secrets",
		},
		{
			pattern: "**/package.json",
			protectionLevel: "warn",
			reason: "Dependency changes require review",
		},
		{
			pattern: "**/tsconfig.json",
			protectionLevel: "warn",
			reason: "Configuration changes require review",
		},
	],

	// Snapshot policies
	snapshotPolicies: {
		debounceWindow: 300000, // 5 minutes
		maxSnapshotsPerFile: 50,
		retentionDays: 30,
	},

	// Feature flags
	featureFlags: {
		enableAIAnalysis: true,
		enableSecretDetection: true,
		enableDependencyAnalysis: true,
	},
};

export const getRulesBundle = protectedProcedure
	.input(getRulesBundleSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;
		if (!user) {
			throw new Error("Unauthorized");
		}

		// Get user's API key to determine subscription tier
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		const apiKeyResult = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.userId, user.id))
			.limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			throw new Error("No API key found");
		}

		const _apiKey = apiKeyResult[0];

		// Get user's subscription tier
		const subscriptionResult = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, user.id))
			.limit(1);

		const subscription =
			subscriptionResult && subscriptionResult.length > 0
				? subscriptionResult[0]
				: null;

		const tier = subscription?.plan || "free";

		// Get tier-specific thresholds
		const tierThresholds =
			RULE_THRESHOLDS[tier as keyof typeof RULE_THRESHOLDS] ||
			RULE_THRESHOLDS.free;

		// Get feature flags from FeatureManager
		// MVP Note: Feature flags are included in the rules bundle (not remote flips)
		// This allows for consistent feature flagging across all clients without remote calls
		const featureManager = FeatureManager.getInstance();
		const userFeatureFlags: Record<string, boolean> = {};

		// Add all feature flags to the bundle
		for (const flag of Object.keys(FEATURE_FLAGS) as FeatureFlag[]) {
			userFeatureFlags[flag] = featureManager.isEnabled(flag);
		}

		// Create rules bundle with tier-specific configuration and feature flags
		const rulesBundle = {
			...DEFAULT_RULES,
			tier,
			tierThresholds,
			featureFlags: userFeatureFlags,
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		};

		// Generate ETag based on bundle content using SHA-256
		const bundleString = JSON.stringify(rulesBundle);
		const etag = generateETag(bundleString);

		// Check if client has provided ETag and if it matches
		if (input.etag && input.etag === etag) {
			// Return 304 Not Modified if ETag matches
			return {
				notModified: true,
				etag,
			};
		}

		// Sign the bundle with JWS
		const signedBundle = await signRulesBundle(rulesBundle);

		return {
			bundle: signedBundle,
			etag,
			tier,
		};
	});

// Helper function to generate ETag using SHA-256
function generateETag(content: string): string {
	// Use SHA-256 for more robust ETag generation
	const hash = createHash("sha256").update(content).digest("hex");
	return `"${hash}"`;
}

// Helper function to sign rules bundle with JWS
async function signRulesBundle(
	bundle: Record<string, unknown>,
): Promise<string> {
	// Use environment variable for signing key, fallback to hardcoded key for MVP
	// MVP Note: In production, always use a secure environment variable
	const secretKey = env.RULES_SIGNING_KEY || "snapback-rules-secret-key";
	const secret = new TextEncoder().encode(secretKey);

	const jwt = await new SignJWT(bundle)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer("snapback-rules")
		.setAudience("snapback-clients")
		.setExpirationTime("1d")
		.sign(secret);

	return jwt;
}
