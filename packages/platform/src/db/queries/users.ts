import { eq } from "drizzle-orm";
import type { z } from "zod";
import { z as zod } from "zod";
import { combinedSchema, db } from "../client";
import type { UserUpdateSchema } from "../zod";

const { user, account } = combinedSchema;

// Add input validation schema
const searchUsersSchema = zod.object({
	query: zod.string().min(1).max(100).optional(),
	limit: zod.number().min(1).max(100).default(50),
	offset: zod.number().min(0).default(0),
});

export async function getUsers({ limit, offset, query }: { limit: number; offset: number; query?: string }) {
	if (!db) {
		throw new Error("Database not available");
	}

	// Validate input parameters
	const validatedParams = searchUsersSchema.parse({ query, limit, offset });

	// Use validated and sanitized query parameter if provided
	const whereClause = query
		? (user: any, { like, sql }: any) => like(user.name, sql`${"%"}${validatedParams.query}${"%"}`)
		: undefined;

	return await db.query.user.findMany({
		where: whereClause,
		limit: validatedParams.limit,
		offset: validatedParams.offset,
	});
}

export async function countAllUsers() {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.$count(user);
}

export async function getUserById(id: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.user.findFirst({
		where: (user: any, { eq }: any) => eq(user.id, id),
	});
}

export async function getUserByEmail(email: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.user.findFirst({
		where: (user: any, { eq }: any) => eq(user.email, email),
	});
}

export async function createUser({
	email,
	name,
	role,
	emailVerified,
	onboardingComplete,
}: {
	email: string;
	name: string;
	role: "admin" | "user";
	emailVerified: boolean;
	onboardingComplete: boolean;
}) {
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db
		.insert(user)
		.values({
			email,
			name,
			role,
			emailVerified,
			onboardingComplete,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning({
			id: user.id,
		});

	const firstResult = result[0];
	if (!firstResult) {
		throw new Error("Failed to create user");
	}
	const { id } = firstResult;

	const newUser = await getUserById(id);

	return newUser;
}

export async function getAccountById(id: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.account.findFirst({
		where: (account: any, { eq }: any) => eq(account.id, id),
	});
}

export async function createUserAccount({
	userId,
	providerId,
	accountId,
	hashedPassword,
}: {
	userId: string;
	providerId: string;
	accountId: string;
	hashedPassword?: string;
}) {
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db
		.insert(account)
		.values({
			userId,
			accountId,
			providerId,
			createdAt: new Date(),
			updatedAt: new Date(),
			password: hashedPassword,
		})
		.returning({
			id: account.id,
		});

	const firstResult = result[0];
	if (!firstResult) {
		throw new Error("Failed to create account");
	}
	const { id } = firstResult;

	const newAccount = await getAccountById(id);

	return newAccount;
}

export async function updateUser(updatedUser: z.infer<typeof UserUpdateSchema>) {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.update(user).set(updatedUser).where(eq(user.id, updatedUser.id));
}
