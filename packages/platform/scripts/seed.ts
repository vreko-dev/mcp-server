import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { subscriptions, user } from "../src/db/schema/postgres";

async function main() {
	console.log("🌱 Seeding database...");

	const TEST_USER_EMAIL = "test@example.com";

	// 1. Upsert Test User
	console.log(`Upserting user: ${TEST_USER_EMAIL}`);
	const [testUser] = await db
		?.insert(user)
		.values({
			name: "Test User",
			email: TEST_USER_EMAIL,
			emailVerified: true,
			onboardingComplete: true,
		})
		.onConflictDoUpdate({
			target: user.email,
			set: {
				name: "Test User",
				emailVerified: true,
			},
		})
		.returning();

	console.log(`User ID: ${testUser.id}`);

	// 2. Insert or update Subscription (Team Plan)
	console.log("Checking for existing subscription...");
	const existingSub = await db?.select().from(subscriptions).where(eq(subscriptions.userId, testUser.id)).limit(1);

	if (existingSub.length === 0) {
		console.log("Creating Team subscription...");
		await db?.insert(subscriptions).values({
			userId: testUser.id,
			plan: "team",
			status: "active",
			currentPeriodStart: new Date(),
			currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
		});
	} else {
		console.log("Updating existing subscription...");
		await db
			?.update(subscriptions)
			.set({
				plan: "team",
				status: "active",
			})
			.where(eq(subscriptions.userId, testUser.id));
	}

	console.log("✅ Seeding complete!");
	process.exit(0);
}

main().catch((err) => {
	console.error("❌ Seeding failed:", err);
	process.exit(1);
});
