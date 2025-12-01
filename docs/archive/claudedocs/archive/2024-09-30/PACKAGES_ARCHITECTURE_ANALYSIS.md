# SnapBack Site - Comprehensive Package Architecture Analysis

**Generated**: 2025-09-30  
**Project**: SnapBack - AI Code Protection Platform  
**Architecture**: Turborepo Monorepo with PNPM Workspaces

---

## Executive Summary

This monorepo contains **10 packages**, **1 config module**, and **2 tooling configurations** organized in a modern TypeScript-based full-stack architecture. The system uses:

-   **Next.js 15** with App Router for the frontend
-   **Drizzle ORM** with PostgreSQL for data persistence
-   **Better Auth** for authentication
-   **oRPC/HONO** for type-safe API routes
-   **Stripe** for payments
-   **Multi-provider abstractions** for email and storage

### Package Dependency Graph

```
apps/web
├── @repo/api (all modules)
│   ├── @repo/auth
│   │   ├── @repo/database
│   │   ├── @repo/config
│   │   ├── @repo/i18n
│   │   ├── @repo/logs
│   │   ├── @repo/mail
│   │   ├── @repo/payments
│   │   └── @repo/utils
│   ├── @repo/ai
│   ├── @repo/storage
│   └── (all shared packages)
├── @repo/database (Drizzle + PostgreSQL)
│   └── @repo/config
├── @repo/payments
│   ├── @repo/database
│   ├── @repo/logs
│   └── @repo/config
└── @repo/mail
    ├── @repo/i18n
    ├── @repo/logs
    └── @repo/config
```

---

## 1. Package Overview

### Core Packages

| Package            | Purpose                            | Lines of Code (Est.) | Key Dependencies             |
| ------------------ | ---------------------------------- | -------------------- | ---------------------------- |
| **@repo/api**      | Type-safe API layer with oRPC      | ~2000                | auth, database, all services |
| **@repo/auth**     | Better Auth configuration          | ~300                 | database, mail, payments     |
| **@repo/database** | Drizzle schema & queries           | ~800                 | drizzle-orm, pg              |
| **@repo/payments** | Multi-provider payment abstraction | ~400                 | Stripe, database             |
| **@repo/mail**     | Email templates & sending          | ~300                 | React Email, nodemailer      |
| **@repo/storage**  | S3-compatible storage              | ~100                 | AWS SDK                      |
| **@repo/ai**       | OpenAI/Anthropic integration       | ~50                  | AI SDK, OpenAI               |
| **@repo/i18n**     | Internationalization               | ~100                 | next-intl                    |
| **@repo/utils**    | Shared utilities                   | ~50                  | None                         |
| **@repo/logs**     | Logging abstraction                | ~50                  | consola                      |

### Configuration & Tooling

| Module                 | Purpose                   | Usage        |
| ---------------------- | ------------------------- | ------------ |
| **config/**            | Application configuration | All packages |
| **tooling/typescript** | Shared TypeScript configs | All packages |
| **tooling/tailwind**   | Shared Tailwind theme     | Web app      |

---

## 2. Package: @repo/api

### Overview

Central API layer using **oRPC** (OpenRPC) with HONO for type-safe, schema-validated endpoints. Includes 9 modules with ~36 procedures total.

### Architecture

```
packages/api/
├── index.ts                    # Main Hono app with middleware
├── orpc/
│   ├── router.ts              # Master router combining all modules
│   ├── procedures.ts          # Base procedures (public, protected, admin)
│   └── handler.ts             # RPC and OpenAPI handlers
├── modules/
│   ├── admin/                 # Admin dashboard procedures
│   ├── ai/                    # AI chat management (6 procedures)
│   ├── apikeys/               # API key CRUD (3 procedures)
│   ├── auth/                  # Auth utilities (extends Better Auth)
│   ├── contact/               # Contact form handling
│   ├── newsletter/            # Newsletter subscription
│   ├── organizations/         # Organization management (2 procedures)
│   ├── payments/              # Payment operations (3 procedures)
│   └── users/                 # User operations (1 procedure)
├── middleware/
│   ├── rate-limit.ts          # Rate limiting logic
│   └── rate-limit-server.ts  # Server-side rate limit setup
└── lib/
    ├── crypto.ts              # API key generation & hashing
    ├── quota.ts               # Usage quota enforcement
    └── openapi-schema.ts      # OpenAPI schema merging
```

### Module Breakdown

#### **Admin Module** (`modules/admin/`)

-   `findOrganization`: Lookup organizations by ID/slug
-   `listOrganizations`: Paginated org listing
-   `listUsers`: User management dashboard

**Input/Output Schema**:

```typescript
// findOrganization
Input: { organizationId: string }
Output: { organization: Organization | null }

// listOrganizations
Input: { page: number, limit: number, search?: string }
Output: { organizations: Organization[], total: number }
```

#### **AI Module** (`modules/ai/`)

Manages AI chat functionality with 6 procedures:

-   `createChat`: Initialize new AI conversation
-   `findChat`: Retrieve chat by ID
-   `listChats`: List user's chats
-   `updateChat`: Update chat metadata (title)
-   `deleteChat`: Remove chat
-   `addMessageToChat`: Append message and get AI response

**Chat Schema**:

```typescript
type AiChat = {
	id: string;
	userId: string;
	organizationId?: string;
	title: string;
	messages: Array<{ role: "user" | "assistant"; content: string }>;
	createdAt: Date;
	updatedAt: Date;
};
```

#### **API Keys Module** (`modules/apikeys/`)

Core integration point for SnapBack developer tools:

1. **createApiKey**

    - Generates `sb_` prefixed keys (32 chars)
    - Hashes with Argon2 before storage
    - Returns full key ONCE only
    - Enforces plan-based limits:
        - Free: 2 keys
        - Solo: 5 keys
        - Team: 10 keys

2. **listApiKeys**

    - Returns preview (`sb_xxxxx...`) not full key
    - Includes usage metadata

3. **revokeApiKey**
    - Soft delete with `revokedAt` timestamp

**Permissions by Plan**:

```typescript
Free: {
  maxCheckpoints: 100/month,
  cloudBackup: false,
  advancedDetection: false,
  customRules: false,
  teamSharing: false
}

Solo: {
  maxCheckpoints: unlimited,
  cloudBackup: true,
  advancedDetection: true,
  customRules: true,
  teamSharing: false
}

Team: {
  maxCheckpoints: unlimited,
  cloudBackup: true,
  advancedDetection: true,
  customRules: true,
  teamSharing: true
}
```

#### **Organizations Module** (`modules/organizations/`)

-   `createLogoUploadUrl`: S3 presigned URL for logo uploads
-   `generateOrganizationSlug`: Unique slug generation

#### **Payments Module** (`modules/payments/`)

-   `createCheckoutLink`: Stripe checkout session
-   `createCustomerPortalLink`: Stripe billing portal
-   `listPurchases`: User/org purchase history

#### **Auth Module** (`modules/auth/`)

Extends Better Auth with custom procedures for session management.

#### **Contact & Newsletter Modules**

-   Contact form submission with email notifications
-   Newsletter subscription management

#### **Users Module** (`modules/users/`)

-   `createAvatarUploadUrl`: S3 presigned URL for avatars

### Middleware & Security

#### Rate Limiting (`middleware/rate-limit.ts`)

```typescript
// In-memory rate limiting with sliding window
export const rateLimitMiddleware = async (req: Request) => {
	const identifier = getClientIdentifier(req);
	const limit = getRateLimitForEndpoint(req.url);

	// Returns: { exceeded: boolean, remaining: number, resetTime: Date }
};
```

**Rate Limits by Endpoint**:

-   Auth endpoints: Skipped (Better Auth handles it)
-   Webhooks: Skipped
-   API endpoints: 100 requests/minute per IP
-   Admin endpoints: 50 requests/minute

#### API Key Cryptography (`lib/crypto.ts`)

```typescript
// Generate: sb_[32 random chars]
export function generateApiKey(): string;

// Hash with Argon2 (memory-hard, GPU-resistant)
export async function hashApiKey(key: string): Promise<string>;

// Verify against hash
export async function verifyApiKey(key: string, hash: string): Promise<boolean>;
```

**Argon2 Parameters**:

-   Memory Cost: 19456 KB
-   Time Cost: 2 iterations
-   Output Length: 32 bytes
-   Parallelism: 1 thread

#### Quota Enforcement (`lib/quota.ts`)

```typescript
export async function enforceQuotas(
	userId: string,
	type: "checkpoint" | "storage" | "api"
): Promise<boolean>;

export async function updateUsageLimits(
	subscriptionId: string,
	type: "checkpoint" | "storage",
	amount: number
): Promise<void>;
```

**Quota Limits**:
| Plan | Checkpoints/month | Storage (MB) | API Calls/hour |
|------|-------------------|--------------|----------------|
| Free | 100 | 100 | 1,000 |
| Solo | Unlimited | 1,000 | 10,000 |
| Team | Unlimited | 10,000 | 100,000 |

### Base Procedures

```typescript
// Public: No auth required
export const publicProcedure = os.$context<{ headers: Headers }>();

// Protected: Requires valid session
export const protectedProcedure = publicProcedure.use(
	async ({ context, next }) => {
		const session = await auth.api.getSession({ headers: context.headers });
		if (!session) throw new ORPCError("UNAUTHORIZED");
		return next({ context: { session, user: session.user } });
	}
);

// Admin: Requires admin role
export const adminProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		if (context.user.role !== "admin") throw new ORPCError("FORBIDDEN");
		return next();
	}
);
```

### API Documentation

The API automatically generates:

1. **OpenAPI Schema**: `/api/openapi` (merged auth + app schema)
2. **Interactive Docs**: `/api/docs` (Scalar UI)
3. **Type Definitions**: Exported via `ApiRouterClient` type

---

## 3. Package: @repo/auth

### Overview

Authentication powered by **Better Auth** with extensive plugin support and custom organization integration.

### Architecture

```
packages/auth/
├── auth.ts                    # Main Better Auth configuration
├── lib/
│   ├── organization.ts        # Org seat management
│   └── server.ts             # Server-side auth utilities
└── plugins/
    └── invitation-only/       # Custom plugin for invite-only signup
```

### Better Auth Configuration

```typescript
export const auth = betterAuth({
  baseURL: getBaseUrl(),
  database: prismaAdapter(drizzle.db, { provider: 'postgresql' }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    freshAge: 0
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github']
    }
  },
  plugins: [
    username(),
    admin(),
    passkey(),
    magicLink({ ... }),
    organization({ ... }),
    openAPI(),
    invitationOnlyPlugin(),
    twoFactor()
  ]
})
```

### Plugins & Features

#### 1. **Username Plugin**

-   Allows users to set unique usernames
-   Username stored in `user.username` field

#### 2. **Admin Plugin**

-   Grants admin role management
-   Checks `user.role === 'admin'` for protected routes

#### 3. **Passkey Plugin** (WebAuthn)

-   FIDO2 authentication support
-   Stores passkeys in `passkey` table
-   Biometric and hardware key support

#### 4. **Magic Link Plugin**

-   Passwordless email authentication
-   Sends email via `@repo/mail`
-   Configurable signup behavior

**Implementation**:

```typescript
magicLink({
	disableSignUp: false,
	sendMagicLink: async ({ email, url }, request) => {
		const locale = getLocaleFromRequest(request);
		await sendEmail({
			to: email,
			templateId: "magicLink",
			context: { url },
			locale,
		});
	},
});
```

#### 5. **Organization Plugin**

-   Multi-tenant organization support
-   Member roles: `owner`, `admin`, `member`
-   Invitation system with email notifications

**Invitation Flow**:

```typescript
organization({
	sendInvitationEmail: async ({ email, id, organization }, request) => {
		const existingUser = await drizzle.getUserByEmail(email);
		const url = new URL(
			existingUser ? "/auth/login" : "/auth/signup",
			getBaseUrl()
		);
		url.searchParams.set("invitationId", id);
		url.searchParams.set("email", email);

		await sendEmail({
			to: email,
			templateId: "organizationInvitation",
			context: { organizationName: organization.name, url },
		});
	},
});
```

#### 6. **Two-Factor Plugin**

-   TOTP-based 2FA (Google Authenticator, etc.)
-   Backup codes generation
-   Recovery options

#### 7. **Invitation-Only Plugin** (Custom)

-   Restricts signup to invited users only
-   Validates invitation ID during registration
-   Configurable via `config.auth.enableSignup`

### OAuth Providers

```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: ['email', 'profile']
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: ['user:email']
  }
}
```

### Email Verification

```typescript
emailVerification: {
  sendOnSignUp: config.auth.enableSignup,
  autoSignInAfterVerification: true,
  sendVerificationEmail: async ({ user, url }, request) => {
    const locale = getLocaleFromRequest(request)
    await sendEmail({
      to: user.email,
      templateId: 'emailVerification',
      context: { url, name: user.name },
      locale
    })
  }
}
```

### Session Management

-   **Cookie-based sessions** with secure HTTP-only cookies
-   **Expiration**: 30 days (configurable)
-   **Active organization tracking**: `session.activeOrganizationId`
-   **Impersonation support**: `session.impersonatedBy` for admin debugging

### Organization Seat Management

```typescript
// lib/organization.ts
export async function updateSeatsInOrganizationSubscription(
	organizationId: string
): Promise<void> {
	const members = await drizzle.getOrganizationMembers(organizationId);
	const purchases = await drizzle.getPurchasesByOrganizationId(
		organizationId
	);

	const subscription = purchases.find((p) => p.type === "SUBSCRIPTION");
	if (subscription) {
		await setSubscriptionSeats({
			id: subscription.subscriptionId,
			seats: members.length,
		});
	}
}
```

**Triggers**:

-   After accepting invitation
-   After removing member
-   Manual updates via admin panel

### Hooks

#### Before Hooks

-   **User/Organization Deletion**: Cancels all active subscriptions before deletion

```typescript
before: createAuthMiddleware(async (ctx) => {
  if (ctx.path.startsWith('/delete-user') || ctx.path.startsWith('/organization/delete')) {
    const purchases = await drizzle.getPurchases(...)
    for (const sub of subscriptions) {
      await cancelSubscription(sub.subscriptionId)
    }
  }
})
```

#### After Hooks

-   **Organization Member Changes**: Updates seat-based billing

```typescript
after: createAuthMiddleware(async (ctx) => {
	if (ctx.path.startsWith("/organization/accept-invitation")) {
		await updateSeatsInOrganizationSubscription(organizationId);
	}
});
```

### Security Features

1. **Email Verification**: Required for new signups (if enabled)
2. **Password Reset**: Secure token-based flow
3. **Account Linking**: Link multiple OAuth providers to one account
4. **IP & User Agent Tracking**: Session security auditing
5. **Two-Factor Authentication**: Optional TOTP enforcement
6. **Rate Limiting**: Built-in auth endpoint protection

### Type Exports

```typescript
export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = NonNullable<
	Awaited<ReturnType<typeof auth.api.getFullOrganization>>
>;
export type Organization = typeof auth.$Infer.Organization;
export type OrganizationMemberRole = "owner" | "admin" | "member";
export type OrganizationInvitationStatus = "pending" | "accepted" | "expired";
```

---

## 4. Package: @repo/database

### Overview

Database layer using **Drizzle ORM** with PostgreSQL. Migrated from Prisma for better type safety and performance.

### Architecture

```
packages/database/
├── index.ts                   # Package exports
├── drizzle/
│   ├── client.ts             # Database connection
│   ├── drizzle.config.ts     # Drizzle Kit configuration
│   ├── zod.ts                # Zod schema generation
│   ├── schema/
│   │   ├── index.ts          # Schema exports
│   │   ├── postgres.ts       # PostgreSQL schema (ACTIVE)
│   │   ├── mysql.ts          # MySQL schema (unused)
│   │   └── sqlite.ts         # SQLite schema (unused)
│   └── queries/
│       ├── index.ts          # Query exports
│       ├── users.ts          # User CRUD operations
│       ├── organizations.ts  # Organization queries
│       ├── purchases.ts      # Payment queries
│       └── ai-chats.ts       # AI chat queries
└── prisma/                   # ARCHIVED (migration artifacts)
```

### Database Schema (PostgreSQL)

#### Core Tables

##### **user** (Authentication & Profile)

```typescript
{
	id: string(CUID2, PK);
	name: text;
	email: text(unique);
	emailVerified: boolean;
	image: text;
	createdAt: timestamp;
	updatedAt: timestamp;
	username: text(unique);
	role: text;
	banned: boolean;
	banReason: text;
	banExpires: timestamp;
	onboardingComplete: boolean;
	paymentsCustomerId: text;
	locale: text;
}
```

**Indexes**:

-   `email` (unique)
-   `username` (unique)

##### **session** (Active Sessions)

```typescript
{
  id: string (CUID2, PK)
  expiresAt: timestamp
  ipAddress: text
  userAgent: text
  userId: text (FK -> user.id, cascade delete)
  impersonatedBy: text
  activeOrganizationId: text
  token: text (unique index)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**:

-   `token` (unique, for fast session lookup)

##### **account** (OAuth & Password Storage)

```typescript
{
  id: string (CUID2, PK)
  accountId: text
  providerId: text (google, github, email)
  userId: text (FK -> user.id, cascade delete)
  accessToken: text (encrypted)
  refreshToken: text (encrypted)
  idToken: text
  expiresAt: timestamp
  password: text (hashed for email provider)
  accessTokenExpiresAt: timestamp
  refreshTokenExpiresAt: timestamp
  scope: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

##### **verification** (Email Verification & Password Reset Tokens)

```typescript
{
	id: string(CUID2, PK);
	identifier: text(email);
	value: text(token);
	expiresAt: timestamp;
	createdAt: timestamp;
	updatedAt: timestamp;
}
```

##### **passkey** (WebAuthn Credentials)

```typescript
{
  id: string (CUID2, PK)
  name: text
  publicKey: text
  userId: text (FK -> user.id, cascade delete)
  credentialID: text
  counter: integer
  deviceType: text
  backedUp: boolean
  transports: text
  createdAt: timestamp
}
```

##### **twoFactor** (TOTP Secrets)

```typescript
{
  id: string (CUID2, PK)
  secret: text (encrypted)
  backupCodes: text (encrypted array)
  userId: text (FK -> user.id, cascade delete)
}
```

#### Organization Tables

##### **organization** (Multi-tenant Organizations)

```typescript
{
  id: string (CUID2, PK)
  name: text
  slug: text (unique index)
  logo: text (S3 URL)
  createdAt: timestamp
  metadata: text (JSON)
  paymentsCustomerId: text (Stripe customer ID)
}
```

##### **member** (Organization Members)

```typescript
{
  id: string (CUID2, PK)
  organizationId: text (FK -> organization.id, cascade delete)
  userId: text (FK -> user.id, cascade delete)
  role: text (owner, admin, member)
  createdAt: timestamp
}
```

**Indexes**:

-   `(userId, organizationId)` (unique composite, prevents duplicate memberships)

##### **invitation** (Pending Organization Invites)

```typescript
{
  id: string (CUID2, PK)
  organizationId: text (FK -> organization.id, cascade delete)
  email: text
  role: text
  status: text (pending, accepted, expired)
  expiresAt: timestamp
  inviterId: text (FK -> user.id, cascade delete)
}
```

#### Payment Tables

##### **purchase** (Purchases & Subscriptions)

```typescript
{
  id: string (CUID2, PK)
  organizationId: text (FK -> organization.id, cascade delete, nullable)
  userId: text (FK -> user.id, cascade delete, nullable)
  type: enum('SUBSCRIPTION', 'ONE_TIME')
  customerId: text (Stripe customer ID)
  subscriptionId: text (Stripe subscription ID, unique)
  productId: text (Stripe price ID)
  status: text (active, canceled, past_due, etc.)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Business Rule**: Either `userId` OR `organizationId` must be set (user-level or org-level billing).

#### AI Tables

##### **aiChat** (AI Conversation History)

```typescript
{
  id: string (CUID2, PK)
  organizationId: text (FK -> organization.id, cascade delete, nullable)
  userId: text (FK -> user.id, cascade delete)
  title: text
  messages: json (array of { role, content })
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### SnapBack-Specific Tables

##### **apiKeys** (Developer Integration Keys)

```typescript
{
  id: text (CUID2, PK)
  userId: text (FK -> user.id, cascade delete)
  organizationId: text (FK -> organization.id, cascade delete, nullable)
  name: text
  key: text (Argon2 hash, unique)
  keyPreview: text (first 8 chars for display)
  permissions: json {
    maxCheckpoints?: number
    cloudBackup?: boolean
    advancedDetection?: boolean
    customRules?: boolean
    teamSharing?: boolean
  }
  lastUsedAt: timestamp
  expiresAt: timestamp
  revokedAt: timestamp
  createdAt: timestamp
}
```

**Indexes**:

-   `userId` (unique)
-   `organizationId` (unique)
-   `key` (unique, for fast lookups during API auth)

##### **apiUsage** (Usage Tracking)

```typescript
{
  id: text (CUID2, PK)
  apiKeyId: text (FK -> apiKeys.id, cascade delete)
  endpoint: text ('checkpoint', 'recovery', 'status')
  method: text (GET, POST, etc.)
  statusCode: integer
  metadata: json {
    filesProtected?: number
    checkpointId?: string
    aiTool?: string
  }
  timestamp: timestamp
}
```

**Indexes**:

-   `apiKeyId` (for per-key analytics)
-   `timestamp` (for time-based queries)

##### **subscriptions** (Subscription Management)

```typescript
{
  id: text (CUID2, PK)
  userId: text (FK -> user.id, cascade delete, nullable)
  organizationId: text (FK -> organization.id, cascade delete, nullable)
  stripeSubscriptionId: text (unique)
  stripeCustomerId: text
  plan: enum('free', 'solo', 'team', 'enterprise')
  status: enum('active', 'canceled', 'past_due', 'trialing', 'paused')
  currentPeriodStart: timestamp
  currentPeriodEnd: timestamp
  cancelAtPeriodEnd: boolean
  trialEnd: timestamp
  seats: integer (for team plans)
  metadata: json
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**:

-   `userId` (unique)
-   `organizationId` (unique)
-   `stripeSubscriptionId` (unique)

##### **usageLimits** (Monthly Usage Tracking)

```typescript
{
  id: text (CUID2, PK)
  subscriptionId: text (FK -> subscriptions.id, cascade delete)
  month: timestamp (first day of month)
  checkpointsUsed: integer
  checkpointsLimit: integer (null = unlimited)
  cloudStorageUsedMb: integer
  cloudStorageLimitMb: integer
  apiCallsUsed: integer
  apiCallsLimit: integer
}
```

**Indexes**:

-   `(subscriptionId, month)` (unique composite, one record per month per subscription)

### Enums

```typescript
// Purchase Types
export const purchaseTypeEnum = pgEnum("PurchaseType", [
	"SUBSCRIPTION",
	"ONE_TIME",
]);

// Subscription Status
export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"active",
	"canceled",
	"past_due",
	"trialing",
	"paused",
]);

// Plan Types
export const planTypeEnum = pgEnum("plan_type", [
	"free",
	"solo",
	"team",
	"enterprise",
]);
```

### Relationships

```typescript
// User Relations
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	passkeys: many(passkey),
	invitations: many(invitation),
	purchases: many(purchase),
	memberships: many(member),
	aiChats: many(aiChat),
	twoFactors: many(twoFactor),
	apiKeys: many(apiKeys),
	subscriptions: many(subscriptions),
}));

// Organization Relations
export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
	purchases: many(purchase),
	aiChats: many(aiChat),
	apiKeys: many(apiKeys),
	subscriptions: many(subscriptions),
}));

// API Keys Relations
export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	user: one(user, { fields: [apiKeys.userId], references: [user.id] }),
	organization: one(organization, {
		fields: [apiKeys.organizationId],
		references: [organization.id],
	}),
	usage: many(apiUsage),
}));
```

### Query Helpers

```typescript
// packages/database/drizzle/queries/users.ts
export async function getUserByEmail(email: string);
export async function getUserById(id: string);
export async function updateUser(id: string, data: Partial<User>);
export async function deleteUser(id: string);

// packages/database/drizzle/queries/organizations.ts
export async function getOrganizationById(id: string);
export async function getOrganizationBySlug(slug: string);
export async function getOrganizationMembers(orgId: string);
export async function addMemberToOrganization(
	orgId: string,
	userId: string,
	role: string
);

// packages/database/drizzle/queries/purchases.ts
export async function createPurchase(data: NewPurchase);
export async function getPurchasesByUserId(userId: string);
export async function getPurchasesByOrganizationId(orgId: string);
export async function getPurchaseBySubscriptionId(subscriptionId: string);
export async function updatePurchase(id: string, data: Partial<Purchase>);
export async function deletePurchaseBySubscriptionId(subscriptionId: string);

// packages/database/drizzle/queries/ai-chats.ts
export async function createAiChat(data: NewAiChat);
export async function getAiChatById(id: string);
export async function listAiChatsByUser(userId: string);
export async function updateAiChat(id: string, data: Partial<AiChat>);
export async function deleteAiChat(id: string);
```

### Database Client

```typescript
// packages/database/drizzle/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

### Migration System

```bash
# Generate migration from schema changes
pnpm --filter database run generate

# Push schema to database (dev)
pnpm --filter database run push

# Studio (GUI for database)
pnpm --filter database run studio
```

### Zod Schema Generation

Drizzle automatically generates Zod schemas from database schema:

```typescript
// packages/database/drizzle/zod.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { user, organization, purchase } from "./schema";

export const insertUserSchema = createInsertSchema(user);
export const selectUserSchema = createSelectSchema(user);
export const insertOrganizationSchema = createInsertSchema(organization);
export const selectOrganizationSchema = createSelectSchema(organization);
export const insertPurchaseSchema = createInsertSchema(purchase);
export const selectPurchaseSchema = createSelectSchema(purchase);
```

**Usage in API**:

```typescript
import { insertUserSchema } from "@repo/database/drizzle/zod";

export const createUser = protectedProcedure
	.input(insertUserSchema.omit({ id: true, createdAt: true }))
	.handler(async ({ input }) => {
		// input is fully typed and validated
	});
```

### Database Indexes & Performance

**Key Indexes**:

1. **Session Token**: Unique index on `session.token` for O(1) session lookup
2. **User Email**: Unique index on `user.email` for fast login
3. **API Key**: Unique index on `apiKeys.key` for fast auth
4. **Member Composite**: Unique index on `(userId, organizationId)` prevents duplicates
5. **Usage Timestamp**: Index on `apiUsage.timestamp` for analytics queries
6. **Subscription Month**: Composite unique index on `(subscriptionId, month)` for usage limits

### Constraints

1. **Foreign Key Cascade Deletes**: When a user is deleted, all related data (sessions, accounts, API keys) is automatically deleted
2. **Composite Uniqueness**: A user can only be a member of an organization once
3. **Subscription Ownership**: Subscriptions must belong to either a user OR an organization, not both
4. **API Key Uniqueness**: Hashed keys must be globally unique

---

## 5. Package: @repo/payments

### Overview

Multi-provider payment abstraction with **Stripe** as the primary provider. Supports subscriptions, one-time payments, customer portals, and webhooks.

### Architecture

```
packages/payments/
├── index.ts                   # Package exports
├── types.ts                   # Provider interface types
├── provider/
│   ├── index.ts              # Provider selection
│   └── stripe/
│       └── index.ts          # Stripe implementation
├── src/
│   └── lib/
│       ├── customer.ts       # Customer management
│       └── helper.ts         # Payment utilities
└── [archived providers]/
    ├── lemonsqueezy/
    ├── polar/
    ├── creem/
    └── dodopayments/
```

### Provider Interface

```typescript
// types.ts
export type CreateCheckoutLink = (options: {
	type: "subscription" | "one-time";
	productId: string;
	redirectUrl: string;
	customerId?: string;
	organizationId?: string;
	userId?: string;
	email?: string;
	trialPeriodDays?: number;
	seats?: number;
}) => Promise<string | null>;

export type CreateCustomerPortalLink = (options: {
	customerId: string;
	redirectUrl: string;
}) => Promise<string | null>;

export type SetSubscriptionSeats = (options: {
	id: string;
	seats: number;
}) => Promise<void>;

export type CancelSubscription = (id: string) => Promise<void>;

export type WebhookHandler = (req: Request) => Promise<Response>;
```

### Stripe Implementation

#### Checkout Link Creation

```typescript
export const createCheckoutLink: CreateCheckoutLink = async (options) => {
	const {
		type,
		productId,
		redirectUrl,
		customerId,
		organizationId,
		userId,
		trialPeriodDays,
		seats,
		email,
	} = options;

	const metadata = {
		organization_id: organizationId || null,
		user_id: userId || null,
	};

	const response = await stripeClient.checkout.sessions.create({
		mode: type === "subscription" ? "subscription" : "payment",
		success_url: redirectUrl ?? "",
		line_items: [
			{
				quantity: seats ?? 1,
				price: productId,
			},
		],
		...(customerId ? { customer: customerId } : { customer_email: email }),
		...(type === "one-time"
			? {
					payment_intent_data: { metadata },
					customer_creation: "always",
			  }
			: {
					subscription_data: {
						metadata,
						trial_period_days: trialPeriodDays,
					},
			  }),
		metadata,
	});

	return response.url;
};
```

#### Customer Portal

```typescript
export const createCustomerPortalLink: CreateCustomerPortalLink = async ({
	customerId,
	redirectUrl,
}) => {
	const response = await stripeClient.billingPortal.sessions.create({
		customer: customerId,
		return_url: redirectUrl ?? "",
	});

	return response.url;
};
```

#### Seat Management (Team Plans)

```typescript
export const setSubscriptionSeats: SetSubscriptionSeats = async ({
	id,
	seats,
}) => {
	const subscription = await stripeClient.subscriptions.retrieve(id);

	if (!subscription) {
		throw new Error("Subscription not found.");
	}

	await stripeClient.subscriptions.update(id, {
		items: [
			{
				id: subscription.items.data[0].id,
				quantity: seats,
			},
		],
	});
};
```

**Automatic Seat Updates**:

-   When a member joins an organization → seats++
-   When a member leaves → seats--
-   Triggered via Better Auth hooks in `@repo/auth`

#### Webhook Handling

```typescript
export const webhookHandler: WebhookHandler = async (req) => {
	// Verify webhook signature
	const event = await stripeClient.webhooks.constructEventAsync(
		await req.text(),
		req.headers.get("stripe-signature"),
		process.env.STRIPE_WEBHOOK_SECRET
	);

	switch (event.type) {
		case "checkout.session.completed":
			// Handle one-time purchase completion
			if (mode === "subscription") break;

			await drizzle.createPurchase({
				organizationId: metadata?.organization_id || null,
				userId: metadata?.user_id || null,
				customerId: customer,
				type: "ONE_TIME",
				productId,
			});
			break;

		case "customer.subscription.created":
			// Handle new subscription
			await drizzle.createPurchase({
				subscriptionId: id,
				organizationId: metadata?.organization_id || null,
				userId: metadata?.user_id || null,
				customerId: customer,
				type: "SUBSCRIPTION",
				productId,
				status: event.data.object.status,
			});
			break;

		case "customer.subscription.updated":
			// Handle subscription changes (plan, seats, status)
			const existingPurchase = await drizzle.getPurchaseBySubscriptionId(
				subscriptionId
			);
			if (existingPurchase) {
				await drizzle.updatePurchase({
					id: existingPurchase.id,
					status: event.data.object.status,
					productId: event.data.object.items?.data[0].price?.id,
				});
			}
			break;

		case "customer.subscription.deleted":
			// Handle subscription cancellation
			await drizzle.deletePurchaseBySubscriptionId(event.data.object.id);
			break;
	}

	return new Response(null, { status: 204 });
};
```

**Webhook Events Handled**:

1. `checkout.session.completed`: One-time payment completion
2. `customer.subscription.created`: New subscription started
3. `customer.subscription.updated`: Plan change, seat update, or status change
4. `customer.subscription.deleted`: Subscription canceled

### Customer Management

```typescript
// src/lib/customer.ts
export async function setCustomerIdToEntity(
	customerId: string,
	entity: { organizationId?: string; userId?: string }
): Promise<void> {
	if (entity.organizationId) {
		await drizzle.db
			.update(organization)
			.set({ paymentsCustomerId: customerId })
			.where(eq(organization.id, entity.organizationId));
	} else if (entity.userId) {
		await drizzle.db
			.update(user)
			.set({ paymentsCustomerId: customerId })
			.where(eq(user.id, entity.userId));
	}
}
```

**Flow**:

1. User/org creates checkout session
2. Stripe creates customer on payment
3. Webhook stores customer ID back to database
4. Future purchases use existing customer ID

### Payment Helpers

```typescript
// src/lib/helper.ts
export function getPlanFromProductId(productId: string): string | null;
export function getIntervalFromProductId(
	productId: string
): "month" | "year" | null;
export function formatCurrency(amount: number, currency: string): string;
```

### Subscription Lifecycle

```mermaid
graph LR
    A[User Clicks Subscribe] --> B[Create Checkout Link]
    B --> C[Redirect to Stripe]
    C --> D[User Pays]
    D --> E[Webhook: subscription.created]
    E --> F[Store Purchase in DB]
    F --> G[Grant Access to Features]

    G --> H[Subscription Active]
    H --> I[Member Added/Removed]
    I --> J[Webhook: subscription.updated]
    J --> K[Update Seats in Stripe]

    H --> L[User Cancels]
    L --> M[Webhook: subscription.deleted]
    M --> N[Revoke Access]
```

### Trial Period Support

**Configuration** (from `config/index.ts`):

```typescript
prices: [
	{
		type: "recurring",
		productId: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID,
		interval: "month",
		amount: 29,
		currency: "USD",
		trialPeriodDays: 14, // 14-day free trial
	},
];
```

**Implementation**:

-   Trial period applied in checkout session creation
-   Webhook tracks trial end date in `subscriptions.trialEnd`
-   Access granted immediately on trial start
-   Auto-charges after trial unless canceled

### Seat-Based Billing

**Team Plan**:

```typescript
{
  type: 'recurring',
  interval: 'month',
  amount: 79,
  currency: 'USD',
  seatBased: true
}
```

**Billing Logic**:

-   Base price: $79/month
-   Price per seat: $79/month per member
-   Automatic proration when seats change mid-cycle
-   Stripe handles proration calculations

**Example**:

-   Team with 3 members: $79 × 3 = $237/month
-   Add 1 member on day 15: Prorated charge for 0.5 month
-   Remove 1 member on day 20: Prorated credit applied

### Error Handling

```typescript
try {
  await createCheckoutLink(...)
} catch (error) {
  if (error.code === 'resource_missing') {
    // Price ID not found in Stripe
  } else if (error.code === 'customer_tax_location_invalid') {
    // Tax calculation issue
  } else {
    // Generic error
  }
}
```

### Testing Webhooks

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/payments

# Test specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

---

## 6. Package: @repo/mail

### Overview

Email template system using **React Email** with multi-provider support (Resend, Plunk, Postmark, Mailgun, Nodemailer).

### Architecture

```
packages/mail/
├── index.ts                   # Package exports
├── emails/
│   ├── index.ts              # Template registry
│   ├── EmailVerification.tsx
│   ├── ForgotPassword.tsx
│   ├── MagicLink.tsx
│   ├── OrganizationInvitation.tsx
│   ├── NewsletterSignup.tsx
│   ├── NewUser.tsx
│   ├── WelcomeEmail.tsx
│   └── ApiKeyCreatedEmail.tsx
├── src/
│   ├── provider/             # Email provider implementations
│   └── util/
│       ├── send.ts           # Main send function
│       └── templates.ts      # Template rendering
└── package.json
```

### Email Templates

#### 1. **EmailVerification.tsx**

Sent when user signs up or changes email.

```tsx
<EmailVerification
	url="https://app.snapback.dev/verify?token=..."
	name="John Doe"
	locale="en"
/>
```

#### 2. **ForgotPassword.tsx**

Password reset flow.

```tsx
<ForgotPassword
	url="https://app.snapback.dev/reset?token=..."
	name="John Doe"
	locale="en"
/>
```

#### 3. **MagicLink.tsx**

Passwordless authentication.

```tsx
<MagicLink url="https://app.snapback.dev/auth/magic?token=..." locale="en" />
```

#### 4. **OrganizationInvitation.tsx**

Organization member invites.

```tsx
<OrganizationInvitation
	organizationName="Acme Corp"
	url="https://app.snapback.dev/invitation/xyz"
	locale="en"
/>
```

#### 5. **NewsletterSignup.tsx**

Newsletter confirmation.

```tsx
<NewsletterSignup email="user@example.com" locale="en" />
```

#### 6. **WelcomeEmail.tsx**

Onboarding email after signup.

```tsx
<WelcomeEmail name="John Doe" locale="en" />
```

#### 7. **ApiKeyCreatedEmail.tsx** (SnapBack-specific)

Sent when developer creates API key.

```tsx
<ApiKeyCreatedEmail
	name="John Doe"
	keyPreview="sb_abc12..."
	createdAt={new Date()}
	locale="en"
/>
```

#### 8. **NewUser.tsx** (Admin Notification)

Notifies admins of new user signups.

```tsx
<NewUser email="newuser@example.com" name="Jane Smith" locale="en" />
```

### Template System

```typescript
// emails/index.ts
export const emails = {
	emailVerification: EmailVerification,
	forgotPassword: ForgotPassword,
	magicLink: MagicLink,
	organizationInvitation: OrganizationInvitation,
	newsletterSignup: NewsletterSignup,
	newUser: NewUser,
	welcomeEmail: WelcomeEmail,
	apiKeyCreated: ApiKeyCreatedEmail,
};

export type TemplateId = keyof typeof emails;
```

### Sending Emails

```typescript
// src/util/send.ts
import { config } from "@repo/config";
import { logger } from "@repo/logs";
import { send } from "../provider";
import { getTemplate } from "./templates";

export async function sendEmail<T extends TemplateId>(
	params: {
		to: string;
		locale?: keyof typeof config.i18n.locales;
	} & (
		| {
				templateId: T;
				context: Omit<
					Parameters<(typeof emails)[T]>[0],
					"locale" | "translations"
				>;
		  }
		| {
				subject: string;
				text?: string;
				html?: string;
		  }
	)
) {
	const { to, locale = config.i18n.defaultLocale } = params;

	let html: string;
	let text: string;
	let subject: string;

	if ("templateId" in params) {
		const { templateId, context } = params;
		const template = await getTemplate({
			templateId,
			context,
			locale,
		});
		subject = template.subject;
		text = template.text;
		html = template.html;
	} else {
		subject = params.subject;
		text = params.text ?? "";
		html = params.html ?? "";
	}

	try {
		await send({ to, subject, text, html });
		return true;
	} catch (e) {
		logger.error(e);
		return false;
	}
}
```

### Template Rendering

```typescript
// src/util/templates.ts
import { render } from "@react-email/render";
import { getTranslations } from "@repo/i18n";

export async function getTemplate<T extends TemplateId>(params: {
	templateId: T;
	context: any;
	locale: string;
}): Promise<{ subject: string; text: string; html: string }> {
	const { templateId, context, locale } = params;

	// Get translations for this locale
	const translations = await getTranslations(locale, "emails");

	// Render React email component to HTML
	const Template = emails[templateId];
	const html = render(
		<Template {...context} locale={locale} translations={translations} />
	);

	// Extract subject from template metadata
	const subject = translations[`${templateId}.subject`];

	// Generate plain text version
	const text = render(
		<Template {...context} locale={locale} translations={translations} />,
		{
			plainText: true,
		}
	);

	return { subject, text, html };
}
```

### Email Provider Selection

```typescript
// src/provider/index.ts
import { config } from "@repo/config";

const providerName = process.env.MAIL_PROVIDER || "resend";

let send: (params: {
	to: string;
	subject: string;
	text: string;
	html: string;
}) => Promise<void>;

switch (providerName) {
	case "resend":
		send = require("./resend").send;
		break;
	case "plunk":
		send = require("./plunk").send;
		break;
	case "postmark":
		send = require("./postmark").send;
		break;
	case "mailgun":
		send = require("./mailgun").send;
		break;
	case "nodemailer":
		send = require("./nodemailer").send;
		break;
	default:
		throw new Error(`Unknown mail provider: ${providerName}`);
}

export { send };
```

### Provider Implementations

#### Resend (Default)

```typescript
import { Resend } from "resend";
import { config } from "@repo/config";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function send(params: SendParams) {
	await resend.emails.send({
		from: config.mails.from,
		to: params.to,
		subject: params.subject,
		text: params.text,
		html: params.html,
	});
}
```

#### Nodemailer (SMTP)

```typescript
import nodemailer from "nodemailer";
import { config } from "@repo/config";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT || "587"),
	secure: process.env.SMTP_SECURE === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD,
	},
});

export async function send(params: SendParams) {
	await transporter.sendMail({
		from: config.mails.from,
		to: params.to,
		subject: params.subject,
		text: params.text,
		html: params.html,
	});
}
```

### Internationalization Support

```typescript
// Example: Email in German
await sendEmail({
	to: "user@example.com",
	templateId: "emailVerification",
	context: {
		url: verificationUrl,
		name: "Hans Müller",
	},
	locale: "de",
});
```

**Translation Files** (in `@repo/i18n`):

```json
// de/emails.json
{
	"emailVerification.subject": "E-Mail-Adresse bestätigen",
	"emailVerification.heading": "Willkommen bei SnapBack",
	"emailVerification.button": "E-Mail bestätigen"
}
```

### Development & Preview

```bash
# Start email preview server
pnpm --filter mail run preview

# Opens http://localhost:3005 with live template previews
```

**Preview Features**:

-   Live reload on template changes
-   Test with different locales
-   Desktop/mobile responsive preview
-   Dark mode testing

### Email Best Practices

1. **Plain Text Fallback**: Always generate plain text version for email clients that don't support HTML
2. **Inline CSS**: React Email automatically inlines CSS for maximum compatibility
3. **Responsive Design**: All templates are mobile-responsive
4. **Accessibility**: Semantic HTML with proper alt text and ARIA labels
5. **Testing**: Preview in multiple email clients (Gmail, Outlook, Apple Mail)

### Email Sending Limits

**Resend Free Tier**:

-   100 emails/day
-   3,000 emails/month

**Production Recommendations**:

-   Use transactional email service (Resend, Postmark)
-   Set up SPF, DKIM, DMARC records
-   Monitor bounce rates and deliverability
-   Implement retry logic for failed sends

---

## 7. Package: @repo/storage

### Overview

S3-compatible object storage abstraction for file uploads (avatars, logos, checkpoints).

### Architecture

```
packages/storage/
├── index.ts                   # Package exports
├── provider/
│   └── index.ts              # S3 implementation
└── lib/
    └── upload.ts             # Upload utilities
```

### S3 Configuration

```typescript
// provider/index.ts
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
	},
	endpoint: process.env.AWS_ENDPOINT, // Optional: for Cloudflare R2, MinIO, etc.
});
```

### Presigned URL Generation

```typescript
export async function createUploadUrl(params: {
	bucket: string;
	key: string;
	contentType: string;
	expiresIn?: number;
}): Promise<string> {
	const { bucket, key, contentType, expiresIn = 3600 } = params;

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType,
	});

	const url = await getSignedUrl(s3Client, command, { expiresIn });
	return url;
}
```

**Usage in API**:

```typescript
// packages/api/modules/users/procedures/create-avatar-upload-url.ts
export const createAvatarUploadUrl = protectedProcedure
	.input(
		z.object({
			fileName: z.string(),
			contentType: z.string(),
		})
	)
	.handler(async ({ input, context }) => {
		const key = `avatars/${context.user.id}/${input.fileName}`;

		const url = await createUploadUrl({
			bucket: config.storage.bucketNames.avatars,
			key,
			contentType: input.contentType,
			expiresIn: 600, // 10 minutes
		});

		return { uploadUrl: url, key };
	});
```

### File Upload Flow

```mermaid
graph LR
    A[Client Requests Upload URL] --> B[API Generates Presigned URL]
    B --> C[Client Uploads Directly to S3]
    C --> D[S3 Stores File]
    D --> E[Client Notifies API of Success]
    E --> F[API Updates Database with File URL]
```

**Benefits**:

-   No server bandwidth consumed
-   Direct client-to-S3 upload
-   Secure with time-limited URLs
-   Scalable to millions of uploads

### Bucket Configuration

```typescript
// config/index.ts
storage: {
  bucketNames: {
    avatars: process.env.NEXT_PUBLIC_AVATARS_BUCKET_NAME ?? 'avatars',
    checkpoints: 'snapback-checkpoints' // Cloud backup feature
  }
}
```

### File Download

```typescript
export async function createDownloadUrl(params: {
	bucket: string;
	key: string;
	expiresIn?: number;
}): Promise<string> {
	const { bucket, key, expiresIn = 3600 } = params;

	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	const url = await getSignedUrl(s3Client, command, { expiresIn });
	return url;
}
```

### File Deletion

```typescript
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function deleteFile(params: {
	bucket: string;
	key: string;
}): Promise<void> {
	const { bucket, key } = params;

	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	await s3Client.send(command);
}
```

### S3-Compatible Providers

The storage package works with any S3-compatible service:

1. **AWS S3**: Native AWS service
2. **Cloudflare R2**: Zero egress fees, S3-compatible
3. **DigitalOcean Spaces**: Simple pricing, global CDN
4. **MinIO**: Self-hosted, open-source
5. **Backblaze B2**: Low-cost storage

**Configuration for Cloudflare R2**:

```env
AWS_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
AWS_REGION=auto
```

### File Naming Conventions

```typescript
// User avatars
`avatars/${userId}/${timestamp}-${originalFileName}`// Organization logos
`organizations/${orgId}/logo-${timestamp}.${ext}`// Checkpoint backups (SnapBack-specific)
`checkpoints/${userId}/${checkpointId}/${fileName}`;
```

### Security Considerations

1. **Content Type Validation**: Enforce allowed MIME types
2. **File Size Limits**: Set max upload size (e.g., 5MB for avatars)
3. **Expiring URLs**: Short-lived presigned URLs (10 minutes)
4. **Bucket Policies**: Restrict public access
5. **CORS Configuration**: Allow uploads only from app domain

**Example Bucket Policy**:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::avatars/*"
		}
	]
}
```

---

## 8. Package: @repo/ai

### Overview

AI integration using **Vercel AI SDK** with OpenAI and Anthropic providers.

### Architecture

```
packages/ai/
├── index.ts                   # Exports
├── lib/
│   ├── models.ts             # Model configurations
│   └── streaming.ts          # Streaming utilities
└── types.ts
```

### Model Configuration

```typescript
// index.ts
import { openai } from "@ai-sdk/openai";

export const textModel = openai("gpt-4o-mini");
export const imageModel = openai("dall-e-3");
export const audioModel = openai("whisper-1");

export * from "ai"; // Re-export AI SDK
export * from "./lib";
```

### Chat Completion Example

```typescript
// packages/api/modules/ai/procedures/add-message-to-chat.ts
import { streamText } from "@repo/ai";
import { textModel } from "@repo/ai";

export const addMessageToChat = protectedProcedure
	.input(
		z.object({
			chatId: z.string(),
			message: z.string(),
		})
	)
	.handler(async ({ input, context }) => {
		const chat = await drizzle.getAiChatById(input.chatId);

		// Add user message
		const messages = [
			...chat.messages,
			{ role: "user", content: input.message },
		];

		// Get AI response
		const { text } = await streamText({
			model: textModel,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			temperature: 0.7,
			maxTokens: 1000,
		});

		const assistantMessage = await text;

		// Store updated conversation
		await drizzle.updateAiChat(input.chatId, {
			messages: [
				...messages,
				{ role: "assistant", content: assistantMessage },
			],
		});

		return { message: assistantMessage };
	});
```

### Streaming Support

```typescript
import { streamText } from "@repo/ai";

export async function* streamChatResponse(messages: Message[]) {
	const stream = await streamText({
		model: textModel,
		messages,
		temperature: 0.7,
	});

	for await (const chunk of stream.textStream) {
		yield chunk;
	}
}
```

### Model Selection

**GPT-4o-mini** (Primary):

-   Fast responses
-   Low cost
-   Good for most use cases

**GPT-4** (Optional):

-   More accurate
-   Better reasoning
-   Higher cost

**Configuration**:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### AI Chat Features

1. **Conversation History**: Maintains context across messages
2. **Streaming Responses**: Real-time token streaming
3. **Temperature Control**: Adjustable creativity (0-1)
4. **Max Tokens**: Limit response length
5. **System Prompts**: Customize AI behavior

**Example System Prompt**:

```typescript
const systemPrompt = `You are SnapBack AI, an assistant for developers using AI coding tools.
Help users understand checkpoint recovery, explain AI changes, and troubleshoot issues.
Be concise and code-focused.`;
```

---

## 9. Package: @repo/i18n

### Overview

Internationalization using **next-intl** with support for multiple locales and currencies.

### Architecture

```
packages/i18n/
├── index.ts                   # I18n utilities
├── types.ts                   # Locale types
└── lib/
    ├── messages.ts           # Message loading
    └── config.ts             # I18n configuration
```

### Supported Locales

```typescript
// From config/index.ts
i18n: {
  enabled: true,
  locales: {
    en: { currency: 'USD', label: 'English' },
    de: { currency: 'USD', label: 'Deutsch' }
  },
  defaultLocale: 'en',
  defaultCurrency: 'USD',
  localeCookieName: 'NEXT_LOCALE'
}
```

### Message Files

```
apps/web/i18n/
├── en/
│   ├── common.json
│   ├── emails.json
│   ├── marketing.json
│   └── saas.json
└── de/
    ├── common.json
    ├── emails.json
    ├── marketing.json
    └── saas.json
```

### Translation Usage

```typescript
import { useTranslations } from "next-intl";

export function PricingSection() {
	const t = useTranslations("marketing.pricing");

	return (
		<div>
			<h2>{t("title")}</h2>
			<p>{t("subtitle")}</p>
		</div>
	);
}
```

### Server-Side Translations

```typescript
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
	const t = await getTranslations({
		locale: params.locale,
		namespace: "marketing",
	});

	return {
		title: t("home.title"),
		description: t("home.description"),
	};
}
```

### Currency Formatting

```typescript
import { useFormatter } from "next-intl";

export function Price({ amount }: { amount: number }) {
	const format = useFormatter();

	return (
		<span>
			{format.number(amount, { style: "currency", currency: "USD" })}
		</span>
	);
}
```

### Date Formatting

```typescript
import { useFormatter } from "next-intl";

export function CreatedAt({ date }: { date: Date }) {
	const format = useFormatter();

	return <span>{format.dateTime(date, { dateStyle: "medium" })}</span>;
}
```

---

## 10. Package: @repo/utils

### Overview

Shared utility functions used across packages.

### Architecture

```
packages/utils/
├── index.ts
└── lib/
    └── base-url.ts
```

### Base URL Utility

```typescript
// lib/base-url.ts
export function getBaseUrl(): string {
	if (typeof window !== "undefined") {
		// Browser
		return window.location.origin;
	}

	if (process.env.NEXT_PUBLIC_APP_URL) {
		// Server with explicit URL
		return process.env.NEXT_PUBLIC_APP_URL;
	}

	if (process.env.VERCEL_URL) {
		// Vercel deployment
		return `https://${process.env.VERCEL_URL}`;
	}

	// Development fallback
	return "http://localhost:3000";
}
```

**Usage**:

-   Generating absolute URLs for emails
-   OAuth redirect URLs
-   Webhook endpoints
-   API base paths

---

## 11. Package: @repo/logs

### Overview

Logging abstraction using **consola** for consistent logging across packages.

### Architecture

```
packages/logs/
├── index.ts
└── lib/
    └── logger.ts
```

### Logger Configuration

```typescript
// lib/logger.ts
import { createConsola } from "consola";
import { config } from "@repo/config";

export const logger = createConsola({
	level: process.env.NODE_ENV === "production" ? 3 : 4, // Info in prod, Debug in dev
	fancy: true, // Pretty formatting
	formatOptions: {
		date: true,
		colors: true,
	},
});
```

### Logging Levels

```typescript
logger.debug("Detailed debugging info"); // Level 4
logger.info("General information"); // Level 3
logger.warn("Warning messages"); // Level 2
logger.error("Error messages"); // Level 1
logger.fatal("Fatal errors, exit process"); // Level 0
```

### Usage Examples

```typescript
// Success logging
logger.success("User created successfully", { userId: user.id });

// Error logging
try {
	await riskyOperation();
} catch (error) {
	logger.error("Operation failed", error);
}

// Structured logging
logger.info("API request", {
	method: "POST",
	path: "/api/users",
	userId: session.userId,
	duration: 150,
});
```

### Production Logging

In production, integrate with services like:

-   **Sentry**: Error tracking
-   **LogRocket**: Session replay
-   **DataDog**: APM and logs
-   **CloudWatch**: AWS native logging

---

## 12. config/ - Application Configuration

### Overview

Centralized configuration with type safety and feature flags.

### Architecture

```
config/
├── index.ts                   # Main configuration
└── types.ts                   # Config type definitions
```

### Configuration Structure

```typescript
export const config = {
  appName: 'SnapBack',
  tagline: 'AI Code Protection for Developers',
  description: 'Automatic checkpoints before AI changes. Instant recovery when things break.',

  i18n: { ... },              // Internationalization
  organizations: { ... },      // Multi-tenancy settings
  users: { ... },              // User features
  auth: { ... },               // Authentication config
  mails: { ... },              // Email settings
  ui: { ... },                 // Frontend settings
  storage: { ... },            // File storage
  contactForm: { ... },        // Contact form
  payments: { ... }            // Pricing plans
} as const satisfies Config
```

### Feature Flags

```typescript
organizations: {
  enable: true,                              // Enable organizations
  enableBilling: true,                       // Org-level billing
  hideOrganization: false,                   // Hide org UI
  enableUsersToCreateOrganizations: true,    // User can create orgs
  requireOrganization: false,                // Force org membership
  forbiddenOrganizationSlugs: [              // Reserved slugs
    'new-organization',
    'admin',
    'settings',
    'checkpoint',
    'snapback',
    'recover'
  ]
}

users: {
  enableBilling: false,                      // User-level billing (disabled)
  enableOnboarding: true                     // Onboarding flow
}

auth: {
  enableSignup: true,                        // Public signup
  enableMagicLink: true,                     // Passwordless login
  enableSocialLogin: true,                   // OAuth providers
  enablePasskeys: false,                     // WebAuthn (disabled)
  enablePasswordLogin: true,                 // Email/password
  enableTwoFactor: true,                     // 2FA support
  redirectAfterSignIn: '/app/dashboard',
  redirectAfterLogout: '/',
  sessionCookieMaxAge: 60 * 60 * 24 * 30    // 30 days
}

ui: {
  enabledThemes: ['dark'],                   // Dark mode only
  defaultTheme: 'dark',
  saas: {
    enabled: true,                           // Enable SaaS app
    useSidebarLayout: true                   // Sidebar navigation
  },
  marketing: {
    enabled: true                            // Enable marketing site
  }
}
```

### Pricing Plans

```typescript
payments: {
  plans: {
    free: {
      name: 'Free',
      description: 'Open Source Core',
      features: [
        'VS Code extension',
        'CLI tool included',
        'Unlimited local checkpoints',
        'Community support'
      ],
      isFree: true
    },
    solo: {
      name: 'Solo',
      description: 'Enhanced Protection',
      recommended: true,
      features: [
        'Everything in Free',
        'Cloud checkpoint backup',
        'Priority support',
        'Advanced AI detection (94% accuracy)',
        'Custom rules engine',
        'Free snapback cap 🧢'
      ],
      prices: [
        {
          type: 'recurring',
          productId: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID,
          interval: 'month',
          amount: 29,
          currency: 'USD',
          trialPeriodDays: 14
        },
        {
          type: 'recurring',
          productId: process.env.STRIPE_SOLO_YEARLY_PRICE_ID,
          interval: 'year',
          amount: 290,
          currency: 'USD',
          trialPeriodDays: 14
        }
      ]
    },
    team: {
      name: 'Team',
      description: 'Collaborative Safety',
      features: [
        'Everything in Solo',
        'Centralized policies',
        'Shared checkpoints',
        'Admin dashboard',
        'Audit logs',
        'SSO integration'
      ],
      prices: [
        {
          type: 'recurring',
          productId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
          interval: 'month',
          amount: 79,
          currency: 'USD',
          seatBased: true
        }
      ]
    }
  }
}
```

### Environment Variables

**Required**:

-   `DATABASE_URL`: PostgreSQL connection string
-   `STRIPE_SECRET_KEY`: Stripe API key
-   `STRIPE_WEBHOOK_SECRET`: Stripe webhook signature
-   `RESEND_API_KEY`: Email provider key

**OAuth**:

-   `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
-   `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`

**Storage**:

-   `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`
-   `AWS_REGION` & `AWS_ENDPOINT`

**AI** (Optional):

-   `OPENAI_API_KEY`
-   `ANTHROPIC_API_KEY`

---

## 13. tooling/ - Shared Build Configuration

### TypeScript Configuration

```
tooling/typescript/
├── base.json                 # Base config
├── nextjs.json              # Next.js specific
├── react-library.json       # React library config
└── package.json
```

**base.json**:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022"],
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"resolveJsonModule": true,
		"allowJs": true,
		"strict": true,
		"noEmit": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"forceConsistentCasingInFileNames": true,
		"isolatedModules": true
	}
}
```

**Usage in packages**:

```json
{
	"extends": "@repo/tsconfig/base.json"
}
```

### Tailwind Configuration

```
tooling/tailwind/
├── theme.css                 # Custom theme
├── tailwind-animate.css     # Animation utilities
└── package.json
```

**Shared Theme**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
	:root {
		--background: 0 0% 100%;
		--foreground: 222.2 84% 4.9%;
		--primary: 222.2 47.4% 11.2%;
		/* ... */
	}

	.dark {
		--background: 222.2 84% 4.9%;
		--foreground: 210 40% 98%;
		--primary: 210 40% 98%;
		/* ... */
	}
}
```

---

## Package Dependency Analysis

### Dependency Levels

**Level 0 (No dependencies)**:

-   `@repo/utils`
-   `@repo/logs`
-   `@repo/config`

**Level 1 (Depends on Level 0)**:

-   `@repo/i18n` → config
-   `@repo/storage` → config, logs
-   `@repo/ai` → (external only)

**Level 2 (Depends on Level 0-1)**:

-   `@repo/database` → config
-   `@repo/mail` → config, i18n, logs

**Level 3 (Depends on Level 0-2)**:

-   `@repo/payments` → database, config, logs
-   `@repo/auth` → database, config, i18n, logs, mail, payments, utils

**Level 4 (Depends on all)**:

-   `@repo/api` → auth, database, ai, storage, mail, payments, i18n, logs, utils, config

### Circular Dependency Prevention

The architecture prevents circular dependencies through:

1. **Layered design**: Lower-level packages never import higher-level ones
2. **Interface-based contracts**: Shared types in `config/types.ts`
3. **Event-driven patterns**: Webhooks for cross-package communication
4. **Dependency injection**: Pass dependencies as parameters, not imports

---

## Cross-Package Integration Patterns

### Pattern 1: Authentication + Payments

```typescript
// @repo/auth hooks into @repo/payments
hooks: {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path.startsWith('/delete-user')) {
      const purchases = await drizzle.getPurchases(...)
      for (const sub of subscriptions) {
        await cancelSubscription(sub.subscriptionId) // @repo/payments
      }
    }
  })
}
```

### Pattern 2: API + All Services

```typescript
// @repo/api orchestrates all packages
export const createUser = protectedProcedure
  .input(createUserSchema)
  .handler(async ({ input }) => {
    // 1. Database: Create user
    const user = await drizzle.createUser(input)

    // 2. Storage: Create avatar upload URL
    const avatarUrl = await createUploadUrl({ ... })

    // 3. Mail: Send welcome email
    await sendEmail({
      to: user.email,
      templateId: 'welcomeEmail',
      context: { name: user.name }
    })

    // 4. AI: Initialize default chat
    await drizzle.createAiChat({
      userId: user.id,
      title: 'Welcome Chat'
    })

    return { user, avatarUrl }
  })
```

### Pattern 3: Webhook → Database + Email

```typescript
// Stripe webhook in @repo/payments
case 'customer.subscription.created':
  // 1. Store in database
  await drizzle.createPurchase({ ... })

  // 2. Send confirmation email
  await sendEmail({
    to: customerEmail,
    templateId: 'subscriptionStarted',
    context: { plan: 'solo' }
  })
  break
```

---

## Architecture Principles

### 1. Type Safety Everywhere

-   End-to-end types via oRPC
-   Zod validation at API boundaries
-   Drizzle ORM for type-safe queries
-   Strict TypeScript configuration

### 2. Modular Monorepo

-   Independent package development
-   Shared dependencies via workspace protocol
-   Turborepo for build caching
-   Package-level isolation

### 3. Multi-Tenancy

-   Organization-first architecture
-   User AND org-level resources
-   Role-based access control
-   Seat-based billing support

### 4. Developer Experience

-   Hot reload across packages
-   Type inference in IDEs
-   Automatic OpenAPI docs
-   Email preview server
-   Database studio (Drizzle Kit)

### 5. Production-Ready

-   Rate limiting
-   Error handling
-   Logging infrastructure
-   Webhook verification
-   Security best practices

---

## Performance Considerations

### Database Optimization

-   **Indexes on hot paths**: Session token, API key lookups
-   **Composite indexes**: (userId, organizationId) for member checks
-   **Foreign key cascades**: Automatic cleanup on deletion
-   **Drizzle query builder**: Prevents N+1 queries

### API Performance

-   **oRPC batching**: Multiple procedures in one request
-   **Rate limiting**: Prevents abuse
-   **Caching strategy**: (Not yet implemented, recommended for production)
-   **Database connection pooling**: Via `pg` Pool

### File Upload Optimization

-   **Direct S3 uploads**: No server bandwidth
-   **Presigned URLs**: Time-limited, secure
-   **CDN integration**: CloudFront or similar for static assets

---

## Security Architecture

### Authentication Security

-   **Session-based auth**: HTTP-only cookies
-   **Password hashing**: Argon2 (memory-hard)
-   **API key hashing**: Argon2 with high memory cost
-   **OAuth 2.0**: Trusted provider integration
-   **2FA support**: TOTP with backup codes
-   **Email verification**: Required for new signups

### Authorization

-   **Role-based access**: Admin, owner, member roles
-   **Procedure-level protection**: `protectedProcedure`, `adminProcedure`
-   **Organization isolation**: Users can only access their orgs
-   **API key permissions**: Plan-based feature gates

### Data Protection

-   **Encrypted fields**: Passwords, tokens, secrets
-   **Audit logging**: Track user actions (via `apiUsage` table)
-   **Soft deletes**: Revoke API keys instead of hard delete
-   **Rate limiting**: Prevent brute force attacks

### Infrastructure Security

-   **Environment isolation**: Separate dev/staging/prod
-   **Secret management**: Environment variables only
-   **HTTPS enforcement**: All traffic encrypted
-   **CORS restrictions**: Whitelist app domain
-   **Webhook signatures**: Verify Stripe events

---

## Testing Strategy

### Unit Testing (Recommended)

```bash
# Install test dependencies
pnpm add -D vitest @testing-library/react

# Test database queries
packages/database/drizzle/queries/__tests__/users.test.ts

# Test API procedures
packages/api/modules/users/procedures/__tests__/create-avatar-upload-url.test.ts

# Test email templates
packages/mail/emails/__tests__/WelcomeEmail.test.tsx
```

### Integration Testing

```bash
# E2E tests with Playwright (already configured)
pnpm --filter web run e2e

# API integration tests
packages/api/__tests__/integration/auth.test.ts
```

### Manual Testing

-   **Email preview**: `pnpm --filter mail run preview`
-   **Database GUI**: `pnpm --filter database run studio`
-   **API docs**: `http://localhost:3000/api/docs`
-   **Stripe webhooks**: `stripe listen --forward-to localhost:3000/api/webhooks/payments`

---

## Deployment Architecture

### Recommended Stack

**Frontend & API**:

-   **Vercel** (Next.js deployment)
-   **Railway** (alternative with Docker)
-   **Fly.io** (global edge deployment)

**Database**:

-   **Neon** (Serverless PostgreSQL)
-   **Supabase** (Managed PostgreSQL)
-   **Railway Postgres** (simple setup)

**Storage**:

-   **Cloudflare R2** (zero egress fees)
-   **AWS S3** (industry standard)
-   **DigitalOcean Spaces** (simple pricing)

**Email**:

-   **Resend** (modern transactional email)
-   **Postmark** (high deliverability)
-   **Amazon SES** (low cost at scale)

### Environment Setup

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SOLO_MONTHLY_PRICE_ID=price_...
STRIPE_SOLO_YEARLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...

# Email
MAIL_PROVIDER=resend
RESEND_API_KEY=re_...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_ENDPOINT=... (optional)

# AI (Optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://app.snapback.dev
```

---

## Migration from Prisma to Drizzle

### Status

**COMPLETED**: Prisma artifacts archived in `.archive/` directory.

### Migration Process

1. ✅ Drizzle schema defined in `packages/database/drizzle/schema/postgres.ts`
2. ✅ Query helpers migrated to `packages/database/drizzle/queries/`
3. ✅ Better Auth configured to use Drizzle adapter
4. ✅ All API procedures updated to use Drizzle
5. ✅ Prisma client removed from package.json

### Benefits Gained

-   **Better type inference**: No generate step needed
-   **SQL visibility**: See generated SQL in dev
-   **Performance**: More control over queries
-   **Bundle size**: Smaller client footprint
-   **Edge compatibility**: Works in edge runtimes

---

## Future Enhancements

### Package Additions

1. **@repo/analytics**: Posthog/Mixpanel integration
2. **@repo/realtime**: WebSocket support via Pusher/Ably
3. **@repo/jobs**: Background jobs with BullMQ
4. **@repo/search**: Algolia/Meilisearch integration
5. **@repo/notifications**: In-app notification system

### Feature Improvements

1. **API key rate limiting**: Per-key quotas in `apiUsage` table
2. **Checkpoint cloud backup**: S3 integration for checkpoint files
3. **Team shared checkpoints**: Collaborative recovery
4. **Usage dashboard**: Analytics for developers
5. **Audit logs**: Complete action history

### Infrastructure

1. **Caching layer**: Redis for session storage
2. **CDN integration**: CloudFlare for static assets
3. **Monitoring**: Sentry error tracking
4. **APM**: DataDog or New Relic
5. **Load balancing**: Multi-region deployment

---

## Conclusion

This monorepo architecture provides a **production-ready SaaS foundation** with:

✅ **Type-safe end-to-end**: From API to database  
✅ **Modern authentication**: Better Auth with 2FA, OAuth, magic links  
✅ **Multi-tenant ready**: Organization-based architecture  
✅ **Payment processing**: Stripe with seat-based billing  
✅ **Developer-friendly**: API keys, rate limiting, usage tracking  
✅ **Scalable infrastructure**: S3 storage, Drizzle ORM, PNPM workspaces  
✅ **Internationalization**: Multi-language support  
✅ **Email system**: React Email with multiple providers

**Total Package Count**: 10 packages + 1 config + 2 tooling = **13 modules**  
**Total Procedures**: ~36 API endpoints  
**Database Tables**: 17 tables (11 core + 6 SnapBack-specific)  
**Authentication Methods**: 5 (email/password, OAuth, magic link, passkeys, 2FA)  
**Payment Providers**: 1 active (Stripe), 4 archived  
**Email Providers**: 5 supported (Resend primary)

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-30  
**Maintainer**: SnapBack Engineering Team
