/**
 * UAT Seed Script - Comprehensive Test Data for User Acceptance Testing
 *
 * Creates realistic test personas covering:
 * - All subscription tiers (free, pro, team, enterprise)
 * - All pioneer tiers (seedling, grower, cultivator, guardian)
 * - Various product usage states (new, active, power-user)
 * - Edge cases (at-limit, expired, churned)
 *
 * Usage:
 *   pnpm --filter @snapback/platform db:seed:uat           # Full seed
 *   pnpm --filter @snapback/platform db:seed:uat --clean   # Clean + reseed
 *   pnpm --filter @snapback/platform db:seed:uat --persona free-basic  # Single persona
 *
 * @see ai_dev_utils/ROUTER.md for learning integration
 */

import { createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { closeDatabaseConnection, db } from "../src/db/client";
import {
	account,
	apiKeys,
	apiUsage,
	clientTokens,
	member,
	organization,
	pioneerActions,
	pioneers,
	pioneerTierHistory,
	session,
	subscriptions,
	user,
} from "../src/db/schema/postgres";
import {
	engagementScores,
	extensionSessions,
	snapshotFiles,
	snapshots,
	telemetryEvents,
	trustScores,
	userLifecycleState,
	userSafetyProfiles,
} from "../src/db/schema/snapback";

// ============================================================================
// Types
// ============================================================================

interface TestPersona {
	id: string;
	name: string;
	email: string;
	description: string;
	tier: "free" | "pro" | "team" | "enterprise";
	pioneer: {
		tier: "seedling" | "grower" | "cultivator" | "guardian";
		points: number;
	} | null;
	usage: {
		snapshots: number;
		aiDetections: number;
		daysActive: number;
	};
	organization?: {
		name: string;
		slug: string;
		role: "owner" | "admin" | "member";
	};
	flags: {
		atLimit?: boolean;
		expired?: boolean;
		churned?: boolean;
		newSignup?: boolean;
	};
}

// ============================================================================
// Test Personas Definition
// ============================================================================

const TEST_PERSONAS: TestPersona[] = [
	// -------------------------------------------------------------------------
	// Free Tier Users
	// -------------------------------------------------------------------------
	{
		id: "uat-free-basic",
		name: "Free Basic User",
		email: "free-basic@uat.snapback.dev",
		description: "Standard free tier user with moderate usage",
		tier: "free",
		pioneer: null,
		usage: { snapshots: 15, aiDetections: 5, daysActive: 14 },
		flags: {},
	},
	{
		id: "uat-free-new",
		name: "New Signup User",
		email: "free-new@uat.snapback.dev",
		description: "Fresh signup, no usage yet - tests empty states",
		tier: "free",
		pioneer: null,
		usage: { snapshots: 0, aiDetections: 0, daysActive: 0 },
		flags: { newSignup: true },
	},
	{
		id: "uat-free-at-limit",
		name: "Free At Limit User",
		email: "free-limit@uat.snapback.dev",
		description: "Free tier at usage limit - tests upgrade CTAs",
		tier: "free",
		pioneer: { tier: "seedling", points: 50 },
		usage: { snapshots: 50, aiDetections: 10, daysActive: 30 },
		flags: { atLimit: true },
	},

	// -------------------------------------------------------------------------
	// Pro Tier Users
	// -------------------------------------------------------------------------
	{
		id: "uat-pro-active",
		name: "Pro Active User",
		email: "pro-active@uat.snapback.dev",
		description: "Active Pro subscriber with healthy usage",
		tier: "pro",
		pioneer: { tier: "grower", points: 350 },
		usage: { snapshots: 200, aiDetections: 80, daysActive: 60 },
		flags: {},
	},
	{
		id: "uat-pro-power",
		name: "Pro Power User",
		email: "pro-power@uat.snapback.dev",
		description: "Heavy Pro user - tests scale and performance",
		tier: "pro",
		pioneer: { tier: "cultivator", points: 850 },
		usage: { snapshots: 500, aiDetections: 200, daysActive: 90 },
		flags: {},
	},
	{
		id: "uat-pro-churned",
		name: "Pro Churned User",
		email: "pro-churned@uat.snapback.dev",
		description: "Cancelled Pro subscription - tests reactivation flows",
		tier: "pro",
		pioneer: { tier: "grower", points: 250 },
		usage: { snapshots: 150, aiDetections: 50, daysActive: 45 },
		flags: { churned: true },
	},

	// -------------------------------------------------------------------------
	// Team/Enterprise Tier Users
	// -------------------------------------------------------------------------
	{
		id: "uat-team-owner",
		name: "Team Owner",
		email: "team-owner@uat.snapback.dev",
		description: "Team plan owner - tests team management",
		tier: "team",
		pioneer: { tier: "cultivator", points: 1000 },
		usage: { snapshots: 300, aiDetections: 120, daysActive: 75 },
		organization: { name: "Acme Corp", slug: "acme-corp", role: "owner" },
		flags: {},
	},
	{
		id: "uat-team-member",
		name: "Team Member",
		email: "team-member@uat.snapback.dev",
		description: "Team member (not owner) - tests permission boundaries",
		tier: "team",
		pioneer: { tier: "grower", points: 400 },
		usage: { snapshots: 100, aiDetections: 40, daysActive: 30 },
		organization: { name: "Acme Corp", slug: "acme-corp", role: "member" },
		flags: {},
	},
	{
		id: "uat-enterprise-admin",
		name: "Enterprise Admin",
		email: "enterprise-admin@uat.snapback.dev",
		description: "Enterprise admin - tests full feature access",
		tier: "enterprise",
		pioneer: { tier: "guardian", points: 2000 },
		usage: { snapshots: 1000, aiDetections: 400, daysActive: 180 },
		organization: { name: "BigCorp Inc", slug: "bigcorp", role: "admin" },
		flags: {},
	},

	// -------------------------------------------------------------------------
	// Pioneer-Focused Users
	// -------------------------------------------------------------------------
	{
		id: "uat-pioneer-seedling",
		name: "Pioneer Seedling",
		email: "pioneer-seedling@uat.snapback.dev",
		description: "New pioneer - tests tier progression",
		tier: "free",
		pioneer: { tier: "seedling", points: 75 },
		usage: { snapshots: 10, aiDetections: 3, daysActive: 7 },
		flags: {},
	},
	{
		id: "uat-pioneer-guardian",
		name: "Pioneer Guardian",
		email: "pioneer-guardian@uat.snapback.dev",
		description: "Top-tier pioneer - tests all pioneer perks",
		tier: "free",
		pioneer: { tier: "guardian", points: 2500 },
		usage: { snapshots: 400, aiDetections: 150, daysActive: 120 },
		flags: {},
	},

	// -------------------------------------------------------------------------
	// Demo User (for live demos)
	// -------------------------------------------------------------------------
	{
		id: "uat-demo",
		name: "Demo Power User",
		email: "demo@uat.snapback.dev",
		description: "Polished demo account with impressive stats",
		tier: "pro",
		pioneer: { tier: "cultivator", points: 1250 },
		usage: { snapshots: 847, aiDetections: 312, daysActive: 90 },
		flags: {},
	},
];

// ============================================================================
// Helper Functions
// ============================================================================

function generateHash(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

function generateApiKey(): { key: string; hash: string; preview: string } {
	const key = `sb_${randomBytes(24).toString("hex")}`;
	return {
		key,
		hash: generateHash(key),
		preview: key.substring(0, 10),
	};
}

function generateReferralCode(): string {
	return randomBytes(4).toString("hex").toUpperCase();
}

function daysAgo(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
}

function randomBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Seeding Functions
// ============================================================================

async function cleanDatabase(): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("🧹 Cleaning existing UAT data...");

	const uatEmails = TEST_PERSONAS.map((p) => p.email);

	// Get UAT user IDs first
	const uatUsers = await db.select({ id: user.id }).from(user).where(sql`${user.email} = ANY(${uatEmails})`);

	const uatUserIds = uatUsers.map((u) => u.id);

	if (uatUserIds.length > 0) {
		// Delete related data in order
		for (const userId of uatUserIds) {
			await db.delete(telemetryEvents).where(sql`${telemetryEvents.userId} = ${userId}`);
			await db.delete(extensionSessions).where(sql`${extensionSessions.userId} = ${userId}`);
			await db.delete(engagementScores).where(sql`${engagementScores.userId} = ${userId}`);
			await db.delete(trustScores).where(sql`${trustScores.userId} = ${userId}`);
			await db.delete(userLifecycleState).where(sql`${userLifecycleState.userId} = ${userId}`);
			await db.delete(userSafetyProfiles).where(sql`${userSafetyProfiles.userId} = ${userId}`);
		}

		// Delete pioneers
		await db.delete(pioneers).where(sql`${pioneers.userId} = ANY(${uatUserIds})`);

		// Delete API keys
		await db.delete(apiKeys).where(sql`${apiKeys.userId} = ANY(${uatUserIds})`);

		// Delete client tokens
		await db.delete(clientTokens).where(sql`${clientTokens.userId} = ANY(${uatUserIds})`);

		// Delete subscriptions
		await db.delete(subscriptions).where(sql`${subscriptions.userId} = ANY(${uatUserIds})`);

		// Delete snapshots
		await db.delete(snapshots).where(sql`${snapshots.userId} = ANY(${uatUserIds})`);

		// Delete org members
		await db.delete(member).where(sql`${member.userId} = ANY(${uatUserIds})`);

		// Delete sessions and accounts
		await db.delete(session).where(sql`${session.userId} = ANY(${uatUserIds})`);
		await db.delete(account).where(sql`${account.userId} = ANY(${uatUserIds})`);

		// Delete users
		await db.delete(user).where(sql`${user.id} = ANY(${uatUserIds})`);
	}

	// Clean UAT organizations
	await db.delete(organization).where(sql`${organization.slug} IN ('acme-corp', 'bigcorp')`);

	console.log("✅ Cleanup complete");
}

async function seedUsers(personas: TestPersona[]): Promise<Map<string, string>> {
	if (!db) throw new Error("Database not available");

	console.log("👤 Seeding users...");
	const userIdMap = new Map<string, string>();

	for (const persona of personas) {
		const [newUser] = await db
			.insert(user)
			.values({
				name: persona.name,
				email: persona.email,
				emailVerified: true,
				onboardingComplete: !persona.flags.newSignup,
				subscriptionTier: persona.tier,
				totalSnapshots: persona.usage.snapshots,
				totalRecoveries: Math.floor(persona.usage.snapshots * 0.1),
				createdAt: daysAgo(persona.usage.daysActive + randomBetween(1, 30)),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: user.email,
				set: {
					name: persona.name,
					subscriptionTier: persona.tier,
					totalSnapshots: persona.usage.snapshots,
					updatedAt: new Date(),
				},
			})
			.returning();

		userIdMap.set(persona.id, newUser.id);

		// Create GitHub OAuth account
		await db
			.insert(account)
			.values({
				userId: newUser.id,
				accountId: `github-${persona.id}`,
				providerId: "github",
				createdAt: daysAgo(persona.usage.daysActive),
				updatedAt: new Date(),
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${persona.name} (${persona.email})`);
	}

	return userIdMap;
}

async function seedOrganizations(
	personas: TestPersona[],
	userIdMap: Map<string, string>,
): Promise<Map<string, string>> {
	if (!db) throw new Error("Database not available");

	console.log("🏢 Seeding organizations...");
	const orgIdMap = new Map<string, string>();

	const orgs = new Map<string, { name: string; slug: string }>();
	for (const persona of personas) {
		if (persona.organization) {
			orgs.set(persona.organization.slug, {
				name: persona.organization.name,
				slug: persona.organization.slug,
			});
		}
	}

	for (const [slug, org] of orgs) {
		const [newOrg] = await db
			.insert(organization)
			.values({
				name: org.name,
				slug: org.slug,
				createdAt: daysAgo(90),
			})
			.onConflictDoUpdate({
				target: organization.slug,
				set: { name: org.name },
			})
			.returning();

		orgIdMap.set(slug, newOrg.id);
		console.log(`  ✓ ${org.name} (${slug})`);
	}

	for (const persona of personas) {
		if (persona.organization) {
			const userId = userIdMap.get(persona.id);
			const orgId = orgIdMap.get(persona.organization.slug);

			if (userId && orgId) {
				await db
					.insert(member)
					.values({
						userId,
						organizationId: orgId,
						role: persona.organization.role,
						createdAt: daysAgo(persona.usage.daysActive),
					})
					.onConflictDoNothing();
			}
		}
	}

	return orgIdMap;
}

async function seedSubscriptions(
	personas: TestPersona[],
	userIdMap: Map<string, string>,
	orgIdMap: Map<string, string>,
): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("💳 Seeding subscriptions...");

	for (const persona of personas) {
		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		const orgId = persona.organization ? orgIdMap.get(persona.organization.slug) : null;

		const periodStart = daysAgo(30);
		const periodEnd = persona.flags.expired ? daysAgo(-30) : daysAgo(-335);

		await db
			.insert(subscriptions)
			.values({
				userId,
				organizationId: orgId,
				plan: persona.tier,
				status: persona.flags.churned ? "canceled" : persona.flags.expired ? "past_due" : "active",
				currentPeriodStart: periodStart,
				currentPeriodEnd: periodEnd,
				cancelAtPeriodEnd: persona.flags.churned,
				stripeCustomerId: `cus_uat_${persona.id}`,
				stripeSubscriptionId: persona.tier !== "free" ? `sub_uat_${persona.id}` : null,
				createdAt: daysAgo(persona.usage.daysActive + 5),
				updatedAt: new Date(),
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${persona.name}: ${persona.tier}`);
	}
}

async function seedPioneers(personas: TestPersona[], userIdMap: Map<string, string>): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("🌱 Seeding pioneers...");

	for (const persona of personas) {
		if (!persona.pioneer) continue;

		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		const [newPioneer] = await db
			.insert(pioneers)
			.values({
				userId,
				username: persona.email.split("@")[0],
				githubId: `github-${persona.id}`,
				contactEmail: persona.email,
				tier: persona.pioneer.tier,
				totalPoints: persona.pioneer.points,
				referralCode: generateReferralCode(),
				githubStarred: persona.pioneer.points > 100,
				leaderboardVisibility: "public",
				joinedAt: daysAgo(persona.usage.daysActive),
				lastSyncedAt: new Date(),
				createdAt: daysAgo(persona.usage.daysActive),
				updatedAt: new Date(),
			})
			.onConflictDoNothing()
			.returning();

		if (!newPioneer) continue;

		const actionTypes = [
			{ type: "github_star" as const, points: 100 },
			{ type: "discord_join" as const, points: 50 },
			{ type: "tutorial_complete" as const, points: 25 },
			{ type: "feedback" as const, points: 75 },
		];

		let remainingPoints = persona.pioneer.points;
		for (const action of actionTypes) {
			if (remainingPoints <= 0) break;

			const actionPoints = Math.min(action.points, remainingPoints);
			await db.insert(pioneerActions).values({
				pioneerId: newPioneer.id,
				actionType: action.type,
				points: actionPoints,
				verified: true,
				createdAt: daysAgo(randomBetween(1, persona.usage.daysActive)),
			});
			remainingPoints -= actionPoints;
		}

		if (persona.pioneer.tier !== "seedling") {
			const tiers: Array<"seedling" | "grower" | "cultivator" | "guardian"> = [
				"seedling",
				"grower",
				"cultivator",
				"guardian",
			];
			const currentTierIndex = tiers.indexOf(persona.pioneer.tier);

			for (let i = 1; i <= currentTierIndex; i++) {
				await db.insert(pioneerTierHistory).values({
					pioneerId: newPioneer.id,
					previousTier: tiers[i - 1],
					newTier: tiers[i],
					pointsAtTransition: i * 250,
					createdAt: daysAgo(persona.usage.daysActive - i * 10),
				});
			}
		}

		console.log(`  ✓ ${persona.name}: ${persona.pioneer.tier} (${persona.pioneer.points} pts)`);
	}
}

async function seedApiKeys(personas: TestPersona[], userIdMap: Map<string, string>): Promise<Map<string, string>> {
	if (!db) throw new Error("Database not available");

	console.log("🔑 Seeding API keys...");
	const apiKeyMap = new Map<string, string>();

	for (const persona of personas) {
		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		const { hash, preview } = generateApiKey();

		const [newKey] = await db
			.insert(apiKeys)
			.values({
				userId,
				name: `${persona.name} - Primary Key`,
				key: hash,
				keyPreview: preview,
				permissions: {
					maxSnapshots: persona.tier === "free" ? 50 : undefined,
					cloudBackup: persona.tier !== "free",
					advancedDetection: persona.tier !== "free",
					customRules: ["team", "enterprise"].includes(persona.tier),
					teamSharing: ["team", "enterprise"].includes(persona.tier),
				},
				lastUsedAt: persona.usage.snapshots > 0 ? daysAgo(randomBetween(0, 7)) : null,
				createdAt: daysAgo(persona.usage.daysActive),
			})
			.returning();

		apiKeyMap.set(persona.id, newKey.id);

		if (persona.usage.snapshots > 0) {
			const usageCount = Math.min(persona.usage.snapshots, 20);
			for (let i = 0; i < usageCount; i++) {
				await db.insert(apiUsage).values({
					apiKeyId: newKey.id,
					endpoint: i % 3 === 0 ? "snapshot" : i % 3 === 1 ? "status" : "recovery",
					method: i % 3 === 0 ? "POST" : "GET",
					statusCode: 200,
					metadata: {
						filesProtected: randomBetween(1, 50),
						aiTool: ["cursor", "copilot", "claude"][i % 3],
					},
					timestamp: daysAgo(randomBetween(0, persona.usage.daysActive)),
				});
			}
		}

		console.log(`  ✓ ${persona.name}: ${preview}...`);
	}

	return apiKeyMap;
}

async function seedExtensionSessions(personas: TestPersona[], userIdMap: Map<string, string>): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("🔌 Seeding extension sessions...");

	for (const persona of personas) {
		if (persona.usage.snapshots === 0) continue;

		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		const refreshToken = randomBytes(32).toString("hex");

		await db
			.insert(extensionSessions)
			.values({
				userId,
				client: "vscode",
				refreshTokenHash: generateHash(refreshToken),
				lastUsedAt: daysAgo(randomBetween(0, 7)),
				expiresAt: daysAgo(-90),
				metadata: {
					extensionVersion: "1.2.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					hostname: `${persona.id}-macbook`,
				},
				createdAt: daysAgo(persona.usage.daysActive),
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${persona.name}: VS Code session`);
	}
}

async function seedSnapshots(
	personas: TestPersona[],
	userIdMap: Map<string, string>,
	apiKeyMap: Map<string, string>,
): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("📸 Seeding snapshots...");

	for (const persona of personas) {
		if (persona.usage.snapshots === 0) continue;

		const userId = userIdMap.get(persona.id);
		const apiKeyId = apiKeyMap.get(persona.id);
		if (!userId || !apiKeyId) continue;

		const snapshotCount = Math.min(persona.usage.snapshots, 50);

		for (let i = 0; i < snapshotCount; i++) {
			const isAiDetected = i < persona.usage.aiDetections;
			const riskScore = isAiDetected ? randomBetween(30, 90) : randomBetween(0, 20);

			const [newSnapshot] = await db
				.insert(snapshots)
				.values({
					userId,
					apiKeyId,
					name: isAiDetected ? `AI Change Detected #${i + 1}` : `Manual Snapshot #${i + 1}`,
					trigger: isAiDetected ? "risk_detection" : i % 2 === 0 ? "manual" : "auto",
					fileCount: randomBetween(1, 20),
					totalSizeBytes: randomBetween(1000, 100000),
					gitBranch: ["main", "develop", "feature/test"][i % 3],
					gitCommit: randomBytes(20).toString("hex"),
					gitDirty: i % 2 === 0,
					riskScore,
					riskFactors: isAiDetected
						? [
								{
									type: "ai_generated",
									severity: riskScore > 70 ? "high" : riskScore > 40 ? "medium" : "low",
									message: "AI-generated code detected",
								},
							]
						: [],
					projectPath: `/Users/${persona.id}/projects/my-app`,
					cloudBackupEnabled: persona.tier !== "free",
					metadata: {
						clientVersion: "1.2.0",
						ideVersion: "1.85.0",
						platform: "darwin",
						tags: isAiDetected ? ["ai-detected", "auto-snapshot"] : [],
					},
					createdAt: daysAgo(randomBetween(0, persona.usage.daysActive)),
				})
				.returning();

			const fileCount = randomBetween(1, 5);
			for (let j = 0; j < fileCount; j++) {
				await db.insert(snapshotFiles).values({
					snapshotId: newSnapshot.id,
					filePath: `src/components/Component${j}.tsx`,
					fileHash: randomBytes(32).toString("hex"),
					fileSizeBytes: randomBetween(100, 10000),
					changeType: ["added", "modified", "modified"][j % 3],
					linesChanged: randomBetween(1, 100),
					containsSecrets: false,
					riskLevel: isAiDetected ? "medium" : "low",
					createdAt: newSnapshot.createdAt,
				});
			}
		}

		console.log(`  ✓ ${persona.name}: ${snapshotCount} snapshots`);
	}
}

async function seedTelemetry(personas: TestPersona[], userIdMap: Map<string, string>): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("📊 Seeding telemetry...");

	const eventTypes = [
		"extension.activated",
		"snapshot.created",
		"snapback.used",
		"risk.detected",
		"view.activated",
		"feature.used",
	];

	for (const persona of personas) {
		if (persona.usage.snapshots === 0) continue;

		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		const eventCount = Math.min(persona.usage.snapshots * 3, 100);

		for (let i = 0; i < eventCount; i++) {
			const eventType = eventTypes[i % eventTypes.length];

			await db.insert(telemetryEvents).values({
				userId,
				eventType,
				sessionId: `session-${persona.id}-${Math.floor(i / 10)}`,
				properties: {
					clientVersion: "1.2.0",
					platform: "darwin",
				},
				timestamp: daysAgo(randomBetween(0, persona.usage.daysActive)),
				createdAt: new Date(),
			});
		}

		console.log(`  ✓ ${persona.name}: ${eventCount} events`);
	}
}

async function seedEngagementAndLifecycle(personas: TestPersona[], userIdMap: Map<string, string>): Promise<void> {
	if (!db) throw new Error("Database not available");

	console.log("📈 Seeding engagement & lifecycle...");

	for (const persona of personas) {
		const userId = userIdMap.get(persona.id);
		if (!userId) continue;

		await db
			.insert(userLifecycleState)
			.values({
				userId,
				currentPhase: persona.flags.newSignup
					? "onboarding"
					: persona.usage.daysActive > 30
						? "active"
						: "activated",
				activatedAt: persona.flags.newSignup ? null : daysAgo(persona.usage.daysActive),
				lastActiveAt: daysAgo(randomBetween(0, 7)),
				createdAt: daysAgo(persona.usage.daysActive + 5),
				updatedAt: new Date(),
			})
			.onConflictDoNothing();

		const engagementScore = Math.min(
			100,
			Math.floor((persona.usage.snapshots / 10 + persona.usage.daysActive / 5) * (persona.pioneer ? 1.2 : 1)),
		);

		await db
			.insert(engagementScores)
			.values({
				userId,
				score: engagementScore,
				factors: {
					usage: persona.usage.snapshots,
					tenure: persona.usage.daysActive,
					features: persona.tier === "free" ? 2 : 5,
				},
				calculatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoNothing();

		await db
			.insert(trustScores)
			.values({
				userId,
				score: Math.min(100, 50 + persona.usage.daysActive),
				factors: {
					accountAge: persona.usage.daysActive,
					verifiedEmail: true,
					connectedGithub: true,
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoNothing();

		await db
			.insert(userSafetyProfiles)
			.values({
				userId,
				autoSnapshotEnabled: true,
				riskThreshold: persona.tier === "enterprise" ? 30 : 50,
				sensitivePatterns: ["password", "secret", "api_key"],
				createdAt: daysAgo(persona.usage.daysActive),
				updatedAt: new Date(),
			})
			.onConflictDoNothing();

		console.log(`  ✓ ${persona.name}: engagement=${engagementScore}`);
	}
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
	console.log("🌱 SnapBack UAT Seed Script");
	console.log("═".repeat(50));

	if (!db) {
		throw new Error("Database connection not available");
	}

	const args = process.argv.slice(2);
	const shouldClean = args.includes("--clean");
	const personaFilter = args.find((a) => a.startsWith("--persona="))?.split("=")[1];

	let personas = TEST_PERSONAS;
	if (personaFilter) {
		personas = TEST_PERSONAS.filter((p) => p.id === `uat-${personaFilter}` || p.id === personaFilter);
		if (personas.length === 0) {
			console.error(`❌ Persona not found: ${personaFilter}`);
			console.log("\nAvailable personas:");
			TEST_PERSONAS.forEach((p) => console.log(`  - ${p.id.replace("uat-", "")}: ${p.description}`));
			process.exit(1);
		}
	}

	console.log(`\n📋 Personas to seed: ${personas.length}`);
	console.log(`🧹 Clean first: ${shouldClean}`);
	console.log("");

	try {
		if (shouldClean) {
			await cleanDatabase();
		}

		const userIdMap = await seedUsers(personas);
		const orgIdMap = await seedOrganizations(personas, userIdMap);
		await seedSubscriptions(personas, userIdMap, orgIdMap);
		await seedPioneers(personas, userIdMap);
		const apiKeyMap = await seedApiKeys(personas, userIdMap);
		await seedExtensionSessions(personas, userIdMap);
		await seedSnapshots(personas, userIdMap, apiKeyMap);
		await seedTelemetry(personas, userIdMap);
		await seedEngagementAndLifecycle(personas, userIdMap);

		console.log("\n" + "═".repeat(50));
		console.log("✅ UAT seeding complete!");
		console.log("\n📧 Test accounts created:");
		personas.forEach((p) => {
			console.log(`   ${p.email} - ${p.tier} tier, ${p.pioneer?.tier || "no pioneer"}`);
		});
	} catch (error) {
		console.error("\n❌ Seeding failed:", error);
		throw error;
	} finally {
		await closeDatabaseConnection();
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
